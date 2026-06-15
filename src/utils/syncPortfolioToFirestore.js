import { setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { refs } from '../lib/db'
import { useUserStore } from '../stores/useUserStore'

/**
 * Firestore is the source of truth for portfolioData + journeys; localStorage
 * (zustand persist) is just a cache for fast load / offline. These helpers
 * mirror syncSelectToFirestore.js.
 */

let currentUid = null   // latest signed-in uid; null when logged out
let subscribed = false  // store subscription is set up once
let timer = null        // debounce handle for auto-sync writes
let suppress = false    // skip auto-sync while hydrating from Firestore

/**
 * Write the store's portfolioData + journeys into Firestore users/{uid}.
 * merge:true keeps unrelated doc fields intact.
 */
export async function syncPortfolioToFirestore(uid) {
  if (!uid) return
  const { portfolioData, journeys } = useUserStore.getState()
  try {
    await setDoc(
      refs.user(uid),
      { portfolioData, journeys, portfolioUpdatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (error) {
    console.error('[syncPortfolioToFirestore] failed:', error)
  }
}

/**
 * Load portfolioData + journeys from Firestore into the store (Firestore wins).
 * If Firestore is missing either field, seed it from the local cache — this
 * migrates existing users who only had local data.
 */
export async function hydratePortfolioFromFirestore(uid) {
  if (!uid) return
  try {
    const snap = await getDoc(refs.user(uid))
    const data = snap.exists() ? snap.data() : {}

    const updates = {}
    if (data.portfolioData) updates.portfolioData = data.portfolioData
    if (data.journeys) updates.journeys = data.journeys
    if (data.photoURL) updates.profilePhotoURL = data.photoURL

    if (Object.keys(updates).length > 0) {
      suppress = true
      useUserStore.setState(updates)
      suppress = false
    }

    // First-time migration: push local cache up for whatever Firestore lacks.
    if (!data.portfolioData || !data.journeys) {
      await syncPortfolioToFirestore(uid)
    }
  } catch (error) {
    console.error('[hydratePortfolioFromFirestore] failed:', error)
  }
}

/**
 * Set the active sync uid and (once) subscribe to store changes so every
 * portfolio/journey mutation — from any component or AI action — is debounced
 * and pushed to Firestore. Pass null on logout to stop syncing.
 */
export function setPortfolioSyncUser(uid) {
  currentUid = uid
  if (!uid) clearTimeout(timer) // cancel pending write (e.g. resetUser on logout)

  if (subscribed) return
  subscribed = true
  useUserStore.subscribe((state, prev) => {
    if (suppress || !currentUid) return
    if (state.portfolioData === prev.portfolioData && state.journeys === prev.journeys) return
    clearTimeout(timer)
    timer = setTimeout(() => syncPortfolioToFirestore(currentUid), 1000)
  })
}
