// Pure helpers for the farm. Growth is derived from plantedAt — no stored stage.
import { PLANTS } from '../data/PlantData.js'

export const tileKey = (x, y) => `${x}_${y}`

export function occupiedTiles(x, y, plantId) {
  const plant = PLANTS[plantId]
  if (!plant) return []
  const tiles = []
  for (let dy = 0; dy < plant.size.h; dy++) {
    for (let dx = 0; dx < plant.size.w; dx++) {
      tiles.push({ x: x + dx, y: y + dy })
    }
  }
  return tiles
}

export function canPlant(plots, x, y, plantId) {
  if (!PLANTS[plantId]) return { ok: false, reason: 'ไม่รู้จักพืชนี้' }
  for (const t of occupiedTiles(x, y, plantId)) {
    if (plots[tileKey(t.x, t.y)]) return { ok: false, reason: 'มีพืชอยู่แล้ว' }
  }
  return { ok: true }
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
export function currentStage(plantedAt, plantId, now) {
  const plant = PLANTS[plantId]
  const elapsedSec = (now - plantedAt) / 1000
  let stage = 0
  for (const mark of cumulativeThresholds(plant)) {
    if (elapsedSec >= mark) stage++
  }
  return Math.min(stage, 3)
}

export function isReady(plantedAt, plantId, now) {
  return currentStage(plantedAt, plantId, now) >= 3
}

// rng: () => [0,1). Injected so callers/tests stay deterministic.
export function rollYield(plantId, rng) {
  const plant = PLANTS[plantId]
  const span = plant.yieldMax - plant.yieldMin + 1
  return plant.yieldMin + Math.floor(rng() * span)
}
