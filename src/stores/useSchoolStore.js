import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUserStore } from './useUserStore'

function nextId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

export const useSchoolStore = create(
  persist(
    (set) => ({
      subjects: [],
      scheduleSlots: [],
      appointments: [],

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

      clearSchool: () => set({ subjects: [], scheduleSlots: [], appointments: [] }),
    }),
    { name: 'rc-school-store' },
  ),
)
