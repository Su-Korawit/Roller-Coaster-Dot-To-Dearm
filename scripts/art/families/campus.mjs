// Open House campus tileset — 16×16 Soft Pixel tiles in a 16-column grid (ADR-0026): meadow,
// lawns, plaza, promenade, lake, bridge, trees, fountain, stage and wayfinding props. A tile's
// gid is FIRSTGID + its index in TILE_NAMES. The 18 faculty buildings are sprites
// (campusbuildings.mjs), not tiles.
import { Canvas } from '../px.mjs'

export const FIRSTGID = 1

const O = '#5C4E92'
const O2 = '#6F63A6'
const G = '#9BCB8C'
const G2 = '#B6DCA0'
const G3 = '#7BC48C'
const G4 = '#4E8F5A'
const G5 = '#3F7A4A'
const SAND = '#E8D2B2'
const SAND2 = '#DEC6A2'
const WOOD = '#D6BC96'
const WOOD2 = '#CDB896'
const MIST = '#F4F3F9'
const LINE = '#D9D5EA'
const WATER = '#A4D3EC'
const WATER2 = '#8FB0EE'
const WATER_HI = '#E1F3FB'
const STONE = '#E9E6F3'
const STONE2 = '#D9D5EA'

function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return ((h >>> 0) % 10000) / 10000
}

const table = []
const tile = (name, draw) => table.push([name, draw])

function grassBase(c, salt = 0, base = G, spot = G2, dark = G3) {
  c.rect(0, 0, 16, 16, base)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = hash(x, y, salt)
      if (n < 0.07) c.px(x, y, spot)
      else if (n > 0.97) c.px(x, y, dark)
    }
  }
}

// ── ground ────────────────────────────────────────────────────────────────
tile('grass', (c) => grassBase(c))
;[[4, 9, 8, 6, 11, 9], [5, 8, 9, 7, 12, 8], [3, 6, 7, 8, 12, 7]].forEach(([a, ay, b, by, d, dy], i) => {
  tile(`grass_tuft${i + 1}`, (c) => {
    grassBase(c, 1)
    c.vline(a, ay, 3, G3); c.vline(b, by, 4, G3); c.vline(d, dy, 3, G3)
    c.px(a, ay + 3, G4); c.px(b, by + 4, G4); c.px(d, dy + 3, G4)
  })
})
tile('grass_flower1', (c) => { grassBase(c, 2); c.px(5, 6, '#FFFFFF'); c.px(4, 6, '#F8C3BF'); c.px(6, 6, '#F8C3BF'); c.px(5, 5, '#F8C3BF'); c.px(5, 7, '#F8C3BF'); c.px(5, 6, '#FFE08A') })
tile('grass_flower2', (c) => { grassBase(c, 3); c.px(10, 10, '#FFE08A'); c.px(9, 10, '#BFD3F8'); c.px(11, 10, '#BFD3F8'); c.px(10, 9, '#BFD3F8'); c.px(10, 11, '#BFD3F8') })
tile('lawn', (c) => grassBase(c, 4, G2, '#E7F4EB', G))
tile('lawn_tuft', (c) => { grassBase(c, 5, G2, '#E7F4EB', G); c.vline(7, 8, 3, G3); c.vline(9, 7, 4, G3); c.px(7, 11, G4); c.px(9, 11, G4) })
tile('plaza', (c) => {
  c.rect(0, 0, 16, 16, STONE)
  c.hline(0, 7, 16, STONE2); c.hline(0, 15, 16, STONE2); c.vline(7, 0, 8, STONE2); c.vline(15, 8, 8, STONE2)
  c.px(3, 3, '#FFFFFF'); c.px(11, 11, '#FFFFFF')
})
tile('plaza_dark', (c) => {
  c.rect(0, 0, 16, 16, STONE2)
  c.hline(0, 7, 16, STONE); c.hline(0, 15, 16, STONE); c.vline(7, 0, 8, STONE); c.vline(15, 8, 8, STONE)
})
tile('path', (c) => {
  c.rect(0, 0, 16, 16, MIST)
  for (let i = 0; i < 6; i++) c.px(Math.floor(hash(i, 1, 9) * 16), Math.floor(hash(i, 2, 9) * 16), LINE)
})
tile('path_n', (c) => { c.rect(0, 0, 16, 16, MIST); c.hline(0, 0, 16, LINE); c.hline(0, 1, 16, '#FFFFFF') })
tile('path_s', (c) => { c.rect(0, 0, 16, 16, MIST); c.hline(0, 15, 16, LINE); c.hline(0, 14, 16, '#FFFFFF') })
tile('path_w', (c) => { c.rect(0, 0, 16, 16, MIST); c.vline(0, 0, 16, LINE); c.vline(1, 0, 16, '#FFFFFF') })
tile('path_e', (c) => { c.rect(0, 0, 16, 16, MIST); c.vline(15, 0, 16, LINE); c.vline(14, 0, 16, '#FFFFFF') })

