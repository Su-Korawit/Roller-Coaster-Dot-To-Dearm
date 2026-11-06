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
