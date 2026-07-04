// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let authState
let shopState
let shopChatState
const sendShopChat = vi.fn()

vi.mock('../../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(authState) }))
vi.mock('../../stores/useShopStore', () => ({
  useShopStore: Object.assign((sel) => sel(shopState), { getState: () => shopState }),
}))
vi.mock('../../stores/useShopChatStore', () => ({ useShopChatStore: (sel) => sel(shopChatState) }))
vi.mock('../../services/shopAi', () => ({ sendShopChat: (...args) => sendShopChat(...args) }))
vi.mock('../../constants/shopPrompt', () => ({ buildShopSystemPrompt: () => 'system-prompt' }))
vi.mock('./ProductCard', () => ({ default: () => null }))
vi.mock('./PaymentCard', () => ({ default: () => null }))

const { default: ShopChatView } = await import('./ShopChatView')

function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
}

describe('ShopChatView composer', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    authState = { user: { uid: 'u1' } }
    shopState = { products: [], loadProducts: vi.fn(), loadPurchases: vi.fn(), createPurchase: vi.fn() }
    shopChatState = {
      messages: [{ id: 'm1', type: 'text', role: 'ai', text: 'สวัสดี' }],
      addText: vi.fn(),
      addPaymentCard: vi.fn(),
      addSystemMessage: vi.fn(),
    }
    sendShopChat.mockReset().mockResolvedValue('ตอบกลับ')
    setViewportWidth(1024)
  })

  afterEach(() => setViewportWidth(1024))

  it('desktop: Enter sends the message', () => {
    render(<ShopChatView onBack={() => {}} />)
    const textarea = screen.getByPlaceholderText('พิมพ์ข้อความ...')
    fireEvent.change(textarea, { target: { value: 'สวัสดีครับ' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(sendShopChat).toHaveBeenCalledTimes(1)
  })

  it('desktop: Shift+Enter does not send', () => {
    render(<ShopChatView onBack={() => {}} />)
    const textarea = screen.getByPlaceholderText('พิมพ์ข้อความ...')
    fireEvent.change(textarea, { target: { value: 'บรรทัดแรก' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(sendShopChat).not.toHaveBeenCalled()
  })

  it('mobile: Enter does not send, only the send button does', () => {
    setViewportWidth(375)
    render(<ShopChatView onBack={() => {}} />)
    const textarea = screen.getByPlaceholderText('พิมพ์ข้อความ...')
    fireEvent.change(textarea, { target: { value: 'ทักทาย' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(sendShopChat).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'ส่ง' }))
    expect(sendShopChat).toHaveBeenCalledTimes(1)
  })
})
