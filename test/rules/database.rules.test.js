// Security-rules regression test for the per-map presence path.
// Bug: presence writes go to /worlds/{owner}/maps/{mapKey}/players/{self} but the
// rules only covered /worlds/{owner}/players/{self}, so every write was denied.
// Requires the Firestore + Realtime Database emulators — run:
//   npm run test:rules:emu
import { describe, it, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, set, get } from 'firebase/database'

const OWNER = 'owner-uid'
const SELF = 'self-uid'
const MAP = 'test3'

let testEnv

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rcdtd',
    database: { rules: readFileSync('database.rules.json', 'utf8') },
  })
})

afterAll(async () => { await testEnv?.cleanup() })

describe('per-map presence rules (/worlds/{owner}/maps/{mapKey}/players/{self})', () => {
  it('allows a user to write their OWN player node under any owner map', async () => {
    const self = testEnv.authenticatedContext(SELF).database()
    await assertSucceeds(
      set(ref(self, `worlds/${OWNER}/maps/${MAP}/players/${SELF}`), { x: 1, y: 2, mbti: 'INTJ' }),
    )
  })

  it('BLOCKS writing to another user’s player node', async () => {
    const self = testEnv.authenticatedContext(SELF).database()
    await assertFails(
      set(ref(self, `worlds/${OWNER}/maps/${MAP}/players/someone-else`), { x: 1, y: 2 }),
    )
  })

  it('BLOCKS an unauthenticated user from writing a player node', async () => {
    const anon = testEnv.unauthenticatedContext().database()
    await assertFails(
      set(ref(anon, `worlds/${OWNER}/maps/${MAP}/players/${SELF}`), { x: 1, y: 2 }),
    )
  })

  it('allows any signed-in user to read the players list of a map room', async () => {
    const self = testEnv.authenticatedContext(SELF).database()
    await assertSucceeds(get(ref(self, `worlds/${OWNER}/maps/${MAP}/players`)))
  })

  it('BLOCKS an unauthenticated user from reading the players list', async () => {
    const anon = testEnv.unauthenticatedContext().database()
    await assertFails(get(ref(anon, `worlds/${OWNER}/maps/${MAP}/players`)))
  })
})
