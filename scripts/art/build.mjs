// Art build: draws every family in scripts/art/families/ into a spritesheet + JSON atlas.
//   node scripts/art/build.mjs            build all families
//   node scripts/art/build.mjs icons      build named families
// Family shape: { name, frameW, frameH, sprites: { [key]: { frames, draw(canvas, frameIndex) } } }
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Canvas } from './px.mjs'
import { lintPalette } from './palette.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(HERE, '../..')

export function buildFamily(family) {
  const keys = Object.keys(family.sprites)
  // Default: one sprite per row, frames side by side. With `columns`, single-frame sprites
  // (tiles) are packed in a grid instead; atlas entries then carry `col` as well as `row`.
  if (family.columns) {
    const rows = Math.ceil(keys.length / family.columns)
    const sheet = new Canvas(family.frameW * family.columns, family.frameH * rows)
    const atlas = { name: family.name, frameW: family.frameW, frameH: family.frameH, columns: family.columns, sprites: {} }
    keys.forEach((key, i) => {
      const col = i % family.columns
      const row = Math.floor(i / family.columns)
      const c = new Canvas(family.frameW, family.frameH)
      family.sprites[key].draw(c, 0)
      sheet.blit(c, col * family.frameW, row * family.frameH)
      atlas.sprites[key] = { col, row, frames: 1 }
    })
    return { sheet, atlas }
  }
  const maxFrames = Math.max(...keys.map((k) => family.sprites[k].frames))
  const sheet = new Canvas(family.frameW * maxFrames, family.frameH * keys.length)
  const atlas = { name: family.name, frameW: family.frameW, frameH: family.frameH, sprites: {} }
  keys.forEach((key, row) => {
    const { frames, draw } = family.sprites[key]
    for (let f = 0; f < frames; f++) {
      const c = new Canvas(family.frameW, family.frameH)
      draw(c, f)
      sheet.blit(c, f * family.frameW, row * family.frameH)
    }
    atlas.sprites[key] = { row, frames }
  })
  return { sheet, atlas }
}

export async function writeFamily(
  family,
  { outDir = join(ROOT, 'public/assets/rc'), reviewDir = join(ROOT, 'docs/art-review') } = {},
) {
  const { sheet, atlas } = buildFamily(family)
  const lint = lintPalette(sheet)
  if (!lint.ok) {
    const list = lint.offenders.map((o) => `${o.hex}×${o.count}`).join(', ')
    throw new Error(`Palette lint failed for ${family.name}: ${list}`)
  }
  await mkdir(outDir, { recursive: true })
  await mkdir(reviewDir, { recursive: true })
  await sheet.save(join(outDir, `${family.name}.png`), 1)
  await writeFile(join(outDir, `${family.name}.json`), JSON.stringify(atlas, null, 2) + '\n')
  // Contact sheet for human review: ×4 on a mist backdrop.
  const contact = new Canvas(sheet.w, sheet.h)
  contact.rect(0, 0, sheet.w, sheet.h, '#F4F3F9')
  contact.blit(sheet, 0, 0)
  await contact.save(join(reviewDir, `${family.name}.png`), 4)
  return atlas
}

async function loadFamilies(names) {
  const dir = join(HERE, 'families')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.mjs'))
  const wanted = names.length ? files.filter((f) => names.includes(f.replace(/\.mjs$/, ''))) : files
  if (names.length && wanted.length !== names.length) {
    throw new Error(`Unknown family in: ${names.join(', ')}`)
  }
  return Promise.all(wanted.map(async (f) => (await import(pathToFileURL(join(dir, f)).href)).default))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const family of await loadFamilies(process.argv.slice(2))) {
    await writeFamily(family)
    console.log(`built ${family.name} (${Object.keys(family.sprites).length} sprites)`)
  }
}
