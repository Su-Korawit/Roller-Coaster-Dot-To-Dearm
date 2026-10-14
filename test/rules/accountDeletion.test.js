// Runs the REAL deleteMyAccount handler against the Auth, Firestore, Realtime
// Database and Storage emulators and checks exactly what is erased, what is
// de-identified, and what belongs to other people and must survive.
// Requires the emulators: npm run test:rules:emu
/* global process */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'

process.env.GCLOUD_PROJECT = 'demo-rcdtd'
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: 'demo-rcdtd',
  databaseURL: 'https://demo-rcdtd-default-rtdb.firebaseio.com',
  storageBucket: 'demo-rcdtd.appspot.com',
})
const fnRequire = createRequire(new URL('../../functions/index.js', import.meta.url))

let fns, admin, db, bucket
const V = 'victim'
const B = 'bystander'
const SUPER_UID = 'IaltEhO0mPVfK3ng8npr4CdqnEE3'
const fresh = () => ({ uid: V, token: { auth_time: Math.floor(Date.now() / 1000) } })
const run = (auth = fresh(), data = { confirm: true }) => fns.deleteMyAccount.run({ auth, data })
const exists = async (path) => (await db.doc(path).get()).exists

async function wipe() {
  for (const col of ['users', 'roadmapSheets', 'fileBagItems', 'fileBagFolders', 'timetableTemplates', 'focusDaily',
    'focusSessions', 'focusActive', 'bagSettings', 'maps', 'chats', 'purchases', 'usedSlips', 'accountDeletions', 'schoolBoards']) {
    await db.recursiveDelete(db.collection(col))
  }
  await admin.database().ref().remove()
  await bucket.deleteFiles({ prefix: 'users/', force: true })
  await bucket.deleteFiles({ prefix: 'slips/', force: true })
  for (const uid of [V, B]) { try { await admin.auth().deleteUser(uid) } catch { /* absent */ } }
}

async function seed() {
  await admin.auth().createUser({ uid: V, email: 'v@example.test' })
  await admin.auth().createUser({ uid: B, email: 'b@example.test' })

  await db.doc(`users/${V}`).set({ uid: V, displayName: 'Victim', schoolId: 'S1', followers: [B] })
  await db.doc(`users/${V}/matches/${B}`).set({ score: 80 })
  await db.doc(`users/${V}/private/spotify`).set({ refreshToken: 'secret' })
  await db.doc(`users/${V}/receivedCredits/c1`).set({ fromUid: B, message: 'thanks' })
  await db.doc(`users/${B}`).set({
    uid: B, displayName: 'Bystander',
    followers: [V, 'x'], following: [V], followRequests: [V], sentRequests: [V],
  })
  await db.doc(`users/${B}/receivedCredits/g1`).set({ fromUid: V, fromName: 'Victim', message: 'you helped me', taskTitle: 't' })

  await db.doc('roadmapSheets/own').set({ ownerUid: V, name: 'mine' })
  await db.doc('roadmapSheets/shared').set({
    ownerUid: B, name: 'theirs', collaboratorUids: [V, 'other'], collaborators: { [V]: 'edit', other: 'view' },
  })
  await db.doc('fileBagItems/f1').set({ ownerUid: V }); await db.doc('fileBagItems/f2').set({ ownerUid: B })
  await db.doc('fileBagFolders/d1').set({ ownerUid: V }); await db.doc('fileBagFolders/d2').set({ ownerUid: B })
  await db.doc('timetableTemplates/t1').set({ createdBy: V }); await db.doc('timetableTemplates/t2').set({ createdBy: B })
  await db.doc(`focusDaily/${V}_2026-10-14`).set({ uid: V, verifiedMs: 1 }); await db.doc(`focusDaily/${B}_2026-10-14`).set({ uid: B, verifiedMs: 1 })
  await db.doc('focusSessions/s1').set({ uid: V }); await db.doc('focusSessions/s2').set({ uid: B })
  await db.doc(`focusActive/${V}`).set({ uid: V })
  await db.doc(`bagSettings/${V}`).set({ x: 1 }); await db.doc(`maps/${V}`).set({ objectsByMap: {} })
  await db.doc('schoolBoards/S1/posts/pv').set({ authorUid: V, title: 'x' }); await db.doc('schoolBoards/S1/posts/pb').set({ authorUid: B, title: 'y' })

  // chat where both talked: the other person's side must survive
  await db.doc('chats/both').set({ members: [B, V], lastMessage: 'hi', fireStacks: 3 })
  await db.doc('chats/both/messages/m1').set({ senderId: V, text: 'from victim' })
  await db.doc('chats/both/messages/m2').set({ senderId: B, text: 'from bystander' })
  // chat with only the victim's messages: nothing left to keep
  await db.doc('chats/solo').set({ members: [B, V], lastMessage: 'x' })
  await db.doc('chats/solo/messages/m3').set({ senderId: V, text: 'unanswered' })
  await db.doc('chats/others').set({ members: [B, 'zed'] })
  await db.doc('chats/others/messages/m4').set({ senderId: B, text: 'unrelated' })

  await db.doc('purchases/p1').set({ uid: V, amount: 50, coins: 10, status: 'SUCCESS' })
  await db.doc('purchases/p2').set({ uid: B, amount: 20, status: 'SUCCESS' })
  await db.doc('usedSlips/slip1').set({ uid: V, purchaseId: 'p1' })

  await bucket.file(`users/${V}/bag/f1.txt`).save('victim file')
  await bucket.file(`users/${V}/roadmap/img`).save('victim image')
  await bucket.file(`users/${B}/bag/f2.txt`).save('bystander file')
  await bucket.file(`slips/${V}/p1`).save('victim bank slip')
  await bucket.file(`slips/${B}/p2`).save('bystander bank slip')

  await admin.database().ref(`worlds/${V}/maps/test3/players/${V}`).set({ x: 1, y: 2 })
  await admin.database().ref(`worlds/${B}/maps/test3/players/${B}`).set({ x: 3, y: 4 })
  await admin.database().ref(`userSchool/${V}`).set('S1')
  await admin.database().ref(`userSchool/${B}`).set('S1')
}

