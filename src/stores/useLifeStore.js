import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { newId, toggleDone, todayKey } from '../os/lifeLogic'

// Goal / Habit / Reading data for the OS apps. Per device (localStorage), like useOsStore.
export const useLifeStore = create(
  persist(
    (set) => ({
      // Goal: one target (university / faculty / major) + the scores it needs.
      target: { university: '', faculty: '', major: '', interest: '' },
      scores: [],   // { id, subject, needed, mine }  e.g. TGAT, A-Level Math
      // Habit: today's plan tasks (with a tag) and repeating habits.
      tasks: [],    // { id, text, tag: 'TGAT'|'A-LEVEL'|'อื่นๆ', date, done }
      habits: [],   // { id, name, doneDates: ['YYYY-MM-DD'] }
      books: [],    // { id, title, totalPages, page }

      setTarget: (patch) => set((s) => ({ target: { ...s.target, ...patch } })),
      addScore: (subject, needed) =>
        set((s) => (subject.trim()
          ? { scores: [...s.scores, { id: newId(), subject: subject.trim(), needed: Number(needed) || 0, mine: null }] }
          : s)),
      setMyScore: (id, mine) =>
        set((s) => ({ scores: s.scores.map((x) => x.id === id ? { ...x, mine: mine === '' ? null : Number(mine) } : x) })),
      removeScore: (id) => set((s) => ({ scores: s.scores.filter((x) => x.id !== id) })),

      addTask: (text, tag = 'อื่นๆ', date = todayKey()) =>
        set((s) => (text.trim() ? { tasks: [...s.tasks, { id: newId(), text: text.trim(), tag, date, done: false }] } : s)),
      toggleTask: (id) => set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t) })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addHabit: (name) =>
        set((s) => (name.trim() ? { habits: [...s.habits, { id: newId(), name: name.trim(), doneDates: [] }] } : s)),
      removeHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),
      toggleHabitToday: (id) =>
        set((s) => ({ habits: s.habits.map((h) => h.id === id ? { ...h, doneDates: toggleDone(h.doneDates, todayKey()) } : h) })),

      addBook: (title, totalPages) =>
        set((s) => (title.trim()
          ? { books: [...s.books, { id: newId(), title: title.trim(), totalPages: Math.max(0, Number(totalPages) || 0), page: 0 }] }
          : s)),
      removeBook: (id) => set((s) => ({ books: s.books.filter((b) => b.id !== id) })),
      setBookPage: (id, page) =>
        set((s) => ({
          books: s.books.map((b) => b.id === id
            ? { ...b, page: Math.max(0, Math.min(b.totalPages || Infinity, Number(page) || 0)) }
            : b),
        })),
    }),
    { name: 'rc-life-store' },
  ),
)
