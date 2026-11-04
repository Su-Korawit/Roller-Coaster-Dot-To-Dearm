// Study room v2 — polish pass (light, shadows, decor) + pets.
import { Canvas } from './px.mjs'

const SPRITES = 'D:/Ikkyusan/Desktop/03_Projects/Games/Roller Coaster Dot To Dearm/public/assets/sprites'
const out = process.argv[2]
const O = '#5c4e92'
const GL = '#A4D3EC', GLH = '#E1F3FB', SKY = '#DDF1FB'
const SH = [70, 60, 116, 38]
const SUN = [255, 247, 214, 90]
const GLOW = [255, 214, 120, 34]
const T = {
  minimal: {
    wall: '#FFFFFF', wallLine: '#F2F1F7', low: '#F4F3F9', trim: '#DCD9E8', base: '#CFCCE0', top: '#BEB9D6',
    floor: '#EEEDF3', floor2: '#E9E8F0', plank: '#DEDCE8',
    desk: '#FFFFFF', deskFace: '#E3E1EC', wood: '#E9DCC6', woodD: '#CDB896',
    rug: '#E6DDF7', rugB: '#B9A6E6', rugP: '#F8C3BF', quilt: '#BFD3F8', quiltD: '#9DBBF2', curtain: '#F8D7D4', curtainD: '#EDB7B2',
  },
  wood: {
    wall: '#E2C29C', wallLine: '#D6B288', low: '#C99E70', trim: '#A8784C', base: '#8A5E38', top: '#6B4224',
    floor: '#B98654', floor2: '#B07D4C', plank: '#9C6A3E',
    desk: '#8E5B34', deskFace: '#764A2A', wood: '#8E5B34', woodD: '#6B4224',
    rug: '#C2614F', rugB: '#8E4034', rugP: '#E8B75A', quilt: '#6E9C76', quiltD: '#557E5E', curtain: '#E8B75A', curtainD: '#C99536',
  },
}

// Outline-then-fill sprite from rect parts: [x, y, w, h, colour]
function sprite(c, x0, y0, parts) {
  for (const [x, y, w, h] of parts) c.rect(x0 + x - 1, y0 + y - 1, w + 2, h + 2, O)
  for (const [x, y, w, h, col] of parts) c.rect(x0 + x, y0 + y, w, h, col)
}
const shadow = (c, x, y, w, h = 3) => c.rect(x, y, w, h, SH)

const PETS = {
  cat: { b: '#F0A35E', d: '#D07A3A', w: '#FFF6EA', e: O, n: '#E8817B' },
  blackcat: { b: '#4A4566', d: '#38344F', w: '#6E6890', e: '#F4D35E', n: '#E8817B' },
  shiba: { b: '#E5A56A', d: '#C9844A', w: '#FFF6EA', e: O, n: O },
  bunny: { b: '#FFFFFF', d: '#ECEAF4', w: '#FFFFFF', e: O, n: '#F4A3B5' },
}
function pet(c, x, y, kind) {
  const p = PETS[kind]
  if (kind === 'bunny') {
    sprite(c, x, y, [[2, 0, 2, 5, p.b], [7, 0, 2, 5, p.b], [1, 4, 9, 6, p.b], [2, 9, 8, 5, p.b], [10, 11, 2, 2, p.d]])
    c.rect(x + 2, y + 1, 1, 3, '#F4C5D0'); c.rect(x + 8, y + 1, 1, 3, '#F4C5D0')
  } else {
    const ears = kind === 'shiba' ? [[1, 1, 3, 3, p.b], [7, 1, 3, 3, p.b]] : [[1, 0, 2, 3, p.b], [8, 0, 2, 3, p.b]]
    sprite(c, x, y, [...ears, [1, 3, 9, 6, p.b], [2, 9, 8, 5, p.b], [10, 9, 2, 2, p.b], [11, 7, 2, 3, p.b]])
    c.rect(x + 3, y + 6, 5, 3, p.w); c.rect(x + 4, y + 10, 4, 4, p.w)
    if (kind === 'cat') { c.px(x + 4, y + 3, p.d); c.px(x + 6, y + 3, p.d); c.px(x + 2, y + 10, p.d); c.px(x + 9, y + 10, p.d) }
  }
  c.px(x + 3, y + 6, p.e); c.px(x + 7, y + 6, p.e); c.px(x + 5, y + 7, p.n)
  c.px(x + 3, y + 13, O); c.px(x + 7, y + 13, O)
}
function petBed(c, x, y, t) {
  c.rect(x + 2, y, 18, 10, O); c.rect(x, y + 2, 22, 6, O)
  c.rect(x + 2, y + 1, 18, 8, t.rugP); c.rect(x + 1, y + 2, 20, 6, t.rugP)
  c.rect(x + 4, y + 3, 14, 4, '#FFFFFF')
}

