// Security-rules regression test for C-2: cross-user writes to a user doc must be
// limited to the four social array fields. Requires the Firestore + Database
// emulators (the rules suite now covers both) — run:
//   npm run test:rules:emu
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, deleteDoc, where, serverTimestamp } from 'firebase/firestore'

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

describe('legacy Personal Map documents (maps/{ownerUid})', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'maps/alice'), { objects: [{ key: 'wood_bridge', x: 10, y: 20 }] })
    })
  })

  it('stays readable to signed-in users until the purge script removes it', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(getDoc(doc(bob, 'maps/alice')))
  })

  it('BLOCKS every client write, including the owner', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'maps/alice'), { objects: [] }))
    await assertFails(updateDoc(doc(alice, 'maps/alice'), { objects: [] }))
    await assertFails(deleteDoc(doc(alice, 'maps/alice')))
  })

  it('BLOCKS an unauthenticated user from reading', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'maps/alice')))
  })
})

describe('farm data collections are gone', () => {
  it('denies everything on farmPlants / farmItems / farmShops, even to the super-admin', async () => {
    const root = testEnv.authenticatedContext('IaltEhO0mPVfK3ng8npr4CdqnEE3').firestore()
    for (const path of ['farmPlants/p1', 'farmItems/i1', 'farmShops/s1']) {
      await assertFails(getDoc(doc(root, path)))
      await assertFails(setDoc(doc(root, path), { name: 'x' }))
    }
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

  it('BLOCKS an edit-collaborator from self-promoting via a dotted collaborators field path', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), {
      'collaborators.bob': 'owner',
    }))
  })

  it('still allows edit-collaborator nodes/edges update after collaborator equality hardening', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), {
      nodes: [{ id: 'n1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Step' } }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
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

  it('lets a collaborator run the sheetsSharedWithMe array-contains query', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    const q = query(collection(bob, 'roadmapSheets'), where('collaboratorUids', 'array-contains', 'bob'))
    await assertSucceeds(getDocs(q))
  })

  it('lets a signed-in user with no shares run the shared-with-me query (empty result)', async () => {
    const eve = testEnv.authenticatedContext('eve').firestore()
    const q = query(collection(eve, 'roadmapSheets'), where('collaboratorUids', 'array-contains', 'eve'))
    await assertSucceeds(getDocs(q))
  })

  it('allows an unauthenticated visitor to read a sheet with public:true', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'roadmapSheets/sheet-1'), { public: true, shareId: 'share-abc' }, { merge: true })
    })
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'roadmapSheets/sheet-1')))
  })

  it('BLOCKS an unauthenticated visitor when the sheet is not public', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'roadmapSheets/sheet-1')))
  })

  it('lets an unauthenticated visitor run the shareId lookup query when scoped to public docs', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'roadmapSheets/sheet-1'), { public: true, shareId: 'share-abc' }, { merge: true })
    })
    const anon = testEnv.unauthenticatedContext().firestore()
    const q = query(collection(anon, 'roadmapSheets'), where('shareId', '==', 'share-abc'), where('public', '==', true))
    await assertSucceeds(getDocs(q))
  })

  it('lets the owner toggle public sharing', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(alice, 'roadmapSheets/sheet-1'), { public: true, shareId: 'share-xyz' }))
  })

  it('BLOCKS an edit-collaborator from turning on public sharing', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), { public: true, shareId: 'x' }))
  })
})

describe('IR Board sheet (roadmapSheets/admin-idea-board)', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'roadmapSheets/admin-idea-board'), {
        ownerUid: 'IaltEhO0mPVfK3ng8npr4CdqnEE3',
        name: 'IR Board',
        nodes: [],
        edges: [],
        order: 0,
        collaborators: {},
        collaboratorUids: [],
      })
    })
  })

  it('lets a maps-section admin read and update nodes', async () => {
    const mapsAdmin = testEnv.authenticatedContext('maps-uid', {
      email: 'takadaoni07@gmail.com',
    }).firestore()
    await assertSucceeds(getDoc(doc(mapsAdmin, 'roadmapSheets/admin-idea-board')))
    await assertSucceeds(updateDoc(doc(mapsAdmin, 'roadmapSheets/admin-idea-board'), {
      nodes: [{ id: 'r1', type: 'ideaRoot' }],
    }))
  })

  it('BLOCKS a non-admin from reading the IR Board', async () => {
    const rando = testEnv.authenticatedContext('rando').firestore()
    await assertFails(getDoc(doc(rando, 'roadmapSheets/admin-idea-board')))
  })

  it('does not grant non-admins access to ordinary sheets', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'roadmapSheets/sheet-1'), {
        ownerUid: 'alice',
        name: 'Roadmap',
        nodes: [],
        edges: [],
        order: 0,
        collaborators: {},
        collaboratorUids: [],
      })
    })
    const rando = testEnv.authenticatedContext('rando').firestore()
    await assertFails(getDoc(doc(rando, 'roadmapSheets/sheet-1')))
  })
})

