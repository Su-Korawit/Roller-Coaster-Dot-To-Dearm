// The farm, the Personal Map and the old maps (test3, test2) were replaced by the study room
// (ADR-0023). This guard fails if any of it creeps back into the app.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(SRC, '..')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}
const rel = (p) => relative(SRC, p).replace(/\\/g, '/')
const sources = walk(SRC).filter((p) => /\.jsx?$/.test(p) && !p.includes('.test.')).map((p) => [rel(p), readFileSync(p, 'utf8')])

const REMOVED_FILES = [
  'systems/farmLogic.js', 'systems/farmActions.js', 'systems/FarmSystem.js', 'systems/shopActions.js',
  'systems/inventoryActions.js', 'systems/InventorySystem.js', 'systems/inventoryLogic.js', 'systems/ShopSystem.js',
  'stores/useFarmStore.js', 'stores/useFarmDataStore.js', 'stores/useInventoryStore.js', 'lib/farmDataSync.js',
  'components/FarmActionButton.jsx', 'components/SeedPicker.jsx', 'components/ShopUI.jsx', 'components/StorageUI.jsx',
  'components/ItemSprite.jsx', 'components/Hotbar.jsx', 'components/MapPalette.jsx',
  'components/admin/FarmDataSection.jsx', 'components/admin/FarmPlantsTab.jsx', 'components/admin/FarmItemsTab.jsx',
  'components/admin/FarmShopsTab.jsx', 'data/PlantData.js', 'data/ItemData.js', 'data/ShopData.js', 'constants/mapItems.js',
]

const BANNED = [
  /\buseFarmStore\b/, /\buseInventoryStore\b/, /\buseFarmDataStore\b/, /farmLogic/, /farmActions/, /inventoryActions/,
  /inventoryLogic/, /shopActions/, /farmDataSync/, /FarmActionButton/, /SeedPicker/, /\bShopUI\b/, /StorageUI/,
  /ItemSprite/, /\bMapPalette\b/, /constants\/mapItems/, /\bFarmSystem\b/, /\bInventorySystem\b/, /\bShopSystem\b/,
  // Personal Map decorations
  /\bselectedItemKey\b/, /\bobjectsByMap\b/, /\bmapObjects\b/, /\beditMode\b/, /hydrateMapFromFirestore/, /armMapSync/, /disarmMapSync/,
]
const MAP_KEY = /['"`]test[23]['"`]/

describe('legacy world is gone', () => {
  it('deletes the farm, inventory and Personal Map files', () => {
    expect(REMOVED_FILES.filter((f) => existsSync(join(SRC, f)))).toEqual([])
  })

  it('has no remaining reference to the removed modules or concepts', () => {
    const hits = []
    for (const [file, text] of sources) {
      for (const re of BANNED) if (re.test(text)) hits.push(`${file}: ${re}`)
    }
    expect(hits).toEqual([])
  })

  it('never names test3 or test2 as a map key (only mapConfig.js lists them as retired)', () => {
    const hits = sources.filter(([file, text]) => file !== 'utils/mapConfig.js' && MAP_KEY.test(text)).map(([file]) => file)
    expect(hits).toEqual([])
  })

  it('has no farm rules and keeps the Personal Map documents read-only', () => {
    const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8')
    expect(rules).not.toMatch(/farmPlants|farmItems|farmShops/)
    const block = /match \/maps\/\{ownerUid\}\s*{([^}]*)}/.exec(rules)?.[1] ?? ''
    expect(block).toMatch(/allow write:\s*if false/)
  })

  it('ships no map JSON for the removed maps', () => {
    expect(existsSync(join(ROOT, 'public/maps/test3.json'))).toBe(false)
  })
})
