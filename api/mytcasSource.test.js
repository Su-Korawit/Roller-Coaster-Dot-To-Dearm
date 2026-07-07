import { describe, it, expect } from 'vitest'
import {
  MIN_LIVE_ROWS,
  pickCourseSource,
  resolveTcasYear,
  buildRoundsPayload,
} from './mytcasSource'

const rows = (n) => Array.from({ length: n }, (_, i) => ({ program_id: `p${i}` }))

describe('pickCourseSource', () => {
  it('serves live data when it passes the sanity threshold', () => {
    const live = rows(MIN_LIVE_ROWS)
    const snap = rows(10)
    expect(pickCourseSource({ liveRows: live, snapshotRows: snap })).toEqual({
      rows: live,
      source: 'live',
    })
  })

  it('falls back to the snapshot when live is mid-rebuild (few rows)', () => {
    const live = rows(180)
    const snap = rows(30000)
    expect(pickCourseSource({ liveRows: live, snapshotRows: snap })).toEqual({
      rows: snap,
      source: 'snapshot',
    })
  })

  it('serves degraded live data when the snapshot is even smaller', () => {
    const live = rows(180)
    const snap = rows(0)
    expect(pickCourseSource({ liveRows: live, snapshotRows: snap })).toEqual({
      rows: live,
      source: 'live',
    })
  })

  it('tolerates non-array inputs (failed fetches pass undefined)', () => {
    expect(pickCourseSource({ liveRows: undefined, snapshotRows: undefined })).toEqual({
      rows: [],
      source: 'live',
    })
    const snap = rows(3)
    expect(pickCourseSource({ liveRows: null, snapshotRows: snap })).toEqual({
      rows: snap,
      source: 'snapshot',
    })
  })

  it('honors a custom minRows threshold', () => {
    const live = rows(10)
    expect(pickCourseSource({ liveRows: live, snapshotRows: rows(5), minRows: 10 })).toEqual({
      rows: live,
      source: 'live',
    })
  })
})

describe('resolveTcasYear', () => {
  it('reads a valid year from meta', () => {
    expect(resolveTcasYear({ tcasYear: 2570 }, 2569)).toBe(2570)
  })
  it('accepts numeric strings (JSON edited by hand)', () => {
    expect(resolveTcasYear({ tcasYear: '2571' }, 2570)).toBe(2571)
  })
  it('falls back when meta is missing or absurd', () => {
    expect(resolveTcasYear(null, 2570)).toBe(2570)
    expect(resolveTcasYear({}, 2570)).toBe(2570)
    expect(resolveTcasYear({ tcasYear: 70 }, 2570)).toBe(2570)
    expect(resolveTcasYear({ tcasYear: 'next' }, 2570)).toBe(2570)
  })
})

describe('buildRoundsPayload', () => {
  it('marks announced=true when rounds exist', () => {
    const rounds = [{ round: 3, projects: [] }]
    expect(buildRoundsPayload('P1', 2570, rounds)).toEqual({
      program_id: 'P1',
      tcas_year: 2570,
      rounds,
      announced: true,
    })
  })
  it('marks announced=false for the empty upstream (criteria not yet published)', () => {
    expect(buildRoundsPayload('P1', 2570, [])).toEqual({
      program_id: 'P1',
      tcas_year: 2570,
      rounds: [],
      announced: false,
    })
  })
})
