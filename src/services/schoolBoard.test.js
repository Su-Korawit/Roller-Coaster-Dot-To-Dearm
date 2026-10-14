import { describe, it, expect, vi, beforeEach } from 'vitest'

const addDoc = vi.fn()
const deleteDoc = vi.fn()
const onSnapshot = vi.fn()
vi.mock('firebase/firestore', () => ({
  addDoc: (...a) => addDoc(...a),
  deleteDoc: (...a) => deleteDoc(...a),
  onSnapshot: (...a) => onSnapshot(...a),
  collection: (_db, ...path) => ({ path: path.join('/') }),
  serverTimestamp: () => ({ _ts: true }),
}))
const callable = vi.fn()
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn((_f, name) => (data) => callable(name, data)),
}))
const authState = { currentUser: null }
vi.mock('../firebase', () => ({ auth: authState, db: {} }))
vi.mock('../lib/db', () => ({
  refs: { schoolPost: (s, p) => `post:${s}:${p}` },
  queries: { schoolPostsRecent: (s) => `recent:${s}` },
}))

const {
  readTeacherClaims, isTeacherOf, validatePostDraft, subscribeSchoolPosts,
  createSchoolPost, deleteSchoolPost, setTeacherBadge, POST_TITLE_MAX, POST_BODY_MAX,
} = await import('./schoolBoard')

beforeEach(() => {
  addDoc.mockReset(); deleteDoc.mockReset(); onSnapshot.mockReset(); callable.mockReset()
  authState.currentUser = null
})

describe('readTeacherClaims', () => {
  it('returns null when signed out or not a teacher', async () => {
    expect(await readTeacherClaims()).toBeNull()
    authState.currentUser = { getIdTokenResult: async () => ({ claims: { beta: true } }) }
    expect(await readTeacherClaims()).toBeNull()
  })

  it('returns the school for a teacher and forwards the refresh flag', async () => {
    const getIdTokenResult = vi.fn(async () => ({ claims: { teacher: true, teacherSchoolId: 'S1' } }))
    authState.currentUser = { getIdTokenResult }
    expect(await readTeacherClaims({ refresh: true })).toEqual({ teacherSchoolId: 'S1' })
    expect(getIdTokenResult).toHaveBeenCalledWith(true)
  })

  it('does not trust a truthy-but-not-true claim', async () => {
    authState.currentUser = { getIdTokenResult: async () => ({ claims: { teacher: 'yes' } }) }
    expect(await readTeacherClaims()).toBeNull()
  })
})

describe('isTeacherOf', () => {
  it('is true only for a teacher of that exact school', () => {
    expect(isTeacherOf({ teacherSchoolId: 'S1' }, 'S1')).toBe(true)
    expect(isTeacherOf({ teacherSchoolId: 'S1' }, 'S2')).toBe(false)
    expect(isTeacherOf(null, 'S1')).toBe(false)
    expect(isTeacherOf({ teacherSchoolId: null }, null)).toBe(false)
  })
})

describe('validatePostDraft', () => {
  it('trims, and rejects empty / oversize drafts with a code', () => {
    expect(validatePostDraft({ title: '  สอบ  ', body: ' x ' })).toEqual({ ok: true, title: 'สอบ', body: 'x' })
    expect(validatePostDraft({ title: '   ', body: '' }).error).toBe('TITLE_REQUIRED')
    expect(validatePostDraft({ title: 'x'.repeat(POST_TITLE_MAX + 1), body: '' }).error).toBe('TITLE_TOO_LONG')
    expect(validatePostDraft({ title: 't', body: 'x'.repeat(POST_BODY_MAX + 1) }).error).toBe('BODY_TOO_LONG')
    expect(validatePostDraft({ title: 't', body: '' }).ok).toBe(true)
  })
})

describe('subscribeSchoolPosts', () => {
  it('maps snapshot docs to posts with ids and returns the unsubscribe', () => {
    const unsub = vi.fn()
    onSnapshot.mockImplementation((_q, next) => { next({ docs: [{ id: 'p1', data: () => ({ title: 'a' }) }] }); return unsub })
    const cb = vi.fn()
    const off = subscribeSchoolPosts('S1', cb)
    expect(cb).toHaveBeenCalledWith([{ id: 'p1', title: 'a' }])
    expect(onSnapshot.mock.calls[0][0]).toBe('recent:S1')
    expect(off).toBe(unsub)
  })

  it('without a school it reports an empty list and never subscribes', () => {
    const cb = vi.fn()
    subscribeSchoolPosts(null, cb)
    expect(cb).toHaveBeenCalledWith([])
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('forwards listener errors (e.g. not a member of the school)', () => {
    onSnapshot.mockImplementation((_q, _next, err) => { err(new Error('permission-denied')); return () => {} })
    const onError = vi.fn()
    subscribeSchoolPosts('S1', () => {}, onError)
    expect(onError).toHaveBeenCalled()
  })
})

describe('createSchoolPost / deleteSchoolPost', () => {
  it('writes exactly the fields the rules allow, with a server timestamp and the author from the session', async () => {
    addDoc.mockResolvedValue({ id: 'new' })
    await createSchoolPost({ schoolId: 'S1', title: ' หัวข้อ ', body: 'เนื้อหา', user: { uid: 't1', displayName: 'ครู' } })
    const [col, data] = addDoc.mock.calls[0]
    expect(col.path).toBe('schoolBoards/S1/posts')
    expect(Object.keys(data).sort()).toEqual(['authorName', 'authorUid', 'body', 'createdAt', 'schoolId', 'title'])
    expect(data).toMatchObject({ title: 'หัวข้อ', authorUid: 't1', schoolId: 'S1', createdAt: { _ts: true } })
  })

  it('refuses an invalid draft before touching Firestore', async () => {
    await expect(createSchoolPost({ schoolId: 'S1', title: '', body: '', user: { uid: 't1' } })).rejects.toThrow('TITLE_REQUIRED')
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('deletes by school + post id', async () => {
    await deleteSchoolPost('S1', 'p1')
    expect(deleteDoc).toHaveBeenCalledWith('post:S1:p1')
  })
})

describe('setTeacherBadge', () => {
  it('calls the callable with uid/schoolId/revoke', async () => {
    callable.mockResolvedValue({ data: { ok: true, teacherSchoolId: 'S1' } })
    expect(await setTeacherBadge({ uid: 'u', schoolId: 'S1' })).toEqual({ ok: true, teacherSchoolId: 'S1' })
    expect(callable).toHaveBeenCalledWith('grantTeacherBadge', { uid: 'u', schoolId: 'S1', revoke: false })
  })
})
