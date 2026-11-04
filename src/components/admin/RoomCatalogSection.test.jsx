// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('firebase/firestore', () => ({
  getDocs: (...a) => m.getDocs(...a),
  setDoc: (...a) => m.setDoc(...a),
}))
vi.mock('../../lib/db', () => ({
  refs: { roomCatalog: (id) => ({ path: `roomCatalog/${id}` }) },
  cols: { roomCatalog: { path: 'roomCatalog' } },
}))
vi.mock('./Toast', () => ({ useToast: () => m.toast }))

const { default: RoomCatalogSection } = await import('./RoomCatalogSection')

const rows = [
  { id: 'lamp_desk', name: 'โคมไฟตั้งโต๊ะ', kind: 'decor', price: 90 },
  { id: 'desk_basic', name: 'โต๊ะอ่านหนังสือ', kind: 'desk', price: 150, hidden: true },
]

beforeEach(() => {
  vi.clearAllMocks()
  m.getDocs.mockResolvedValue({ docs: rows.map(({ id, ...data }) => ({ id, data: () => data })) })
  m.setDoc.mockResolvedValue(undefined)
})

describe('RoomCatalogSection', () => {
  it('lists every catalog row with its price', async () => {
    render(<RoomCatalogSection />)
    expect((await screen.findByLabelText('ราคา โคมไฟตั้งโต๊ะ')).value).toBe('90')
    expect(screen.getByLabelText('ราคา โต๊ะอ่านหนังสือ').value).toBe('150')
  })

  it('saves only the price, merged into the row', async () => {
    render(<RoomCatalogSection />)
    fireEvent.change(await screen.findByLabelText('ราคา โคมไฟตั้งโต๊ะ'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกราคา โคมไฟตั้งโต๊ะ' }))
    await waitFor(() => expect(m.setDoc).toHaveBeenCalledTimes(1))
    expect(m.setDoc).toHaveBeenCalledWith({ path: 'roomCatalog/lamp_desk' }, { price: 120 }, { merge: true })
    expect(m.toast.success).toHaveBeenCalled()
  })

  it.each(['-5', '12.5', 'abc', ''])('rejects the price %j without calling the server', async (value) => {
    render(<RoomCatalogSection />)
    fireEvent.change(await screen.findByLabelText('ราคา โคมไฟตั้งโต๊ะ'), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกราคา โคมไฟตั้งโต๊ะ' }))
    expect(await screen.findByText('ราคาต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป')).toBeTruthy()
    expect(m.setDoc).not.toHaveBeenCalled()
  })

  it('hides and shows a row in the shop with a toggle', async () => {
    render(<RoomCatalogSection />)
    const box = await screen.findByLabelText('ซ่อนจากร้าน โต๊ะอ่านหนังสือ')
    expect(box.checked).toBe(true)
    fireEvent.click(box)
    await waitFor(() => expect(m.setDoc).toHaveBeenCalledWith({ path: 'roomCatalog/desk_basic' }, { hidden: false }, { merge: true }))
  })

  it('reports a failed save', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    m.setDoc.mockRejectedValue(new Error('denied'))
    render(<RoomCatalogSection />)
    fireEvent.click(await screen.findByRole('button', { name: 'บันทึกราคา โคมไฟตั้งโต๊ะ' }))
    await waitFor(() => expect(m.toast.error).toHaveBeenCalled())
  })

  it('says so when the catalog is empty (seed it first)', async () => {
    m.getDocs.mockResolvedValue({ docs: [] })
    render(<RoomCatalogSection />)
    expect(await screen.findByText(/ยังไม่มีรายการ/)).toBeTruthy()
  })
})
