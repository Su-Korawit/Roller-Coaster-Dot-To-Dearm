// Security-rules regression suite for storage.rules. Locks the section->prefix
// write matrix, owner-scoped paths, and public reads. Requires the Storage
// emulator — run:  npm run test:rules:emu
import { describe, it, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getBytes } from 'firebase/storage'

const SUPER_UID = 'IaltEhO0mPVfK3ng8npr4CdqnEE3'
const PNG = new Uint8Array([137, 80, 78, 71]) // rules never inspect content
const META = { contentType: 'image/png' }

let testEnv
const ctx = (uid, email) =>
  testEnv.authenticatedContext(uid, email ? { email } : undefined).storage()
const anon = () => testEnv.unauthenticatedContext().storage()

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rcdtd',
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  })
})

afterAll(async () => { await testEnv?.cleanup() })

describe('section-admin write scoping', () => {
  it('Characters admin writes sprites/characters but NOT maps/', async () => {
    const s = ctx('char', 'play198725@gmail.com')
    await assertSucceeds(uploadBytes(ref(s, 'sprites/characters/INTJ.png'), PNG, META))
    await assertFails(uploadBytes(ref(s, 'maps/test3.json'), PNG, META))
  })

  it('Maps admin writes maps/ and sprites/tilesets but NOT media/', async () => {
    const s = ctx('maps', 'takadaoni07@gmail.com')
    await assertSucceeds(uploadBytes(ref(s, 'maps/test3.json'), PNG, META))
    await assertSucceeds(uploadBytes(ref(s, 'sprites/tilesets/grass.png'), PNG, META))
    await assertFails(uploadBytes(ref(s, 'media/song.mp3'), PNG, META))
  })

  it('Music admin writes media/ but NOT sprites/characters', async () => {
    const s = ctx('music', 'itcity9476@gmail.com')
    await assertSucceeds(uploadBytes(ref(s, 'media/song.mp3'), PNG, META))
    await assertFails(uploadBytes(ref(s, 'sprites/characters/INTJ.png'), PNG, META))
  })

  it('super-admin writes owner-only prefixes (ui/, audio/, welcome/)', async () => {
    const s = ctx(SUPER_UID, 'o.korawitt@gmail.com')
    await assertSucceeds(uploadBytes(ref(s, 'ui/button.png'), PNG, META))
    await assertSucceeds(uploadBytes(ref(s, 'audio/click.wav'), PNG, META))
    await assertSucceeds(uploadBytes(ref(s, 'welcome/cover.png'), PNG, META))
  })

  it('BLOCKS a non-admin from writing sprites/characters', async () => {
    const s = ctx('nobody', 'stranger@gmail.com')
    await assertFails(uploadBytes(ref(s, 'sprites/characters/INTJ.png'), PNG, META))
  })

  it('Characters admin writes rc/characters but NOT rc/tilesets', async () => {
    const s = ctx('char', 'play198725@gmail.com')
    await assertSucceeds(uploadBytes(ref(s, 'rc/characters/INTJ.png'), PNG, META))
    await assertFails(uploadBytes(ref(s, 'rc/tilesets/grass.png'), PNG, META))
  })

  it('Maps admin writes rc/tilesets, rc/objects, and rc/maps but NOT rc/characters', async () => {
    const s = ctx('maps', 'takadaoni07@gmail.com')
    await assertSucceeds(uploadBytes(ref(s, 'rc/tilesets/grass.png'), PNG, META))
    await assertSucceeds(uploadBytes(ref(s, 'rc/objects/chest.png'), PNG, META))
    await assertSucceeds(uploadBytes(ref(s, 'rc/maps/test3.json'), PNG, META))
    await assertFails(uploadBytes(ref(s, 'rc/characters/INTJ.png'), PNG, META))
  })

  it('BLOCKS a non-admin from writing rc/characters', async () => {
    const s = ctx('nobody', 'stranger@gmail.com')
    await assertFails(uploadBytes(ref(s, 'rc/characters/INTJ.png'), PNG, META))
  })
})

describe('owner-scoped paths', () => {
  it('owner writes their own slip; a stranger cannot', async () => {
    await assertSucceeds(uploadBytes(ref(ctx('alice'), 'slips/alice/p1'), PNG, META))
    await assertFails(uploadBytes(ref(ctx('bob'), 'slips/alice/p2'), PNG, META))
  })

  it('owner writes their own roadmap image; a stranger cannot', async () => {
    await assertSucceeds(uploadBytes(ref(ctx('alice'), 'users/alice/roadmap/n1'), PNG, META))
    await assertFails(uploadBytes(ref(ctx('bob'), 'users/alice/roadmap/n2'), PNG, META))
  })

  it('owner writes their own roadmap-file; a stranger cannot', async () => {
    await assertSucceeds(uploadBytes(ref(ctx('alice'), 'users/alice/roadmap-file/n1-doc.pdf'), PNG, META))
    await assertFails(uploadBytes(ref(ctx('bob'), 'users/alice/roadmap-file/n2-doc.pdf'), PNG, META))
  })

  it('owner writes their own roadmap-video; a stranger cannot', async () => {
    await assertSucceeds(uploadBytes(ref(ctx('alice'), 'users/alice/roadmap-video/n1'), PNG, META))
    await assertFails(uploadBytes(ref(ctx('bob'), 'users/alice/roadmap-video/n2'), PNG, META))
  })
})

describe('public read', () => {
  beforeAll(async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await uploadBytes(ref(c.storage(), 'ui/button.png'), PNG, META)
      await uploadBytes(ref(c.storage(), 'slips/alice/p1'), PNG, META)
    })
  })

  it('allows an unauthenticated user to read ui/ assets', async () => {
    await assertSucceeds(getBytes(ref(anon(), 'ui/button.png')))
  })

  it('allows an unauthenticated user to read rc/ assets', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await uploadBytes(ref(c.storage(), 'rc/characters/ENFJ.png'), PNG, META)
    })
    await assertSucceeds(getBytes(ref(anon(), 'rc/characters/ENFJ.png')))
  })

  it('BLOCKS a stranger from reading another user’s slip', async () => {
    await assertFails(getBytes(ref(ctx('bob'), 'slips/alice/p1')))
  })
})
