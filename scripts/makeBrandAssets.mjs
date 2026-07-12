/**
 * One-off: download the IR Idea illustration and emit favicon / logo / OG
 * assets into public/brand/. Usage:
 *   node scripts/makeBrandAssets.mjs [optional-local-path]
 */
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'public', 'brand')

const SOURCE_URL =
  'https://firebasestorage.googleapis.com/v0/b/rollercoasterdottodream.firebasestorage.app/o/users%2FIaltEhO0mPVfK3ng8npr4CdqnEE3%2Froadmap%2Fnode-4-1783855739462-1783856347273?alt=media&token=a62292a9-3da5-421a-9a02-8de2dfa22436'

const BRAND_PURPLE = '#863bff'
const MAX_KB = 200

async function loadSource(overridePath) {
  if (overridePath) {
    const { readFile } = await import('node:fs/promises')
    return readFile(overridePath)
  }
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`Failed to fetch source: ${res.status} ${res.statusText}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Center-crop to the top ~60% square (face region), then resize to `size`. */
async function faceCropSquare(buf, size) {
  const meta = await sharp(buf).metadata()
  const w = meta.width
  const h = meta.height
  const regionH = Math.round(h * 0.6)
  const side = Math.min(w, regionH)
  const left = Math.round((w - side) / 2)
  const top = 0
  return sharp(buf)
    .extract({ left, top, width: side, height: side })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer()
}

async function roundedLogo(buf, size, radius = 16) {
  const square = await faceCropSquare(buf, size)
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/>
    </svg>`,
  )
  return sharp(square)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function ogCard(buf) {
  const W = 1200
  const H = 630
  const leftW = Math.round(W * 0.4)

  const bg = await sharp({
    create: { width: W, height: H, channels: 3, background: BRAND_PURPLE },
  })
    .png()
    .toBuffer()

  const illustration = await sharp(buf)
    .resize(leftW, H, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer()

  const wordmark = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W - leftW}" height="${H}">
      <rect width="100%" height="100%" fill="${BRAND_PURPLE}"/>
      <text x="50%" y="46%" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"
        font-size="64" font-weight="900" fill="#ffffff">I LOVE TCAS</text>
      <text x="50%" y="58%" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="28" fill="#f0eeff">วางแผนเส้นทางสู่มหาลัย</text>
    </svg>`,
  )

  return sharp(bg)
    .composite([
      { input: illustration, left: 0, top: 0 },
      { input: await sharp(wordmark).png().toBuffer(), left: leftW, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function writeChecked(name, data) {
  const path = join(OUT, name)
  await writeFile(path, data)
  const kb = data.length / 1024
  if (kb > MAX_KB) {
    console.warn(`WARN ${name}: ${kb.toFixed(1)} KB > ${MAX_KB} KB — recompressing`)
    const smaller = await sharp(data).png({ compressionLevel: 9, quality: 70, palette: true }).toBuffer()
    await writeFile(path, smaller)
    console.log(`  → ${name}: ${(smaller.length / 1024).toFixed(1)} KB`)
    return
  }
  console.log(`OK ${name}: ${kb.toFixed(1)} KB`)
}

async function main() {
  const override = process.argv[2]
  await mkdir(OUT, { recursive: true })
  console.log(override ? `Loading local: ${override}` : 'Fetching source illustration…')
  const src = await loadSource(override)

  const [f32, f192, f512, apple, logo, og] = await Promise.all([
    faceCropSquare(src, 32),
    faceCropSquare(src, 192),
    faceCropSquare(src, 512),
    faceCropSquare(src, 180),
    roundedLogo(src, 96),
    ogCard(src),
  ])

  await writeChecked('favicon-32.png', f32)
  await writeChecked('favicon-192.png', f192)
  await writeChecked('favicon-512.png', f512)
  await writeChecked('apple-touch-icon.png', apple)
  await writeChecked('logo-96.png', logo)
  await writeChecked('og-card.png', og)

  for (const name of [
    'favicon-32.png',
    'favicon-192.png',
    'favicon-512.png',
    'apple-touch-icon.png',
    'logo-96.png',
    'og-card.png',
  ]) {
    await access(join(OUT, name))
  }
  console.log('All brand assets written to public/brand/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
