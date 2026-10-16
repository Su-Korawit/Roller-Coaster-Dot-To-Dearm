// node renderAnim.mjs <module> <outBase> [frames] [scale] — writes <outBase>.png (frame 0) and <outBase>.webp (animated)
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const sharp = createRequire('D:/Ikkyusan/Desktop/03_Projects/Games/Roller Coaster Dot To Dearm/package.json')('sharp')

const [mod, outBase, n = '8', s = '4'] = process.argv.slice(2)
const { draw, W, H } = await import(pathToFileURL(resolve(mod)).href)
const N = +n, S = +s
const buf = Buffer.alloc(W * S * H * S * N * 4)
for (let f = 0; f < N; f++) {
  const c = draw(f)
  for (let y = 0; y < H * S; y++) for (let x = 0; x < W * S; x++) {
    const si = (((y / S) | 0) * W + ((x / S) | 0)) * 4, di = ((f * H * S + y) * W * S + x) * 4
    buf[di] = c.d[si]; buf[di + 1] = c.d[si + 1]; buf[di + 2] = c.d[si + 2]; buf[di + 3] = 255
  }
  if (f === 0) await draw(0).save(outBase + '.png', S)
}
await sharp(buf, { raw: { width: W * S, height: H * S * N, channels: 4, pageHeight: H * S } })
  .webp({ lossless: true, delay: Array(N).fill(160), loop: 0 }).toFile(outBase + '.webp')
console.log('ok', outBase)
