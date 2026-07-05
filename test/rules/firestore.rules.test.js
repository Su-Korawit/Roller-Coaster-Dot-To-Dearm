// Security-rules regression test for C-2: cross-user writes to a user doc must be
// limited to the four social array fields. Requires the Firestore + Database
// emulators (the rules suite now covers both) — run:
//   npm run test:rules:emu
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

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

describe('Personal Map rules (maps/{ownerUid})', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'maps/alice'), { objects: [{ key: 'wood_bridge', x: 10, y: 20 }] })
    })
  })

  it('allows any signed-in user to read a Personal Map', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(getDoc(doc(bob, 'maps/alice')))
  })

  it('allows the owner to write their own Personal Map', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'maps/alice'), { objects: [] }))
  })

  it('BLOCKS a non-owner from writing another user Personal Map', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(setDoc(doc(bob, 'maps/alice'), { objects: [] }))
  })

  it('BLOCKS an unauthenticated user from reading a Personal Map', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'maps/alice')))
  })
})

describe('welcomeConfig rules', () => {
  it('allows anyone (even unauthenticated) to read welcome content', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'welcomeConfig/stats')))
    await assertSucceeds(getDoc(doc(anon, 'welcomeConfig/news/items/n1')))
  })

  it('lets the super-admin write welcome content', async () => {
    const sa = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(setDoc(doc(sa, 'welcomeConfig/stats'), { items: [] }))
    await assertSucceeds(setDoc(doc(sa, 'welcomeConfig/news/items/n2'), { titleTh: 'x' }))
  })

  it('BLOCKS a non-admin signed-in user from writing welcome content', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'welcomeConfig/stats'), { items: [] }))
  })
})

describe('Roadmap Sheets rules (roadmapSheets/{sheetId})', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'roadmapSheets/sheet-1'), {
        ownerUid: 'alice',
        name: 'Roadmap',
        nodes: [],
        edges: [],
        order: 0,
        collaborators: { bob: 'edit', carol: 'view' },
        collaboratorUids: ['bob', 'carol'],
      })
    })
  })

  it('lets the owner read and write freely, including changing collaborators', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'roadmapSheets/sheet-1')))
    await assertSucceeds(updateDoc(doc(alice, 'roadmapSheets/sheet-1'), {
      nodes: [{ id: 'n1' }],
      collaborators: { bob: 'view', carol: 'view' },
    }))
  })

  it('lets the owner delete their own sheet', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(deleteDoc(doc(alice, 'roadmapSheets/sheet-1')))
  })

  it('lets an edit-collaborator read and write nodes/edges', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(getDoc(doc(bob, 'roadmapSheets/sheet-1')))
    await assertSucceeds(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), { nodes: [{ id: 'n1' }], edges: [] }))
  })

  it('BLOCKS an edit-collaborator from changing ownerUid', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), { ownerUid: 'bob' }))
  })

  it('BLOCKS an edit-collaborator from adding another collaborator', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), {
      collaborators: { bob: 'edit', carol: 'view', dave: 'edit' },
    }))
    await assertFails(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), {
      collaboratorUids: ['bob', 'carol', 'dave'],
    }))
  })

  it('lets a view-collaborator read but BLOCKS any write', async () => {
    const carol = testEnv.authenticatedContext('carol').firestore()
    await assertSucceeds(getDoc(doc(carol, 'roadmapSheets/sheet-1')))
    await assertFails(updateDoc(doc(carol, 'roadmapSheets/sheet-1'), { nodes: [{ id: 'n1' }] }))
  })

  it('BLOCKS a non-collaborator from reading or writing', async () => {
    const eve = testEnv.authenticatedContext('eve').firestore()
    await assertFails(getDoc(doc(eve, 'roadmapSheets/sheet-1')))
    await assertFails(updateDoc(doc(eve, 'roadmapSheets/sheet-1'), { nodes: [] }))
  })

  it('BLOCKS an unauthenticated user from reading', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'roadmapSheets/sheet-1')))
  })

  it('lets a signed-in user create a new sheet they own', async () => {
    const dave = testEnv.authenticatedContext('dave').firestore()
    await assertSucceeds(setDoc(doc(dave, 'roadmapSheets/sheet-2'), {
      ownerUid: 'dave', name: 'Roadmap', nodes: [], edges: [], order: 0,
      collaborators: {}, collaboratorUids: [],
    }))
  })

  it('BLOCKS creating a sheet owned by someone else', async () => {
    const dave = testEnv.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(dave, 'roadmapSheets/sheet-3'), {
      ownerUid: 'alice', name: 'Hijack', nodes: [], edges: [], order: 0,
      collaborators: {}, collaboratorUids: [],
    }))
  })
})
