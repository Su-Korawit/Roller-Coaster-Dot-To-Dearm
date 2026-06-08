import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useSelectStore } from '../stores/useSelectStore'

/**
 * Push current useSelectStore values into Firestore users/{uid}.profile.
 * Uses merge:true so only the provided fields are written — safe to call
 * at any point without overwriting unrelated doc fields.
 */
export async function syncSelectToFirestore(uid) {
  if (!uid) return

  const { mbti, career, mastery, university, program } = useSelectStore.getState()

  const profileData = {}
  if (mbti)       profileData.mbti = mbti
  if (career)     profileData.career = career
  if (mastery)    profileData.masteryTrack = mastery
  if (university) profileData.university = university
  if (program)    profileData.program = program

  if (Object.keys(profileData).length === 0) return

  profileData.updatedAt = serverTimestamp()

  try {
    await setDoc(
      doc(db, 'users', uid),
      { profile: profileData },
      { merge: true },
    )
  } catch (error) {
    console.error('[syncSelectToFirestore] failed:', error)
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
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return

    const profile = snap.data()?.profile
    if (!profile) {
      // First-time migration: push whatever is local up to Firestore.
      await syncSelectToFirestore(uid)
      return
    }

    const { setMbti, setCareer, setMastery, setUniversity, setProgram } = useSelectStore.getState()

    // Firestore-wins: always overwrite local so background/character stays
    // consistent across devices.
    if (profile.mbti)        setMbti(profile.mbti)
    if (profile.career)      setCareer(profile.career)
    if (profile.masteryTrack) setMastery(profile.masteryTrack)
    if (profile.university)  setUniversity(profile.university)
    if (profile.program)     setProgram(profile.program)
  } catch (error) {
    console.error('[hydrateSelectStoreFromFirestore] failed:', error)
  }
}
