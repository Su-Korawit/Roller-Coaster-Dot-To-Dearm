// School Hub tileset — 16×16 Soft Pixel tiles in a 16-column grid. Replaces the Sprout
// Lands gids the map was built from (scripts/buildSchoolHub.mjs). A tile's gid is
// FIRSTGID + its index in TILE_NAMES.
import { Canvas } from '../px.mjs'

export const FIRSTGID = 1

const O = '#5C4E92'
const O2 = '#6F63A6'
const G = '#9BCB8C'
const G2 = '#B6DCA0'
const G3 = '#7BC48C'
const G4 = '#4E8F5A'
const G5 = '#3F7A4A'
const WOOD = '#D6BC96'
const WOOD2 = '#CDB896'
const SAND = '#E8D2B2'
const SAND2 = '#DEC6A2'
const MIST = '#F4F3F9'
const LINE = '#D9D5EA'

const ROOFS = {
  sky: { a: '#A4D3EC', b: '#8FB0EE', hi: '#E1F3FB' },
  blue: { a: '#8FB0EE', b: '#5B8DEF', hi: '#BFD3F8' },
  red: { a: '#F8C3BF', b: '#E8817B', hi: '#FCECEB' },
  purple: { a: '#9B7BD6', b: '#6D5696', hi: '#E9E1FA' },
  green: { a: '#7BC48C', b: '#4E8F5A', hi: '#B6DCA0' },
}
const ROOF_PARTS = ['tl', 't', 'tr', 'tl2', 't2', 'tr2', 'ml', 'm', 'mr', 'bl2', 'b2', 'br2', 'bl', 'b', 'br']

// Deterministic noise in [0,1): same tile, same pixels, every build.
function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return ((h >>> 0) % 10000) / 10000
}

const table = []
const tile = (name, draw) => table.push([name, draw])

// ── ground ────────────────────────────────────────────────────────────────
function grassBase(c, salt = 0) {
  c.rect(0, 0, 16, 16, G)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = hash(x, y, salt)
      if (n < 0.07) c.px(x, y, G2)
      else if (n > 0.97) c.px(x, y, G3)
    }
  }
}

tile('grass', (c) => grassBase(c))
;[[6, 9, 8, 7, 10, 8], [4, 8, 7, 6, 11, 9], [5, 6, 9, 8, 12, 7]].forEach(([a, ay, b, by, d, dy], i) => {
  tile(`grass_tuft${i + 1}`, (c) => {
    grassBase(c, 1)
    c.vline(a, ay, 3, G3); c.vline(b, by, 4, G3); c.vline(d, dy, 3, G3)
    c.px(a, ay + 3, G4); c.px(b, by + 4, G4); c.px(d, dy + 3, G4)
  })
})
;[[8, 8, 5, 3], [7, 9, 6, 3], [9, 7, 4, 4], [8, 9, 6, 2]].forEach(([cx, cy, rx, ry], i) => {
  tile(`grass_patch${i + 1}`, (c) => {
    grassBase(c, 2)
    c.ellipse(cx, cy, rx, ry, G2)
    c.px(cx - 2, cy, G3); c.px(cx + 2, cy + 1, G3)
  })
})
;[['#FFFFFF', 5, 6], ['#F8C3BF', 10, 9]].forEach(([petal, x, y], i) => {
  tile(`grass_flower${i + 1}`, (c) => {
    grassBase(c, 3)
    c.px(x, y + 2, G4)
    ;[[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => c.px(x + dx, y + dy, petal))
    c.px(x, y, '#FFE08A')
  })
})

// Raised bed / path share one drawer: a filled region inset from the sides that carry an edge.
function edged(c, f, { fill, line, hi, inset, speck }) {
  grassBase(c)
  const x0 = f.l ? inset : 0
  const x1 = f.r ? 15 - inset : 15
  const y0 = f.t ? inset : 0
  const y1 = f.b ? 15 - inset : 15
  c.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, fill)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (hash(x, y, 5) < speck) c.px(x, y, hi)
  if (f.t) { c.hline(x0, y0, x1 - x0 + 1, line); c.hline(x0, y0 + 1, x1 - x0 + 1, hi) }
  if (f.b) { c.hline(x0, y1, x1 - x0 + 1, line) }
  if (f.l) { c.vline(x0, y0, y1 - y0 + 1, line); c.vline(x0 + 1, y0, y1 - y0 + 1, hi) }
  if (f.r) { c.vline(x1, y0, y1 - y0 + 1, line) }
  // round the outer corners
  const round = (cx, cy, dx, dy) => { c.px(cx, cy, G); c.px(cx + dx, cy, line); c.px(cx, cy + dy, line) }
  if (f.t && f.l) round(x0, y0, 1, 1)
  if (f.t && f.r) round(x1, y0, -1, 1)
  if (f.b && f.l) round(x0, y1, 1, -1)
  if (f.b && f.r) round(x1, y1, -1, -1)
}
const SIDES = { tl: { t: 1, l: 1 }, t: { t: 1 }, tr: { t: 1, r: 1 }, l: { l: 1 }, c: {}, r: { r: 1 }, bl: { b: 1, l: 1 }, b: { b: 1 }, br: { b: 1, r: 1 } }
for (const [name, f] of Object.entries(SIDES)) {
  tile(`lawn_${name}`, (c) => edged(c, f, { fill: G2, line: G4, hi: G3, inset: 1, speck: 0.06 }))
}
for (const [name, f] of Object.entries(SIDES)) {
  tile(`path_${name}`, (c) => edged(c, f, { fill: SAND, line: WOOD2, hi: SAND2, inset: 2, speck: 0.08 }))
}
tile('path_c2', (c) => {
  edged(c, {}, { fill: SAND, line: WOOD2, hi: SAND2, inset: 2, speck: 0.08 })
  c.px(4, 5, WOOD2); c.px(5, 5, WOOD2); c.px(11, 10, WOOD2); c.px(12, 10, WOOD2); c.px(8, 13, WOOD2)
})
// inner (concave) path corners: dirt everywhere except a rounded grass bite in one corner
const bite = (cx, cy, name) => tile(`path_${name}`, (c) => {
  edged(c, {}, { fill: SAND, line: WOOD2, hi: SAND2, inset: 2, speck: 0.08 })
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - cx, y - cy)
      if (d <= 5) c.px(x, y, G)
      else if (d <= 6) c.px(x, y, WOOD2)
    }
  }
})
bite(0, 0, 'nw'); bite(15, 0, 'ne'); bite(0, 15, 'sw'); bite(15, 15, 'se')

