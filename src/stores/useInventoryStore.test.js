import { describe, it, expect, beforeEach } from 'vitest'
import { useInventoryStore } from './useInventoryStore'
import { useFarmDataStore } from './useFarmDataStore'
import { ITEMS } from '../data/ItemData'

const reset = () => {
  useFarmDataStore.setState({ plants: {}, items: ITEMS, shops: {} })
  useInventoryStore.setState({
    hotbar: Array(8).fill(null),
    storage: Array(30).fill(null),
    gold: 100,
  })
}

describe('useInventoryStore', () => {
  beforeEach(reset)

  it('adds items into the hotbar first', () => {
    const ok = useInventoryStore.getState().addItem('turnip_seed', 5)
    expect(ok).toBe(true)
    expect(useInventoryStore.getState().hotbar[0]).toEqual({ itemId: 'turnip_seed', count: 5 })
  })

  it('counts across hotbar and storage', () => {
    const s = useInventoryStore.getState()
    s.addItem('turnip_seed', 3)
    expect(useInventoryStore.getState().countItem('turnip_seed')).toBe(3)
    expect(useInventoryStore.getState().hasItem('turnip_seed', 3)).toBe(true)
    expect(useInventoryStore.getState().hasItem('turnip_seed', 4)).toBe(false)
  })

  it('removes items and frees slots', () => {
    const s = useInventoryStore.getState()
    s.addItem('turnip_seed', 5)
    expect(useInventoryStore.getState().removeItem('turnip_seed', 5)).toBe(true)
    expect(useInventoryStore.getState().hotbar[0]).toBeNull()
  })

  it('refuses to remove more than present', () => {
    expect(useInventoryStore.getState().removeItem('turnip_seed', 1)).toBe(false)
  })

  it('manages gold separately from coins', () => {
    const s = useInventoryStore.getState()
    s.addGold(50)
    expect(useInventoryStore.getState().gold).toBe(150)
    expect(useInventoryStore.getState().removeGold(200)).toBe(false)
    expect(useInventoryStore.getState().gold).toBe(150)
    expect(useInventoryStore.getState().removeGold(150)).toBe(true)
    expect(useInventoryStore.getState().gold).toBe(0)
  })
})
