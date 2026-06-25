// src/systems/farmActions.js
// Orchestrates the inventory + farm stores so plant/harvest stay consistent.
// Pure of React; reads live state via getState() so React handlers can call it.
import { useInventoryStore } from '../stores/useInventoryStore.js'
import { useFarmStore } from '../stores/useFarmStore.js'
import { useFarmDataStore } from '../stores/useFarmDataStore.js'
import { canPlant, resolveAnchor, isReady } from './farmLogic.js'
import { notify } from './NotificationSystem.js'
import { sound } from './SoundManager.js'

// Would `count` of itemId fit into the current slots without overflow?
function fits(inv, itemId, count) {
  const { items } = useFarmDataStore.getState()
  const stackMax = items[itemId]?.stackMax ?? 99
  let capacity = 0
  for (const slot of [...inv.hotbar, ...inv.storage]) {
    if (slot === null) capacity += stackMax
    else if (slot.itemId === itemId) capacity += stackMax - slot.count
    if (capacity >= count) return true
  }
  return capacity >= count
}

export function plantSeed({ tileX, tileY, seedItemId, farmTiles }) {
  const { items, plants } = useFarmDataStore.getState()
  const item = items[seedItemId]
  if (!item || item.type !== 'seed') return { ok: false, reason: 'ไม่ใช่เมล็ด' }
  const plantId = item.plantId
  const inv = useInventoryStore.getState()
  if (!inv.hasItem(seedItemId, 1)) {
    notify.error?.('ไม่มีเมล็ด')
    return { ok: false, reason: 'ไม่มีเมล็ด' }
  }

  const plots = useFarmStore.getState().plots
  const check = canPlant(plots, tileX, tileY, plantId, farmTiles, plants)
  if (!check.ok) {
    notify.error?.(check.reason)
    return check
  }

  // Both preconditions held; mutate inventory then farm.
  inv.removeItem(seedItemId, 1)
  const planted = useFarmStore.getState().plant(tileX, tileY, plantId)
  if (!planted) {
    // extremely unlikely race — refund the seed to stay consistent
    useInventoryStore.getState().addItem(seedItemId, 1)
    return { ok: false, reason: 'ปลูกไม่สำเร็จ' }
  }
  notify.planted?.()
  sound.playPlant?.()
  return { ok: true }
}

export function harvestAt({ tileX, tileY }) {
  const { plants } = useFarmDataStore.getState()
  const farm = useFarmStore.getState()
  const anchorKey = resolveAnchor(farm.plots, tileX, tileY)
  const [ax, ay] = anchorKey.split('_').map(Number)
  const plot = farm.plots[anchorKey]
  if (!plot || plot.anchorKey) return { ok: false, reason: 'ไม่มีพืช' }
  if (!isReady(plot.plantedAt, plot.plantId, Date.now(), plants)) return { ok: false, reason: 'ยังไม่พร้อม' }

  // Block before clearing the plot if produce would not fit.
  const inv = useInventoryStore.getState()
  const yieldItem = plot.plantId
  if (!fits(inv, yieldItem, 1)) {
    notify.inventoryFull?.()
    return { ok: false, reason: 'กระเป๋าเต็ม' }
  }

  const result = farm.harvest(ax, ay)
  if (!result) return { ok: false, reason: 'harvest failed' }
  inv.addItem(result.itemId, result.count)
  notify.harvested?.()
  sound.playHarvest?.()
  return { ok: true, ...result }
}
