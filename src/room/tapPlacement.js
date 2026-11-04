// Turns a tap on the room into an editing action. With an item armed it places it (floor
// items centred on the tap and snapped to the 8 px grid; desk items into the desk slot under
// the tap); with nothing armed it picks up the topmost placed item under the tap. Pure: the
// store decides whether the placement is allowed (placement.js) and shows why not.
import { furnitureSprites } from '../game/roomRender'
import { GRID, TILE } from './placement'

const snap = (v) => Math.round(v / GRID) * GRID

// Slot under a tap on a desk: the three columns across the top, or the back edge.
function slotAt(desk, deskItem, x, y) {
  const w = deskItem.footprint[0] * TILE
  const rx = x - desk.x
  if (y < desk.y - 2) return 'back'
  if (rx < w / 3) return 'left'
  if (rx < (2 * w) / 3) return 'centre'
  return 'right'
}

const onDesk = (desk, deskItem, x, y) =>
  x >= desk.x && x < desk.x + deskItem.footprint[0] * TILE && y >= desk.y - 8 && y < desk.y + deskItem.footprint[1] * TILE

// Where a sprite is on screen: a 32 px frame anchored at its bottom-left; desk items are
// small (16 px wide, 20 tall) so they do not steal taps meant for the desk.
function spriteRect(s, item) {
  const w = item.deskSlot ? 16 : 32
  const h = item.deskSlot ? 20 : 32
  return { x: s.x, y: s.y - h, w, h }
}

export function resolveTap({ layout, catalog, selected, x, y }) {
  if (selected) {
    const item = catalog?.[selected]
    if (!item) return { kind: 'none', reason: 'unknown_item' }
    if (item.deskSlot) {
      const placed = layout.placed ?? []
      const desk = placed.find((p) => catalog[p.itemId]?.kind === 'desk' && onDesk(p, catalog[p.itemId], x, y))
      if (!desk) return { kind: 'none', reason: 'bad_slot' }
      return { kind: 'place', itemId: selected, x: desk.x, y: desk.y, slot: slotAt(desk, catalog[desk.itemId], x, y) }
    }
    const [fw, fh] = item.footprint
    return { kind: 'place', itemId: selected, x: snap(x - (fw * TILE) / 2), y: snap(y - (fh * TILE) / 2) }
  }

  const sprites = furnitureSprites({ layout, catalog })
  for (let i = sprites.length - 1; i >= 0; i--) {
    const s = sprites[i]
    const r = spriteRect(s, catalog[s.itemId])
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return { kind: 'pickup', index: s.index }
  }
  return { kind: 'none' }
}