function shell(c, x0, y0, W, H, t) {
  c.rect(x0, y0, W, H, O)
  c.rect(x0 + 3, y0 + 3, W - 6, 36, t.wall)
  for (let x = x0 + 5; x < x0 + W - 3; x += 10) c.vline(x, y0 + 5, 22, t.wallLine)
  c.rect(x0 + 3, y0 + 3, W - 6, 2, t.top)
  c.rect(x0 + 3, y0 + 27, W - 6, 9, t.low); c.hline(x0 + 3, y0 + 27, W - 6, t.trim)   // wainscot
  c.rect(x0 + 3, y0 + 36, W - 6, 3, t.base)
  for (let y = y0 + 39, row = 0; y < y0 + H - 5; y += 6, row++) {
    c.rect(x0 + 3, y, W - 6, Math.min(6, y0 + H - 5 - y), row % 2 ? t.floor : t.floor2)
    c.hline(x0 + 3, y, W - 6, t.plank)
    for (let x = x0 + 3 + (row % 3) * 11; x < x0 + W - 3; x += 33) c.vline(x, y, Math.min(6, y0 + H - 5 - y), t.plank)
  }
  c.rect(x0 + 3, y0 + 39, W - 6, 2, SH)                        // AO under back wall
  c.rect(x0 + 3, y0 + 39, 2, H - 44, SH)
  c.rect(x0 + 3, y0 + H - 5, W - 6, 2, t.top)
}
function windowView(c, x, y, t) {
  c.box(x, y, 32, 21, SKY, O); c.vline(x + 16, y + 1, 19, O)
  c.rect(x + 1, y + 13, 30, 7, GL); c.hline(x + 1, y + 13, 30, GLH)
  for (const tx of [3, 9, 21, 26]) { c.rect(x + tx, y + 10, 3, 3, '#8CC084'); c.px(x + tx + 1, y + 9, '#8CC084') }
  c.rect(x + 4, y + 4, 6, 2, '#FFFFFF'); c.rect(x + 22, y + 6, 5, 1, '#FFFFFF')        // clouds
  c.rect(x - 3, y + 21, 38, 2, O); c.rect(x - 2, y + 21, 36, 1, t.trim)
  for (const side of [x - 5, x + 31]) {                                               // curtains
    c.rect(side, y - 2, 6, 25, O); c.rect(side + 1, y - 1, 4, 23, t.curtain); c.vline(side + 3, y - 1, 23, t.curtainD)
  }
  c.rect(x - 6, y - 3, 44, 2, O)                                                      // rod
  c.box(x + 24, y + 17, 4, 4, '#FFFFFF', O); c.rect(x + 25, y + 14, 2, 3, '#5FB57A')   // sill cactus
}
function sunPatch(c, x, y) { for (let j = 0; j < 30; j++) c.rect(x + Math.floor(j * 0.7), y + j, 34, 1, SUN) }
function stringLights(c, x, y, w) {
  for (let i = 0; i <= w; i++) { const sag = Math.round(3 * Math.sin((i / w) * Math.PI)); c.px(x + i, y + sag, '#8C84B8') }
  for (let i = 3; i < w; i += 6) { const sag = Math.round(3 * Math.sin((i / w) * Math.PI)); c.rect(x + i, y + sag + 1, 2, 2, i % 12 === 3 ? '#FFE08A' : '#F8C3BF') }
}
function frame(c, x, y) {
  c.box(x, y, 16, 12, '#FFFFFF', O); c.rect(x + 2, y + 2, 12, 8, '#DDF1FB')
  c.rect(x + 3, y + 6, 4, 4, '#9BCB8C'); c.rect(x + 6, y + 4, 4, 6, '#7BC48C'); c.rect(x + 9, y + 7, 4, 3, '#9BCB8C'); c.px(x + 11, y + 3, '#FFE08A')
}
function clock(c, x, y) {
  c.rect(x + 2, y, 6, 10, O); c.rect(x, y + 2, 10, 6, O); c.rect(x + 1, y + 1, 8, 8, O)
  c.rect(x + 2, y + 1, 6, 8, '#FFFFFF'); c.rect(x + 1, y + 2, 8, 6, '#FFFFFF')
  c.vline(x + 5, y + 2, 3, O); c.hline(x + 5, y + 5, 2, '#E8817B')
}
function shelf(c, x, y, t) {
  shadow(c, x + 1, y + 32, 24)
  c.box(x, y, 24, 32, t.wood, O); c.vline(x + 1, y + 1, 30, t.woodD)
  const books = ['#E8817B', '#5B8DEF', '#9B7BD6', '#E8A93B', '#5FB57A', '#E58BC0']
  for (const sy of [y + 2, y + 12, y + 22]) {
    c.rect(x + 1, sy + 8, 22, 1, t.woodD)
    let bx = x + 2
    for (let i = 0; i < 6; i++) {
      const h = 6 + ((i + sy) % 3), col = books[(i + sy) % 6]
      c.rect(bx, sy + 8 - h, 3, h, col); c.px(bx, sy + 8 - h, '#FFFFFF'); bx += 3 + (i % 2)
    }
  }
  c.box(x + 15, y - 5, 6, 5, '#FFFFFF', O); c.rect(x + 15, y - 9, 6, 4, '#7BC48C'); c.px(x + 14, y - 7, '#5FB57A') // shelf-top plant
}
function desk(c, x, y, t, pot = 3) {
  shadow(c, x + 2, y + 22, 40)
  for (let r = 16; r > 0; r -= 4) c.rect(x + 31 - r, y - 4 - r / 2, r * 2, r, GLOW)      // lamp glow
  c.box(x, y, 40, 12, t.desk, O); c.hline(x + 1, y + 1, 38, '#FFFFFF')
  c.rect(x + 1, y + 11, 38, 5, t.deskFace); c.hline(x, y + 16, 40, O)
  c.rect(x + 2, y + 17, 2, 6, O); c.rect(x + 36, y + 17, 2, 6, O)
  c.rect(x + 3, y + 3, 10, 6, '#FFFFFF'); c.rect(x + 3, y + 3, 10, 1, O); c.vline(x + 8, y + 3, 6, '#D2CFE2')
  c.hline(x + 4, y + 5, 3, '#D2CFE2'); c.hline(x + 9, y + 5, 3, '#D2CFE2')
  c.box(x + 13, y + 6, 4, 4, '#FFFFFF', O); c.px(x + 17, y + 7, O)                      // mug
  c.rect(x + 30, y - 6, 2, 9, O); c.rect(x + 27, y - 9, 8, 4, '#E8A93B'); c.hline(x + 27, y - 9, 8, O); c.px(x + 31, y - 5, '#FFE08A')
  c.box(x + 19, y + 2, 9, 7, '#E8817B', O); c.hline(x + 20, y + 3, 7, '#F8C3BF')
  const leaf = '#5FB57A', leafL = '#9BCB8C'
  if (pot >= 1) c.vline(x + 23, y - 2 - pot * 2, 4 + pot * 2, '#4E8F5A')
  if (pot >= 2) { c.rect(x + 20, y - 4 - pot, 3, 2, leaf); c.rect(x + 24, y - 6 - pot, 3, 2, leafL) }
  if (pot >= 3) { c.rect(x + 21, y - 12, 5, 4, leaf); c.px(x + 22, y - 12, leafL) }
  if (pot === -1) { c.vline(x + 23, y - 3, 5, '#9C7A4E'); c.rect(x + 24, y - 3, 3, 1, '#9C7A4E'); c.rect(x + 20, y - 1, 3, 1, '#B89A6A') }
}
function chair(c, x, y, t) { shadow(c, x + 1, y + 10, 12, 2); c.box(x, y, 12, 10, t.wood, O); c.box(x + 1, y - 6, 10, 7, t.desk, O); c.hline(x + 2, y - 5, 8, '#FFFFFF') }
function bed(c, x, y, t) {
  shadow(c, x + 2, y + 42, 30)
  c.box(x, y - 4, 30, 8, t.wood, O); c.hline(x + 1, y - 3, 28, '#FFFFFF')            // headboard
  c.box(x, y + 3, 30, 39, t.wood, O)
  c.box(x + 2, y + 4, 26, 36, '#FFFFFF', O)
  c.box(x + 5, y + 6, 20, 8, '#F6F5FA', O); c.hline(x + 6, y + 12, 18, '#E3E1EC')
  c.box(x + 2, y + 17, 26, 23, t.quilt, O)
  for (let j = 0; j < 21; j += 4) for (let i = (j / 4) % 2 ? 2 : 0; i < 24; i += 4) c.rect(x + 3 + i, y + 18 + j, 2, 2, t.quiltD)
  c.hline(x + 3, y + 18, 24, '#FFFFFF')
}
function nightstand(c, x, y, t) {
  shadow(c, x + 1, y + 10, 12, 2); c.box(x, y, 12, 10, t.wood, O); c.hline(x + 1, y + 5, 10, t.woodD); c.px(x + 6, y + 7, O)
  c.rect(x + 5, y - 4, 2, 4, O); c.rect(x + 3, y - 7, 6, 3, '#F8C3BF'); c.hline(x + 3, y - 7, 6, O)
  for (let r = 10; r > 0; r -= 4) c.rect(x + 6 - r, y - 6 - r / 2, r * 2, r, GLOW)
}
function rug(c, x, y, w, h, t) {
  c.rect(x + 2, y, w - 4, h, t.rugB); c.rect(x, y + 2, w, h - 4, t.rugB)
  c.rect(x + 2, y + 2, w - 4, h - 4, t.rug)
  for (let i = x + 5; i < x + w - 5; i += 4) { c.px(i, y + 4, t.rugB); c.px(i, y + h - 5, t.rugB) }
  const cx = x + w / 2, cy = y + h / 2
  for (let k = 0; k < 7; k++) { c.hline(cx - k * 2, cy - 6 + k, k * 4 + 1, t.rugP); c.hline(cx - k * 2, cy + 6 - k, k * 4 + 1, t.rugP) }
}
function plant(c, x, y) {
  shadow(c, x, y + 18, 12, 2)
  c.box(x, y + 10, 11, 8, '#FFFFFF', O); c.hline(x + 1, y + 13, 9, '#E3E1EC')
  sprite(c, x, y, [[-3, 3, 7, 5, '#5FB57A'], [6, 2, 7, 5, '#5FB57A'], [2, -2, 6, 7, '#7BC48C'], [1, 6, 9, 4, '#4E8F5A']])
  c.px(x + 4, y, '#9BCB8C'); c.px(x - 1, y + 4, '#9BCB8C'); c.px(x + 9, y + 3, '#9BCB8C')
}
function trophyShelf(c, x, y, t) {
  c.rect(x, y, 36, 3, t.woodD); c.hline(x, y + 3, 36, O)
  for (let i = 0; i < 5; i++) { const px = x + 2 + i * 7; c.box(px, y - 5, 5, 5, '#E8817B', O); c.rect(px + 1, y - 9, 3, 4, i % 2 ? '#5FB57A' : '#9BCB8C'); c.px(px + 2, y - 10, '#9BCB8C') }
}
function board(c, x, y) {
  c.box(x, y, 26, 18, '#F3E3C3', O)
  c.rect(x + 3, y + 3, 7, 6, '#FFF59A'); c.rect(x + 12, y + 4, 9, 7, '#BFE3FF'); c.rect(x + 5, y + 11, 9, 5, '#F8C3BF')
  c.hline(x + 13, y + 6, 6, '#8FB0EE'); c.hline(x + 13, y + 8, 4, '#8FB0EE')
  c.px(x + 6, y + 3, '#E8817B'); c.px(x + 16, y + 4, '#E8817B'); c.px(x + 9, y + 11, '#E8817B')
}

