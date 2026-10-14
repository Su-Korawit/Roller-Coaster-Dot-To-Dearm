// ============================================================================
// sessionBootstrap.js — ตัวจัดการลำดับการ "บูต" เซสชันผู้ใช้หลังล็อกอิน
// ----------------------------------------------------------------------------
// สรุปการเปลี่ยนแปลง (Candidate 2 — SessionBootstrap):
//   เดิม: useAuthStore ทำงาน hydrate + arm sync ทั้งหมดไว้ใน onAuthStateChanged
//         โดยมี try/catch ก้อนเดียวครอบทั้งหมด → ถ้าขั้นตอนแรกพัง ขั้นตอนที่เหลือ
//         จะไม่ทำงานเลย และ error ถูกกลืนด้วย console.warn
//   ใหม่: ย้ายลำดับทั้งหมดมาที่ bootstrapSession() และห่อ try/catch "แยกแต่ละขั้น"
//         เพื่อให้ขั้นที่พังไม่ทำให้ขั้นอื่นล้มตาม และ log ด้วย console.error ทุกครั้ง
//         (ไม่กลืน error เงียบ ๆ) ส่วนการ logout cleanup ย้ายมาที่ teardownSession()
//   useAuthStore เหลือแค่เรียก bootstrapSession() / teardownSession() เท่านั้น
//   ล่าสุด (parallelize + dedupe coin read): เดิมสเต็ปทั้งหมดรันแบบ serial (~10
//         await ต่อกัน) และอ่าน users/{uid} ซ้ำสองครั้ง (ensureUserDoc + coins)
//         ใหม่: แบ่งเป็น 2 wave ขนาน — wave 1 ทำ ensureUserDoc คู่กับ hydrate
//         farm data (global, ไม่ผูกกับ user doc), แล้วอ่านค่า coins จากผลลัพธ์
//         ของ ensureUserDoc เลย (ไม่อ่านซ้ำ) — wave 2 รัน hydrate/arm ต่อ store
//         ที่เหลือทั้งหมดพร้อมกันด้วย Promise.all แต่ละสเต็ปยังคง isolate ผ่าน
//         step() helper เหมือนเดิม
// ============================================================================
import { getDoc, getDocs, setDoc } from 'firebase/firestore'
import { refs, shapes, queries } from '../lib/db'
import { useUserStore } from '../stores/useUserStore'
import { useEntitlementsStore } from '../stores/useEntitlementsStore'
import { useWorldStore } from '../stores/useWorldStore'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import { usePlansStore } from '../stores/usePlansStore'
import { hydrateSelectStoreFromFirestore } from '../utils/syncSelectToFirestore'
import { hydrateFarmDataFromFirestore } from '../lib/farmDataSync.js'
import { hydrateSpotify } from './spotifyConnect'
import { resolveConsent } from './consent'
import { useConsentStore } from '../stores/useConsentStore'
import { migrateLegacyRoadmap } from '../utils/migrateLegacyRoadmap'
import {
  captureGuestWork,
  resolveGuestMerge,
  disableGuestTracking,
  enableGuestTracking,
} from './guestMerge'
import { useGuestMergeStore } from '../stores/useGuestMergeStore'
import {
  hydratePortfolioFromFirestore,
  setPortfolioSyncUser,
  hydrateTasksFromFirestore,
  setTaskSyncUser,
  armRoadmapSheetSync,
  disarmRoadmapSheetSync,
  hydrateMapFromFirestore,
  armMapSync,
  disarmMapSync,
  hydrateInventoryFromFirestore,
  setInventorySyncUser,
  disarmInventorySync,
  hydrateFarmFromFirestore,
  armFarmSync,
  disarmFarmSync,
  hydrateSchoolFromFirestore,
  setSchoolSyncUser,
  disarmSchoolSync,
} from '../lib/syncManager'

function readSelectStore() {
  try {
    const raw = localStorage.getItem('rc-select-store')
    const parsed = JSON.parse(raw ?? '{}')
    return parsed.state ?? {}
  } catch {
    return {}
  }
}

