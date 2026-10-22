// Runs the REAL buyRoomItem / claimWelcomePack handlers against the Firestore emulator.
// Requires the emulators: npm run test:rules:emu
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createRequire } from 'node:module'

/* global process */
process.env.GCLOUD_PROJECT = 'demo-rcdtd'
const fnRequire = createRequire(new URL('../../functions/index.js', import.meta.url))

let fns, admin, db
beforeAll(() => {
  admin = fnRequire('firebase-admin')
  fns = fnRequire('./index.js')
  db = admin.firestore()
})

const UID = 'student-1'
const auth = { uid: UID }
const run = (fn, data = {}, a = auth) => fn.run({ auth: a, data })
const user = async (uid = UID) => (await db.doc(`users/${uid}`).get()).data()
const cat = (name, kind, price, footprint = [1, 1]) => ({ name, kind, price, tierMin: 0, footprint })

beforeEach(async () => {
  for (const col of ['users', 'rooms', 'roomCatalog']) {
    const snap = await db.collection(col).get()
    await Promise.all(snap.docs.map((d) => d.ref.delete()))
  }
  await db.doc(`users/${UID}`).set({ uid: UID, leaves: 200 })
  await db.doc('roomCatalog/lamp_desk').set({ ...cat('lamp', 'decor', 90), deskSlot: true })
  await db.doc('roomCatalog/theme_cafe').set(cat('cafe', 'theme', 150))
  await db.doc('roomCatalog/desk_basic').set(cat('desk', 'desk', 150, [2, 1]))
  await db.doc('roomCatalog/chair_basic').set(cat('chair', 'furniture', 90))
  await db.doc('roomCatalog/bed_basic').set(cat('bed', 'furniture', 200, [2, 1]))
  await db.doc('roomCatalog/theme_minimal').set(cat('minimal', 'theme', 0))
})

