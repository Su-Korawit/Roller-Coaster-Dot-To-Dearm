import { create } from 'zustand'
import { GUIDE_STEPS, nextAvailable } from '../constants/guideSteps'
import { onGuideEvent } from '../lib/guideEvents'
import { sanitizeGuide, GUIDE_END, FRESH_GUIDE } from '../lib/guideRules'

const KEY = 'rc-guide'
const END = GUIDE_END
const FRESH = FRESH_GUIDE

export function readLocalGuide() {
  try {
    return sanitizeGuide(JSON.parse(localStorage.getItem(KEY)))
  } catch {
    return { ...FRESH }
  }
}

export const isGuideActive = (s) => s.started && !s.done && !s.skipped && s.step < END

// What the student can do right now (set by the overlay; the store never reaches into other
// stores, which keeps the producers of events free of import cycles).
let provider = () => null

const finishOrStep = (step) => (step >= END ? { step: END, done: true } : { step })

// The hands-on guide: a step finishes only when the student performs its action.
export const useGuideStore = create((set, get) => ({
  ...readLocalGuide(),

  setContextProvider: (fn) => { provider = fn },

  start: () => {
    const ctx = provider()
    if (!ctx) return
    set({ ...FRESH, started: true, ...finishOrStep(nextAvailable(0, ctx)) })
  },

  // Skip steps that became impossible or already true (e.g. the student bought something elsewhere).
  refresh: () => {
    const s = get()
    const ctx = provider()
    if (!isGuideActive(s) || !ctx) return
    const step = nextAvailable(s.step, ctx)
    if (step !== s.step) set(finishOrStep(step))
  },

  notify: (event) => {
    const s = get()
    if (!isGuideActive(s) || GUIDE_STEPS[s.step].doneOn !== event) return
    const ctx = provider()
    set(finishOrStep(ctx ? nextAvailable(s.step + 1, ctx) : s.step + 1))
  },

  skip: () => set({ skipped: true }),

  replay: () => get().start(),

  current: () => (isGuideActive(get()) ? GUIDE_STEPS[get().step] : null),

  setGuide: (d) => set(sanitizeGuide(d)),

  reset: () => set({ ...FRESH }),
}))

onGuideEvent((event) => useGuideStore.getState().notify(event))

useGuideStore.subscribe((s, prev) => {
  if (s.started === prev.started && s.step === prev.step && s.done === prev.done && s.skipped === prev.skipped) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ started: s.started, step: s.step, done: s.done, skipped: s.skipped }))
  } catch { /* storage unavailable */ }
})
