// Open House campus: the 18 faculty buildings (ADR-0026). One 96×80 sprite per building in the
// "signature forms" direction of docs/superpowers/specs/assets/2026-10-16-ilovetcas-v2/
// faculty-building-styles.png (middle row): a shared modern white block, one landmark element
// per faculty and the zone colour on the fascia, canopy and badge. Each sprite is anchored with its
// bottom edge on the ground line and its door centred (x 41–54, bottom y 75), so the scene can
// place any building the same way and put the door zone just below it.
import { BUILDINGS } from '../../../src/constants/openHouseBuildings.js'

export const FRAME_W = 96
export const FRAME_H = 80
export const DOOR = { x: 41, w: 14, bottom: 75 } // px inside the frame

const O = '#5C4E92'
const O2 = '#463C74'
const WALL = '#FFFFFF'
const WSH = '#F4F3F9'
const WDK = '#D9D5EA'
const GL = '#A4D3EC'
const GLH = '#E1F3FB'
const GLD = '#8FB0EE'
const ROOF = '#E9E6F3'
const GREEN = '#7BC48C'
const GREEN_D = '#3F7A4A'
const GREEN_L = '#B6DCA0'
const SHADOW = [70, 60, 116, 46]

const Z = {
  health: { l: '#FCECEB', b: '#E8817B', d: '#9D5753' },
  sci: { l: '#E6EEFD', b: '#5B8DEF', d: '#4063A7' },
  soc: { l: '#F0EBF9', b: '#9B7BD6', d: '#6D5696' },
  biz: { l: '#FCF2E2', b: '#E8A93B', d: '#8A5A00' },
  arts: { l: '#FBEEF6', b: '#E58BC0', d: '#955A7D' },
  earth: { l: '#E7F4EB', b: '#5FB57A', d: '#3F7750' },
}

const ICON = {
  health: ['...XXX...', '...XXX...', '...XXX...', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '...XXX...', '...XXX...', '...XXX...'],
  sci: ['...X.X...', '.XXXXXXX.', '.XX...XX.', 'XX.....XX', '.X.....X.', 'XX.....XX', '.XX...XX.', '.XXXXXXX.', '...X.X...'],
  soc: ['....X....', '.XXXXXXX.', '.X..X..X.', 'X.X.X.X.X', 'XXX.X.XXX', '....X....', '....X....', '..XXXXX..', '.XXXXXXX.'],
  biz: ['.........', '......XX.', '......XX.', '..XX..XX.', '..XX..XX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.........'],
  arts: ['.....XXX.', '....XXXX.', '....XX.X.', '....XX...', '....XX...', '.XX.XX...', 'XXXXXX...', 'XXXX.....', '.XX......'],
  earth: ['.......XX', '.....XXXX', '...XXXXX.', '..XXXXX..', '.XXXXXX..', '.XXXX.X..', 'XXX.XX...', 'XX.......', 'X........'],
}

const shadow = (c, x, w) => c.rect(x + 2, 76, w, 3, SHADOW)
const box = (c, x, y, w, h, fill, line = O) => c.box(c.ox + x, c.oy + y, w, h, fill, line)
const rect = (c, x, y, w, h, col) => c.rect(c.ox + x, c.oy + y, w, h, col)
const hline = (c, x, y, w, col) => c.hline(c.ox + x, c.oy + y, w, col)
const vline = (c, x, y, h, col) => c.vline(c.ox + x, c.oy + y, h, col)
const px = (c, x, y, col) => c.px(c.ox + x, c.oy + y, col)
const bitmap = (c, x, y, rows, pal) => c.bitmap(c.ox + x, c.oy + y, rows, pal)

// 13×13 white badge with the zone icon (the same one the Open House popup header uses).
function badge(c, x, y, zone) {
  const z = Z[zone]
  rect(c, x + 1, y, 11, 13, O); rect(c, x, y + 1, 13, 11, O)
  rect(c, x + 1, y + 1, 11, 11, WALL)
  bitmap(c, x + 2, y + 2, ICON[zone], { X: z.b })
}

