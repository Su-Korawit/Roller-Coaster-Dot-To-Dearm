// Study Room furniture — one 32×32 sprite per catalog item (frames from the catalog seed).
// Every item is drawn anchored to the bottom-left of its frame, so the scene places the frame
// with its bottom-left corner on the footprint's bottom-left corner and the part above the
// footprint is the item's height. Themes, tiers, pets and accessories have no sprite here.
import { ROOM_CATALOG } from '../../../src/data/roomCatalogSeed.js'

const O = '#5C4E92'
const O2 = '#6F63A6'
const WOOD = '#D6BC96'
const WOOD2 = '#CDB896'
const SAND = '#E8D2B2'
const TOP = '#F3E2C8'
const G3 = '#7BC48C'
const G5 = '#3F7A4A'

const DRAW = {
  desk_basic: (c) => {
    c.rbox(0, 10, 32, 8, 2, TOP, O2)
    c.rbox(1, 17, 30, 10, 1, SAND, O2)
    c.rect(4, 19, 10, 6, WOOD); c.hline(5, 22, 8, O2); c.px(9, 21, '#FFE08A')
    c.rect(3, 27, 3, 5, WOOD2); c.rect(26, 27, 3, 5, WOOD2)
  },
  chair_basic: (c) => {
    c.rbox(3, 8, 10, 10, 2, '#8FB0EE', O2)
    c.rbox(2, 17, 12, 6, 2, '#BFD3F8', O2)
    c.rect(4, 23, 2, 8, O2); c.rect(10, 23, 2, 8, O2)
  },
  bed_basic: (c) => {
    c.rbox(0, 10, 32, 20, 3, '#FFFFFF', O2)
    c.rbox(2, 12, 9, 7, 2, '#E9E1FA', O2)
    c.rbox(12, 14, 19, 15, 2, '#BFD3F8', O2)
    c.hline(14, 20, 15, '#8FB0EE'); c.hline(14, 24, 15, '#8FB0EE')
  },
  bookshelf_basic: (c) => {
    c.rbox(1, 1, 14, 30, 2, WOOD, O2)
    c.hline(2, 10, 12, O2); c.hline(2, 20, 12, O2)
    ;[['#E8817B', 3], ['#5B8DEF', 6], ['#E8A93B', 9], ['#9B7BD6', 12]].forEach(([col, x]) => {
      c.rect(x, 3, 2, 7, col); c.rect(x, 12, 2, 8, col); c.rect(x, 22, 2, 8, col)
    })
  },
  rug_round: (c) => {
    c.oval(16, 16, 13, 13, '#F8C3BF', O2)
    c.oval(16, 16, 8, 8, '#FBEEF6', '#E58BC0')
    c.ellipse(16, 16, 3, 3, '#F8C3BF')
  },
  poster_pastel: (c) => {
    c.rbox(2, 18, 12, 12, 1, '#FFFFFF', O2)
    c.ellipse(8, 25, 3, 3, '#A8E6CF')
    c.hline(4, 20, 8, '#BFD3F8')
  },
  lamp_desk: (c, f) => {
    if (f === 1) { c.ellipse(8, 20, 9, 8, [255, 230, 160, 110]); c.ellipse(8, 20, 5, 5, [255, 230, 160, 140]) }
    c.rbox(5, 27, 6, 3, 1, '#8FB0EE', O2)
    c.vline(8, 17, 10, O2)
    c.rbox(3, 10, 10, 8, 2, f === 1 ? '#FFF59A' : '#FFE08A', O2)
  },
  mug: (c) => {
    c.rbox(4, 21, 8, 9, 2, '#FFFFFF', O2)
    c.rect(12, 23, 3, 4, O2); c.rect(12, 24, 2, 2, '#FFFFFF')
    c.hline(5, 23, 6, WOOD2)
    c.px(6, 18, '#D2CFE2'); c.px(8, 16, '#D2CFE2'); c.px(7, 19, '#D2CFE2')
  },
  books_stack: (c) => {
    c.rbox(2, 25, 12, 5, 1, '#E8817B', O2)
    c.rbox(3, 20, 11, 5, 1, '#5B8DEF', O2)
    c.rbox(2, 15, 10, 5, 1, '#E8A93B', O2)
  },
  plant_small: (c) => {
    c.rbox(4, 22, 8, 8, 2, '#F8C3BF', O2)
    c.oval(6, 16, 3, 4, G3, G5); c.oval(10, 16, 3, 4, G3, G5); c.oval(8, 11, 2, 4, '#B6DCA0', G5)
  },
  pet_bed: (c) => {
    c.oval(8, 24, 7, 4, '#F8C3BF', O2)
    c.oval(8, 23, 5, 3, '#FBEEF6', '#E58BC0')
    c.hline(5, 25, 6, '#FFFFFF')
  },
  trophy_shelf: (c) => {
    c.rbox(2, 4, 12, 26, 2, WOOD, O2)
    c.hline(3, 12, 10, O2); c.hline(3, 20, 10, O2)
    c.rect(4, 6, 8, 5, '#E8D2B2'); c.rect(4, 14, 8, 5, '#E8D2B2'); c.rect(4, 22, 8, 5, '#E8D2B2')
  },
  laptop: (c) => {
    c.rbox(2, 8, 12, 12, 1, '#463C74', O2)
    c.rect(4, 10, 8, 8, '#A4D3EC'); c.hline(5, 12, 5, '#E1F3FB'); c.hline(5, 15, 4, '#E1F3FB')
    c.rbox(0, 21, 16, 5, 1, '#D2CFE2', O2)
  },
}

const sprites = {}
for (const [id, item] of Object.entries(ROOM_CATALOG)) {
  if (!['furniture', 'decor', 'desk', 'wall'].includes(item.kind)) continue
  if (!DRAW[id]) throw new Error(`roomitems: no drawing for catalog item "${id}"`)
  sprites[id] = { frames: item.frames, draw: DRAW[id] }
}

export default { name: 'room_items', frameW: 32, frameH: 32, sprites }
