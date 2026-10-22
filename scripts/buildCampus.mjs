// Generates public/maps/campus.json — the Open House campus (ADR-0026, 107×85 tiles). Deterministic:
// the same input gives the same bytes. Tiles come from the generated Soft Pixel tileset
// (node scripts/art/build.mjs campus). The 18 faculty buildings, the hall and the gate are NOT in
// the map: they are sprites placed from src/game/campusLayout.js (src/game/campusRender.js).
//
// Layer stack (bottom to top):
//   Ground   meadow, quad lawns, the rice field
//   Path     lanes, avenue, plazas, promenade, the bridge
//   Water    the lake and its shore (collision)
//   Object   fountain, stage, directory board, lamps, benches, signposts, tree trunks (collision)
//   Decor    flower beds (walk-through)
//   Canopy   tree tops and lamp heads, drawn above the player
//   Spawns / Interactions   the bridge spawn; one door strip per faculty and the directory board
//
// Usage:  node scripts/buildCampus.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { TILE_NAMES, FIRSTGID } from './art/families/campus.mjs'
import {
  MAP, PLACEMENTS, QUADS, AVENUE, PROMENADE_ROWS, LAKE_TOP, BRIDGE, SPAWN, RICE_FIELD, HALL,
  doorTile, footprints,
} from '../src/game/campusLayout.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const { w: W, h: H, tile: T } = MAP
const G = Object.fromEntries(TILE_NAMES.map((n, i) => [n, FIRSTGID + i]))

function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return ((h >>> 0) % 10000) / 10000
}

const FOUNTAIN = { x: 25, y: 31 } // west quad centre (3×3)
const STAGE = { x: 72, y: 31 } // east quad centre (4×2)
const WEST_PLAZA = { x: 22, y: 28, w: 9, h: 9 }
const EAST_PLAZA = { x: 70, y: 28, w: 9, h: 9 }
const HALL_PLAZA = { x: 45, y: 31, w: 11, h: 5 }
const BOARDS = [[49, 34], [50, 34]]
const DIRECTORY_ZONE = { x: 48, y: 35, w: 4, h: 1 }
const TREES = [[13, 14], [38, 14], [13, 44], [38, 44], [18, 20], [33, 40], [61, 14], [86, 14], [61, 44], [86, 44], [66, 20], [82, 40]]
const LAMP_ROWS = [12, 20, 38, 46, 54, 62]

