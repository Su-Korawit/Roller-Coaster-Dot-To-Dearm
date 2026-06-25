# Sprout Quest Phase 3+4 — Farm Map Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the already-built farm foundation (stores + pure logic + Firestore sync) to the friend's uploaded `test2` Phaser map — rendering crops, plant/harvest via a stand-on-tile Action button, shop/chest proximity zones — and finish Phase 4 polish (sound, day/night, notifications).

**Architecture:** Pure helpers are extended first (`parseMapMeta` gains `farmTiles`/`interactions`; `farmLogic` gains a FarmGround-aware `canPlant` + `resolveAnchor`; a new `farmActions` orchestrates the two stores atomically). The Phaser scene reads those, renders crop sprites from `useFarmStore.plots` on a `farmChanged` event (mirroring the existing decoration-render pattern), detects the active farm tile in `update()`, and raises shop/chest enter/exit events from overlap zones (mirroring portals). `GameCanvas` bridges store→scene and mounts the React overlays gated by `active`. Crop growth stays deterministic from `plantedAt` (no stored stage), so visitors see correct stages read-only.

**Tech Stack:** React 19, Zustand 5, Phaser 3.88, Firebase Storage/Firestore (`firebase@12`), Vitest 4.

## Global Constraints

- **No TypeScript** — `.js`/`.jsx` only, no type annotations.
- **Assets load only from Firebase Storage** via `cloudAsset(storagePath, { fallback })` + a `GAME_ASSETS` entry (ADR-0003). New assets use `fallback: null`.
- **Game state is Firestore-only, never localStorage** (ADR-0004). Do not add `persist` to farm/inventory stores.
- **Farm gold is NOT coins.** `useUserStore.coins` is server-authoritative real currency (Cloud Functions + PromptPay) — farm code must never read or write it. Shop buy/sell touches `useInventoryStore.gold` only.
- **Reuse existing patterns** — `parseMapMeta` (`src/utils/tiledMapMeta.js`), `_renderDecorations`/`mapObjectsChanged` and portal overlap zones (`src/game/worldScenes.js`), the store→registry `useEffect` bridge (`src/components/GameCanvas.jsx`), `cloudAsset`+`GAME_ASSETS` (`src/utils/cloudAsset.js`, `src/game/assetManifest.js`).
- **Tests:** colocated `name.test.js`, Vitest, `import { describe, it, expect } from 'vitest'`. Single file: `npx vitest run <path>`. Full suite: `npm run test`. Build: `npm run build`.
- **Deploy stays Vercel.**
- Farm map key is `test2`; tile size 16px scaled by the scene's `mapScale`. Crop growth is derived from `plantedAt` — never store a stage.

## Scope

In scope: the code that makes farming work on `test2` and Phase 4 polish wiring. Out of scope (the user/friend do these in Tiled per `src/data/mapDocs/tiled-guide.md`): adding a Portal in `map` → `test2`; drawing the `Interactions` shop/chest zones in `test2`; deduping `default=true` spawns in `map`. The code in this plan tolerates those map edits being absent (empty `farmTiles`/`interactions` → no crashes, features simply inert until drawn).

## File Structure

- **Modify:** `src/utils/tiledMapMeta.js` (+ test), `src/systems/farmLogic.js` (+ test), `src/data/PlantData.js`, `src/game/assetManifest.js`, `src/game/worldScenes.js`, `src/components/GameCanvas.jsx`, `src/systems/SoundManager.js`.
- **Create:** `src/systems/farmActions.js` (+ test), `src/components/FarmActionButton.jsx`.
- **One-off:** upload `Basic_Plants.png` to Storage (Task 1).

---

### Task 1: Register the crop spritesheet asset

**Files:**
- Modify: `src/game/assetManifest.js`
- One-off upload (no code): `public/assets/sprites/Objects/Basic_Plants.png` → Storage `sprites/objects/Basic_Plants.png`

**Interfaces:**
- Produces: a `GAME_ASSETS` entry keyed `'crops'` resolvable via the existing `resolveAssetUrls()` in `worldScenes.js`.

- [ ] **Step 1: Add the manifest entry**

In `src/game/assetManifest.js`, inside the `GAME_ASSETS` array, after the `object('Chest', 'Chest')` line, add:

```js
  // Crops — 6×2 grid of 16px frames (turnip/carrot/potato/pumpkin stages)
  {
    key: 'crops',
    type: 'spritesheet',
    storagePath: 'sprites/objects/Basic_Plants.png',
    localPath: '/assets/sprites/Objects/Basic_Plants.png',
    frameConfig: { frameWidth: 16, frameHeight: 16 },
  },
```

(Keep `localPath` so dev still works from the repo copy; per ADR-0003 the Storage copy is authoritative and future new assets use `fallback: null`.)

- [ ] **Step 2: Upload the file to Storage**

Run the existing upload path so the Storage object exists (the manifest already drives `scripts/uploadAssets.mjs`):

```bash
node scripts/uploadAssets.mjs
```

Expected: log line confirming `sprites/objects/Basic_Plants.png` uploaded (script reads `GAME_ASSETS`, uploads `public` + `localPath`). If the script targets all assets and that is too broad, upload just this one object via the same SDK call the script uses.

