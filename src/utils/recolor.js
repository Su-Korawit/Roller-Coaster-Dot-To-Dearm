// Palette swaps for pixel art: rotate hue (degrees), scale saturation / lightness.
// Used to give the one Sprout Lands roof sheet several colours (see worldScenes ROOF_VARIANTS).

export function recolorPixel(r, g, b, { hue = 0, sat = 1, light = 1 } = {}) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let l = (max + min) / 2
  const d = max - min
  let h = 0, s = 0
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  h = (h + hue + 360) % 360
  s = Math.min(1, Math.max(0, s * sat))
  l = Math.min(1, Math.max(0, l * light))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)]
}

// In-place over RGBA ImageData-style bytes; transparent pixels are left alone.
export function recolorImageData(data, opts) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const [r, g, b] = recolorPixel(data[i], data[i + 1], data[i + 2], opts)
    data[i] = r; data[i + 1] = g; data[i + 2] = b
  }
  return data
}
