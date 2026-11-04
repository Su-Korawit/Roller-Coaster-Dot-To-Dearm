// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({ buyRoomItem: vi.fn(), saveRoomLayout: vi.fn() }))
vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), getDocs: vi.fn() }))
vi.mock('../../lib/db', () => ({ refs: {}, cols: {}, shapes: {} }))
vi.mock('../../services/roomApi', () => ({
  buyRoomItem: (...a) => m.buyRoomItem(...a),
  saveRoomLayout: (...a) => m.saveRoomLayout(...a),
  claimWelcomePack: vi.fn(),
  saveAvatar: vi.fn(),
}))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: ShopSheet } = await import('./ShopSheet')
const { useLeavesStore } = await import('../../stores/useLeavesStore')
const { useRoomStore, roomSync } = await import('../../stores/useRoomStore')
const { useFxStore } = await import('../../stores/useFxStore')
const { useRoomUiStore } = await import('../../stores/useRoomUiStore')
const { ROOM_CATALOG } = await import('../../data/roomCatalogSeed')
const { STARTER_LAYOUT } = await import('../../room/defaultLayout')

const base = { desk_basic: 1, chair_basic: 1, bed_basic: 1, bookshelf_basic: 1, lamp_desk: 1, plant_small: 1, rug_round: 1, theme_minimal: 1 }
const own = (extra = {}, leaves = 5000) => useLeavesStore.setState({ leaves, inventory: { ...base, ...extra }, welcomePack: 'v2', loaded: true })
const tab = (name) => fireEvent.click(screen.getByRole('tab', { name }))
const card = (name) => screen.getByText(name).closest('li')
const inCard = (name, label) => [...card(name).querySelectorAll('button')].find((b) => b.textContent.trim() === label)
const toasts = () => useFxStore.getState().toasts.map((t) => t.text)

beforeEach(() => {
  roomSync.cancel()
  vi.clearAllMocks()
  useFxStore.setState({ toasts: [] })
  useRoomUiStore.setState({ sheet: 'shop', payload: null })
  useRoomStore.setState({ layout: STARTER_LAYOUT, catalog: ROOM_CATALOG, decorating: false, lastError: null })
  own()
  render(<ShopSheet onClose={() => {}} />)
})

describe('ShopSheet part 2', () => {
  it('has the room, theme, pet and character tabs next to the furniture ones', () => {
    for (const name of ['เฟอร์นิเจอร์', 'ของตกแต่ง', 'ห้อง', 'ธีม', 'สัตว์เลี้ยง', 'ตัวละคร']) expect(screen.getByRole('tab', { name })).toBeTruthy()
  })

  it('a tier cannot be bought before the one below it, and says which one is missing', () => {
    tab('ห้อง')
    const btn = [...card('ระเบียงริมทะเลสาบ').querySelectorAll('button')][0]
    expect(btn.disabled).toBe(true)
    expect(card('ระเบียงริมทะเลสาบ').textContent).toContain('ต้องซื้อ ห้องใหญ่ขึ้น ก่อน')
    expect(inCard('ห้องใหญ่ขึ้น', 'ซื้อ').disabled).toBe(false)
  })

  it('an owned tier can be applied; the tier in use is marked and cannot be applied again', () => {
    own({ tier_1: 1 })
    tab('ห้อง')
    fireEvent.click(inCard('ห้องใหญ่ขึ้น', 'ใช้ขั้นนี้'))
    expect(useRoomStore.getState().layout.tier).toBe(1)
    expect(inCard('ห้องใหญ่ขึ้น', 'ใช้อยู่').disabled).toBe(true)
  })

  it('going back to a smaller room with furniture outside it is refused with a reason', () => {
    own({ tier_1: 1, chair_basic: 2 })
    useRoomStore.getState().setTier(1)
    useRoomStore.getState().place('chair_basic', 176, 32)
    tab('ห้อง')
    fireEvent.click(screen.getByRole('button', { name: 'ใช้ห้องเริ่มต้น' }))
    expect(useRoomStore.getState().layout.tier).toBe(1)
    expect(toasts()).toContain('ย้ายของที่อยู่นอกห้องขั้นนี้ออกก่อน')
  })

  it('applies an owned theme and marks the one in use', () => {
    own({ theme_cafe: 1 })
    tab('ธีม')
    fireEvent.click(inCard('ธีมคาเฟ่', 'ใช้ธีมนี้'))
    expect(useRoomStore.getState().layout.theme).toBe('cafe')
    expect(inCard('ธีมคาเฟ่', 'ใช้อยู่').disabled).toBe(true)
    expect(inCard('ธีมมินิมอล', 'ใช้ธีมนี้')).toBeTruthy()
  })

  it('a theme that is not owned is bought, not applied', async () => {
    m.buyRoomItem.mockResolvedValue({ leaves: 3500, owned: 1 })
    tab('ธีม')
    fireEvent.click(inCard('ธีมคาเฟ่', 'ซื้อ'))
    await waitFor(() => expect(m.buyRoomItem).toHaveBeenCalledWith('theme_cafe'))
    expect(useRoomStore.getState().layout.theme).toBe('minimal')
  })

  it('chooses an owned pet, and "ไม่มีสัตว์เลี้ยง" puts it away', () => {
    own({ pet_shiba: 1 })
    tab('สัตว์เลี้ยง')
    fireEvent.click(inCard('ชิบะ', 'เลือก'))
    expect(useRoomStore.getState().layout.petId).toBe('pet_shiba')
    expect(inCard('ชิบะ', 'อยู่กับคุณ').disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'ไม่มีสัตว์เลี้ยง' }))
    expect(useRoomStore.getState().layout.petId).toBeNull()
  })

  it('buys an accessory and points the owner of one to the wardrobe', async () => {
    m.buyRoomItem.mockResolvedValue({ leaves: 4750, owned: 1 })
    tab('ตัวละคร')
    fireEvent.click(inCard('หมวกแก๊ป', 'ซื้อ'))
    await waitFor(() => expect(m.buyRoomItem).toHaveBeenCalledWith('acc_cap'))
    await waitFor(() => expect(inCard('หมวกแก๊ป', 'มีแล้ว')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'เปิดตู้เสื้อผ้า' }))
    expect(useRoomUiStore.getState().sheet).toBe('wardrobe')
  })

  it('explains a server refusal for a tier bought out of order', async () => {
    const err = Object.assign(new Error('x'), { code: 'functions/failed-precondition', details: { reason: 'REQUIRES_MISSING', requires: 'tier_1' } })
    m.buyRoomItem.mockRejectedValue(err)
    own({}, 9000)
    tab('ห้อง')
    fireEvent.click(inCard('ห้องใหญ่ขึ้น', 'ซื้อ'))
    await waitFor(() => expect(toasts()).toContain('ต้องซื้อห้องขั้นก่อนหน้าก่อน'))
  })
})