tile('floor', (c) => {
  c.rect(0, 0, 16, 16, '#F3E2C8')
  for (const y of [3, 7, 11, 15]) c.hline(0, y, 16, SAND)
  for (const [x, y] of [[4, 0], [11, 4], [6, 8], [13, 12]]) c.vline(x, y, 3, SAND)
})

// ── buildings ─────────────────────────────────────────────────────────────
function wallBase(c, f) {
  c.rect(0, 0, 16, 16, MIST)
  for (const y of [3, 7, 11, 15]) c.hline(0, y, 16, LINE)
  for (const [x, y] of [[3, 0], [11, 4], [7, 8], [13, 12]]) c.vline(x, y, 3, LINE)
  if (f.t) c.hline(0, 0, 16, O2)
  if (f.b) c.hline(0, 15, 16, O2)
  if (f.l) c.vline(0, 0, 16, O2)
  if (f.r) c.vline(15, 0, 16, O2)
}
const WALLS = { tl: { t: 1, l: 1 }, t: { t: 1 }, tr: { t: 1, r: 1 }, l: { l: 1 }, r: { r: 1 }, bl: { b: 1, l: 1 }, b: { b: 1 }, br: { b: 1, r: 1 } }
for (const [name, f] of Object.entries(WALLS)) tile(`wall_${name}`, (c) => wallBase(c, f))
tile('wall_window', (c) => {
  wallBase(c, { t: 1 })
  c.rbox(3, 3, 10, 10, 2, '#A4D3EC', O2)
  c.hline(4, 4, 4, '#E1F3FB'); c.vline(8, 4, 8, O2); c.hline(4, 8, 8, O2)
  c.hline(2, 13, 12, '#FFFFFF')
})
tile('wall_door', (c) => {
  wallBase(c, { b: 1 })
  c.rbox(3, 1, 10, 14, 4, WOOD, O2)
  c.rect(5, 4, 6, 10, WOOD2)
  c.vline(8, 4, 10, O2)
  c.px(10, 9, '#FFE08A'); c.px(6, 9, '#FFE08A')
})

