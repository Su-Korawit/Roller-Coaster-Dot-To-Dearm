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
    chatStoreState.loadChats.mockReturnValue(vi.fn())
    socialStoreState.loadMyProfile.mockImplementation(() => new Promise(() => {}))
    chatStoreState.resolveParticipants.mockImplementation(() => Promise.resolve())
  })

  it('shows skeleton rows while chat list is loading', () => {
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
})
