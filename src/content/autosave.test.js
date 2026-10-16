import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAutosaver } from './autosave'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const make = (save, extra = {}) => {
  const statuses = []
  const saver = createAutosaver({ save, onStatus: (s) => statuses.push(s), ...extra })
  return { saver, statuses }
}

describe('createAutosaver', () => {
  it('merges pushes inside the window into one save', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { saver } = make(save)
    saver.push({ title: 'a' })
    await vi.advanceTimersByTimeAsync(500)
    saver.push({ excerpt: 'b' })
    saver.push({ title: 'c' })
    await vi.advanceTimersByTimeAsync(1999)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ title: 'c', excerpt: 'b' })
  })

  it('saves again for a push after the window', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { saver } = make(save)
    saver.push({ title: 'a' })
    await vi.advanceTimersByTimeAsync(2000)
    saver.push({ title: 'b' })
    await vi.advanceTimersByTimeAsync(2000)
    expect(save.mock.calls).toEqual([[{ title: 'a' }], [{ title: 'b' }]])
  })

  it('flush saves immediately and cancels the timer', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { saver } = make(save)
    saver.push({ title: 'a' })
    await saver.flush()
    expect(save).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('flush with nothing pending does not call save', async () => {
    const save = vi.fn()
    const { saver } = make(save)
    await saver.flush()
    expect(save).not.toHaveBeenCalled()
  })

  it('reports pending, saving, saved in order', async () => {
    const { saver, statuses } = make(vi.fn().mockResolvedValue(undefined))
    saver.push({ title: 'a' })
    await vi.advanceTimersByTimeAsync(2000)
    expect(statuses).toEqual(['pending', 'saving', 'saved'])
    expect(saver.status).toBe('saved')
  })

  it('keeps the patch after a failed save and retries it with the next push', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const { saver } = make(save)
    saver.push({ title: 'a' })
    await vi.advanceTimersByTimeAsync(2000)
    expect(saver.status).toBe('error')

    saver.push({ excerpt: 'b' })
    await vi.advanceTimersByTimeAsync(2000)
    expect(save).toHaveBeenLastCalledWith({ title: 'a', excerpt: 'b' })
    expect(saver.status).toBe('saved')
  })

  it('retries the kept patch on flush', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const { saver } = make(save)
    saver.push({ title: 'a' })
    await vi.advanceTimersByTimeAsync(2000)
    await saver.flush()
    expect(save).toHaveBeenLastCalledWith({ title: 'a' })
    expect(saver.status).toBe('saved')
  })

  it('a newer value pushed while saving is not lost', async () => {
    let release
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => { release = r }))
      .mockResolvedValue(undefined)
    const { saver } = make(save)
    saver.push({ title: 'a' })
    await vi.advanceTimersByTimeAsync(2000)
    saver.push({ title: 'b' })
    release()
    await vi.advanceTimersByTimeAsync(2000)
    expect(save.mock.calls).toEqual([[{ title: 'a' }], [{ title: 'b' }]])
  })

  it('cancel drops pending changes', async () => {
    const save = vi.fn()
    const { saver } = make(save)
    saver.push({ title: 'a' })
    saver.cancel()
    await vi.advanceTimersByTimeAsync(5000)
    expect(save).not.toHaveBeenCalled()
    expect(saver.status).toBe('idle')
  })
})
