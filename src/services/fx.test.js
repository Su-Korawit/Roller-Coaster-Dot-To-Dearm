import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const playSound = vi.fn()
vi.mock('../lib/sfx', () => ({ playSound: (...a) => playSound(...a) }))

const { celebrateXp, fxToast, fxError } = await import('./fx')
const { useFxStore, TOAST_MS } = await import('../stores/useFxStore')
const { xpForLevel } = await import('../utils/level')

beforeEach(() => {
  vi.useFakeTimers()
  playSound.mockReset()
  useFxStore.getState().clear()
})
afterEach(() => vi.useRealTimers())

describe('celebrateXp', () => {
  it('a plain gain plays the coin sound and shows "+N XP"', () => {
    const r = celebrateXp({ before: 10, gained: 25 })
    expect(r).toEqual({ leveledUp: false, level: 1 })
    expect(playSound).toHaveBeenCalledWith('coin')
    expect(useFxStore.getState().toasts).toMatchObject([{ kind: 'xp', text: '+25 XP' }])
  })

  it('crossing a level boundary plays the fanfare and shows LEVEL UP with the new level', () => {
    const before = xpForLevel(2) - 1
    const r = celebrateXp({ before, gained: 5 })
    expect(r).toEqual({ leveledUp: true, level: 2 })
    expect(playSound).toHaveBeenCalledWith('levelup')
    expect(playSound).not.toHaveBeenCalledWith('coin')
    expect(useFxStore.getState().toasts[0]).toMatchObject({ kind: 'levelup', text: 'LEVEL UP! Lv 2' })
  })

  it('landing exactly on the boundary counts as a level up; a gain inside a level does not', () => {
    expect(celebrateXp({ before: xpForLevel(3) - 10, gained: 10 }).leveledUp).toBe(true)
    expect(celebrateXp({ before: xpForLevel(3), gained: 10 }).leveledUp).toBe(false)
  })

  it('jumping several levels at once reports the final level once', () => {
    const r = celebrateXp({ before: 0, gained: xpForLevel(5) })
    expect(r).toEqual({ leveledUp: true, level: 5 })
    expect(useFxStore.getState().toasts).toHaveLength(1)
  })

  it('zero, negative or junk gains are silent', () => {
    for (const gained of [0, -5, NaN, undefined, 'x']) {
      expect(celebrateXp({ before: 10, gained }).leveledUp).toBe(false)
    }
    expect(playSound).not.toHaveBeenCalled()
    expect(useFxStore.getState().toasts).toHaveLength(0)
  })
})

describe('toasts', () => {
  it('fxToast optionally plays a sound and pushes a toast', () => {
    fxToast('coin', '+10', 'coin')
    expect(playSound).toHaveBeenCalledWith('coin')
    fxToast('info', 'hello')
    expect(playSound).toHaveBeenCalledTimes(1)
    expect(useFxStore.getState().toasts.map((t) => t.text)).toEqual(['+10', 'hello'])
  })

  it('toasts remove themselves after TOAST_MS and the stack is capped at four', () => {
    for (let i = 0; i < 6; i++) fxToast('info', `t${i}`)
    expect(useFxStore.getState().toasts.map((t) => t.text)).toEqual(['t2', 't3', 't4', 't5'])
    vi.advanceTimersByTime(TOAST_MS + 1)
    expect(useFxStore.getState().toasts).toHaveLength(0)
  })

  it('fxError plays the error buzz', () => {
    fxError()
    expect(playSound).toHaveBeenCalledWith('error')
  })
})