describe('tcasEvents rules', () => {
  it('allows anyone (even unauthenticated) to read events — public news site (ADR-0012)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'tcasEvents/e1'), { title: 'สมัคร TCAS70', date: '2026-07-15' })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'tcasEvents/e1')))
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'tcasEvents/e1')))
  })

  it('BLOCKS an unauthenticated write', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(anon, 'tcasEvents/e9'), { title: 'hack', date: '2026-01-01' }))
  })

  it('BLOCKS a non-admin write', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'tcasEvents/e2'), { title: 'hack', date: '2026-01-01' }))
  })

  it('allows the super-admin to write', async () => {
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(setDoc(doc(admin, 'tcasEvents/e3'), { title: 'ประกาศผล', date: '2026-12-01' }))
  })
})

describe('appUpdates rules', () => {
  it('allows anyone (even unauthenticated) to read updates — public news site (ADR-0012)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'appUpdates/u1'), { title: 'เปิดตัว I LOVE TCAS', type: 'feature' })
    })
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'appUpdates/u1')))
    await assertSucceeds(getDocs(collection(anon, 'appUpdates')))
  })

  it('BLOCKS unauthenticated and non-admin writes', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(anon, 'appUpdates/u2'), { title: 'hack' }))
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'appUpdates/u3'), { title: 'hack' }))
  })

  it('allows the super-admin to write', async () => {
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(setDoc(doc(admin, 'appUpdates/u4'), { title: 'อัปเดตแอป', type: 'fix' }))
  })
})

describe('osAppReviews rules', () => {
  const review = (over = {}) => ({ appId: 'goal', uid: 'alice', name: 'Alice', rating: 5, text: 'ดีมาก', ...over })

  it('allows a signed-in user to write their own review (id = appId_uid)', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'osAppReviews/goal_alice'), review()))
    await assertSucceeds(setDoc(doc(alice, 'osAppReviews/goal_alice'), review({ rating: 3 })))
  })

  it('BLOCKS signed-out access', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'osAppReviews/goal_alice')))
    await assertFails(setDoc(doc(anon, 'osAppReviews/goal_alice'), review()))
  })

  it('BLOCKS writing as someone else or with a mismatched doc id', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'osAppReviews/goal_bob'), review({ uid: 'bob' })))
    await assertFails(setDoc(doc(alice, 'osAppReviews/habit_alice'), review()))
  })

  it('BLOCKS an out-of-range rating or an over-long comment', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'osAppReviews/goal_alice'), review({ rating: 6 })))
    await assertFails(setDoc(doc(alice, 'osAppReviews/goal_alice'), review({ rating: 0 })))
    await assertFails(setDoc(doc(alice, 'osAppReviews/goal_alice'), review({ text: 'x'.repeat(501) })))
  })

  it('allows deleting your own review, not someone else\'s; super-admin may delete any', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'osAppReviews/goal_alice'), review())
      await setDoc(doc(ctx.firestore(), 'osAppReviews/goal_bob'), review({ uid: 'bob' }))
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(deleteDoc(doc(alice, 'osAppReviews/goal_bob')))
    await assertSucceeds(deleteDoc(doc(alice, 'osAppReviews/goal_alice')))
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(deleteDoc(doc(admin, 'osAppReviews/goal_bob')))
  })
})

