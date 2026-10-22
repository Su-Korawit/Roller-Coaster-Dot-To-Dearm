// Layout of the Open House campus (ADR-0026), in tiles. Single source for the map generator
// (scripts/buildCampus.mjs), the scene (campusRender.js) and the minimap. Pure data.
//
// Twin quads (west: health + science/tech, east: society + business + arts + education) either side
// of a north–south avenue, the central hall on the avenue, the gate and a lakeside promenade in the
// south; agri and its rice field on the east edge. The sprites have one orientation (door on the
// south face), so the top rows face the lawn and the bottom rows face the south lane.
import { BUILDINGS, ZONES } from '../constants/openHouseBuildings.js'

export const MAP = { w: 107, h: 85, tile: 16 }
export const SPRITE = { w: 96, h: 80, tilesW: 6, tilesH: 5 }

const row = (y, entries) => entries.map(([id, x]) => ({ id, x, y }))

export const PLACEMENTS = [
  ...row(4, [['med', 9], ['dent', 16], ['pharm', 23], ['vet', 30], ['allied', 37]]),
  ...row(52, [['sci', 9], ['it', 17], ['eng', 25], ['arch', 33]]),
  ...row(4, [['law', 58], ['comm', 65], ['pol', 72], ['hum', 79]]),
  ...row(52, [['biz', 58], ['tour', 66], ['fine', 74], ['edu', 82]]),
  { id: 'agri', x: 94, y: 28 },
]

export const HALL = { id: 'hall', x: 47, y: 26 }
export const GATE = { id: 'gate', x: 47, y: 60 }
export const AVENUE = { x: 44, w: 13 } // centre column 50, the axis of the whole campus
export const QUADS = { west: { x: 9, w: 35 }, east: { x: 57, w: 35 }, y: 10, h: 42 }
export const PROMENADE_ROWS = [65, 66, 67, 68]
export const LAKE_TOP = 69 // the shore row; water below
export const BRIDGE = { x: 49, w: 3 }
export const SPAWN = { tx: 50, ty: 78 }
export const RICE_FIELD = { x: 94, y: 34, w: 12, h: 10 }

export const placementOf = (id) => PLACEMENTS.find((p) => p.id === id)

export const footprint = (p) => ({ id: p.id, x: p.x, y: p.y, w: SPRITE.tilesW, h: SPRITE.tilesH })

// Standing here shows the "เข้าตึก" action: a 2×1-tile strip just below the building, on the door's axis.
export const doorTile = (p) => ({ x: p.x + 2, y: p.y + 5, w: 2, h: 1 })
export const doorZone = (p) => ({ x: (p.x + 2) * MAP.tile, y: (p.y + 5) * MAP.tile, width: 2 * MAP.tile, height: MAP.tile })
export const hallDoorTile = () => doorTile(HALL)

// The gate is two pillars with a two-tile gap; only the pillars block.
export const gatePillars = () => [
  { id: 'gate-w', x: GATE.x, y: GATE.y + 1, w: 2, h: 4 },
  { id: 'gate-e', x: GATE.x + 4, y: GATE.y + 1, w: 2, h: 4 },
]

export function footprints() {
  return [...PLACEMENTS.map(footprint), footprint(HALL), ...gatePillars()]
}

export function blockedByFootprints(tx, ty) {
  return footprints().some((r) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h)
}

const colorOf = Object.fromEntries(BUILDINGS.map((b) => [b.id, ZONES[b.zone].color]))

// Rectangles (in tiles) the minimap draws for the faculties.
export function minimapRects() {
  return PLACEMENTS.map((p) => ({ id: p.id, x: p.x, y: p.y, w: SPRITE.tilesW, h: SPRITE.tilesH, color: colorOf[p.id] }))
}
