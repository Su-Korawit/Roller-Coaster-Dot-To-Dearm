// Security-rules regression test for C-2: cross-user writes to a user doc must be
// limited to the four social array fields. Requires the Firestore emulator — run:
//   firebase emulators:exec --only firestore "npm run test:rules"
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc } from 'firebase/firestore'

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