describe('osRooms + osReading rules', () => {
  const seedUsers = async () => testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/alice'), { osRoomId: 'วิศวะ__คอม' })
    await setDoc(doc(ctx.firestore(), 'users/bob'), { osRoomId: 'แพทย์' })
    await setDoc(doc(ctx.firestore(), 'users/carol'), { name: 'no room' })
  })
  const msg = (over = {}) => ({ uid: 'alice', name: 'Alice', text: 'สวัสดี', createdAt: serverTimestamp(), ...over })

  it('members of the room can read and post; others cannot', async () => {
    await seedUsers()
    const alice = testEnv.authenticatedContext('alice').firestore()
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(setDoc(doc(alice, 'osRooms/วิศวะ__คอม/messages/m1'), msg()))
    await assertSucceeds(getDoc(doc(alice, 'osRooms/วิศวะ__คอม/messages/m1')))
    await assertFails(getDoc(doc(bob, 'osRooms/วิศวะ__คอม/messages/m1')))
    await assertFails(setDoc(doc(bob, 'osRooms/วิศวะ__คอม/messages/m2'), msg({ uid: 'bob' })))
  })

  it('anyone signed in can use the general room; signed-out cannot', async () => {
    await seedUsers()
    const carol = testEnv.authenticatedContext('carol').firestore()
    await assertSucceeds(setDoc(doc(carol, 'osRooms/general/messages/g1'), msg({ uid: 'carol' })))
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'osRooms/general/messages/g1')))
  })

  it('BLOCKS spoofed uid, empty or over-long text, and edits', async () => {
    await seedUsers()
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'osRooms/วิศวะ__คอม/messages/x1'), msg({ uid: 'bob' })))
    await assertFails(setDoc(doc(alice, 'osRooms/วิศวะ__คอม/messages/x2'), msg({ text: '' })))
    await assertFails(setDoc(doc(alice, 'osRooms/วิศวะ__คอม/messages/x3'), msg({ text: 'a'.repeat(501) })))
    await assertSucceeds(setDoc(doc(alice, 'osRooms/วิศวะ__คอม/messages/x4'), msg()))
    await assertFails(updateDoc(doc(alice, 'osRooms/วิศวะ__คอม/messages/x4'), { text: 'edited' }))
  })

  it('reading entry: owner writes own doc only, with sane numbers', async () => {
    const entry = (over = {}) => ({ uid: 'alice', name: 'Alice', roomId: 'r', weekKey: '2026-11-02', weekMinutes: 120, totalMinutes: 500, ...over })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'osReading/alice'), entry()))
    await assertFails(setDoc(doc(alice, 'osReading/bob'), entry({ uid: 'bob' })))
    await assertFails(setDoc(doc(alice, 'osReading/alice'), entry({ weekMinutes: 99999 })))
    await assertFails(setDoc(doc(alice, 'osReading/alice'), entry({ weekMinutes: 1.5 })))
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(getDoc(doc(bob, 'osReading/alice')))
  })
})

describe('timetableTemplates rules', () => {
  it('allows a signed-in user to create a template as themselves', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'timetableTemplates/t1'), {
      version: 1, name: 'ม.5/1', schoolName: 'สวนกุหลาบ', classLevel: 'ม.5', subjects: [], createdBy: 'alice',
    }))
  })

  it('BLOCKS creating a template with a spoofed createdBy', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'timetableTemplates/t2'), {
      version: 1, name: 'x', schoolName: 'x', classLevel: 'ม.4', subjects: [], createdBy: 'bob',
    }))
  })

  it('BLOCKS updating a published template', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'timetableTemplates/t3'), { createdBy: 'alice', name: 'old' })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'timetableTemplates/t3'), { name: 'new' }))
  })

  it('allows deleting your own template but not someone else\'s', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'timetableTemplates/mine'), { createdBy: 'alice' })
      await setDoc(doc(ctx.firestore(), 'timetableTemplates/theirs'), { createdBy: 'bob' })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(deleteDoc(doc(alice, 'timetableTemplates/mine')))
    await assertFails(deleteDoc(doc(alice, 'timetableTemplates/theirs')))
  })

  it('allows the super-admin to delete any template (moderation)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'timetableTemplates/spam'), { createdBy: 'bob' })
    })
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(deleteDoc(doc(admin, 'timetableTemplates/spam')))
  })
})

