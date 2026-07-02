# Farm Data Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `PlantData.js` / `ItemData.js` / `ShopData.js` from hardcoded JS to Firestore collections (`farmPlants` / `farmItems` / `farmShops`), then add a "Farm Data" admin section with three tabs (Plants / Items / Shops) so admins can create and price shops without a code deploy.

**Architecture:** A new `useFarmDataStore` Zustand store holds the hydrated catalog; `hydrateFarmDataFromFirestore` (called during `sessionBootstrap`) reads each collection and auto-seeds from JS defaults when empty. `farmLogic.js` pure functions are parameterized to accept `plants` explicitly instead of importing the module directly. All runtime callers read from the store. The admin UI writes directly to Firestore collections and refreshes the store on save.

**Tech Stack:** React + Zustand 5, Firebase Firestore (`firebase/firestore`), Firebase Storage (`firebase/storage`) for the sprite frame picker, Tailwind v4 tokens, Vitest for unit tests.

## Global Constraints

- **No TypeScript** — `.js` / `.jsx` only; no type annotations
- **No `persist` on farm stores** — `useFarmDataStore` must NOT use Zustand `persist` middleware (ADR-0004)
- **`useUserStore.coins` never touched** — Farm gold lives in `useInventoryStore.gold`; `coins` is PromptPay real currency managed by Cloud Functions only
- **Farm shop price ≠ item buyPrice** — `farmShops` sell list stores its own `price` per `{ itemId, price }` entry; `farmItems.buyPrice` is a reference price only
- **Sprite frames from existing sheet only** — `Basic_Plants.png` has 6 columns × 2 rows of 16 × 16 px frames; frame picker shows this sheet; adding plants that need new sprites is out of scope
- **Assets from Firebase Storage** — frame picker loads `sprites/objects/Basic_Plants.png` via Firebase Storage SDK; no hardcoded CDN URLs
- **Admin write gate** — `farmPlants` / `farmItems` / `farmShops` are writable only by `isSuperAdmin()` in `firestore.rules`; any authenticated user may read

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/stores/useFarmDataStore.js` | `{ plants, items, shops }` store; `setPlants` / `setItems` / `setShops` setters |
| Create | `src/lib/farmDataSync.js` | `hydrateFarmDataFromFirestore()` — read 3 collections, auto-seed from JS defaults |
| Create | `src/lib/farmDataSync.test.js` | Unit tests for seeding + hydration |
| Modify | `src/systems/farmLogic.js` | Remove PLANTS import; add `plants` param (fallback to JS import during migration) |
| Modify | `src/systems/farmLogic.test.js` | Pass explicit `PLANTS` object to every call |
| Modify | `src/systems/farmActions.js` | Replace `ITEMS`/`PLANTS` imports with `useFarmDataStore.getState()` |
| Modify | `src/systems/farmActions.test.js` | Seed `useFarmDataStore` in `beforeEach` |
| Modify | `src/stores/useFarmStore.js` | Pass `plants` from `useFarmDataStore` to `canPlant` / `occupiedTiles` / `isReady` / `rollYield` |
| Modify | `src/stores/useInventoryStore.js` | Replace `ITEMS` import with `useFarmDataStore.getState().items` |
| Modify | `src/game/worldScenes.js` | Replace `PLANTS` import with `useFarmDataStore.getState().plants` |
| Modify | `src/components/GameCanvas.jsx` | Replace `ITEMS` / `getShop` with `useFarmDataStore` subscriptions |
| Modify | `src/services/sessionBootstrap.js` | Call `hydrateFarmDataFromFirestore()` early in `bootstrapSession` |
| Modify | `firestore.rules` | Add `farmPlants` / `farmItems` / `farmShops` rules |
| Modify | `src/constants/admin.js` | Add `'farm'` to `ADMIN_SECTIONS` and `ADMIN_ROLES` |
| Modify | `src/pages/AdminPage.jsx` | Import `FarmDataSection`; add tab + render |
| Create | `src/components/admin/FarmDataSection.jsx` | Tab bar: Plants / Items / Shops |
| Create | `src/components/admin/FarmShopsTab.jsx` | Shop CRUD + sell list editor |
| Create | `src/components/admin/FarmItemsTab.jsx` | Item CRUD |
| Create | `src/components/admin/FarmPlantsTab.jsx` | Plant CRUD + visual frame picker |

---

## Task 1: `useFarmDataStore` + `farmDataSync` (data foundation)

**Files:**
- Create: `src/stores/useFarmDataStore.js`
- Create: `src/lib/farmDataSync.js`
- Create: `src/lib/farmDataSync.test.js`

**Interfaces:**
- Produces:
  - `useFarmDataStore` — Zustand store with shape `{ plants: {}, items: {}, shops: {}, setPlants(p), setItems(i), setShops(s) }`
  - `hydrateFarmDataFromFirestore()` — async, no params, returns void; reads Firestore, auto-seeds if empty, populates store
- Consumes: `PLANTS` from `../data/PlantData.js`, `ITEMS` from `../data/ItemData.js`, `SHOPS` from `../data/ShopData.js` (seed defaults only)

- [ ] **Step 1: Create `useFarmDataStore.js`**

```js
// src/stores/useFarmDataStore.js
import { create } from 'zustand'

export const useFarmDataStore = create((set) => ({
  plants: {},
  items: {},
  shops: {},
  setPlants: (plants) => set({ plants }),
  setItems: (items) => set({ items }),
  setShops: (shops) => set({ shops }),
}))
```

- [ ] **Step 2: Write failing tests for `farmDataSync.js`**

```js
// src/lib/farmDataSync.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFarmDataStore } from '../stores/useFarmDataStore'
import { PLANTS } from '../data/PlantData'
import { ITEMS } from '../data/ItemData'
import { SHOPS } from '../data/ShopData'

// Mock Firestore
const mockSetDoc = vi.fn()
const mockGetDocs = vi.fn()
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, name) => ({ _name: name })),
  getDocs: (...a) => mockGetDocs(...a),
  doc: vi.fn((col, id) => ({ _col: col, _id: id })),
  setDoc: (...a) => mockSetDoc(...a),
}))
vi.mock('../firebase.js', () => ({ db: {} }))

function makeSnap(records) {
  return { empty: records.length === 0, docs: records.map(([id, data]) => ({ id, data: () => data })) }
}

beforeEach(() => {
  vi.clearAllMocks()
  useFarmDataStore.setState({ plants: {}, items: {}, shops: {} })
})

