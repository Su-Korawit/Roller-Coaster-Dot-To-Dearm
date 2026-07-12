/**
 * Capture product screenshots for landing heroes.
 * Prerequisites: `npm run dev` on http://localhost:5173
 *
 *   node scripts/captureScreenshots.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'assets', 'screenshots')
const BASE = process.env.SHOT_BASE || 'http://localhost:5173'
const MAX_KB = 250

const SHOTS = [
  { key: 'roadmap', url: '/editor?site=roadmap', waitFor: '.react-flow, main' },
  { key: 'school', url: '/app?site=school', waitFor: 'main' },
  { key: 'tcas', url: '/?site=tcas', waitFor: 'main' },
  { key: 'news', url: '/?site=news', waitFor: 'main' },
]

async function compressPng(buf) {
  let out = await sharp(buf)
    .resize(1280, 800, { fit: 'cover', position: 'top' })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer()
  if (out.length / 1024 > MAX_KB) {
    out = await sharp(buf)
      .resize(960, 600, { fit: 'cover', position: 'top' })
      .png({ compressionLevel: 9, quality: 55, palette: true })
      .toBuffer()
  }
  return out
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  for (const shot of SHOTS) {
    const full = `${BASE}${shot.url}`
    console.log(`Navigating ${full}`)
    await page.goto(full, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    try {
      await page.waitForSelector(shot.waitFor, { timeout: 20_000 })
    } catch {
      console.warn(`  selector miss for ${shot.key}, capturing anyway`)
    }
    await page.waitForTimeout(2500)
    const raw = await page.screenshot({ type: 'png', fullPage: false })
    const compressed = await compressPng(raw)
    await writeFile(join(OUT, `${shot.key}.png`), compressed)
    console.log(`OK ${shot.key}.png ${(compressed.length / 1024).toFixed(1)} KB`)
  }

  await browser.close()
  console.log('Screenshots written to public/assets/screenshots/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
