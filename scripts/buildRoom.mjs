// Generates public/maps/room.json — the study room with one self-contained SHELL per tier
// (ADR-0023, part 2 ADR-0027). Deterministic: the same input gives the same bytes. Tiles come
// from the generated Soft Pixel room tileset (node scripts/art/build.mjs room). Furniture is NOT in
// the map: it is sprites placed from the student's saved layout (src/game/roomRender.js).
//
// Layers: the tier-0 shell keeps the part 1 names (Floor, Wall, Decor) so older clients still
// load it; tiers 1–3 are Floor_t1/Wall_t1/Decor_t1 … The scene creates only the owned tier's
// layers (src/game/roomShell.js) and the objects tagged with `tier` for that tier.
//
// Usage:  node scripts/buildRoom.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { TILE_NAMES, FIRSTGID } from './art/families/room.mjs'
import { TIER_AREAS } from '../src/room/placement.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

export const W = 20 // the largest shell (tier 3): 20 wide, 19 tall
export const H = 19
const T = 16
const G = Object.fromEntries(TILE_NAMES.map((n, i) => [n, FIRSTGID + i]))

// Where the hub door is (wall tile) per tier; the portal is the floor tile in front of it.
export const DOORS = { 0: { x: 5, y: 8 }, 1: { x: 6, y: 9 }, 2: { x: 6, y: 9 }, 3: { x: 4, y: 18 } }
const BALCONY_GAP = [4, 5] // rows of the east wall left open to the balcony
const SECOND_ROOM_GAP = [6, 7] // columns of the south wall left open to the second room

function shellLayers(tier) {
  const floor = new Array(W * H).fill(0)
  const wall = new Array(W * H).fill(0)
  const decor = new Array(W * H).fill(0)
  const set = (layer, x, y, gid) => { layer[y * W + x] = gid }
  const [main, ...rest] = TIER_AREAS[tier]

  // Main room.
  const windows = tier === 0 ? [3, 7] : [3, 10]
  for (let y = main.y; y < main.y + main.h; y++) for (let x = main.x; x < main.x + main.w; x++) set(floor, x, y, G.floor_minimal)
  const right = main.x + main.w - 1
  const bottom = main.y + main.h - 1
  for (let x = main.x; x <= right; x++) {
    set(wall, x, main.y, x === main.x ? G.wall_minimal_tl : x === right ? G.wall_minimal_tr : windows.includes(x) ? G.window_day : G.wall_minimal_t)
    set(wall, x, bottom, x === DOORS[tier].x && DOORS[tier].y === bottom ? G.door : G.wall_minimal_b)
  }
  for (let y = main.y + 1; y < bottom; y++) {
    set(wall, main.x, y, G.wall_minimal_l)
    set(wall, right, y, G.wall_minimal_r)
  }
  for (let x = main.x + 1; x < right; x++) set(decor, x, main.y + 1, G.shadow_wall)

  // Lake balcony (tier ≥ 2): a deck east of the main room, a railing on its three outer sides, a
  // two-tile opening in the east wall.
  if (tier >= 2) {
    const b = rest[0]
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) set(floor, x, y, G.balcony_floor)
    const bRight = b.x + b.w - 1
    const bBottom = b.y + b.h - 1
    for (let x = b.x; x <= bRight; x++) {
      set(wall, x, b.y, x === bRight ? G.rail_tr : G.rail_t)
      set(wall, x, bBottom, x === bRight ? G.rail_br : G.rail_b)
    }
    for (let y = b.y + 1; y < bBottom; y++) set(wall, bRight, y, G.rail_r)
    for (const y of BALCONY_GAP) {
      set(wall, right, y, 0)
      set(floor, right, y, G.floor_minimal)
    }
  }

  // Second room (tier 3): south of the main room, joined by a two-tile passage through both walls.
  if (tier >= 3) {
    const r = rest[1]
    const rRight = r.x + r.w - 1
    const rBottom = r.y + r.h - 1
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(floor, x, y, G.floor_minimal)
    for (let x = r.x; x <= rRight; x++) {
      set(wall, x, r.y, x === r.x ? G.wall_minimal_tl : x === rRight ? G.wall_minimal_tr : G.wall_minimal_t)
      set(wall, x, rBottom, x === DOORS[3].x ? G.door : G.wall_minimal_b)
    }
    for (let y = r.y + 1; y < rBottom; y++) {
      set(wall, r.x, y, G.wall_minimal_l)
      set(wall, rRight, y, G.wall_minimal_r)
    }
    for (const x of SECOND_ROOM_GAP) {
      set(wall, x, bottom, 0)
      set(floor, x, bottom, G.floor_minimal)
      set(wall, x, r.y, 0)
      set(floor, x, r.y, G.floor_minimal)
    }
    for (let x = r.x + 1; x < rRight; x++) if (!SECOND_ROOM_GAP.includes(x)) set(decor, x, r.y + 1, G.shadow_wall)
  }
  return { floor, wall, decor }
}