describe('hydrateFarmDataFromFirestore', () => {
  it('seeds Firestore from JS defaults when all collections are empty', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([]))
    const { hydrateFarmDataFromFirestore } = await import('./farmDataSync')
    await hydrateFarmDataFromFirestore()
    // setDoc called for each plant, item, shop
    const plantCount = Object.keys(PLANTS).length
    const itemCount = Object.keys(ITEMS).length
    const shopCount = Object.keys(SHOPS).length
    expect(mockSetDoc).toHaveBeenCalledTimes(plantCount + itemCount + shopCount)
    // store populated with JS defaults
    expect(useFarmDataStore.getState().plants).toEqual(PLANTS)
    expect(useFarmDataStore.getState().items).toEqual(ITEMS)
    expect(useFarmDataStore.getState().shops).toEqual(SHOPS)
  })

  it('reads existing Firestore data without seeding when collections are non-empty', async () => {
    const firestorePlant = { id: 'turnip', name: 'หัวผักกาดแก้ไขแล้ว', stages: 4, growTime: [10, 20, 40], size: { w: 1, h: 1 }, yieldMin: 1, yieldMax: 3, spriteFrames: [0, 1, 2, 3] }
    mockGetDocs
      .mockResolvedValueOnce(makeSnap([['turnip', firestorePlant]]))  // farmPlants
      .mockResolvedValueOnce(makeSnap([['turnip_seed', ITEMS.turnip_seed]])) // farmItems
      .mockResolvedValueOnce(makeSnap([['seed_shop', SHOPS.seed_shop]]))      // farmShops
    const { hydrateFarmDataFromFirestore } = await import('./farmDataSync')
    await hydrateFarmDataFromFirestore()
    expect(mockSetDoc).not.toHaveBeenCalled()
    expect(useFarmDataStore.getState().plants.turnip.name).toBe('หัวผักกาดแก้ไขแล้ว')
  })

  it('seeds only the empty collections when some exist', async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeSnap([['turnip', PLANTS.turnip]]))  // farmPlants non-empty
      .mockResolvedValueOnce(makeSnap([]))                           // farmItems empty
      .mockResolvedValueOnce(makeSnap([['seed_shop', SHOPS.seed_shop]])) // farmShops non-empty
    const { hydrateFarmDataFromFirestore } = await import('./farmDataSync')
    await hydrateFarmDataFromFirestore()
    // only ITEMS seeded
    const itemCount = Object.keys(ITEMS).length
    expect(mockSetDoc).toHaveBeenCalledTimes(itemCount)
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```
npm test src/lib/farmDataSync.test.js
```
Expected: FAIL — `Cannot find module './farmDataSync'`

- [ ] **Step 4: Create `farmDataSync.js`**

```js
// src/lib/farmDataSync.js
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useFarmDataStore } from '../stores/useFarmDataStore.js'
import { PLANTS } from '../data/PlantData.js'
import { ITEMS } from '../data/ItemData.js'
import { SHOPS } from '../data/ShopData.js'

async function seedIfEmpty(colName, defaults, snap) {
  if (!snap.empty) return snap
  await Promise.all(
    Object.entries(defaults).map(([id, data]) => setDoc(doc(collection(db, colName), id), data))
  )
  return null // signal: use JS defaults
}

export async function hydrateFarmDataFromFirestore() {
  const [plantsSnap, itemsSnap, shopsSnap] = await Promise.all([
    getDocs(collection(db, 'farmPlants')),
    getDocs(collection(db, 'farmItems')),
    getDocs(collection(db, 'farmShops')),
  ])

  const plantsNull = await seedIfEmpty('farmPlants', PLANTS, plantsSnap)
  const itemsNull  = await seedIfEmpty('farmItems',  ITEMS,  itemsSnap)
  const shopsNull  = await seedIfEmpty('farmShops',  SHOPS,  shopsSnap)

  useFarmDataStore.getState().setPlants(
    plantsNull === null ? PLANTS : Object.fromEntries(plantsSnap.docs.map(d => [d.id, d.data()]))
  )
  useFarmDataStore.getState().setItems(
    itemsNull === null ? ITEMS : Object.fromEntries(itemsSnap.docs.map(d => [d.id, d.data()]))
  )
  useFarmDataStore.getState().setShops(
    shopsNull === null ? SHOPS : Object.fromEntries(shopsSnap.docs.map(d => [d.id, d.data()]))
  )
}
```

- [ ] **Step 5: Run tests**

```
npm test src/lib/farmDataSync.test.js
```
Expected: 3 tests pass

- [ ] **Step 6: Commit**

```
git add src/stores/useFarmDataStore.js src/lib/farmDataSync.js src/lib/farmDataSync.test.js
git commit -m "feat: useFarmDataStore + farmDataSync with auto-seed from JS defaults"
```

---

## Task 2: Parameterise `farmLogic.js` (keep JS fallback during migration)

**Files:**
- Modify: `src/systems/farmLogic.js`
- Modify: `src/systems/farmLogic.test.js`

**Interfaces:**
- Produces (new signatures — callers from Task 3 onward must pass `plants`):
  - `occupiedTiles(x, y, plantId, plants)` → `Array<{x,y}>`
  - `canPlant(plots, x, y, plantId, farmTiles, plants)` → `{ ok: bool, reason?: string }`
  - `currentStage(plantedAt, plantId, now, plants)` → `0..3`
  - `isReady(plantedAt, plantId, now, plants)` → `boolean`
  - `rollYield(plantId, rng, plants)` → `number`
  - `tileKey`, `resolveAnchor` — unchanged
- `plants` defaults to the JS `PLANTS` import so pre-Task-3 callers continue to work

- [ ] **Step 1: Update `farmLogic.js`**

Replace the entire file:

```js
// src/systems/farmLogic.js
// Pure helpers for the farm. Growth is derived from plantedAt — no stored stage.
// `plants` parameter falls back to the JS default during the Firestore migration.
// Once all callers pass the store value explicitly (Task 3), the fallback import
// can be removed.
import { PLANTS as PLANTS_FALLBACK } from '../data/PlantData.js'

export const tileKey = (x, y) => `${x}_${y}`

export function occupiedTiles(x, y, plantId, plants) {
  const p = plants ?? PLANTS_FALLBACK
  const plant = p[plantId]
  if (!plant) return []
  const tiles = []
  for (let dy = 0; dy < plant.size.h; dy++) {
    for (let dx = 0; dx < plant.size.w; dx++) {
      tiles.push({ x: x + dx, y: y + dy })
    }
  }
  return tiles
}

export function canPlant(plots, x, y, plantId, farmTiles, plants) {
  const p = plants ?? PLANTS_FALLBACK
  if (!p[plantId]) return { ok: false, reason: 'ไม่รู้จักพืชนี้' }
  for (const t of occupiedTiles(x, y, plantId, p)) {
    const k = tileKey(t.x, t.y)
    if (plots[k]) return { ok: false, reason: 'มีพืชอยู่แล้ว' }
    if (farmTiles && !farmTiles.has(k)) return { ok: false, reason: 'นอกแปลงดิน' }
  }
  return { ok: true }
}

export function resolveAnchor(plots, x, y) {
  const k = tileKey(x, y)
  const plot = plots[k]
  return plot && plot.anchorKey ? plot.anchorKey : k
}

function cumulativeThresholds(plant) {
  const out = []
  let acc = 0
  for (const t of plant.growTime) { acc += t; out.push(acc) }
  return out
}

export function currentStage(plantedAt, plantId, now, plants) {
  const p = plants ?? PLANTS_FALLBACK
  const plant = p[plantId]
  if (!plant) return 0
  const elapsedSec = (now - plantedAt) / 1000
  let stage = 0
  for (const mark of cumulativeThresholds(plant)) {
    if (elapsedSec >= mark) stage++
  }
  return Math.min(stage, 3)
}

export function isReady(plantedAt, plantId, now, plants) {
  return currentStage(plantedAt, plantId, now, plants) >= 3
}

export function rollYield(plantId, rng, plants) {
  const p = plants ?? PLANTS_FALLBACK
  const plant = p[plantId]
  if (!plant) return 0
  const span = plant.yieldMax - plant.yieldMin + 1
  return plant.yieldMin + Math.floor(rng() * span)
}
```