// Roof pieces: 5 rows (scalloped top, shingles, ridge, shingles, scalloped bottom) × 3 columns.
function roofPiece(c, part, pal) {
  const row = { tl: 0, t: 0, tr: 0, tl2: 1, t2: 1, tr2: 1, ml: 2, m: 2, mr: 2, bl2: 3, b2: 3, br2: 3, bl: 4, b: 4, br: 4 }[part]
  const left = part.startsWith('tl') || part.startsWith('ml') || part.startsWith('bl')
  const right = part.startsWith('tr') || part.startsWith('mr') || part.startsWith('br')
  const top = row === 0 ? 6 : 0
  const bottom = row === 4 ? 8 : 15
  for (let x = 0; x < 16; x++) {
    const y0 = row === 0 ? top + (x % 4 < 2 ? 0 : 1) : 0
    const y1 = row === 4 ? bottom + (x % 4 < 2 ? 0 : 1) : 15
    for (let y = y0; y <= y1; y++) c.px(x, y, pal.a)
    for (let y = y0; y <= y1; y++) if (row !== 2 && (y % 4 === 3 || (y % 4 === 1 && (x + (y >> 2) * 2) % 4 === 0))) c.px(x, y, pal.b)
    if (row === 2) {
      for (let y = 5; y <= 10; y++) c.px(x, y, pal.hi)
      c.px(x, 4, pal.b); c.px(x, 11, pal.b)
    }
    if (row === 0) c.px(x, y0, O2)
    if (row === 4) c.px(x, y1, O2)
  }
  if (left) c.vline(0, row === 0 ? top : 0, row === 0 ? 10 : row === 4 ? 9 : 16, O2)
  if (right) c.vline(15, row === 0 ? top : 0, row === 0 ? 10 : row === 4 ? 9 : 16, O2)
}
for (const [colour, pal] of Object.entries(ROOFS)) {
  for (const part of ROOF_PARTS) tile(`roof_${colour}_${part}`, (c) => roofPiece(c, part, pal))
}

// ── trees: drawn once at 32×32, sliced into four tiles ────────────────────
function tree(canopy, shade, light) {
  const t = new Canvas(32, 32)
  t.rbox(12, 21, 8, 11, 2, WOOD, O2)
  t.vline(15, 23, 8, WOOD2)
  t.oval(16, 13, 12, 11, canopy, O2)
  t.ellipse(20, 18, 7, 4, shade)
  t.ellipse(11, 9, 5, 3, light)
  t.px(24, 12, shade); t.px(8, 16, shade)
  return t
}
const TREE_ART = [tree(G3, G4, G2), tree('#F8C3BF', '#E58BC0', '#FBEEF6')]
TREE_ART.forEach((art, i) => {
  ;[['tl', 0, 0], ['tr', 16, 0], ['bl', 0, 16], ['br', 16, 16]].forEach(([part, sx, sy]) => {
    tile(`tree${i + 1}_${part}`, (c) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) c.px(x, y, art.getPixel(sx + x, sy + y))
    })
  })
})

