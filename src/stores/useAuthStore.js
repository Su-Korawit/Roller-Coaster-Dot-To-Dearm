import { create } from 'zustand'
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth'
import { getDoc, setDoc } from 'firebase/firestore'
import { auth } from '../firebase'
import { refs, shapes } from '../lib/db'
import { hydrateSelectStoreFromFirestore } from '../utils/syncSelectToFirestore'
import { hydratePortfolioFromFirestore, setPortfolioSyncUser } from '../utils/syncPortfolioToFirestore'
import { hydrateTasksFromFirestore, setTaskSyncUser } from '../utils/syncTasksToFirestore'
import { hydrateRoadmapFromFirestore, setRoadmapSyncUser } from '../utils/syncRoadmapToFirestore'
import { useUserStore } from './useUserStore'

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

export const useAuthStore = create((set) => {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        await ensureUserDoc(firebaseUser)
        // Hydrate coins from Firestore — authoritative value set by Cloud Functions.
        const snap = await getDoc(refs.user(firebaseUser.uid))
        const serverCoins = snap.data()?.coins ?? 0
        if (serverCoins > 0) useUserStore.getState().setCoins(serverCoins)
        await hydrateSelectStoreFromFirestore(firebaseUser.uid)
        await hydratePortfolioFromFirestore(firebaseUser.uid)
        setPortfolioSyncUser(firebaseUser.uid)
        await hydrateTasksFromFirestore(firebaseUser.uid)
        setTaskSyncUser(firebaseUser.uid)
        await hydrateRoadmapFromFirestore(firebaseUser.uid)
        setRoadmapSyncUser(firebaseUser.uid)
      } catch (e) {
        console.warn('[useAuthStore] post-auth sync failed:', e.message)
      }
    } else {
      setPortfolioSyncUser(null)
      setTaskSyncUser(null)
      setRoadmapSyncUser(null)
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