- [ ] **Step 3: Verify resolution**

```bash
npm run build
```

Expected: clean build (manifest is pure data; no import cycle).

- [ ] **Step 4: Commit**

```bash
git add src/game/assetManifest.js
git commit -m "feat: register crops spritesheet asset (Basic_Plants.png)"
```

---

### Task 2: Crop sprite frames in PlantData

**Files:**
- Modify: `src/data/PlantData.js`

**Interfaces:**
- Produces: `PLANTS[id].spriteFrames` — a 4-element array of frame indices into the `crops` spritesheet, indexed by stage `0..3`.

- [ ] **Step 1: Add spriteFrames to each plant**

In `src/data/PlantData.js`, add a `spriteFrames` field to each plant. `Basic_Plants.png` is a 6×2 grid (frames 0–11); row 0 (frames 0–5) is a growth progression. Map stages 0–3 onto row-0 frames as a placeholder shared by all crops (swap per-crop when a fuller sheet arrives — no logic change):

```js
  turnip: {
    id: 'turnip',
    name: 'หัวผักกาด',
    seedKey: 'turnip_seed',
    stages: 4,
    growTime: [15, 30, 60],
    size: { w: 1, h: 1 },
    yieldMin: 1,
    yieldMax: 3,
    spriteFrames: [0, 1, 2, 3],
  },
```

Apply the same `spriteFrames: [0, 1, 2, 3]` to `carrot` and `potato`. For `pumpkin` (2×2), use the larger row-1 frames as a placeholder: `spriteFrames: [0, 1, 2, 5]`.

- [ ] **Step 2: Sanity-check existing tests still pass**

