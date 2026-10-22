// Runs the REAL startFocus/checkInFocus/endFocus handlers against the Firestore
// emulator (Admin SDK), with a controlled clock. Requires the emulators:
//   npm run test:rules:emu
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { vi } from 'vitest'
import { createRequire } from 'node:module'

/* global process */
process.env.GCLOUD_PROJECT = 'demo-rcdtd'
const fnRequire = createRequire(new URL('../../functions/index.js', import.meta.url))

let fns, admin, db, math
beforeAll(() => {
  admin = fnRequire('firebase-admin')
  fns = fnRequire('./index.js')
  math = fnRequire('./focusMath.js')
  db = admin.firestore()
})

const T0 = Date.UTC(2026, 9, 14, 3, 0, 0)   // 10:00 Bangkok, 2026-10-14
const MIN = 60 * 1000
const UID = 'student-1'
const auth = { uid: UID }
const call = (fn, req = { auth }) => fn.run({ data: {}, ...req })

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(T0)
  for (const col of ['focusActive', 'focusDaily', 'focusSessions', 'users']) {
    const snap = await db.collection(col).get()
    await Promise.all(snap.docs.map((d) => d.ref.delete()))
  }
  await db.collection('users').doc(UID).set({ uid: UID, schoolId: 'ChIJschool' })
})

afterEach(() => vi.useRealTimers())

const at = (minutes) => vi.setSystemTime(T0 + minutes * MIN)