// The shared white block: flat roof slab, zone fascia, two rows of windows, door bay, ground line.
function block(c, zone, { w = 80, x = 8, roofH = 24, windows = true, door = true } = {}) {
  const z = Z[zone]
  box(c, x, 4, w, roofH, ROOF)
  hline(c, x + 2, 6, w - 4, WSH)
  rect(c, x + 1, 4 + roofH - 5, w - 2, 4, z.b); hline(c, x + 1, 4 + roofH - 5, w - 2, z.l)
  box(c, x, 4 + roofH - 1, w, 72 - roofH + 1, WALL)
  if (windows) {
    for (const wy of [34, 45]) {
      rect(c, x + 4, wy, w - 8, 6, GL); hline(c, x + 4, wy, w - 8, GLH); hline(c, x + 4, wy + 5, w - 8, GLD)
      for (let mx = x + 9; mx < x + w - 5; mx += 6) vline(c, mx, wy, 6, WDK)
    }
  }
  if (door) doorBay(c, zone)
}

function doorBay(c, zone) {
  const z = Z[zone]
  box(c, 36, 52, 24, 4, z.b)                            // canopy
  box(c, DOOR.x - 2, 56, DOOR.w + 4, 19, GLD)
  vline(c, 48, 57, 17, O)
  rect(c, DOOR.x, 57, 6, 2, GL)
}

const ellipse = (c, cx, cy, rx, ry, col) => c.ellipse(c.ox + cx, c.oy + cy, rx, ry, col)

