// Generates public/maps/school_hub.json — the single authored map every School
// Server renders (ADR 0018). Deterministic: same input, same bytes, so the map
// is reviewable in git and regenerable. An artist can then open the JSON in Tiled,
// decorate, and re-upload through the Admin dashboard (`rc/`); re-running this
// script overwrites the file, so do that only for layout changes.
//
// Usage:  node scripts/buildSchoolHub.mjs
//
// Tile ids are Sprout Lands gids taken from public/maps/test3.json (same
// tileset firstgids, so they stay valid). Path autotiling rules were derived
// from test3's Path layer (Tilled_Dirt_Wide, gids 407-431 + 434/435/423/424).

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

export const W = 56
export const H = 41
const T = 16

// ── gids ────────────────────────────────────────────────────────────────────
const GRASS = 13
const FLOOR = 97
const WALL = { TL: 89, T: 90, TR: 91, L: 96, R: 98, BL: 103, B: 104, BR: 105, WINDOW: 83, DOOR: 92 }
const PATH = { TL: 407, T: 408, TR: 409, L: 418, C: 419, R: 420, BL: 429, B: 430, BR: 431, C2: 463, NW: 435, NE: 434, SW: 424, SE: 423 }
const TREES = [[577, 578, 586, 587], [579, 580, 588, 589]]   // [TL, TR, BL, BR]
const FLOWERS = [600, 601, 602, 608, 609, 610]
const F = { BOOKSHELF: 22, CHAIR_FRONT: 25, CHAIR_BACK: 26, TABLE: 31, PLANT: 5 }   // Basic_Furniture (firstgid 637 -> +636)
const FURN = 636

// Tileset firstgids are copied from test3 so gids stay valid; Basic_Furniture is appended.
const KEEP_TILESETS = ['Grass', 'Wooden House', 'Tilled_Dirt_Wide', 'Basic Grass Biom things 1', 'Fences']

// ── grid helpers ────────────────────────────────────────────────────────────
const idx = (x, y) => y * W + x
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H
const layer = () => new Array(W * H).fill(0)

function fill(l, x0, y0, w, h, gid) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inb(x, y)) l[idx(x, y)] = gid
}

// Deterministic pseudo-random in [0,1) from integers (no Math.random: reproducible output).
function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return ((h >>> 0) % 10000) / 10000
}

// ── layout (tile coordinates) ───────────────────────────────────────────────
export const LAYOUT = {
  library:  { x: 8,  y: 5,  w: 16, h: 7, doorway: [15, 16] },   // open doorway, walkable inside
  canteen:  { x: 28, y: 5,  w: 11, h: 7, door: 33 },
  contest:  { x: 43, y: 5,  w: 9,  h: 7, door: 47 },
  guidance: { x: 8,  y: 21, w: 9,  h: 7, door: 12 },
  hall:     { x: 39, y: 21, w: 9,  h: 7, door: 43 },
}
const SPAWN = { x: 27, y: 34 }
const SIGN = { x: 27, y: 20 }   // plaza notice board (leaderboard)

function house(L, b) {
  const { x, y, w, h } = b
  const wall = L.wall
  const bottom = y + h - 1
  for (let cx = x + 1; cx < x + w - 1; cx++) {
    wall[idx(cx, y)] = WALL.T
    wall[idx(cx, bottom)] = WALL.B
  }
  wall[idx(x, y)] = WALL.TL; wall[idx(x + w - 1, y)] = WALL.TR
  wall[idx(x, bottom)] = WALL.BL; wall[idx(x + w - 1, bottom)] = WALL.BR
  for (let cy = y + 1; cy < bottom; cy++) { wall[idx(x, cy)] = WALL.L; wall[idx(x + w - 1, cy)] = WALL.R }
  fill(L.grass, x + 1, y + 1, w - 2, h - 1, FLOOR)
  // a window every 4 tiles along the top wall
  for (let cx = x + 2; cx < x + w - 2; cx += 4) wall[idx(cx, y)] = WALL.WINDOW
  if (b.door != null) wall[idx(b.door, bottom)] = WALL.DOOR
  if (b.doorway) for (let cx = b.doorway[0]; cx <= b.doorway[1]; cx++) wall[idx(cx, bottom)] = 0
}

