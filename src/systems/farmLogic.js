// Pure helpers for the farm. Growth is derived from plantedAt — no stored stage.
// `plants` parameter falls back to the JS default during the Firestore migration.
// Once all callers pass the store value explicitly (Task 3), the fallback import
// can be removed.
import { PLANTS as PLANTS_FALLBACK } from '../data/PlantData.js'

export const tileKey = (x, y) => `${x}_${y}`

export function occupiedTiles(x, y, plantId, plants) {
  const p = plants ?? PLANTS_FALLBACK
  const plant = p[plantId]
  if (!plant) return []
  const tiles = []
  for (let dy = 0; dy < plant.size.h; dy++) {
    for (let dx = 0; dx < plant.size.w; dx++) {
      tiles.push({ x: x + dx, y: y + dy })
    }
  }
  return tiles
}

export function canPlant(plots, x, y, plantId, farmTiles, plants) {
  const p = plants ?? PLANTS_FALLBACK
  if (!p[plantId]) return { ok: false, reason: 'ไม่รู้จักพืชนี้' }
  for (const t of occupiedTiles(x, y, plantId, p)) {
    const k = tileKey(t.x, t.y)
    if (plots[k]) return { ok: false, reason: 'มีพืชอยู่แล้ว' }
    if (farmTiles && !farmTiles.has(k)) return { ok: false, reason: 'นอกแปลงดิน' }
  }
  return { ok: true }
}

// Given any tile, return the anchor tileKey: a satellite tile points to its
// anchor via anchorKey; an anchor or empty tile resolves to itself.
export function resolveAnchor(plots, x, y) {
  const k = tileKey(x, y)
  const plot = plots[k]
  return plot && plot.anchorKey ? plot.anchorKey : k
}

// Cumulative seconds required to REACH each stage (1..3).
function cumulativeThresholds(plant) {
  const out = []
  let acc = 0
  for (const t of plant.growTime) {
    acc += t
    out.push(acc)
  }
  return out
}

// Deterministic stage 0..3 (3 = ready) from plantedAt.
export function currentStage(plantedAt, plantId, now, plants) {
  const p = plants ?? PLANTS_FALLBACK
  const plant = p[plantId]
  if (!plant) return 0
  const elapsedSec = (now - plantedAt) / 1000
  let stage = 0
  for (const mark of cumulativeThresholds(plant)) {
    if (elapsedSec >= mark) stage++
  }
  return Math.min(stage, 3)
}

export function isReady(plantedAt, plantId, now, plants) {
  return currentStage(plantedAt, plantId, now, plants) >= 3
}

// rng: () => [0,1). Injected so callers/tests stay deterministic.
export function rollYield(plantId, rng, plants) {
  const p = plants ?? PLANTS_FALLBACK
  const plant = p[plantId]
  if (!plant) return 0
  const span = plant.yieldMax - plant.yieldMin + 1
  return plant.yieldMin + Math.floor(rng() * span)
}
