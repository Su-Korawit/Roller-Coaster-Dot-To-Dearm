/* global module */
// Pure helper for the Creator role (content site). A creator is a Firebase custom
// claim { creator: true } granted by the super-admin; Firestore/Storage rules and the
// article callables trust the claim, never a client-side list.

// The next custom-claims object after a grant/revoke, preserving unrelated claims.
function nextCreatorClaims(existing, { revoke } = {}) {
  const claims = { ...(existing ?? {}) }
  if (revoke) delete claims.creator
  else claims.creator = true
  return claims
}

module.exports = { nextCreatorClaims }
