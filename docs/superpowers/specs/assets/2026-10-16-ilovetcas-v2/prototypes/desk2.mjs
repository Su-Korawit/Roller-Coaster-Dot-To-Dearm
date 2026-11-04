// Studygram desk v2 — softer, rounder shapes. draw(F) renders animation frame F (0..7).
import { Canvas } from './px.mjs'

export const W = 120, H = 150
const O = '#6f63a6'          // softer outline than the hard #5c4e92
const OD = '#5c4e92'
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const dither = (x, y, t) => (t * 16 > BAYER[y & 3][x & 3] ? 1 : 0)

export function draw(F = 0) {
  const c = new Canvas(W, H)
  const SW = [0, 1, 0, -1][F % 4], BR = F % 4 < 2 ? 1 : 0
  const SH = [92, 70, 110, 46]

  // wall
  c.rect(0, 0, W, 92, '#FFF6EE'); c.rect(72, 0, 48, 92, '#FFF1E6'); c.rect(98, 0, 22, 92, '#FDEBDD')

  // arched window
  const wx = 24, wy = 8, ww = 72, wh = 54, ar = 18
  const inset = (y) => (y < ar ? Math.round((ww / 2) - (ww / 2) * Math.sqrt(1 - ((ar - y) / ar) ** 2)) : 0)
  const sky = ['#F2A9A0', '#F6BFA6', '#F9D4B0', '#FBE6C2', '#FBEFD6']
  for (let y = -3; y < wh + 3; y++) { const i = inset(Math.max(0, y)); c.rect(wx - 3 + i, wy + y, ww + 6 - i * 2, 1, OD) }
  const ly = wy + 36
  for (let y = 0; y < wh; y++) {
    const i = inset(y), t = y / (36 * 0.95), k = Math.min(3, Math.floor(t * 4)), f = t * 4 - k
    for (let x = i; x < ww - i; x++) c.px(wx + x, wy + y, y >= 36 ? '#B9C8E6' : dither(x, y, f) ? sky[Math.min(4, k + 1)] : sky[k])
  }
  c.ellipse(wx + 48, wy + 28, 5, 4, '#FFF3D6')                                            // sun (round)
  for (const [tx, r] of [[6, 5], [13, 6], [20, 4], [58, 5], [65, 7]]) c.ellipse(wx + tx, ly - r + 1, r, r, '#B79AC6') // round tree silhouettes
  c.rect(wx, ly, ww, wh - 36, '#B9C8E6'); c.rect(wx, ly + 9, ww, wh - 45, '#AABDE2')
  for (let k = 0; k < 5; k++) c.hline(wx + 45 - k + ((F + k) % 2), ly + 2 + k * 3, 6 + k * 2, '#FCE2C4')
  for (let x = wx + 4; x < wx + ww - 4; x += 12) c.hline(x + (F % 4) - 2, ly + 7 + (x % 3) * 3, 3, '#CBD8EF')
  c.hline(wx, ly, ww, '#A688BA')
  { const bx = wx + 10 + F * 7, by = wy + 22 + (F % 2); if (bx < wx + ww - 10) { c.px(bx, by, OD); c.px(bx + 1, by + 1, OD); c.px(bx + 2, by, OD); c.px(bx + 3, by - 1 + (F % 2), OD) } }
  c.rect(wx + ww / 2 - 1, wy + 2, 2, wh - 2, '#FFFFFF'); c.rect(wx, wy + 30, ww, 2, '#FFFFFF')  // mullions
  c.rrect(wx - 6, wy + wh + 1, ww + 12, 4, 2, OD); c.rrect(wx - 5, wy + wh + 1, ww + 10, 2, 1, '#FFFFFF') // sill
  // sheer curtains with soft wave edge
  for (const [cx, w, dir] of [[wx - 9, 15, 1], [wx + ww - 6, 15, -1]]) {
    for (let y = wy - 2; y < wy + wh + 12; y++) {
      const wave = Math.round(1.5 * Math.sin((y + F * 2) / 5))
      for (let x = 0; x < w + (dir > 0 ? wave : -wave); x++) if ((x + (y >> 2)) % 4 !== 0) c.px(cx + (dir > 0 ? x : w - x), y, [255, 255, 255, 140])
    }
  }
  c.rrect(wx - 13, wy - 6, ww + 26, 3, 1, OD)

  // string lights (round bulbs)
  for (let i = 0; i <= W; i++) c.px(i, 4 + Math.round(3 * Math.sin((i / W) * Math.PI * 2)), '#C3B8E0')
  for (let i = 3; i < W; i += 8) {
    const y = 6 + Math.round(3 * Math.sin((i / W) * Math.PI * 2)), on = (((i / 8) | 0) + F) % 3 === 0
    if (on) c.ellipse(i + 1, y + 1, 3, 3, [255, 230, 160, 60])
    c.ellipse(i + 1, y + 1, 1, 1, on ? '#FFE08A' : '#FFC2C8')
  }
  // wall notes + polaroid (rounded)
  c.rbox(5, 24, 13, 12, 2, '#FFF59A', O); c.hline(7, 28, 8, '#E8C95A'); c.hline(7, 31, 5, '#E8C95A')
  c.ellipse(11, 25, 1, 1, '#E8817B')
  c.rbox(7, 40, 12, 11, 2, '#BFE3FF', O); c.hline(9, 44, 7, '#8FB0EE')
  c.rbox(103, 22, 14, 17, 2, '#FFFFFF', O); c.rrect(105, 24, 10, 9, 1, '#F6BFA6'); c.ellipse(108, 30, 2, 2, '#B79AC6'); c.ellipse(112, 26, 1, 1, '#FFF3D6')
  c.rbox(105, 43, 12, 10, 2, '#F8C3BF', O); c.hline(107, 47, 7, '#E8817B')

  // desk
  c.rect(0, 92, W, 58, '#E8D2B2')
  for (let y = 95; y < H; y += 6) for (let x = (y * 7) % 13; x < W; x += 21) { c.hline(x, y, 8, '#DEC6A2'); c.px(x + 8, y + 1, '#DEC6A2') }
  c.rect(0, 90, W, 2, '#D6BC96'); c.rect(0, 92, W, 1, '#F3E2C8')
  for (let j = 0; j < 58; j++) c.rect(30 + Math.floor(j * 0.9), 92 + j, 44, 1, [255, 236, 196, 64])
  for (let k = 0; k < 4; k++) { const s = (F * 3 + k * 11) % 40; c.px(44 + k * 7 + (s % 5), 128 - s, [255, 250, 230, 200]) } // dust motes

  // plant: round leaf clusters in a bowl pot
  c.ellipse(20, 93, 9, 2, SH)
  // bowl pot: rim + lower half-ellipse
  for (let j = 0; j <= 9; j++) { const w = Math.round(9 * Math.sqrt(1 - (j / 10) ** 2)); c.rect(20 - w - 1, 81 + j, w * 2 + 3, 1, O) }
  for (let j = 0; j <= 8; j++) { const w = Math.round(8 * Math.sqrt(1 - (j / 9.5) ** 2)); c.rect(20 - w, 81 + j, w * 2 + 1, 1, j === 4 ? '#F8C3BF' : '#FFFFFF') }
  c.rrect(9, 78, 23, 4, 2, O); c.rrect(10, 79, 21, 2, 1, '#FFFFFF')
  for (const [x, y, r] of [[12, 70, 6], [27, 68, 6], [19 + SW, 61, 7], [20, 73, 6]]) c.ellipse(x, y, r + 1, r, O)
  for (const [x, y, r, col] of [[12, 70, 6, '#5FB57A'], [27, 68, 6, '#5FB57A'], [19 + SW, 61, 7, '#7BC48C'], [20, 73, 6, '#4E8F5A']]) c.ellipse(x, y, r, r - 1, col)
  for (const [x, y] of [[17 + SW, 57], [9, 67], [25, 65], [22 + SW, 59]]) c.px(x, y, '#B6DCA0')
  c.vline(20, 75, 4, '#3F7A4A')

  // lamp: dome shade + round base, warm glow
  for (let r = 24; r > 0; r -= 5) c.ellipse(99, 74, r, Math.round(r * 0.6), [255, 214, 140, 18 + (F % 2) * 6])
  c.rect(98, 70, 2, 21, OD)
  c.ellipse(99, 70, 9, 6, OD); c.ellipse(99, 70, 8, 5, '#F6E7FF'); c.rect(89, 70, 21, 7, '#FFF6EE')
  c.rect(90, 70, 19, 1, OD); c.hline(92, 66, 6, '#FFFFFF')
  c.ellipse(99, 71, 4, 1, [255, 240, 180, 220])
  c.ellipse(99, 91, 6, 2, OD); c.ellipse(99, 91, 5, 1, '#FFFFFF')

  // sleeping cat: round loaf + curled tail
  c.ellipse(84, 93, 12, 2, SH)
  c.ellipse(83, 86 - BR, 11, 6 + BR, OD); c.ellipse(83, 86 - BR, 10, 5 + BR, '#F0A35E')
  for (const ex of [86, 94]) { c.rect(ex - 2, 79, 5, 1, OD); c.rect(ex - 1, 78, 3, 1, OD); c.px(ex, 77, OD); c.rect(ex - 1, 79, 3, 1, '#F0A35E'); c.px(ex, 78, '#F0A35E') }
  c.ellipse(90, 84, 6, 5, OD); c.ellipse(90, 84, 5, 4, '#F0A35E')
  c.px(86, 79, '#F0A35E'); c.px(94, 79, '#F0A35E'); c.px(86, 80, '#F0A35E'); c.px(94, 80, '#F0A35E')
  c.ellipse(90, 87, 3, 1, '#FFF6EA'); c.hline(87, 84, 2, OD); c.hline(92, 84, 2, OD); c.px(90, 86, '#E8817B')
  c.px(87, 86, [232, 129, 123, 120]); c.px(93, 86, [232, 129, 123, 120])
  c.ellipse(74, 89, 4, 2, OD); c.ellipse(74, 89, 3, 1, '#F0A35E')                              // tail curl
  for (const [x, y] of [[78, 82], [81, 81], [84, 82]]) c.px(x, y - BR, '#D07A3A')
  c.ellipse(88 + (F % 2), 74 - (F % 4), 1, 1, [255, 255, 255, 230 - (F % 4) * 40]); c.px(92, 71 - (F % 4), [255, 255, 255, 200 - (F % 4) * 40]) // zz

  // books (rounded spines)
  c.ellipse(15, 109, 13, 2, SH)
  for (const [y, col, hi] of [[97, '#CDEBC5', '#E8F6E4'], [101, '#BFD3F8', '#E1EBFC'], [105, '#F8C3BF', '#FCE3E1']]) { c.rbox(3, y, 25, 5, 2, col, O); c.hline(5, y + 1, 20, hi); c.rect(23, y + 1, 3, 3, '#FFFFFF') }

  // notebook with bowed pages
  c.ellipse(59, 134, 30, 2, SH)
  c.rbox(30, 104, 59, 30, 3, '#FFFFFF', O)
  c.vline(59, 105, 28, '#D9D4E8'); c.vline(58, 106, 26, '#EEEAF6'); c.vline(60, 106, 26, '#F4F2F9')
  c.px(58, 104, O); c.px(59, 104, O); c.px(60, 104, O); c.px(59, 103, O)                     // spine dip
  for (let y = 109; y < 131; y += 4) { c.hline(34, y, 22, '#E3E1EC'); c.hline(63, y, 22, '#E3E1EC') }
  c.rrect(33, 108, 15, 3, 1, [255, 214, 120, 150]); c.rrect(62, 112, 18, 3, 1, [248, 160, 190, 140]); c.rrect(33, 120, 11, 3, 1, [150, 220, 190, 150])
  for (let i = 0; i < 18; i++) { c.px(35 + ((i * 7) % 20), 108 + (i % 5) * 4, '#9A92C6'); c.px(64 + ((i * 5) % 19), 108 + (i % 5) * 4, '#9A92C6') }
  c.rbox(64, 120, 19, 10, 2, '#FFF59A', O); c.hline(67, 123, 13, '#C9B866'); c.hline(67, 126, 8, '#C9B866')

  // highlighters with round caps
  for (const [x, col, cap] of [[92, '#FFE08A', '#E8C24A'], [97, '#F8B5C8', '#E58BC0'], [102, '#A8E6CF', '#5FB57A']]) {
    for (let k = 0; k < 17; k++) { const px = x + Math.floor(k / 3.2); c.px(px - 1, 112 + k, O); c.rect(px, 112 + k, 3, 1, col); c.px(px + 3, 112 + k, O) }
    c.ellipse(x + 1, 112, 1, 1, cap); c.ellipse(x + 6, 129, 2, 1, cap)
  }

  // latte: round-bottom cup + ring handle + steam
  c.ellipse(111, 105, 8, 2, SH)
  c.rbox(104, 93, 13, 12, 4, '#FFFFFF', O); c.ellipse(110, 95, 5, 1, '#E8C9A0'); c.px(110, 95, '#FFFFFF'); c.px(109, 95, '#FFFFFF')
  c.ellipse(118, 99, 2, 3, O); c.ellipse(118, 99, 1, 2, '#FFF6EE')
  for (let k = 0; k < 3; k++) { const s = (F + k * 3) % 8; c.px(108 + k * 2 + (s % 3 === 1 ? 1 : 0), 91 - s, [255, 255, 255, 255 - s * 28]) }

  // phone face-down (rounded) with leaf sticker
  c.ellipse(18, 140, 10, 1, SH)
  c.rbox(8, 126, 20, 13, 3, '#4A4566', O); c.hline(11, 127, 14, '#6E6890'); c.ellipse(17, 132, 2, 2, '#7BC48C'); c.px(18, 129, '#5FB57A')
  return c
}
