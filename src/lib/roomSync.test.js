import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoomSync } from './roomSync'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createRoomSync', () => {
  it('saves the latest layout once after the typing pause', async () => {
    let layout = { v: 1 }
    const save = vi.fn().mockResolvedValue(undefined)
    const sync = createRoomSync({ save, getLayout: () => layout })
    sync.schedule()
    layout = { v: 2 }
    sync.schedule()
    layout = { v: 3 }
    sync.schedule()
    await vi.advanceTimersByTimeAsync(2100)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ v: 3 })
  })

  it('flush saves immediately and does nothing when nothing is pending', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const sync = createRoomSync({ save, getLayout: () => ({ v: 1 }) })
    await sync.flush()
    expect(save).not.toHaveBeenCalled()
    sync.schedule()
    await sync.flush()
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('keeps the change after a failed save and retries it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const sync = createRoomSync({ save, getLayout: () => ({ v: 1 }) })
    sync.schedule()
    await vi.advanceTimersByTimeAsync(2100)
    expect(sync.status).toBe('error')
    await sync.flush()
    expect(save).toHaveBeenCalledTimes(2)
    expect(sync.status).toBe('saved')
  })
})
