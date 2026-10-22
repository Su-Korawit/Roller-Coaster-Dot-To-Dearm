// Generates public/maps/school_hub.json — the single authored map every School
// Server renders (ADR 0018). Deterministic: same input, same bytes, so the map
// is reviewable in git and regenerable. An artist can then open the JSON in Tiled,
// decorate, and re-upload through the Admin dashboard (`rc/`); re-running this
// script overwrites the file, so do that only for layout changes.
//
// Usage:  node scripts/buildSchoolHub.mjs
//
// Tiles come from the generated Soft Pixel tileset (node scripts/art/build.mjs schoolhub);
// the map declares that single tileset.
//
// Layer stack (bottom to top):
//   Grass   base meadow with texture variants
//   Lawn    raised garden beds (Grass autotile 3x3)
//   Path    autotiled dirt paths
//   Decor   flowers, mushrooms (walk-through)
//   Hill/Wall + Object   collision: walls, furniture, trunks, hedges, bushes, rocks
//   Canopy  tree tops, drawn ABOVE the player so avatars walk behind trees
//   Roof    building roofs, ABOVE the player; fades while the player is inside

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { TILE_NAMES, FIRSTGID } from './art/families/schoolhub.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

export const W = 56
export const H = 41
const T = 16

// ── gids ─────────────────────────────────────────────────────────────────
// Every tile comes from the generated Soft Pixel tileset (scripts/art/families/schoolhub.mjs);
// a gid is FIRSTGID + the tile's index in TILE_NAMES.
const G = Object.fromEntries(TILE_NAMES.map((name, i) => [name, FIRSTGID + i]))
const names = (prefix, n) => Array.from({ length: n }, (_, i) => G[`${prefix}${i + 1}`])
const GRASS = G.grass
const FLOOR = G.floor
const WALL = { TL: G.wall_tl, T: G.wall_t, TR: G.wall_tr, L: G.wall_l, R: G.wall_r, BL: G.wall_bl, B: G.wall_b, BR: G.wall_br, WINDOW: G.wall_window, DOOR: G.wall_door }
const PATH = { TL: G.path_tl, T: G.path_t, TR: G.path_tr, L: G.path_l, C: G.path_c, R: G.path_r, BL: G.path_bl, B: G.path_b, BR: G.path_br, C2: G.path_c2, NW: G.path_nw, NE: G.path_ne, SW: G.path_sw, SE: G.path_se }
const TREES = [1, 2].map((t) => ['tl', 'tr', 'bl', 'br'].map((p) => G[`tree${t}_${p}`]))   // [TL, TR, BL, BR]
const GRASS_TUFTS = names('grass_tuft', 3)
const GRASS_PATCHES = names('grass_patch', 4)
const GRASS_FLOWERS = names('grass_flower', 2)
const LAWN = { TL: G.lawn_tl, T: G.lawn_t, TR: G.lawn_tr, L: G.lawn_l, C: G.lawn_c, R: G.lawn_r, BL: G.lawn_bl, B: G.lawn_b, BR: G.lawn_br }
const HEDGE_H = { L: G.hedge_l, M: G.hedge_m, R: G.hedge_r }
const FLOWERS = names('flower', 5)
const MUSHROOMS = names('mushroom', 4)
const BUSHES = names('bush', 2)
const ROCKS = names('rock', 4)
const STUMPS = names('stump', 2)
const LOG = G.log
const SUNFLOWER = { top: G.sunflower_top, stem: G.sunflower_stem }
const roofSet = (colour) => Object.fromEntries(
  ['TL', 'T', 'TR', 'TL2', 'T2', 'TR2', 'ML', 'M', 'MR', 'BL2', 'B2', 'BR2', 'BL', 'B', 'BR'].map((p) => [p, G[`roof_${colour}_${p.toLowerCase()}`]]),
)
const F = { BOOKSHELF: G.bookshelf, CHAIR_FRONT: G.chair_front, CHAIR_BACK: G.chair_back, TABLE: G.table, PLANT: G.plant }
const FURN = 0   // furniture gids are already absolute in the Soft Pixel tileset

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
const pick = (arr, x, y, salt) => arr[Math.floor(hash(x, y, salt) * arr.length) % arr.length]

