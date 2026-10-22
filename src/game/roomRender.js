// Draws the student's room furniture and the desk pot. The pure half (furnitureSprites,
// potFrame) is unit-tested; renderRoom is the thin Phaser half used by MapScene for maps whose
// config has `room: true`. Sprites are frames of the generated `room_items` sheet (32 px,
// 2 columns) and `focus_art` (48 px, 4 columns).
import { ROOM_CATALOG } from '../data/roomCatalogSeed'

const TILE = 16
export const ITEM_SHEET_COLS = 2
export const FOCUS_SHEET_COLS = 4
// Row of `pot_growth` in the focus atlas (tree_sprout, tree_shrub, tree_tree, tree_blossom,
// tree_withered, pot_growth). A test checks this against public/assets/rc/focus.json.
export const POT_ROW = 5

// Row of each drawn item in the room_items atlas = its order in the catalog seed, drawable kinds only.
const DRAWABLE = ['furniture', 'decor', 'desk', 'wall']
export const ROOM_ITEM_ROWS = Object.fromEntries(
  Object.entries(ROOM_CATALOG).filter(([, item]) => DRAWABLE.includes(item.kind)).map(([id], row) => [id, row]),
)

// Where a desk item sits on the desk: frame bottom-left offset from the desk's top-left (px).
export const SLOT_OFFSETS = {
  left: { x: 0, y: 1 },
  centre: { x: 8, y: 1 },
  right: { x: 16, y: 1 },
  back: { x: 8, y: -3 },
}

export const itemFrame = (itemId, f = 0) => ROOM_ITEM_ROWS[itemId] * ITEM_SHEET_COLS + f

export function potFrame(progress) {
  const stage = progress >= 1 ? 3 : progress >= 0.67 ? 2 : progress >= 0.34 ? 1 : 0
  return POT_ROW * FOCUS_SHEET_COLS + stage
}

// Draw order, all below the player (depth 10): wall hangings, rugs, floor items by their
// bottom edge, then desk items just above their desk.
const WALL_DEPTH = 1
const RUG_DEPTH = 2
const FLOOR_DEPTH = 3

export function furnitureSprites({ layout, catalog, lit = false }) {
  const out = []
  const placed = Array.isArray(layout?.placed) ? layout.placed : []
  const deskDepth = (p) => FLOOR_DEPTH + (p.y + (catalog[p.itemId].footprint[1] ?? 1) * TILE) / 1000

  placed.forEach((p, index) => {
    const item = catalog?.[p?.itemId]
    if (!item || ROOM_ITEM_ROWS[p.itemId] === undefined) return
    const frame = itemFrame(p.itemId, item.frames > 1 && lit ? 1 : 0)
    const bottom = p.y + item.footprint[1] * TILE
    if (item.deskSlot) {
      const off = SLOT_OFFSETS[p.slot]
      const desk = placed.find((d) => catalog[d.itemId]?.kind === 'desk' && d.x === p.x && d.y === p.y)
      if (!off || !desk) return
      out.push({ index, itemId: p.itemId, key: 'room_items', frame, x: p.x + off.x, y: p.y + off.y, depth: deskDepth(desk) + 0.0005 + index / 1e7, slot: p.slot })
    } else if (item.kind === 'wall') {
      out.push({ index, itemId: p.itemId, key: 'room_items', frame, x: p.x, y: bottom, depth: WALL_DEPTH + index / 1e6, slot: null })
    } else if (item.kind === 'decor') {
      out.push({ index, itemId: p.itemId, key: 'room_items', frame, x: p.x, y: bottom, depth: RUG_DEPTH + bottom / 1000, slot: null })
    } else {
      out.push({ index, itemId: p.itemId, key: 'room_items', frame, x: p.x, y: bottom, depth: FLOOR_DEPTH + bottom / 1000, slot: null })
    }
  })
  return out.sort((a, b) => a.depth - b.depth)
}

// Phaser half. `getState()` returns { layout, catalog, progress, lit } and is called on every
// refresh, so the scene never holds stale store data. Refreshes on the `roomChanged` game
// event and once a second (the pot follows the session's progress).
export function renderRoom(scene, getState) {
  const scale = scene._mapScale ?? 1
  const group = scene.add.group()
  const pot = scene.add.sprite(0, 0, 'focus_art', potFrame(0)).setOrigin(0, 1).setScale(scale).setVisible(false)

  const refresh = () => {
    const { layout, catalog, progress = 0, lit = true } = getState()
    group.clear(true, true)
    for (const s of furnitureSprites({ layout, catalog, lit })) {
      group.add(scene.add.sprite(s.x * scale, s.y * scale, s.key, s.frame).setOrigin(0, 1).setScale(scale).setDepth(s.depth))
    }
    const desk = layout.placed.find((p) => catalog[p.itemId]?.kind === 'desk')
    if (desk) {
      const bottom = desk.y + catalog[desk.itemId].footprint[1] * TILE
      pot.setVisible(true).setFrame(potFrame(progress)).setPosition((desk.x + 32) * scale, bottom * scale).setDepth(FLOOR_DEPTH + bottom / 1000 + 0.0006)
    } else {
      pot.setVisible(false)
    }
  }

  refresh()
  scene.game.events.on('roomChanged', refresh)
  const timer = scene.time.addEvent({ delay: 1000, loop: true, callback: refresh })
  scene.events.once('shutdown', () => {
    scene.game.events.off('roomChanged', refresh)
    timer.remove(false)
  })
}
