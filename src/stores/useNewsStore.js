import { create } from 'zustand'
import { addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { cols, refs, queries } from '../lib/db'
import { createFirestoreListener } from '../lib/firestoreListener'
import { STATIC_UPDATES } from '../data/appUpdates'

// Shared listener slot — owns the detach-before-reattach lifecycle.
const updatesListener = createFirestoreListener()

// getAllUpdates cache — must return a stable reference while `updates` is
// unchanged, because NewsPanel selects it reactively and useSyncExternalStore
// treats a fresh array as a new snapshot every render (infinite loop).
let mergedUpdates = null
let mergedSource = null

export const useNewsStore = create((set, get) => ({
  updates: [], // Firestore-backed appUpdates, admin-added

  // Attaches a real-time listener to appUpdates ordered by createdAt desc.
  // Replaces any existing listener. Returns the unsubscribe function.
  subscribeUpdates: () =>
    updatesListener.attach(queries.appUpdatesByDate(), (snap) => {
      set({ updates: snap.docs.map((d) => ({ id: d.id, _firestore: true, ...d.data() })) })
    }),

  addUpdate: async ({ type, title, description, image }) => {
    await addDoc(cols.appUpdates, {
      type,
      title: title.trim(),
      description: description.trim(),
      image: image?.trim() || null,
      createdAt: serverTimestamp(),
    })
  },

  deleteUpdate: async (id) => {
    await deleteDoc(refs.appUpdate(id))
  },

  // Merge static + Firestore updates, sorted by date desc.
  getAllUpdates: () => {
    const { updates } = get()
    if (mergedSource !== updates) {
      mergedSource = updates
      mergedUpdates = [...STATIC_UPDATES, ...updates]
        .map((u) => ({ ...u, _ts: u.createdAt?.toMillis?.() ?? new Date(u.date).getTime() }))
        .sort((a, b) => b._ts - a._ts)
    }
    return mergedUpdates
  },
}))