async function ensureUserDoc(firebaseUser) {
  const ref = refs.user(firebaseUser.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()
  const { mbti, program, university, mastery } = readSelectStore()
  const initial = shapes.initialUser(firebaseUser, { mbti, program, university, mastery })
  await setDoc(ref, initial)
  return initial
}

function roleForSheet(sheet, uid) {
  if (sheet.ownerUid === uid) return 'owner'
  return sheet.collaborators?.[uid] ?? 'view'
}

async function bootstrapRoadmapSheets(uid, userDoc) {
  useRoadmapStore.getState().setRoadmapMyUid(uid)

  let sheetIds = userDoc?.roadmapSheetIds ?? []

  if (sheetIds.length === 0) {
    const generatedSheetId = crypto.randomUUID()
    const migration = migrateLegacyRoadmap(userDoc, generatedSheetId)
    const sheetId = migration?.sheetId ?? generatedSheetId
    const sheetDoc = migration ? migration.sheetDoc : shapes.newRoadmapSheet({ ownerUid: uid, name: 'Roadmap' })
    const userDocPatch = migration ? migration.userDocPatch : { roadmapSheetIds: [sheetId] }
    await setDoc(refs.roadmapSheet(sheetId), sheetDoc)
    await setDoc(refs.user(uid), userDocPatch, { merge: true })
    sheetIds = [sheetId]
  }

  const [ownedSnaps, sharedSnap] = await Promise.all([
    Promise.all(sheetIds.map((id) => getDoc(refs.roadmapSheet(id)))),
    getDocs(queries.sheetsSharedWithMe(uid)),
  ])

  const ownedSheets = ownedSnaps
    .filter((snap) => snap.exists())
    .map((snap) => ({ id: snap.id, ...snap.data() }))
  const sharedSheets = sharedSnap.docs
    .filter((d) => d.data().ownerUid !== uid)
    .map((d) => ({ id: d.id, ...d.data() }))

  const sheets = [...ownedSheets, ...sharedSheets].map((sheet) => ({
    id: sheet.id,
    name: sheet.name,
    nodes: sheet.nodes ?? [],
    edges: sheet.edges ?? [],
    timeline: sheet.timeline ?? null,
    ownerUid: sheet.ownerUid,
    myRole: roleForSheet(sheet, uid),
  }))

  const existingOwnedIds = new Set(
    ownedSnaps.filter((snap) => snap.exists()).map((snap) => snap.id),
  )
  const activeSheetId = sheetIds.find((id) => existingOwnedIds.has(id)) ?? sheets[0]?.id ?? null
  useRoadmapStore.getState().hydrateSheets(sheets, activeSheetId)
  if (activeSheetId) armRoadmapSheetSync(activeSheetId)
}

/**
 * Run the post-login sequence: ensure the user doc, hydrate each store from
 * Firestore, and arm the debounced sync writers. Steps run in two parallel
 * waves (the user doc must exist before the user-scoped hydrations); every
 * step is isolated so one failure never aborts the rest, and nothing is
 * swallowed silently.
 */
export async function bootstrapSession(firebaseUser) {
  const uid = firebaseUser.uid
  const step = (name, fn) =>
    fn().catch((e) => console.error(`[sessionBootstrap] ${name} failed:`, e))

  // Guest work (ADR-0012) must be snapshotted before the hydrations below
  // overwrite the roadmap/school stores with cloud state; tracking is switched
  // off first so those hydration writes are never mistaken for guest edits.
  disableGuestTracking()
  const guestWork = captureGuestWork()

  // Wave 1 — user doc creation gates the user-scoped reads below; the farm
  // data catalog is global and rides along in parallel.
  const [userData] = await Promise.all([
    step('ensureUserDoc', () => ensureUserDoc(firebaseUser)),
    step('hydrate farm data', () => hydrateFarmDataFromFirestore()),
  ])

  // Privacy/Terms consent (PDPA): record it from the sign-in page's marker, or flag the
  // user so ConsentGate asks. Isolated like every step; a failure leaves it 'unknown',
  // and RequireAuth treats only 'needed' as blocking so an outage cannot lock anyone out.
  await step('consent', () => resolveConsent(uid, userData))

  // Coins — authoritative value set by Cloud Functions, taken from the doc
  // ensureUserDoc already read (no second round-trip). Isolated via step() like
  // every other write here: a throw must never block loading from resolving
  // (useAuthStore awaits this whole function before clearing `loading`).
  const serverCoins = userData?.coins ?? 0
  await step('set coins', async () => {
    if (serverCoins > 0) useUserStore.getState().setCoins(serverCoins)
  })
  await step('set file bag usage', async () => {
    useUserStore.getState().setFileBagUsageBytes(userData?.fileBagUsageBytes ?? 0)
  })

  // Entitlements — Functions-owned, read from the same user-doc fetch.
  await step('hydrate entitlements', async () => {
    useEntitlementsStore.getState().hydrateEntitlements(userData?.entitlements ?? {})
  })

  // Wave 2 — independent per-store hydrations; each arms its debounced
  // writer only after its own hydrate succeeded.
  await Promise.all([
    step('hydrate select', () => hydrateSelectStoreFromFirestore(uid)),
    step('hydrate/arm portfolio', async () => {
      await hydratePortfolioFromFirestore(uid)
      setPortfolioSyncUser(uid)
    }),
    step('hydrate/arm tasks', async () => {
      await hydrateTasksFromFirestore(uid)
      setTaskSyncUser(uid)
    }),
    step('bootstrap roadmap sheets', () => bootstrapRoadmapSheets(uid, userData)),
    step('hydrate map', async () => {
      await hydrateMapFromFirestore(uid)
      useWorldStore.getState().setMapOwner(uid)
      armMapSync(uid)
    }),
    step('hydrate/arm inventory', async () => {
      await hydrateInventoryFromFirestore(uid)
      setInventorySyncUser(uid)
    }),
    step('hydrate/arm school', async () => {
      await hydrateSchoolFromFirestore(uid)
      setSchoolSyncUser(uid)
    }),
    step('hydrate/arm farm', async () => {
      await hydrateFarmFromFirestore(uid)
      armFarmSync(uid)
    }),
    step('hydrate spotify', () => hydrateSpotify(uid)),
  ])

  // Cloud state is hydrated and the sync writers are armed — now merge guest
  // work: empty cloud side merges silently (the armed writers persist it);
  // a non-empty side becomes a pending conflict for GuestMergeDialog.
  try {
    const conflict = resolveGuestMerge(guestWork)
    if (conflict) useGuestMergeStore.getState().offerGuestMerge(conflict)
  } catch (e) {
    console.error('[sessionBootstrap] guest merge failed:', e)
  }
}

/**
 * Stop the debounced sync writers on logout.
 */
export function teardownSession() {
  useConsentStore.getState().reset()
  // Auth is settled logged-out: store mutations from here on are guest work.
  enableGuestTracking()
  setPortfolioSyncUser(null)
  setTaskSyncUser(null)
  disarmRoadmapSheetSync()
  disarmMapSync()
  disarmInventorySync()
  disarmFarmSync()
  disarmSchoolSync()
  useWorldStore.getState().setMapOwner(null)
  usePlansStore.getState().resetPlans()
}
