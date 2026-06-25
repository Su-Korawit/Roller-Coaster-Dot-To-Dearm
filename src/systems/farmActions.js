// src/systems/farmActions.js
// Orchestrates the inventory + farm stores so plant/harvest stay consistent.
// Pure of React; reads live state via getState() so React handlers can call it.
import { useInventoryStore } from '../stores/useInventoryStore.js'
import { useFarmStore } from '../stores/useFarmStore.js'
import { ITEMS } from '../data/ItemData.js'
import { PLANTS } from '../data/PlantData.js'
import { canPlant, resolveAnchor, isReady } from './farmLogic.js'
import { notify } from './NotificationSystem.js'
import { sound } from './SoundManager.js'

// Would `count` of itemId fit into the current slots without overflow?
function fits(inv, itemId, count) {
  const stackMax = ITEMS[itemId]?.stackMax ?? 99
  let capacity = 0
  for (const slot of [...inv.hotbar, ...inv.storage]) {
    if (slot === null) capacity += stackMax
    else if (slot.itemId === itemId) capacity += stackMax - slot.count
    if (capacity >= count) return true
  }
  return capacity >= count
}

export function plantSeed({ tileX, tileY, seedItemId, farmTiles }) {
  const inv = useInventoryStore.getState()
  const item = ITEMS[seedItemId]
  if (!item || item.type !== 'seed') return { ok: false, reason: 'ไม่ใช่เมล็ด' }
  const plantId = item.plantId
  if (!inv.hasItem(seedItemId, 1)) {
    notify.error?.('ไม่มีเมล็ด')
    return { ok: false, reason: 'ไม่มีเมล็ด' }
  }

  const plots = useFarmStore.getState().plots
  const check = canPlant(plots, tileX, tileY, plantId, farmTiles)
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
  notify.planted?.(PLANTS[plantId]?.name ?? plantId)
  sound.playPlant()
  return { ok: true }
}

export function harvestAt({ tileX, tileY }) {
  const farm = useFarmStore.getState()
  const anchorKey = resolveAnchor(farm.plots, tileX, tileY)
  const [ax, ay] = anchorKey.split('_').map(Number)
  const plot = farm.plots[anchorKey]
  if (!plot || plot.anchorKey) return { ok: false, reason: 'ไม่มีพืช' }
  if (!isReady(plot.plantedAt, plot.plantId, Date.now())) return { ok: false, reason: 'ยังไม่โต' }

  // Block before clearing the plot if produce would not fit.
  const inv = useInventoryStore.getState()
  if (!fits(inv, plot.plantId, 1)) {
    notify.inventoryFull?.()
    return { ok: false, reason: 'กระเป๋าเต็ม' }
  }

  const produce = useFarmStore.getState().harvest(ax, ay)
  if (!produce) return { ok: false, reason: 'เก็บไม่สำเร็จ' }
  useInventoryStore.getState().addItem(produce.itemId, produce.count)
  notify.harvested?.(ITEMS[produce.itemId]?.name ?? produce.itemId, produce.count)
  sound.playHarvest()
  return { ok: true, produce }
}