describe('entitlements protection', () => {
  it('BLOCKS an owner writing their own entitlements field', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'users/alice'), { entitlements: { 'sticker-pack-1': {} } }))
  })

  it('still allows owner writes to ordinary fields', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { aiLanguage: 'Thai' }))
  })

  it('entitlementCatalog: signed-in read, non-admin write blocked, admin write allowed', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'entitlementCatalog/item1'), { name: 'x', priceCoins: 50, active: true })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'entitlementCatalog/item1')))
    await assertFails(setDoc(doc(alice, 'entitlementCatalog/item2'), { priceCoins: 1 }))
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(setDoc(doc(admin, 'entitlementCatalog/item2'), { name: 'y', priceCoins: 99, active: true }))
  })
})

describe('File Bag rules (ADR-0016)', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'fileBagItems/item-1'), {
        ownerUid: 'alice',
        storagePath: 'users/alice/bag/x',
        name: 'a.png',
        kind: 'image',
        source: 'bag-upload',
        folderId: null,
        sizeBytes: 10,
      })
      await setDoc(doc(db, 'fileBagFolders/fold-1'), {
        ownerUid: 'alice',
        name: 'Pics',
        parentId: null,
      })
    })
  })

  it('owner can read/update/delete their fileBagItems; stranger cannot', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(getDoc(doc(alice, 'fileBagItems/item-1')))
    await assertSucceeds(updateDoc(doc(alice, 'fileBagItems/item-1'), { name: 'b.png' }))
    await assertFails(getDoc(doc(bob, 'fileBagItems/item-1')))
    await assertFails(updateDoc(doc(bob, 'fileBagItems/item-1'), { name: 'hack' }))
  })

  it('owner can create fileBagItems with their own ownerUid; cannot create as someone else', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'fileBagItems/item-2'), {
      ownerUid: 'alice', storagePath: 'users/alice/bag/y', name: 'y', kind: 'file', source: 'bag-upload', folderId: null, sizeBytes: 1,
    }))
    await assertFails(setDoc(doc(alice, 'fileBagItems/item-3'), {
      ownerUid: 'bob', storagePath: 'users/bob/bag/z', name: 'z', kind: 'file', source: 'bag-upload', folderId: null, sizeBytes: 1,
    }))
  })

  it('owner can manage bagSettings; stranger cannot', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(setDoc(doc(alice, 'bagSettings/alice'), { visibleCategories: ['images'] }))
    await assertFails(setDoc(doc(bob, 'bagSettings/alice'), { visibleCategories: ['videos'] }))
  })

  it('BLOCKS client writes to fileBagUsageBytes on the user doc', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'users/alice'), { fileBagUsageBytes: 999 }))
  })
})

describe('schools rules (ADR 0018)', () => {
  it('lets a signed-in user read a school but not an anonymous one', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'schools/S1'), { name: 'Test School', memberCount: 31 })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'schools/S1')))
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'schools/S1')))
  })

  it('BLOCKS every client write, including memberCount inflation and the super-admin', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'schools/S1'), { name: 'x', memberCount: 9999 }))
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertFails(setDoc(doc(admin, 'schools/S1'), { name: 'x', memberCount: 9999 }))
  })
})

describe('focus collections + focusXp (ADR 0018)', () => {
  it('BLOCKS a client from writing its own focusXp', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'users/alice'), { focusXp: 999999 }))
  })

  it('BLOCKS a client from writing its own Leaves, room inventory or welcome-pack flag', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'users/alice'), { leaves: 999999 }))
    await assertFails(updateDoc(doc(alice, 'users/alice'), { roomInventory: { desk_basic: 99 } }))
    await assertFails(updateDoc(doc(alice, 'users/alice'), { welcomePack: 'v2' }))
  })

  it('BLOCKS a new account from creating its user doc with Leaves, inventory or a welcome-pack flag', async () => {
    const carol = testEnv.authenticatedContext('carol').firestore()
    await assertFails(setDoc(doc(carol, 'users/carol'), { uid: 'carol', leaves: 1000000 }))
    await assertFails(setDoc(doc(carol, 'users/carol'), { uid: 'carol', roomInventory: { laptop: 60 } }))
    await assertFails(setDoc(doc(carol, 'users/carol'), { uid: 'carol', welcomePack: 'v2' }))
    await assertSucceeds(setDoc(doc(carol, 'users/carol'), { uid: 'carol', mbti: 'INTJ' }))
  })

  it('BLOCKS every client write to focusActive / focusDaily / focusSessions', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'focusActive/alice'), { verifiedMs: 99999999 }))
    await assertFails(setDoc(doc(alice, 'focusDaily/alice_2026-10-14'), { uid: 'alice', verifiedMs: 99999999 }))
    await assertFails(setDoc(doc(alice, 'focusSessions/s1'), { uid: 'alice', verifiedMs: 99999999 }))
  })

  it('lets an owner read their own records but not someone else’s', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'focusActive/alice'), { uid: 'alice' })
      await setDoc(doc(db, 'focusActive/bob'), { uid: 'bob' })
      await setDoc(doc(db, 'focusDaily/alice_2026-10-14'), { uid: 'alice', verifiedMs: 1 })
      await setDoc(doc(db, 'focusDaily/bob_2026-10-14'), { uid: 'bob', verifiedMs: 1 })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'focusActive/alice')))
    await assertFails(getDoc(doc(alice, 'focusActive/bob')))
    await assertSucceeds(getDoc(doc(alice, 'focusDaily/alice_2026-10-14')))
    await assertFails(getDoc(doc(alice, 'focusDaily/bob_2026-10-14')))
  })
})

