import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  hydrateLeaves: vi.fn(),
  hydrateRoom: vi.fn(),
  loadHistory: vi.fn(),
  claim: vi.fn(),
  welcomePack: null,
}))

vi.mock('../stores/useLeavesStore', () => ({
  useLeavesStore: { getState: () => ({ hydrate: (...a) => m.hydrateLeaves(...a), welcomePack: m.welcomePack }) },
}))
vi.mock('../stores/useRoomStore', () => ({
  useRoomStore: { getState: () => ({ hydrate: (...a) => m.hydrateRoom(...a) }) },
}))
vi.mock('../stores/useFocusHistoryStore', () => ({
  useFocusHistoryStore: { getState: () => ({ load: (...a) => m.loadHistory(...a) }) },
}))
vi.mock('./roomApi', () => ({ claimWelcomePack: (...a) => m.claim(...a) }))

const { bootstrapStudyRoom } = await import('./studyRoomBootstrap')

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  m.hydrateLeaves.mockResolvedValue(undefined)
  m.hydrateRoom.mockResolvedValue(undefined)
  m.loadHistory.mockResolvedValue(undefined)
  m.claim.mockResolvedValue({ ok: true, already: false })
  m.welcomePack = null
})

describe('bootstrapStudyRoom', () => {
  it('claims the welcome pack once when it is missing, then reloads the balance and the room', async () => {
    await bootstrapStudyRoom('u1')
    expect(m.claim).toHaveBeenCalledTimes(1)
    expect(m.hydrateLeaves).toHaveBeenCalledTimes(2)
    expect(m.hydrateRoom).toHaveBeenCalledWith('u1')
    expect(m.claim.mock.invocationCallOrder[0]).toBeLessThan(m.hydrateRoom.mock.invocationCallOrder[0])
  })

  it('does not claim again when the pack was already granted', async () => {
    m.welcomePack = 'v2'
    await bootstrapStudyRoom('u1')
    expect(m.claim).not.toHaveBeenCalled()
    expect(m.hydrateLeaves).toHaveBeenCalledTimes(1)
    expect(m.hydrateRoom).toHaveBeenCalledWith('u1')
  })

  it('still loads the room when the claim fails', async () => {
    m.claim.mockRejectedValue(new Error('offline'))
    await bootstrapStudyRoom('u1')
    expect(m.hydrateRoom).toHaveBeenCalledWith('u1')
  })

  it('still loads the room when the balance cannot be read', async () => {
    m.hydrateLeaves.mockRejectedValue(new Error('denied'))
    await bootstrapStudyRoom('u1')
    expect(m.hydrateRoom).toHaveBeenCalledWith('u1')
  })

  it('loads the finished sessions for the trophy shelf, and a failure there changes nothing else', async () => {
    m.loadHistory.mockRejectedValue(new Error('offline'))
    await bootstrapStudyRoom('u1')
    expect(m.loadHistory).toHaveBeenCalledWith('u1')
    expect(m.hydrateRoom).toHaveBeenCalledWith('u1')
  })
})
