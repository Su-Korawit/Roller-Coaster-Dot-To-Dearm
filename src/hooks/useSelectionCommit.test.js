import { describe, it, expect, vi, beforeEach } from 'vitest'

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: { getState: () => authState },
}))

const syncSelectToFirestore = vi.fn()
vi.mock('../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => syncSelectToFirestore(...args),
}))

const { useSelectionCommit } = await import('./useSelectionCommit')

describe('useSelectionCommit', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    syncSelectToFirestore.mockClear()
  })

  it('calls the setter with the selected value', () => {
    const setter = vi.fn()
    const commit = useSelectionCommit(setter)
    commit('infj')
    expect(setter).toHaveBeenCalledWith('infj')
  })

  it('syncs the signed-in uid to Firestore after setting', () => {
    const setter = vi.fn()
    const commit = useSelectionCommit(setter)
    commit('infj')
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })

  it('sets before syncing (sync should see the just-set value if it re-read the store)', () => {
    const order = []
    const setter = vi.fn(() => order.push('set'))
    syncSelectToFirestore.mockImplementation(() => order.push('sync'))
    const commit = useSelectionCommit(setter)
    commit('infj')
    expect(order).toEqual(['set', 'sync'])
  })

  it('still calls sync with undefined uid when signed out', () => {
    authState = { user: null }
    const setter = vi.fn()
    const commit = useSelectionCommit(setter)
    commit('infj')
    expect(syncSelectToFirestore).toHaveBeenCalledWith(undefined)
  })
})
