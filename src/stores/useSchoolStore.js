import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUserStore } from './useUserStore'

function nextId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

export const useSchoolStore = create(
  persist(
    (set, get) => ({
      subjects: [],
      scheduleSlots: [],
      appointments: [],
      notes: [],

      addSubject: ({ name, color = '#a78bda', description = '' }) => {
        const id = nextId('subject')
        set((state) => ({
          subjects: [...state.subjects, { id, name, color, description, createdAt: Date.now() }],
        }))
        return id
      },
      updateSubject: (id, patch) =>
        set((state) => ({
          subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeSubject: (id) =>
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
          scheduleSlots: state.scheduleSlots.filter((sl) => sl.subjectId !== id),
          appointments: state.appointments.filter((a) => a.subjectId !== id),
        })),

      addScheduleSlot: (subjectId, { day, startTime, endTime }) => {
        const id = nextId('slot')
        set((state) => ({
          scheduleSlots: [...state.scheduleSlots, { id, subjectId, day, startTime, endTime }],
        }))
        return id
      },
      updateScheduleSlot: (id, patch) =>
        set((state) => ({
          scheduleSlots: state.scheduleSlots.map((sl) => (sl.id === id ? { ...sl, ...patch } : sl)),
        })),
      removeScheduleSlot: (id) =>
        set((state) => ({ scheduleSlots: state.scheduleSlots.filter((sl) => sl.id !== id) })),

      addAppointment: (subjectId, { title, kind = 'homework', dueDate }) => {
        const id = nextId('appt')
        set((state) => ({
          appointments: [
            ...state.appointments,
            { id, subjectId, title, kind, dueDate, completed: false, createdAt: Date.now(), completedAt: null },
          ],
        }))
        return id
      },
      updateAppointment: (id, patch) =>
        set((state) => ({
          appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      removeAppointment: (id) =>
        set((state) => ({ appointments: state.appointments.filter((a) => a.id !== id) })),
      upsertNote: ({ date, subjectId = null, text }) => {
        const existing = get().notes.find((n) => n.date === date && (n.subjectId ?? null) === subjectId)
        if (existing) {
          set((s) => ({
            notes: s.notes.map((n) => (n.id === existing.id ? { ...n, text, updatedAt: Date.now() } : n)),
          }))
          return existing.id
        }
        const id = nextId('note')
        set((s) => ({
          notes: [...s.notes, { id, date, subjectId, text, createdAt: Date.now(), updatedAt: Date.now() }],
        }))
        return id
      },
      removeNote: (id) =>
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),
      importNotes: (entries) => {
        entries.forEach((entry) => get().upsertNote(entry))
      },
      // Only tracks the streak stack here (mirrors useTaskStore.toggleTask).
      // Coin rewards are decided and applied by the calling UI, same as
      // TaskPanel does for regular tasks.
      toggleAppointment: (id) =>
        set((state) => {
          const appt = state.appointments.find((a) => a.id === id)
          if (!appt) return state
          const completing = !appt.completed
          if (completing) useUserStore.getState().incrementStacks()
          return {
            appointments: state.appointments.map((a) =>
              a.id === id
                ? { ...a, completed: completing, completedAt: completing ? Date.now() : null }
                : a,
            ),
          }
        }),

      clearSchool: () => set({ subjects: [], scheduleSlots: [], appointments: [], notes: [] }),
    }),
    { name: 'rc-school-store' },
  ),
)