- [ ] **Step 2: Update `farmLogic.test.js` — pass explicit `PLANTS` to all calls**

Replace the import line and update every call:

```js
import { describe, it, expect } from 'vitest'
import { tileKey, occupiedTiles, canPlant, currentStage, isReady, rollYield, resolveAnchor } from './farmLogic'
import { PLANTS } from '../data/PlantData'

const SECOND = 1000

describe('farmLogic', () => {
  it('builds a stable tile key', () => {
    expect(tileKey(5, 3)).toBe('5_3')
  })

  it('lists every tile a multi-tile plant occupies', () => {
    expect(occupiedTiles(6, 4, 'pumpkin', PLANTS)).toEqual([
      { x: 6, y: 4 }, { x: 7, y: 4 }, { x: 6, y: 5 }, { x: 7, y: 5 },
    ])
  })

  it('returns empty array for unknown plantId', () => {
    expect(occupiedTiles(0, 0, 'banana', PLANTS)).toEqual([])
  })

  it('rejects planting on an occupied tile', () => {
    const plots = { '5_3': { plantId: 'turnip', plantedAt: 0, tileX: 5, tileY: 3 } }
    expect(canPlant(plots, 5, 3, 'carrot', undefined, PLANTS)).toEqual({ ok: false, reason: 'มีพืชอยู่แล้ว' })
  })

  it('rejects an unknown plant', () => {
    expect(canPlant({}, 0, 0, 'banana', undefined, PLANTS)).toEqual({ ok: false, reason: 'ไม่รู้จักพืชนี้' })
  })

  it('allows planting on a free tile', () => {
    expect(canPlant({}, 5, 3, 'turnip', undefined, PLANTS)).toEqual({ ok: true })
  })

  it('computes deterministic stage from elapsed time', () => {
    const t0 = 1_000_000
    expect(currentStage(t0, 'turnip', t0, PLANTS)).toBe(0)
    expect(currentStage(t0, 'turnip', t0 + 15 * SECOND, PLANTS)).toBe(1)
    expect(currentStage(t0, 'turnip', t0 + 45 * SECOND, PLANTS)).toBe(2)
    expect(currentStage(t0, 'turnip', t0 + 105 * SECOND, PLANTS)).toBe(3)
    expect(currentStage(t0, 'turnip', t0 + 999 * SECOND, PLANTS)).toBe(3)
  })

  it('reports readiness only at stage 3', () => {
    const t0 = 0
    expect(isReady(t0, 'turnip', t0 + 104 * SECOND, PLANTS)).toBe(false)
    expect(isReady(t0, 'turnip', t0 + 105 * SECOND, PLANTS)).toBe(true)
  })

  it('rolls a yield within the plant range using injected rng', () => {
    expect(rollYield('turnip', () => 0, PLANTS)).toBe(1)
    expect(rollYield('turnip', () => 0.99, PLANTS)).toBe(3)
  })
})

describe('farmLogic FarmGround + anchor', () => {
  const farm = new Set(['5_3', '6_4', '7_4', '6_5', '7_5'])

  it('rejects planting when any occupied tile is off FarmGround', () => {
    expect(canPlant({}, 5, 3, 'pumpkin', farm, PLANTS)).toEqual({ ok: false, reason: 'นอกแปลงดิน' })
  })

  it('allows pumpkin when all 4 tiles are on FarmGround', () => {
    expect(canPlant({}, 6, 4, 'pumpkin', farm, PLANTS)).toEqual({ ok: true })
  })

  it('resolveAnchor returns the anchor key for a satellite tile', () => {
    const plots = {
      '6_4': { plantId: 'pumpkin', plantedAt: 0, tileX: 6, tileY: 4 },
      '7_4': { anchorKey: '6_4' }, '6_5': { anchorKey: '6_4' }, '7_5': { anchorKey: '6_4' },
    }
    expect(resolveAnchor(plots, 7, 4)).toBe('6_4')
    expect(resolveAnchor(plots, 6, 4)).toBe('6_4')
  })
})
```

- [ ] **Step 3: Run tests**

```
npm test src/systems/farmLogic.test.js
```
Expected: all tests pass (fallback keeps existing callers working)

- [ ] **Step 4: Run full suite to confirm no regression**

```
npm test
```
Expected: all 274+ tests pass

- [ ] **Step 5: Commit**

```
git add src/systems/farmLogic.js src/systems/farmLogic.test.js
git commit -m "refactor: farmLogic functions accept explicit plants param (fallback to JS during migration)"
```

---

## Task 3: Wire all callers to `useFarmDataStore`

**Files:**
- Modify: `src/systems/farmActions.js`
- Modify: `src/systems/farmActions.test.js`
- Modify: `src/stores/useFarmStore.js`
- Modify: `src/stores/useInventoryStore.js`
- Modify: `src/game/worldScenes.js`
- Modify: `src/components/GameCanvas.jsx`
- Modify: `src/services/sessionBootstrap.js`

**Interfaces:**
- Consumes: `useFarmDataStore` from Task 1, `farmLogic` from Task 2
- After this task: JS `PlantData.js`, `ItemData.js`, `ShopData.js` are used only by `farmDataSync.js` for seeding

- [ ] **Step 1: Update `farmActions.js`**

Replace the `ITEMS`/`PLANTS` imports and update every usage:

