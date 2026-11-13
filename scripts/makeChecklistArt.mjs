// Placeholder pixel-art cover + launch art for the Checklist app (until ChatGPT art lands, see
// ai-handoff/to-chatgpt/). Draws a clipboard with ticks on a grid of "pixels" and writes two webp files.
import sharp from 'sharp'

const INK = '#2b2550', PAPER = '#fffaf0', BRAND = '#6c5ce7', GREEN = '#3fae6a', PINK = '#ff7eb6', SKY = '#bfe3ff'
// 16x16 pixel clipboard. Legend: . empty, o outline, p paper, c clip, g tick green, l line
// Body: three items, each a 3-row tick (cols 4-7) plus a text line (cols 9-12), inside an outline (cols 2 and 13).
const body = (tick, line) => {
  const r = [...'..opppppppppppo.'.padEnd(16, '.')]
  for (const x of tick) r[x] = 'g'
  if (line) for (let x = 9; x <= 12; x++) r[x] = 'l'
  return r.join('')
}
const ROWS = [
  '................',
  '.....cccccc.....',
  '...ooocccccooo..',
  body([]),
  ...[0, 1, 2].flatMap(() => [body([7]), body([4, 6], true), body([5]), body([])]).slice(0, 11),
  '..oooooooooooo..',
].slice(0, 16)
const COL = { o: INK, p: PAPER, c: BRAND, g: GREEN, l: '#b9b2dc' }

function clipboard(px, ox, oy) {
  let s = ''
  ROWS.forEach((row, y) => [...row].forEach((ch, x) => {
    if (COL[ch]) s += `<rect x="${ox + x * px}" y="${oy + y * px}" width="${px}" height="${px}" fill="${COL[ch]}"/>`
  }))
  return s
}

function sky(w, h, px) {
  let s = `<rect width="${w}" height="${h}" fill="${SKY}"/>`
  // chunky pixel hills
  for (let x = 0; x < w; x += px) {
    const hgt = Math.round(h * 0.18 + Math.sin(x / (px * 9)) * px * 3)
    s += `<rect x="${x}" y="${h - hgt}" width="${px}" height="${hgt}" fill="#8fd19e"/>`
    s += `<rect x="${x}" y="${h - hgt}" width="${px}" height="${px}" fill="${GREEN}"/>`
  }
  for (const [cx, cy] of [[0.18, 0.2], [0.55, 0.12], [0.82, 0.28]]) {
    for (let i = 0; i < 5; i++) s += `<rect x="${cx * w + i * px}" y="${cy * h + (i % 2 ? 0 : px)}" width="${px}" height="${px * (i % 2 ? 2 : 1)}" fill="#fff"/>`
  }
  return s
}

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" shape-rendering="crispEdges">
${sky(256, 256, 8)}${clipboard(12, 32, 32)}</svg>`
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="576" viewBox="0 0 1440 576" shape-rendering="crispEdges">
${sky(1440, 576, 12)}${clipboard(22, 880, 90)}
<rect x="800" y="420" width="12" height="12" fill="${PINK}"/><rect x="1260" y="130" width="12" height="12" fill="${PINK}"/></svg>`

await sharp(Buffer.from(icon)).webp({ quality: 90 }).toFile('public/assets/os/apps/checklist.webp')
await sharp(Buffer.from(splash)).webp({ quality: 85 }).toFile('public/assets/os/splash/checklist.webp')
console.log('ok')
