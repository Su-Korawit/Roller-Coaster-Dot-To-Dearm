import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { newId, toggleDone, todayKey } from '../os/lifeLogic'
import { replaceAutoTasks, roomIdFor } from '../os/studyPlan'
import { MAX_GOALS, applyGoalToState, goalKey, moveGoal } from '../os/goalLogic'

// Goal / Habit / Reading data for the OS apps. Cached on the device (localStorage) and synced to
// users/{uid}.os (see syncManager). `ownerUid` stops one account's data showing up for another
// on a shared device: adoptUser() clears everything when a different user signs in.
const EMPTY = () => ({
  target: { university: '', faculty: '', major: '', interest: '', examDate: '', examDateManual: false },
  hoursPerDay: 2,
  goals: [],          // up to MAX_GOALS programmes, see goalLogic.makeGoal (the first/primary drives target + scores)
  primaryGoalId: null,
  scores: [],   // { id, subject, needed, mine, fromGoal? }
  tasks: [],    // { id, text, tag, date, done, auto?, minutes?, subject? }
  habits: [],   // { id, name, doneDates }
  books: [],    // { id, title, totalPages, page }
  readLog: {},  // { 'YYYY-MM-DD': minutes read }
  planSummary: '',   // short AI/auto note shown on the Habit cards
})

export const useLifeStore = create(
  persist(
    (set) => ({
      ownerUid: null,
      ...EMPTY(),

      adoptUser: (uid) => set((s) => (s.ownerUid === uid ? s : { ...EMPTY(), ownerUid: uid })),

      // Add a programme as a goal (duplicates and a full list are refused). The first one becomes primary.
      addGoal: (goal) => {
        let result = { ok: true }
        set((s) => {
          if (s.goals.some((g) => goalKey(g) === goalKey(goal))) { result = { ok: false, reason: 'duplicate' }; return s }
          if (s.goals.length >= MAX_GOALS) { result = { ok: false, reason: 'full' }; return s }
          const goals = [...s.goals, goal]
          if (s.primaryGoalId && s.goals.some((g) => g.id === s.primaryGoalId)) return { goals }
          return { goals, primaryGoalId: goal.id, ...applyGoalToState(s, goal) }
        })
        return result
      },
      setPrimaryGoal: (id) =>
        set((s) => {
          const goal = s.goals.find((g) => g.id === id)
          return goal ? { primaryGoalId: id, ...applyGoalToState(s, goal) } : s
        }),
      // Drag order: rank 1 is the primary goal, so moving a goal to the top makes it primary.
      reorderGoals: (fromId, toId) =>
        set((s) => {
          const goals = moveGoal(s.goals, fromId, toId)
          if (goals === s.goals) return s
          const top = goals[0]
          return top && top.id !== s.primaryGoalId
            ? { goals, primaryGoalId: top.id, ...applyGoalToState(s, top) }
            : { goals }
        }),
      removeGoal: (id) =>
        set((s) => {
          const goals = s.goals.filter((g) => g.id !== id)
          if (goals.length === s.goals.length) return s
          if (s.primaryGoalId !== id) return { goals }
          const next = goals[0]
          return next ? { goals, primaryGoalId: next.id, ...applyGoalToState(s, next) } : { goals, primaryGoalId: null }
        }),

      setTarget: (patch) => set((s) => ({ target: { ...s.target, ...patch } })),
      setHoursPerDay: (h) => set({ hoursPerDay: Math.min(12, Math.max(0.5, Number(h) || 2)) }),
      addScore: (subject, needed) =>
        set((s) => (subject.trim()
          ? { scores: [...s.scores, { id: newId(), subject: subject.trim(), needed: Number(needed) || 0, mine: null }] }
          : s)),
      setMyScore: (id, mine) =>
        set((s) => ({ scores: s.scores.map((x) => x.id === id ? { ...x, mine: mine === '' ? null : Number(mine) } : x) })),
      removeScore: (id) => set((s) => ({ scores: s.scores.filter((x) => x.id !== id) })),

      // Replace the auto-generated tasks from today on with a fresh plan.
      applyPlan: (newTasks, summary = '') =>
        set((s) => ({ tasks: replaceAutoTasks(s.tasks, newTasks, todayKey()), planSummary: summary })),

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

      // Reading time: add finished minutes to today's log and tick matching auto tasks' time off nothing —
      // plan tasks are ticked by the user; the log feeds the Habit cards and the leaderboard.
      addReading: (minutes, day = todayKey()) =>
        set((s) => (minutes > 0
          ? { readLog: { ...s.readLog, [day]: (s.readLog[day] || 0) + Math.round(minutes) } }
          : s)),
    }),
    { name: 'rc-life-store', version: 3, migrate: (state) => ({ ...EMPTY(), ...state, ownerUid: state?.ownerUid ?? null }) },
  ),
)

// Chat room of the user's goal (same faculty + major, any university) — '' when no faculty chosen.
export const selectRoomId = (s) => roomIdFor(s.target.faculty, s.target.major)
