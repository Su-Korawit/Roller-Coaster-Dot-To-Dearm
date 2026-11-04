// Character accessories — overlay frames the size of the MBTI character frames (48×48), 16 frames per
// accessory in the same order as the character sheet (rows of 4: down, up, left, right). The
// creature stands in the 16×16 box at (16,16); coordinates below are inside that box. The scene
// shows the overlay with the same frame index as the character (src/game/avatarRender.js).
import { ROOM_CATALOG } from '../../../src/data/roomCatalogSeed.js'

const O = '#5C4E92'
const DIRS = ['down', 'up', 'left', 'right']
// A hollow rectangle (rbox with a null fill would be solid).
const ring = (c, x, y, w, h, col) => { c.hline(x, y, w, col); c.hline(x, y + h - 1, w, col); c.vline(x, y, h, col); c.vline(x + w - 1, y, h, col) }
const ORIGIN = 16

// [down, up, left, right] drawers per accessory; `d(c, x, y, w, h, col)` draws inside the box.
const ART = {
  acc_cap: (c, dir) => {
    c.rbox(3, -1, 10, 5, 2, '#5B8DEF', O)
    if (dir === 'down') c.rect(4, 3, 8, 1, '#4063A7')
    if (dir === 'left') c.rect(-1, 2, 5, 2, '#4063A7')
    if (dir === 'right') c.rect(12, 2, 5, 2, '#4063A7')
  },
  acc_ribbon: (c, dir) => {
    const x = dir === 'left' ? 4 : dir === 'right' ? 9 : dir === 'up' ? 3 : 11
    c.oval(x, 0, 2, 2, '#E58BC0', '#955A7D'); c.oval(x + 4, 0, 2, 2, '#E58BC0', '#955A7D'); c.rect(x + 1, 0, 3, 2, '#955A7D')
  },
  acc_glasses: (c, dir) => {
    if (dir === 'up') return
    if (dir === 'down') {
      ring(c, 1, 3, 6, 5, '#2B2550'); ring(c, 9, 3, 6, 5, '#2B2550'); c.hline(7, 5, 2, '#2B2550')
    } else {
      const x = dir === 'left' ? 1 : 9
      ring(c, x, 3, 6, 5, '#2B2550')
      c.hline(dir === 'left' ? 7 : 5, 5, 4, '#2B2550')
    }
    c.px(dir === 'down' ? 2 : dir === 'left' ? 2 : 10, 4, '#FFFFFF')
  },
  acc_mask: (c, dir) => {
    if (dir === 'up') return
    const [x, w] = dir === 'down' ? [1, 14] : dir === 'left' ? [1, 8] : [7, 8]
    c.rect(x, 3, w, 4, '#E58BC0'); c.hline(x, 3, w, '#955A7D'); c.hline(x, 6, w, '#955A7D')
    c.px(x + 2, 4, '#2B2550'); if (dir === 'down') c.px(12, 4, '#2B2550')
  },
  acc_scarf: (c, dir) => {
    const [x, w] = dir === 'left' ? [2, 7] : dir === 'right' ? [7, 7] : [3, 10]
    c.rect(x, 8, w, 2, '#C2413D'); c.hline(x, 8, w, '#8A5A00')
    if (dir === 'left') c.rect(2, 10, 2, 3, '#C2413D')
    else if (dir === 'right') c.rect(12, 10, 2, 3, '#C2413D')
    else c.rect(9, 10, 2, 3, '#C2413D')
  },
  acc_bowtie: (c, dir) => {
    if (dir === 'up') return
    const x = dir === 'left' ? 3 : dir === 'right' ? 10 : 6
    c.rect(x, 8, 2, 2, '#E8A93B'); c.rect(x + 3, 8, 2, 2, '#E8A93B'); c.rect(x + 2, 8, 1, 2, '#8A5A00')
  },
  acc_backpack: (c, dir) => {
    if (dir === 'up') c.rbox(3, 7, 10, 7, 2, '#5FB57A', O)
    else if (dir === 'down') { c.rect(1, 8, 2, 5, '#2F7A47'); c.rect(13, 8, 2, 5, '#2F7A47') }
    else c.rbox(dir === 'left' ? 9 : 2, 7, 5, 6, 2, '#5FB57A', O)
  },
  acc_wings: (c, dir) => {
    if (dir === 'up') { c.oval(3, 9, 3, 4, '#FFFFFF', O); c.oval(13, 9, 3, 4, '#FFFFFF', O) }
    else if (dir === 'down') { c.oval(0, 8, 2, 4, '#FFFFFF', O); c.oval(15, 8, 2, 4, '#FFFFFF', O) }
    else c.oval(dir === 'left' ? 11 : 4, 8, 3, 4, '#FFFFFF', O)
  },
}

const slotted = Object.entries(ROOM_CATALOG).filter(([, i]) => i.kind === 'accessory').map(([id]) => id)
const sprites = {}
for (const id of slotted) {
  if (!ART[id]) throw new Error(`wardrobe: no drawing for accessory "${id}"`)
  sprites[id] = {
    frames: 16,
    draw: (c, f) => {
      const dir = DIRS[Math.floor(f / 4)]
      const shifted = new Proxy(c, {
        get: (target, prop) => (prop === 'rect' ? (x, y, w, h, col) => target.rect(x + ORIGIN, y + ORIGIN, w, h, col)
          : prop === 'hline' ? (x, y, w, col) => target.hline(x + ORIGIN, y + ORIGIN, w, col)
          : prop === 'vline' ? (x, y, h, col) => target.vline(x + ORIGIN, y + ORIGIN, h, col)
          : prop === 'px' ? (x, y, col) => target.px(x + ORIGIN, y + ORIGIN, col)
          : prop === 'rbox' ? (x, y, w, h, r, fill, line) => target.rbox(x + ORIGIN, y + ORIGIN, w, h, r, fill, line)
          : prop === 'oval' ? (cx, cy, rx, ry, fill, line) => target.oval(cx + ORIGIN, cy + ORIGIN, rx, ry, fill, line)
          : target[prop]),
      })
      ART[id](shifted, dir)
    },
  }
}

export const ACCESSORY_IDS = slotted
export default { name: 'wardrobe', frameW: 48, frameH: 48, sprites }
