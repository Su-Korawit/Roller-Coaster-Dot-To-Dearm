import { create } from 'zustand'
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { syncSelectToFirestore, hydrateSelectStoreFromFirestore } from '../utils/syncSelectToFirestore'
import { hydratePortfolioFromFirestore, setPortfolioSyncUser } from '../utils/syncPortfolioToFirestore'

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
  const ref = doc(db, 'users', firebaseUser.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  const { mbti, program, university, mastery } = readSelectStore()
  await setDoc(ref, {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName ?? '',
    email: firebaseUser.email ?? '',
    photoURL: firebaseUser.photoURL ?? null,
    mbti: mbti ?? null,
    program: program ?? null,
    university: university ?? null,
    mastery: mastery ?? null,
    schoolId: null,
    schoolName: null,
    schoolLat: null,
    schoolLng: null,
    followRequests: [],
    followers: [],
    following: [],
    matchScore: 0,
    fireStacks: 0,
    createdAt: serverTimestamp(),
  })
}

export const useAuthStore = create((set) => {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        await ensureUserDoc(firebaseUser)
        await syncSelectToFirestore(firebaseUser.uid)
        await hydrateSelectStoreFromFirestore(firebaseUser.uid)
        await hydratePortfolioFromFirestore(firebaseUser.uid)
        setPortfolioSyncUser(firebaseUser.uid)
      } catch (e) {
        console.warn('[useAuthStore] post-auth sync failed:', e.message)
      }
    } else {
      setPortfolioSyncUser(null)
    }
    set({ user: firebaseUser ?? null, loading: false })
  })

  return {
    user: null,
    loading: true,

    signIn: async (method, credentials) => {
      if (method === 'google') {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
      } else if (method === 'register') {
        await createUserWithEmailAndPassword(auth, credentials.email, credentials.password)
      } else {
        await signInWithEmailAndPassword(auth, credentials.email, credentials.password)
      }
      // onAuthStateChanged updates the store automatically
    },

    signOut: async () => {
      await fbSignOut(auth)
    },
  }
})
