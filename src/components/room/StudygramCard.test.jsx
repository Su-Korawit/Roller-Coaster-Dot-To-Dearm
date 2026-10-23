// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({ renderCard: vi.fn(), shareImage: vi.fn() }))
vi.mock('../../lib/renderCard', () => ({ renderCard: (...a) => m.renderCard(...a) }))
vi.mock('../../lib/shareImage', () => ({ shareImage: (...a) => m.shareImage(...a) }))
vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), getDocs: vi.fn() }))
vi.mock('../../lib/db', () => ({ refs: {}, cols: {}, shapes: {} }))
vi.mock('../../services/roomApi', () => ({ saveRoomLayout: vi.fn(), buyRoomItem: vi.fn(), claimWelcomePack: vi.fn(), saveAvatar: vi.fn() }))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: StudygramCard } = await import('./StudygramCard')
const { useLeavesStore } = await import('../../stores/useLeavesStore')
const { useRoomStore } = await import('../../stores/useRoomStore')
const { usePlansStore } = await import('../../stores/usePlansStore')
const { useUserStore } = await import('../../stores/useUserStore')
const { useFxStore } = await import('../../stores/useFxStore')
const { ROOM_CATALOG } = await import('../../data/roomCatalogSeed')
const { STARTER_LAYOUT } = await import('../../room/defaultLayout')

const session = { tree: 'tree', withered: false, mode: 'strict', verifiedMs: 85 * 60000, plannedMin: 90, endedAt: new Date(2026, 9, 24, 14).getTime() }

beforeEach(() => {
  vi.clearAllMocks()
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview')
  globalThis.URL.revokeObjectURL = vi.fn()
  m.renderCard.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  m.shareImage.mockResolvedValue('shared')
  useFxStore.setState({ toasts: [] })
  useLeavesStore.setState({ inventory: { desk_basic: 1, lamp_desk: 1 }, loaded: true })
  useRoomStore.setState({ layout: STARTER_LAYOUT, catalog: ROOM_CATALOG })
  usePlansStore.getState().resetPlans()
  useUserStore.setState({ streak: 14 })
})

describe('StudygramCard', () => {
  it('renders a preview from the finished session', async () => {
    render(<StudygramCard session={session} onClose={() => {}} />)
    expect(await screen.findByRole('img', { name: 'ตัวอย่างการ์ด' })).toBeTruthy()
    const input = m.renderCard.mock.calls[0][0]
    const text = Object.fromEntries(input.layers.filter((l) => l.kind === 'text').map((l) => [l.id, l.text]))
    expect(text.duration).toBe('1:25')
    expect(text.tag).toBe('day 14, ilovetcas.com')
    expect(input.layers.some((l) => l.kind === 'phone')).toBe(true) // strict
    expect(text.goal).toBeUndefined()
    expect(text.streak).toBeUndefined()
  })

  it('the goal and streak lines are opt-in and re-render the card', async () => {
    usePlansStore.getState().addFromProgram({ universityId: 'u1', universityName: 'จุฬาฯ', programId: 'p1', programName: 'แพทยศาสตร์', round: 1, projectName: null, minGpax: null, scores: [] })
    render(<StudygramCard session={session} onClose={() => {}} />)
    await screen.findByRole('img', { name: 'ตัวอย่างการ์ด' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'แสดงคณะที่ตั้งเป้า' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'แสดงจำนวนวันติดต่อกัน' }))
    await waitFor(() => expect(m.renderCard.mock.calls.length).toBeGreaterThanOrEqual(2))
    const last = m.renderCard.mock.calls.at(-1)[0]
    const text = Object.fromEntries(last.layers.filter((l) => l.kind === 'text').map((l) => [l.id, l.text]))
    expect(text.goal).toBe('แพทยศาสตร์ จุฬาฯ')
    expect(text.streak).toBe('ติดต่อกัน 14 วัน')
  })

  it('shares the image and says so; a double tap shares once', async () => {
    let finish
    m.shareImage.mockReturnValue(new Promise((r) => { finish = r }))
    render(<StudygramCard session={session} onClose={() => {}} />)
    await screen.findByRole('img', { name: 'ตัวอย่างการ์ด' })
    const btn = screen.getByRole('button', { name: 'แชร์' })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(m.shareImage).toHaveBeenCalledTimes(1)
    finish('shared')
    await waitFor(() => expect(useFxStore.getState().toasts.map((t) => t.text)).toContain('แชร์การ์ดแล้ว'))
  })

  it('saves the image without opening the share sheet', async () => {
    m.shareImage.mockResolvedValue('downloaded')
    render(<StudygramCard session={session} onClose={() => {}} />)
    await screen.findByRole('img', { name: 'ตัวอย่างการ์ด' })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกรูป' }))
    await waitFor(() => expect(m.shareImage).toHaveBeenCalled())
    expect(m.shareImage.mock.calls[0][2]).toMatchObject({ saveOnly: true })
    await waitFor(() => expect(useFxStore.getState().toasts.map((t) => t.text)).toContain('บันทึกรูปแล้ว'))
  })

  it('a cancelled share is silent', async () => {
    m.shareImage.mockResolvedValue('cancelled')
    render(<StudygramCard session={session} onClose={() => {}} />)
    await screen.findByRole('img', { name: 'ตัวอย่างการ์ด' })
    fireEvent.click(screen.getByRole('button', { name: 'แชร์' }))
    await waitFor(() => expect(m.shareImage).toHaveBeenCalled())
    expect(useFxStore.getState().toasts).toHaveLength(0)
  })

  it('says so when the card cannot be drawn, and offers a retry', async () => {
    m.renderCard.mockRejectedValueOnce(new Error('no canvas'))
    render(<StudygramCard session={session} onClose={() => {}} />)
    expect(await screen.findByText('สร้างการ์ดไม่สำเร็จ')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }))
    expect(await screen.findByRole('img', { name: 'ตัวอย่างการ์ด' })).toBeTruthy()
  })

  it('frees the preview URL when closed', async () => {
    const { unmount } = render(<StudygramCard session={session} onClose={() => {}} />)
    await screen.findByRole('img', { name: 'ตัวอย่างการ์ด' })
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})
