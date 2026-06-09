import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useTaskStore } from '../stores/useTaskStore'

/**
 * Firestore is the source of truth for tasks; localStorage (zustand persist)
 * is just a cache for fast load / offline. These helpers mirror
 * syncPortfolioToFirestore.js.
 */

let currentUid = null   // latest signed-in uid; null when logged out
let subscribed = false  // store subscription is set up once
let timer = null        // debounce handle for auto-sync writes
let suppress = false    // skip auto-sync while hydrating from Firestore

/**
 * Write the store's tasks into Firestore users/{uid}.
 * merge:true keeps unrelated doc fields intact.
 */
export async function syncTasksToFirestore(uid) {
  if (!uid) return
  const { tasks, trash } = useTaskStore.getState()
  try {
    await setDoc(
      doc(db, 'users', uid),
      { tasks, trash, tasksUpdatedAt: serverTimestamp() },
      { merge: true },
    )
  } catch (error) {
    console.error('[syncTasksToFirestore] failed:', error)
  }
}

/**
 * Load tasks from Firestore into the store (Firestore wins).
 * If Firestore is missing the tasks field, seed it from the local cache — this
 * migrates existing users who only had local data.
 */
export async function hydrateTasksFromFirestore(uid) {
  if (!uid) return
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    const data = snap.exists() ? snap.data() : {}

    if (data.tasks) {
      suppress = true
      useTaskStore.setState({ tasks: data.tasks, trash: data.trash ?? [] })
      suppress = false
    }

    // First-time migration: push local cache up if Firestore lacks tasks.
    if (!data.tasks) {
      await syncTasksToFirestore(uid)
    }
  } catch (error) {
    console.error('[hydrateTasksFromFirestore] failed:', error)
  }
}

/**
 * Set the active sync uid and (once) subscribe to store changes so every task
 * mutation — from any component or AI action — is debounced and pushed to
 * Firestore. Pass null on logout to stop syncing.
 */
export function setTaskSyncUser(uid) {
  currentUid = uid
  if (!uid) clearTimeout(timer) // cancel pending write (e.g. on logout)

  if (subscribed) return
  subscribed = true
  useTaskStore.subscribe((state, prev) => {
    if (suppress || !currentUid) return
    if (state.tasks === prev.tasks && state.trash === prev.trash) return
    clearTimeout(timer)
    timer = setTimeout(() => syncTasksToFirestore(currentUid), 1000)
  })
}
