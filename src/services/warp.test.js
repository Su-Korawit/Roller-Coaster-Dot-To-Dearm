import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  switching: false,
  enterSchoolHub: vi.fn(),
  returnHome: vi.fn(),
  requestMapChange: vi.fn(),
  setLeft: vi.fn(),
  markSwitching: vi.fn(),
  inHub: false,
  uid: 'u1',
  resume: { last: 'room', points: { room: { x: 40, y: 50, facing: 'down', label: 'ที่โต๊ะ', at: 5 } } },
}))

vi.mock('./schoolWorld', () => ({ enterSchoolHub: (...a) => m.enterSchoolHub(...a) }))
vi.mock('../lib/syncManager', () => ({ returnHome: (...a) => m.returnHome(...a) }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: m.uid ? { uid: m.uid } : null }) } }))
vi.mock('../stores/useResumeStore', () => ({ useResumeStore: { getState: () => m.resume } }))
vi.mock('../stores/useSchoolWorldStore', () => ({
  useSchoolWorldStore: { getState: () => ({ inHub: m.inHub, setLeft: m.setLeft, requestMapChange: m.requestMapChange, isMapSwitching: () => m.switching, markMapSwitching: m.markSwitching }) },
}))

const { warpTo } = await import('./warp')
const { useVisitStore } = await import('../stores/useVisitStore')

beforeEach(() => {
  vi.clearAllMocks()
  m.inHub = false
  m.switching = false
  m.uid = 'u1'
  m.returnHome.mockResolvedValue(undefined)
})

describe('warpTo', () => {
  it('goes to the room at the stored point when resuming', async () => {
    expect(await warpTo('room', { resume: true })).toEqual({ ok: true })
    expect(m.returnHome).toHaveBeenCalledWith('u1', 'room')
    expect(m.requestMapChange).toHaveBeenCalledWith('room', { spawnAt: { x: 40, y: 50 } })
  })

  it('warping home from a friend’s room ends the visit, so the scene draws the student’s own room', async () => {
    useVisitStore.getState().begin({ ownerUid: 'f1', layout: { tier: 0, theme: 'minimal', petId: null, placed: [] } })
    await warpTo('room', { resume: false })
    expect(useVisitStore.getState().visiting).toBeNull()
    useVisitStore.getState().begin({ ownerUid: 'f1', layout: { tier: 0, theme: 'minimal', petId: null, placed: [] } })
    await warpTo('campus')
    expect(useVisitStore.getState().visiting).toBeNull()
  })

  it('a refused warp (busy) keeps the visit', async () => {
    m.switching = true
    useVisitStore.getState().begin({ ownerUid: 'f1', layout: { tier: 0, theme: 'minimal', petId: null, placed: [] } })
    await warpTo('room')
    expect(useVisitStore.getState().visiting).not.toBeNull()
    useVisitStore.getState().end()
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

describe('warpTo while a map is still loading', () => {
  it('refuses a second warp instead of leaving the world state out of step with the scene', async () => {
    m.switching = true
    expect(await warpTo('room', { resume: true })).toEqual({ ok: false, error: 'BUSY' })
    expect(await warpTo('hub', { resume: true })).toEqual({ ok: false, error: 'BUSY' })
    expect(m.returnHome).not.toHaveBeenCalled()
    expect(m.requestMapChange).not.toHaveBeenCalled()
    expect(m.enterSchoolHub).not.toHaveBeenCalled()
  })

  it('marks the switch as started when it asks the game to change maps', async () => {
    await warpTo('room', { resume: true })
    expect(m.markSwitching).toHaveBeenCalled()
  })
})

describe('warpTo guide events', () => {
  it('emits "warped" after a successful map warp and after entering the hub, but not after a failure', async () => {
    const { onGuideEvent } = await import('../lib/guideEvents')
    const seen = []
    const off = onGuideEvent((e) => seen.push(e))
    await warpTo('room', { resume: true })
    m.enterSchoolHub.mockResolvedValue({ ok: true })
    await warpTo('hub', { resume: true })
    m.enterSchoolHub.mockResolvedValue({ ok: false, error: 'NO_SCHOOL' })
    await warpTo('hub', { resume: true })
    off()
    expect(seen).toEqual(['warped', 'warped'])
  })
})
