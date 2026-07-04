// src/systems/shopActions.js
// Orchestrates the inventory store for shop buy/sell, returning the result
// shapes ShopUI already expects. Pure of React; reads live state via
// getState() so React handlers can call it directly. Extracted verbatim from
// GameCanvas.jsx's inline handlers.
import { useInventoryStore } from '../stores/useInventoryStore.js'
import { useFarmDataStore } from '../stores/useFarmDataStore.js'

export function buyItem(farmShops, shopId, itemId, qty) {
  const shop = farmShops[shopId]
  if (!shop) return {}
  const item = shop.sells.find((s) => s.itemId === itemId)
  if (!item) return {}
  const total = item.price * qty
  const inv = useInventoryStore.getState()
  if (!inv.hasGold(total)) return { success: false, reason: 'เงินไม่พอ' }
  inv.removeGold(total)
  inv.addItem(itemId, qty)
  return { success: true }
}

export function sellItem(itemId, count) {
  const inv = useInventoryStore.getState()
  const sellPrice = useFarmDataStore.getState().items[itemId]?.sellPrice ?? 0
  const goldEarned = sellPrice * count
  inv.removeItem(itemId, count)
  inv.addGold(goldEarned)
  return { success: true, goldEarned }
}

export function sellAllProduce() {
  const inv = useInventoryStore.getState()
  const { items } = useFarmDataStore.getState()
  const allSlots = [...inv.hotbar, ...inv.storage]
  let totalEarned = 0
  const sold = {}
  allSlots.forEach((slot) => {
    if (!slot) return
    if (items[slot.itemId]?.type === 'produce') {
      sold[slot.itemId] = (sold[slot.itemId] ?? 0) + slot.count
    }
  })
  if (Object.keys(sold).length === 0) return { success: false, reason: 'ไม่มีของขาย' }
  Object.entries(sold).forEach(([itemId, count]) => {
    const sellPrice = items[itemId]?.sellPrice ?? 0
    inv.removeItem(itemId, count)
    inv.addGold(sellPrice * count)
    totalEarned += sellPrice * count
  })
  return { success: true, totalEarned }
}
