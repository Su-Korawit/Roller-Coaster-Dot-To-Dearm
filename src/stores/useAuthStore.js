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

// Custom claims (e.g. `creator`) ride on the ID token. A failed read must never
// block sign-in, so it degrades to "no claims".
async function readClaims(firebaseUser) {
  try {
    return (await firebaseUser?.getIdTokenResult?.())?.claims ?? null
  } catch (e) {
    console.error('[useAuthStore] reading claims failed:', e)
    return null
  }
}

export const useAuthStore = create((set, get) => {
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
      const claims = firebaseUser ? await readClaims(firebaseUser) : null
      set({ user: firebaseUser ?? null, claims, loading: false })
    }
  })

  return {
    user: null,
    claims: null,
    loading: true,

    // A role granted while signed in only shows up on a new token.
    refreshClaims: async () => {
      const user = get().user
      if (!user?.getIdToken) return
      await user.getIdToken(true)
      set({ claims: await readClaims(user) })
    },

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
