import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
  onSnapshot: vi.fn((query, handler) => {
    handler({ docs: [{ id: 'u1', data: () => ({ title: 'Test update', type: 'new' }) }] })
    return vi.fn() // unsub
  }),
  collection: vi.fn((_, ...path) => ({ _col: path.join('/') })),
  doc: vi.fn((_, ...path) => ({ _path: path.join('/') })),
  query: vi.fn((col) => col),
  orderBy: vi.fn(),
}))

const { useNewsStore } = await import('./useNewsStore')
const { addDoc, deleteDoc } = await import('firebase/firestore')

beforeEach(() => {
  useNewsStore.setState({ updates: [] })
  vi.clearAllMocks()
})

describe('subscribeUpdates', () => {
  it('attaches a listener and populates updates from the snapshot', () => {
    useNewsStore.getState().subscribeUpdates()
    expect(useNewsStore.getState().updates).toEqual([
      { id: 'u1', _firestore: true, title: 'Test update', type: 'new' },
    ])
  })
})

describe('addUpdate', () => {
  it('writes a trimmed update doc via cols.appUpdates', async () => {
    await useNewsStore.getState().addUpdate({ type: 'new', title: '  Hi  ', description: '  desc  ', image: '' })
    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _col: 'appUpdates' }),
      expect.objectContaining({ type: 'new', title: 'Hi', description: 'desc', image: null }),
    )
  })
})

describe('deleteUpdate', () => {
  it('deletes via refs.appUpdate(id)', async () => {
    await useNewsStore.getState().deleteUpdate('u1')
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ _path: 'appUpdates/u1' }))
  })
})

describe('getAllUpdates', () => {
  it('merges STATIC_UPDATES with Firestore updates and sorts by date desc', () => {
    useNewsStore.setState({
      updates: [{ id: 'u1', _firestore: true, title: 'New', createdAt: { toMillis: () => Date.now() } }],
    })
    const all = useNewsStore.getState().getAllUpdates()
    expect(all[0]).toMatchObject({ id: 'u1', title: 'New' })
    expect(all.length).toBeGreaterThan(1) // includes STATIC_UPDATES too
  })
})