// ── small decor and furniture (transparent background) ────────────────────
;['#E8817B', '#E8A93B', '#5B8DEF', '#9B7BD6', '#E58BC0'].forEach((petal, i) => {
  tile(`flower${i + 1}`, (c) => {
    c.vline(8, 9, 6, G4); c.px(7, 12, G4); c.px(9, 11, G4)
    ;[[8, 5], [6, 7], [10, 7], [8, 9]].forEach(([x, y]) => c.rect(x - 1, y - 1, 2, 2, petal))
    c.rect(7, 6, 2, 2, '#FFE08A')
  })
})
;['#E8817B', '#BFD3F8', '#F8C3BF', '#E8A93B'].forEach((cap, i) => {
  tile(`mushroom${i + 1}`, (c) => {
    c.rbox(6, 9, 4, 6, 1, '#FFF6EA', O2)
    c.oval(8, 8, 5, 3, cap, O2)
    c.px(6, 7, '#FFFFFF'); c.px(10, 8, '#FFFFFF'); c.px(8, 6, '#FFFFFF')
  })
})
;[false, true].forEach((berries, i) => {
  tile(`bush${i + 1}`, (c) => {
    c.oval(8, 9, 6, 5, G3, G5)
    c.ellipse(6, 7, 2, 1, G2)
    if (berries) { c.px(5, 10, '#E8817B'); c.px(10, 9, '#E8817B'); c.px(8, 12, '#E8817B') }
  })
})
;[[7, 5], [6, 4], [8, 5], [5, 4]].forEach(([rx, ry], i) => {
  tile(`rock${i + 1}`, (c) => {
    c.oval(8, 9, rx - 1, ry - 1, '#D2CFE2', O2)
    c.hline(6, 7, 3, '#FFFFFF')
    if (i % 2) c.px(10, 10, O2)
  })
})
;[0, 1].forEach((i) => {
  tile(`stump${i + 1}`, (c) => {
    c.rbox(3, 7 + i, 10, 7, 2, WOOD2, O2)
    c.oval(8, 7 + i, 5, 3, SAND, O2)
    c.ellipse(8, 7 + i, 2, 1, SAND2)
  })
})
tile('log', (c) => {
  c.rbox(1, 5, 14, 8, 3, WOOD, O2)
  c.oval(3, 9, 2, 3, SAND, O2)
  c.hline(6, 7, 7, WOOD2); c.hline(6, 11, 7, WOOD2)
})
tile('sunflower_top', (c) => {
  c.oval(8, 9, 5, 5, '#FFE08A', '#E8A93B')
  c.ellipse(8, 9, 2, 2, '#8A5A00')
})
tile('sunflower_stem', (c) => {
  c.vline(8, 0, 16, G4); c.rect(9, 6, 3, 2, G3); c.rect(5, 10, 3, 2, G3)
})
;[['l', 1, 0], ['m', 0, 0], ['r', 0, 1]].forEach(([part, roundLeft, roundRight]) => {
  tile(`hedge_${part}`, (c) => {
    c.rrect(roundLeft ? 1 : 0, 3, 16 - (roundLeft ? 1 : 0) - (roundRight ? 1 : 0), 11, roundLeft || roundRight ? 4 : 0, G5)
    c.rrect(roundLeft ? 2 : 0, 4, 16 - (roundLeft ? 2 : 0) - (roundRight ? 2 : 0), 9, roundLeft || roundRight ? 3 : 0, G3)
    c.px(5, 6, G2); c.px(10, 8, G2); c.px(7, 10, G4)
  })
})
tile('bookshelf', (c) => {
  c.rbox(1, 0, 14, 16, 2, WOOD, O2)
  c.hline(2, 5, 12, O2); c.hline(2, 10, 12, O2)
  ;[['#E8817B', 3], ['#5B8DEF', 6], ['#E8A93B', 9], ['#9B7BD6', 12]].forEach(([col, x]) => {
    c.rect(x, 1, 2, 4, col); c.rect(x, 6, 2, 4, col); c.rect(x, 11, 2, 4, col)
  })
})
tile('chair_front', (c) => {
  c.rbox(3, 6, 10, 6, 2, '#BFD3F8', O2)
  c.rect(4, 12, 2, 3, O2); c.rect(10, 12, 2, 3, O2)
})
tile('chair_back', (c) => {
  c.rbox(3, 2, 10, 5, 2, '#8FB0EE', O2)
  c.rbox(3, 7, 10, 5, 2, '#BFD3F8', O2)
  c.rect(4, 12, 2, 3, O2); c.rect(10, 12, 2, 3, O2)
})
tile('table', (c) => {
  c.rbox(1, 4, 14, 8, 2, '#F3E2C8', O2)
  c.hline(3, 6, 10, SAND)
  c.rect(2, 12, 2, 3, WOOD2); c.rect(12, 12, 2, 3, WOOD2)
})
tile('plant', (c) => {
  c.rbox(4, 9, 8, 6, 2, '#F8C3BF', O2)
  c.oval(6, 6, 3, 3, G3, G5); c.oval(10, 6, 3, 3, G3, G5); c.oval(8, 4, 2, 3, G2, G5)
})
tile('fence_h', (c) => {
  c.rbox(0, 6, 16, 3, 1, SAND, O2)
  c.rbox(1, 3, 3, 10, 1, WOOD, O2); c.rbox(12, 3, 3, 10, 1, WOOD, O2)
})
tile('fence_v', (c) => {
  c.rbox(6, 0, 3, 16, 1, SAND, O2)
  c.rbox(4, 1, 8, 3, 1, WOOD, O2); c.rbox(4, 12, 8, 3, 1, WOOD, O2)
})

export const TILE_NAMES = table.map(([name]) => name)

export default {
  name: 'school_hub_tiles',
  frameW: 16,
  frameH: 16,
  columns: 16,
  sprites: Object.fromEntries(table.map(([name, draw]) => [name, { frames: 1, draw }])),
}