describe('Focus callables (real handlers, emulator)', () => {
  it('rejects unauthenticated callers', async () => {
    await expect(call(fns.startFocus, {})).rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it('start creates an active session carrying the user’s schoolId; a second start resumes it', async () => {
    const a = await call(fns.startFocus)
    expect(a).toMatchObject({ ok: true, resumed: false })
    expect((await db.doc(`focusActive/${UID}`).get()).data()).toMatchObject({ schoolId: 'ChIJschool', verifiedMs: 0 })
    at(5)
    expect(await call(fns.startFocus)).toMatchObject({ resumed: true, startedAt: T0 })
  })

  it('check-in after 25 min credits 25 min, awards 25 XP and records the Bangkok day', async () => {
    await call(fns.startFocus)
    at(25)
    const r = await call(fns.checkInFocus)
    expect(r).toMatchObject({ creditedMs: 25 * MIN, verifiedMs: 25 * MIN, xpGained: 25, lapsed: false, capped: false })
    expect((await db.doc(`users/${UID}`).get()).data().focusXp).toBe(25)
    const daily = (await db.doc(`focusDaily/${UID}_2026-10-14`).get()).data()
    expect(daily).toMatchObject({ uid: UID, schoolId: 'ChIJschool', verifiedMs: 25 * MIN })
  })

  it('a check-in after a 2h silence credits nothing but keeps the session alive', async () => {
    await call(fns.startFocus)
    at(120)
    expect(await call(fns.checkInFocus)).toMatchObject({ creditedMs: 0, lapsed: true, xpGained: 0 })
    expect((await db.doc(`focusActive/${UID}`).get()).data().lastCheckInAt).toBe(T0 + 120 * MIN)
  })

  it('spamming check-ins cannot earn more than wall time', async () => {
    await call(fns.startFocus)
    let credited = 0
    for (let s = 10; s <= 600; s += 10) {   // every 10s for 10 minutes
      vi.setSystemTime(T0 + s * 1000)
      credited += (await call(fns.checkInFocus)).creditedMs
    }
    expect(credited).toBe(10 * MIN)
  })

  it('a call inside the minimum gap changes nothing', async () => {
    await call(fns.startFocus)
    vi.setSystemTime(T0 + 3000)
    expect(await call(fns.checkInFocus)).toMatchObject({ tooSoon: true, creditedMs: 0 })
    expect((await db.doc(`focusActive/${UID}`).get()).data().lastCheckInAt).toBe(T0)
  })

  it('enforces the 8h daily cap across sessions', async () => {
    await db.doc(`focusDaily/${UID}_2026-10-14`).set({ uid: UID, day: '2026-10-14', verifiedMs: math.DAILY_CAP_MS - 10 * MIN })
    await call(fns.startFocus)
    at(30)
    expect(await call(fns.checkInFocus)).toMatchObject({ creditedMs: 10 * MIN, capped: true })
    at(60)
    expect(await call(fns.checkInFocus)).toMatchObject({ creditedMs: 0, capped: true })
  })

  it('end settles the last segment, writes history and clears the active session', async () => {
    await call(fns.startFocus)
    at(20)
    const r = await call(fns.endFocus)
    expect(r).toMatchObject({ creditedMs: 20 * MIN, xpGained: 20 })
    expect((await db.doc(`focusActive/${UID}`).get()).exists).toBe(false)
    const hist = await db.collection('focusSessions').get()
    expect(hist.size).toBe(1)
    expect(hist.docs[0].data()).toMatchObject({ uid: UID, verifiedMs: 20 * MIN, reason: 'ended' })
  })

  it('check-in / end without a session fail with NO_ACTIVE_SESSION', async () => {
    await expect(call(fns.checkInFocus)).rejects.toMatchObject({ message: 'NO_ACTIVE_SESSION' })
    await expect(call(fns.endFocus)).rejects.toMatchObject({ message: 'NO_ACTIVE_SESSION' })
  })

  it('start over a stale session closes it as lapsed (no extra credit) and begins a new one', async () => {
    await call(fns.startFocus)
    at(200)
    expect(await call(fns.startFocus)).toMatchObject({ resumed: false, startedAt: T0 + 200 * MIN })
    const hist = await db.collection('focusSessions').get()
    expect(hist.docs.map((d) => d.data().reason)).toEqual(['lapsed'])
    expect(hist.docs[0].data().verifiedMs).toBe(0)
  })
})

describe('Temperament perks (real handlers, emulator)', () => {
  const setMbti = (mbti) => db.collection('users').doc(UID).set({ uid: UID, schoolId: 'ChIJschool', profile: { mbti } })
  const xpOf = async () => (await db.doc(`users/${UID}`).get()).data().focusXp ?? 0
  const dailyMs = async (day) => (await db.doc(`focusDaily/${UID}_${day}`).get()).data()?.verifiedMs

  it('no MBTI -> no bonus, multiplier 1', async () => {
    await call(fns.startFocus)
    at(25)
    expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: 1, xpGained: 25 })
  })

  it('NT: deep-focus bonus applies only after 50 verified minutes in the session', async () => {
    await setMbti('INTJ')
    expect(await call(fns.startFocus)).toMatchObject({ temperament: 'NT' })
    at(25); expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: 1, xpGained: 25 })
    at(50); expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: 1, xpGained: 25 })
    at(75); expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: expect.closeTo(1.1, 5), xpGained: 27 })
    expect(await xpOf()).toBe(77)                              // 25 + 25 + floor(27.5)
    expect(await dailyMs('2026-10-14')).toBe(75 * MIN)         // leaderboard time is NOT inflated by the perk
  })

  it('NF: night-owl bonus at 21:00 Bangkok, none at 10:00', async () => {
    await setMbti('INFP')
    vi.setSystemTime(Date.UTC(2026, 9, 14, 14, 0))             // 21:00 Bangkok
    await call(fns.startFocus)
    vi.setSystemTime(Date.UTC(2026, 9, 14, 14, 25))
    expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: expect.closeTo(1.1, 5), xpGained: 27 })
    await call(fns.endFocus)

    vi.setSystemTime(Date.UTC(2026, 9, 15, 3, 0))              // next morning, 10:00 Bangkok
    await call(fns.startFocus)
    vi.setSystemTime(Date.UTC(2026, 9, 15, 3, 25))
    expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: 1, xpGained: 25 })
  })

  it('SJ: routine bonus only if the student studied at least 20 minutes yesterday', async () => {
    await setMbti('ISTJ')
    await call(fns.startFocus)
    at(25)
    expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: 1 })
    await call(fns.endFocus)

    // next day, after studying 30 min "yesterday" (the seeded day is 2026-10-14)
    await db.doc(`focusDaily/${UID}_2026-10-14`).set({ uid: UID, day: '2026-10-14', verifiedMs: 30 * MIN })
    vi.setSystemTime(Date.UTC(2026, 9, 15, 3, 0))
    await call(fns.startFocus)
    vi.setSystemTime(Date.UTC(2026, 9, 15, 3, 25))
    expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: expect.closeTo(1.1, 5), xpGained: 27 })
  })

  it('SP: sprint bonus covers the first 30 minutes of the day, then stops', async () => {
    await setMbti('ESTP')
    await call(fns.startFocus)
    at(25); expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: expect.closeTo(1.1, 5), xpGained: 27 })
    at(50); expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: expect.closeTo(1.1, 5) })   // daily was 25 < 30
    at(75); expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: 1, xpGained: 25 })           // daily 50 >= 30
  })

  it('a session started before perks existed (no weightedMs) still settles on its verified total', async () => {
    await db.doc(`focusActive/${UID}`).set({ uid: UID, schoolId: 'ChIJschool', startedAt: T0, lastCheckInAt: T0, verifiedMs: 0 })
    at(25)
    expect(await call(fns.checkInFocus)).toMatchObject({ multiplier: 1, xpGained: 25 })
  })
})

