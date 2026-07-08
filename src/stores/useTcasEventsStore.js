import { create } from 'zustand'
import { addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { cols, refs, queries } from '../lib/db'
import { createFirestoreListener } from '../lib/firestoreListener'

// Mirrors useNewsStore: shared listener slot, admin-gated add/delete.
const eventsListener = createFirestoreListener()

export const useTcasEventsStore = create((set) => ({
  events: [], // [{ id, title, description, date: 'YYYY-MM-DD', link }] ordered by date asc

  subscribeEvents: () =>
    eventsListener.attach(queries.tcasEventsByDate(), (snap) => {
      set({ events: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
    }),

  addEvent: async ({ title, description, date, link }) => {
    await addDoc(cols.tcasEvents, {
      title: title.trim(),
      description: description.trim(),
      date,
      link: link?.trim() || null,
      createdAt: serverTimestamp(),
    })
  },

  deleteEvent: async (id) => {
    await deleteDoc(refs.tcasEvent(id))
  },
}))
