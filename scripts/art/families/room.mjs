// Study Room shell tiles — 16×16 Soft Pixel tiles in a 16-column grid. The room map
// (scripts/buildRoom.mjs) is built from these; gid = FIRSTGID + index in TILE_NAMES.
export const FIRSTGID = 1

const O2 = '#6F63A6'
const WOOD = '#D6BC96'
const SAND = '#E8D2B2'
const FLOOR = '#F3E2C8'
const WHITE = '#FFFFFF'
const MIST = '#F4F3F9'
const LINE = '#D9D5EA'

const table = []
const tile = (name, draw) => table.push([name, draw])

tile('floor_minimal', (c) => {
  c.rect(0, 0, 16, 16, FLOOR)
  for (const y of [3, 7, 11, 15]) c.hline(0, y, 16, SAND)
  for (const [x, y] of [[4, 0], [11, 4], [6, 8], [13, 12]]) c.vline(x, y, 3, SAND)
})

tile('floor_rug_edge', (c) => {
  c.rect(0, 0, 16, 16, FLOOR)
  for (const y of [3, 7, 11, 15]) c.hline(0, y, 16, SAND)
  c.rect(0, 6, 16, 4, MIST)
  c.hline(0, 6, 16, LINE)
  c.hline(0, 9, 16, LINE)
})

// Walls are white with a faint brick pattern; the outline sits on the room-facing sides.
function wall(c, f) {
  c.rect(0, 0, 16, 16, WHITE)
  for (const y of [3, 7, 11, 15]) c.hline(0, y, 16, MIST)
  for (const [x, y] of [[3, 0], [11, 4], [7, 8], [13, 12]]) c.vline(x, y, 4, MIST)
  if (f.t) c.hline(0, 0, 16, O2)
  if (f.b) { c.hline(0, 13, 16, LINE); c.rect(0, 14, 16, 2, LINE); c.hline(0, 15, 16, O2) }
  if (f.l) c.vline(0, 0, 16, O2)
  if (f.r) c.vline(15, 0, 16, O2)
}
for (const [name, f] of Object.entries({ t: { t: 1 }, tl: { t: 1, l: 1 }, tr: { t: 1, r: 1 }, l: { l: 1 }, r: { r: 1 }, b: { b: 1 } })) {
  tile(`wall_minimal_${name}`, (c) => wall(c, f))
}

tile('window_day', (c) => {
  wall(c, { t: 1 })
  c.rbox(2, 2, 12, 12, 2, '#A4D3EC', O2)
  c.hline(3, 3, 5, '#E1F3FB')
  c.vline(8, 3, 10, O2)
  c.hline(3, 8, 10, O2)
  c.hline(1, 14, 14, WHITE)
})

tile('door', (c) => {
  wall(c, { b: 1 })
  c.rbox(3, 0, 10, 15, 4, WOOD, O2)
  c.rect(5, 3, 6, 11, '#CDB896')
  c.vline(8, 3, 11, O2)
  c.px(10, 9, '#FFE08A')
})

// A soft purple strip drawn over the floor (Decor layer) under the top wall, so furniture reads
// as standing on the floor. Translucent only: it must stay on transparent pixels to keep the
// palette lint honest (blending onto an opaque floor would create an off-palette colour).
tile('shadow_wall', (c) => {
  c.rect(0, 0, 16, 3, [70, 60, 116, 60])
  c.rect(0, 3, 16, 2, [70, 60, 116, 30])
})

export const TILE_NAMES = table.map(([name]) => name)

export default {
  name: 'room_tiles',
  frameW: 16,
  frameH: 16,
  columns: 16,
  sprites: Object.fromEntries(table.map(([name, draw]) => [name, { frames: 1, draw }])),
}