// ── water ─────────────────────────────────────────────────────────────────
tile('water', (c) => {
  c.rect(0, 0, 16, 16, WATER)
  c.hline(2, 4, 4, WATER_HI); c.hline(9, 11, 5, WATER_HI); c.hline(5, 8, 3, WATER2)
})
tile('water2', (c) => {
  c.rect(0, 0, 16, 16, WATER)
  c.hline(8, 3, 4, WATER_HI); c.hline(1, 10, 5, WATER_HI); c.hline(9, 13, 3, WATER2)
})
tile('lily', (c) => {
  c.rect(0, 0, 16, 16, WATER)
  c.oval(8, 8, 3, 2, G3, G5); c.px(8, 6, WATER); c.px(9, 6, WATER); c.px(10, 5, '#F8C3BF')
})
tile('shore_n', (c) => { // grass above, a sand strip, then water
  c.rect(0, 0, 16, 16, WATER)
  c.hline(2, 12, 4, WATER_HI); c.hline(10, 14, 4, WATER_HI)
  c.rect(0, 0, 16, 7, G)
  c.rect(0, 6, 16, 2, SAND); c.hline(0, 8, 16, SAND2)
  for (let x = 0; x < 16; x++) if (hash(x, 1, 7) < 0.12) c.px(x, 2, G2)
})
tile('bridge_v', (c) => { // planks run across; rails along both sides
  c.rect(0, 0, 16, 16, WOOD)
  for (let y = 3; y < 16; y += 4) c.hline(1, y, 14, WOOD2)
  c.rect(0, 0, 2, 16, O2); c.rect(14, 0, 2, 16, O2)
  c.vline(2, 0, 16, SAND2); c.vline(13, 0, 16, SAND2)
})

// ── trees and plants (the four-tile tree has its trunk in the bottom row) ───
function canopy(c, ox, oy, part) {
  // A 32×32 round canopy drawn into one 16×16 quarter.
  const full = new Canvas(32, 32)
  full.oval(16, 14, 13, 12, G3, G5)
  full.oval(11, 11, 6, 5, G2, G3)
  full.oval(21, 10, 4, 3, G2, G3)
  full.rect(14, 24, 5, 8, WOOD); full.vline(14, 24, 8, O2); full.vline(18, 24, 8, O2); full.rect(15, 24, 3, 8, WOOD2)
  const sx = part % 2 ? 16 : 0
  const sy = part >= 2 ? 16 : 0
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const [r, g, b, a] = full.getPixel(sx + x, sy + y); if (a) c.px(x, y, [r, g, b, a]) }
}
;['tl', 'tr', 'bl', 'br'].forEach((p, i) => tile(`tree_${p}`, (c) => canopy(c, 0, 0, i)))
tile('bush', (c) => { grassBase(c, 6); c.oval(8, 9, 6, 4, G3, G5); c.oval(6, 7, 3, 2, G2, G3) })
tile('flowerbed1', (c) => {
  grassBase(c, 7); c.rbox(1, 5, 14, 9, 2, '#E7F4EB', G5)
  for (const [x, y, col] of [[4, 8, '#F8C3BF'], [8, 7, '#FFE08A'], [11, 9, '#BFD3F8'], [6, 11, '#FFFFFF'], [10, 12, '#F8C3BF']]) { c.px(x, y, col); c.px(x, y + 1, G5) }
})
tile('flowerbed2', (c) => {
  grassBase(c, 8); c.rbox(1, 5, 14, 9, 2, '#E7F4EB', G5)
  for (const [x, y, col] of [[3, 9, '#BFD3F8'], [7, 8, '#F8C3BF'], [12, 8, '#FFE08A'], [9, 12, '#FFFFFF']]) { c.px(x, y, col); c.px(x, y + 1, G5) }
})
tile('lamp_top', (c) => { c.rect(0, 0, 16, 16, 0); c.rbox(5, 3, 6, 8, 2, '#FFF59A', O2); c.rect(7, 11, 2, 5, O2); c.hline(4, 2, 8, O2) })
tile('lamp_base', (c) => { grassBase(c, 9); c.rect(7, 0, 2, 11, O2); c.rbox(4, 11, 8, 4, 1, STONE2, O2) })
tile('bench', (c) => {
  c.rect(0, 0, 16, 16, STONE)
  c.rbox(1, 5, 14, 4, 1, WOOD, O2); c.rbox(1, 9, 14, 3, 1, WOOD2, O2); c.rect(2, 12, 2, 3, O2); c.rect(12, 12, 2, 3, O2)
})

