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

describe('school-room presence rules (ADR 0018)', () => {
  const room = (ownerUid, uid = SELF) => `worlds/${ownerUid}/maps/school_hub/players/${uid}`
  const seedSchool = (uid, schoolId) =>
    testEnv.withSecurityRulesDisabled((ctx) => set(ref(ctx.database(), `userSchool/${uid}`), schoolId))

  it('lets a member of school A write and read in school A’s room', async () => {
    await seedSchool(SELF, 'A')
    const self = testEnv.authenticatedContext(SELF).database()
    await assertSucceeds(set(ref(self, room('school:A:1')), { x: 1, y: 2 }))
    await assertSucceeds(get(ref(self, 'worlds/school:A:1/maps/school_hub/players')))
  })

  it('BLOCKS a member of school A from school B’s room (read and write)', async () => {
    await seedSchool(SELF, 'A')
    const self = testEnv.authenticatedContext(SELF).database()
    await assertFails(set(ref(self, room('school:B:1')), { x: 1, y: 2 }))
    await assertFails(get(ref(self, 'worlds/school:B:1/maps/school_hub/players')))
  })

  it('BLOCKS a user with no school from any school room', async () => {
    const self = testEnv.authenticatedContext('nobody').database()
    await assertFails(set(ref(self, room('school:A:1', 'nobody')), { x: 1, y: 2 }))
    await assertFails(get(ref(self, 'worlds/school:A:1/maps/school_hub/players')))
  })

  it('does not let school "A" match school "AB" (prefix includes the ":" separator)', async () => {
    await seedSchool(SELF, 'A')
    const self = testEnv.authenticatedContext(SELF).database()
    await assertFails(set(ref(self, room('school:AB:1')), { x: 1, y: 2 }))
  })

  it('keeps the commons room open to any signed-in user', async () => {
    const self = testEnv.authenticatedContext('nobody').database()
    await assertSucceeds(set(ref(self, room('commons:1', 'nobody')), { x: 1, y: 2 }))
  })

  it('BLOCKS clients from writing userSchool (Functions-owned)', async () => {
    const self = testEnv.authenticatedContext(SELF).database()
    await assertFails(set(ref(self, `userSchool/${SELF}`), 'A'))
  })

  it('lets a user read only their own userSchool', async () => {
    await seedSchool(SELF, 'A')
    const self = testEnv.authenticatedContext(SELF).database()
    await assertSucceeds(get(ref(self, `userSchool/${SELF}`)))
    await assertFails(get(ref(self, 'userSchool/someone-else')))
  })
})

describe('presence payload validation', () => {
  const node = `worlds/${OWNER}/maps/${MAP}/players/${SELF}`

  it('accepts the full shape the client actually sends', async () => {
    const self = testEnv.authenticatedContext(SELF).database()
    await assertSucceeds(set(ref(self, node), {
      x: 1.5, y: 2, dir: 'down', moving: false, mbti: 'INTJ', name: 'Alice', photoURL: null, idle: true,
    }))
  })

  it('BLOCKS unknown fields, oversize names and non-numeric positions', async () => {
    const self = testEnv.authenticatedContext(SELF).database()
    await assertFails(set(ref(self, node), { x: 1, y: 2, evil: 'payload' }))
    await assertFails(set(ref(self, node), { x: 1, y: 2, name: 'x'.repeat(61) }))
    await assertFails(set(ref(self, node), { x: 'a', y: 2 }))
    await assertFails(set(ref(self, node), { name: 'no position' }))
  })
})

describe('emote validation (ADR 0018)', () => {
  const node = `worlds/${OWNER}/maps/${MAP}/players/${SELF}`

  it('accepts a lowercase preset id and BLOCKS free text / markup / long strings', async () => {
    const self = testEnv.authenticatedContext(SELF).database()
    await assertSucceeds(set(ref(self, node), { x: 1, y: 2, emote: 'fight' }))
    await assertFails(set(ref(self, node), { x: 1, y: 2, emote: 'สู้ ๆ' }))
    await assertFails(set(ref(self, node), { x: 1, y: 2, emote: '<b>hi</b>' }))
    await assertFails(set(ref(self, node), { x: 1, y: 2, emote: 'abcdefghijklmnop' }))
    await assertFails(set(ref(self, node), { x: 1, y: 2, emote: 5 }))
  })
})