function tree(L, tx, ty, variant) {
  const [a, b, c, d] = TREES[variant]
  const cells = [[tx, ty, a], [tx + 1, ty, b], [tx, ty + 1, c], [tx + 1, ty + 1, d]]
  if (!cells.every(([cx, cy]) => inb(cx, cy) && !L.object[idx(cx, cy)])) return
  for (const [cx, cy, g] of cells) L.object[idx(cx, cy)] = g
}

// 8-neighbour autotile over a boolean mask. Returns { layer, unresolved } where
// unresolved lists cells that matched no tile (1-wide corridors) — the build
// test asserts there are none.
function autotilePaths(mask) {
  const out = layer()
  const unresolved = []
  const has = (x, y) => inb(x, y) && mask[idx(x, y)]
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!mask[idx(x, y)]) continue
      const n = has(x, y - 1), e = has(x + 1, y), s = has(x, y + 1), w = has(x - 1, y)
      const missing = [!n, !e, !s, !w].filter(Boolean).length
      let g = null
      if (missing === 0) {
        if (!has(x - 1, y - 1)) g = PATH.NW
        else if (!has(x + 1, y - 1)) g = PATH.NE
        else if (!has(x - 1, y + 1)) g = PATH.SW
        else if (!has(x + 1, y + 1)) g = PATH.SE
        else g = hash(x, y, 7) < 0.08 ? PATH.C2 : PATH.C
      } else if (missing === 1) {
        g = !n ? PATH.T : !s ? PATH.B : !w ? PATH.L : PATH.R
      } else if (missing === 2 && !(n === s) && !(e === w)) {
        g = (!n && !w) ? PATH.TL : (!n && !e) ? PATH.TR : (!s && !w) ? PATH.BL : PATH.BR
      }
      if (g == null) { unresolved.push([x, y]); g = PATH.C }
      out[idx(x, y)] = g
    }
  }
  return { layer: out, unresolved }
}