```js
// src/systems/farmActions.js
import { useInventoryStore } from '../stores/useInventoryStore.js'
import { useFarmStore } from '../stores/useFarmStore.js'
import { useFarmDataStore } from '../stores/useFarmDataStore.js'
import { canPlant, resolveAnchor, isReady, occupiedTiles, tileKey } from './farmLogic.js'
import { notify } from './NotificationSystem.js'
import { sound } from './SoundManager.js'

function fits(inv, itemId, count) {
  const { items } = useFarmDataStore.getState()
  const stackMax = items[itemId]?.stackMax ?? 99
  let capacity = 0
  for (const slot of [...inv.hotbar, ...inv.storage]) {
    if (slot === null) capacity += stackMax
    else if (slot.itemId === itemId) capacity += stackMax - slot.count
    if (capacity >= count) return true
  }
  return capacity >= count
}

export function plantSeed({ tileX, tileY, seedItemId, farmTiles }) {
  const { items, plants } = useFarmDataStore.getState()
  const item = items[seedItemId]
  if (!item || item.type !== 'seed') return { ok: false, reason: 'ไม่ใช่เมล็ด' }
  const plantId = item.plantId
  const inv = useInventoryStore.getState()
  if (!inv.hasItem(seedItemId, 1)) {
    notify.error?.('ไม่มีเมล็ด')
    return { ok: false, reason: 'ไม่มีเมล็ด' }
  }
  const plots = useFarmStore.getState().plots
  const check = canPlant(plots, tileX, tileY, plantId, farmTiles, plants)
  if (!check.ok) { notify.error?.(check.reason); return check }
  inv.removeItem(seedItemId, 1)
  const planted = useFarmStore.getState().plant(tileX, tileY, plantId)
  if (!planted) { inv.addItem(seedItemId, 1); return { ok: false, reason: 'ปลูกไม่สำเร็จ' } }
  notify.planted?.()
  sound.playPlant?.()
  return { ok: true }
}

export function harvestAt({ tileX, tileY }) {
  const { plants } = useFarmDataStore.getState()
  const farm = useFarmStore.getState()
  const anchorKey = resolveAnchor(farm.plots, tileX, tileY)
  const [ax, ay] = anchorKey.split('_').map(Number)
  const plot = farm.plots[anchorKey]
  if (!plot || plot.anchorKey) return { ok: false, reason: 'ไม่มีพืช' }
  if (!isReady(plot.plantedAt, plot.plantId, Date.now(), plants)) return { ok: false, reason: 'ยังไม่พร้อม' }
  const inv = useInventoryStore.getState()
  const yieldItem = plot.plantId
  if (!fits(inv, yieldItem, 1)) { notify.inventoryFull(); return { ok: false, reason: 'กระเป๋าเต็ม' } }
  const result = farm.harvest(ax, ay)
  if (!result) return { ok: false, reason: 'harvest failed' }
  inv.addItem(result.itemId, result.count)
  notify.harvested?.()
  sound.playHarvest?.()
  return { ok: true, ...result }
}
```

- [ ] **Step 2: Update `farmActions.test.js` — seed `useFarmDataStore` in `beforeEach`**

Add import and `useFarmDataStore` setup:

```js
// src/systems/farmActions.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { useInventoryStore } from '../stores/useInventoryStore'
import { useFarmStore } from '../stores/useFarmStore'
import { useFarmDataStore } from '../stores/useFarmDataStore'
import { PLANTS } from '../data/PlantData'
import { ITEMS } from '../data/ItemData'
import { plantSeed, harvestAt } from './farmActions'

const farm = new Set(['5_3'])

beforeEach(() => {
  useFarmDataStore.setState({ plants: PLANTS, items: ITEMS, shops: {} })
  useInventoryStore.setState({ hotbar: Array(8).fill(null), storage: Array(30).fill(null), gold: 100 })
  useFarmStore.setState({ plotsByMap: {}, currentMapKey: 'test2', plots: {} })
})
// test bodies unchanged
```

- [ ] **Step 3: Update `useFarmStore.js`** — pass plants from `useFarmDataStore` to farmLogic calls

```js
// src/stores/useFarmStore.js
import { create } from 'zustand'
import { tileKey, occupiedTiles, canPlant, isReady, rollYield } from '../systems/farmLogic.js'
import { useFarmDataStore } from './useFarmDataStore.js'

const plotsFor = (plotsByMap, key) => (key && plotsByMap[key]) || {}

export const useFarmStore = create((set, get) => ({
  plotsByMap: {},
  currentMapKey: null,
  plots: {},

  setCurrentMapKey: (key) =>
    set((s) => ({ currentMapKey: key, plots: plotsFor(s.plotsByMap, key) })),

  setPlotsByMap: (obj) =>
    set((s) => ({ plotsByMap: obj, plots: plotsFor(obj, s.currentMapKey) })),

  plant: (x, y, plantId) => {
    const s = get()
    const key = s.currentMapKey
    if (!key) return false
    const plots = plotsFor(s.plotsByMap, key)
    const { plants } = useFarmDataStore.getState()
    if (!canPlant(plots, x, y, plantId, undefined, plants).ok) return false

    const anchorKey = tileKey(x, y)
    const next = { ...plots, [anchorKey]: { plantId, plantedAt: Date.now(), tileX: x, tileY: y } }
    for (const t of occupiedTiles(x, y, plantId, plants)) {
      const k = tileKey(t.x, t.y)
      if (k !== anchorKey) next[k] = { anchorKey }
    }
    set({ plotsByMap: { ...s.plotsByMap, [key]: next }, plots: next })
    return true
  },

  harvest: (x, y, rng = Math.random) => {
    const s = get()
    const key = s.currentMapKey
    if (!key) return null
    const plots = plotsFor(s.plotsByMap, key)
    const plot = plots[tileKey(x, y)]
    if (!plot || plot.anchorKey) return null
    const { plants } = useFarmDataStore.getState()
    if (!isReady(plot.plantedAt, plot.plantId, Date.now(), plants)) return null

    const count = rollYield(plot.plantId, rng, plants)
    const next = { ...plots }
    for (const t of occupiedTiles(x, y, plot.plantId, plants)) delete next[tileKey(t.x, t.y)]
    set({ plotsByMap: { ...s.plotsByMap, [key]: next }, plots: next })
    return { itemId: plot.plantId, count }
  },
}))
```

- [ ] **Step 4: Update `useInventoryStore.js`** — replace `ITEMS` import

```js
// src/stores/useInventoryStore.js
import { create } from 'zustand'
import { addToSlots, removeFromSlots, countInSlots } from '../systems/inventoryLogic.js'

const HOTBAR_SIZE = 8
const STORAGE_SIZE = 30

function getItem(itemId) {
  // Lazy import to avoid circular dependency during store init
  return require('../stores/useFarmDataStore.js').useFarmDataStore.getState().items[itemId] ?? null
}

export const useInventoryStore = create((set, get) => ({
  hotbar: Array(HOTBAR_SIZE).fill(null),
  storage: Array(STORAGE_SIZE).fill(null),
  gold: 100,

  countItem: (itemId) =>
    countInSlots(get().hotbar, itemId) + countInSlots(get().storage, itemId),

  hasItem: (itemId, count = 1) => get().countItem(itemId) >= count,

  addItem: (itemId, count = 1) => {
    const item = getItem(itemId)
    if (!item) return false
    const stackMax = item.stackMax
    const h = addToSlots(get().hotbar, itemId, count, stackMax)
    let storage = get().storage
    let remaining = h.remaining
    if (remaining > 0) {
      const s = addToSlots(storage, itemId, remaining, stackMax)
      storage = s.slots
      remaining = s.remaining
    }
    set({ hotbar: h.slots, storage })
    return remaining === 0
  },

  removeItem: (itemId, count = 1) => {
    if (!get().hasItem(itemId, count)) return false
    const h = removeFromSlots(get().hotbar, itemId, count)
    let storage = get().storage
    if (h.removed < count) {
      const s = removeFromSlots(storage, itemId, count - h.removed)
      storage = s.slots
    }
    set({ hotbar: h.slots, storage })
    return true
  },

  addGold: (amount) => set((s) => ({ gold: s.gold + amount })),
  removeGold: (amount) => {
    if (get().gold < amount) return false
    set((s) => ({ gold: s.gold - amount }))
    return true
  },
  hasGold: (amount) => get().gold >= amount,
}))
```

