/* global module */
// Pure helpers for the users/{uid} -> schools/{schoolId}.memberCount mirror.
// Kept free of firebase-admin so they unit-test under the root vitest run.

// RTDB keys / school-room prefixes must be ':' '/' '.' free (see src/lib/schoolRoom.js).
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/

function normalizeSchoolId(doc) {
  const id = doc?.schoolId
  return typeof id === 'string' && SAFE_ID.test(id) ? id : null
}

// Membership changes implied by a users/{uid} write. Returns [] when the
// school did not change, so the common case (coins/streak writes) is a no-op.
function schoolMemberDeltas(before, after) {
  const b = normalizeSchoolId(before)
  const a = normalizeSchoolId(after)
  if (b === a) return []
  const out = []
  if (b) out.push({ schoolId: b, delta: -1 })
  if (a) out.push({ schoolId: a, delta: 1 })
  return out
}

module.exports = { schoolMemberDeltas, normalizeSchoolId }
