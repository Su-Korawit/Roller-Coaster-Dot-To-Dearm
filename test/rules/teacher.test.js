// Teacher badge + school board: rules with custom claims, and the REAL
// grantTeacherBadge handler against the Auth + Firestore emulators.
// Requires the emulators: npm run test:rules:emu
/* global process */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, set } from 'firebase/database'

process.env.GCLOUD_PROJECT = 'demo-rcdtd'
const SUPER_UID = 'IaltEhO0mPVfK3ng8npr4CdqnEE3'
const fnRequire = createRequire(new URL('../../functions/index.js', import.meta.url))

let testEnv, fns, admin, db
const teacher = (uid = 't1', schoolId = 'S1') => testEnv.authenticatedContext(uid, { teacher: true, teacherSchoolId: schoolId })

const post = (over = {}) => ({
  title: 'ประกาศสอบกลางภาค', body: 'สอบวันจันทร์', authorUid: 't1', authorName: 'ครูสมชาย', schoolId: 'S1',
  createdAt: serverTimestamp(), ...over,
})

beforeAll(async () => {
  admin = fnRequire('firebase-admin')
  fns = fnRequire('./index.js')
  db = admin.firestore()
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rcdtd',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    database: { rules: readFileSync('database.rules.json', 'utf8') },
  })
})

afterAll(async () => { await testEnv?.cleanup() })

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore()
    await setDoc(doc(f, 'users/student-s1'), { uid: 'student-s1', schoolId: 'S1' })
    await setDoc(doc(f, 'users/student-s2'), { uid: 'student-s2', schoolId: 'S2' })
    await setDoc(doc(f, 'users/t1'), { uid: 't1', schoolId: 'S1' })
  })
})

describe('schoolBoards rules', () => {
  it('lets a verified teacher of the school create a well-formed post', async () => {
    await assertSucceeds(setDoc(doc(teacher().firestore(), 'schoolBoards/S1/posts/p1'), post()))
  })

  it('BLOCKS a student, an unverified user and a teacher of a DIFFERENT school from posting', async () => {
    const student = testEnv.authenticatedContext('student-s1').firestore()
    await assertFails(setDoc(doc(student, 'schoolBoards/S1/posts/p1'), post({ authorUid: 'student-s1' })))
    await assertFails(setDoc(doc(teacher('t2', 'S2').firestore(), 'schoolBoards/S1/posts/p1'), post({ authorUid: 't2' })))
    // a self-declared field is not a claim
    await assertFails(setDoc(doc(testEnv.authenticatedContext('t1').firestore(), 'schoolBoards/S1/posts/p2'), post()))
  })

  it('BLOCKS forged authors, oversize text, extra fields and a client-chosen timestamp', async () => {
    const t = teacher().firestore()
    await assertFails(setDoc(doc(t, 'schoolBoards/S1/posts/a'), post({ authorUid: 'someone-else' })))
    await assertFails(setDoc(doc(t, 'schoolBoards/S1/posts/b'), post({ title: 'x'.repeat(101) })))
    await assertFails(setDoc(doc(t, 'schoolBoards/S1/posts/c'), post({ body: 'x'.repeat(1001) })))
    await assertFails(setDoc(doc(t, 'schoolBoards/S1/posts/d'), post({ pinned: true })))
    await assertFails(setDoc(doc(t, 'schoolBoards/S1/posts/e'), post({ createdAt: new Date('2000-01-01') })))
    await assertFails(setDoc(doc(t, 'schoolBoards/S1/posts/f'), post({ title: '' })))
    await assertFails(setDoc(doc(t, 'schoolBoards/S1/posts/g'), post({ schoolId: 'S2' })))
  })

  it('members of the school can read; members of other schools and anonymous users cannot', async () => {
    await testEnv.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'schoolBoards/S1/posts/p1'), { title: 'x', schoolId: 'S1' }))
    await assertSucceeds(getDocs(collection(testEnv.authenticatedContext('student-s1').firestore(), 'schoolBoards/S1/posts')))
    await assertFails(getDocs(collection(testEnv.authenticatedContext('student-s2').firestore(), 'schoolBoards/S1/posts')))
    await assertFails(getDocs(collection(testEnv.unauthenticatedContext().firestore(), 'schoolBoards/S1/posts')))
  })

  it('only the author teacher (or super-admin) can delete; nobody can edit', async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'schoolBoards/S1/posts/p1'), { title: 'x', authorUid: 't1', schoolId: 'S1' }))
    await assertFails(deleteDoc(doc(testEnv.authenticatedContext('student-s1').firestore(), 'schoolBoards/S1/posts/p1')))
    await assertFails(setDoc(doc(teacher().firestore(), 'schoolBoards/S1/posts/p1'), post()))      // update
    await assertFails(deleteDoc(doc(teacher('t9', 'S1').firestore(), 'schoolBoards/S1/posts/p1'))) // other teacher
    await assertSucceeds(deleteDoc(doc(teacher().firestore(), 'schoolBoards/S1/posts/p1')))
  })

  it('BLOCKS a client from granting itself teacherSchoolId on its user doc', async () => {
    await assertFails(updateDoc(doc(testEnv.authenticatedContext('student-s1').firestore(), 'users/student-s1'), { teacherSchoolId: 'S1' }))
  })
})

