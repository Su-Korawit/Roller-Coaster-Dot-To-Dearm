// Client port of functions/leavesMath.js (same results, run against the same fixtures in
// focusRulesFixtures.json). Used for the HUD tree preview and form validation; the
// server is the only place Leaves are actually decided.

export const MODES = ['strict', 'flexible']
export const PLANNED_MIN = { min: 10, max: 120 }
const RATE = { strict: 1.5, flexible: 1 }
const COMPLETION_BONUS = 1.1
const DEFAULTS = { mode: 'flexible', plannedMin: 25 }
export const PRACTICE = { plannedMin: 1, leaves: 10, minVerifiedMs: 45000 }

export function validateFocusParams({ mode, plannedMin } = {}) {
  const m = mode === undefined ? DEFAULTS.mode : mode
  if (!MODES.includes(m)) return { ok: false, code: 'bad_mode' }
  const p = plannedMin === undefined ? DEFAULTS.plannedMin : plannedMin
  if (!Number.isInteger(p) || p < PLANNED_MIN.min || p > PLANNED_MIN.max) return { ok: false, code: 'bad_planned' }
  return { ok: true, mode: m, plannedMin: p }
}

export function treeFor({ plannedMin, withered }) {
  if (withered) return 'withered'
  if (plannedMin >= 90) return 'blossom'
  if (plannedMin >= 50) return 'tree'
  if (plannedMin >= 25) return 'shrub'
  return 'sprout'
}

export function leavesFor({ mode, verifiedMs, plannedMin, withered }) {
  if (mode === 'strict' && withered) return 0
  const completed = !withered && verifiedMs >= plannedMin * 60000
  return Math.floor((verifiedMs / 60000) * (RATE[mode] ?? 1) * (completed ? COMPLETION_BONUS : 1))
}

// A practice session pays PRACTICE.leaves once (see functions/leavesMath.js).
export function practiceLeaves({ verifiedMs, withered, rewarded }) {
  if (rewarded || withered || !(verifiedMs >= PRACTICE.minVerifiedMs)) return 0
  return PRACTICE.leaves
}
