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
 * Read Firestore users/{uid}.profile back into useSelectStore.
 * Only hydrates fields that are empty in localStorage — new-device fallback.
 */
export async function hydrateSelectStoreFromFirestore(uid) {
  if (!uid) return

  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return

    const profile = snap.data()?.profile
    if (!profile) return

    const store = useSelectStore.getState()
    const { setMbti, setCareer, setMastery, setUniversity, setProgram } = store

    if (!store.mbti && profile.mbti)             setMbti(profile.mbti)
    if (!store.career && profile.career)         setCareer(profile.career)
    if (!store.mastery && profile.masteryTrack)  setMastery(profile.masteryTrack)
    if (!store.university && profile.university) setUniversity(profile.university)
    if (!store.program && profile.program)       setProgram(profile.program)
  } catch (error) {
    console.error('[hydrateSelectStoreFromFirestore] failed:', error)
  }
}
