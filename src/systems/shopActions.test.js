import { describe, it, expect, beforeEach } from 'vitest'
import { useInventoryStore } from '../stores/useInventoryStore'
import { useFarmDataStore } from '../stores/useFarmDataStore'
import { buyItem, sellItem, sellAllProduce } from './shopActions'

const farmShops = {
  'shop-1': { sells: [{ itemId: 'seed_rice', price: 10 }] },
}

beforeEach(() => {
  useFarmDataStore.setState({
    items: {
      seed_rice: { type: 'seed', stackMax: 99 },
      rice: { type: 'produce', sellPrice: 5, stackMax: 99 },
      tomato: { type: 'produce', sellPrice: 8, stackMax: 99 },
    },
    plants: {},
    shops: {},
  })
  useInventoryStore.setState({ hotbar: Array(8).fill(null), storage: Array(30).fill(null), gold: 100 })
})

describe('buyItem', () => {
  it('deducts gold and adds the item when affordable', () => {
    const r = buyItem(farmShops, 'shop-1', 'seed_rice', 2)
    expect(r.success).toBe(true)
    expect(useInventoryStore.getState().gold).toBe(80)
    expect(useInventoryStore.getState().countItem('seed_rice')).toBe(2)
  })

  it('refuses when gold is insufficient', () => {
    useInventoryStore.setState({ gold: 5 })
    const r = buyItem(farmShops, 'shop-1', 'seed_rice', 2)
    expect(r.success).toBe(false)
    expect(useInventoryStore.getState().gold).toBe(5)
  })

  it('returns {} for an unknown shop', () => {
    expect(buyItem(farmShops, 'missing-shop', 'seed_rice', 1)).toEqual({})
  })
})

describe('sellItem', () => {
  it('removes the item and adds gold at sellPrice', () => {
    useInventoryStore.getState().addItem('rice', 3)
    const r = sellItem('rice', 3)
    expect(r.success).toBe(true)
    expect(r.goldEarned).toBe(15)
    expect(useInventoryStore.getState().gold).toBe(115)
    expect(useInventoryStore.getState().countItem('rice')).toBe(0)
  })
})

describe('sellAllProduce', () => {
  it('sells every produce-type slot and leaves non-produce items alone', () => {
    useInventoryStore.getState().addItem('rice', 2)
    useInventoryStore.getState().addItem('tomato', 1)
    useInventoryStore.getState().addItem('seed_rice', 4) // not produce — must survive
    const r = sellAllProduce()
    expect(r.success).toBe(true)
    expect(r.totalEarned).toBe(2 * 5 + 1 * 8)
    expect(useInventoryStore.getState().countItem('rice')).toBe(0)
    expect(useInventoryStore.getState().countItem('tomato')).toBe(0)
    expect(useInventoryStore.getState().countItem('seed_rice')).toBe(4)
  })

  it('refuses when there is nothing to sell', () => {
    expect(sellAllProduce()).toEqual({ success: false, reason: 'ไม่มีของขาย' })
  })
})