Run: `npx vitest run src/systems/farmLogic.test.js`
Expected: PASS (PlantData shape additions don't break growth math).

- [ ] **Step 3: Commit**

```bash
git add src/data/PlantData.js
git commit -m "feat: add per-stage crop sprite frames to PlantData"
```

---

### Task 3: Extend parseMapMeta with farmTiles + interactions (TDD)

**Files:**
- Modify: `src/utils/tiledMapMeta.js`
- Test: `src/utils/tiledMapMeta.test.js`

**Interfaces:**
- Consumes: a parsed Tiled map. The `FarmGround` tile layer has CSV `data` (flat array of gids, length `width*height`). An `Interactions` object layer has objects with `action`/`shopId` properties.
- Produces (added to the existing return object):
  - `farmTiles: Set<"tileX_tileY">` — every cell whose `FarmGround` gid is non-zero.
  - `interactions: Array<{ x, y, width, height, action, shopId }>`.

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/tiledMapMeta.test.js`:

```js
describe('parseMapMeta farm extensions', () => {
  it('builds a farmTiles set from non-zero FarmGround cells', () => {
    const map = {
      width: 3, height: 2, tilesets: [], layers: [
        { name: 'FarmGround', type: 'tilelayer', data: [0, 7, 0, 0, 0, 9] },
      ],
    }
    const m = parseMapMeta(map)
    expect(m.farmTiles instanceof Set).toBe(true)
    expect([...m.farmTiles].sort()).toEqual(['1_0', '2_1'])
  })

  it('returns an empty farmTiles set when FarmGround layer is absent', () => {
    const m = parseMapMeta({ width: 2, height: 2, tilesets: [], layers: [] })
    expect(m.farmTiles instanceof Set).toBe(true)
    expect(m.farmTiles.size).toBe(0)
  })

  it('parses Interactions objects with action/shopId', () => {
    const map = {
      width: 2, height: 2, tilesets: [], layers: [
        {
          name: 'Interactions', type: 'objectgroup', objects: [
            { x: 32, y: 48, width: 16, height: 16, properties: [{ name: 'action', value: 'shop' }, { name: 'shopId', value: 'seed_shop' }] },
            { x: 80, y: 16, width: 16, height: 16, properties: [{ name: 'action', value: 'chest' }] },
          ],
        },
      ],
    }
    const m = parseMapMeta(map)
    expect(m.interactions).toEqual([
      { x: 32, y: 48, width: 16, height: 16, action: 'shop', shopId: 'seed_shop' },
      { x: 80, y: 16, width: 16, height: 16, action: 'chest', shopId: null },
    ])
  })

  it('returns empty interactions when the layer is absent', () => {
    const m = parseMapMeta({ width: 2, height: 2, tilesets: [], layers: [] })
    expect(m.interactions).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/utils/tiledMapMeta.test.js`
Expected: FAIL — `m.farmTiles` / `m.interactions` undefined.

- [ ] **Step 3: Implement**

In `src/utils/tiledMapMeta.js`, add a tile-layer finder and the two extractors, then include them in the return. Add near the top (after `objectLayer`):

```js
function tileLayer(map, name) {
  return (map.layers || []).find((l) => l.name === name && l.type === 'tilelayer') || null
}

function farmTilesFrom(map) {
  const layer = tileLayer(map, 'FarmGround')
  const tiles = new Set()
  if (!layer || !Array.isArray(layer.data)) return tiles
  const w = map.width
  layer.data.forEach((gid, i) => {
    if (gid !== 0) tiles.add(`${i % w}_${Math.floor(i / w)}`)
  })
  return tiles
}

function interactionsFrom(map) {
  const layer = objectLayer(map, 'Interactions')
  return (layer?.objects || []).map((o) => ({
    x: o.x,
    y: o.y,
    width: o.width,
    height: o.height,
    action: propValue(o, 'action'),
    shopId: propValue(o, 'shopId'),
  }))
}
```

Then in `parseMapMeta`, add to the returned object:

```js
  return {
    width: map.width,
    height: map.height,
    tilesetNames,
    spawns,
    defaultSpawnName,
    portals,
    farmTiles: farmTilesFrom(map),
    interactions: interactionsFrom(map),
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/utils/tiledMapMeta.test.js`
Expected: PASS (existing + 4 new tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/tiledMapMeta.js src/utils/tiledMapMeta.test.js
git commit -m "feat: parseMapMeta extracts FarmGround tiles + Interactions zones"
```

---

### Task 4: FarmGround-aware canPlant + resolveAnchor (TDD)

**Files:**
- Modify: `src/systems/farmLogic.js`
- Test: `src/systems/farmLogic.test.js`

**Interfaces:**
- Changes: `canPlant(plots, x, y, plantId, farmTiles)` — adds a 5th arg; every occupied tile must be in `farmTiles` (a `Set` of `"x_y"`). When `farmTiles` is omitted/undefined, skip the FarmGround check (keeps existing callers/tests valid).
- Adds: `resolveAnchor(plots, x, y) → string` — returns the anchor tileKey for a satellite tile (`plot.anchorKey`), else `tileKey(x, y)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/systems/farmLogic.test.js`:

```js
import { resolveAnchor } from './farmLogic'

describe('farmLogic FarmGround + anchor', () => {
  const farm = new Set(['5_3', '6_4', '7_4', '6_5', '7_5'])

  it('rejects planting when any occupied tile is off FarmGround', () => {
    // pumpkin is 2x2 anchored at 6,4 → needs 6_4,7_4,6_5,7_5 (all present) → ok
    expect(canPlant({}, 6, 4, 'pumpkin', farm)).toEqual({ ok: true })
    // anchor 5,3 single turnip on farm → ok
    expect(canPlant({}, 5, 3, 'turnip', farm)).toEqual({ ok: true })
    // turnip on a non-farm tile → rejected
    expect(canPlant({}, 0, 0, 'turnip', farm)).toEqual({ ok: false, reason: 'นอกแปลงดิน' })
  })

  it('rejects a 2x2 plant straddling the FarmGround edge', () => {
    const edgeFarm = new Set(['6_4', '7_4']) // bottom row missing
    expect(canPlant({}, 6, 4, 'pumpkin', edgeFarm)).toEqual({ ok: false, reason: 'นอกแปลงดิน' })
  })

  it('skips the FarmGround check when farmTiles is omitted', () => {
    expect(canPlant({}, 0, 0, 'turnip')).toEqual({ ok: true })
  })

  it('resolves a satellite tile to its anchor key', () => {
    const plots = { '6_4': { plantId: 'pumpkin', plantedAt: 0 }, '7_5': { anchorKey: '6_4' } }
    expect(resolveAnchor(plots, 7, 5)).toBe('6_4')
    expect(resolveAnchor(plots, 6, 4)).toBe('6_4')
    expect(resolveAnchor(plots, 1, 1)).toBe('1_1')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/systems/farmLogic.test.js`
Expected: FAIL — `resolveAnchor` undefined; `canPlant` ignores `farmTiles`.

- [ ] **Step 3: Implement**

In `src/systems/farmLogic.js`, replace `canPlant` and add `resolveAnchor`:

```js
export function canPlant(plots, x, y, plantId, farmTiles) {
  if (!PLANTS[plantId]) return { ok: false, reason: 'ไม่รู้จักพืชนี้' }
  for (const t of occupiedTiles(x, y, plantId)) {
    const k = tileKey(t.x, t.y)
    if (plots[k]) return { ok: false, reason: 'มีพืชอยู่แล้ว' }
    if (farmTiles && !farmTiles.has(k)) return { ok: false, reason: 'นอกแปลงดิน' }
  }
  return { ok: true }
}

// Given any tile, return the anchor tileKey: a satellite tile points to its
// anchor via anchorKey; an anchor or empty tile resolves to itself.
export function resolveAnchor(plots, x, y) {
  const k = tileKey(x, y)
  const plot = plots[k]
  return plot && plot.anchorKey ? plot.anchorKey : k
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/systems/farmLogic.test.js`
Expected: PASS (existing + new).

- [ ] **Step 5: Commit**

```bash
git add src/systems/farmLogic.js src/systems/farmLogic.test.js
git commit -m "feat: FarmGround-aware canPlant + resolveAnchor helper"
```

---

### Task 5: farmActions orchestrator (atomic plant / guarded harvest) (TDD)

**Files:**
- Create: `src/systems/farmActions.js`
- Test: `src/systems/farmActions.test.js`

**Interfaces:**
- Consumes: `useInventoryStore` (`hasItem`/`removeItem`/`addItem`), `useFarmStore` (`plant`/`harvest`, `plots`), `farmLogic` (`canPlant`/`resolveAnchor`/`occupiedTiles`/`tileKey`/`isReady`), `ITEMS`/`PLANTS`, `notify`.
- Produces:
  - `plantSeed({ tileX, tileY, seedItemId, farmTiles }) → { ok, reason? }`
  - `harvestAt({ tileX, tileY }) → { ok, reason?, produce? }`

  Both pull live state via `getState()` so they are callable from React handlers. Visitor-gating is the caller's responsibility (the Action button is hidden for visitors); these functions assume an owner context.

- [ ] **Step 1: Write the failing tests**

```js
// src/systems/farmActions.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { useInventoryStore } from '../stores/useInventoryStore'
import { useFarmStore } from '../stores/useFarmStore'
import { plantSeed, harvestAt } from './farmActions'

const farm = new Set(['5_3'])

beforeEach(() => {
  useInventoryStore.setState({ hotbar: Array(8).fill(null), storage: Array(30).fill(null), gold: 100 })
  useFarmStore.setState({ plotsByMap: {}, currentMapKey: 'test2', plots: {} })
})

describe('plantSeed', () => {
  it('consumes one seed and plants when valid', () => {
    useInventoryStore.getState().addItem('turnip_seed', 2)
    const r = plantSeed({ tileX: 5, tileY: 3, seedItemId: 'turnip_seed', farmTiles: farm })
    expect(r.ok).toBe(true)
    expect(useInventoryStore.getState().countItem('turnip_seed')).toBe(1)
    expect(useFarmStore.getState().plots['5_3'].plantId).toBe('turnip')
  })

  it('refuses and consumes nothing when seed missing', () => {
    const r = plantSeed({ tileX: 5, tileY: 3, seedItemId: 'turnip_seed', farmTiles: farm })
    expect(r.ok).toBe(false)
    expect(useFarmStore.getState().plots['5_3']).toBeUndefined()
  })

  it('refuses and keeps the seed when tile is off FarmGround', () => {
    useInventoryStore.getState().addItem('turnip_seed', 1)
    const r = plantSeed({ tileX: 0, tileY: 0, seedItemId: 'turnip_seed', farmTiles: farm })
    expect(r.ok).toBe(false)
    expect(useInventoryStore.getState().countItem('turnip_seed')).toBe(1)
  })
})

describe('harvestAt', () => {
  it('blocks harvest and keeps the plot when inventory is full', () => {
    const plantedAt = Date.now() - 200_000 // turnip ready (>105s)
    useFarmStore.setState({
      currentMapKey: 'test2',
      plotsByMap: { test2: { '5_3': { plantId: 'turnip', plantedAt, tileX: 5, tileY: 3 } } },
      plots: { '5_3': { plantId: 'turnip', plantedAt, tileX: 5, tileY: 3 } },
    })
    // fill every slot with a non-stacking-with-turnip item at max
    useInventoryStore.setState({
      hotbar: Array(8).fill({ itemId: 'carrot', count: 99 }),
      storage: Array(30).fill({ itemId: 'carrot', count: 99 }),
      gold: 100,
    })
    const r = harvestAt({ tileX: 5, tileY: 3 })
    expect(r.ok).toBe(false)
    expect(useFarmStore.getState().plots['5_3']).toBeDefined()
  })

  it('harvests a ready plot into inventory', () => {
    const plantedAt = Date.now() - 200_000
    useFarmStore.setState({
      currentMapKey: 'test2',
      plotsByMap: { test2: { '5_3': { plantId: 'turnip', plantedAt, tileX: 5, tileY: 3 } } },
      plots: { '5_3': { plantId: 'turnip', plantedAt, tileX: 5, tileY: 3 } },
    })
    const r = harvestAt({ tileX: 5, tileY: 3 })
    expect(r.ok).toBe(true)
    expect(useInventoryStore.getState().countItem('turnip')).toBeGreaterThanOrEqual(1)
    expect(useFarmStore.getState().plots['5_3']).toBeUndefined()
  })

  it('does nothing on an empty tile', () => {
    expect(harvestAt({ tileX: 5, tileY: 3 }).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/systems/farmActions.test.js`
Expected: FAIL — cannot resolve `./farmActions`.

- [ ] **Step 3: Implement**

```js
// src/systems/farmActions.js
// Orchestrates the inventory + farm stores so plant/harvest stay consistent.
// Pure of React; reads live state via getState() so React handlers can call it.
import { useInventoryStore } from '../stores/useInventoryStore.js'
import { useFarmStore } from '../stores/useFarmStore.js'
import { ITEMS } from '../data/ItemData.js'
import { PLANTS } from '../data/PlantData.js'
import { canPlant, resolveAnchor, isReady } from './farmLogic.js'
import { notify } from './NotificationSystem.js'

// Would `count` of itemId fit into the current slots without overflow?
function fits(inv, itemId, count) {
  const stackMax = ITEMS[itemId]?.stackMax ?? 99
  let capacity = 0
  for (const slot of [...inv.hotbar, ...inv.storage]) {
    if (slot === null) capacity += stackMax
    else if (slot.itemId === itemId) capacity += stackMax - slot.count
    if (capacity >= count) return true
  }
  return capacity >= count
}

export function plantSeed({ tileX, tileY, seedItemId, farmTiles }) {
  const inv = useInventoryStore.getState()
  const item = ITEMS[seedItemId]
  if (!item || item.type !== 'seed') return { ok: false, reason: 'ไม่ใช่เมล็ด' }
  const plantId = item.plantId
  if (!inv.hasItem(seedItemId, 1)) { notify.error?.('ไม่มีเมล็ด'); return { ok: false, reason: 'ไม่มีเมล็ด' } }

  const plots = useFarmStore.getState().plots
  const check = canPlant(plots, tileX, tileY, plantId, farmTiles)
  if (!check.ok) { notify.error?.(check.reason); return check }

  // Both preconditions held; mutate inventory then farm.
  inv.removeItem(seedItemId, 1)
  const planted = useFarmStore.getState().plant(tileX, tileY, plantId)
  if (!planted) {
    // extremely unlikely race — refund the seed to stay consistent
    useInventoryStore.getState().addItem(seedItemId, 1)
    return { ok: false, reason: 'ปลูกไม่สำเร็จ' }
  }
  notify.planted?.(PLANTS[plantId]?.name ?? plantId)
  return { ok: true }
}

export function harvestAt({ tileX, tileY }) {
  const farm = useFarmStore.getState()
  const anchorKey = resolveAnchor(farm.plots, tileX, tileY)
  const [ax, ay] = anchorKey.split('_').map(Number)
  const plot = farm.plots[anchorKey]
  if (!plot || plot.anchorKey) return { ok: false, reason: 'ไม่มีพืช' }
  if (!isReady(plot.plantedAt, plot.plantId, Date.now())) return { ok: false, reason: 'ยังไม่โต' }

  // Block before clearing the plot if produce would not fit.
  const inv = useInventoryStore.getState()
  if (!fits(inv, plot.plantId, 1)) { notify.inventoryFull?.(); return { ok: false, reason: 'กระเป๋าเต็ม' } }

  const produce = useFarmStore.getState().harvest(ax, ay)
  if (!produce) return { ok: false, reason: 'เก็บไม่สำเร็จ' }
  useInventoryStore.getState().addItem(produce.itemId, produce.count)
  notify.harvested?.(ITEMS[produce.itemId]?.name ?? produce.itemId, produce.count)
  return { ok: true, produce }
}
```

> Note: the implementer must confirm `notify` exposes `planted/harvested/inventoryFull/error` (it does per `NotificationSystem.js`); the `?.` calls keep this safe if a shortcut is renamed.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/systems/farmActions.test.js`
Expected: PASS (6 tests). The "inventory full" test relies on `fits` returning false when all 38 slots are full of a different item — verify `harvest` is not called in that path.

- [ ] **Step 5: Commit**

```bash
git add src/systems/farmActions.js src/systems/farmActions.test.js
git commit -m "feat: farmActions orchestrator (atomic plant, full-guard harvest)"
```

---

### Task 6: Scene rendering + farm/shop/chest detection

**Files:**
- Modify: `src/game/worldScenes.js`

**Interfaces:**
- Consumes: `parseMapMeta` (`farmTiles`/`interactions`), `useFarmStore.getState().plots`, `currentStage` + `PLANTS[id].spriteFrames`, the `crops` texture (resolved URL via the existing `urlFor`/preload path).
- Produces (game events emitted for `GameCanvas`): `farmTileChanged` (`{ tileX, tileY } | null`), `shopEntered` (`{ shopId }`)/`shopExited`, `chestOpened`/`chestClosed`. Listens for `farmChanged` (re-render crops).

This task is Phaser-integration (manual-verified, not unit-tested), mirroring existing patterns. Make these edits inside `create()` and `update()` of `MapScene`.

- [ ] **Step 1: Load the crops texture in preload**

In `MapScene.preload()` (where other spritesheets load via `urlFor`), add a guarded load:

```js
if (!this.textures.exists('crops')) {
  const cropsUrl = urlFor(this.registry, 'crops')
  if (cropsUrl) this.load.spritesheet('crops', cropsUrl, { frameWidth: 16, frameHeight: 16 })
}
```

- [ ] **Step 2: Capture meta + render crops in create()**

After the existing `const meta = rawJson ? parseMapMeta(rawJson) : {...}` line (currently ~line 282), ensure the fallback object includes the new fields, and store them on the scene:

```js
const meta = rawJson ? parseMapMeta(rawJson) : { spawns: [], portals: [], defaultSpawnName: null, farmTiles: new Set(), interactions: [] }
this._farmTiles = meta.farmTiles ?? new Set()
this._interactions = meta.interactions ?? []
```

After the decoration group setup (`this._decorGroup = ...; this._renderDecorations(...)`), add a crop group + render method wired to `farmChanged` (mirror the `mapObjectsChanged` block at lines 338–345):

```js
this._cropGroup = this.add.group()
this._renderCrops(mapScale)
const onFarmChanged = () => this._renderCrops(this._mapScale)
this.game.events.on('farmChanged', onFarmChanged)
this.events.once('shutdown', () => this.game.events.off('farmChanged', onFarmChanged))

// Re-render periodically so deterministic growth advances on screen.
this._cropTimer = this.time.addEvent({
  delay: 1000, loop: true, callback: () => this._renderCrops(this._mapScale),
})
this.events.once('shutdown', () => this._cropTimer?.remove())
```

Add the method to the `MapScene` class (alongside `_renderDecorations`), importing `currentStage` + `PLANTS`:

```js
_renderCrops(mapScale) {
  if (!this._cropGroup || !this.textures.exists('crops')) return
  this._cropGroup.clear(true, true)
  const plots = useFarmStore.getState().plots || {}
  const now = Date.now()
  for (const [key, plot] of Object.entries(plots)) {
    if (!plot || plot.anchorKey) continue // skip empty + satellite tiles
    const plant = PLANTS[plot.plantId]
    if (!plant) continue
    const stage = currentStage(plot.plantedAt, plot.plantId, now)
    const frame = plant.spriteFrames?.[stage] ?? 0
    const [tx, ty] = key.split('_').map(Number)
    const img = this.add.image((tx + 0.5) * 16 * mapScale, (ty + 0.5) * 16 * mapScale, 'crops', frame)
    img.setScale(mapScale).setDepth(9) // below player (10), above ground
    this._cropGroup.add(img)
  }
}
```

Add the imports at the top of `worldScenes.js`:

```js
import { useFarmStore } from '../stores/useFarmStore'
import { currentStage } from '../systems/farmLogic'
import { PLANTS } from '../data/PlantData'
```

- [ ] **Step 3: Build shop/chest overlap zones in create()**

After the portal-zone loop (currently ~lines 373–389), add interaction zones with enter/exit tracking:

```js
this._activeZones = new Set()
this._zoneDefs = []
this._interactions.forEach((it) => {
  if (!it.action) return
  const zone = this.add.zone(
    it.x * mapScale + (it.width * mapScale) / 2,
    it.y * mapScale + (it.height * mapScale) / 2,
    it.width * mapScale,
    it.height * mapScale,
  )
  this.physics.world.enable(zone)
  zone.body.setAllowGravity(false)
  zone.body.moves = false
  this._zoneDefs.push({ zone, action: it.action, shopId: it.shopId ?? null })
})
```

- [ ] **Step 4: Detect active farm tile + zone enter/exit in update()**

At the end of `update()` (after movement), add throttled detection (use a frame counter so it runs ~6×/s):

```js
this._farmTick = (this._farmTick ?? 0) + 1
if (this._farmTick % 10 === 0) {
  // active farm tile under the player
  const tx = Math.floor(this.player.x / this._mapScale / 16)
  const ty = Math.floor(this.player.y / this._mapScale / 16)
  const onFarm = this._farmTiles.has(`${tx}_${ty}`)
  const key = onFarm ? `${tx}_${ty}` : null
  if (key !== this._lastFarmTile) {
    this._lastFarmTile = key
    this.game.events.emit('farmTileChanged', onFarm ? { tileX: tx, tileY: ty } : null)
  }
  // zone enter/exit
  for (const def of this._zoneDefs) {
    const overlapping = this.physics.world.overlap(this.player, def.zone)
    const was = this._activeZones.has(def.zone)
    if (overlapping && !was) {
      this._activeZones.add(def.zone)
      if (def.action === 'shop') this.game.events.emit('shopEntered', { shopId: def.shopId })
      else if (def.action === 'chest') this.game.events.emit('chestOpened')
    } else if (!overlapping && was) {
      this._activeZones.delete(def.zone)
      if (def.action === 'shop') this.game.events.emit('shopExited')
      else if (def.action === 'chest') this.game.events.emit('chestClosed')
    }
  }
}
```

- [ ] **Step 5: Manual verification (build)**

Run: `npm run build`
Expected: clean build. Run `npm run test` — existing suite still green (no scene unit tests added).

- [ ] **Step 6: Commit**

```bash
git add src/game/worldScenes.js
git commit -m "feat: render crops + detect farm tile and shop/chest zones in MapScene"
```

---

### Task 7: GameCanvas bridge, Action button, overlay mounting

**Files:**
- Create: `src/components/FarmActionButton.jsx`
- Modify: `src/components/GameCanvas.jsx`

**Interfaces:**
- Consumes: scene events from Task 6; `useFarmStore` (`plots`, `setActiveTile` not needed — React holds the active tile in local state), `useInventoryStore`, `farmActions` (`plantSeed`/`harvestAt`), the existing UI components (`Hotbar`, `SeedPicker`, `ShopUI`, `StorageUI`, `DayNightOverlay`, `NotificationContainer`).
- Produces: a mounted farm UI over the canvas, gated by `active` and ownership.

- [ ] **Step 1: Create the Action button component**

```jsx
// src/components/FarmActionButton.jsx
// Floating button shown when the player stands on a plantable tile they own.
// Tap → plant (empty) or harvest (ready). Stops touch propagation so the tap
// is not read by the Phaser canvas as movement.
import React from 'react'

export default function FarmActionButton({ label, onAction }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onAction() }}
      style={{
        position: 'absolute',
        bottom: 96,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        fontFamily: "'pixelFont-7', monospace",
        fontSize: 13,
        fontWeight: 'bold',
        color: '#3d2b1f',
        backgroundColor: '#a8e6a3',
        border: '3px solid #3d2b1f',
        borderRadius: 6,
        cursor: 'pointer',
        zIndex: 50,
        boxShadow: '0 3px 0 rgba(0,0,0,0.3)',
      }}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 2: Wire scene events + farm state in GameCanvas**

In `src/components/GameCanvas.jsx`, add imports:

```js
import { useInventoryStore } from '../stores/useInventoryStore'
import { tileKey, isReady } from '../systems/farmLogic'
import { plantSeed, harvestAt } from '../systems/farmActions'
import FarmActionButton from './FarmActionButton'
import Hotbar from './Hotbar'
import { SeedPicker } from './SeedPicker'
import { ShopUI } from './ShopUI'
import StorageUI from './StorageUI'
import DayNightOverlay from './DayNightOverlay'
import NotificationContainer from './NotificationContainer'
```

> The implementer must match each component's actual export style + prop names by opening the file (e.g. `ShopUI`/`SeedPicker` are named exports; `StorageUI`/overlays may be default — adjust imports accordingly). Do not invent props.

Add local state + the farm-store bridge near the other `useEffect`s:

```js
const [activeTile, setActiveTile] = useState(null)
const [seedPickerOpen, setSeedPickerOpen] = useState(false)
const [shopState, setShopState] = useState(null)   // { shopId } | null
const [chestOpen, setChestOpen] = useState(false)
const plots = useFarmStore((s) => s.plots)
const isOwner = currentMapOwnerUid && selfUid && currentMapOwnerUid === selfUid

// Bridge store → scene so crops re-render on plant/harvest.
useEffect(() => {
  const game = gameRef.current
  if (!game) return
  game.events.emit('farmChanged')
}, [plots])
```

In the one-time boot effect (inside `bootGame`, alongside the other `game.events.on(...)` handlers), subscribe to the scene events:

```js
game.events.on('farmTileChanged', (tile) => setActiveTile(tile))
game.events.on('shopEntered', ({ shopId }) => setShopState({ shopId }))
game.events.on('shopExited', () => setShopState(null))
game.events.on('chestOpened', () => setChestOpen(true))
game.events.on('chestClosed', () => setChestOpen(false))
```

- [ ] **Step 3: Compute the Action button label + handler**

Before `return (`, derive the button state:

```js
const activePlot = activeTile ? plots[tileKey(activeTile.tileX, activeTile.tileY)] : null
const activeReady = activePlot && !activePlot.anchorKey && isReady(activePlot.plantedAt, activePlot.plantId, Date.now())
const showAction = active && isOwner && activeTile != null
const actionLabel = activePlot ? (activeReady ? 'เก็บเกี่ยว' : 'กำลังโต…') : 'ปลูก'

const handleAction = () => {
  if (!activeTile) return
  if (!activePlot) { setSeedPickerOpen(true); return }
  if (activeReady) harvestAt({ tileX: activeTile.tileX, tileY: activeTile.tileY })
}
```

- [ ] **Step 4: Mount overlays in the returned fragment**

Replace the `<MapPalette />` line with the farm overlays (keep the `MapPalette` import for easy restore — just remove its render). Add inside the fragment, after the canvas `<div>`:

```jsx
{active && <Hotbar />}
{showAction && <FarmActionButton label={actionLabel} onAction={handleAction} />}
{active && (
  <SeedPicker
    isOpen={seedPickerOpen}
    onClose={() => setSeedPickerOpen(false)}
    onSelect={(seedItemId) => {
      if (activeTile) {
        plantSeed({ tileX: activeTile.tileX, tileY: activeTile.tileY, seedItemId, farmTiles: gameRef.current?.scene?.getScene('MapScene')?._farmTiles })
      }
      setSeedPickerOpen(false)
    }}
  />
)}
{active && shopState && (
  <ShopUI isOpen onClose={() => setShopState(null)} /* wire shop/stock/produce/gold + onBuy/onSell/onSellAll to useInventoryStore + ShopData */ />
)}
{active && chestOpen && (
  <StorageUI isOpen onClose={() => setChestOpen(false)} /* wire hotbar/storage move handlers to useInventoryStore */ />
)}
{active && <DayNightOverlay />}
{active && <NotificationContainer />}
```

> The `SeedPicker`/`ShopUI`/`StorageUI` prop wiring must match each component's real signature (read the files). `ShopUI` (per its source) takes `shop`, `stockList`, `produceList`, `gold`, `onBuy`, `onSell`, `onSellAll`, `onClose`; map `stockList`/`produceList` from `ShopData` + `useInventoryStore` and route buy/sell through `useInventoryStore` (gold only — never `coins`).

- [ ] **Step 5: Manual verification**

Run: `npm run build` then `npm run test`
Expected: clean build, suite green. Manual smoke per the plan's Verification section.

- [ ] **Step 6: Commit**

```bash
git add src/components/FarmActionButton.jsx src/components/GameCanvas.jsx
git commit -m "feat: mount farm overlays + Action button, remove MapPalette render"
```

---

### Task 8: Sound via cloudAsset (ADR-0003)

**Files:**
- Modify: `src/systems/SoundManager.js`
- Modify: `src/game/assetManifest.js`

**Interfaces:**
- Changes: `SoundManager.loadAll()` resolves each sound URL through `cloudAsset(storagePath, { fallback: null })` before fetching. Missing files remain a silent no-op.

- [ ] **Step 1: Point sound paths at Storage**

In `src/systems/SoundManager.js`, replace the hardcoded `SOUND_URLS` local paths + `loadAll` with Storage-resolved URLs:

```js
import { cloudAsset } from '../utils/cloudAsset'

const SOUND_PATHS = {
  walk:    'sounds/walk.mp3',
  plant:   'sounds/plant.mp3',
  harvest: 'sounds/harvest.mp3',
  buy:     'sounds/buy.mp3',
  sell:    'sounds/sell.mp3',
  door:    'sounds/door.mp3',
  newday:  'sounds/newday.mp3',
  error:   'sounds/error.mp3',
}
```

And change `loadAll()`:

```js
  async loadAll() {
    await Promise.all(
      Object.entries(SOUND_PATHS).map(async ([key, path]) => {
        const url = await cloudAsset(path, { fallback: null })
        if (url) await this.load(key, url)
      })
    )
  }
```

(Leave `load(key, url)`, `play`, and the `play*` shortcuts unchanged. Files are uploaded later; until then `cloudAsset` returns `null` and the loop skips — silent no-op, no crash.)

- [ ] **Step 2: Call sound from farm flows**

In `src/systems/farmActions.js`, after a successful plant/harvest, fire the matching sound (import `sound` from `./SoundManager`): `sound.playPlant()` after `notify.planted`, `sound.playHarvest()` after `notify.harvested`. (Optional; keep guarded — no-op when not loaded.)

- [ ] **Step 3: Verify**

Run: `npm run build` then `npm run test`
Expected: clean build, suite green (SoundManager has no tests; ensure no import cycle from `farmActions`).

- [ ] **Step 4: Commit**

```bash
git add src/systems/SoundManager.js src/systems/farmActions.js
git commit -m "feat: load sounds from Firebase Storage via cloudAsset"
```

---

## Self-Review

- **Spec coverage:** Plantable-from-FarmGround (Task 3 `farmTiles` + Task 4 `canPlant`), multi-tile edge guard + satellite→anchor (Task 4 + Task 5 `harvestAt`), atomic plant + full-guard harvest (Task 5), crop rendering with deterministic stage (Task 6 `_renderCrops`), Action button owner-gated (Task 7 `showAction = active && isOwner`), shop/chest zones (Task 6 + Task 7), asset-from-Storage (Tasks 1, 8 per ADR-0003), no localStorage for game state (untouched — ADR-0004), farm gold ≠ coins (Task 7 routes shop through `useInventoryStore`). Map edits (entry portal, drawing zones) are explicitly out of scope.
- **Placeholder scan:** Tasks 1–5, 8 carry complete code/tests. Tasks 6–7 are Phaser/React integration with concrete snippets at exact insertion points; the two `/* wire ... */` notes in Task 7 Step 4 are deliberate pointers to read each component's real prop signature (the components already exist) rather than invent props — the implementer matches them.
- **Type consistency:** `farmTiles` is a `Set<"x_y">` produced in Task 3, consumed by `canPlant` (Task 4) and `plantSeed` (Task 5) and the scene (`_farmTiles`, Task 6) and the SeedPicker handler (Task 7). `resolveAnchor` returns a tileKey string used by `harvestAt`. `spriteFrames[stage]` (Task 2) is read in `_renderCrops` (Task 6). Event names `farmChanged`/`farmTileChanged`/`shopEntered|Exited`/`chestOpened|Closed` match between Task 6 (emit) and Task 7 (listen).

## Verification (end-to-end)

- `npm run test` green; `npm run build` clean.
- Manual on `test2`: stand on a FarmGround tile → Action button "ปลูก" appears (owner only) → SeedPicker → pick seed → crop sprite renders, advances stage over time → button shows "เก็บเกี่ยว" when ready → harvest adds produce (or blocks with a "กระเป๋าเต็ม" toast when full). Walk into a shop zone → `ShopUI` opens; buy/sell changes **farm gold** only. Walk into a chest zone → `StorageUI`. Reload → state restored from Firestore `maps/test2` + `users/{uid}`.
- Second account **Visits** the farm → sees crops at the correct stage and the owner's avatar (presence), and the Action button does **not** appear.
- Grep-confirm farm code never references `useUserStore` `coins`.
```