beforeAll(() => {
  admin = fnRequire('firebase-admin')
  fns = fnRequire('./index.js')
  db = admin.firestore()
  bucket = admin.storage().bucket()
})

beforeEach(async () => {
  await wipe()
  await seed()
})

describe('deleteMyAccount guards', () => {
  it('rejects unauthenticated callers, a missing confirm, and protects the super-admin', async () => {
    await expect(run(null)).rejects.toMatchObject({ code: 'unauthenticated' })
    await expect(run(fresh(), {})).rejects.toMatchObject({ message: 'CONFIRM_REQUIRED' })
    await expect(run({ uid: SUPER_UID, token: { auth_time: Math.floor(Date.now() / 1000) } })).rejects.toMatchObject({ message: 'ADMIN_PROTECTED' })
  })

  it('demands a fresh sign-in (within 5 minutes) and erases nothing otherwise', async () => {
    const stale = { uid: V, token: { auth_time: Math.floor(Date.now() / 1000) - 6 * 60 } }
    await expect(run(stale)).rejects.toMatchObject({ message: 'REAUTH_REQUIRED' })
    await expect(run({ uid: V, token: {} })).rejects.toMatchObject({ message: 'REAUTH_REQUIRED' })
    expect(await exists(`users/${V}`)).toBe(true)
    await expect(admin.auth().getUser(V)).resolves.toBeTruthy()
  })
})

