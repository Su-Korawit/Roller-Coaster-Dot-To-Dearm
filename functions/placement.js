/* global module */
// Server copy of src/room/placement.js (same logic, same fixtures).

const TILE = 16
const GRID = 8
const MAX_PLACED = 60
// Floor areas of each owned tier, in tiles. A footprint must fit inside ONE area (a wall stands
// between areas), so nothing can straddle the door gap. t1 widens the main room; t2 adds the lake
// balcony on the east wall; t3 adds the second room south of the main room.
const TIER_AREAS = {
  0: [{ x: 0, y: 0, w: 11, h: 9 }],
  1: [{ x: 0, y: 0, w: 14, h: 10 }],
  2: [{ x: 0, y: 0, w: 14, h: 10 }, { x: 14, y: 1, w: 6, h: 8 }],
  3: [{ x: 0, y: 0, w: 14, h: 10 }, { x: 14, y: 1, w: 6, h: 8 }, { x: 0, y: 10, w: 10, h: 9 }],
}
const boundsOf = (areas) => {
  const x2 = Math.max(...areas.map((a) => a.x + a.w))
  const y2 = Math.max(...areas.map((a) => a.y + a.h))
  return { w: x2, h: y2 }
}
const TIER_SIZES = Object.fromEntries(Object.entries(TIER_AREAS).map(([t, areas]) => [t, boundsOf(areas)]))
const SLOTS = ['left', 'centre', 'right', 'back']
const COLLIDING = ['furniture', 'desk']

const intersects = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

// Rules shared by the editor (client) and the saveRoomLayout function (server). Positions
// are px of the footprint's top-left; footprints are in tiles. Only furniture and desks
// block each other: rugs, wall hangings and desk items sit on/over them.
function validateLayout({ layout, catalog, inventory }) {
  const errors = []
  const placed = Array.isArray(layout?.placed) ? layout.placed : []
  const owned = (id) => Number(inventory?.[id] ?? 0)
  if (placed.length > MAX_PLACED) errors.push({ code: 'too_many' })

  const size = TIER_SIZES[layout?.tier]
  const areas = TIER_AREAS[layout?.tier]
  if (!Number.isInteger(layout?.tier) || !size || (layout.tier > 0 && owned(`tier_${layout.tier}`) < 1)) errors.push({ code: 'bad_tier' })
  if (owned(`theme_${layout?.theme}`) < 1) errors.push({ code: 'bad_theme' })
  if (layout?.petId != null && (owned(layout.petId) < 1 || catalog?.[layout.petId]?.kind !== 'pet')) errors.push({ code: 'bad_pet' })

  const known = (p) => (p && typeof p.itemId === 'string' && Number.isFinite(p.x) && Number.isFinite(p.y) ? catalog?.[p.itemId] : undefined)
  const desks = placed.filter((p) => known(p)?.kind === 'desk')
  const counts = {}
  const slotsUsed = new Set()
  const blockers = []

  placed.forEach((p, index) => {
    const item = known(p)
    if (!item) {
      errors.push({ code: 'unknown_item', index, ...(typeof p?.itemId === 'string' ? { itemId: p.itemId } : {}) })
      return
    }
    const err = (code) => errors.push({ code, index, itemId: p.itemId })
    counts[p.itemId] = (counts[p.itemId] ?? 0) + 1

    if (p.x % GRID !== 0 || p.y % GRID !== 0) err('off_grid')
    const [fw, fh] = item.footprint
    const rect = { x: p.x, y: p.y, w: fw * TILE, h: fh * TILE }
    if (areas && !areas.some((a) => p.x >= a.x * TILE && p.y >= a.y * TILE && p.x + rect.w <= (a.x + a.w) * TILE && p.y + rect.h <= (a.y + a.h) * TILE)) err('out_of_bounds')

    if (item.deskSlot) {
      const key = `${p.x},${p.y},${p.slot}`
      if (!SLOTS.includes(p.slot) || !desks.some((d) => d.x === p.x && d.y === p.y) || slotsUsed.has(key)) err('bad_slot')
      slotsUsed.add(key)
    } else if (p.slot !== undefined) {
      err('bad_slot')
    }

    if (COLLIDING.includes(item.kind)) {
      if (blockers.some((b) => intersects(b, rect))) err('overlap')
      blockers.push(rect)
    }
  })

  for (const [itemId, n] of Object.entries(counts)) {
    if (n > owned(itemId)) errors.push({ code: 'not_owned', itemId })
  }
  return { ok: errors.length === 0, errors }
}

// Would the layout still be valid with one more copy of `itemId` at (x, y)?
function canPlace({ layout, catalog, inventory, itemId, x, y, slot }) {
  const candidate = { itemId, x, y, ...(slot !== undefined ? { slot } : {}) }
  return validateLayout({ layout: { ...layout, placed: [...(layout.placed ?? []), candidate] }, catalog, inventory }).ok
}

module.exports = { TILE, GRID, TIER_AREAS, TIER_SIZES, validateLayout, canPlace }
