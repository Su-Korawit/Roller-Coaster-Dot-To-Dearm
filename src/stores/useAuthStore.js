import { create } from 'zustand'
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth'
import { auth } from '../firebase'
import { bootstrapSession, teardownSession } from '../services/sessionBootstrap'

export const useAuthStore = create((set) => {
  onAuthStateChanged(auth, async (firebaseUser) => {
    // A throw anywhere in bootstrap/teardown must never leave `loading` stuck
    // at true — every gate in the app (RequireAuth/RequireAdmin) blocks on it,
    // so a stuck true renders an infinite spinner or, for RequireAdmin, a
    // silent blank page.
    try {
      if (firebaseUser) {
        await bootstrapSession(firebaseUser)
      } else {
        teardownSession()
      }
    } catch (e) {
      console.error('[useAuthStore] session bootstrap/teardown failed:', e)
    } finally {
      set({ user: firebaseUser ?? null, loading: false })
    }
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
