// School announcement board + Teacher badge (ADR 0018). Posting is gated by
// firestore.rules on the verified `teacher` custom claim, never on anything the
// client says about itself; the checks here only avoid pointless round trips and
// shape the UI.
import { addDoc, collection, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth, db } from '../firebase'
import { refs, queries } from '../lib/db'

export const POST_TITLE_MAX = 100
export const POST_BODY_MAX = 1000

// The signed-in user's teacher claims, or null. Forces a token refresh when
// `refresh` is true (needed right after an admin grants/revokes the badge).
export async function readTeacherClaims({ refresh = false } = {}) {
  const user = auth.currentUser
  if (!user) return null
  const { claims } = await user.getIdTokenResult(refresh)
  if (claims.teacher !== true) return null
  return { teacherSchoolId: claims.teacherSchoolId ?? null }
}

export const isTeacherOf = (claims, schoolId) =>
  !!claims && !!schoolId && claims.teacherSchoolId === schoolId

// Pure: trim + validate a draft. Returns { ok, title, body, error }.
export function validatePostDraft({ title, body }) {
  const t = (title ?? '').trim()
  const b = (body ?? '').trim()
  if (!t) return { ok: false, error: 'TITLE_REQUIRED' }
  if (t.length > POST_TITLE_MAX) return { ok: false, error: 'TITLE_TOO_LONG' }
  if (b.length > POST_BODY_MAX) return { ok: false, error: 'BODY_TOO_LONG' }
  return { ok: true, title: t, body: b }
}

// Live recent posts for a school; returns the unsubscribe function.
export function subscribeSchoolPosts(schoolId, onPosts, onError) {
  if (!schoolId) { onPosts([]); return () => {} }
  return onSnapshot(
    queries.schoolPostsRecent(schoolId),
    (snap) => onPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err),
  )
}

export async function createSchoolPost({ schoolId, title, body, user }) {
  const draft = validatePostDraft({ title, body })
  if (!draft.ok) throw new Error(draft.error)
  return addDoc(collection(db, 'schoolBoards', schoolId, 'posts'), {
    title: draft.title,
    body: draft.body,
    authorUid: user.uid,
    authorName: (user.displayName ?? '').slice(0, 60),
    schoolId,
    createdAt: serverTimestamp(),
  })
}

export const deleteSchoolPost = (schoolId, postId) => deleteDoc(refs.schoolPost(schoolId, postId))

// Super-admin callable (see functions/index.js grantTeacherBadge).
export async function setTeacherBadge({ uid, schoolId, revoke = false }) {
  const call = httpsCallable(getFunctions(), 'grantTeacherBadge')
  const { data } = await call({ uid, schoolId, revoke })
  return data
}
