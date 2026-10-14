import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── RTDB mocks ───────────────────────────────────────────────────────────────
const setFn        = vi.fn()
const removeFn     = vi.fn()
const onValueFn    = vi.fn()
const onDisconnectObj = { remove: vi.fn(), cancel: vi.fn() }
const onDisconnectFn  = vi.fn(() => onDisconnectObj)

vi.mock('../firebase', () => ({ rtdb: {} }))
vi.mock('firebase/database', () => ({
  ref:         vi.fn((_, path) => ({ _path: path })),
  set:         (...a) => setFn(...a),
  remove:      (...a) => removeFn(...a),
  onValue:     (...a) => onValueFn(...a),
  onDisconnect: (...a) => onDisconnectFn(...a),
}))

// Stub localStorage (Zustand persist guard)
vi.stubGlobal('localStorage', {
  getItem: () => null, setItem: () => {}, removeItem: () => {},
})

const { joinWorld, leaveWorld, subscribeWorldPlayers, updateSelf, detachWorldPlayers, _resetThrottleForTest, IDLE_AFTER_MS } =
  await import('./presence')

describe('presence — joinWorld', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    onDisconnectFn.mockReturnValue(onDisconnectObj)
    setFn.mockResolvedValue(undefined)
    onDisconnectObj.remove.mockResolvedValue(undefined)
  })

  it('writes own state to worlds/{ownerUid}/maps/{mapKey}/players/{selfUid}', async () => {
    await joinWorld('owner-1', 'test3', 'self-1', { x: 0, y: 0, mbti: 'INTJ', name: 'Alice' })

    expect(setFn).toHaveBeenCalledWith(
      { _path: 'worlds/owner-1/maps/test3/players/self-1' },
      { x: 0, y: 0, mbti: 'INTJ', name: 'Alice' },
    )
  })

  it('arms onDisconnect().remove() so the node is cleared on close', async () => {
    await joinWorld('owner-1', 'test3', 'self-1', { x: 0, y: 0 })

    expect(onDisconnectFn).toHaveBeenCalledWith({ _path: 'worlds/owner-1/maps/test3/players/self-1' })
    expect(onDisconnectObj.remove).toHaveBeenCalled()
  })
})

describe('presence — leaveWorld', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    onDisconnectFn.mockReturnValue(onDisconnectObj)
    removeFn.mockResolvedValue(undefined)
    onDisconnectObj.cancel.mockResolvedValue(undefined)
  })

  it('removes own player node from RTDB', () => {
    leaveWorld('owner-1', 'test3', 'self-1')

    expect(removeFn).toHaveBeenCalledWith({ _path: 'worlds/owner-1/maps/test3/players/self-1' })
  })

  it('cancels the onDisconnect handler', () => {
    leaveWorld('owner-1', 'test3', 'self-1')

    expect(onDisconnectFn).toHaveBeenCalledWith({ _path: 'worlds/owner-1/maps/test3/players/self-1' })
    expect(onDisconnectObj.cancel).toHaveBeenCalled()
  })
})

describe('presence — subscribeWorldPlayers', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    detachWorldPlayers()  // reset module-level unsub state
  })

  it('invokes the callback with the players snapshot value', () => {
    const cb = vi.fn()
    const players = { 'uid-a': { x: 10, y: 20, mbti: 'ENFP' } }
    onValueFn.mockImplementation((ref, handler) => {
      handler({ val: () => players })
      return () => {}
    })

    subscribeWorldPlayers('owner-1', 'test3', cb)

    expect(cb).toHaveBeenCalledWith(players)
  })

  it('passes an empty object when the snapshot is null (no players yet)', () => {
    const cb = vi.fn()
    onValueFn.mockImplementation((ref, handler) => {
      handler({ val: () => null })
      return () => {}
    })

    subscribeWorldPlayers('owner-1', 'test3', cb)

    expect(cb).toHaveBeenCalledWith({})
  })

  it('detaches the previous subscription before attaching a new one', () => {
    const unsub1 = vi.fn()
    onValueFn
      .mockReturnValueOnce(unsub1)
      .mockReturnValue(() => {})

    subscribeWorldPlayers('owner-1', 'test3', () => {})
    subscribeWorldPlayers('owner-2', 'test3', () => {})

    expect(unsub1).toHaveBeenCalled()
  })
})

