/* global module, require */
// Pure helpers for the Teacher badge (ADR 0018). A teacher is a Firebase custom
// claim pair { teacher: true, teacherSchoolId } granted by the super-admin after
// manually verifying the person. Claims (not a client-side email list) are what
// firestore.rules / database.rules.json trust.
const { normalizeSchoolId } = require('./schoolMembers')

// The next custom-claims object after a grant/revoke, preserving unrelated claims.
// Throws a plain Error('INVALID_SCHOOL') for a grant without a usable schoolId.
function nextClaims(existing, { schoolId, revoke }) {
  const claims = { ...(existing ?? {}) }
  if (revoke) {
    delete claims.teacher
    delete claims.teacherSchoolId
    return claims
  }
  const id = normalizeSchoolId({ schoolId })
  if (!id) throw new Error('INVALID_SCHOOL')
  claims.teacher = true
  claims.teacherSchoolId = id
  return claims
}

module.exports = { nextClaims }
