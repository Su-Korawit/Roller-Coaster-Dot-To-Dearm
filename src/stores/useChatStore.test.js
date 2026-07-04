import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'me' } } }))
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
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
const { addDoc, updateDoc } = await import('firebase/firestore')

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