describe('presence — updateSelf (throttle)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    _resetThrottleForTest()
    setFn.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes on the first call', () => {
    updateSelf('owner-1', 'test3', 'self-1', { x: 10, y: 20 })

    expect(setFn).toHaveBeenCalledTimes(1)
    expect(setFn).toHaveBeenCalledWith(
      { _path: 'worlds/owner-1/maps/test3/players/self-1' },
      { x: 10, y: 20 },
    )
  })

  it('ignores a second call within the throttle window', () => {
    updateSelf('owner-1', 'test3', 'self-1', { x: 10 })
    updateSelf('owner-1', 'test3', 'self-1', { x: 20 })  // too soon

    expect(setFn).toHaveBeenCalledTimes(1)
  })

  it('allows a write after the throttle interval elapses', async () => {
    updateSelf('owner-1', 'test3', 'self-1', { x: 10 })
    await vi.advanceTimersByTimeAsync(150)         // past 120ms window
    updateSelf('owner-1', 'test3', 'self-1', { x: 20 })

    expect(setFn).toHaveBeenCalledTimes(2)
  })

  it('throttles each (ownerUid, mapKey, selfUid) tuple independently', () => {
    updateSelf('owner-1', 'test3', 'self-1', { x: 10 })     // writes (first call for this tuple)
    updateSelf('owner-2', 'test3', 'self-1', { x: 10 })     // different owner — writes
    updateSelf('owner-1', 'test4', 'self-1', { x: 10 })     // different map — writes
    updateSelf('owner-1', 'test3', 'self-2', { x: 10 })     // different selfUid — writes
    updateSelf('owner-1', 'test3', 'self-1', { x: 20 })     // same tuple as first — throttled

    expect(setFn).toHaveBeenCalledTimes(4)
  })
})

describe('presence — updateSelf (idle / change-only)', () => {
  const still = { x: 10.2, y: 20.4, dir: 'down', moving: false, mbti: 'INTJ', name: 'A' }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    _resetThrottleForTest()
    setFn.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not rewrite an unchanged payload (sub-pixel float noise ignored)', async () => {
    updateSelf('o', 'm', 's', still)
    await vi.advanceTimersByTimeAsync(500)
    updateSelf('o', 'm', 's', { ...still, x: 10.3 })
    await vi.advanceTimersByTimeAsync(500)
    updateSelf('o', 'm', 's', still)

    expect(setFn).toHaveBeenCalledTimes(1)
  })

  it('sends one idle:true write after IDLE_AFTER_MS, then stays silent', async () => {
    updateSelf('o', 'm', 's', still)
    await vi.advanceTimersByTimeAsync(IDLE_AFTER_MS + 10)
    updateSelf('o', 'm', 's', still)
    updateSelf('o', 'm', 's', still)

    expect(setFn).toHaveBeenCalledTimes(2)
    expect(setFn.mock.calls[1][1]).toEqual({ ...still, idle: true })
  })

  it('clears idle by writing the new state without the idle flag', async () => {
    updateSelf('o', 'm', 's', still)
    await vi.advanceTimersByTimeAsync(IDLE_AFTER_MS + 10)
    updateSelf('o', 'm', 's', still)                       // idle write
    await vi.advanceTimersByTimeAsync(150)
    updateSelf('o', 'm', 's', { ...still, x: 50, moving: true })

    expect(setFn).toHaveBeenCalledTimes(3)
    expect(setFn.mock.calls[2][1]).not.toHaveProperty('idle')
  })

  it('a throttled change is retried on a later frame, not dropped', async () => {
    updateSelf('o', 'm', 's', still)
    updateSelf('o', 'm', 's', { ...still, x: 99 })        // within 120ms: dropped this frame
    expect(setFn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(150)
    updateSelf('o', 'm', 's', { ...still, x: 99 })        // next frame: goes through
    expect(setFn).toHaveBeenCalledTimes(2)
  })

  it('an AFK user costs <= 2 writes over 10 minutes at 60fps (was ~5000)', async () => {
    for (let ms = 0; ms < 10 * 60_000; ms += 16) {
      updateSelf('o', 'm', 's', still)
      await vi.advanceTimersByTimeAsync(16)
    }
    expect(setFn.mock.calls.length).toBeLessThanOrEqual(2)
  })
})
