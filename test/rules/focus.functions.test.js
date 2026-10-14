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