const DRAW = {
  // ── health ─────────────────────────────────────────────────────────────
  med(c) { // glass atrium with a big red cross, rooftop helipad
    const z = Z.health
    block(c, 'health', { windows: false, door: false })
    for (const wy of [34, 45, 56]) for (const wx of [12, 20, 28, 62, 70]) { rect(c, wx, wy, 5, 6, GL); hline(c, wx, wy, 5, GLH) }
    ellipse(c, 70, 14, 10, 6, O); ellipse(c, 70, 14, 9, 5, WSH); ellipse(c, 70, 14, 7, 3, z.l)
    bitmap(c, 67, 13, ['X...X', 'XXXXX', 'X...X'], { X: z.d })
    box(c, 36, 12, 24, 63, GL)
    for (let gy = 14; gy < 74; gy += 5) hline(c, 37, gy, 22, GLH)
    rect(c, 43, 18, 10, 26, z.b); rect(c, 37, 27, 22, 9, z.b)
    rect(c, 43, 18, 10, 1, z.l); rect(c, 37, 27, 22, 1, z.l)
    doorBay(c, 'health')
  },
  dent(c) { // tooth-shaped canopy over the entrance, white tiles
    const z = Z.health
    block(c, 'health')
    for (let ty = 36; ty < 62; ty += 5) for (let tx = 12; tx < 84; tx += 5) if ((tx + ty) % 10 === 0) rect(c, tx, ty, 4, 4, GLH)
    ellipse(c, 36, 24, 7, 6, O); ellipse(c, 60, 24, 7, 6, O); rect(c, 38, 24, 20, 8, O)
    ellipse(c, 36, 24, 6, 5, WALL); ellipse(c, 60, 24, 6, 5, WALL); rect(c, 38, 25, 20, 6, WALL)
    rect(c, 36, 30, 6, 11, O); rect(c, 54, 30, 6, 11, O); rect(c, 37, 30, 4, 11, WALL); rect(c, 55, 30, 4, 11, WALL)
    rect(c, 30, 20, 6, 3, z.l)
    badge(c, 12, 50, 'health')
  },
  pharm(c) { // capsule roof lantern, herb planters
    const z = Z.health
    block(c, 'health')
    c.rbox(c.ox + 28, c.oy + 8, 40, 14, 6, WALL, O)
    c.rrect(c.ox + 29, c.oy + 9, 19, 12, 5, z.b); rect(c, 48, 9, 19, 12, WALL)
    vline(c, 48, 9, 12, O); hline(c, 33, 11, 10, z.l)
    for (const x of [14, 70]) { rect(c, x, 64, 12, 6, GREEN_D); rect(c, x + 1, 60, 10, 5, GREEN); rect(c, x + 3, 58, 3, 3, GREEN_L); rect(c, x + 7, 59, 3, 3, GREEN_L) }
    badge(c, 14, 40, 'health')
  },
  vet(c) { // paw-print sign, a small paddock
    const z = Z.health
    block(c, 'health')
    box(c, 28, 10, 40, 14, WALL)
    ellipse(c, 48, 18, 4, 3, z.b)
    for (const [dx, dy] of [[-6, -3], [-2, -6], [3, -6], [7, -3]]) ellipse(c, 48 + dx, 18 + dy, 1, 1, z.b)
    for (let fx = 62; fx < 90; fx += 5) { vline(c, fx, 66, 9, z.d) }
    hline(c, 62, 68, 28, z.d); hline(c, 62, 72, 28, z.d)
    badge(c, 12, 38, 'health')
  },
  allied(c) { // ambulance bay, heartbeat line on the facade
    const z = Z.health
    block(c, 'health')
    box(c, 12, 56, 20, 19, WSH); rect(c, 14, 58, 16, 2, z.b)
    for (let ry = 61; ry < 74; ry += 2) hline(c, 14, ry, 16, WDK)
    const beat = [[0, 0], [3, 0], [4, -4], [6, 4], [8, -2], [9, 0], [14, 0]]
    beat.forEach(([x, y], i) => { const [nx, ny] = beat[i + 1] ?? [x, y]; for (let k = x; k <= nx; k++) px(c, 62 + k, 18 + Math.round(y + ((ny - y) * (k - x)) / Math.max(1, nx - x)), z.b) })
    rect(c, 56, 22, 26, 2, z.l)
    badge(c, 66, 52, 'health')
  },
  // ── science & tech ─────────────────────────────────────────────────────
  sci(c) { // observatory dome
    const z = Z.sci
    block(c, 'sci')
    ellipse(c, 48, 15, 15, 11, O); ellipse(c, 48, 15, 14, 10, z.b); rect(c, 33, 16, 30, 7, ROOF)
    rect(c, 40, 8, 3, 8, z.l); vline(c, 48, 4, 10, O); rect(c, 46, 4, 5, 2, z.l)
    badge(c, 12, 50, 'sci')
  },
  it(c) { // glass cube with pixel screens, antenna
    const z = Z.sci
    block(c, 'sci')
    box(c, 26, 8, 44, 30, GL)
    for (let sy = 11; sy < 36; sy += 8) for (let sx = 29; sx < 68; sx += 8) { rect(c, sx, sy, 6, 6, O2); rect(c, sx + 1, sy + 1, 2, 2, z.b); rect(c, sx + 3, sy + 3, 2, 2, GLH) }
    vline(c, 48, 0, 8, O); rect(c, 46, 0, 5, 2, z.b)
    badge(c, 12, 50, 'sci')
  },
  eng(c) { // saw-tooth roof workshop with big steel windows and a gear
    const z = Z.sci
    block(c, 'sci', { roofH: 6, windows: false, door: false })
    for (let t = 0; t < 4; t++) {
      const tx = 8 + t * 20
      for (let j = 0; j < 22; j++) { const w = Math.round(20 * (j / 22)); rect(c, tx + 20 - w, 6 + j - 4, w, 1, j < 3 ? z.l : z.b); px(c, tx + 20 - w, 6 + j - 4, O) }
      vline(c, tx + 19, 2, 22, O); rect(c, tx + 16, 3, 3, 20, GL)
    }
    for (let wx = 12; wx < 70; wx += 20) { box(c, wx, 34, 16, 16, GL, z.d); vline(c, wx + 8, 35, 14, z.d); hline(c, wx + 1, 42, 14, z.d) }
    rect(c, 9, 54, 78, 3, z.b)
    box(c, 34, 58, 28, 17, WSH); for (let ry = 60; ry < 74; ry += 2) hline(c, 35, ry, 26, WDK)
    badge(c, 70, 58, 'sci')
  },
  arch(c) { // cantilevered stacked boxes, green roof
    const z = Z.sci
    block(c, 'sci', { windows: false })
    box(c, 8, 6, 40, 14, WALL); box(c, 30, 20, 50, 14, ROOF); box(c, 14, 34, 44, 14, WALL)
    rect(c, 10, 8, 36, 3, GREEN); rect(c, 32, 22, 46, 3, GREEN); rect(c, 16, 36, 40, 3, GREEN_L)
    for (const [x, y, w] of [[12, 13, 30], [34, 27, 42], [18, 41, 36]]) rect(c, x, y, w, 4, GL)
    rect(c, 60, 36, 22, 4, z.b)
    badge(c, 68, 50, 'sci')
  },
  // ── society ────────────────────────────────────────────────────────────
  law(c) { // floating roof plate, slim columns, scales over the door
    const z = Z.soc
    rect(c, 4, 6, 88, 2, 0)
    box(c, 4, 6, 88, 20, z.b); rect(c, 6, 8, 84, 2, z.l); rect(c, 12, 13, 72, 8, z.d); rect(c, 12, 13, 72, 1, z.b)
    rect(c, 5, 25, 86, 3, z.d)
    box(c, 10, 28, 76, 44, GL)
    for (let gy = 31; gy < 72; gy += 6) hline(c, 11, gy, 74, GLH)
    for (let k = 0; k < 8; k++) { const x = 9 + k * 10; rect(c, x, 28, 4, 44, WALL); vline(c, x, 28, 44, O); vline(c, x + 3, 28, 44, WDK); vline(c, x + 4, 28, 44, O) }
    box(c, 38, 29, 20, 13, WALL); bitmap(c, 43, 31, ICON.soc, { X: z.d })
    box(c, 40, 54, 16, 18, GLD); vline(c, 48, 55, 16, O)
    rect(c, 6, 72, 84, 2, WDK); rect(c, 4, 74, 88, 2, WSH)
  },
  comm(c) { // broadcast tower, big screen, on-air sign
    const z = Z.soc
    block(c, 'soc', { windows: false })
    vline(c, 76, 0, 26, O); for (let k = 0; k < 6; k++) { hline(c, 73, 4 + k * 4, 7, O); px(c, 74 + (k % 2) * 4, 6 + k * 4, O) }
    rect(c, 74, 0, 5, 3, z.b); px(c, 76, 0, '#C2413D')
    box(c, 12, 30, 44, 26, O2)
    for (let bx = 0; bx < 8; bx++) rect(c, 15 + bx * 5, 52 - ((bx * 7) % 17) - 4, 3, ((bx * 7) % 17) + 4, bx % 2 ? z.b : GL)
    box(c, 62, 32, 22, 9, '#C2413D'); rect(c, 65, 35, 16, 3, WALL)
    badge(c, 66, 46, 'soc')
    doorBay(c, 'soc')
  },
  pol(c) { // dome and flag row, round council hall
    const z = Z.soc
    block(c, 'soc', { windows: false })
    ellipse(c, 48, 17, 17, 13, O); ellipse(c, 48, 17, 16, 12, z.b); rect(c, 30, 20, 36, 8, ROOF); rect(c, 33, 10, 4, 6, z.l)
    vline(c, 48, 0, 6, O); rect(c, 49, 0, 6, 3, z.d)
    for (let k = 0; k < 4; k++) { vline(c, 14 + k * 6, 22, 14, O); rect(c, 15 + k * 6, 22, 4, 3, k % 2 ? WALL : z.b) }
    for (let wx = 12; wx < 84; wx += 8) if (wx < 38 || wx > 54) { c.rbox(c.ox + wx, c.oy + 36, 6, 12, 2, GL, O) }
    rect(c, 40, 30, 16, 12, ROOF); bitmap(c, 43, 32, ICON.soc.slice(0, 8), { X: z.d })
    doorBay(c, 'soc')
  },
  hum(c) { // library facade with arched windows and book banners
    const z = Z.soc
    block(c, 'soc', { windows: false })
    for (const bx of [14, 30, 56, 72]) {
      c.rbox(c.ox + bx, c.oy + 30, 10, 22, 4, GL, O); rect(c, bx + 4, 36, 1, 14, GLH)
      rect(c, bx + 1, 56, 8, 14, z.l); rect(c, bx + 1, 56, 2, 14, z.b); rect(c, bx + 4, 56, 1, 14, z.d)
    }
    box(c, 36, 8, 24, 12, WALL); hline(c, 38, 11, 20, z.b); hline(c, 38, 14, 20, z.l); hline(c, 38, 17, 14, z.b)
    doorBay(c, 'soc')
  },
  // ── business ───────────────────────────────────────────────────────────
  biz(c) { // glass tower with a ticker band
    const z = Z.biz
    block(c, 'biz', { windows: false, door: false })
    box(c, 30, 0, 36, 74, GL)
    for (let gy = 4; gy < 72; gy += 5) hline(c, 31, gy, 34, GLH)
    for (let gx = 38; gx < 64; gx += 9) vline(c, gx, 1, 72, GLD)
    rect(c, 31, 26, 34, 6, O2); for (let t = 0; t < 8; t++) rect(c, 33 + t * 4, 28, 2, 2, t % 3 === 0 ? '#5FB57A' : z.b)
    for (const wx of [12, 70]) for (const wy of [34, 46]) { rect(c, wx, wy, 8, 6, GL); hline(c, wx, wy, 8, GLH) }
    doorBay(c, 'biz')
    badge(c, 12, 56, 'biz')
  },
  tour(c) { // hotel canopy, suitcase sign, rooftop cafe
    const z = Z.biz
    block(c, 'biz')
    box(c, 28, 50, 40, 5, z.b); for (let k = 0; k < 8; k++) rect(c, 30 + k * 5, 55, 3, 3, k % 2 ? z.l : z.b)
    c.rbox(c.ox + 62, c.oy + 8, 14, 11, 2, z.d, O); rect(c, 66, 6, 6, 3, O); rect(c, 64, 11, 10, 1, z.b); rect(c, 64, 15, 10, 1, z.b)
    vline(c, 18, 8, 12, O); c.px(c.ox + 18, c.oy + 7, O); ellipse(c, 18, 10, 8, 3, z.b); rect(c, 10, 10, 16, 1, z.l)
    rect(c, 12, 18, 12, 2, WDK)
  },
  // ── arts & education & agriculture ─────────────────────────────────────
  fine(c) { // sculptural wavy roof, piano-key steps
    const z = Z.arts
    block(c, 'arts', { roofH: 6, windows: false })
    for (let x = 0; x < 82; x++) { const y = 10 - Math.round(Math.sin(x / 7) * 5); rect(c, 7 + x, y, 1, 18 - (10 - y), z.b); px(c, 7 + x, y, O); px(c, 7 + x, y + 1, z.l) }
    for (const wx of [14, 26, 62, 74]) { c.rbox(c.ox + wx, c.oy + 34, 8, 14, 3, GL, O) }
    for (let k = 0; k < 14; k++) rect(c, 32 + k * 2, 66, 2, 8, k % 2 ? O2 : WALL)
    hline(c, 32, 66, 28, O)
    doorBay(c, 'arts')
    badge(c, 14, 52, 'arts')
  },
  edu(c) { // school bell tower, chalkboard facade
    const z = Z.earth
    block(c, 'earth', { windows: false })
    box(c, 38, 0, 20, 22, ROOF); rect(c, 42, 4, 12, 10, O2); ellipse(c, 48, 11, 4, 4, z.b); rect(c, 47, 15, 2, 3, O)
    rect(c, 36, 0, 24, 3, z.d)
    box(c, 12, 30, 28, 18, z.d); rect(c, 14, 32, 24, 14, '#3F7A4A'); hline(c, 16, 36, 14, WALL); hline(c, 16, 40, 10, WALL); hline(c, 28, 42, 6, '#FFE08A')
    box(c, 56, 30, 28, 18, z.d); rect(c, 58, 32, 24, 14, '#3F7A4A'); hline(c, 60, 36, 16, WALL); hline(c, 60, 40, 8, WALL)
    doorBay(c, 'earth')
    badge(c, 14, 54, 'earth')
  },
  agri(c) { // greenhouse and a rice field on the east edge
    const z = Z.earth
    block(c, 'earth', { w: 56, windows: false, door: false })
    for (let j = 0; j < 14; j++) { const w = Math.round(26 * Math.sqrt(1 - ((14 - j) / 15) ** 2)); rect(c, 36 - w, 8 + j, w * 2, 1, j % 3 === 0 ? O : GLH) }
    box(c, 10, 22, 52, 52, GL)
    for (let gx = 14; gx < 60; gx += 8) vline(c, gx, 23, 50, GLH)
    for (let gy = 30; gy < 72; gy += 10) hline(c, 11, gy, 50, GLH)
    for (let rx = 14; rx < 58; rx += 8) { rect(c, rx, 58, 4, 12, GREEN); rect(c, rx + 1, 56, 2, 3, GREEN_L) }
    doorBay(c, 'earth')
    rect(c, 66, 52, 26, 23, '#B6DCA0')
    for (let ry = 54; ry < 74; ry += 4) for (let rx = 68; rx < 90; rx += 4) { px(c, rx, ry, GREEN_D); px(c, rx + 1, ry - 1, GREEN) }
  },
}

