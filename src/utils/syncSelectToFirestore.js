import { setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import { useSelectStore } from '../stores/useSelectStore'
import { usePlansStore } from '../stores/usePlansStore'

/**
 * Push current useSelectStore values into Firestore users/{uid}.profile.
 * Uses merge:true so only the provided fields are written — safe to call
 * at any point without overwriting unrelated doc fields.
 */
export async function syncSelectToFirestore(uid) {
  if (!uid) return

  const { mbti, career, mastery } = useSelectStore.getState()
  const { plans, activePlanId } = usePlansStore.getState()
  const profile = shapes.profileFields({ mbti, career, mastery, plans, activePlanId })

  if (Object.keys(profile).length === 0) return

  try {
    await setDoc(
      refs.user(uid),
      { profile: { ...profile, updatedAt: serverTimestamp() } },
      { merge: true },
    )
  } catch (error) {
    console.error('[syncSelectToFirestore] failed:', error)
    throw error
  }
}

/**
 * Load profile selections from Firestore into useSelectStore (Firestore wins).
 * If Firestore has no profile yet, migrate local values up — first-time push.
 * Call this BEFORE any local push so the most recently saved Cloud values
 * always take precedence over stale local state on a second device.
 */
export async function hydrateSelectStoreFromFirestore(uid) {
  if (!uid) return

  try {
    const snap = await getDoc(refs.user(uid))
    if (!snap.exists()) return
    const data = snap.data()

    // Firestore-wins: read through the canonical shape (handles legacy
    // top-level docs) and overwrite local so it stays consistent across devices.
    const { mbti, career, masteryTrack, university, program, plans, activePlanId } = shapes.readProfile(data)
    const { setMbti, setCareer, setMastery, setUniversity, setProgram } = useSelectStore.getState()
    usePlansStore.setState({ plans, activePlanId })
    if (mbti)         setMbti(mbti)
    if (career)       setCareer(career)
    if (masteryTrack) setMastery(masteryTrack)
    if (university)   setUniversity(university)
    if (program)      setProgram(program)

    // Backfill profile.* for legacy docs that only had top-level fields.
    if (!data.profile) await syncSelectToFirestore(uid)
  } catch (error) {
    console.error('[hydrateSelectStoreFromFirestore] failed:', error)
  }
}
