// Runs the REAL rollup against the Firestore emulator (Admin SDK) and checks the
// leaderboard rules. Requires the emulators: npm run test:rules:emu
/* global process */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

process.env.GCLOUD_PROJECT = 'demo-rcdtd'
const fnRequire = createRequire(new URL('../../functions/index.js', import.meta.url))

let fns, db, testEnv
const NOW = Date.UTC(2026, 9, 14, 3, 0, 0)   // Wed 2026-10-14 10:00 Bangkok -> 2026-W42
const H = 60 * 60 * 1000

beforeAll(async () => {
  const admin = fnRequire('firebase-admin')
  fns = fnRequire('./index.js')
  db = admin.firestore()
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rcdtd',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => { await testEnv?.cleanup() })

beforeEach(async () => {
  for (const col of ['focusDaily', 'schools', 'schoolWeeks', 'leaderboardMeta']) {
    const snap = await db.collection(col).get()
    await Promise.all(snap.docs.map((d) => d.ref.delete()))
  }
})

const seedDay = (uid, schoolId, day, hours) =>
  db.doc(`focusDaily/${uid}_${day}`).set({ uid, schoolId, day, verifiedMs: hours * H })

describe('rollupWeek (real handler, emulator)', () => {
  it('aggregates this ISO week only, per school, and writes the meta doc', async () => {
    await db.doc('schools/A').set({ name: 'School A', memberCount: 10 })
    for (let i = 0; i < 10; i++) {
      await seedDay(`a${i}`, 'A', '2026-10-12', 2)    // Monday
      await seedDay(`a${i}`, 'A', '2026-10-14', 3)    // Wednesday
    }
    await seedDay('a0', 'A', '2026-10-11', 8)         // previous Sunday: other week, ignored
    await seedDay('a0', 'A', '2026-10-19', 8)         // next Monday: ignored

    const r = await fns._rollupWeek(NOW)
    expect(r).toEqual({ week: '2026-W42', schools: 1, ranked: 1 })

    const row = (await db.doc('schoolWeeks/A_2026-W42').get()).data()
    expect(row).toMatchObject({
      schoolId: 'A', schoolName: 'School A', contributors: 10, memberCount: 10,
      totalMs: 50 * H, avgHoursPerMember: 5, ranked: true, week: '2026-W42',
    })
    const meta = (await db.doc('leaderboardMeta/current').get()).data()
    expect(meta).toMatchObject({ week: '2026-W42', endsAtMs: Date.UTC(2026, 9, 18, 17, 0, 0) })
  })

  it('writes unranked schools too (flagged) and is idempotent', async () => {
    await seedDay('u1', 'tiny', '2026-10-13', 4)
    await fns._rollupWeek(NOW)
    await fns._rollupWeek(NOW)
    const snap = await db.collection('schoolWeeks').get()
    expect(snap.size).toBe(1)
    expect(snap.docs[0].data()).toMatchObject({ schoolId: 'tiny', ranked: false, contributors: 1 })
  })

  it('the client top-N query shape works (ordered, ranked only)', async () => {
    await db.doc('schools/A').set({ name: 'A', memberCount: 10 })
    await db.doc('schools/B').set({ name: 'B', memberCount: 10 })
    for (let i = 0; i < 10; i++) {
      await seedDay(`a${i}`, 'A', '2026-10-13', 1)
      await seedDay(`b${i}`, 'B', '2026-10-13', 4)
    }
    await seedDay('c', 'C', '2026-10-13', 8)           // unranked
    await fns._rollupWeek(NOW)

    const snap = await db.collection('schoolWeeks')
      .where('week', '==', '2026-W42').where('ranked', '==', true)
      .orderBy('avgHoursPerMember', 'desc').limit(20).get()
    expect(snap.docs.map((d) => d.data().schoolId)).toEqual(['B', 'A'])
  })
})

describe('leaderboard rules', () => {
  it('is publicly readable but never client-writable', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'schoolWeeks/A_2026-W42'), { schoolId: 'A', ranked: true })
      await setDoc(doc(ctx.firestore(), 'leaderboardMeta/current'), { week: '2026-W42' })
    })
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'schoolWeeks/A_2026-W42')))
    await assertSucceeds(getDoc(doc(anon, 'leaderboardMeta/current')))

    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'schoolWeeks/A_2026-W42'), { avgHoursPerMember: 9999, ranked: true }))
    await assertFails(setDoc(doc(alice, 'leaderboardMeta/current'), { week: 'x' }))
  })
})