describe('buyRoomItem', () => {
  it('rejects unauthenticated callers', async () => {
    await expect(run(fns.buyRoomItem, { itemId: 'lamp_desk' }, null)).rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it('charges the catalog price and grants one copy', async () => {
    const r = await run(fns.buyRoomItem, { itemId: 'lamp_desk' })
    expect(r).toEqual({ ok: true, leaves: 110, owned: 1 })
    expect(await user()).toMatchObject({ leaves: 110, roomInventory: { lamp_desk: 1 } })
  })

  it('refuses a hidden item and an id with a slash', async () => {
    await db.doc('roomCatalog/lamp_desk').set({ hidden: true }, { merge: true })
    await expect(run(fns.buyRoomItem, { itemId: 'lamp_desk' })).rejects.toMatchObject({ code: 'failed-precondition' })
    await expect(run(fns.buyRoomItem, { itemId: 'a/b' })).rejects.toMatchObject({ code: 'invalid-argument' })
  })

  it('writes nothing when the Leaves do not cover it, and reports the shortfall', async () => {
    await db.doc(`users/${UID}`).set({ leaves: 50 }, { merge: true })
    const err = await run(fns.buyRoomItem, { itemId: 'lamp_desk' }).catch((e) => e)
    expect(err.code).toBe('failed-precondition')
    expect(err.details).toMatchObject({ reason: 'INSUFFICIENT_LEAVES', missing: 40 })
    expect(await user()).toMatchObject({ leaves: 50 })
    expect((await user()).roomInventory).toBeUndefined()
  })

  it('never lets parallel buys spend the same Leaves twice', async () => {
    await db.doc(`users/${UID}`).set({ leaves: 100 }, { merge: true })
    const results = await Promise.allSettled([
      run(fns.buyRoomItem, { itemId: 'lamp_desk' }),
      run(fns.buyRoomItem, { itemId: 'lamp_desk' }),
      run(fns.buyRoomItem, { itemId: 'lamp_desk' }),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const u = await user()
    expect(u.leaves).toBe(10)
    expect(u.roomInventory.lamp_desk).toBe(1)
  })

  it('refuses a unique item bought twice', async () => {
    await run(fns.buyRoomItem, { itemId: 'theme_cafe' })
    const err = await run(fns.buyRoomItem, { itemId: 'theme_cafe' }).catch((e) => e)
    expect(err.details).toMatchObject({ reason: 'ALREADY_OWNED' })
    expect((await user()).leaves).toBe(50)
  })

  it('reports an unknown item and a missing id', async () => {
    await expect(run(fns.buyRoomItem, { itemId: 'nope' })).rejects.toMatchObject({ code: 'not-found' })
    await expect(run(fns.buyRoomItem, {})).rejects.toMatchObject({ code: 'invalid-argument' })
  })
})

describe('claimWelcomePack', () => {
  it('grants 100 Leaves, the starter items and a default layout, once', async () => {
    await db.doc(`users/${UID}`).set({ uid: UID })
    const r = await run(fns.claimWelcomePack)
    expect(r).toEqual({ ok: true, already: false })
    const u = await user()
    expect(u).toMatchObject({ leaves: 100, welcomePack: 'v2' })
    expect(u.roomInventory).toMatchObject({ desk_basic: 1, chair_basic: 1, bed_basic: 1, theme_minimal: 1 })
    expect(u.roomInventory.mug).toBeUndefined()
    const room = (await db.doc(`rooms/${UID}`).get()).data()
    expect(room).toMatchObject({ tier: 0, theme: 'minimal', petId: null })
    expect(room.placed.some((p) => p.itemId === 'desk_basic')).toBe(true)
  })

  it('does nothing the second time', async () => {
    await db.doc(`users/${UID}`).set({ uid: UID })
    await run(fns.claimWelcomePack)
    expect(await run(fns.claimWelcomePack)).toEqual({ ok: true, already: true })
    expect((await user()).leaves).toBe(100)
  })

  it('grants once even when called in parallel', async () => {
    await db.doc(`users/${UID}`).set({ uid: UID })
    await Promise.all([run(fns.claimWelcomePack), run(fns.claimWelcomePack), run(fns.claimWelcomePack)])
    expect((await user()).leaves).toBe(100)
  })

  it('never overwrites a layout the user already has, and keeps earned Leaves', async () => {
    await db.doc(`users/${UID}`).set({ uid: UID, leaves: 30 })
    await db.doc(`rooms/${UID}`).set({ tier: 0, theme: 'minimal', placed: [{ itemId: 'bed_basic', x: 8, y: 8 }], petId: null })
    await run(fns.claimWelcomePack)
    expect((await user()).leaves).toBe(130)
    expect((await db.doc(`rooms/${UID}`).get()).data().placed).toEqual([{ itemId: 'bed_basic', x: 8, y: 8 }])
  })

  it('skips starter items missing from the catalog instead of failing', async () => {
    await db.doc('roomCatalog/bed_basic').delete()
    await db.doc(`users/${UID}`).set({ uid: UID })
    await run(fns.claimWelcomePack)
    const u = await user()
    expect(u.roomInventory.bed_basic).toBeUndefined()
    expect(u.roomInventory.desk_basic).toBe(1)
  })

  it('requires sign-in', async () => {
    await expect(run(fns.claimWelcomePack, {}, null)).rejects.toMatchObject({ code: 'unauthenticated' })
  })
})

describe('saveRoomLayout', () => {
  const layout = (placed, extra = {}) => ({ tier: 0, theme: 'minimal', petId: null, placed, ...extra })
  const inventory = { desk_basic: 1, chair_basic: 1, lamp_desk: 1, theme_minimal: 1 }
  const roomDoc = async (uid = UID) => (await db.doc(`rooms/${uid}`).get()).data()

  beforeEach(async () => {
    await db.doc(`users/${UID}`).set({ uid: UID, leaves: 0, roomInventory: inventory })
  })

  it('rejects an oversized layout before looking at it', async () => {
    const placed = Array.from({ length: 61 }, () => ({ itemId: 'chair_basic', x: 8, y: 8 }))
    await expect(run(fns.saveRoomLayout, { layout: layout(placed) })).rejects.toMatchObject({ code: 'invalid-argument' })
  })

  it('saves a valid layout for the caller', async () => {
    const placed = [
      { itemId: 'desk_basic', x: 96, y: 32 },
      { itemId: 'chair_basic', x: 104, y: 48 },
      { itemId: 'lamp_desk', x: 96, y: 32, slot: 'left' },
    ]
    expect(await run(fns.saveRoomLayout, { layout: layout(placed) })).toEqual({ ok: true })
    expect(await roomDoc()).toMatchObject({ tier: 0, theme: 'minimal', petId: null, placed })
  })

  it('rejects more copies than owned and leaves the saved room unchanged', async () => {
    await db.doc(`rooms/${UID}`).set({ tier: 0, theme: 'minimal', petId: null, placed: [] })
    const bad = layout([{ itemId: 'chair_basic', x: 16, y: 16 }, { itemId: 'chair_basic', x: 48, y: 16 }])
    const err = await run(fns.saveRoomLayout, { layout: bad }).catch((e) => e)
    expect(err.code).toBe('invalid-argument')
    expect(err.details.errors).toEqual([{ code: 'not_owned', itemId: 'chair_basic' }])
    expect((await roomDoc()).placed).toEqual([])
  })

  it('rejects unknown items, overlaps and an unowned theme', async () => {
    const err = await run(fns.saveRoomLayout, { layout: layout([{ itemId: 'ghost', x: 8, y: 8 }], { theme: 'cafe' }) }).catch((e) => e)
    expect(err.details.errors.map((e) => e.code).sort()).toEqual(['bad_theme', 'unknown_item'])
  })

  it('requires sign-in and a layout object', async () => {
    await expect(run(fns.saveRoomLayout, { layout: layout([]) }, null)).rejects.toMatchObject({ code: 'unauthenticated' })
    await expect(run(fns.saveRoomLayout, {})).rejects.toMatchObject({ code: 'invalid-argument' })
  })

  it('only ever writes the own room of the caller', async () => {
    await db.doc('users/other').set({ uid: 'other', roomInventory: inventory })
    await run(fns.saveRoomLayout, { layout: layout([]) })
    expect((await db.doc('rooms/other').get()).exists).toBe(false)
  })

  it('stores only the known layout fields', async () => {
    await run(fns.saveRoomLayout, { layout: { ...layout([]), isAdmin: true, leaves: 9999 } })
    const doc = await roomDoc()
    expect(doc.isAdmin).toBeUndefined()
    expect(doc.leaves).toBeUndefined()
  })
})
