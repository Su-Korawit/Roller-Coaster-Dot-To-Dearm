import { describe, it, expect, vi, afterEach } from 'vitest'
import { captureRoomBlob, SHARE_WATERMARK } from './shareRoomImage'

afterEach(() => vi.useRealTimers())

const makeGame = (snapshot) => ({ events: { emit: vi.fn() }, renderer: { snapshot } })

describe('captureRoomBlob (privacy)', () => {
  it('returns null and touches nothing when the renderer cannot snapshot', async () => {
    const game = { events: { emit: vi.fn() }, renderer: {} }
    expect(await captureRoomBlob(game)).toBeNull()
    expect(game.events.emit).not.toHaveBeenCalled()
  })

  it('hides other players names while capturing and ALWAYS restores them, even when the snapshot never returns', async () => {
    vi.useFakeTimers()
    const game = makeGame(() => { /* never calls back */ })
    const p = captureRoomBlob(game).catch((e) => e)
    expect(game.events.emit).toHaveBeenCalledWith('setNamesVisible', false)
    await vi.advanceTimersByTimeAsync(4100)
    const err = await p
    expect(err.message).toBe('snapshot timeout')
    expect(game.events.emit).toHaveBeenLastCalledWith('setNamesVisible', true)
  })

  it('the watermark is the brand only — no name or school placeholder', () => {
    expect(SHARE_WATERMARK).toBe('I LOVE TCAS · ilovetcas.com')
  })
})