export function buildSchoolHub() {
  const test3 = JSON.parse(readFileSync(join(root, 'public/maps/test3.json'), 'utf8'))
  const indoor = JSON.parse(readFileSync(join(root, 'public/maps/indoor.json'), 'utf8'))

  const L = { grass: layer(), path: layer(), decor: layer(), wall: layer(), object: layer(), roof: layer() }
  L.grass.fill(GRASS)

  // Buildings
  for (const b of Object.values(LAYOUT)) house(L, b)

  // ── Library interior (walkable): bookshelves, 4 tables with a chair on each side ──
  const lib = LAYOUT.library
  const libInner = { x0: lib.x + 1, x1: lib.x + lib.w - 2, y0: lib.y + 1, y1: lib.y + lib.h - 2 }
  const aisle = (x) => x >= lib.doorway[0] && x <= lib.doorway[1]
  for (let x = libInner.x0; x <= libInner.x1; x++) if (!aisle(x)) L.object[idx(x, libInner.y0)] = FURN + F.BOOKSHELF
  const seats = []
  let seatNo = 1
  for (const tx of [10, 13, 18, 21]) {
    const ty = libInner.y0 + 2      // table row
    L.object[idx(tx, ty)] = FURN + F.TABLE
    L.object[idx(tx, ty - 1)] = FURN + F.CHAIR_FRONT
    L.object[idx(tx, ty + 1)] = FURN + F.CHAIR_BACK
    seats.push({ id: `lib-${seatNo++}`, x: tx, y: ty - 1 }, { id: `lib-${seatNo++}`, x: tx, y: ty + 1 })
  }
  L.object[idx(libInner.x0, libInner.y1)] = FURN + F.PLANT
  L.object[idx(libInner.x1, libInner.y1)] = FURN + F.PLANT

  // Closed buildings get a little furniture so the brick floor does not look empty.
  for (const b of [LAYOUT.canteen, LAYOUT.contest, LAYOUT.guidance, LAYOUT.hall]) {
    const cy = b.y + 3
    L.object[idx(b.x + 2, cy)] = FURN + F.TABLE
    L.object[idx(b.x + b.w - 3, cy)] = FURN + F.TABLE
    L.object[idx(b.x + 1, b.y + 1)] = FURN + F.PLANT
  }

  // ── Paths ──
  const mask = new Array(W * H).fill(false)
  const rect = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inb(x, y)) mask[idx(x, y)] = true }
  rect(5, 14, 46, 3)      // road A
  rect(5, 30, 46, 3)      // road B
  rect(26, 14, 3, 23)     // avenue (spawn -> exit)
  rect(21, 17, 13, 11)    // plaza
  rect(14, 12, 4, 2)      // library stub
  rect(32, 12, 3, 2)      // canteen stub
  rect(46, 12, 3, 2)      // contest stub
  rect(11, 28, 3, 2)      // guidance stub
  rect(42, 28, 3, 2)      // hall stub
  const { layer: pathLayer, unresolved } = autotilePaths(mask)
  L.path = pathLayer

  // ── Border trees (collision, Object layer) ──
  const v = (x, y) => (hash(x, y, 3) < 0.5 ? 0 : 1)
  for (let x = 0; x < W; x += 2) {
    tree(L, x, 0, v(x, 0)); tree(L, x, H - 2, v(x, 1))
    tree(L, x + 1, 2, v(x, 2)); tree(L, x + 1, H - 4, v(x, 3))
  }
  for (let y = 0; y < H; y += 2) {
    tree(L, 0, y, v(0, y)); tree(L, W - 2, y, v(1, y))
    tree(L, 2, y + 1, v(2, y)); tree(L, W - 4, y + 1, v(3, y))
  }

  // Plaza notice board (leaderboard): a cabinet reads as a board until the artist replaces it.
  L.object[idx(SIGN.x, SIGN.y)] = FURN + F.BOOKSHELF

  // ── Flowers: non-colliding Decor, only on plain grass away from everything ──
  const busy = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = x + dx, cy = y + dy
      if (inb(cx, cy) && (mask[idx(cx, cy)] || L.wall[idx(cx, cy)] || L.object[idx(cx, cy)] || L.grass[idx(cx, cy)] !== GRASS)) return true
    }
    return false
  }
  for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
    if (!busy(x, y) && hash(x, y, 11) < 0.045) L.decor[idx(x, y)] = FLOWERS[Math.floor(hash(x, y, 13) * FLOWERS.length)]
  }

  // ── Objects ──
  const door = (b) => ({ x: (b.door - 1) * T, y: (b.y + b.h) * T, width: 3 * T, height: T })
  let nextId = 1
  const prop = (name, value, type = 'string') => ({ name, type, value })
  const obj = (name, r, props = []) => ({ id: nextId++, name, type: '', x: r.x, y: r.y, width: r.width ?? 0, height: r.height ?? 0, rotation: 0, visible: true, point: false, ...(props.length ? { properties: props } : {}) })

  const interactions = [
    ...seats.map((s) => obj(s.id, { x: (s.x - 1) * T + 4, y: (s.y - 1) * T + 4, width: 3 * T - 8, height: 3 * T - 8 },
      [prop('action', 'focusSeat'), prop('seatId', s.id)])),
    obj('canteen_board', door(LAYOUT.canteen), [prop('action', 'board'), prop('boardId', 'news')]),
    obj('contest_board', door(LAYOUT.contest), [prop('action', 'board'), prop('boardId', 'contest')]),
    obj('leaderboard_board', { x: (SIGN.x - 1) * T, y: (SIGN.y + 1) * T, width: 3 * T, height: T }, [prop('action', 'board'), prop('boardId', 'leaderboard')]),
    obj('guidance_door', door(LAYOUT.guidance), [prop('action', 'tool'), prop('route', '/roadmap')]),
    obj('hall_door', door(LAYOUT.hall), [prop('action', 'tool'), prop('route', 'view:profile')]),
  ]

  // Labels render with a white stroke (worldScenes), so the fill must be dark to be legible.
  const label = (text, cx, cy, color = '#1a1035') => obj(`label_${text}`, { x: cx * T, y: cy * T }, [prop('text', text), prop('color', color)])
  const labels = [
    label('ห้องสมุด', lib.x + lib.w / 2, lib.y),
    label('โรงอาหาร / ข่าว', LAYOUT.canteen.x + LAYOUT.canteen.w / 2, LAYOUT.canteen.y),
    label('ประกวด / ค่าย', LAYOUT.contest.x + LAYOUT.contest.w / 2, LAYOUT.contest.y),
    label('ห้องแนะแนว', LAYOUT.guidance.x + LAYOUT.guidance.w / 2, LAYOUT.guidance.y),
    label('ทำเนียบ', LAYOUT.hall.x + LAYOUT.hall.w / 2, LAYOUT.hall.y),
    label('อันดับโรงเรียน', SIGN.x + 0.5, SIGN.y),
  ]

  const spawns = [obj('entry', { x: SPAWN.x * T, y: SPAWN.y * T, width: T, height: T }, [prop('default', true, 'bool')])]
  const portals = [obj('to_world', { x: 26 * T, y: 36 * T, width: 3 * T, height: T }, [prop('target', 'test3'), prop('targetSpawn', '')])]
  // Tiled stores an unset string as '', which parseMapMeta would hand to the scene; keep the property
  // out entirely so the scene falls back to the target map's default spawn.
  portals[0].properties = portals[0].properties.filter((p) => p.name === 'target')

  const tileLayer = (id, name, data, visible = true) => ({ data, height: H, id, name, opacity: 1, type: 'tilelayer', visible, width: W, x: 0, y: 0 })
  const objLayer = (id, name, objects) => ({ draworder: 'topdown', id, name, objects, opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0 })

  const tilesets = [
    ...test3.tilesets.filter((t) => KEEP_TILESETS.includes(t.name)),
    { ...indoor.tilesets.find((t) => t.name === 'Basic_Furniture'), firstgid: FURN + 1 },
  ]

  const map = {
    compressionlevel: -1, height: H, infinite: false,
    layers: [
      tileLayer(1, 'Grass', L.grass),
      tileLayer(2, 'Path', L.path),
      tileLayer(3, 'Decor', L.decor),
      tileLayer(4, 'Hill/Wall', L.wall),
      tileLayer(5, 'Object', L.object),
      tileLayer(6, 'Roof', L.roof, false),
      objLayer(7, 'Portals', portals),
      objLayer(8, 'Spawns', spawns),
      objLayer(9, 'Interactions', interactions),
      objLayer(10, 'Labels', labels),
    ],
    nextlayerid: 11, nextobjectid: nextId, orientation: 'orthogonal', renderorder: 'right-down',
    tiledversion: '1.12.2', tileheight: T, tilesets, tilewidth: T, type: 'map', version: '1.10', width: W,
  }
  return { map, unresolvedPathCells: unresolved, seats }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { map, unresolvedPathCells } = buildSchoolHub()
  if (unresolvedPathCells.length) {
    console.error('unresolved path cells (1-wide corridor?):', unresolvedPathCells)
    process.exit(1)
  }
  const out = join(root, 'public/maps/school_hub.json')
  writeFileSync(out, JSON.stringify(map))
  console.log(`wrote ${out} (${W}x${H})`)
}