describe('consent record and erasure log (PDPA)', () => {
  it('lets a student write their own consent record, but not anyone else’s', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { consent: { version: '2026-10-14', ageOrGuardianConfirmed: true } }))
    await assertFails(updateDoc(doc(alice, 'users/bob'), { consent: { version: '2026-10-14' } }))
  })

  it('clients can never read or write the erasure log', async () => {
    await testEnv.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'accountDeletions/a1'), { uidHash: 'x' }))
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(getDoc(doc(alice, 'accountDeletions/a1')))
    await assertFails(setDoc(doc(alice, 'accountDeletions/a2'), { uidHash: 'y' }))
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertFails(getDoc(doc(admin, 'accountDeletions/a1')))
  })
})

describe('study room: roomCatalog + rooms', () => {
  it('lets any signed-in user read the catalog and rooms, and nobody write rooms', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'roomCatalog/lamp_desk'), { name: 'lamp', price: 90 })
      await setDoc(doc(db, 'rooms/alice'), { tier: 0 })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'roomCatalog/lamp_desk')))
    await assertSucceeds(getDoc(doc(alice, 'rooms/alice')))
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(getDoc(doc(bob, 'rooms/alice')))
    await assertFails(setDoc(doc(alice, 'rooms/alice'), { tier: 3, placed: [] }))
    await assertFails(updateDoc(doc(alice, 'rooms/alice'), { tier: 3 }))
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'roomCatalog/lamp_desk')))
  })

  it('lets only the super-admin write catalog rows', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'roomCatalog/lamp_desk'), { price: 1 }))
    const root = testEnv.authenticatedContext('IaltEhO0mPVfK3ng8npr4CdqnEE3').firestore()
    await assertSucceeds(setDoc(doc(root, 'roomCatalog/lamp_desk'), { name: 'lamp', price: 120 }))
  })
})

describe('avatar (Functions-owned: written only by saveAvatar)', () => {
  it('BLOCKS a client from writing or seeding avatar, and lets others read it', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'users/alice'), { avatar: { accessories: { head: 'acc_cap' }, outfitHue: 1 } }))
    const dave = testEnv.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(dave, 'users/dave'), { uid: 'dave', avatar: { accessories: {}, outfitHue: null } }))
    await testEnv.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), 'users/erin'), { uid: 'erin', avatar: { accessories: {}, outfitHue: 9 } }))
    await assertSucceeds(getDoc(doc(dave, 'users/erin')))
  })
})

describe('practice reward flag (Functions-owned)', () => {
  it('BLOCKS a client from writing or seeding practiceRewarded', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'users/alice'), { practiceRewarded: true }))
    const dave = testEnv.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(dave, 'users/dave'), { uid: 'dave', practiceRewarded: true }))
    await assertFails(updateDoc(doc(alice, 'users/alice'), { focusBySubject: { a_lv_64: 99999999 } }))
    await assertFails(setDoc(doc(dave, 'users/dave'), { uid: 'dave', focusBySubject: { a_lv_64: 1 } }))
  })
})