> **Note:** `require(...)` is used for the lazy circular-dependency pattern. If the bundler complains, import `useFarmDataStore` at the top and guard with `?? null` — Vite handles circular ESM imports at runtime.

Alternative (cleaner, no `require`): import at top level. Vite resolves circular ESM lazily at call time, not at import time:

```js
import { useFarmDataStore } from './useFarmDataStore.js'
// Then in addItem: const item = useFarmDataStore.getState().items[itemId] ?? null
```

Use the top-level import approach. Remove the `getItem` helper entirely.

- [ ] **Step 5: Update `worldScenes.js`** — replace `PLANTS` import

At the top of `src/game/worldScenes.js`, remove:
```js
import { PLANTS } from '../data/PlantData'
```

Add:
```js
import { useFarmDataStore } from '../stores/useFarmDataStore'
```

In `_renderCrops(mapScale)`, replace every `PLANTS` reference:
```js
_renderCrops(mapScale) {
  this._cropGroup?.clear(true, true)
  if (!this.textures.exists('crops')) return
  const plots = useFarmStore.getState().plots
  const { plants } = useFarmDataStore.getState()
  const now = Date.now()
  Object.entries(plots).forEach(([key, plot]) => {
    if (plot.anchorKey) return
    const plant = plants[plot.plantId]
    if (!plant) return
    const stage = currentStage(plot.plantedAt, plot.plantId, now, plants)
    const frame = plant.spriteFrames?.[stage] ?? 0
    // ... rest of sprite placement unchanged
  })
}
```

Also update every other `currentStage` / `isReady` call in worldScenes.js to pass `plants`:
```js
// wherever currentStage is called in the scene:
const { plants } = useFarmDataStore.getState()
currentStage(plot.plantedAt, plot.plantId, Date.now(), plants)
```

- [ ] **Step 6: Update `GameCanvas.jsx`** — replace `ITEMS` / `getShop` with store subscriptions

Remove:
```js
import { ITEMS } from '../data/ItemData'
import { getShop } from '../data/ShopData'
```

Add:
```js
import { useFarmDataStore } from '../stores/useFarmDataStore'
```

Add subscriptions near other store subscriptions:
```js
const farmItems = useFarmDataStore((s) => s.items)
const farmShops = useFarmDataStore((s) => s.shops)
```

Replace every `ITEMS[...]` with `farmItems[...]` and `getShop(shopState?.shopId)` / `getShop(shopState.shopId)` with `farmShops[shopState?.shopId]` throughout the file.

- [ ] **Step 7: Update `sessionBootstrap.js`** — add farm data hydration early

```js
// Add import at top:
import { hydrateFarmDataFromFirestore } from '../lib/farmDataSync.js'

// In bootstrapSession(), add as the FIRST try/catch block (before user coins):
try {
  await hydrateFarmDataFromFirestore()
} catch (e) {
  console.error('[sessionBootstrap] hydrate farm data failed:', e)
}
```

- [ ] **Step 8: Run full test suite**

```
npm test
```
Expected: all tests pass (farmActions.test.js now seeds useFarmDataStore in beforeEach)

- [ ] **Step 9: Commit**

```
git add src/systems/farmActions.js src/systems/farmActions.test.js \
        src/stores/useFarmStore.js src/stores/useInventoryStore.js \
        src/game/worldScenes.js src/components/GameCanvas.jsx \
        src/services/sessionBootstrap.js
git commit -m "refactor: wire all callers to useFarmDataStore (replace static PLANTS/ITEMS/SHOPS imports)"
```

---

## Task 4: Firestore rules + admin constants

**Files:**
- Modify: `firestore.rules`
- Modify: `src/constants/admin.js`
- Modify: `src/pages/AdminPage.jsx`

**Interfaces:**
- After this task: the 'farm' tab appears in the admin nav for `o.korawitt@gmail.com`; Firestore allows authenticated reads and super-admin writes

- [ ] **Step 1: Add rules to `firestore.rules`**

Find the end of the `match /databases/{database}/documents {` block and add before the closing `}`:

```
match /farmPlants/{plantId} {
  allow read: if request.auth != null;
  allow write: if isSuperAdmin();
}
match /farmItems/{itemId} {
  allow read: if request.auth != null;
  allow write: if isSuperAdmin();
}
match /farmShops/{shopId} {
  allow read: if request.auth != null;
  allow write: if isSuperAdmin();
}
```

- [ ] **Step 2: Update `src/constants/admin.js`**

```js
export const ADMIN_SECTIONS = ['analytics', 'users', 'characters', 'maps', 'assets', 'music', 'shop', 'finance', 'welcome', 'farm']

export const ADMIN_ROLES = {
  'o.korawitt@gmail.com': ['analytics', 'users', 'characters', 'maps', 'assets', 'music', 'shop', 'finance', 'welcome', 'farm'],
  'takadaoni07@gmail.com': ['maps', 'assets'],
  'play198725@gmail.com': ['characters'],
  'itcity9476@gmail.com': ['music'],
}
```

- [ ] **Step 3: Wire `FarmDataSection` into `AdminPage.jsx`**

Add import:
```js
import FarmDataSection from '../components/admin/FarmDataSection'
```

