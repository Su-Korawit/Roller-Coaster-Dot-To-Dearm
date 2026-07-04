import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useInventoryStore } from '../stores/useInventoryStore'
import { useFarmDataStore } from '../stores/useFarmDataStore'
import { notify } from './NotificationSystem'
import { moveToStorage, moveToHotbar, swapSlots } from './inventoryActions'

beforeEach(() => {
  useFarmDataStore.setState({ items: { wheat: { stackMax: 10 } }, plants: {}, shops: {} })
  useInventoryStore.setState({
    hotbar: [{ itemId: 'wheat', count: 3 }, null, null, null, null, null, null, null],
    storage: Array(30).fill(null),
    gold: 0,
  })
  vi.spyOn(notify, 'inventoryFull').mockImplementation(() => {})
})

describe('moveToStorage', () => {
  it('moves a hotbar slot into the first empty storage slot', () => {
    moveToStorage(0)
    expect(useInventoryStore.getState().hotbar[0]).toBeNull()
    expect(useInventoryStore.getState().storage[0]).toEqual({ itemId: 'wheat', count: 3 })
  })

  it('does nothing on an empty hotbar slot', () => {
    moveToStorage(1)
    expect(useInventoryStore.getState().storage[0]).toBeNull()
  })

  it('notifies and leaves the hotbar untouched when storage is full', () => {
    useInventoryStore.setState({ storage: Array(30).fill({ itemId: 'wheat', count: 10 }) })
    moveToStorage(0)
    expect(notify.inventoryFull).toHaveBeenCalled()
    expect(useInventoryStore.getState().hotbar[0]).toEqual({ itemId: 'wheat', count: 3 })
  })
})

describe('moveToHotbar', () => {
  it('moves a storage slot into the first empty hotbar slot', () => {
    useInventoryStore.setState({
      hotbar: Array(8).fill(null),
      storage: [{ itemId: 'wheat', count: 5 }, ...Array(29).fill(null)],
    })
    moveToHotbar(0)
    expect(useInventoryStore.getState().storage[0]).toBeNull()
    expect(useInventoryStore.getState().hotbar[0]).toEqual({ itemId: 'wheat', count: 5 })
  })
})

describe('swapSlots', () => {
  it('swaps two hotbar slots', () => {
    useInventoryStore.setState({
      hotbar: [{ itemId: 'wheat', count: 3 }, { itemId: 'corn', count: 1 }, null, null, null, null, null, null],
    })
    swapSlots(0, 1, true)
    expect(useInventoryStore.getState().hotbar[0]).toEqual({ itemId: 'corn', count: 1 })
    expect(useInventoryStore.getState().hotbar[1]).toEqual({ itemId: 'wheat', count: 3 })
  })

  it('swaps two storage slots', () => {
    useInventoryStore.setState({
      storage: [{ itemId: 'wheat', count: 3 }, { itemId: 'corn', count: 1 }, ...Array(28).fill(null)],
    })
    swapSlots(0, 1, false)
    expect(useInventoryStore.getState().storage[0]).toEqual({ itemId: 'corn', count: 1 })
    expect(useInventoryStore.getState().storage[1]).toEqual({ itemId: 'wheat', count: 3 })
  })
})
