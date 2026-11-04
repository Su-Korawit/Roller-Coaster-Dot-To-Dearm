// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({ saveAvatar: vi.fn() }))
vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), getDocs: vi.fn() }))
vi.mock('../../lib/db', () => ({ refs: {}, cols: {}, shapes: {} }))
vi.mock('../../services/roomApi', () => ({ saveAvatar: (...a) => m.saveAvatar(...a), buyRoomItem: vi.fn(), saveRoomLayout: vi.fn(), claimWelcomePack: vi.fn() }))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: WardrobeSheet } = await import('./WardrobeSheet')
const { useLeavesStore } = await import('../../stores/useLeavesStore')
const { useRoomStore } = await import('../../stores/useRoomStore')
const { useFxStore } = await import('../../stores/useFxStore')
const { useRoomUiStore } = await import('../../stores/useRoomUiStore')
const { ROOM_CATALOG } = await import('../../data/roomCatalogSeed')

const own = (inv = {}, avatar = { accessories: {}, outfitHue: null }) => useLeavesStore.setState({ inventory: inv, avatar, loaded: true })

beforeEach(() => {
  vi.clearAllMocks()
  m.saveAvatar.mockResolvedValue({ ok: true })
  useFxStore.setState({ toasts: [] })
  useRoomStore.setState({ catalog: ROOM_CATALOG })
  own({ acc_cap: 1, acc_scarf: 1 })
})

describe('WardrobeSheet', () => {
  it('lists the four slots, with owned accessories as options and a "none" option', () => {
    render(<WardrobeSheet onClose={() => {}} />)
    for (const slot of ['หัว', 'ใบหน้า', 'คอ', 'หลัง']) expect(screen.getByRole('group', { name: slot })).toBeTruthy()
    const head = screen.getByRole('group', { name: 'หัว' })
    expect(head.querySelector('button[aria-label="หมวกแก๊ป"]')).toBeTruthy()
    expect(head.querySelector('button[aria-label="ริบบิ้นผม"]')).toBeNull() // not owned: not offered
    expect(head.querySelector('button[aria-label="ไม่ใส่"]')).toBeTruthy()
  })

  it('wearing an accessory saves the avatar through the server and updates the store', async () => {
    render(<WardrobeSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'หมวกแก๊ป' }))
    await waitFor(() => expect(m.saveAvatar).toHaveBeenCalledWith({ accessories: { head: 'acc_cap' }, outfitHue: null }))
    await waitFor(() => expect(useLeavesStore.getState().avatar.accessories.head).toBe('acc_cap'))
  })

  it('taking it off saves the slot as empty', async () => {
    own({ acc_cap: 1 }, { accessories: { head: 'acc_cap' }, outfitHue: 30 })
    render(<WardrobeSheet onClose={() => {}} />)
    const head = screen.getByRole('group', { name: 'หัว' })
    fireEvent.click(head.querySelector('button[aria-label="ไม่ใส่"]'))
    await waitFor(() => expect(m.saveAvatar).toHaveBeenCalledWith({ accessories: {}, outfitHue: 30 }))
  })

  it('the hue slider saves an integer 0-359, and "สีเดิม" clears it', async () => {
    render(<WardrobeSheet onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('สีเสื้อผ้า'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกสี' }))
    await waitFor(() => expect(m.saveAvatar).toHaveBeenCalledWith({ accessories: {}, outfitHue: 120 }))
    fireEvent.click(screen.getByRole('button', { name: 'สีเดิม' }))
    await waitFor(() => expect(m.saveAvatar).toHaveBeenLastCalledWith({ accessories: {}, outfitHue: null }))
  })

  it('a server refusal keeps the old avatar and says so', async () => {
    m.saveAvatar.mockRejectedValue(Object.assign(new Error('x'), { code: 'functions/invalid-argument' }))
    render(<WardrobeSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'หมวกแก๊ป' }))
    await waitFor(() => expect(useFxStore.getState().toasts.map((t) => t.text)).toContain('บันทึกตัวละครไม่สำเร็จ ลองใหม่อีกครั้ง'))
    expect(useLeavesStore.getState().avatar.accessories.head).toBeUndefined()
  })

  it('points to the shop when nothing is owned, and opens it', () => {
    own({})
    render(<WardrobeSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'ไปร้านค้า' }))
    expect(useRoomUiStore.getState().sheet).toBe('shop')
  })
})
