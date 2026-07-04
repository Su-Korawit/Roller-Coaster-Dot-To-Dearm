// src/systems/inventoryActions.js
// Orchestrates the inventory store for hotbar/storage slot management.
// Pure of React; reads live state via getState() so React handlers can call
// it directly. Extracted verbatim from GameCanvas.jsx's inline handlers.
import { useInventoryStore } from '../stores/useInventoryStore.js'
import { useFarmDataStore } from '../stores/useFarmDataStore.js'
import { addToSlots } from './inventoryLogic.js'
import { notify } from './NotificationSystem.js'

function stackMaxFor(itemId) {
  return useFarmDataStore.getState().items[itemId]?.stackMax ?? 99
}

export function moveToStorage(fromIndex) {
  const inv = useInventoryStore.getState()
  const slot = inv.hotbar[fromIndex]
  if (!slot) return
  const result = addToSlots(inv.storage, slot.itemId, slot.count, stackMaxFor(slot.itemId))
  if (result.remaining === 0) {
    const newHotbar = [...inv.hotbar]
    newHotbar[fromIndex] = null
    useInventoryStore.setState({ hotbar: newHotbar, storage: result.slots })
  } else {
    notify.inventoryFull()
  }
}

export function moveToHotbar(fromIndex) {
  const inv = useInventoryStore.getState()
  const slot = inv.storage[fromIndex]
  if (!slot) return
  const result = addToSlots(inv.hotbar, slot.itemId, slot.count, stackMaxFor(slot.itemId))
  if (result.remaining === 0) {
    const newStorage = [...inv.storage]
    newStorage[fromIndex] = null
    useInventoryStore.setState({ hotbar: result.slots, storage: newStorage })
  } else {
    notify.inventoryFull()
  }
}

export function swapSlots(fromIndex, toIndex, isHotbarSwap) {
  const inv = useInventoryStore.getState()
  if (isHotbarSwap) {
    const newHotbar = [...inv.hotbar]
    ;[newHotbar[fromIndex], newHotbar[toIndex]] = [newHotbar[toIndex], newHotbar[fromIndex]]
    useInventoryStore.setState({ hotbar: newHotbar })
  } else {
    const newStorage = [...inv.storage]
    ;[newStorage[fromIndex], newStorage[toIndex]] = [newStorage[toIndex], newStorage[fromIndex]]
    useInventoryStore.setState({ storage: newStorage })
  }
}