export function buildRoom() {
  let nextId = 1
  const prop = (name, value, type = 'string') => ({ name, type, value })
  const obj = (name, r, props = []) => ({
    id: nextId++, name, type: '', x: r.x, y: r.y, width: r.width ?? 0, height: r.height ?? 0,
    rotation: 0, visible: true, point: false, ...(props.length ? { properties: props } : {}),
  })
  let layerId = 1
  const tileLayer = (name, data) => ({ data, height: H, id: layerId++, name, opacity: 1, type: 'tilelayer', visible: true, width: W, x: 0, y: 0 })
  const objLayer = (name, objects) => ({ draworder: 'topdown', id: layerId++, name, objects, opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0 })

  const layers = []
  for (const tier of [0, 1, 2, 3]) {
    const { floor, wall, decor } = shellLayers(tier)
    const sfx = tier === 0 ? '' : `_t${tier}`
    layers.push(tileLayer(`Floor${sfx}`, floor), tileLayer(`Wall${sfx}`, wall), tileLayer(`Decor${sfx}`, decor))
  }

  // The door leads out to the School Hub until the Hotbar's warp sheet replaces it. The portal is
  // the floor tile in front of the door (the door tile itself is a wall); one per tier.
  const portals = [0, 1, 2, 3].map((tier) => obj(`to_school_hub_t${tier}`, { x: DOORS[tier].x * T, y: (DOORS[tier].y - 1) * T, width: T, height: T }, [prop('target', 'school_hub'), prop('tier', tier, 'int')]))
  const spawns = [
    obj('entry', { x: 4 * T, y: 5 * T, width: T, height: T }, [prop('default', true, 'bool')]),
    ...[1, 2, 3].map((tier) => obj(`entry_t${tier}`, { x: 4 * T, y: 5 * T, width: T, height: T })),
  ]
  // Below the starter desk: standing here opens the focus setup (action roomSeat).
  const interactions = [obj('desk_seat', { x: 6 * T, y: 3 * T, width: 2 * T, height: T }, [prop('action', 'roomSeat'), prop('seatId', 'desk')])]
  layers.push(objLayer('Portals', portals), objLayer('Spawns', spawns), objLayer('Interactions', interactions))

  const map = {
    compressionlevel: -1, height: H, infinite: false,
    layers,
    nextlayerid: layerId, nextobjectid: nextId, orientation: 'orthogonal', renderorder: 'right-down',
    tiledversion: '1.12.2', tileheight: T, tilewidth: T, type: 'map', version: '1.10', width: W,
    tilesets: [{
      columns: 16, firstgid: FIRSTGID, image: 'room_tiles.png', imageheight: Math.ceil(TILE_NAMES.length / 16) * T,
      imagewidth: 16 * T, margin: 0, name: 'Room Tiles', spacing: 0, tilecount: TILE_NAMES.length, tileheight: T, tilewidth: T,
    }],
  }
  return { map }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { map } = buildRoom()
  const out = join(root, 'public/maps/room.json')
  writeFileSync(out, JSON.stringify(map))
  console.log(`wrote ${out} (${W}x${H}, tiers 0-3)`)
}