describe('deleteMyAccount erasure (real handler, all emulators)', () => {
  it('deletes the user document with its subcollections (incl. the Spotify token) and the Auth account', async () => {
    await run()
    expect(await exists(`users/${V}`)).toBe(false)
    expect(await exists(`users/${V}/matches/${B}`)).toBe(false)
    expect(await exists(`users/${V}/private/spotify`)).toBe(false)
    expect(await exists(`users/${V}/receivedCredits/c1`)).toBe(false)
    await expect(admin.auth().getUser(V)).rejects.toMatchObject({ code: 'auth/user-not-found' })
    await expect(admin.auth().getUser(B)).resolves.toBeTruthy()
  })

  it('deletes everything the user owns and leaves other people’s data alone', async () => {
    await run()
    for (const gone of ['roadmapSheets/own', 'fileBagItems/f1', 'fileBagFolders/d1', 'timetableTemplates/t1',
      `focusDaily/${V}_2026-10-14`, 'focusSessions/s1', `focusActive/${V}`, `bagSettings/${V}`, `maps/${V}`, 'schoolBoards/S1/posts/pv']) {
      expect(await exists(gone), gone).toBe(false)
    }
    for (const kept of ['roadmapSheets/shared', 'fileBagItems/f2', 'fileBagFolders/d2', 'timetableTemplates/t2',
      `focusDaily/${B}_2026-10-14`, 'focusSessions/s2', 'schoolBoards/S1/posts/pb', `users/${B}`, 'chats/others']) {
      expect(await exists(kept), kept).toBe(true)
    }
  })

  it('deletes the victim’s Storage files and payment slips but not the bystander’s', async () => {
    await run()
    expect((await bucket.file(`slips/${V}/p1`).exists())[0]).toBe(false)
    expect((await bucket.file(`slips/${B}/p2`).exists())[0]).toBe(true)
    expect((await bucket.file(`users/${V}/bag/f1.txt`).exists())[0]).toBe(false)
    expect((await bucket.file(`users/${V}/roadmap/img`).exists())[0]).toBe(false)
    expect((await bucket.file(`users/${B}/bag/f2.txt`).exists())[0]).toBe(true)
  })

  it('removes the uid from other users’ follow lists and from shared roadmaps, without touching other entries', async () => {
    await run()
    const b = (await db.doc(`users/${B}`).get()).data()
    expect(b).toMatchObject({ followers: ['x'], following: [], followRequests: [], sentRequests: [] })
    const shared = (await db.doc('roadmapSheets/shared').get()).data()
    expect(shared.collaboratorUids).toEqual(['other'])
    expect(shared.collaborators).toEqual({ other: 'view' })
  })

  it('removes the user’s chat messages, drops chats left empty, and keeps the other person’s half', async () => {
    await run()
    expect(await exists('chats/solo')).toBe(false)
    expect(await exists('chats/solo/messages/m3')).toBe(false)
    expect(await exists('chats/both/messages/m1')).toBe(false)
    expect(await exists('chats/both/messages/m2')).toBe(true)
    const both = (await db.doc('chats/both').get()).data()
    expect(both.members).toEqual([B])
    expect(both.lastMessage).toBeNull()
  })

  it('anonymises credits the user gave, and keeps ledger rows with the person removed', async () => {
    await run()
    const credit = (await db.doc(`users/${B}/receivedCredits/g1`).get()).data()
    expect(credit).toMatchObject({ fromUid: 'deleted', fromName: '' })
    expect((await db.doc('purchases/p1').get()).data()).toMatchObject({ uid: 'deleted', amount: 50, status: 'SUCCESS' })
    expect((await db.doc('purchases/p2').get()).data().uid).toBe(B)
    expect((await db.doc('usedSlips/slip1').get()).data()).toMatchObject({ uid: 'deleted', purchaseId: 'p1' })
  })

  it('clears Realtime Database presence and the school mirror for the user only', async () => {
    await run()
    expect((await admin.database().ref(`worlds/${V}`).get()).exists()).toBe(false)
    expect((await admin.database().ref(`userSchool/${V}`).get()).exists()).toBe(false)
    expect((await admin.database().ref(`worlds/${B}`).get()).exists()).toBe(true)
    expect((await admin.database().ref(`userSchool/${B}`).get()).exists()).toBe(true)
  })

  it('writes an erasure log that proves the request without containing the uid', async () => {
    const r = await run()
    expect(r.ok).toBe(true)
    const logs = await db.collection('accountDeletions').get()
    expect(logs.size).toBe(1)
    const log = logs.docs[0].data()
    expect(log.uidHash).toBe(createHash('sha256').update(V).digest('hex'))
    expect(JSON.stringify(log)).not.toContain(V)
    expect(log.counts).toMatchObject({ roadmapSheets: 1, chatsRemoved: 1, chatMessages: 2, userDoc: 1 })
    expect(typeof log.deletedAt).toBe('number')
  })

  it('is idempotent: a second run on an already-erased account finishes cleanly', async () => {
    await run()
    await expect(run()).resolves.toMatchObject({ ok: true })
  })
})
