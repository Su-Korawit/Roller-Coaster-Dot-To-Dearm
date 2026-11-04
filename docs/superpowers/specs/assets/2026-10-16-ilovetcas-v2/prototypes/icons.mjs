// Hotbar item icons, 20×20 soft-pixel. Writes icon-<name>.png at ×4.
import { Canvas } from './px.mjs'

const O = '#5c4e92', O2 = '#6f63a6'
const icons = {
  focus(c) { // round alarm clock with sprout
    c.oval(10, 11, 7, 7, '#FFFFFF', O); c.ellipse(10, 11, 5, 5, '#FFF6EE')
    c.vline(10, 7, 4, O); c.hline(10, 11, 3, '#E8817B'); c.px(10, 11, O)
    c.oval(4, 4, 2, 2, '#F8C3BF', O); c.oval(16, 4, 2, 2, '#F8C3BF', O)
    c.rect(6, 17, 2, 2, O); c.rect(12, 17, 2, 2, O)
  },
  warp(c) {
    c.oval(10, 10, 8, 8, '#E9E1FA', O)
    for (let t = 0; t < 7.2; t += 0.12) { const r = 0.9 * t; c.px(10 + Math.round(Math.cos(t) * r), 10 + Math.round(Math.sin(t) * r), '#8A6AD2'); c.px(11 + Math.round(Math.cos(t) * r), 10 + Math.round(Math.sin(t) * r), '#8A6AD2') }
    c.px(10, 10, '#FFFFFF'); c.px(4, 6, '#FFFFFF'); c.px(16, 14, '#FFE08A'); c.px(15, 4, '#FFE08A')
  },
  plan(c) { // notebook with bookmark
    c.rbox(3, 2, 14, 17, 2, '#BFD3F8', O); c.rect(4, 3, 2, 15, '#8FB0EE')
    c.rbox(7, 5, 8, 6, 1, '#FFFFFF', O2); c.hline(8, 7, 6, '#BFD3F8')
    c.rect(13, 1, 3, 6, '#E8817B'); c.px(14, 7, '#E8817B'); c.px(13, 7, '#FFF6EE'); c.px(15, 7, '#FFF6EE')
  },
  tasks(c) { // checklist clipboard
    c.rbox(3, 3, 14, 16, 2, '#FFFFFF', O); c.rbox(7, 1, 6, 4, 1, '#E8A93B', O)
    for (const [y, done] of [[8, 1], [12, 1], [16, 0]]) {
      c.rbox(5, y - 1, 4, 4, 1, done ? '#A8E6CF' : '#FFFFFF', O2); if (done) c.px(7, y, '#3F7A4A')
      c.hline(10, y, 5, '#D2CFE2')
    }
  },
  friends(c) { // envelope with heart (social + chat)
    c.rbox(2, 5, 16, 12, 2, '#FFFFFF', O)
    for (let i = 0; i < 7; i++) { c.px(3 + i, 6 + i, O2); c.px(16 - i, 6 + i, O2) }
    c.ellipse(9, 13, 1, 1, '#E8817B'); c.ellipse(11, 13, 1, 1, '#E8817B'); c.rect(9, 14, 3, 1, '#E8817B'); c.px(10, 15, '#E8817B')
  },
  shop(c) {
    for (let t = Math.PI; t <= 2 * Math.PI + 0.01; t += 0.1) { c.px(10 + Math.round(Math.cos(t) * 4), 7 + Math.round(Math.sin(t) * 4), O) }
    c.rbox(2, 7, 16, 12, 3, '#A8E6CF', O); c.hline(4, 8, 12, '#D5F3E6')
    c.ellipse(10, 13, 3, 2, '#5FB57A'); c.px(9, 12, '#B6DCA0'); c.hline(7, 15, 3, '#3F7A4A'); c.px(6, 16, '#3F7A4A'); c.hline(9, 13, 3, '#3F7A4A')
  },
  wardrobe(c) {
    const tee = ['...XXX..XXX...', '.XXpppXXpppXX.', 'XppppppppppppX', 'XppppppppppppX', 'XXXppppppppXXX', '..XppppppppX..', '..XwwwwwwwwX..', '..XppppppppX..', '..XwwwwwwwwX..', '..XppppppppX..', '..XXXXXXXXXX..']
    c.bitmap(3, 4, tee, { X: O, p: '#F8C3BF', w: '#FFFFFF' })
  },
  guide(c) { // round speech bubble with ?
    c.oval(10, 9, 8, 7, '#FFF59A', O); c.rect(5, 15, 3, 3, O); c.rect(6, 15, 1, 2, '#FFF59A')
    c.bitmap(8, 5, ['.XX.', 'X..X', '...X', '..X.', '..X.', '....', '..X.'], { X: O })
  },
}
for (const [name, fn] of Object.entries(icons)) {
  const c = new Canvas(20, 20); fn(c); await c.save(`icon-${name}.png`, 4)
}
const sheet = new Canvas(Object.keys(icons).length * 24, 22)
let i = 0
for (const fn of Object.values(icons)) { const c = new Canvas(20, 20); fn(c); sheet.blit(c, 2 + i++ * 24, 1) }
await sheet.save('icons-sheet.png', 6)
console.log('ok')
