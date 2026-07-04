// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

let authState

const chatStoreState = {
  chats: [],
  participants: {},
  loadChats: vi.fn(() => vi.fn()),
  openChat: vi.fn(),
  resolveParticipants: vi.fn(() => Promise.resolve()),
  getOrFetchParticipant: vi.fn(),
}

const socialStoreState = {
  following: [],
  followers: [],
  loadMyProfile: vi.fn(() => Promise.resolve()),
}

vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

vi.mock('../stores/useChatStore', () => ({
  useChatStore: Object.assign(
    (sel) => sel(chatStoreState),
    { getState: () => chatStoreState },
  ),
  buildChatId: (a, b) => `${a}_${b}`,
}))

vi.mock('../stores/useSocialStore', () => ({
  useSocialStore: (sel) => sel(socialStoreState),
}))

vi.mock('../stores/useUserStore', () => ({
  useUserStore: (sel) => sel({ coins: 0 }),
}))

vi.mock('./shop/ShopChatView', () => ({
  default: () => null,
}))

vi.mock('../lib/syncManager', () => ({
  visitMap: vi.fn(),
}))

const { default: ChatPanel } = await import('./ChatPanel')

describe('ChatPanel list loading', () => {
  beforeEach(() => {
    authState = { user: { uid: 'regular-user' } }
    chatStoreState.chats = []
    chatStoreState.participants = {}
    socialStoreState.following = []
    socialStoreState.followers = []
    chatStoreState.loadChats.mockImplementation((_uid, onInitialSnapshot) => {
      onInitialSnapshot?.()
      return vi.fn()
    })
    socialStoreState.loadMyProfile.mockImplementation(() => new Promise(() => {}))
    chatStoreState.resolveParticipants.mockImplementation(() => Promise.resolve())
  })

  it('shows skeleton rows while chat list is loading', () => {
    chatStoreState.loadChats.mockImplementation(() => vi.fn())
    render(<ChatPanel onClose={vi.fn()} />)
    expect(screen.getAllByTestId('chat-list-skeleton')).toHaveLength(3)
    expect(screen.queryByText('ยังไม่มีเพื่อนที่ติดตามกัน')).toBeFalsy()
  })

  it('shows empty mutual-friends copy after load completes with no friends', async () => {
    socialStoreState.loadMyProfile.mockImplementation(() => Promise.resolve())
    render(<ChatPanel onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.queryByTestId('chat-list-skeleton')).toBeFalsy()
    })
    expect(screen.getByText('ยังไม่มีเพื่อนที่ติดตามกัน')).toBeTruthy()
  })

  it('shows only skeleton rows while loading, not cached chat rows', () => {
    chatStoreState.chats = [{
      id: 'chat-1',
      members: ['regular-user', 'friend-1'],
      lastMessage: 'สวัสดี',
    }]
    chatStoreState.loadChats.mockImplementation(() => vi.fn())
    socialStoreState.following = ['friend-1']
    socialStoreState.followers = ['friend-1']
    chatStoreState.participants = {
      'friend-1': { uid: 'friend-1', displayName: 'Cached Friend' },
    }

    render(<ChatPanel onClose={vi.fn()} />)

    expect(screen.getAllByTestId('chat-list-skeleton')).toHaveLength(3)
    expect(screen.queryByText('Cached Friend')).toBeFalsy()
    expect(screen.queryByText('สวัสดี')).toBeFalsy()
  })
})
