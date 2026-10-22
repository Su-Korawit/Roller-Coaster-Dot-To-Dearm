import { create } from 'zustand'
import { mergeResume, sanitizeResume, validPoint, EMPTY_RESUME } from '../lib/resumeRules'

const KEY = 'rc-resume'

export function readLocalResume() {
  try {
    return sanitizeResume(JSON.parse(localStorage.getItem(KEY)))
  } catch {
    return { ...EMPTY_RESUME }
  }
}

// Where the player last stood on each map ({ last, points }). Every record is cached in
// localStorage at once; accounts also sync it to users/{uid}.resume (see syncManager).
export const useResumeStore = create((set, get) => ({
  ...readLocalResume(),

  record: (mapKey, { x, y, facing, label }) => {
    if (!mapKey || !validPoint({ x, y })) return
    const point = { x, y, facing: facing ?? 'down', label: label ?? '', at: Date.now() }
    set({ last: mapKey, points: { ...get().points, [mapKey]: point } })
  },

  // A map that cannot be loaded must not be booted into again: drop its point.
  forget: (mapKey) => {
    const { [mapKey]: _gone, ...points } = get().points
    set(mergeResume(null, { last: null, points }))
  },

  // The newest point per map wins, so a second device's walk is not lost.
  hydrate: (cloud) => set(mergeResume({ last: get().last, points: get().points }, cloud)),

  reset: () => set({ ...EMPTY_RESUME, points: {} }),
}))

useResumeStore.subscribe((s, prev) => {
  if (s.points === prev.points && s.last === prev.last) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ last: s.last, points: s.points }))
  } catch { /* storage unavailable: resume still works for this visit */ }
})
