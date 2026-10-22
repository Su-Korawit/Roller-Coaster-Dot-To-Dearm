import { describe, it, expect, vi } from 'vitest'
import { loadBootTarget } from './bootTarget'

const point = { x: 1, y: 2 }

describe('loadBootTarget', () => {
  it('loads the resume target when it works', async () => {
    const load = vi.fn(async (k) => ({ k }))
    const out = await loadBootTarget({ target: { mapKey: 'campus', point }, entryKey: 'room', load })
    expect(out).toEqual({ mapKey: 'campus', point, data: { k: 'campus' } })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('falls back to the entry map without a point when the resume map cannot load, and says so', async () => {
    const load = vi.fn(async (k) => {
      if (k === 'campus') throw new Error('map-unavailable:campus')
      return { k }
    })
    const onResumeFailed = vi.fn()
    const out = await loadBootTarget({ target: { mapKey: 'campus', point }, entryKey: 'room', load, onResumeFailed })
    expect(out).toEqual({ mapKey: 'room', point: null, data: { k: 'room' } })
    expect(onResumeFailed).toHaveBeenCalledWith('campus', expect.any(Error))
  })

  it('does not retry when the entry map itself fails', async () => {
    const load = vi.fn(async () => { throw new Error('boom') })
    await expect(loadBootTarget({ target: { mapKey: 'room', point: null }, entryKey: 'room', load })).rejects.toThrow('boom')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('rejects when the fallback fails too', async () => {
    const load = vi.fn(async () => { throw new Error('down') })
    await expect(loadBootTarget({ target: { mapKey: 'campus', point }, entryKey: 'room', load })).rejects.toThrow('down')
  })
})
