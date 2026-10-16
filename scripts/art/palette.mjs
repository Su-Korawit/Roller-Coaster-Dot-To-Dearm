// Allowed opaque colours for generated Soft Pixel art. Extend this list (and the
// theme tokens) deliberately — never bypass lintPalette.

const TOKENS = [
  '#FFFFFF', '#F4F3F9', '#E9E6F3', '#D9D5EA', '#5C4E92', '#6F63A6', '#463C74', '#EFEBFA',
  '#2B2550', '#6E6890', '#B8467F', '#5FB57A', '#2F7A47', '#8FD3A4', '#E8A93B', '#8A5A00', '#C2413D',
  // zones: base / soft / deep
  '#E8817B', '#FCECEB', '#A25A56',
  '#5B8DEF', '#E6EEFD', '#4063A7',
  '#9B7BD6', '#F0EBF9', '#6D5696',
  '#FCF2E2', '#8A6420',
  '#E58BC0', '#FBEEF6', '#A06186',
  '#E7F4EB', '#437F55',
]

const ART = [
  // glass + sky
  '#A4D3EC', '#E1F3FB', '#DDF1FB',
  // greens
  '#4E8F5A', '#7BC48C', '#9BCB8C', '#B6DCA0', '#3F7A4A',
  // wood + desk
  '#E8D2B2', '#DEC6A2', '#D6BC96', '#F3E2C8', '#E9DCC6', '#CDB896',
  // pets
  '#F0A35E', '#D07A3A', '#FFF6EA',
  // sunset sky
  '#F2A9A0', '#F6BFA6', '#F9D4B0', '#FBE6C2', '#FBEFD6',
  // accents
  '#FFF59A', '#FFE08A', '#F8C3BF', '#BFD3F8', '#A8E6CF', '#4A4566',
  // hotbar icons
  '#FFF6EE', '#E9E1FA', '#8A6AD2', '#8FB0EE', '#D2CFE2', '#D5F3E6',
]

export const SOFT_PIXEL_PALETTE = [...new Set([...TOKENS, ...ART].map((h) => h.toUpperCase()))]

const toHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()

// Opaque pixels must be in the palette. Translucent pixels (0 < a < 255) are
// allowed unless `allowTranslucent` is false. Fully transparent pixels are ignored.
export function lintPalette(canvas, palette = SOFT_PIXEL_PALETTE, { allowTranslucent = true } = {}) {
  const allowed = new Set(palette.map((h) => h.toUpperCase()))
  const counts = new Map()
  for (let i = 0; i < canvas.d.length; i += 4) {
    const a = canvas.d[i + 3]
    if (a === 0) continue
    const hex = toHex(canvas.d[i], canvas.d[i + 1], canvas.d[i + 2])
    const translucent = a < 255
    const bad = translucent ? !allowTranslucent : !allowed.has(hex)
    if (bad) counts.set(hex, (counts.get(hex) ?? 0) + 1)
  }
  const offenders = [...counts].map(([hex, count]) => ({ hex, count }))
  return { ok: offenders.length === 0, offenders }
}
