// Generates public/maps/room.json — the starter study room (11×9 tiles). Deterministic: the
// same input gives the same bytes. Tiles come from the generated Soft Pixel room tileset
// (node scripts/art/build.mjs room). Furniture is NOT in the map: it is sprites placed from
// the student's saved layout (src/game/roomRender.js).
//
// Usage:  node scripts/buildRoom.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { TILE_NAMES, FIRSTGID } from './art/families/room.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

export const W = 11
export const H = 9
const T = 16
const G = Object.fromEntries(TILE_NAMES.map((n, i) => [n, FIRSTGID + i]))

const DOOR_X = 5
const WINDOWS_X = [3, 7]

export function buildRoom() {
  const floor = new Array(W * H).fill(G.floor_minimal)
  const wall = new Array(W * H).fill(0)
  const decor = new Array(W * H).fill(0)
  const set = (layer, x, y, gid) => { layer[y * W + x] = gid }

  for (let x = 0; x < W; x++) {
    set(wall, x, 0, x === 0 ? G.wall_minimal_tl : x === W - 1 ? G.wall_minimal_tr : WINDOWS_X.includes(x) ? G.window_day : G.wall_minimal_t)
    set(wall, x, H - 1, x === DOOR_X ? G.door : G.wall_minimal_b)
  }
  for (let y = 1; y < H - 1; y++) {
    set(wall, 0, y, G.wall_minimal_l)
    set(wall, W - 1, y, G.wall_minimal_r)
  }
  for (let x = 1; x < W - 1; x++) set(decor, x, 1, G.shadow_wall)

  let nextId = 1
  const prop = (name, value, type = 'string') => ({ name, type, value })
  const obj = (name, r, props = []) => ({
    id: nextId++, name, type: '', x: r.x, y: r.y, width: r.width ?? 0, height: r.height ?? 0,
    rotation: 0, visible: true, point: false, ...(props.length ? { properties: props } : {}),
  })
  const tileLayer = (id, name, data) => ({ data, height: H, id, name, opacity: 1, type: 'tilelayer', visible: true, width: W, x: 0, y: 0 })
  const objLayer = (id, name, objects) => ({ draworder: 'topdown', id, name, objects, opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0 })

  // The door leads out to the School Hub until the Hotbar's warp sheet replaces it. The portal
  // is the floor tile in front of the door (the door tile itself is a wall).
  const portals = [obj('to_school_hub', { x: DOOR_X * T, y: (H - 2) * T, width: T, height: T }, [prop('target', 'school_hub')])]
  const spawns = [obj('entry', { x: 4 * T, y: 5 * T, width: T, height: T }, [prop('default', true, 'bool')])]
  // Below the starter desk: standing here opens the focus setup (action roomSeat).
  const interactions = [obj('desk_seat', { x: 6 * T, y: 3 * T, width: 2 * T, height: T }, [prop('action', 'roomSeat'), prop('seatId', 'desk')])]

  const map = {
    compressionlevel: -1, height: H, infinite: false,
    layers: [
      tileLayer(1, 'Floor', floor),
      tileLayer(2, 'Wall', wall),
      tileLayer(3, 'Decor', decor),
      objLayer(4, 'Portals', portals),
      objLayer(5, 'Spawns', spawns),
      objLayer(6, 'Interactions', interactions),
    ],
    nextlayerid: 7, nextobjectid: nextId, orientation: 'orthogonal', renderorder: 'right-down',
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
  console.log(`wrote ${out} (${W}x${H})`)
}
