import { describe, it, expect, vi, beforeEach } from 'vitest'

const callable = vi.fn()
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn((_f, name) => () => callable(name)),
}))

const { startFocus, checkInFocus, endFocus, msUntilCheckIn, CHECKIN_PROMPT_MS } = await import('./focus')

describe('focus service', () => {
  beforeEach(() => callable.mockReset())

  it('calls the matching callable and returns its data', async () => {
    callable.mockResolvedValue({ data: { ok: true, verifiedMs: 5 } })
    expect(await startFocus()).toEqual({ ok: true, verifiedMs: 5 })
    await checkInFocus()
    await endFocus()
    expect(callable.mock.calls.map((c) => c[0])).toEqual(['startFocus', 'checkInFocus', 'endFocus'])
  })

  it('msUntilCheckIn counts down and clamps at zero', () => {
    expect(msUntilCheckIn(1000, 1000)).toBe(CHECKIN_PROMPT_MS)
    expect(msUntilCheckIn(1000, 1000 + CHECKIN_PROMPT_MS + 5)).toBe(0)
  })

  it('prompt cadence stays under the server window with slack', () => {
    expect(CHECKIN_PROMPT_MS).toBeLessThan(35 * 60 * 1000)
  })
})