// ── layout (tile coordinates) ───────────────────────────────────────────────
export const LAYOUT = {
  library:  { x: 8,  y: 5,  w: 16, h: 7, doorway: [15, 16], roof: 'blue', ridgeShift: 0 },   // open doorway, walkable inside
  canteen:  { x: 28, y: 5,  w: 11, h: 7, door: 33, roof: 'red', ridgeShift: -1 },
  contest:  { x: 43, y: 5,  w: 9,  h: 7, door: 47, roof: 'purple', ridgeShift: 1 },
  guidance: { x: 8,  y: 21, w: 9,  h: 7, door: 12, roof: 'green', ridgeShift: 0 },
  hall:     { x: 39, y: 21, w: 9,  h: 7, door: 43, ridgeShift: -2 },
}
// Roof colours (each is a full 15-piece set in the tileset). A building without `roof` uses 'sky'.
export const ROOF_COLOURS = ['sky', 'blue', 'red', 'purple', 'green']
const SPAWN = { x: 27, y: 34 }
const SIGN = { x: 27, y: 20 }   // plaza notice board (leaderboard)

// Raised garden beds (Lawn layer): x, y, w, h  (each at least 3x3)
export const LAWNS = [
  [6, 17, 6, 3], [13, 17, 6, 3], [36, 17, 6, 3], [43, 17, 6, 3],
  [6, 34, 8, 3], [16, 34, 7, 3], [31, 34, 8, 3], [41, 34, 8, 3],
  [17, 22, 3, 4], [36, 22, 3, 4],
  // planters carved out of the plaza, leaving a promenade ring and a cross of open lanes
  [23, 19, 3, 2], [29, 19, 3, 2], [23, 24, 3, 2], [29, 24, 3, 2],
]
const PLAZA_BEDS = [[23, 19, 3, 2], [29, 19, 3, 2], [23, 24, 3, 2], [29, 24, 3, 2]]
// One-tile hedges (Object layer, collide) along building fronts. [x, y, length]
const HEDGES_H = [
  [9, 12, 5], [18, 12, 5], [29, 12, 3], [35, 12, 3], [44, 12, 2], [49, 12, 2],
  [8, 28, 3], [14, 28, 3], [39, 28, 3], [45, 28, 3],
]

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

// Roof, built the way the Sprout Lands pack draws it: a 5-row piece (scalloped top edge, shingles,
// ONE ridge band, shingles, scalloped bottom edge). Extra height repeats shingle rows only - never the
// band row, which would stripe the roof. The scalloped bottom edge is half transparent on purpose: it
// overhangs the plank front wall, so the roof runs from one row above the top wall down onto the front
// wall row, leaving only the door / doorway cells open.
function roof(L, b) {
  const { x, y, w, h } = b
  const top = y - 1
  const rows = h + 1                    // y-1 .. y+h-1
  const R = roofSet(b.roof ?? 'sky')
  // Each building sits its ridge band a little differently so the roofs do not read as copies.
  const ridge = Math.min(rows - 3, Math.max(2, Math.floor((rows - 1) / 2) + (b.ridgeShift ?? 0)))
  for (let r = 0; r < rows; r++) {
    let set
    if (r === 0) set = [R.TL, R.T, R.TR]
    else if (r === rows - 1) set = [R.BL, R.B, R.BR]
    else if (r === ridge) set = [R.ML, R.M, R.MR]
    else if (r < ridge) set = [R.TL2, R.T2, R.TR2]
    else set = [R.BL2, R.B2, R.BR2]
    for (let c = 0; c < w; c++) {
      const cx = x + c
      const front = r === rows - 1
      if (front && ((b.door != null && cx === b.door) || (b.doorway && cx >= b.doorway[0] && cx <= b.doorway[1]))) continue
      L.roof[idx(cx, top + r)] = c === 0 ? set[0] : c === w - 1 ? set[2] : set[1]
    }
  }
}

