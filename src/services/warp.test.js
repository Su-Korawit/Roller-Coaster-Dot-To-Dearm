import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  enterSchoolHub: vi.fn(),
  returnHome: vi.fn(),
  requestMapChange: vi.fn(),
  setLeft: vi.fn(),
  inHub: false,
  uid: 'u1',
  resume: { last: 'room', points: { room: { x: 40, y: 50, facing: 'down', label: 'ที่โต๊ะ', at: 5 } } },
}))

vi.mock('./schoolWorld', () => ({ enterSchoolHub: (...a) => m.enterSchoolHub(...a) }))
vi.mock('../lib/syncManager', () => ({ returnHome: (...a) => m.returnHome(...a) }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: m.uid ? { uid: m.uid } : null }) } }))
vi.mock('../stores/useResumeStore', () => ({ useResumeStore: { getState: () => m.resume } }))
vi.mock('../stores/useSchoolWorldStore', () => ({
  useSchoolWorldStore: { getState: () => ({ inHub: m.inHub, setLeft: m.setLeft, requestMapChange: m.requestMapChange }) },
}))

const { warpTo } = await import('./warp')

beforeEach(() => {
  vi.clearAllMocks()
  m.inHub = false
  m.uid = 'u1'
  m.returnHome.mockResolvedValue(undefined)
})

describe('warpTo', () => {
  it('goes to the room at the stored point when resuming', async () => {
    expect(await warpTo('room', { resume: true })).toEqual({ ok: true })
    expect(m.returnHome).toHaveBeenCalledWith('u1', 'room')
    expect(m.requestMapChange).toHaveBeenCalledWith('room', { spawnAt: { x: 40, y: 50 } })
  })

  it('goes to the map spawn when not resuming', async () => {
    await warpTo('room', { resume: false })
    expect(m.requestMapChange).toHaveBeenCalledWith('room', { spawnAt: null })
  })

  it('has no point for a map never visited', async () => {
    await warpTo('campus', { resume: true })
    expect(m.requestMapChange).toHaveBeenCalledWith('campus', { spawnAt: null })
  })

  it('leaves the school hub state when warping out of it', async () => {
    m.inHub = true
    await warpTo('room', { resume: true })
    expect(m.setLeft).toHaveBeenCalled()
  })

  it('works for a guest in the room (no account to flip)', async () => {
    m.uid = null
    expect(await warpTo('room', { resume: false })).toEqual({ ok: true })
    expect(m.requestMapChange).toHaveBeenCalled()
  })

  it('the hub delegates to enterSchoolHub and returns its error', async () => {
    m.enterSchoolHub.mockResolvedValue({ ok: false, error: 'NO_SCHOOL' })
    expect(await warpTo('hub', { resume: true })).toEqual({ ok: false, error: 'NO_SCHOOL' })
    expect(m.enterSchoolHub).toHaveBeenCalledWith('u1')
    expect(m.requestMapChange).not.toHaveBeenCalled()
  })

  it('the hub needs an account', async () => {
    m.uid = null
    expect(await warpTo('hub', { resume: true })).toEqual({ ok: false, error: 'FAILED' })
  })

  it('an unknown place fails without touching the game', async () => {
    expect(await warpTo('mars', { resume: true })).toEqual({ ok: false, error: 'FAILED' })
    expect(m.requestMapChange).not.toHaveBeenCalled()
  })
})
