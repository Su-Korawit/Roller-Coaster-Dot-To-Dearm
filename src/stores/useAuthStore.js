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
    if (firebaseUser) {
      await bootstrapSession(firebaseUser)
    } else {
      teardownSession()
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