// A 2x2 tree: trunk row collides (Object); the canopy row is drawn above the player.
function tree(L, tx, ty, variant) {
  const [a, b, c, d] = TREES[variant]
  const cells = [[tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]]
  if (!cells.every(([cx, cy]) => inb(cx, cy) && !L.object[idx(cx, cy)] && !L.canopy[idx(cx, cy)])) return false
  L.canopy[idx(tx, ty)] = a; L.canopy[idx(tx + 1, ty)] = b
  L.object[idx(tx, ty + 1)] = c; L.object[idx(tx + 1, ty + 1)] = d
  return true
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
  const L = {
    grass: layer(), lawn: layer(), path: layer(), decor: layer(),
    wall: layer(), object: layer(), canopy: layer(), roof: layer(),
  }
  L.grass.fill(GRASS)

  // Buildings + roofs
  for (const b of Object.values(LAYOUT)) { house(L, b); roof(L, b) }

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
  for (const [bx, by, bw, bh] of PLAZA_BEDS) {   // planters: grass shows through the plaza
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) mask[idx(x, y)] = false
  }
  const { layer: pathLayer, unresolved } = autotilePaths(mask)
  L.path = pathLayer

  // ── Ground texture: tufts, darker patches and tiny flowers on the base meadow ──
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (L.grass[idx(x, y)] !== GRASS) continue
    const r = hash(x, y, 21)
    if (r < 0.10) L.grass[idx(x, y)] = pick(GRASS_TUFTS, x, y, 22)
    else if (r < 0.135) L.grass[idx(x, y)] = pick(GRASS_PATCHES, x, y, 23)
    else if (r < 0.15) L.grass[idx(x, y)] = pick(GRASS_FLOWERS, x, y, 24)
  }

  // ── Raised garden beds (Lawn layer) with flowers inside ──
  const lawnCells = new Set()
  for (const [lx, ly, lw, lh] of LAWNS) {
    for (let y = ly; y < ly + lh; y++) for (let x = lx; x < lx + lw; x++) {
      if (mask[idx(x, y)] || L.wall[idx(x, y)] || L.object[idx(x, y)]) continue
      const top = y === ly, bot = y === ly + lh - 1, left = x === lx, right = x === lx + lw - 1
      L.lawn[idx(x, y)] = top ? (left ? LAWN.TL : right ? LAWN.TR : LAWN.T)
        : bot ? (left ? LAWN.BL : right ? LAWN.BR : LAWN.B)
        : left ? LAWN.L : right ? LAWN.R : LAWN.C
      lawnCells.add(idx(x, y))
      if (!top && !bot && !left && !right && hash(x, y, 31) < 0.5) L.decor[idx(x, y)] = pick(FLOWERS, x, y, 32)
    }
  }

  // ── Hedges along building fronts (collide) ──
  for (const [hx, hy, len] of HEDGES_H) {
    for (let i = 0; i < len; i++) {
      const x = hx + i
      if (!inb(x, hy) || mask[idx(x, hy)] || L.wall[idx(x, hy)] || L.object[idx(x, hy)]) continue
      L.object[idx(x, hy)] = i === 0 ? HEDGE_H.L : i === len - 1 ? HEDGE_H.R : HEDGE_H.M
    }
  }

  // ── Border trees (canopy above the player, trunks collide) ──
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

  // ── Scatter: meadow props, kept clear of paths, buildings and the zones players must reach ──
  const near = (x, y, r, pred) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const cx = x + dx, cy = y + dy
      if (inb(cx, cy) && pred(cx, cy)) return true
    }
    return false
  }
  const solidish = (cx, cy) => mask[idx(cx, cy)] || L.wall[idx(cx, cy)] || L.object[idx(cx, cy)] || L.canopy[idx(cx, cy)]
  const free = (x, y) => inb(x, y) && !solidish(x, y) && !lawnCells.has(idx(x, y)) && !L.decor[idx(x, y)]
  const clearOfPaths = (x, y, r) => !near(x, y, r, (cx, cy) => mask[idx(cx, cy)] || L.wall[idx(cx, cy)])
  const inBand = (x, y) => x >= 4 && x < W - 4 && y >= 4 && y < H - 4

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inBand(x, y) || !free(x, y)) continue
    const r = hash(x, y, 41)
    // walk-through ground cover
    if (r < 0.05) { L.decor[idx(x, y)] = pick(FLOWERS, x, y, 42); continue }
    if (r < 0.065) { L.decor[idx(x, y)] = pick(MUSHROOMS, x, y, 43); continue }
    // solid props: keep 2 tiles clear of paths/buildings so no corridor is ever pinched
    if (!clearOfPaths(x, y, 1) || near(x, y, 1, (cx, cy) => L.object[idx(cx, cy)] || L.canopy[idx(cx, cy)])) continue
    if (r < 0.09) L.object[idx(x, y)] = pick(BUSHES, x, y, 44)
    else if (r < 0.105) L.object[idx(x, y)] = pick(ROCKS, x, y, 45)
    else if (r < 0.115) L.object[idx(x, y)] = pick(STUMPS, x, y, 46)
    else if (r < 0.12) L.object[idx(x, y)] = LOG
    else if (r < 0.135 && free(x, y + 1) && clearOfPaths(x, y + 1, 2)) {
      L.decor[idx(x, y)] = SUNFLOWER.top
      L.decor[idx(x, y + 1)] = SUNFLOWER.stem
    }
  }
  // a few free-standing trees in the open meadows (3 tiles off any path)
  for (let y = 5; y < H - 6; y += 3) for (let x = 4; x < W - 6; x += 3) {
    if (hash(x, y, 51) > 0.45) continue
    if (!clearOfPaths(x, y, 2)) continue
    if (near(x, y, 2, (cx, cy) => lawnCells.has(idx(cx, cy)))) continue
    tree(L, x, y, v(x, y + 1))
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
    label('ห้องสมุด', lib.x + lib.w / 2, lib.y - 1),
    label('โรงอาหาร / ข่าว', LAYOUT.canteen.x + LAYOUT.canteen.w / 2, LAYOUT.canteen.y - 1),
    label('ประกวด / ค่าย', LAYOUT.contest.x + LAYOUT.contest.w / 2, LAYOUT.contest.y - 1),
    label('ห้องแนะแนว', LAYOUT.guidance.x + LAYOUT.guidance.w / 2, LAYOUT.guidance.y - 1),
    label('ทำเนียบ', LAYOUT.hall.x + LAYOUT.hall.w / 2, LAYOUT.hall.y - 1),
    label('อันดับโรงเรียน', SIGN.x + 0.5, SIGN.y),
  ]

  const spawns = [obj('entry', { x: SPAWN.x * T, y: SPAWN.y * T, width: T, height: T }, [prop('default', true, 'bool')])]
  const portals = [obj('to_world', { x: 26 * T, y: 36 * T, width: 3 * T, height: T }, [prop('target', 'test3')])]

  // Roamers: ambient wildlife the scene spawns (not tiles). Each wanders inside `radius` px of its start.
  const critters = [
    ['chicken', 20, 18.5], ['chicken', 38, 18.5], ['chicken', 10, 35], ['chicken', 36, 35.5],
    ['chicken', 46, 35], ['cow', 8, 18.5], ['cow', 46, 18.5], ['cow', 19, 35],
  ].map(([kind, tx, ty]) => obj(kind, { x: tx * T, y: ty * T, width: T, height: T }, [prop('kind', kind), prop('radius', 40, 'int')]))

  const tileLayer = (id, name, data, visible = true) => ({ data, height: H, id, name, opacity: 1, type: 'tilelayer', visible, width: W, x: 0, y: 0 })
  const objLayer = (id, name, objects) => ({ draworder: 'topdown', id, name, objects, opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0 })

  const tilesets = [{
    columns: 16, firstgid: FIRSTGID, image: 'school_hub_tiles.png', imageheight: Math.ceil(TILE_NAMES.length / 16) * T,
    imagewidth: 16 * T, margin: 0, name: 'School Hub Tiles', spacing: 0, tilecount: TILE_NAMES.length, tileheight: T, tilewidth: T,
  }]

  const map = {
    compressionlevel: -1, height: H, infinite: false,
    layers: [
      tileLayer(1, 'Grass', L.grass),
      tileLayer(2, 'Lawn', L.lawn),
      tileLayer(3, 'Path', L.path),
      tileLayer(4, 'Decor', L.decor),
      tileLayer(5, 'Hill/Wall', L.wall),
      tileLayer(6, 'Object', L.object),
      tileLayer(7, 'Canopy', L.canopy),
      tileLayer(8, 'Roof', L.roof),
      objLayer(9, 'Portals', portals),
      objLayer(10, 'Spawns', spawns),
      objLayer(11, 'Interactions', interactions),
      objLayer(12, 'Labels', labels),
      objLayer(13, 'Critters', critters),
    ],
    nextlayerid: 14, nextobjectid: nextId, orientation: 'orthogonal', renderorder: 'right-down',
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
