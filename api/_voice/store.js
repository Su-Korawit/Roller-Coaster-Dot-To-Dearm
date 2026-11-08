// api/_voice/store.js
// Persistence for the voice secretary. Every read-modify-write of the user doc and
// the system-wide daily counter happens in ONE Firestore transaction, so quota and
// ceiling checks cannot race (two parallel requests cannot both pass).
// Docs are server-only (see firestore.rules): voiceSecretary/{uid}, voiceGlobal/{YYYY-MM-DD}.
import process from 'node:process'
import { emptyState, emptyGlobal, bkk } from './logic.js'

const USER_COL = 'voiceSecretary'
const GLOBAL_COL = 'voiceGlobal'

/** Fields derived from state so the scheduler can query cheaply. */
export function derive(state) {
  const c = state.consent
  return {
    ...state,
    dialDays: state.schedule?.days || [],
    dialReady: !!(state.paid && state.schedule && state.phone && !state.doNotCall && c && c.granted && !c.revokedAt),
  }
}

// ── Firestore (firebase-admin) ──────────────────────────────────────────────
let _admin = null
export async function getAdmin() {
  if (_admin) return _admin
  const mod = await import('firebase-admin')
  const admin = mod.default || mod
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (raw) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) })
    } else {
      admin.initializeApp()
    }
  }
  _admin = admin
  return admin
}

export function createFirestoreStore(admin) {
  const db = admin.firestore()
  return {
    async tx(uid, now, fn) {
      const uref = db.collection(USER_COL).doc(uid)
      const gref = db.collection(GLOBAL_COL).doc(bkk(now).dayKey)
      return db.runTransaction(async (t) => {
        const [us, gs] = await Promise.all([t.get(uref), t.get(gref)])
        const state = us.exists ? { ...emptyState(), ...us.data() } : emptyState()
        const global = gs.exists ? { ...emptyGlobal(), ...gs.data() } : emptyGlobal()
        const out = fn(state, global)
        if (out.state) t.set(uref, derive(out.state))
        if (out.global) t.set(gref, out.global)
        return out.result
      })
    },
    async read(uid) {
      const s = await db.collection(USER_COL).doc(uid).get()
      return s.exists ? { ...emptyState(), ...s.data() } : emptyState()
    },
    // The plan the student synced from the OS apps (Goal / Habit): users/{uid}.os. Server-only read.
    async readOs(uid) {
      const s = await db.collection('users').doc(uid).get()
      const os = s.exists ? s.data().os : null
      return os && typeof os === 'object' ? os : null
    },
    // Display name for the call greeting (users/{uid}.displayName), first word only. Server-only read.
    async readName(uid) {
      const s = await db.collection('users').doc(uid).get()
      const n = s.exists ? s.data().displayName : null
      return typeof n === 'string' ? n.trim().split(/\s+/)[0] : null
    },
    // Who owns this phone number? Exactly one match or null (two accounts on one number = nobody is served).
    async findUidByPhone(phone) {
      const q = await db.collection(USER_COL).where('phone', '==', phone).limit(2).get()
      return q.size === 1 ? q.docs[0].id : null
    },
    // Apply a voice tool's task change to users/{uid}.os.tasks in one transaction, and bump osVoiceRev so an
    // open OS client re-hydrates. `fn(os)` returns the new tasks array or null for "no change".
    async updateOsTasks(uid, now, fn) {
      const ref = db.collection('users').doc(uid)
      return db.runTransaction(async (t) => {
        const snap = await t.get(ref)
        const os = snap.exists ? snap.data().os : null
        if (!os || typeof os !== 'object') return { ok: false, reason: 'no_plan' }
        const tasks = fn(os)
        if (!tasks) return { ok: true, changed: false }
        t.update(ref, { 'os.tasks': tasks, osVoiceRev: now, osUpdatedAt: admin.firestore.FieldValue.serverTimestamp() })
        return { ok: true, changed: true }
      })
    },
    async readGlobal(now) {
      const s = await db.collection(GLOBAL_COL).doc(bkk(now).dayKey).get()
      return s.exists ? { ...emptyGlobal(), ...s.data() } : emptyGlobal()
    },
    // only users whose schedule includes today's weekday (keeps the scan small as users grow)
    async listDialReady(weekday, limit = 500) {
      const q = await db.collection(USER_COL).where('dialReady', '==', true).where('dialDays', 'array-contains', weekday).limit(limit).get()
      return q.docs.map((d) => d.id)
    },
    async verifyToken(idToken) {
      const decoded = await admin.auth().verifyIdToken(idToken)
      return decoded.uid
    },
  }
}

// ── In-memory store (tests / local mock) ────────────────────────────────────
export function createMemoryStore() {
  const users = new Map()
  const globals = new Map()
  return {
    users,
    globals,
    async tx(uid, now, fn) {
      const gk = bkk(now).dayKey
      const state = users.has(uid) ? structuredClone(users.get(uid)) : emptyState()
      const global = globals.has(gk) ? structuredClone(globals.get(gk)) : emptyGlobal()
      const out = fn(state, global)
      if (out.state) users.set(uid, derive(out.state))
      if (out.global) globals.set(gk, out.global)
      return out.result
    },
    async read(uid) {
      return users.has(uid) ? structuredClone(users.get(uid)) : emptyState()
    },
    osData: new Map(),
    async readOs(uid) {
      return this.osData.get(uid) ?? null
    },
    names: new Map(),
    async readName(uid) {
      return this.names.get(uid) ?? null
    },
    async findUidByPhone(phone) {
      const hits = [...users.entries()].filter(([, s]) => s.phone === phone)
      return hits.length === 1 ? hits[0][0] : null
    },
    voiceRev: new Map(),
    async updateOsTasks(uid, now, fn) {
      const os = this.osData.get(uid)
      if (!os) return { ok: false, reason: 'no_plan' }
      const tasks = fn(os)
      if (!tasks) return { ok: true, changed: false }
      this.osData.set(uid, { ...os, tasks })
      this.voiceRev.set(uid, now)
      return { ok: true, changed: true }
    },
    async readGlobal(now) {
      return globals.get(bkk(now).dayKey) || emptyGlobal()
    },
    async listDialReady(weekday) {
      return [...users.entries()].filter(([, s]) => s.dialReady && s.dialDays.includes(weekday)).map(([id]) => id)
    },
    async verifyToken(t) {
      if (!t.startsWith('uid:')) throw new Error('bad token')
      return t.slice(4)
    },
  }
}
