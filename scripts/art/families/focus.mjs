// Focus art: the tree a session grows (4 species × 4 growth frames, plus a withered tree) and
// the desk pot that mirrors the session's progress. 48×48 frames, tree base at the bottom.
const O = '#5C4E92'
const O2 = '#6F63A6'
const WOOD = '#D6BC96'
const WOOD2 = '#CDB896'
const G2 = '#B6DCA0'
const G3 = '#7BC48C'
const G4 = '#4E8F5A'

const SPECIES = {
  tree_sprout: { r: 6, trunk: 5, canopy: G3, shade: G4, light: G2 },
  tree_shrub: { r: 9, trunk: 7, canopy: G3, shade: G4, light: G2 },
  tree_tree: { r: 13, trunk: 11, canopy: G3, shade: G4, light: G2 },
  tree_blossom: { r: 15, trunk: 11, canopy: '#F8C3BF', shade: '#E58BC0', light: '#FBEEF6' },
}
const GROWTH = [0, 0.4, 0.7, 1]
const BASE = 44

function mound(c) {
  c.ellipse(24, BASE, 7, 3, WOOD2)
  c.ellipse(24, BASE - 1, 5, 2, WOOD)
}

function drawTree(c, spec, stage) {
  mound(c)
  if (stage === 0) {
    c.vline(24, BASE - 5, 4, G4)
    c.px(23, BASE - 6, G3); c.px(25, BASE - 6, G3)
    return
  }
  const g = GROWTH[stage]
  const r = Math.max(3, Math.round(spec.r * g))
  const trunk = Math.max(3, Math.round(spec.trunk * g))
  c.rbox(22, BASE - trunk, 4, trunk, 1, WOOD, O2)
  const cy = BASE - trunk - Math.round(r * 0.7)
  c.oval(24, cy, r, Math.max(3, Math.round(r * 0.9)), spec.canopy, O2)
  c.ellipse(24 + Math.round(r / 3), cy + Math.round(r / 3), Math.max(1, Math.round(r / 2)), Math.max(1, Math.round(r / 3)), spec.shade)
  c.ellipse(24 - Math.round(r / 3), cy - Math.round(r / 3), Math.max(1, Math.round(r / 3)), Math.max(1, Math.round(r / 4)), spec.light)
}

function drawWithered(c) {
  mound(c)
  c.rbox(22, BASE - 24, 4, 24, 1, WOOD2, O2)
  c.hline(14, BASE - 18, 10, O2); c.hline(14, BASE - 17, 10, WOOD2)
  c.hline(25, BASE - 22, 9, O2); c.hline(25, BASE - 21, 9, WOOD2)
  c.px(13, BASE - 16, WOOD); c.px(34, BASE - 19, WOOD); c.px(20, BASE - 2, WOOD); c.px(29, BASE - 1, WOOD)
}

// Desk pot: soil, sprout, leaves, flowers.
function drawPot(c, stage) {
  c.rbox(18, 34, 12, 10, 2, '#F8C3BF', O2)
  c.rect(19, 35, 10, 2, WOOD2)
  if (stage >= 1) { c.vline(24, 28, 7, G4); c.px(23, 29, G3); c.px(25, 29, G3) }
  if (stage >= 2) { c.oval(20, 28, 3, 2, G3, O2); c.oval(28, 27, 3, 2, G3, O2) }
  if (stage >= 3) {
    c.oval(24, 22, 3, 3, '#F8C3BF', O2); c.px(24, 22, '#FFE08A')
    c.oval(17, 24, 2, 2, '#FBEEF6', O2); c.oval(31, 23, 2, 2, '#FBEEF6', O2)
  }
}

const sprites = {}
for (const [key, spec] of Object.entries(SPECIES)) {
  sprites[key] = { frames: 4, draw: (c, f) => drawTree(c, spec, f) }
}
sprites.tree_withered = { frames: 1, draw: (c) => drawWithered(c) }
sprites.pot_growth = { frames: 4, draw: (c, f) => drawPot(c, f) }

export default { name: 'focus', frameW: 48, frameH: 48, sprites }
