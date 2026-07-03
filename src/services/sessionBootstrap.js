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
import { getDoc, setDoc } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import { useUserStore } from '../stores/useUserStore'
import { useWorldStore } from '../stores/useWorldStore'
import { hydrateSelectStoreFromFirestore } from '../utils/syncSelectToFirestore'
import { hydrateFarmDataFromFirestore } from '../lib/farmDataSync.js'
import {
  hydratePortfolioFromFirestore,
  setPortfolioSyncUser,
  hydrateTasksFromFirestore,
  setTaskSyncUser,
  hydrateRoadmapFromFirestore,
  setRoadmapSyncUser,
  hydrateMapFromFirestore,
  armMapSync,
  disarmMapSync,
  hydrateInventoryFromFirestore,
  setInventorySyncUser,
  disarmInventorySync,
  hydrateFarmFromFirestore,
  armFarmSync,
  disarmFarmSync,
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

  // Wave 1 — user doc creation gates the user-scoped reads below; the farm
  // data catalog is global and rides along in parallel.
  const [userData] = await Promise.all([
    step('ensureUserDoc', () => ensureUserDoc(firebaseUser)),
    step('hydrate farm data', () => hydrateFarmDataFromFirestore()),
  ])

  // Coins — authoritative value set by Cloud Functions, taken from the doc
  // ensureUserDoc already read (no second round-trip).
  const serverCoins = userData?.coins ?? 0
  if (serverCoins > 0) useUserStore.getState().setCoins(serverCoins)

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
    step('hydrate/arm roadmap', async () => {
      await hydrateRoadmapFromFirestore(uid)
      setRoadmapSyncUser(uid)
    }),
    step('hydrate map', async () => {
      await hydrateMapFromFirestore(uid)
      useWorldStore.getState().setMapOwner(uid)
      armMapSync(uid)
    }),
    step('hydrate/arm inventory', async () => {
      await hydrateInventoryFromFirestore(uid)
      setInventorySyncUser(uid)
    }),
    step('hydrate/arm farm', async () => {
      await hydrateFarmFromFirestore(uid)
      armFarmSync(uid)
    }),
  ])
}

/**
 * Stop the debounced sync writers on logout.
 */
export function teardownSession() {
  setPortfolioSyncUser(null)
  setTaskSyncUser(null)
  setRoadmapSyncUser(null)
  disarmMapSync()
  disarmInventorySync()
  disarmFarmSync()
  useWorldStore.getState().setMapOwner(null)
}
