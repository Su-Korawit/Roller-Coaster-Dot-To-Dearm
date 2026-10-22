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

// ── Part 2: theme variants (floor, six wall pieces, window) and the lake balcony ──────────────
// Appended after the minimal tiles so existing gids never move. The scene swaps a minimal tile
// for its theme twin at runtime (src/game/roomShell.js): floor_minimal → floor_<theme>,
// wall_minimal_<x> → wall_<theme>_<x>, window_day → window_<theme>.
const THEMES = {
  library_wood: {
    floor: (c) => {
      c.rect(0, 0, 16, 16, '#D6BC96')
      for (const y of [4, 9, 14]) c.hline(0, y, 16, '#CDB896')
      for (const [x, y] of [[3, 0], [10, 5], [6, 10]]) c.vline(x, y, 4, '#CDB896')
    },
    wall: (c) => {
      c.rect(0, 0, 16, 16, '#E8D2B2')
      for (const x of [0, 5, 10]) c.vline(x, 0, 16, '#D6BC96')
      c.hline(0, 8, 16, '#D6BC96')
    },
    window: (c, w) => {
      w(c)
      c.rbox(2, 2, 12, 12, 2, '#A4D3EC', O2); c.hline(3, 3, 5, '#E1F3FB'); c.vline(8, 3, 10, O2); c.hline(3, 8, 10, O2)
      c.rect(1, 1, 14, 1, '#CDB896')
    },
  },
  cafe: {
    floor: (c) => {
      c.rect(0, 0, 16, 16, '#F3E2C8')
      for (const [x, y] of [[0, 0], [8, 0], [4, 4], [12, 4], [0, 8], [8, 8], [4, 12], [12, 12]]) c.rect(x, y, 4, 4, '#E9DCC6')
    },
    wall: (c) => {
      c.rect(0, 0, 16, 16, '#FBE6C2')
      for (const x of [2, 6, 10, 14]) c.vline(x, 0, 16, '#F2A9A0')
    },
    window: (c, w) => {
      w(c)
      c.rbox(2, 2, 12, 12, 2, '#A4D3EC', O2); c.hline(3, 3, 5, '#E1F3FB'); c.vline(8, 3, 10, O2)
      c.rect(2, 11, 12, 3, '#F8C3BF'); c.hline(2, 11, 12, O2)
    },
  },
  night_sky: {
    floor: (c) => {
      c.rect(0, 0, 16, 16, '#6D5696')
      for (const y of [3, 7, 11, 15]) c.hline(0, y, 16, '#5C4E92')
      for (const [x, y] of [[4, 0], [11, 4], [6, 8], [13, 12]]) c.px(x, y, '#FFF59A')
    },
    wall: (c) => {
      c.rect(0, 0, 16, 16, '#463C74')
      for (const [x, y] of [[3, 3], [11, 6], [7, 11], [13, 1], [1, 13]]) c.px(x, y, '#FFF59A')
    },
    window: (c, w) => {
      w(c)
      c.rbox(2, 2, 12, 12, 2, '#2B2550', O2); c.vline(8, 3, 10, O2); c.hline(3, 8, 10, O2)
      for (const [x, y] of [[4, 4], [11, 5], [5, 11], [12, 12]]) c.px(x, y, '#FFF59A')
    },
  },
}

for (const [theme, t] of Object.entries(THEMES)) {
  const wallPiece = (f) => (c) => {
    t.wall(c)
    if (f.t) c.hline(0, 0, 16, O2)
    if (f.b) { c.hline(0, 13, 16, '#463C74'); c.rect(0, 14, 16, 2, '#463C74'); c.hline(0, 15, 16, O2) }
    if (f.l) c.vline(0, 0, 16, O2)
    if (f.r) c.vline(15, 0, 16, O2)
  }
  tile(`floor_${theme}`, t.floor)
  for (const [name, f] of Object.entries({ t: { t: 1 }, tl: { t: 1, l: 1 }, tr: { t: 1, r: 1 }, l: { l: 1 }, r: { r: 1 }, b: { b: 1 } })) {
    tile(`wall_${theme}_${name}`, wallPiece(f))
  }
  tile(`window_${theme}`, (c) => t.window(c, wallPiece({ t: 1 })))
}

// Lake balcony (tier 2): a wooden deck with a railing on its three outer sides.
const DECK = '#CDB896'
const DECK2 = '#D6BC96'
tile('balcony_floor', (c) => {
  c.rect(0, 0, 16, 16, DECK2)
  for (const y of [3, 7, 11, 15]) c.hline(0, y, 16, DECK)
  for (const [x, y] of [[5, 0], [12, 4], [8, 8], [3, 12]]) c.vline(x, y, 3, DECK)
})
function rail(c, f) {
  c.rect(0, 0, 16, 16, DECK2)
  for (const y of [3, 7, 11, 15]) c.hline(0, y, 16, DECK)
  if (f.t) { c.rect(0, 0, 16, 5, '#FFFFFF'); c.hline(0, 0, 16, O2); c.hline(0, 4, 16, O2); for (const x of [2, 7, 12]) c.vline(x, 5, 3, O2) }
  if (f.b) { c.rect(0, 11, 16, 5, '#FFFFFF'); c.hline(0, 15, 16, O2); c.hline(0, 11, 16, O2); for (const x of [2, 7, 12]) c.vline(x, 8, 3, O2) }
  if (f.r) { c.rect(11, 0, 5, 16, '#FFFFFF'); c.vline(15, 0, 16, O2); c.vline(11, 0, 16, O2); for (const y of [2, 7, 12]) c.hline(8, y, 3, O2) }
}
for (const [name, f] of Object.entries({ t: { t: 1 }, b: { b: 1 }, r: { r: 1 }, tr: { t: 1, r: 1 }, br: { b: 1, r: 1 } })) {
  tile(`rail_${name}`, (c) => rail(c, f))
}

export const TILE_NAMES = table.map(([name]) => name)

export default {
  name: 'room_tiles',
  frameW: 16,
  frameH: 16,
  columns: 16,
  sprites: Object.fromEntries(table.map(([name, draw]) => [name, { frames: 1, draw }])),
}