describe('Study Room focus: modes, wither and Leaves (real handlers, emulator)', () => {
  const start = (data) => call(fns.startFocus, { auth, data })
  const userLeaves = async () => (await db.doc(`users/${UID}`).get()).data().leaves ?? 0

  it('stores the validated mode and planned minutes and returns them', async () => {
    const r = await start({ mode: 'strict', plannedMin: 25 })
    expect(r).toMatchObject({ ok: true, mode: 'strict', plannedMin: 25 })
    expect((await db.doc(`focusActive/${UID}`).get()).data()).toMatchObject({ mode: 'strict', plannedMin: 25, withered: false })
  })

  it.each([
    [{ plannedMin: 5 }, 'bad_planned'],
    [{ plannedMin: 500 }, 'bad_planned'],
    [{ plannedMin: 25.5 }, 'bad_planned'],
    [{ mode: 'hard' }, 'bad_mode'],
  ])('rejects %j', async (data, code) => {
    await expect(start(data)).rejects.toMatchObject({ code: 'invalid-argument', details: { code } })
    expect((await db.doc(`focusActive/${UID}`).get()).exists).toBe(false)
  })

  it('defaults to a flexible 25-minute session when nothing is sent', async () => {
    expect(await start({})).toMatchObject({ mode: 'flexible', plannedMin: 25 })
  })

  it('a resumed session keeps its original mode and planned time', async () => {
    await start({ mode: 'strict', plannedMin: 50 })
    at(5)
    expect(await start({ mode: 'flexible', plannedMin: 10 })).toMatchObject({ resumed: true, mode: 'strict', plannedMin: 50 })
  })

  it('resuming a strict session (tab closed and reopened) withers it: the full reward is not kept', async () => {
    await start({ mode: 'strict', plannedMin: 25 })
    at(5)
    expect(await start({ mode: 'strict', plannedMin: 25 })).toMatchObject({ resumed: true, withered: true })
    at(25)
    expect(await call(fns.endFocus)).toMatchObject({ leaves: 0, withered: true, tree: 'withered' })
  })

  it('resuming a flexible session keeps it healthy', async () => {
    await start({ mode: 'flexible', plannedMin: 25 })
    at(5)
    expect(await start({ mode: 'flexible', plannedMin: 25 })).toMatchObject({ resumed: true, withered: false })
  })

  it('a completed flexible 25-minute session credits 27 Leaves and a shrub', async () => {
    await start({ mode: 'flexible', plannedMin: 25 })
    at(25)
    const r = await call(fns.endFocus)
    expect(r).toMatchObject({ leaves: 27, tree: 'shrub', mode: 'flexible', plannedMin: 25, withered: false })
    expect(await userLeaves()).toBe(27)
    const [session] = (await db.collection('focusSessions').get()).docs.map((d) => d.data())
    expect(session).toMatchObject({ mode: 'flexible', plannedMin: 25, tree: 'shrub', leaves: 27, withered: false })
  })

  it('a completed strict 25-minute session credits 41 Leaves', async () => {
    await start({ mode: 'strict', plannedMin: 25 })
    at(25)
    expect(await call(fns.endFocus)).toMatchObject({ leaves: 41, withered: false })
    expect(await userLeaves()).toBe(41)
  })

  it('a strict session with a lapsed check-in withers and earns nothing', async () => {
    await start({ mode: 'strict', plannedMin: 25 })
    at(40)
    const r = await call(fns.endFocus)
    expect(r).toMatchObject({ leaves: 0, withered: true, tree: 'withered' })
    expect(await userLeaves()).toBe(0)
  })

  it('a strict wither is recorded on the active session at the lapsed check-in', async () => {
    await start({ mode: 'strict', plannedMin: 25 })
    at(40)
    expect(await call(fns.checkInFocus)).toMatchObject({ withered: true })
    expect((await db.doc(`focusActive/${UID}`).get()).data().withered).toBe(true)
  })

  it('abandonFocus: strict earns 0, flexible keeps its verified minutes without the bonus', async () => {
    await start({ mode: 'strict', plannedMin: 25 })
    at(12)
    expect(await call(fns.abandonFocus)).toMatchObject({ leaves: 0, withered: true })

    at(20)
    await start({ mode: 'flexible', plannedMin: 25 })
    at(32)
    expect(await call(fns.abandonFocus)).toMatchObject({ leaves: 12, withered: true, tree: 'withered' })
    expect(await userLeaves()).toBe(12)
  })

  it('ending twice credits once', async () => {
    await start({ mode: 'flexible', plannedMin: 25 })
    at(25)
    await call(fns.endFocus)
    await expect(call(fns.endFocus)).rejects.toMatchObject({ code: 'failed-precondition' })
    expect(await userLeaves()).toBe(27)
  })

  it('the daily cap limits verified time and therefore Leaves', async () => {
    await db.doc(`focusDaily/${UID}_2026-10-14`).set({ uid: UID, day: '2026-10-14', verifiedMs: 8 * 60 * MIN - 10 * MIN })
    await start({ mode: 'flexible', plannedMin: 25 })
    at(30)
    expect((await call(fns.endFocus)).leaves).toBeLessThanOrEqual(11)
  })

  it('abandon without a session fails with NO_ACTIVE_SESSION', async () => {
    await expect(call(fns.abandonFocus)).rejects.toMatchObject({ code: 'failed-precondition' })
  })
})

