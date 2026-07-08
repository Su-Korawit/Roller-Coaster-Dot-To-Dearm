import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  attach: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  addDoc: (...a) => m.addDoc(...a),
  deleteDoc: (...a) => m.deleteDoc(...a),
  serverTimestamp: () => 'server-ts',
}))
vi.mock('../lib/db', () => ({
  cols: { tcasEvents: { _col: 'tcasEvents' } },
  refs: { tcasEvent: (id) => ({ _path: `tcasEvents/${id}` }) },
  queries: { tcasEventsByDate: () => ({ _query: 'byDate' }) },
}))
vi.mock('../lib/firestoreListener', () => ({
  createFirestoreListener: () => ({ attach: (...a) => m.attach(...a) }),
}))

const { useTcasEventsStore } = await import('./useTcasEventsStore')

describe('useTcasEventsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTcasEventsStore.setState({ events: [] })
  })

  it('subscribeEvents attaches a listener that maps docs into events', () => {
    m.attach.mockImplementation((query, cb) => {
      cb({ docs: [{ id: 'e1', data: () => ({ title: 'สมัคร TCAS70', date: '2026-07-15' }) }] })
      return () => {}
    })
    useTcasEventsStore.getState().subscribeEvents()
    expect(m.attach).toHaveBeenCalledWith({ _query: 'byDate' }, expect.any(Function))
    expect(useTcasEventsStore.getState().events).toEqual([
      { id: 'e1', title: 'สมัคร TCAS70', date: '2026-07-15' },
    ])
  })

  it('addEvent writes a trimmed doc with a server timestamp and null-able link', async () => {
    await useTcasEventsStore.getState().addEvent({
      title: '  ลงทะเบียน  ', description: ' คำอธิบาย ', date: '2026-07-15', link: '',
    })
    expect(m.addDoc).toHaveBeenCalledWith({ _col: 'tcasEvents' }, {
      title: 'ลงทะเบียน',
      description: 'คำอธิบาย',
      date: '2026-07-15',
      link: null,
      createdAt: 'server-ts',
    })
  })

  it('deleteEvent deletes by ref', async () => {
    await useTcasEventsStore.getState().deleteEvent('e9')
    expect(m.deleteDoc).toHaveBeenCalledWith({ _path: 'tcasEvents/e9' })
  })
})
