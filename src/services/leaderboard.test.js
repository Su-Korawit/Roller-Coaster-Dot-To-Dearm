import { describe, it, expect, vi, beforeEach } from 'vitest'

const getDoc = vi.fn()
const getDocs = vi.fn()
vi.mock('firebase/firestore', () => ({
  getDoc: (...a) => getDoc(...a),
  getDocs: (...a) => getDocs(...a),
}))
vi.mock('../lib/db', () => ({
  refs: {
    leaderboardMeta: () => 'meta',
    schoolWeek: (s, w) => `sw:${s}:${w}`,
  },
  queries: { topSchools: (w, n) => `top:${w}:${n}` },
}))

const { fetchLeaderboard, contributorsNeeded, MIN_CONTRIBUTORS } = await import('./leaderboard')

const snap = (data) => ({ exists: () => data != null, data: () => data })
const META = { week: '2026-W42', endsAtMs: 5, updatedAt: 1 }

describe('fetchLeaderboard', () => {
  beforeEach(() => { getDoc.mockReset(); getDocs.mockReset() })

  it('returns null before the first rollup', async () => {
    getDoc.mockResolvedValue(snap(null))
    expect(await fetchLeaderboard()).toBeNull()
    expect(getDocs).not.toHaveBeenCalled()
  })

  it('numbers ranks from the ordered query and finds the caller rank', async () => {
    getDoc.mockImplementation(async (ref) =>
      ref === 'meta' ? snap(META) : snap({ schoolId: 'B', contributors: 12, avgHoursPerMember: 3 }))
    getDocs.mockResolvedValue({ docs: [
      { data: () => ({ schoolId: 'A', avgHoursPerMember: 5 }) },
      { data: () => ({ schoolId: 'B', avgHoursPerMember: 3 }) },
    ] })

    const r = await fetchLeaderboard({ mySchoolId: 'B' })
    expect(getDocs).toHaveBeenCalledWith('top:2026-W42:20')
    expect(r.schools.map((s) => [s.rank, s.schoolId])).toEqual([[1, 'A'], [2, 'B']])
    expect(r.mine.rank).toBe(2)
    expect(r.week).toBe('2026-W42')
  })

  it('shows an unranked own school with rank null, and null when it has no row', async () => {
    getDocs.mockResolvedValue({ docs: [] })
    getDoc.mockImplementation(async (ref) =>
      ref === 'meta' ? snap(META) : snap({ schoolId: 'Z', contributors: 4 }))
    expect((await fetchLeaderboard({ mySchoolId: 'Z' })).mine.rank).toBeNull()

    getDoc.mockImplementation(async (ref) => (ref === 'meta' ? snap(META) : snap(null)))
    expect((await fetchLeaderboard({ mySchoolId: 'Z' })).mine).toBeNull()
  })

  it('skips the own-school read for users without a school', async () => {
    getDoc.mockResolvedValue(snap(META))
    getDocs.mockResolvedValue({ docs: [] })
    await fetchLeaderboard()
    expect(getDoc).toHaveBeenCalledTimes(1)
  })
})

describe('contributorsNeeded', () => {
  it('counts down to the ranking threshold and clamps at zero', () => {
    expect(contributorsNeeded({ contributors: 4 })).toBe(MIN_CONTRIBUTORS - 4)
    expect(contributorsNeeded({ contributors: 99 })).toBe(0)
    expect(contributorsNeeded(null)).toBe(MIN_CONTRIBUTORS)
  })
})
