import { create } from 'zustand'

// Transient on-screen feedback ("+25 XP", "LEVEL UP!"). Each toast removes itself,
// so callers just push and forget; FxLayer renders whatever is here.
export const TOAST_MS = 2200

let nextId = 1

export const useFxStore = create((set, get) => ({
  toasts: [],   // [{ id, kind: 'xp' | 'levelup' | 'coin' | 'info', text }]

  push: (toast, ms = TOAST_MS) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, ...toast }] }))   // cap the stack at 4
    setTimeout(() => get().remove(id), ms)
    return id
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}))
