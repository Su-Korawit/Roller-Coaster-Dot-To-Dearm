import { create } from 'zustand'
import { addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { cols, refs, queries } from '../lib/db'
import { createFirestoreListener } from '../lib/firestoreListener'
import { isSubjectKey } from '../utils/planDerive'

const KINDS = ['apply', 'exam', 'announce', 'other']

// Optional plan fields (ADR-0025): anything invalid is dropped, never stored.
function planFields({ round, kind, examKeys }) {
  const r = Number(round)
  const keys = (Array.isArray(examKeys) ? examKeys : String(examKeys ?? '').split(','))
    .map((k) => (typeof k === 'string' ? k.trim() : k))
    .filter(isSubjectKey)
  return {
    ...(Number.isInteger(r) && r >= 1 && r <= 4 ? { round: r } : {}),
    ...(KINDS.includes(kind) ? { kind } : {}),
    ...(keys.length ? { examKeys: [...new Set(keys)] } : {}),
  }
}

// Mirrors useNewsStore: shared listener slot, admin-gated add/delete.
const eventsListener = createFirestoreListener()

export const useTcasEventsStore = create((set) => ({
  events: [], // [{ id, title, description, date: 'YYYY-MM-DD', link }] ordered by date asc

  subscribeEvents: () =>
    eventsListener.attach(queries.tcasEventsByDate(), (snap) => {
      set({ events: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
    }),

  addEvent: async ({ title, description, date, link, round, kind, examKeys }) => {
    await addDoc(cols.tcasEvents, {
      title: title.trim(),
      description: description.trim(),
      date,
      link: link?.trim() || null,
      ...planFields({ round, kind, examKeys }),
      createdAt: serverTimestamp(),
    })
  },

  deleteEvent: async (id) => {
    await deleteDoc(refs.tcasEvent(id))
  },
}))
