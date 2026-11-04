// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({ getDocs: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  getDocs: (...a) => m.getDocs(...a), query: (...a) => a, where: (...a) => a, orderBy: (...a) => a, limit: (n) => n, getDoc: vi.fn(),
}))
vi.mock('../../lib/db', () => ({ cols: { focusSessions: {} }, refs: {}, shapes: {} }))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))
vi.mock('../../stores/useAuthStore', async () => {
  const { create } = await import('zustand')
  return { useAuthStore: create(() => ({ user: null })) }
})
vi.mock('./StudygramCard', () => ({ default: ({ session }) => <div data-testid="card">{`${session.tree}|${session.verifiedMs}`}</div> }))

const { default: TreeHistorySheet } = await import('./TreeHistorySheet')
const { useFocusHistoryStore } = await import('../../stores/useFocusHistoryStore')
const { useAuthStore } = await import('../../stores/useAuthStore')

const snap = (rows) => ({ docs: rows.map(([id, data]) => ({ id, data: () => data })) })
const row = (id, endedAt, over = {}) => [id, { uid: 'u1', endedAt, verifiedMs: 25 * 60000, tree: 'shrub', leaves: 41, mode: 'strict', withered: false, practice: false, subjectKey: null, ...over }]

beforeEach(() => {
  vi.clearAllMocks()
  useFocusHistoryStore.getState().reset()
  useAuthStore.setState({ user: { uid: 'u1' } })
})

describe('TreeHistorySheet', () => {
  it('lists the sessions newest first with tree, time, mode and Leaves', async () => {
    m.getDocs.mockResolvedValue(snap([row('a', new Date(2026, 9, 20).getTime()), row('b', new Date(2026, 9, 22).getTime(), { tree: 'blossom', mode: 'flexible', verifiedMs: 95 * 60000, leaves: 90 })]))
    render(<TreeHistorySheet onClose={() => {}} />)
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('ต้นไม้ดอก')).toBeTruthy()
    expect(items[0].textContent).toContain('1h 35m')
    expect(items[0].textContent).toContain('+90 ใบ')
    expect(items[0].textContent).toContain('ยืดหยุ่น')
    expect(items[1].textContent).toContain('เข้ม')
  })

  it('a withered session says so, earned nothing, and has no card button', async () => {
    m.getDocs.mockResolvedValue(snap([row('w', 5, { withered: true, leaves: 0 })]))
    render(<TreeHistorySheet onClose={() => {}} />)
    const item = (await screen.findAllByRole('listitem'))[0]
    expect(item.textContent).toContain('ต้นไม้เหี่ยว')
    expect(within(item).queryByRole('button', { name: 'ทำการ์ด' })).toBeNull()
  })

  it('practice sessions are not listed', async () => {
    m.getDocs.mockResolvedValue(snap([row('p', 5, { practice: true, leaves: 10 }), row('r', 6)]))
    render(<TreeHistorySheet onClose={() => {}} />)
    expect(await screen.findAllByRole('listitem')).toHaveLength(1)
  })

  it('opens the card of a finished session', async () => {
    m.getDocs.mockResolvedValue(snap([row('a', 5)]))
    render(<TreeHistorySheet onClose={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'ทำการ์ด' }))
    expect(screen.getByTestId('card').textContent).toBe('shrub|1500000')
  })

  it('shows an empty state, and an error with a retry that loads again', async () => {
    m.getDocs.mockResolvedValueOnce(snap([]))
    const { unmount } = render(<TreeHistorySheet onClose={() => {}} />)
    expect(await screen.findByText('ยังไม่มีต้นไม้ในประวัติ')).toBeTruthy()
    unmount()
    useFocusHistoryStore.getState().reset()
    m.getDocs.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'unavailable' })).mockResolvedValueOnce(snap([row('a', 5)]))
    render(<TreeHistorySheet onClose={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'ลองใหม่' }))
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
  })

  it('a guest sees a sign-in hint and nothing is read', () => {
    useAuthStore.setState({ user: null })
    render(<TreeHistorySheet onClose={() => {}} />)
    expect(screen.getByText('เข้าสู่ระบบเพื่อดูประวัติต้นไม้')).toBeTruthy()
    expect(m.getDocs).not.toHaveBeenCalled()
  })
})