// ── fountain (3×3, water in the middle) and stage ────────────────────────────
function basin(c, nx, ny) {
  c.rect(0, 0, 16, 16, STONE)
  c.rect(nx === 'w' ? 8 : 0, ny === 'n' ? 8 : 0, nx === 'c' ? 16 : 8, ny === 'c' ? 16 : 8, WATER)
}
const FOUNTAIN = { nw: ['w', 'n'], n: ['c', 'n'], ne: ['e', 'n'], w: ['w', 'c'], c: ['c', 'c'], e: ['e', 'c'], sw: ['w', 's'], s: ['c', 's'], se: ['e', 's'] }
for (const [part, [nx, ny]] of Object.entries(FOUNTAIN)) {
  tile(`fountain_${part}`, (c) => {
    c.rect(0, 0, 16, 16, STONE)
    const x0 = nx === 'w' ? 6 : 0
    const x1 = nx === 'e' ? 10 : 16
    const y0 = ny === 'n' ? 6 : 0
    const y1 = ny === 's' ? 10 : 16
    c.rect(x0, y0, x1 - x0, y1 - y0, WATER)
    if (nx === 'w') c.vline(6, y0, y1 - y0, O2)
    if (nx === 'e') c.vline(9, y0, y1 - y0, O2)
    if (ny === 'n') c.hline(x0, 6, x1 - x0, O2)
    if (ny === 's') c.hline(x0, 9, x1 - x0, O2)
    if (part === 'c') { c.rect(6, 6, 4, 8, WATER_HI); c.rect(7, 3, 2, 4, WATER_HI); c.px(5, 5, WATER_HI); c.px(10, 5, WATER_HI) }
  })
}
void basin
for (const [part, name] of [['bl', 'stage_back_l'], ['bm', 'stage_back_m'], ['br', 'stage_back_r'], ['fl', 'stage_front_l'], ['fm', 'stage_front_m'], ['fr', 'stage_front_r']]) {
  tile(name, (c) => {
    c.rect(0, 0, 16, 16, WOOD)
    for (let x = 3; x < 16; x += 4) c.vline(x, 0, 16, WOOD2)
    if (part[0] === 'b') { c.rect(0, 0, 16, 5, O2); c.rect(0, 1, 16, 3, '#9B7BD6'); c.hline(0, 1, 16, '#F0EBF9') }
    if (part[0] === 'f') { c.rect(0, 12, 16, 4, '#8A5A00'); c.hline(0, 12, 16, WOOD2) }
    if (part[1] === 'l') c.vline(0, 0, 16, O2)
    if (part[1] === 'r') c.vline(15, 0, 16, O2)
  })
}

// ── wayfinding and the rice field ──────────────────────────────────────────
tile('signpost', (c) => {
  grassBase(c, 10); c.rect(7, 4, 2, 11, O2)
  c.rbox(2, 3, 11, 4, 1, '#FFFFFF', O2); c.px(11, 4, '#E8817B'); c.px(12, 5, '#E8817B'); c.px(11, 6, '#E8817B'); c.hline(4, 5, 5, O2)
})
tile('board', (c) => { // the directory board in the central hall
  c.rect(0, 0, 16, 16, STONE)
  c.rbox(1, 2, 14, 10, 1, '#FFFFFF', O2); c.rect(2, 3, 12, 2, '#9B7BD6')
  for (const [x, y] of [[3, 7], [6, 7], [9, 7], [12, 7], [3, 9], [6, 9], [9, 9], [12, 9]]) c.px(x, y, '#5B8DEF')
  c.rect(3, 12, 2, 3, O2); c.rect(11, 12, 2, 3, O2)
})
tile('rice', (c) => {
  c.rect(0, 0, 16, 16, G2)
  for (let y = 1; y < 16; y += 4) for (let x = 1; x < 16; x += 4) { c.px(x, y, G4); c.px(x + 1, y - 1, G3); c.px(x, y + 1, G) }
  c.hline(0, 15, 16, G3)
})
tile('rice_water', (c) => {
  c.rect(0, 0, 16, 16, WATER)
  for (let y = 2; y < 16; y += 5) for (let x = 2; x < 16; x += 4) { c.px(x, y, G3); c.px(x, y - 1, G2) }
})

export const TILE_NAMES = table.map(([name]) => name)

export default {
  name: 'campus_tiles',
  frameW: 16,
  frameH: 16,
  columns: 16,
  sprites: Object.fromEntries(table.map(([name, draw]) => [name, { frames: 1, draw }])),
}
