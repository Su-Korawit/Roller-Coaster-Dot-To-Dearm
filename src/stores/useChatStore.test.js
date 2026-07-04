import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'me' } } }))
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  increment: (n) => ({ _increment: n }),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
  collection: vi.fn((_, ...path) => ({ _col: path.join('/') })),
  doc: vi.fn((_, ...path) => ({ _path: path.join('/') })),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}))

const { useChatStore } = await import('./useChatStore')
const { useUserStore } = await import('./useUserStore')
const { addDoc, getDoc, updateDoc } = await import('firebase/firestore')

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(useUserStore.getState(), 'incrementStacks').mockImplementation(() => {})
})

describe('sendNewsShare', () => {
  it('writes a news-type message and always grants a fireStack', async () => {
    await useChatStore.getState().sendNewsShare('chat-1', { title: 'Big News', url: 'https://x', poster: 'https://p' })

    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _col: 'chats/chat-1/messages' }),
      expect.objectContaining({
        senderId: 'me',
        type: 'news',
        newsItem: { title: 'Big News', url: 'https://x', thumbnail: 'https://p' },
      }),
    )
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'chats/chat-1' }),
      expect.objectContaining({ fireStacks: { _increment: 1 } }),
    )
    expect(useUserStore.getState().incrementStacks).toHaveBeenCalled()
  })

  it('does nothing when signed out', async () => {
    // The already-imported useChatStore module closed over the original
    // mocked `auth` object, so reassigning it here wouldn't be visible to
    // that module. Reset the module registry and re-import fresh so the
    // new '../firebase' mock (signed-out) is actually picked up.
    vi.resetModules()
    vi.doMock('../firebase', () => ({ db: {}, auth: { currentUser: null } }))
    const { useChatStore: freshChatStore } = await import('./useChatStore')
    const { addDoc: freshAddDoc } = await import('firebase/firestore')

    await freshChatStore.getState().sendNewsShare('chat-1', { title: 'x' })
    expect(freshAddDoc).not.toHaveBeenCalled()
  })
})

describe('resolveParticipants', () => {
  it('fetches only uncached uids and merges them into participants', async () => {
    useChatStore.setState({ participants: { 'already-cached': { displayName: 'Cached' } } })
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ displayName: 'Alice' }) })
    await useChatStore.getState().resolveParticipants(['already-cached', 'uid-2'])
    expect(getDoc).toHaveBeenCalledTimes(1)
    expect(useChatStore.getState().participants).toEqual({
      'already-cached': { displayName: 'Cached' },
      'uid-2': { displayName: 'Alice' },
    })
  })

  it('skips a uid whose doc does not exist', async () => {
    useChatStore.setState({ participants: {} })
    getDoc.mockResolvedValueOnce({ exists: () => false })
    await useChatStore.getState().resolveParticipants(['missing-uid'])
    expect(useChatStore.getState().participants).toEqual({})
  })
})

describe('getOrFetchParticipant', () => {
  it('returns the cached value without fetching', async () => {
    useChatStore.setState({ participants: { 'uid-1': { displayName: 'Cached' } } })
    const result = await useChatStore.getState().getOrFetchParticipant('uid-1')
    expect(getDoc).not.toHaveBeenCalled()
    expect(result).toEqual({ displayName: 'Cached' })
  })

  it('fetches, caches, and returns a fresh value', async () => {
    useChatStore.setState({ participants: {} })
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ displayName: 'Bob' }) })
    const result = await useChatStore.getState().getOrFetchParticipant('uid-2')
    expect(result).toEqual({ displayName: 'Bob' })
    expect(useChatStore.getState().participants['uid-2']).toEqual({ displayName: 'Bob' })
  })

  it('returns an Unknown-user fallback for a missing doc', async () => {
    useChatStore.setState({ participants: {} })
    getDoc.mockResolvedValueOnce({ exists: () => false })
    const result = await useChatStore.getState().getOrFetchParticipant('uid-3')
    expect(result).toEqual({ uid: 'uid-3', displayName: 'Unknown', photoURL: null })
  })
})