describe('teacher badge in presence', () => {
  const node = 'worlds/commons:1/maps/school_hub/players/'
  it('only a real teacher claim can carry badge:teacher', async () => {
    const t = teacher('t1', 'S1').database()
    await assertSucceeds(set(ref(t, `${node}t1`), { x: 1, y: 2, badge: 'teacher' }))
    const student = testEnv.authenticatedContext('s1').database()
    await assertFails(set(ref(student, `${node}s1`), { x: 1, y: 2, badge: 'teacher' }))
    await assertFails(set(ref(t, `${node}t1`), { x: 1, y: 2, badge: 'admin' }))
    await assertSucceeds(set(ref(student, `${node}s1`), { x: 1, y: 2 }))
  })
})

describe('grantTeacherBadge (real handler, Auth + Firestore emulators)', () => {
  const call = (auth, data) => fns.grantTeacherBadge.run({ auth, data })

  beforeEach(async () => {
    for (const uid of ['target-1']) { try { await admin.auth().deleteUser(uid) } catch { /* not there */ } }
    await admin.auth().createUser({ uid: 'target-1', email: 't1@example.test' })
  })

  it('refuses everyone but the super-admin', async () => {
    await expect(call({ uid: 'student-s1' }, { uid: 'target-1', schoolId: 'S1' })).rejects.toMatchObject({ code: 'permission-denied' })
    await expect(call(undefined, { uid: 'target-1', schoolId: 'S1' })).rejects.toMatchObject({ code: 'permission-denied' })
  })

  it('grants the claim pair, mirrors teacherSchoolId, and revoke removes both', async () => {
    const r = await call({ uid: SUPER_UID }, { uid: 'target-1', schoolId: 'S1' })
    expect(r).toEqual({ ok: true, teacherSchoolId: 'S1' })
    expect((await admin.auth().getUser('target-1')).customClaims).toMatchObject({ teacher: true, teacherSchoolId: 'S1' })
    expect((await db.doc('users/target-1').get()).data().teacherSchoolId).toBe('S1')

    await call({ uid: SUPER_UID }, { uid: 'target-1', revoke: true })
    expect((await admin.auth().getUser('target-1')).customClaims).not.toHaveProperty('teacher')
    expect((await db.doc('users/target-1').get()).data()).not.toHaveProperty('teacherSchoolId')
  })

  it('rejects a missing user, a missing uid and a school-less grant', async () => {
    await expect(call({ uid: SUPER_UID }, { uid: 'nope', schoolId: 'S1' })).rejects.toMatchObject({ code: 'not-found' })
    await expect(call({ uid: SUPER_UID }, {})).rejects.toMatchObject({ code: 'invalid-argument' })
    await expect(call({ uid: SUPER_UID }, { uid: 'target-1', schoolId: 'a:b' })).rejects.toMatchObject({ code: 'invalid-argument' })
  })
})