Add to `ALL_TABS` array (find where it's defined, add entry):
```js
{ id: 'farm', label: '🌱 Farm Data' },
```

Add render line alongside the other tab renders:
```js
{tab === 'farm' && <FarmDataSection />}
```

- [ ] **Step 4: Run full suite**

```
npm test
```
Expected: all tests pass

- [ ] **Step 5: Commit**

```
git add firestore.rules src/constants/admin.js src/pages/AdminPage.jsx
git commit -m "feat: add farm admin tab + Firestore rules for farmPlants/farmItems/farmShops"
```

---

## Task 5: Admin `FarmDataSection` UI — three tabs

**Files:**
- Create: `src/components/admin/FarmDataSection.jsx`
- Create: `src/components/admin/FarmShopsTab.jsx`
- Create: `src/components/admin/FarmItemsTab.jsx`
- Create: `src/components/admin/FarmPlantsTab.jsx`

**Interfaces:**
- Consumes: `useFarmDataStore` (reads + refreshes after writes), Firestore `collection` / `doc` / `setDoc` / `deleteDoc`, Firebase `storage` + `getDownloadURL` (frame picker), `useToast` from `./Toast`
- The three tabs call Firestore directly and then call `useFarmDataStore.getState().set*()` to refresh in-memory state

- [ ] **Step 1: Create `FarmDataSection.jsx`**

```jsx
// src/components/admin/FarmDataSection.jsx
import { useState } from 'react'
import FarmShopsTab from './FarmShopsTab'
import FarmItemsTab from './FarmItemsTab'
import FarmPlantsTab from './FarmPlantsTab'

const TABS = [
  { id: 'shops',  label: '🏪 Shops'  },
  { id: 'items',  label: '📦 Items'  },
  { id: 'plants', label: '🌱 Plants' },
]

export default function FarmDataSection() {
  const [tab, setTab] = useState('shops')
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Farm Data</h2>
        <p className="text-sm text-gray-500 mt-0.5">จัดการพืช ไอเทม และร้านค้าในเกม</p>
      </div>
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'shops'  && <FarmShopsTab />}
      {tab === 'items'  && <FarmItemsTab />}
      {tab === 'plants' && <FarmPlantsTab />}
    </div>
  )
}
```

- [ ] **Step 2: Create `FarmShopsTab.jsx`**

```jsx
// src/components/admin/FarmShopsTab.jsx
import { useState } from 'react'
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useFarmDataStore } from '../../stores/useFarmDataStore'
import { useToast } from './Toast'

const EMPTY_SHOP = { id: '', name: '', buysType: 'produce', sells: [] }

export default function FarmShopsTab() {
  const shops = useFarmDataStore((s) => s.shops)
  const items = useFarmDataStore((s) => s.items)
  const [editing, setEditing] = useState(null) // null | 'new' | shopId string
  const [form, setForm] = useState(EMPTY_SHOP)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const openNew = () => { setForm(EMPTY_SHOP); setEditing('new') }
  const openEdit = (shop) => { setForm({ ...shop }); setEditing(shop.id) }
  const close = () => { setEditing(null); setForm(EMPTY_SHOP) }
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addSellRow = () => patch('sells', [...form.sells, { itemId: '', price: 0 }])
  const removeSellRow = (i) => patch('sells', form.sells.filter((_, idx) => idx !== i))
  const patchSellRow = (i, k, v) => {
    const next = [...form.sells]
    next[i] = { ...next[i], [k]: v }
    patch('sells', next)
  }

  const handleSave = async () => {
    const id = editing === 'new' ? form.id.trim() : editing
    if (!id) { toast?.error('กรุณาใส่ Shop ID'); return }
    if (!form.name.trim()) { toast?.error('กรุณาใส่ชื่อร้าน'); return }
    const invalidRow = form.sells.find(r => !r.itemId || r.price < 0)
    if (invalidRow) { toast?.error('ตรวจสอบรายการขายให้ครบ'); return }
    const payload = {
      id,
      name: form.name.trim(),
      buysType: form.buysType || null,
      sells: form.sells.map(r => ({ itemId: r.itemId, price: Number(r.price) })),
    }
    setSaving(true)
    try {
      await setDoc(doc(collection(db, 'farmShops'), id), payload)
      useFarmDataStore.getState().setShops({ ...useFarmDataStore.getState().shops, [id]: payload })
      toast?.success('บันทึกแล้ว')
      close()
    } catch (e) {
      toast?.error('บันทึกไม่สำเร็จ: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (shopId) => {
    if (!window.confirm(`ลบร้าน "${shopId}"?`)) return
    try {
      await deleteDoc(doc(db, 'farmShops', shopId))
      const next = { ...useFarmDataStore.getState().shops }
      delete next[shopId]
      useFarmDataStore.getState().setShops(next)
      toast?.success('ลบแล้ว')
      if (editing === shopId) close()
    } catch (e) {
      toast?.error('ลบไม่สำเร็จ: ' + e.message)
    }
  }

  const itemOptions = Object.values(items)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{Object.keys(shops).length} ร้าน</p>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90"
        >
          + ร้านใหม่
        </button>
      </div>

      {editing && (
        <div className="rounded-2xl border-2 border-brand/30 bg-white p-5 shadow-sm space-y-4">
          <p className="font-semibold text-gray-800">{editing === 'new' ? '➕ ร้านใหม่' : `✏️ แก้ไข ${editing}`}</p>

          {editing === 'new' && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Shop ID (ต้องตรงกับ shopId ใน Tiled)</span>
              <input
                value={form.id}
                onChange={(e) => patch('id', e.target.value)}
                placeholder="เช่น seed_shop"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono"
              />
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">ชื่อร้าน</span>
            <input
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
              placeholder="เช่น ร้านเมล็ดพันธุ์"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">รับซื้อ</span>
            <select
              value={form.buysType ?? ''}
              onChange={(e) => patch('buysType', e.target.value || null)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">ไม่รับซื้อ</option>
              <option value="produce">รับซื้อ produce ทั้งหมด</option>
            </select>
          </label>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 font-semibold">รายการขาย</span>
              <button onClick={addSellRow} className="text-xs text-brand hover:underline">+ เพิ่มรายการ</button>
            </div>
            {form.sells.length === 0 && (
              <p className="text-xs text-gray-400 py-2">ยังไม่มีรายการขาย</p>
            )}
            {form.sells.map((row, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <select
                  value={row.itemId}
                  onChange={(e) => patchSellRow(i, 'itemId', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">เลือกไอเทม</option>
                  {itemOptions.map(it => (
                    <option key={it.id} value={it.id}>{it.name} ({it.id})</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={row.price}
                  onChange={(e) => patchSellRow(i, 'price', e.target.value)}
                  placeholder="ราคา"
                  className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
                />
                <span className="text-xs text-gray-400">gold</span>
                <button onClick={() => removeSellRow(i)} className="text-xs text-rose-500 hover:underline">ลบ</button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={close} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">ยกเลิก</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {Object.values(shops).length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">ยังไม่มีร้าน</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ID</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ชื่อ</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">รายการขาย</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">รับซื้อ</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.values(shops).map((shop) => (
                <tr key={shop.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{shop.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{shop.name}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{shop.sells?.length ?? 0} รายการ</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{shop.buysType ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => openEdit(shop)} className="text-xs text-brand hover:underline">แก้ไข</button>
                      <button onClick={() => handleDelete(shop.id)} className="text-xs text-rose-500 hover:underline">ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `FarmItemsTab.jsx`**

```jsx
// src/components/admin/FarmItemsTab.jsx
import { useState } from 'react'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useFarmDataStore } from '../../stores/useFarmDataStore'
import { useToast } from './Toast'

const ITEM_TYPES = ['seed', 'produce']
const EMPTY = { id: '', name: '', type: 'seed', plantId: '', buyPrice: 0, sellPrice: 0, stackMax: 99, iconIndex: 0 }

