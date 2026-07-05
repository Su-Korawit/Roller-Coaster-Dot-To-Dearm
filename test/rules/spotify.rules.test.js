// test/rules/spotify.rules.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'

let testEnv
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rcdtd',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(async () => { await testEnv?.cleanup() })

describe('users/{uid}/private/spotify', () => {
  it('owner can write and read their token', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const ref = doc(alice, 'users/alice/private/spotify')
    await assertSucceeds(setDoc(ref, { refreshToken: 'RT' }))
    await assertSucceeds(getDoc(ref))
  })

  it('another signed-in user cannot read it', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/alice/private/spotify'), { refreshToken: 'RT' })
    })
    const mallory = testEnv.authenticatedContext('mallory').firestore()
    await assertFails(getDoc(doc(mallory, 'users/alice/private/spotify')))
  })
})
