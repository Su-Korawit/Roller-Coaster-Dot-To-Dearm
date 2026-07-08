import { create } from 'zustand'
import { getDocs, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { cols, refs, queries } from '../lib/db'
import { useSchoolStore } from './useSchoolStore'
import { useAuthStore } from './useAuthStore'
import { toTimetableTemplate } from '../utils/timetableTemplate'

// One-shot fetches (no listener) — templates are browse-on-demand content.
async function fetchInto(set, q) {
  set({ loading: true })
  try {
    const snap = await getDocs(q)
    set({ templates: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false })
  } catch (error) {
    console.error('[timetableTemplates] fetch failed:', error)
    set({ loading: false })
  }
}

export const useTimetableTemplatesStore = create((set) => ({
  templates: [],
  loading: false,

  loadLatest: () => fetchInto(set, queries.latestTemplates()),

  searchBySchool: (term) => {
    const trimmed = term.trim()
    if (!trimmed) return fetchInto(set, queries.latestTemplates())
    return fetchInto(set, queries.templatesBySchool(trimmed))
  },

  publishTemplate: async ({ name, schoolName, classLevel }) => {
    const uid = useAuthStore.getState().user?.uid
    if (!uid) throw new Error('not signed in')
    const { subjects, scheduleSlots } = useSchoolStore.getState()
    await addDoc(cols.timetableTemplates, {
      ...toTimetableTemplate(subjects, scheduleSlots),
      name: name.trim(),
      schoolName: schoolName.trim(),
      classLevel,
      createdBy: uid,
      createdAt: serverTimestamp(),
    })
  },

  deleteTemplate: async (id) => {
    await deleteDoc(refs.timetableTemplate(id))
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
  },
}))