export function buildCampus() {
  const layerData = () => new Array(W * H).fill(0)
  const ground = layerData()
  const path = layerData()
  const water = layerData()
  const object = layerData()
  const decor = layerData()
  const canopy = layerData()
  const set = (l, x, y, gid) => { if (x >= 0 && y >= 0 && x < W && y < H) l[y * W + x] = gid }
  const get = (l, x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : l[y * W + x])
  const fill = (l, x0, y0, w, h, gid) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(l, x, y, gid) }

  // Ground: meadow with tufts and a few flowers; lawns inside the quads; the rice field.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = hash(x, y, 1)
      set(ground, x, y, n < 0.05 ? G[`grass_tuft${1 + Math.floor(hash(x, y, 2) * 3)}`] : n < 0.065 ? G[`grass_flower${1 + Math.floor(hash(x, y, 3) * 2)}`] : G.grass)
    }
  }
  for (const q of [QUADS.west, QUADS.east]) {
    for (let y = QUADS.y; y < QUADS.y + QUADS.h; y++) for (let x = q.x; x < q.x + q.w; x++) set(ground, x, y, hash(x, y, 4) < 0.08 ? G.lawn_tuft : G.lawn)
  }
  for (let y = RICE_FIELD.y; y < RICE_FIELD.y + RICE_FIELD.h; y++) for (let x = RICE_FIELD.x; x < RICE_FIELD.x + RICE_FIELD.w; x++) set(ground, x, y, y % 3 === 0 ? G.rice_water : G.rice)

  // Paths: the lanes along every row of doors, the middle lane, the connectors, the avenue and the promenade.
  const isPath = new Set()
  const paint = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { set(path, x, y, G.path); isPath.add(`${x},${y}`) } }
  for (const q of [QUADS.west, QUADS.east]) {
    paint(q.x, 9, q.w, 2) // north lane (doors of the top row)
    paint(q.x, 57, q.w, 2) // south lane (doors of the bottom row)
  }
  paint(QUADS.west.x, 31, 100 - QUADS.west.x + 1, 3) // middle lane, west quad to the rice field
  paint(25, 9, 3, 50); paint(73, 9, 3, 50) // quad connectors
  paint(AVENUE.x, 9, AVENUE.w, 56) // avenue from the north lane to the promenade
  paint(0, PROMENADE_ROWS[0], W, PROMENADE_ROWS.length)
  // Edges where a path tile meets something else.
  const edged = []
  for (const key of isPath) {
    const [x, y] = key.split(',').map(Number)
    const has = (dx, dy) => isPath.has(`${x + dx},${y + dy}`)
    const name = !has(0, -1) ? 'path_n' : !has(0, 1) ? 'path_s' : !has(-1, 0) ? 'path_w' : !has(1, 0) ? 'path_e' : null
    if (name) edged.push([x, y, G[name]])
  }
  for (const [x, y, gid] of edged) set(path, x, y, gid)
  // Plazas (over the paths): the fountain square, the stage square and the hall forecourt.
  const plaza = (r) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(path, x, y, (x + y) % 2 ? G.plaza : G.plaza_dark) }
  plaza(WEST_PLAZA); plaza(EAST_PLAZA); plaza(HALL_PLAZA)

  // Lake: the shore row, then water with a few lily pads; the bridge is a path.
  for (let x = 0; x < W; x++) set(water, x, LAKE_TOP, G.shore_n)
  for (let y = LAKE_TOP + 1; y < H; y++) for (let x = 0; x < W; x++) set(water, x, y, hash(x, y, 5) < 0.04 ? G.lily : (x + y) % 3 === 0 ? G.water2 : G.water)
  for (let y = LAKE_TOP; y < H; y++) for (let x = BRIDGE.x; x < BRIDGE.x + BRIDGE.w; x++) { set(water, x, y, 0); set(path, x, y, G.bridge_v) }

  // Props.
  const fountain = [['nw', 'n', 'ne'], ['w', 'c', 'e'], ['sw', 's', 'se']]
  fountain.forEach((row, j) => row.forEach((part, i) => set(object, FOUNTAIN.x + i, FOUNTAIN.y + j, G[`fountain_${part}`])))
  ;['l', 'm', 'm', 'r'].forEach((part, i) => { set(object, STAGE.x + i, STAGE.y, G[`stage_back_${part}`]); set(object, STAGE.x + i, STAGE.y + 1, G[`stage_front_${part}`]) })
  for (const [x, y] of BOARDS) set(object, x, y, G.board)
  for (const [x, y] of TREES) {
    set(canopy, x, y, G.tree_tl); set(canopy, x + 1, y, G.tree_tr)
    set(object, x, y + 1, G.tree_bl); set(object, x + 1, y + 1, G.tree_br)
  }
  for (const y of LAMP_ROWS) for (const x of [AVENUE.x, AVENUE.x + AVENUE.w - 1]) { set(object, x, y, G.lamp_base); set(canopy, x, y - 1, G.lamp_top) }
  for (const [x, y] of [[22, 28], [30, 28], [22, 36], [30, 36], [70, 28], [78, 28], [70, 36], [78, 36]]) set(object, x, y, G.bench)
  for (const [x, y] of [[43, 30], [57, 30]]) set(object, x, y, G.signpost)
  for (const x of [45, 46, 53, 54]) set(decor, x, 28, (x + 1) % 2 ? G.flowerbed1 : G.flowerbed2)

  // Object layers.
  let nextId = 1
  const prop = (name, value, type = 'string') => ({ name, type, value })
  const obj = (name, r, props = []) => ({
    id: nextId++, name, type: '', x: r.x, y: r.y, width: r.width ?? 0, height: r.height ?? 0,
    rotation: 0, visible: true, point: false, ...(props.length ? { properties: props } : {}),
  })
  const tileLayer = (id, name, data) => ({ data, height: H, id, name, opacity: 1, type: 'tilelayer', visible: true, width: W, x: 0, y: 0 })
  const objLayer = (id, name, objects) => ({ draworder: 'topdown', id, name, objects, opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0 })

  const spawns = [obj('entry', { x: SPAWN.tx * T, y: SPAWN.ty * T, width: T, height: T }, [prop('default', true, 'bool')])]
  const interactions = [
    ...PLACEMENTS.map((p) => {
      const d = doorTile(p)
      return obj(`door_${p.id}`, { x: d.x * T, y: d.y * T, width: d.w * T, height: d.h * T }, [prop('action', 'building'), prop('buildingId', p.id)])
    }),
    obj('directory', { x: DIRECTORY_ZONE.x * T, y: DIRECTORY_ZONE.y * T, width: DIRECTORY_ZONE.w * T, height: DIRECTORY_ZONE.h * T }, [prop('action', 'directory')]),
  ]

  const map = {
    compressionlevel: -1, height: H, infinite: false,
    layers: [
      tileLayer(1, 'Ground', ground),
      tileLayer(2, 'Path', path),
      tileLayer(3, 'Water', water),
      tileLayer(4, 'Object', object),
      tileLayer(5, 'Decor', decor),
      tileLayer(6, 'Canopy', canopy),
      objLayer(7, 'Spawns', spawns),
      objLayer(8, 'Interactions', interactions),
    ],
    nextlayerid: 9, nextobjectid: nextId, orientation: 'orthogonal', renderorder: 'right-down',
    tiledversion: '1.12.2', tileheight: T, tilewidth: T, type: 'map', version: '1.10', width: W,
    tilesets: [{
      columns: 16, firstgid: FIRSTGID, image: 'campus_tiles.png', imageheight: Math.ceil(TILE_NAMES.length / 16) * T,
      imagewidth: 16 * T, margin: 0, name: 'Campus Tiles', spacing: 0, tilecount: TILE_NAMES.length, tileheight: T, tilewidth: T,
    }],
  }
  return { map }
}

// true = solid: the Water and Object layers plus every building / hall / gate-pillar footprint.
export function collisionGrid(map) {
  const grid = Array.from({ length: H }, () => new Array(W).fill(false))
  for (const name of ['Water', 'Object']) {
    const data = map.layers.find((l) => l.name === name).data
    for (let i = 0; i < data.length; i++) if (data[i]) grid[Math.floor(i / W)][i % W] = true
  }
  for (const r of footprints()) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[y][x] = true
  return grid
}

// Tiles reachable on foot from the spawn (4-neighbourhood).
export function reachable(grid, { tx, ty }) {
  const seen = new Set([`${tx},${ty}`])
  const queue = [[tx, ty]]
  while (queue.length) {
    const [x, y] = queue.shift()
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || grid[ny][nx] || seen.has(`${nx},${ny}`)) continue
      seen.add(`${nx},${ny}`)
      queue.push([nx, ny])
    }
  }
  return seen
}

void HALL

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { map } = buildCampus()
  const out = join(root, 'public/maps/campus.json')
  writeFileSync(out, JSON.stringify(map))
  console.log(`wrote ${out} (${W}x${H})`)
}
