// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let entitlementsState
const loadCatalog = vi.fn()
const purchase = vi.fn().mockResolvedValue({ ok: true })
vi.mock('../../stores/useEntitlementsStore', () => ({
  useEntitlementsStore: Object.assign((sel) => sel(entitlementsState), {
    getState: () => ({ ...entitlementsState, loadCatalog, purchase }),
  }),
}))

let userState
vi.mock('../../stores/useUserStore', () => ({
  useUserStore: (sel) => sel(userState),
}))

vi.mock('../ui/CoinIcon', () => ({ CoinIcon: () => <span data-testid="coin" /> }))

const { default: UnlockSection } = await import('./UnlockSection')

const CATALOG = [
  { id: 'ai-quota-plus', name: 'AI เพิ่ม 5 ครั้ง/วัน', description: 'สร้าง Roadmap ได้มากขึ้น', priceCoins: 99, kind: 'ai-quota' },
  { id: 'plan-slots-plus', name: 'ช่องแผนเพิ่ม 3 ช่อง', description: '', priceCoins: 49, kind: 'plan-slots' },
  { id: 'sticker-pack-1', name: 'สติกเกอร์พรีเมียม', description: '', priceCoins: 200, kind: 'sticker-pack' },
]

describe('UnlockSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userState = { coins: 100 }
    entitlementsState = {
      catalog: CATALOG,
      catalogLoading: false,
      entitlements: { 'plan-slots-plus': { kind: 'plan-slots' } },
    }
  })

  it('loads the catalog on mount and lists items with prices', () => {
    render(<UnlockSection />)
    expect(loadCatalog).toHaveBeenCalled()
    expect(screen.getByText('AI เพิ่ม 5 ครั้ง/วัน')).toBeTruthy()
    expect(screen.getAllByTestId('unlock-item')).toHaveLength(3)
  })

  it('marks an owned item and hides its buy button', () => {
    render(<UnlockSection />)
    const owned = screen.getByText('ช่องแผนเพิ่ม 3 ช่อง').closest('[data-testid="unlock-item"]')
    expect(owned.textContent).toContain('เป็นเจ้าของแล้ว')
    expect(owned.querySelector('button')).toBeNull()
  })

  it('buys an affordable item through the store purchase action', () => {
    render(<UnlockSection />)
    const row = screen.getByText('AI เพิ่ม 5 ครั้ง/วัน').closest('[data-testid="unlock-item"]')
    fireEvent.click(row.querySelector('button'))
    expect(purchase).toHaveBeenCalledWith('ai-quota-plus')
  })

  it('disables the buy button when coins are insufficient', () => {
    render(<UnlockSection />)
    const row = screen.getByText('สติกเกอร์พรีเมียม').closest('[data-testid="unlock-item"]')
    const btn = row.querySelector('button')
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toContain('เหรียญไม่พอ')
  })

  it('renders nothing when the catalog is empty', () => {
    entitlementsState = { catalog: [], catalogLoading: false, entitlements: {} }
    const { container } = render(<UnlockSection />)
    expect(container.firstChild).toBeNull()
  })
})
