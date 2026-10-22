// Study Room pets — 16×16 frames, one row per pet. Frame order (src/game/petBehaviour.js PET_FRAMES):
//   0 idle · 1 walk A · 2 walk B · 3 groom A · 4 groom B · 5 sleep · 6 sit
// Facing right; the scene flips for left. `heart` (one frame) is the tap reaction.
const O = '#5C4E92'

const PETS = {
  pet_cat_orange: { body: '#F0A35E', shade: '#D07A3A', belly: '#FFF6EA', ears: 'cat', eye: '#2B2550' },
  pet_cat_black: { body: '#4A4566', shade: '#2B2550', belly: '#686288', ears: 'cat', eye: '#FFF59A' },
  pet_shiba: { body: '#F0A35E', shade: '#D07A3A', belly: '#FFF6EA', ears: 'dog', eye: '#2B2550' },
  pet_bunny: { body: '#FFFFFF', shade: '#D9D5EA', belly: '#FFF6EA', ears: 'bunny', eye: '#2B2550' },
}

function ears(c, p, hx, hy) {
  if (p.ears === 'bunny') {
    c.rbox(hx - 1, hy - 7, 3, 7, 1, p.body, O); c.rect(hx, hy - 6, 1, 4, '#F8C3BF')
    c.rbox(hx + 2, hy - 7, 3, 7, 1, p.body, O); c.rect(hx + 3, hy - 6, 1, 4, '#F8C3BF')
  } else {
    c.rect(hx - 1, hy - 3, 3, 3, p.body); c.px(hx, hy - 4, O); c.hline(hx - 1, hy - 3, 3, O)
    c.rect(hx + 3, hy - 3, 3, 3, p.body); c.px(hx + 4, hy - 4, O); c.hline(hx + 3, hy - 3, 3, O)
  }
}

function head(c, p, hx, hy, { eyes = true } = {}) {
  c.rbox(hx - 1, hy - 1, 7, 6, 2, p.body, O)
  ears(c, p, hx, hy)
  if (eyes) { c.px(hx + 3, hy + 1, p.eye); c.px(hx + 5, hy + 1, p.eye) } else { c.hline(hx + 2, hy + 1, 2, O) }
  c.px(hx + 4, hy + 3, '#F8C3BF')
}

function draw(p, f, c) {
  if (f === 5) { // sleep: flat loaf, head on paws
    c.rbox(2, 9, 11, 5, 2, p.body, O)
    c.hline(4, 12, 7, p.belly)
    head(c, p, 9, 8, { eyes: false })
    c.px(13, 5, '#BFD3F8'); c.px(14, 3, '#BFD3F8')
    return
  }
  if (f === 6) { // sit upright
    c.rbox(4, 5, 8, 9, 3, p.body, O)
    c.rect(6, 8, 4, 5, p.belly)
    head(c, p, 4, 1)
    c.rect(3, 12, 3, 2, p.shade)
    return
  }
  const bob = f === 2 ? 1 : 0
  c.rbox(2, 6 + bob, 9, 6, 2, p.body, O)
  c.hline(4, 10 + bob, 5, p.belly)
  c.hline(3, 7 + bob, 6, p.shade)
  // tail
  c.vline(1, 4 + bob, 4, O); c.vline(0, 4 + bob, 3, p.shade)
  // legs
  const legs = f === 1 ? [3, 9] : f === 2 ? [4, 8] : [3, 8]
  for (const x of legs) c.rect(x, 12 + bob, 2, 2, p.shade)
  if (f === 3 || f === 4) { // groom: head down, paw up
    head(c, p, 10, 7)
    c.rect(f === 3 ? 12 : 13, 11, 2, 2, p.shade)
  } else {
    head(c, p, 10, 3 + bob)
  }
}

const sprites = Object.fromEntries(Object.entries(PETS).map(([id, p]) => [id, { frames: 7, draw: (c, f) => draw(p, f, c) }]))

sprites.heart = {
  frames: 1,
  draw: (c) => {
    c.oval(4, 5, 3, 3, '#E58BC0', '#955A7D')
    c.oval(10, 5, 3, 3, '#E58BC0', '#955A7D')
    c.rect(2, 6, 11, 3, '#E58BC0')
    c.rect(4, 9, 7, 2, '#E58BC0'); c.rect(6, 11, 3, 1, '#E58BC0'); c.px(7, 12, '#955A7D')
    c.px(4, 4, '#FFFFFF')
  },
}

export const PET_IDS = Object.keys(PETS)
export default { name: 'pets', frameW: 16, frameH: 16, sprites }
