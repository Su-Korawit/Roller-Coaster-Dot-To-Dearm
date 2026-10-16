// Modern faculty-building style studies (3 directions × 3 faculties).
import { Canvas } from './px.mjs'

const SPRITES = 'D:/Ikkyusan/Desktop/03_Projects/Games/Roller Coaster Dot To Dearm/public/assets/sprites'
const out = process.argv[2]

const O = '#5c4e92', O2 = '#463c74'
const WALL = '#FFFFFF', WSH = '#E9E8F1', WDK = '#D2CFE2'
const GL = '#A4D3EC', GLH = '#E1F3FB', GLD = '#6EA6CB'
const ROOF = '#F2F1F7', ROOFH = '#FBFBFE', ROOFD = '#DCDAE8'
const SHADOW = [70, 60, 116, 46]
const Z = {
  health: { l: '#F8C3BF', b: '#E8817B', d: '#B9544F' },
  sci: { l: '#BFD3F8', b: '#5B8DEF', d: '#3B63B8' },
  soc: { l: '#DCD0F3', b: '#9B7BD6', d: '#6C51A8' },
}
const ICON = {
  health: ['...XXX...', '...XXX...', '...XXX...', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '...XXX...', '...XXX...', '...XXX...'],
  sci: ['...X.X...', '.XXXXXXX.', '.XX...XX.', 'XX.....XX', '.X.....X.', 'XX.....XX', '.XX...XX.', '.XXXXXXX.', '...X.X...'],
  soc: ['....X....', '.XXXXXXX.', '.X..X..X.', 'X.X.X.X.X', 'XXX.X.XXX', '....X....', '....X....', '..XXXXX..', '.XXXXXXX.'],
}
const icon = (c, x, y, z, col) => c.bitmap(x, y, ICON[z], { X: col })
const badge = (c, x, y, z) => { // 13×13 rounded white badge with zone icon
  c.rect(x + 1, y, 11, 13, O); c.rect(x, y + 1, 13, 11, O)
  c.rect(x + 1, y + 1, 11, 11, WALL)
  icon(c, x + 2, y + 2, z, Z[z].b)
}
const shadow = (c, x, y, w) => c.rect(x + 2, y, w, 3, SHADOW)

// ── Direction 1: Glass & White — one shared building, zone colour on fascia + canopy
function glassWhite(c, x0, y0, z) {
  const W = 80, zc = Z[z]
  c.box(x0, y0 + 4, W, 26, ROOF, O)                       // flat roof slab
  c.rect(x0 + 2, y0 + 6, W - 4, 1, ROOFH)
  c.box(x0 + 8, y0 + 9, 10, 7, WSH, O); c.box(x0 + 60, y0 + 10, 8, 6, WSH, O) // rooftop units
  c.rect(x0 + 24, y0 + 11, 30, 6, GL); c.rect(x0 + 24, y0 + 11, 30, 1, GLH)     // skylight
  c.rect(x0 + 1, y0 + 25, W - 2, 4, zc.b); c.hline(x0 + 1, y0 + 25, W - 2, zc.l) // fascia band
  c.box(x0, y0 + 29, W, 42, WALL, O)                      // facade
  for (const wy of [33, 44]) {
    c.rect(x0 + 4, y0 + wy, W - 8, 7, GL); c.hline(x0 + 4, y0 + wy, W - 8, GLH); c.hline(x0 + 4, y0 + wy + 6, W - 8, GLD)
    for (let mx = x0 + 9; mx < x0 + W - 5; mx += 6) c.vline(mx, y0 + wy, 7, WDK)
  }
  c.rect(x0 + 1, y0 + 66, W - 2, 4, WSH)
  c.box(x0 + 26, y0 + 51, 28, 4, zc.b, O)                // canopy
  c.box(x0 + 31, y0 + 55, 18, 16, GLD, O); c.vline(x0 + 40, y0 + 56, 14, O); c.rect(x0 + 32, y0 + 56, 7, 2, GL)
  badge(c, x0 + 6, y0 + 54, z)
  shadow(c, x0, y0 + 71, W)
}