function starter(c, x0, y0, t, char, petKind = 'cat') {
  const W = 184, H = 148
  shell(c, x0, y0, W, H, t)
  stringLights(c, x0 + 8, y0 + 6, 50)
  trophyShelf(c, x0 + 18, y0 + 22, t)
  windowView(c, x0 + 76, y0 + 8, t)
  sunPatch(c, x0 + 80, y0 + 41)
  frame(c, x0 + 122, y0 + 9); clock(c, x0 + 142, y0 + 10)
  board(c, x0 + 46, y0 + 30 - 21)
  shelf(c, x0 + 152, y0 + 22, t)
  rug(c, x0 + 58, y0 + 84, 60, 34, t)
  desk(c, x0 + 12, y0 + 48, t, 3)
  chair(c, x0 + 28, y0 + 76, t)
  nightstand(c, x0 + 118, y0 + 76, t)
  bed(c, x0 + 136, y0 + 82, t)
  plant(c, x0 + 10, y0 + 116)
  petBed(c, x0 + 92, y0 + 120, t)
  pet(c, x0 + 97, y0 + 112, petKind)
  c.blit(char, x0 + 64, y0 + 70)
}

function expanded(c, x0, y0, t, char) {
  const W = 184, H = 148
  starter(c, x0, y0, t, char, 'blackcat')
  const bx = x0 + W - 3, BW = 96
  c.rect(bx, y0, BW, H, O)
  c.rect(bx, y0 + 3, BW - 3, H - 6, SKY)
  c.rect(bx + 6, y0 + 8, 8, 2, '#FFFFFF'); c.rect(bx + 50, y0 + 12, 10, 2, '#FFFFFF')
  c.rect(bx, y0 + 26, BW - 3, H - 29, GL)
  for (let i = 0; i < 12; i++) c.rect(bx + 4 + ((i * 29) % (BW - 14)), y0 + 34 + ((i * 17) % 100), 5, 1, GLH)
  for (const [lx, ly] of [[70, 50], [80, 120], [64, 132]]) { c.rect(bx + lx, y0 + ly, 4, 2, '#8DC48A'); c.px(bx + lx + 1, y0 + ly - 1, '#F4A3B5') }
  c.rect(bx, y0 + 30, BW - 3, 3, '#7BC48C'); c.rect(bx, y0 + 33, BW - 3, 1, '#5FB57A')
  for (const tx of [8, 26, 58, 76]) { c.rect(bx + tx, y0 + 21, 5, 9, '#8CC084'); c.rect(bx + tx + 1, y0 + 18, 3, 3, '#9BCB8C') }
  c.rect(bx, y0 + 60, 58, 74, '#E9DCC6')
  for (let y = y0 + 60, r = 0; y < y0 + 134; y += 5, r++) { c.hline(bx, y, 58, '#D5C29F'); c.vline(bx + 10 + (r % 3) * 16, y, 5, '#D5C29F') }
  c.rect(bx, y0 + 58, 58, 2, O); c.rect(bx + 57, y0 + 58, 2, 78, O); c.rect(bx, y0 + 134, 59, 2, O)
  for (let y = y0 + 62; y < y0 + 132; y += 6) c.rect(bx + 54, y, 3, 3, '#FFFFFF')
  stringLights(c, bx + 2, y0 + 61, 52)
  c.rect(bx - 2, y0 + 66, 4, 32, GLH); c.vline(bx - 3, y0 + 66, 32, O); c.vline(bx + 2, y0 + 66, 32, O)
  shadow(c, bx + 16, y0 + 98, 18); c.box(bx + 15, y0 + 86, 18, 12, '#FFFFFF', O); c.box(bx + 21, y0 + 82, 5, 5, '#E8A93B', O)
  c.box(bx + 8, y0 + 100, 9, 8, '#BFD3F8', O); c.box(bx + 31, y0 + 100, 9, 8, '#BFD3F8', O)
  plant(c, bx + 41, y0 + 66); plant(c, bx + 6, y0 + 112)
  pet(c, bx + 34, y0 + 114, 'shiba')
}

const base = new Canvas(1, 1)
const char = await base.fromPng(`${SPRITES}/Characters/Basic_Charakter_Spritesheet.png`, 0, 0, 48, 48)
const sheet = new Canvas(184 * 2 + 280 + 30, 156)
sheet.rect(0, 0, sheet.w, sheet.h, '#FFFFFF')
starter(sheet, 5, 4, T.minimal, char, 'cat')
starter(sheet, 196, 4, T.wood, char, 'bunny')
expanded(sheet, 387, 4, T.minimal, char)
await sheet.save(out, 3)

const pets = new Canvas(4 * 24, 22); pets.rect(0, 0, pets.w, pets.h, '#FFFFFF')
;['cat', 'blackcat', 'shiba', 'bunny'].forEach((k, i) => pet(pets, 6 + i * 24, 4, k))
await pets.save(out.replace('.png', '-pets.png'), 6)
console.log('saved', out)
