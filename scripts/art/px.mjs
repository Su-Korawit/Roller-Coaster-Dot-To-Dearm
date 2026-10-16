// Tiny pixel canvas for generated Soft Pixel art. RGBA, no anti-aliasing.
// Colours: '#rrggbb' or [r, g, b, a]. Alpha < 255 composites "over" what is there.
import sharp from 'sharp'

export function hexToRgba(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}

export class Canvas {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.d = new Uint8ClampedArray(w * h * 4)
  }

  getPixel(x, y) {
    const i = (y * this.w + x) * 4
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]
  }

  px(x, y, c) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return
    const [r, g, b, a] = typeof c === 'string' ? hexToRgba(c) : c
    const i = (y * this.w + x) * 4
    if (a === 255) {
      this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255
      return
    }
    if (a === 0) return
    const sa = a / 255
    const da = this.d[i + 3] / 255
    const oa = sa + da * (1 - sa)
    for (let k = 0; k < 3; k++) {
      this.d[i + k] = ([r, g, b][k] * sa + this.d[i + k] * da * (1 - sa)) / oa
    }
    this.d[i + 3] = oa * 255
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c)
  }
  hline(x, y, w, c) { this.rect(x, y, w, 1, c) }
  vline(x, y, h, c) { this.rect(x, y, 1, h, c) }
  box(x, y, w, h, fill, line) {
    this.rect(x, y, w, h, line)
    this.rect(x + 1, y + 1, w - 2, h - 2, fill)
  }

  // Filled ellipse, symmetric, no anti-aliasing.
  ellipse(cx, cy, rx, ry, c) {
    for (let j = -ry; j <= ry; j++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / ((ry + 0.5) * (ry + 0.5)))))
      this.rect(cx - w, cy + j, w * 2 + 1, 1, c)
    }
  }
  oval(cx, cy, rx, ry, fill, line) {
    this.ellipse(cx, cy, rx + 1, ry + 1, line)
    this.ellipse(cx, cy, rx, ry, fill)
  }

  // Rounded rect; r = corner radius in px.
  rrect(x, y, w, h, r, c) {
    for (let j = 0; j < h; j++) {
      const d = j < r ? r - j : j >= h - r ? j - (h - r - 1) : 0
      const inset = d ? Math.round(r - Math.sqrt(Math.max(0, r * r - d * d))) : 0
      this.rect(x + inset, y + j, w - inset * 2, 1, c)
    }
  }
  rbox(x, y, w, h, r, fill, line) {
    this.rrect(x, y, w, h, r, line)
    this.rrect(x + 1, y + 1, w - 2, h - 2, Math.max(0, r - 1), fill)
  }

  // rows: array of strings; each char looks up a colour in `pal` ('.' / unknown = skip).
  bitmap(x, y, rows, pal) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) this.px(x + i, y + j, pal[ch]) }))
  }

  blit(src, x, y) {
    for (let j = 0; j < src.h; j++) {
      for (let i = 0; i < src.w; i++) {
        const [r, g, b, a] = src.getPixel(i, j)
        if (a) this.px(x + i, y + j, [r, g, b, a])
      }
    }
  }

  async toPng(scale = 1) {
    const raw = sharp(Buffer.from(this.d), { raw: { width: this.w, height: this.h, channels: 4 } })
    const png = await raw.png().toBuffer()
    if (scale === 1) return png
    return sharp(png).resize(this.w * scale, this.h * scale, { kernel: 'nearest' }).png().toBuffer()
  }

  async save(file, scale = 1) {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(file, await this.toPng(scale))
  }
}
