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
// ============================================================================
import { getDoc, setDoc } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import { useUserStore } from '../stores/useUserStore'
import { hydrateSelectStoreFromFirestore } from '../utils/syncSelectToFirestore'
import {
  hydratePortfolioFromFirestore,
  setPortfolioSyncUser,
  hydrateTasksFromFirestore,
  setTaskSyncUser,
  hydrateRoadmapFromFirestore,
  setRoadmapSyncUser,
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
  if (snap.exists()) return
  const { mbti, program, university, mastery } = readSelectStore()
  await setDoc(ref, shapes.initialUser(firebaseUser, { mbti, program, university, mastery }))
}

/**
 * Run the post-login sequence: ensure the user doc, hydrate each store from
 * Firestore, and arm the debounced sync writers. Every step is isolated in its
 * own try/catch so one failure never aborts the rest, and nothing is swallowed.
 */
export async function bootstrapSession(firebaseUser) {
  const uid = firebaseUser.uid

  try {
    await ensureUserDoc(firebaseUser)
  } catch (e) {
    console.error('[sessionBootstrap] ensureUserDoc failed:', e)
  }

  // Hydrate coins from Firestore — authoritative value set by Cloud Functions.
  try {
    const snap = await getDoc(refs.user(uid))
    const serverCoins = snap.data()?.coins ?? 0
    if (serverCoins > 0) useUserStore.getState().setCoins(serverCoins)
  } catch (e) {
    console.error('[sessionBootstrap] hydrate coins failed:', e)
  }

  try {
    await hydrateSelectStoreFromFirestore(uid)
  } catch (e) {
    console.error('[sessionBootstrap] hydrate select failed:', e)
  }

  try {
    await hydratePortfolioFromFirestore(uid)
    setPortfolioSyncUser(uid)
  } catch (e) {
    console.error('[sessionBootstrap] hydrate/arm portfolio failed:', e)
  }

  try {
    await hydrateTasksFromFirestore(uid)
    setTaskSyncUser(uid)
  } catch (e) {
    console.error('[sessionBootstrap] hydrate/arm tasks failed:', e)
  }

  try {
    await hydrateRoadmapFromFirestore(uid)
    setRoadmapSyncUser(uid)
  } catch (e) {
    console.error('[sessionBootstrap] hydrate/arm roadmap failed:', e)
  }
}

/**
 * Stop the debounced sync writers on logout.
 */
export function teardownSession() {
  setPortfolioSyncUser(null)
  setTaskSyncUser(null)
  setRoadmapSyncUser(null)
}
