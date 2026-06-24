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

const { joinWorld, leaveWorld, subscribeWorldPlayers, updateSelf, detachWorldPlayers, _resetThrottleForTest } =
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
})