// Not faculties: the central hall (directory board, signposts) and the campus gate on the south avenue.
const ZONE_ORDER = ['health', 'sci', 'soc', 'biz', 'arts', 'earth']
DRAW.hall = (c) => {
  block(c, 'soc', { windows: false })
  ZONE_ORDER.forEach((zone, i) => { rect(c, 12 + i * 12, 14, 10, 6, Z[zone].b); rect(c, 12 + i * 12, 14, 10, 1, Z[zone].l) })
  c.rbox(c.ox + 30, c.oy + 34, 36, 40, 10, GLD, O)
  vline(c, 48, 38, 36, O); for (let gy = 40; gy < 72; gy += 6) hline(c, 33, gy, 30, GL)
  for (const wx of [12, 70]) for (const wy of [34, 46]) { rect(c, wx, wy, 8, 6, GL); hline(c, wx, wy, 8, GLH) }
  box(c, 36, 26, 24, 6, WALL)
}
DRAW.gate = (c) => {
  for (const x of [10, 72]) { box(c, x, 20, 14, 55, WALL); rect(c, x + 2, 22, 10, 3, Z.soc.b); rect(c, x + 2, 28, 10, 40, WSH) }
  box(c, 6, 8, 84, 16, ROOF)
  ZONE_ORDER.forEach((zone, i) => { rect(c, 10 + i * 13, 11, 11, 8, Z[zone].b); rect(c, 10 + i * 13, 11, 11, 1, Z[zone].l) })
}
const sprite = (id) => ({
  frames: 1,
  draw: (c) => {
    c.ox = 0
    c.oy = 0
    DRAW[id](c)
    shadow(c, 8, 80)
  },
})

export default {
  name: 'campus_buildings',
  frameW: FRAME_W,
  frameH: FRAME_H,
  sprites: Object.fromEntries([...BUILDINGS.map((b) => b.id), 'hall', 'gate'].map((id) => [id, sprite(id)])),
}