export default function FarmItemsTab() {
  const items = useFarmDataStore((s) => s.items)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const openNew = () => { setForm(EMPTY); setEditing('new') }
  const openEdit = (item) => { setForm({ ...item }); setEditing(item.id) }
  const close = () => { setEditing(null); setForm(EMPTY) }
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const id = editing === 'new' ? form.id.trim() : editing
    if (!id) { toast?.error('กรุณาใส่ Item ID'); return }
    if (!form.name.trim()) { toast?.error('กรุณาใส่ชื่อไอเทม'); return }
    const payload = {
      id,
      name: form.name.trim(),
      type: form.type,
      plantId: form.type === 'seed' ? form.plantId.trim() : '',
      buyPrice: Number(form.buyPrice),
      sellPrice: Number(form.sellPrice),
      stackMax: Number(form.stackMax) || 99,
      iconIndex: Number(form.iconIndex) || 0,
    }
    setSaving(true)
    try {
      await setDoc(doc(db, 'farmItems', id), payload)
      useFarmDataStore.getState().setItems({ ...useFarmDataStore.getState().items, [id]: payload })
      toast?.success('บันทึกแล้ว')
      close()
    } catch (e) {
      toast?.error('บันทึกไม่สำเร็จ: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (itemId) => {
    if (!window.confirm(`ลบไอเทม "${itemId}"?`)) return
    try {
      await deleteDoc(doc(db, 'farmItems', itemId))
      const next = { ...useFarmDataStore.getState().items }
      delete next[itemId]
      useFarmDataStore.getState().setItems(next)
      toast?.success('ลบแล้ว')
      if (editing === itemId) close()
    } catch (e) {
      toast?.error('ลบไม่สำเร็จ: ' + e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{Object.keys(items).length} ไอเทม</p>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90">+ ไอเทมใหม่</button>
      </div>

      {editing && (
        <div className="rounded-2xl border-2 border-brand/30 bg-white p-5 shadow-sm space-y-4">
          <p className="font-semibold text-gray-800">{editing === 'new' ? '➕ ไอเทมใหม่' : `✏️ แก้ไข ${editing}`}</p>
          <div className="grid grid-cols-2 gap-4">
            {editing === 'new' && (
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-xs text-gray-500">Item ID</span>
                <input value={form.id} onChange={e => patch('id', e.target.value)} placeholder="เช่น turnip_seed" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono" />
              </label>
            )}
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-xs text-gray-500">ชื่อ</span>
              <input value={form.name} onChange={e => patch('name', e.target.value)} placeholder="เช่น เมล็ดผักกาด" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ประเภท</span>
              <select value={form.type} onChange={e => patch('type', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {form.type === 'seed' && (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">Plant ID</span>
                <input value={form.plantId} onChange={e => patch('plantId', e.target.value)} placeholder="เช่น turnip" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono" />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ราคาซื้อกลาง (buyPrice)</span>
              <input type="number" value={form.buyPrice} onChange={e => patch('buyPrice', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ราคาขาย (sellPrice)</span>
              <input type="number" value={form.sellPrice} onChange={e => patch('sellPrice', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">stackMax</span>
              <input type="number" value={form.stackMax} onChange={e => patch('stackMax', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">iconIndex</span>
              <input type="number" value={form.iconIndex} onChange={e => patch('iconIndex', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={close} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {Object.values(items).length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">ยังไม่มีไอเทม</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ID</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ชื่อ</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">ประเภท</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold">buyPrice</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold">sellPrice</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.values(items).map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{item.type}</span></td>
                  <td className="px-4 py-3 text-right text-brand-strong">{item.buyPrice}</td>
                  <td className="px-4 py-3 text-right text-accent-pink">{item.sellPrice}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => openEdit(item)} className="text-xs text-brand hover:underline">แก้ไข</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-rose-500 hover:underline">ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `FarmPlantsTab.jsx`** (includes visual frame picker)

`Basic_Plants.png` is 96 × 32 px = **6 columns × 2 rows** of 16 × 16 px frames. The picker renders each frame scaled 4× (64 × 64 px visible cell).

```jsx
// src/components/admin/FarmPlantsTab.jsx
import { useState, useEffect } from 'react'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebase'
import { useFarmDataStore } from '../../stores/useFarmDataStore'
import { useToast } from './Toast'

const SHEET_COLS = 6
const SHEET_ROWS = 2
const FRAME_PX = 16
const SCALE = 4          // 16px → 64px display
const TOTAL_FRAMES = SHEET_COLS * SHEET_ROWS  // 12

const STAGE_LABELS = ['Stage 0 (สด)', 'Stage 1', 'Stage 2', 'Stage 3 (พร้อมเก็บ)']

function FramePicker({ frameIndex, onChange, imgUrl }) {
  if (!imgUrl) return <div className="text-xs text-gray-400 py-4">กำลังโหลด sprite sheet...</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SHEET_COLS}, ${FRAME_PX * SCALE}px)`, gap: 2 }}>
      {Array.from({ length: TOTAL_FRAMES }, (_, i) => {
        const col = i % SHEET_COLS
        const row = Math.floor(i / SHEET_COLS)
        const selected = frameIndex === i
        return (
          <div
            key={i}
            onClick={() => onChange(i)}
            title={`Frame ${i}`}
            style={{
              width: FRAME_PX * SCALE,
              height: FRAME_PX * SCALE,
              backgroundImage: `url(${imgUrl})`,
              backgroundPosition: `-${col * FRAME_PX * SCALE}px -${row * FRAME_PX * SCALE}px`,
              backgroundSize: `${SHEET_COLS * FRAME_PX * SCALE}px ${SHEET_ROWS * FRAME_PX * SCALE}px`,
              imageRendering: 'pixelated',
              cursor: 'pointer',
              border: selected ? '3px solid #7c3aed' : '3px solid transparent',
              borderRadius: 4,
            }}
          />
        )
      })}
    </div>
  )
}

const EMPTY_PLANT = {
  id: '', name: '', seedKey: '', stages: 4,
  growTime: [15, 30, 60],
  size: { w: 1, h: 1 },
  yieldMin: 1, yieldMax: 3,
  spriteFrames: [0, 1, 2, 3],
}

export default function FarmPlantsTab() {
  const plants = useFarmDataStore((s) => s.plants)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_PLANT)
  const [saving, setSaving] = useState(false)
  const [imgUrl, setImgUrl] = useState(null)
  const [activeStage, setActiveStage] = useState(0) // which stage frame is being picked
  const toast = useToast()

  useEffect(() => {
    getDownloadURL(ref(storage, 'sprites/objects/Basic_Plants.png'))
      .then(setImgUrl)
      .catch(() => setImgUrl('/assets/sprites/Objects/Basic_Plants.png'))
  }, [])

  const openNew = () => { setForm(EMPTY_PLANT); setEditing('new'); setActiveStage(0) }
  const openEdit = (plant) => {
    setForm({
      ...plant,
      growTime: plant.growTime ?? [15, 30, 60],
      spriteFrames: plant.spriteFrames ?? [0, 1, 2, 3],
    })
    setEditing(plant.id)
    setActiveStage(0)
  }
  const close = () => { setEditing(null); setForm(EMPTY_PLANT) }
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const patchGrowTime = (i, v) => {
    const next = [...form.growTime]
    next[i] = Number(v)
    patch('growTime', next)
  }

  const patchSpriteFrame = (stage, frameIndex) => {
    const next = [...form.spriteFrames]
    next[stage] = frameIndex
    patch('spriteFrames', next)
  }

  const handleSave = async () => {
    const id = editing === 'new' ? form.id.trim() : editing
    if (!id) { toast?.error('กรุณาใส่ Plant ID'); return }
    if (!form.name.trim()) { toast?.error('กรุณาใส่ชื่อพืช'); return }
    const payload = {
      id,
      name: form.name.trim(),
      seedKey: form.seedKey.trim(),
      stages: 4,
      growTime: form.growTime.map(Number),
      size: { w: Number(form.size.w) || 1, h: Number(form.size.h) || 1 },
      yieldMin: Number(form.yieldMin),
      yieldMax: Number(form.yieldMax),
      spriteFrames: form.spriteFrames.map(Number),
    }
    setSaving(true)
    try {
      await setDoc(doc(db, 'farmPlants', id), payload)
      useFarmDataStore.getState().setPlants({ ...useFarmDataStore.getState().plants, [id]: payload })
      toast?.success('บันทึกแล้ว')
      close()
    } catch (e) {
      toast?.error('บันทึกไม่สำเร็จ: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (plantId) => {
    if (!window.confirm(`ลบพืช "${plantId}"?`)) return
    try {
      await deleteDoc(doc(db, 'farmPlants', plantId))
      const next = { ...useFarmDataStore.getState().plants }
      delete next[plantId]
      useFarmDataStore.getState().setPlants(next)
      toast?.success('ลบแล้ว')
      if (editing === plantId) close()
    } catch (e) {
      toast?.error('ลบไม่สำเร็จ: ' + e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{Object.keys(plants).length} พืช</p>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90">+ พืชใหม่</button>
      </div>

      {editing && (
        <div className="rounded-2xl border-2 border-brand/30 bg-white p-5 shadow-sm space-y-5">
          <p className="font-semibold text-gray-800">{editing === 'new' ? '➕ พืชใหม่' : `✏️ แก้ไข ${editing}`}</p>
          <div className="grid grid-cols-2 gap-4">
            {editing === 'new' && (
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-xs text-gray-500">Plant ID</span>
                <input value={form.id} onChange={e => patch('id', e.target.value)} placeholder="เช่น turnip" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono" />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ชื่อ</span>
              <input value={form.name} onChange={e => patch('name', e.target.value)} placeholder="เช่น หัวผักกาด" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Seed Item ID</span>
              <input value={form.seedKey} onChange={e => patch('seedKey', e.target.value)} placeholder="เช่น turnip_seed" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Yield Min</span>
              <input type="number" value={form.yieldMin} onChange={e => patch('yieldMin', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Yield Max</span>
              <input type="number" value={form.yieldMax} onChange={e => patch('yieldMax', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Size W (tiles)</span>
              <input type="number" min={1} value={form.size.w} onChange={e => patch('size', { ...form.size, w: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Size H (tiles)</span>
              <input type="number" min={1} value={form.size.h} onChange={e => patch('size', { ...form.size, h: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold mb-2">Grow Time (seconds ต่อ stage)</p>
            <div className="flex gap-2">
              {form.growTime.map((t, i) => (
                <label key={i} className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">stage {i}→{i+1}</span>
                  <input type="number" value={t} onChange={e => patchGrowTime(i, e.target.value)} className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand focus:outline-none" />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold mb-2">Sprite Frames — คลิกเลือก frame สำหรับแต่ละ stage</p>
            <div className="flex gap-2 mb-3">
              {STAGE_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStage(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    activeStage === i ? 'border-brand bg-brand/10 text-brand' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {label} → frame {form.spriteFrames[i] ?? '?'}
                </button>
              ))}
            </div>
            <FramePicker
              frameIndex={form.spriteFrames[activeStage]}
              onChange={(idx) => { patchSpriteFrame(activeStage, idx); if (activeStage < 3) setActiveStage(s => s + 1) }}
              imgUrl={imgUrl}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={close} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {Object.values(plants).length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">ยังไม่มีพืช</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ID</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ชื่อ</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">ขนาด</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">Yield</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.values(plants).map(plant => (
                <tr key={plant.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{plant.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{plant.name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{plant.size?.w}×{plant.size?.h}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{plant.yieldMin}–{plant.yieldMax}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => openEdit(plant)} className="text-xs text-brand hover:underline">แก้ไข</button>
                      <button onClick={() => handleDelete(plant.id)} className="text-xs text-rose-500 hover:underline">ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run full test suite + build**

```
npm test
```
Expected: all tests pass

```
npm run build
```
Expected: build clean (no type errors, no missing imports)

- [ ] **Step 6: Manual smoke test**

1. `npm run dev` → navigate to `/admin`
2. เลือก tab "🌱 Farm Data" → เห็น 3 sub-tabs
3. **Shops tab:** เห็น `seed_shop` ปรากฏ (auto-seeded from JS defaults) → กด "แก้ไข" → เปลี่ยนราคา turnip_seed → บันทึก → เห็นราคาใหม่ใน table
4. **Items tab:** เห็น 8 ไอเทม → เพิ่มไอเทมใหม่ → บันทึก
5. **Plants tab:** เห็น 4 พืช → เลือก "turnip" → แก้ไข → เลือก stage frame ด้วย visual picker → บันทึก
6. Refresh page → เข้า `/home` → เดินเข้า shop zone ใน test2 → ShopUI แสดงราคาที่แก้ไขแล้ว

- [ ] **Step 7: Commit**

```
git add src/components/admin/FarmDataSection.jsx \
        src/components/admin/FarmShopsTab.jsx \
        src/components/admin/FarmItemsTab.jsx \
        src/components/admin/FarmPlantsTab.jsx
git commit -m "feat: Farm Data admin section — Shops / Items / Plants tabs with visual frame picker"
```

---

## Verification Checklist

- [ ] `npm test` — all tests pass (including updated farmLogic + farmActions tests)
- [ ] `npm run build` — build clean
- [ ] Admin dashboard `/admin` shows "🌱 Farm Data" tab for super-admin
- [ ] Shops tab: auto-seeded `seed_shop` appears; price edit saves to Firestore and reflects in `ShopUI` after next login
- [ ] Items tab: CRUD works; new item appears in Shops tab dropdown
- [ ] Plants tab: frame picker loads `Basic_Plants.png` from Firebase Storage; selecting a frame auto-advances to next stage
- [ ] Game: enter shop zone → `ShopUI` prices come from Firestore (confirm by changing a price in admin and reloading)
- [ ] `useUserStore.coins` untouched — farm shop only mutates `useInventoryStore.gold`
- [ ] Second user (visitor) sees correct shop prices — they read from same `farmShops` collection
