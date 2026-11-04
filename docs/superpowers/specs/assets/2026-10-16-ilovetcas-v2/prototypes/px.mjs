// Tiny pixel-canvas helpers for generated pixel art.
import { createRequire } from 'node:module'
const sharp = createRequire('D:/Ikkyusan/Desktop/03_Projects/Games/Roller Coaster Dot To Dearm/package.json')('sharp')

export const hex = (h) => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}

export class Canvas {
  constructor(w, h) {
    this.w = w; this.h = h
    this.d = new Uint8ClampedArray(w * h * 4)
  }
  px(x, y, c) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return
    const [r, g, b, a] = typeof c === 'string' ? hex(c) : c
    const i = (y * this.w + x) * 4
    if (a === 255) { this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255; return }
    const t = a / 255
    this.d[i] = this.d[i] * (1 - t) + r * t
    this.d[i + 1] = this.d[i + 1] * (1 - t) + g * t
    this.d[i + 2] = this.d[i + 2] * (1 - t) + b * t
    this.d[i + 3] = Math.max(this.d[i + 3], a)
  }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c) }
  hline(x, y, w, c) { this.rect(x, y, w, 1, c) }
  vline(x, y, h, c) { this.rect(x, y, 1, h, c) }
  box(x, y, w, h, fill, line) { this.rect(x, y, w, h, line); this.rect(x + 1, y + 1, w - 2, h - 2, fill) }
  // filled ellipse (pixel-perfect, no AA)
  ellipse(cx, cy, rx, ry, c) {
    for (let j = -ry; j <= ry; j++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / ((ry + 0.5) * (ry + 0.5)))))
      this.rect(cx - w, cy + j, w * 2 + 1, 1, c)
    }
  }
  // ellipse with outline
  oval(cx, cy, rx, ry, fill, line) { this.ellipse(cx, cy, rx + 1, ry + 1, line); this.ellipse(cx, cy, rx, ry, fill) }
  // rounded rect: r = corner radius in px (1..4)
  rrect(x, y, w, h, r, c) {
    for (let j = 0; j < h; j++) {
      const d = j < r ? r - j : j >= h - r ? j - (h - r - 1) : 0
      const inset = d ? Math.round(r - Math.sqrt(Math.max(0, r * r - d * d))) : 0
      this.rect(x + inset, y + j, w - inset * 2, 1, c)
    }
  }
  rbox(x, y, w, h, r, fill, line) { this.rrect(x, y, w, h, r, line); this.rrect(x + 1, y + 1, w - 2, h - 2, Math.max(0, r - 1), fill) }
  // bitmap: array of strings, chars map to colours via `pal` ('.'/' ' = skip)
  bitmap(x, y, rows, pal) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) this.px(x + i, y + j, pal[ch]) }))
  }
  blit(src, x, y) {
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const k = (j * src.w + i) * 4
      if (src.d[k + 3]) this.px(x + i, y + j, [src.d[k], src.d[k + 1], src.d[k + 2], src.d[k + 3]])
    }
  }
  async fromPng(file, left, top, w, h) {
    const { data } = await sharp(file).extract({ left, top, width: w, height: h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const c = new Canvas(w, h); c.d.set(data); return c
  }
  async save(file, scale = 1) {
    const img = sharp(Buffer.from(this.d), { raw: { width: this.w, height: this.h, channels: 4 } })
    const buf = await img.png().toBuffer()
    await sharp(buf).resize(this.w * scale, this.h * scale, { kernel: 'nearest' }).png().toFile(file)
  }
}