describe('osRequests / osRequestVotes rules (Report app)', () => {
  const req = (over = {}) => ({ uid: 'alice', name: 'Alice', kind: 'app', title: 'แอปจดโน้ต', url: '', reason: 'อยากได้', status: 'new', ...over })

  it('a signed-in user creates their own request and everyone signed in can read it', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'osRequests/r1'), req()))
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(getDoc(doc(bob, 'osRequests/r1')))
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'osRequests/r1')))
  })

  it('BLOCKS bad kind, short/long title, long reason, foreign uid and a non-new status', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'osRequests/r2'), req({ kind: 'game' })))
    await assertFails(setDoc(doc(alice, 'osRequests/r2'), req({ title: 'ab' })))
    await assertFails(setDoc(doc(alice, 'osRequests/r2'), req({ title: 'x'.repeat(81) })))
    await assertFails(setDoc(doc(alice, 'osRequests/r2'), req({ reason: 'x'.repeat(301) })))
    await assertFails(setDoc(doc(alice, 'osRequests/r2'), req({ uid: 'bob' })))
    await assertFails(setDoc(doc(alice, 'osRequests/r2'), req({ status: 'done' })))
  })

  it('only a super-admin changes status; owner or super-admin deletes', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'osRequests/r3'), req()) })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'osRequests/r3'), req({ status: 'done' })))
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(setDoc(doc(admin, 'osRequests/r3'), req({ status: 'planned' })))
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(deleteDoc(doc(bob, 'osRequests/r3')))
    await assertSucceeds(deleteDoc(doc(alice, 'osRequests/r3')))
  })

  it('votes: own id only (requestId_uid), deletable by the voter only', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'osRequestVotes/r1_alice'), { requestId: 'r1', uid: 'alice' }))
    await assertFails(setDoc(doc(alice, 'osRequestVotes/r1_bob'), { requestId: 'r1', uid: 'bob' }))
    await assertFails(setDoc(doc(alice, 'osRequestVotes/other_alice'), { requestId: 'r1', uid: 'alice' }))
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(deleteDoc(doc(bob, 'osRequestVotes/r1_alice')))
    await assertSucceeds(deleteDoc(doc(alice, 'osRequestVotes/r1_alice')))
  })
})

describe('osPosts / osPostLikes rules (Community feed)', () => {
  const post = (over = {}) => ({ uid: 'alice', name: 'Alice', text: 'สวัสดี', imageUrl: '', createdAt: serverTimestamp(), ...over })

  it('a signed-in user posts as themselves; everyone signed in reads', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'osPosts/p1'), post()))
    await assertSucceeds(setDoc(doc(alice, 'osPosts/p2'), post({ imageUrl: 'https://x.com/a.png' })))
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(getDoc(doc(bob, 'osPosts/p1')))
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'osPosts/p1')))
  })

  it('BLOCKS empty/long text, non-https image, foreign uid and edits', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'osPosts/p3'), post({ text: '' })))
    await assertFails(setDoc(doc(alice, 'osPosts/p3'), post({ text: 'x'.repeat(501) })))
    await assertFails(setDoc(doc(alice, 'osPosts/p3'), post({ imageUrl: 'http://x.com/a.png' })))
    await assertFails(setDoc(doc(alice, 'osPosts/p3'), post({ uid: 'bob' })))
    await assertSucceeds(setDoc(doc(alice, 'osPosts/p4'), post()))
    await assertFails(updateDoc(doc(alice, 'osPosts/p4'), { text: 'edited' }))
  })

  it('only the author or a super-admin deletes a post', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'osPosts/p5'), { uid: 'alice', name: 'A', text: 'x', imageUrl: '' }) })
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(deleteDoc(doc(bob, 'osPosts/p5')))
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(deleteDoc(doc(alice, 'osPosts/p5')))
  })

  it('likes: own id only (postId_uid), deletable by the liker only', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'osPostLikes/p1_alice'), { postId: 'p1', uid: 'alice' }))
    await assertFails(setDoc(doc(alice, 'osPostLikes/p1_bob'), { postId: 'p1', uid: 'bob' }))
    await assertFails(setDoc(doc(alice, 'osPostLikes/other_alice'), { postId: 'p1', uid: 'alice' }))
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(deleteDoc(doc(bob, 'osPostLikes/p1_alice')))
    await assertSucceeds(deleteDoc(doc(alice, 'osPostLikes/p1_alice')))
  })
})