describe('practice focus (the Guide’s one-time gift)', () => {
  const startPractice = (extra = {}) => call(fns.startFocus, { auth, data: { practice: true, ...extra } })
  const userDoc = async () => (await db.doc(`users/${UID}`).get()).data()
  const dailyDocs = async () => (await db.collection('focusDaily').get()).size

  it('stores a flexible 1-minute practice session whatever else is sent', async () => {
    expect(await startPractice({ mode: 'strict', plannedMin: 50 })).toMatchObject({ mode: 'flexible', plannedMin: 1, practice: true })
    expect((await db.doc(`focusActive/${UID}`).get()).data()).toMatchObject({ mode: 'flexible', plannedMin: 1, practice: true })
  })

  it('ended after a minute: pays 10 Leaves once, no XP and no leaderboard row', async () => {
    await startPractice()
    at(1)
    const r = await call(fns.endFocus)
    expect(r).toMatchObject({ leaves: 10, practice: true, withered: false })
    expect(await userDoc()).toMatchObject({ leaves: 10, practiceRewarded: true })
    expect((await userDoc()).focusXp ?? 0).toBe(0)
    expect(await dailyDocs()).toBe(0)
    const [session] = (await db.collection('focusSessions').get()).docs.map((d) => d.data())
    expect(session).toMatchObject({ practice: true, leaves: 10 })
  })

  it('ended too early earns nothing and leaves the gift available for a retry', async () => {
    await startPractice()
    vi.setSystemTime(T0 + 20 * 1000)
    expect(await call(fns.endFocus)).toMatchObject({ leaves: 0 })
    expect((await userDoc()).practiceRewarded).toBeUndefined()
    at(2)
    await startPractice()
    at(3)
    expect(await call(fns.endFocus)).toMatchObject({ leaves: 10 })
  })

  it('a second practice after the gift is refused', async () => {
    await startPractice()
    at(1)
    await call(fns.endFocus)
    await expect(startPractice()).rejects.toMatchObject({ code: 'failed-precondition' })
  })

  it('ending twice, or two ends at once, pays once', async () => {
    await startPractice()
    at(1)
    const results = await Promise.allSettled([call(fns.endFocus), call(fns.endFocus)])
    expect(results.filter((r) => r.status === 'fulfilled').length).toBeGreaterThanOrEqual(1)
    await expect(call(fns.endFocus)).rejects.toMatchObject({ code: 'failed-precondition' })
    expect((await userDoc()).leaves).toBe(10)
  })

  it('abandoning a practice session pays nothing', async () => {
    await startPractice()
    at(1)
    expect(await call(fns.abandonFocus)).toMatchObject({ leaves: 0, practice: true })
    expect((await userDoc()).practiceRewarded).toBeUndefined()
  })

  it('practice while a normal session runs returns that session and pays normal Leaves only', async () => {
    await call(fns.startFocus, { auth, data: { mode: 'flexible', plannedMin: 25 } })
    at(2)
    expect(await startPractice()).toMatchObject({ resumed: true, plannedMin: 25, practice: false })
    at(25)
    const r = await call(fns.endFocus)
    expect(r).toMatchObject({ leaves: 27, practice: false })
    expect((await userDoc()).practiceRewarded).toBeUndefined()
  })

  it('a practice session is not held back by an exhausted daily cap', async () => {
    await db.doc(`focusDaily/${UID}_2026-10-14`).set({ uid: UID, day: '2026-10-14', verifiedMs: 8 * 60 * MIN })
    await startPractice()
    at(1)
    expect(await call(fns.endFocus)).toMatchObject({ leaves: 10 })
  })
})
