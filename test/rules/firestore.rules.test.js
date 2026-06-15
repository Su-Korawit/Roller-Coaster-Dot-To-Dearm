// Security-rules regression test for C-2: cross-user writes to a user doc must be
// limited to the four social array fields. Requires the Firestore emulator — run:
//   firebase emulators:exec --only firestore "npm run test:rules"
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

// Section admins are gated by token email — authenticate with an email claim.
const SUPER_UID = 'IaltEhO0mPVfK3ng8npr4CdqnEE3'
const emailCtx = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore()

let testEnv

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rcdtd',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => { await testEnv?.cleanup() })

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/alice'), { uid: 'alice', mbti: 'INTJ', followers: [] })
    await setDoc(doc(db, 'users/bob'), { uid: 'bob', mbti: 'ENFP', followers: [] })
  })
})

describe('users update rule (C-2)', () => {
  it('allows a user to edit arbitrary fields on their OWN doc', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { mbti: 'ENFP', photoURL: 'x' }))
  })

  it('allows adding yourself to another user’s followers (follow flow)', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(alice, 'users/bob'), { followers: ['alice'] }))
  })

  it('BLOCKS a cross-user write to a non-social field', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'users/bob'), { mbti: 'HACKED' }))
  })

  it('BLOCKS mixing a social field with a forbidden field', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'users/bob'), { followers: ['alice'], photoURL: 'x' }))
  })
})

describe('section-scoped admin writes', () => {
  const mapCfg = { tilesets: {}, collision: {}, hidden: {} }

  it('lets the Maps admin write mapConfigs but NOT musicConfig', async () => {
    const maps = emailCtx('takada', 'takadaoni07@gmail.com')
    await assertSucceeds(setDoc(doc(maps, 'mapConfigs/test3'), mapCfg))
    await assertFails(setDoc(doc(maps, 'musicConfig/background'), { tracks: [] }))
  })

  it('lets the Music admin write musicConfig but NOT mapConfigs', async () => {
    const music = emailCtx('itcity', 'itcity9476@gmail.com')
    await assertSucceeds(setDoc(doc(music, 'musicConfig/background'), { tracks: [] }))
    await assertFails(setDoc(doc(music, 'mapConfigs/test3'), mapCfg))
  })

  it('BLOCKS a non-admin from writing either config', async () => {
    const nobody = emailCtx('nobody', 'stranger@gmail.com')
    await assertFails(setDoc(doc(nobody, 'mapConfigs/test3'), mapCfg))
    await assertFails(setDoc(doc(nobody, 'musicConfig/background'), { tracks: [] }))
  })

  it('lets the super-admin write both configs', async () => {
    const sa = emailCtx(SUPER_UID, 'o.korawitt@gmail.com')
    await assertSucceeds(setDoc(doc(sa, 'mapConfigs/test3'), mapCfg))
    await assertSucceeds(setDoc(doc(sa, 'musicConfig/background'), { tracks: [] }))
  })

  it('lets ONLY the super-admin delete a user', async () => {
    const sa = emailCtx(SUPER_UID, 'o.korawitt@gmail.com')
    const maps = emailCtx('takada', 'takadaoni07@gmail.com')
    await assertFails(deleteDoc(doc(maps, 'users/bob')))
    await assertSucceeds(deleteDoc(doc(sa, 'users/alice')))
  })
})
