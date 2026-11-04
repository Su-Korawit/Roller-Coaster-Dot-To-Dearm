/* global module */
// Pure Leaves / tree / focus-parameter rules for the Study Room. No firebase-admin so it
// unit-tests under the root vitest run. src/room/focusRules.js is a straight ESM port;
// both run src/room/focusRulesFixtures.json.

const MODES = ['strict', 'flexible']
const PLANNED_MIN = { min: 10, max: 120 }
const RATE = { strict: 1.5, flexible: 1 }
const COMPLETION_BONUS = 1.1
const DEFAULTS = { mode: 'flexible', plannedMin: 25 }
// The Guide's one-time practice focus: flexible, 1 minute, a one-off gift, never XP or leaderboard.
const PRACTICE = { plannedMin: 1, leaves: 10, minVerifiedMs: 45000 }

// Missing values fall back to the defaults; anything present must be valid.
function validateFocusParams({ mode, plannedMin } = {}) {
  const m = mode === undefined ? DEFAULTS.mode : mode
  if (!MODES.includes(m)) return { ok: false, code: 'bad_mode' }
  const p = plannedMin === undefined ? DEFAULTS.plannedMin : plannedMin
  if (!Number.isInteger(p) || p < PLANNED_MIN.min || p > PLANNED_MIN.max) return { ok: false, code: 'bad_planned' }
  return { ok: true, mode: m, plannedMin: p }
}

function treeFor({ plannedMin, withered }) {
  if (withered) return 'withered'
  if (plannedMin >= 90) return 'blossom'
  if (plannedMin >= 50) return 'tree'
  if (plannedMin >= 25) return 'shrub'
  return 'sprout'
}

// Strict + withered earns nothing; otherwise whole Leaves from verified minutes, with a
// completion bonus only for a session that reached its planned time without withering.
function leavesFor({ mode, verifiedMs, plannedMin, withered }) {
  if (mode === 'strict' && withered) return 0
  const completed = !withered && verifiedMs >= plannedMin * 60000
  return Math.floor((verifiedMs / 60000) * (RATE[mode] ?? 1) * (completed ? COMPLETION_BONUS : 1))
}

// A practice session pays PRACTICE.leaves once: it must not have withered, must have run
// at least PRACTICE.minVerifiedMs of verified time, and the gift must not have been paid before.
function practiceLeaves({ verifiedMs, withered, rewarded }) {
  if (rewarded || withered || !(verifiedMs >= PRACTICE.minVerifiedMs)) return 0
  return PRACTICE.leaves
}

module.exports = { MODES, PLANNED_MIN, PRACTICE, validateFocusParams, treeFor, leavesFor, practiceLeaves }