// ── Direction 2: Signature forms — shared modern language, one landmark element per faculty
function signature(c, x0, y0, z) {
  const zc = Z[z]
  if (z === 'health') { // white block + glass atrium with big cross + rooftop helipad
    const W = 80
    c.box(x0, y0 + 2, W, 28, ROOF, O); c.rect(x0 + 2, y0 + 4, W - 4, 1, ROOFH)
    const ell = (cx, cy, rx, ry, col) => { for (let j = -ry; j <= ry; j++) { const w = Math.round(rx * Math.sqrt(1 - (j * j) / (ry * ry + 0.5))); c.rect(cx - w, cy + j, w * 2 + 1, 1, col) } }
    ell(x0 + 60, y0 + 15, 11, 7, O); ell(x0 + 60, y0 + 15, 10, 6, WSH); ell(x0 + 60, y0 + 15, 8, 4, zc.l)
    c.bitmap(x0 + 57, y0 + 13, ['X...X', 'XXXXX', 'X...X'], { X: zc.d }) // helipad H
    c.box(x0, y0 + 29, W, 42, WALL, O)
    for (let wy = 33; wy < 62; wy += 9) for (let wx = 5; wx < 30; wx += 8) { c.rect(x0 + wx, y0 + wy, 5, 6, GL); c.hline(x0 + wx, y0 + wy, 5, GLH) }
    for (let wy = 33; wy < 62; wy += 9) for (let wx = 55; wx < 76; wx += 8) { c.rect(x0 + wx, y0 + wy, 5, 6, GL); c.hline(x0 + wx, y0 + wy, 5, GLH) }
    c.box(x0 + 30, y0 + 22, 22, 49, GL, O)                 // glass atrium tower
    for (let gy = y0 + 24; gy < y0 + 70; gy += 5) c.hline(x0 + 31, gy, 20, GLH)
    c.rect(x0 + 37, y0 + 26, 8, 22, zc.b); c.rect(x0 + 31, y0 + 33, 20, 8, zc.b) // cross
    c.rect(x0 + 37, y0 + 26, 8, 1, zc.l); c.rect(x0 + 31, y0 + 33, 20, 1, zc.l)
    c.box(x0 + 34, y0 + 57, 14, 14, GLD, O); c.vline(x0 + 41, y0 + 58, 12, O)
    c.rect(x0 + 1, y0 + 67, 29, 3, WSH); c.rect(x0 + 52, y0 + 67, 27, 3, WSH)
    shadow(c, x0, y0 + 71, W)
  } else if (z === 'sci') { // saw-tooth roof workshop + big steel windows + gear
    const W = 84
    for (let t = 0; t < 4; t++) {                          // 4 roof teeth
      const tx = x0 + t * 21
      for (let j = 0; j < 22; j++) {
        const w = Math.round(21 * (j / 22)); c.rect(tx + 21 - w, y0 + 8 + j, w, 1, j < 3 ? zc.l : zc.b)
        c.px(tx + 21 - w, y0 + 8 + j, O)
      }
      c.vline(tx + 20, y0 + 8, 22, O); c.rect(tx + 17, y0 + 9, 3, 20, GL); c.vline(tx + 17, y0 + 9, 20, GLH)
    }
    c.hline(x0, y0 + 29, W, O)
    c.box(x0, y0 + 29, W, 42, WALL, O)
    for (let wx = 4; wx < W - 10; wx += 20) {
      c.box(x0 + wx, y0 + 33, 16, 18, GL, zc.d); c.hline(x0 + wx + 1, y0 + 34, 14, GLH)
      c.vline(x0 + wx + 8, y0 + 34, 16, zc.d); c.hline(x0 + wx + 1, y0 + 42, 14, zc.d)
    }
    c.rect(x0 + 1, y0 + 53, W - 2, 3, zc.b)               // steel beam stripe
    c.box(x0 + 30, y0 + 56, 24, 15, WSH, O)                // roller door
    for (let ry = y0 + 58; ry < y0 + 70; ry += 2) c.hline(x0 + 31, ry, 22, WDK)
    badge(c, x0 + 64, y0 + 57, z)
    c.rect(x0 + 1, y0 + 67, 29, 3, WSH); c.rect(x0 + 54, y0 + 67, 29, 3, WSH)
    shadow(c, x0, y0 + 71, W)
  } else { // modern colonnade: floating purple roof plate, slim white columns, scales above door
    const W = 80
    c.box(x0 - 2, y0 + 6, W + 4, 22, zc.b, O); c.rect(x0, y0 + 8, W, 2, zc.l)  // roof plate
    c.rect(x0 + 6, y0 + 13, W - 12, 8, zc.d); c.rect(x0 + 6, y0 + 13, W - 12, 1, zc.b)
    c.rect(x0 - 1, y0 + 27, W + 2, 3, zc.d)
    c.box(x0 + 4, y0 + 30, W - 8, 41, GL, O)              // recessed glass box
    for (let gy = y0 + 33; gy < y0 + 70; gy += 6) c.hline(x0 + 5, gy, W - 10, GLH)
    for (let cx = 0; cx < 8; cx++) {                       // slim columns
      const px = x0 + 3 + cx * 10.4
      c.rect(px, y0 + 30, 4, 41, WALL); c.vline(px, y0 + 30, 41, O); c.vline(px + 3, y0 + 30, 41, WDK); c.vline(px + 4, y0 + 30, 41, O)
    }
    c.box(x0 + 33, y0 + 31, 15, 13, WALL, O); icon(c, x0 + 36, y0 + 33, z, zc.d)
    c.box(x0 + 34, y0 + 56, 13, 15, GLD, O); c.vline(x0 + 40, y0 + 57, 13, O)
    c.rect(x0 - 2, y0 + 70, W + 4, 2, WDK); c.rect(x0 - 4, y0 + 72, W + 8, 2, WSH)   // steps
    shadow(c, x0, y0 + 74, W)
  }
}

