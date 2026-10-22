import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchIndex, fetchBuilding, storageUrl, validateIndex, validateBuilding } from './openHouseClient'

const goodBuilding = { tcasYear: 2570, updatedAt: '2026-10-16T03:00:00.000Z', universities: [
  { id: 'u1', nameTh: 'จุฬา', typeTh: 'ทปอ.', logoUrl: 'x', programs: [{ programId: 'p1', nameTh: 'a', typeTh: 'ปกติ', costText: '1', rounds: [{ round: 3, seats: 5, projects: [] }] }] },
] }
const goodIndex = { tcasYear: 2570, updatedAt: '2026-10-16T03:00:00.000Z', buildings: { med: { programs: 1, universities: 1, rounds: {} } } }

const respond = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => (body instanceof Error ? Promise.reject(body) : body) })

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

describe('storageUrl', () => {
  it('addresses the public Storage object for a path', () => {
    expect(storageUrl('data/mytcas/openhouse/med.json')).toBe(
      'https://firebasestorage.googleapis.com/v0/b/rollercoasterdottodream.firebasestorage.app/o/data%2Fmytcas%2Fopenhouse%2Fmed.json?alt=media',
    )
  })
})

describe('validators', () => {
  it('accept the documented shapes and reject anything else', () => {
    expect(validateIndex(goodIndex)).toBe(true)
    expect(validateBuilding(goodBuilding)).toBe(true)
    for (const bad of [null, undefined, 5, 'x', [], {}, { buildings: [] }, { buildings: null }]) expect(validateIndex(bad)).toBe(false)
    for (const bad of [null, {}, { universities: 'x' }, { universities: [null] }, { universities: [{ id: 'u' }] }, { universities: [{ id: 'u', nameTh: 'a', programs: 'x' }] }]) expect(validateBuilding(bad)).toBe(false)
  })
})

describe('fetchIndex / fetchBuilding', () => {
  it('return the data when the file is there and valid', async () => {
    fetch.mockResolvedValueOnce(respond(goodIndex))
    expect(await fetchIndex()).toEqual({ ok: true, data: goodIndex })
    fetch.mockResolvedValueOnce(respond(goodBuilding))
    expect(await fetchBuilding('med')).toEqual({ ok: true, data: goodBuilding })
    expect(fetch.mock.calls[1][0]).toContain('openhouse%2Fmed.json')
  })

  it('a missing file (404/403) is "missing", not an error to show raw', async () => {
    fetch.mockResolvedValueOnce(respond({}, 404))
    expect(await fetchBuilding('med')).toEqual({ ok: false, error: 'missing' })
    fetch.mockResolvedValueOnce(respond({}, 403))
    expect(await fetchIndex()).toEqual({ ok: false, error: 'missing' })
  })

  it('invalid JSON or the wrong shape is "corrupt"', async () => {
    fetch.mockResolvedValueOnce(respond(new Error('bad json')))
    expect(await fetchBuilding('med')).toEqual({ ok: false, error: 'corrupt' })
    fetch.mockResolvedValueOnce(respond({ universities: 'nope' }))
    expect(await fetchBuilding('med')).toEqual({ ok: false, error: 'corrupt' })
  })

  it('a network failure or a server error is "network"', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await fetchBuilding('med')).toEqual({ ok: false, error: 'network' })
    fetch.mockResolvedValueOnce(respond({}, 500))
    expect(await fetchIndex()).toEqual({ ok: false, error: 'network' })
  })

  it('refuses a building id that is not one of the 18 (no arbitrary Storage paths)', async () => {
    expect(await fetchBuilding('../secrets')).toEqual({ ok: false, error: 'missing' })
    expect(await fetchBuilding(undefined)).toEqual({ ok: false, error: 'missing' })
    expect(fetch).not.toHaveBeenCalled()
  })
})