// ── Direction 3: Soft modern — rounded corners, rooftop gardens, pastel zone panels, round windows
function soft(c, x0, y0, z) {
  const W = 80, zc = Z[z]
  const round = (x, y, w, h, fill) => { c.rect(x + 2, y, w - 4, h, O); c.rect(x, y + 2, w, h - 4, O); c.rect(x + 1, y + 1, w - 2, h - 2, O); c.rect(x + 2, y + 1, w - 4, h - 2, fill); c.rect(x + 1, y + 2, w - 2, h - 4, fill) }
  round(x0, y0 + 2, W, 30, '#CFE3A8')                       // green roof
  for (let i = 0; i < 26; i++) c.px(x0 + 4 + ((i * 37) % 72), y0 + 6 + ((i * 13) % 22), i % 2 ? '#A9CB7A' : '#E4EFC6')
  round(x0 + 50, y0 + 6, 22, 14, ROOF); c.rect(x0 + 53, y0 + 9, 16, 3, GL)   // roof pavilion
  round(x0, y0 + 28, W, 44, WALL)
  c.rect(x0 + 2, y0 + 30, 22, 40, zc.l); c.vline(x0 + 24, y0 + 30, 40, zc.b) // pastel panel
  for (const wy of [34, 46]) for (let wx = 30; wx < 76; wx += 12) {
    c.rect(x0 + wx + 1, y0 + wy, 6, 8, O); c.rect(x0 + wx, y0 + wy + 1, 8, 6, O)
    c.rect(x0 + wx + 1, y0 + wy + 1, 6, 6, GL); c.rect(x0 + wx + 2, y0 + wy + 1, 3, 1, GLH)
  }
  badge(c, x0 + 7, y0 + 36, z)
  round(x0 + 34, y0 + 57, 16, 15, GLD); c.vline(x0 + 42, y0 + 59, 12, O)
  c.rect(x0 + 6, y0 + 58, 14, 6, '#9CC56E'); c.rect(x0 + 6, y0 + 63, 14, 2, '#7FA85A') // planter
  c.rect(x0 + 58, y0 + 60, 16, 5, '#9CC56E'); c.rect(x0 + 58, y0 + 64, 16, 2, '#7FA85A')
  shadow(c, x0, y0 + 72, W)
}

// ── Sheet
const CELL_W = 104, CELL_H = 100, PAD = 6
const rows = [glassWhite, signature, soft]
const zones = ['health', 'sci', 'soc']
const sheet = new Canvas(CELL_W * 3, CELL_H * 3)
const GR = '#DCEAB8', GR2 = '#CADDA0', PATH = '#F5F4F0', PATHE = '#DEDBD2'
sheet.rect(0, 0, sheet.w, sheet.h, GR)
for (let i = 0; i < 900; i++) { const x = (i * 97) % sheet.w, y = (i * 53 + (i >> 3)) % sheet.h; sheet.px(x, y, GR2) }
const base = new Canvas(1, 1)
const char = await base.fromPng(`${SPRITES}/Characters/Basic_Charakter_Spritesheet.png`, 0, 0, 48, 48)
for (let r = 0; r < 3; r++) {
  const py = r * CELL_H + 84
  sheet.rect(0, py, sheet.w, 10, PATH); sheet.hline(0, py, sheet.w, PATHE); sheet.hline(0, py + 9, sheet.w, PATHE)
  for (let k = 0; k < 3; k++) rows[r](sheet, k * CELL_W + (zones[k] === 'sci' && r === 1 ? 10 : 12), r * CELL_H + PAD, zones[k])
  sheet.blit(char, 2 * CELL_W - 34, py - 26)
  for (let x = 0; x < sheet.w; x++) sheet.px(x, r * CELL_H, '#ffffff')
}
await sheet.save(out, 4)
console.log('saved', out)
