# Sprout Quest Farm Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the farming code generated this session with the existing Personal Map system — replacing the parallel/orphaned infrastructure with Zustand stores + pure logic helpers + Firestore sync that match the codebase's established patterns.

**Architecture:** Farm and inventory state become Zustand stores (source of truth), mirroring `useWorldStore`. Crop growth is **deterministic from `plantedAt`** (no tick loop, no stored stage), so visitors compute the correct stage locally. Persistence reuses `createFirestoreSync`: inventory + farm-gold → `users/{uid}`, farm plots → `maps/{uid}` (visible to visitors, owner-only writes). The class-based `InventorySystem`/`FarmSystem` algorithms are extracted into pure, unit-tested helper modules.

**Tech Stack:** React 19, Zustand 5, Firebase Firestore (`firebase@12`), Vitest 4.

## Global Constraints

- **No TypeScript** — `.js`/`.jsx` only, no type annotations.
- **Stores:** `camelCase.js` in `src/stores/`, factory `create(...)`, setters are verbs.
- **Selector pattern:** consumers read `useXStore((s) => s.field)`.
- **Firestore writes are debounced** via `createFirestoreSync` — never force synchronous writes.
- **Farm gold is NOT coins.** `useUserStore.coins` is server-authoritative real currency (Cloud Functions + PromptPay) and must never be written by farm code.
- **Tests:** colocated `name.test.js`, Vitest, `import { describe, it, expect } from 'vitest'`.
- **Deploy stays Vercel** (`vercel.json`) — do not introduce Firebase Hosting.
- Run a single test file with: `npx vitest run <path>`. Full suite: `npm run test`.

## Scope

This plan covers the **map-independent foundation** — fully unit-testable now. The **Phaser scene integration** (parsing the friend's Tiled `FarmZones`/`Shops`/`Chests` object layers, rendering crop sprites, the stand-on-tile Action button, wiring `SeedPicker`/`ShopUI`/`StorageUI`) depends on the unseen map and becomes a **follow-up plan** once the map arrives. The UI panels (`Hotbar`, `SeedPicker`, `ShopUI`, `StorageUI`), `DayNightSystem/Overlay`, `NotificationSystem/Container`, `SoundManager`, and all `data/*` files are kept as-is and consumed by that follow-up plan.

## File Structure

- **Delete:** `src/services/FirebaseService.js` (orphaned `/rooms` model, conflicts with ADR-0002), `src/systems/SaveSystem.js` (localStorage; replaced by syncManager), `src/components/Joystick.jsx` (scene already has joystick via registry `controlMode`).
- **Create:** `src/systems/inventoryLogic.js` (+ test), `src/systems/farmLogic.js` (+ test), `src/stores/useInventoryStore.js` (+ test), `src/stores/useFarmStore.js` (+ test).
- **Modify:** `src/lib/syncManager.js` (add `inventorySync`, `farmSync`, extend `visitMap`/`returnHome`), `src/services/sessionBootstrap.js` (hydrate/arm new stores), `src/components/GameCanvas.jsx` (plumb `setCurrentMapKey` into the farm store).
- **Keep (no change):** `src/systems/InventorySystem.js`, `src/systems/FarmSystem.js`, `src/systems/ShopSystem.js` remain on disk for reference but are no longer imported by app code; the live logic is in the new `*Logic.js` modules + stores. (Removing the three classes is optional cleanup, deferred so this plan stays focused.)

---

### Task 1: Remove orphaned / conflicting modules

**Files:**
- Delete: `src/services/FirebaseService.js`
- Delete: `src/systems/SaveSystem.js`
- Delete: `src/components/Joystick.jsx`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. (Verification step confirms no other module imports these.)

- [ ] **Step 1: Confirm nothing imports the three files**

Run:
```bash
grep -rng "FirebaseService\|SaveSystem\|components/Joystick\|from './Joystick'\|from '../components/Joystick'" src --include=*.js --include=*.jsx
```
Expected: no matches (empty output). If any match appears, STOP — a consumer exists and must be handled before deletion.

- [ ] **Step 2: Delete the files**

```bash
git rm src/services/FirebaseService.js src/systems/SaveSystem.js src/components/Joystick.jsx
```

- [ ] **Step 3: Verify the build is still clean**

Run: `npm run build`
Expected: build completes with no "module not found" / unresolved-import errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove orphaned FirebaseService/SaveSystem/Joystick (conflict with existing presence + sync patterns)"
```

---

### Task 2: Pure inventory logic helpers

**Files:**
- Create: `src/systems/inventoryLogic.js`
- Test: `src/systems/inventoryLogic.test.js`

**Interfaces:**
- Consumes: nothing (pure; operates on plain slot arrays where a slot is `null | { itemId, count }`).
- Produces:
  - `countInSlots(slots, itemId) → number`
  - `addToSlots(slots, itemId, count, stackMax) → { slots, remaining }` (immutable; returns a new array)
  - `removeFromSlots(slots, itemId, count) → { slots, removed }` (immutable)

- [ ] **Step 1: Write the failing test**

```js
// src/systems/inventoryLogic.test.js
import { describe, it, expect } from 'vitest'
import { countInSlots, addToSlots, removeFromSlots } from './inventoryLogic'

describe('inventoryLogic', () => {
  it('counts matching items across slots', () => {
    const slots = [{ itemId: 'turnip_seed', count: 5 }, null, { itemId: 'turnip_seed', count: 2 }]
    expect(countInSlots(slots, 'turnip_seed')).toBe(7)
    expect(countInSlots(slots, 'carrot_seed')).toBe(0)
  })

  it('stacks into an existing matching slot up to stackMax', () => {
    const slots = [{ itemId: 'turnip_seed', count: 95 }, null]
    const { slots: next, remaining } = addToSlots(slots, 'turnip_seed', 10, 99)
    expect(next[0]).toEqual({ itemId: 'turnip_seed', count: 99 })
    expect(next[1]).toEqual({ itemId: 'turnip_seed', count: 6 })
    expect(remaining).toBe(0)
  })

  it('does not mutate the input array', () => {
    const slots = [null]
    addToSlots(slots, 'turnip_seed', 1, 99)
    expect(slots[0]).toBeNull()
  })

  it('reports remaining when slots are full', () => {
    const slots = [{ itemId: 'turnip_seed', count: 99 }]
    const { remaining } = addToSlots(slots, 'turnip_seed', 5, 99)
    expect(remaining).toBe(5)
  })

  it('removes across slots and clears emptied slots to null', () => {
    const slots = [{ itemId: 'turnip_seed', count: 3 }, { itemId: 'turnip_seed', count: 4 }]
    const { slots: next, removed } = removeFromSlots(slots, 'turnip_seed', 5)
    expect(removed).toBe(5)
    expect(next[0]).toBeNull()
    expect(next[1]).toEqual({ itemId: 'turnip_seed', count: 2 })
  })

  it('reports partial removal when not enough present', () => {
    const slots = [{ itemId: 'turnip_seed', count: 2 }]
    const { removed } = removeFromSlots(slots, 'turnip_seed', 5)
    expect(removed).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/systems/inventoryLogic.test.js`
Expected: FAIL — cannot resolve `./inventoryLogic`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/inventoryLogic.js
// Pure, immutable helpers for slot-based inventory.
// A slot is `null` or `{ itemId, count }`. No imports.

export function countInSlots(slots, itemId) {
  let total = 0
  for (const slot of slots) {
    if (slot && slot.itemId === itemId) total += slot.count
  }
  return total
}

// Add `count` of itemId into a fresh copy of `slots`, respecting stackMax.
// Returns { slots, remaining }; remaining > 0 means the slots filled up.
export function addToSlots(slots, itemId, count, stackMax) {
  const next = slots.map((s) => (s ? { ...s } : null))
  let remaining = count

  for (let i = 0; i < next.length && remaining > 0; i++) {
    const slot = next[i]
    if (slot && slot.itemId === itemId) {
      const canAdd = stackMax - slot.count
      if (canAdd > 0) {
        const add = Math.min(remaining, canAdd)
        slot.count += add
        remaining -= add
      }
    }
  }

  for (let i = 0; i < next.length && remaining > 0; i++) {
    if (next[i] === null) {
      const add = Math.min(remaining, stackMax)
      next[i] = { itemId, count: add }
      remaining -= add
    }
  }

  return { slots: next, remaining }
}

// Remove `count` of itemId from a fresh copy of `slots`.
// Returns { slots, removed }; removed < count means not enough were present.
export function removeFromSlots(slots, itemId, count) {
  const next = slots.map((s) => (s ? { ...s } : null))
  let toRemove = count

  for (let i = 0; i < next.length && toRemove > 0; i++) {
    const slot = next[i]
    if (slot && slot.itemId === itemId) {
      const take = Math.min(toRemove, slot.count)
      slot.count -= take
      toRemove -= take
      if (slot.count === 0) next[i] = null
    }
  }

  return { slots: next, removed: count - toRemove }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/systems/inventoryLogic.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/inventoryLogic.js src/systems/inventoryLogic.test.js
git commit -m "feat: pure inventory slot logic (stack/remove/count)"
```

---

### Task 3: Pure farm logic helpers (deterministic growth)

**Files:**
- Create: `src/systems/farmLogic.js`
- Test: `src/systems/farmLogic.test.js`

**Interfaces:**
- Consumes: `PLANTS` from `src/data/PlantData.js` (each plant: `{ growTime:[s,s,s], size:{w,h}, yieldMin, yieldMax }`).
- Produces:
  - `tileKey(x, y) → "x_y"`
  - `occupiedTiles(x, y, plantId) → [{x,y}, ...]`
  - `canPlant(plots, x, y, plantId) → { ok, reason? }` (`plots` is `{ [tileKey]: plot }`)
  - `currentStage(plantedAt, plantId, now) → 0..3`
  - `isReady(plantedAt, plantId, now) → boolean`
  - `rollYield(plantId, rng) → number` (`rng: () => [0,1)`)

- [ ] **Step 1: Write the failing test**

```js
// src/systems/farmLogic.test.js
import { describe, it, expect } from 'vitest'
import { tileKey, occupiedTiles, canPlant, currentStage, isReady, rollYield } from './farmLogic'

// turnip growTime = [15, 30, 60] seconds → reaches stage1@15s, stage2@45s, stage3@105s
const SECOND = 1000

describe('farmLogic', () => {
  it('builds a stable tile key', () => {
    expect(tileKey(5, 3)).toBe('5_3')
  })

  it('lists every tile a multi-tile plant occupies', () => {
    expect(occupiedTiles(6, 4, 'pumpkin')).toEqual([
      { x: 6, y: 4 }, { x: 7, y: 4 }, { x: 6, y: 5 }, { x: 7, y: 5 },
    ])
  })

  it('rejects planting on an occupied tile', () => {
    const plots = { '5_3': { plantId: 'turnip', plantedAt: 0, tileX: 5, tileY: 3 } }
    expect(canPlant(plots, 5, 3, 'carrot')).toEqual({ ok: false, reason: 'มีพืชอยู่แล้ว' })
  })

  it('rejects an unknown plant', () => {
    expect(canPlant({}, 0, 0, 'banana')).toEqual({ ok: false, reason: 'ไม่รู้จักพืชนี้' })
  })

  it('allows planting on a free tile', () => {
    expect(canPlant({}, 5, 3, 'turnip')).toEqual({ ok: true })
  })

  it('computes deterministic stage from elapsed time', () => {
    const t0 = 1_000_000
    expect(currentStage(t0, 'turnip', t0)).toBe(0)
    expect(currentStage(t0, 'turnip', t0 + 15 * SECOND)).toBe(1)
    expect(currentStage(t0, 'turnip', t0 + 45 * SECOND)).toBe(2)
    expect(currentStage(t0, 'turnip', t0 + 105 * SECOND)).toBe(3)
    expect(currentStage(t0, 'turnip', t0 + 999 * SECOND)).toBe(3) // capped
  })

  it('reports readiness only at stage 3', () => {
    const t0 = 0
    expect(isReady(t0, 'turnip', t0 + 104 * SECOND)).toBe(false)
    expect(isReady(t0, 'turnip', t0 + 105 * SECOND)).toBe(true)
  })

  it('rolls a yield within the plant range using injected rng', () => {
    // turnip yieldMin=1, yieldMax=3 → span 3
    expect(rollYield('turnip', () => 0)).toBe(1)
    expect(rollYield('turnip', () => 0.99)).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/systems/farmLogic.test.js`
Expected: FAIL — cannot resolve `./farmLogic`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/farmLogic.js
// Pure helpers for the farm. Growth is derived from plantedAt — no stored stage.
import { PLANTS } from '../data/PlantData.js'

export const tileKey = (x, y) => `${x}_${y}`

export function occupiedTiles(x, y, plantId) {
  const plant = PLANTS[plantId]
  const tiles = []
  for (let dy = 0; dy < plant.size.h; dy++) {
    for (let dx = 0; dx < plant.size.w; dx++) {
      tiles.push({ x: x + dx, y: y + dy })
    }
  }
  return tiles
}

export function canPlant(plots, x, y, plantId) {
  if (!PLANTS[plantId]) return { ok: false, reason: 'ไม่รู้จักพืชนี้' }
  for (const t of occupiedTiles(x, y, plantId)) {
    if (plots[tileKey(t.x, t.y)]) return { ok: false, reason: 'มีพืชอยู่แล้ว' }
  }
  return { ok: true }
}

// Cumulative seconds required to REACH each stage (1..3).
function cumulativeThresholds(plant) {
  const out = []
  let acc = 0
  for (const t of plant.growTime) {
    acc += t
    out.push(acc)
  }
  return out
}

// Deterministic stage 0..3 (3 = ready) from plantedAt.
export function currentStage(plantedAt, plantId, now) {
  const plant = PLANTS[plantId]
  const elapsedSec = (now - plantedAt) / 1000
  let stage = 0
  for (const mark of cumulativeThresholds(plant)) {
    if (elapsedSec >= mark) stage++
  }
  return Math.min(stage, 3)
}

export function isReady(plantedAt, plantId, now) {
  return currentStage(plantedAt, plantId, now) >= 3
}

// rng: () => [0,1). Injected so callers/tests stay deterministic.
export function rollYield(plantId, rng) {
  const plant = PLANTS[plantId]
  const span = plant.yieldMax - plant.yieldMin + 1
  return plant.yieldMin + Math.floor(rng() * span)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/systems/farmLogic.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/farmLogic.js src/systems/farmLogic.test.js
git commit -m "feat: pure farm logic with deterministic plantedAt-based growth"
```

---

### Task 4: Inventory store

**Files:**
- Create: `src/stores/useInventoryStore.js`
- Test: `src/stores/useInventoryStore.test.js`

**Interfaces:**
- Consumes: `ITEMS` from `src/data/ItemData.js` (each item: `{ stackMax, type, sellPrice, ... }`); `addToSlots/removeFromSlots/countInSlots` from `src/systems/inventoryLogic.js`.
- Produces a Zustand store with state `{ hotbar: Array(8), storage: Array(30), gold: 100 }` and actions/selectors:
  - `countItem(itemId) → number`, `hasItem(itemId, count=1) → boolean`
  - `addItem(itemId, count=1) → boolean` (hotbar first, then storage; false if full)
  - `removeItem(itemId, count=1) → boolean` (hotbar first, then storage)
  - `addGold(amount) → void`, `removeGold(amount) → boolean`, `hasGold(amount) → boolean`

- [ ] **Step 1: Write the failing test**

```js
// src/stores/useInventoryStore.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { useInventoryStore } from './useInventoryStore'

const reset = () =>
  useInventoryStore.setState({
    hotbar: Array(8).fill(null),
    storage: Array(30).fill(null),
    gold: 100,
  })

describe('useInventoryStore', () => {
  beforeEach(reset)

  it('adds items into the hotbar first', () => {
    const ok = useInventoryStore.getState().addItem('turnip_seed', 5)
    expect(ok).toBe(true)
    expect(useInventoryStore.getState().hotbar[0]).toEqual({ itemId: 'turnip_seed', count: 5 })
  })

  it('counts across hotbar and storage', () => {
    const s = useInventoryStore.getState()
    s.addItem('turnip_seed', 3)
    expect(useInventoryStore.getState().countItem('turnip_seed')).toBe(3)
    expect(useInventoryStore.getState().hasItem('turnip_seed', 3)).toBe(true)
    expect(useInventoryStore.getState().hasItem('turnip_seed', 4)).toBe(false)
  })

  it('removes items and frees slots', () => {
    const s = useInventoryStore.getState()
    s.addItem('turnip_seed', 5)
    expect(useInventoryStore.getState().removeItem('turnip_seed', 5)).toBe(true)
    expect(useInventoryStore.getState().hotbar[0]).toBeNull()
  })

  it('refuses to remove more than present', () => {
    expect(useInventoryStore.getState().removeItem('turnip_seed', 1)).toBe(false)
  })

  it('manages gold separately from coins', () => {
    const s = useInventoryStore.getState()
    s.addGold(50)
    expect(useInventoryStore.getState().gold).toBe(150)
    expect(useInventoryStore.getState().removeGold(200)).toBe(false)
    expect(useInventoryStore.getState().gold).toBe(150)
    expect(useInventoryStore.getState().removeGold(150)).toBe(true)
    expect(useInventoryStore.getState().gold).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useInventoryStore.test.js`
Expected: FAIL — cannot resolve `./useInventoryStore`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/stores/useInventoryStore.js
import { create } from 'zustand'
import { ITEMS } from '../data/ItemData.js'
import { addToSlots, removeFromSlots, countInSlots } from '../systems/inventoryLogic.js'

const HOTBAR_SIZE = 8
const STORAGE_SIZE = 30

export const useInventoryStore = create((set, get) => ({
  hotbar: Array(HOTBAR_SIZE).fill(null),
  storage: Array(STORAGE_SIZE).fill(null),
  gold: 100,

  countItem: (itemId) =>
    countInSlots(get().hotbar, itemId) + countInSlots(get().storage, itemId),

  hasItem: (itemId, count = 1) => get().countItem(itemId) >= count,

  // Fill the hotbar first, overflow into storage. Returns true if all placed.
  addItem: (itemId, count = 1) => {
    const item = ITEMS[itemId]
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/useInventoryStore.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stores/useInventoryStore.js src/stores/useInventoryStore.test.js
git commit -m "feat: useInventoryStore (hotbar/storage/farm-gold) over pure logic"
```

---

### Task 5: Farm store (per-map plots)

**Files:**
- Create: `src/stores/useFarmStore.js`
- Test: `src/stores/useFarmStore.test.js`

**Interfaces:**
- Consumes: `tileKey/occupiedTiles/canPlant/isReady/rollYield` from `src/systems/farmLogic.js`.
- Produces a Zustand store mirroring `useWorldStore`'s per-map shape:
  - State `{ plotsByMap: {}, currentMapKey: null, plots: {} }` where `plots` is the derived `plotsByMap[currentMapKey]`.
  - `setCurrentMapKey(key) → void`, `setPlotsByMap(obj) → void` (used by sync hydrate + visit).
  - `plant(x, y, plantId) → boolean` — anchor plot `{ plantId, plantedAt, tileX, tileY }`; extra tiles of a multi-tile plant store `{ anchorKey }`.
  - `harvest(x, y, rng=Math.random) → { itemId, count } | null` — only on a ready anchor; clears all occupied tiles.

- [ ] **Step 1: Write the failing test**

```js
// src/stores/useFarmStore.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { useFarmStore } from './useFarmStore'

const reset = () =>
  useFarmStore.setState({ plotsByMap: {}, currentMapKey: 'test3', plots: {} })

describe('useFarmStore', () => {
  beforeEach(reset)

  it('plants on a free tile and records plantedAt', () => {
    const ok = useFarmStore.getState().plant(5, 3, 'turnip')
    expect(ok).toBe(true)
    const plot = useFarmStore.getState().plots['5_3']
    expect(plot.plantId).toBe('turnip')
    expect(typeof plot.plantedAt).toBe('number')
  })

  it('refuses to plant on an occupied tile', () => {
    const s = useFarmStore.getState()
    s.plant(5, 3, 'turnip')
    expect(useFarmStore.getState().plant(5, 3, 'carrot')).toBe(false)
  })

  it('occupies all four tiles for a 2x2 plant with one anchor', () => {
    useFarmStore.getState().plant(6, 4, 'pumpkin')
    const plots = useFarmStore.getState().plots
    expect(plots['6_4'].plantId).toBe('pumpkin')
    expect(plots['7_4']).toEqual({ anchorKey: '6_4' })
    expect(plots['6_5']).toEqual({ anchorKey: '6_4' })
    expect(plots['7_5']).toEqual({ anchorKey: '6_4' })
  })

  it('does not harvest before ready', () => {
    useFarmStore.getState().plant(5, 3, 'turnip')
    expect(useFarmStore.getState().harvest(5, 3)).toBeNull()
  })

  it('harvests a ready plot, clears tiles, returns produce', () => {
    // Seed a turnip planted long ago so it is ready (turnip ready at 105s).
    const plantedAt = Date.now() - 200_000
    useFarmStore.setState({
      currentMapKey: 'test3',
      plotsByMap: { test3: { '5_3': { plantId: 'turnip', plantedAt, tileX: 5, tileY: 3 } } },
      plots: { '5_3': { plantId: 'turnip', plantedAt, tileX: 5, tileY: 3 } },
    })
    const result = useFarmStore.getState().harvest(5, 3, () => 0)
    expect(result).toEqual({ itemId: 'turnip', count: 1 }) // rng=0 → yieldMin
    expect(useFarmStore.getState().plots['5_3']).toBeUndefined()
  })

  it('keeps plots partitioned per map key', () => {
    useFarmStore.getState().plant(5, 3, 'turnip')
    useFarmStore.getState().setCurrentMapKey('indoor')
    expect(useFarmStore.getState().plots['5_3']).toBeUndefined()
    useFarmStore.getState().setCurrentMapKey('test3')
    expect(useFarmStore.getState().plots['5_3'].plantId).toBe('turnip')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useFarmStore.test.js`
Expected: FAIL — cannot resolve `./useFarmStore`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/stores/useFarmStore.js
import { create } from 'zustand'
import { tileKey, occupiedTiles, canPlant, isReady, rollYield } from '../systems/farmLogic.js'

const plotsFor = (plotsByMap, key) => (key && plotsByMap[key]) || {}

export const useFarmStore = create((set, get) => ({
  plotsByMap: {},
  currentMapKey: null,
  plots: {}, // derived = plotsByMap[currentMapKey] ?? {}

  setCurrentMapKey: (key) =>
    set((s) => ({ currentMapKey: key, plots: plotsFor(s.plotsByMap, key) })),

  setPlotsByMap: (obj) =>
    set((s) => ({ plotsByMap: obj, plots: plotsFor(obj, s.currentMapKey) })),

  plant: (x, y, plantId) => {
    const s = get()
    const key = s.currentMapKey
    if (!key) return false
    const plots = plotsFor(s.plotsByMap, key)
    if (!canPlant(plots, x, y, plantId).ok) return false

    const anchorKey = tileKey(x, y)
    const next = { ...plots, [anchorKey]: { plantId, plantedAt: Date.now(), tileX: x, tileY: y } }
    for (const t of occupiedTiles(x, y, plantId)) {
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
    if (!plot || plot.anchorKey) return null // empty or a non-anchor sub-tile
    if (!isReady(plot.plantedAt, plot.plantId, Date.now())) return null

    const count = rollYield(plot.plantId, rng)
    const next = { ...plots }
    for (const t of occupiedTiles(x, y, plot.plantId)) delete next[tileKey(t.x, t.y)]
    set({ plotsByMap: { ...s.plotsByMap, [key]: next }, plots: next })
    return { itemId: plot.plantId, count }
  },
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/useFarmStore.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stores/useFarmStore.js src/stores/useFarmStore.test.js
git commit -m "feat: useFarmStore (per-map plots) over deterministic farm logic"
```

---

### Task 6: Persistence wiring (syncManager + sessionBootstrap + map-key plumbing)

**Files:**
- Modify: `src/lib/syncManager.js` (add `inventorySync`, `farmSync`; extend `visitMap`/`returnHome`)
- Modify: `src/services/sessionBootstrap.js` (hydrate/arm inventory + farm on login; disarm on logout)
- Modify: `src/components/GameCanvas.jsx` (mirror `setCurrentMapKey` into `useFarmStore`)

**Interfaces:**
- Consumes: `createFirestoreSync` and `refs.map`/`refs.user` (already in `syncManager.js`); `useInventoryStore`, `useFarmStore`; `useWorldStore.getState().currentMapOwnerUid`.
- Produces exported names used by `sessionBootstrap.js`:
  - `hydrateInventoryFromFirestore(uid)`, `setInventorySyncUser(uid)`, `disarmInventorySync()`
  - `hydrateFarmFromFirestore(uid)`, `armFarmSync(uid)`, `disarmFarmSync()`
- Doc shapes: inventory → `users/{uid}` fields `{ inventory: { hotbar, storage }, farmGold }`; farm → `maps/{uid}` field `{ farm: plotsByMap }`.

- [ ] **Step 1: Add the two sync writers in `syncManager.js`**

Add the imports for the new stores at the top (next to the existing store imports):

```js
import { useInventoryStore } from '../stores/useInventoryStore'
import { useFarmStore } from '../stores/useFarmStore'
```

Then, immediately after the `mapSync` block (after the line `export const disarmMapSync = () => mapSync.setSyncUser(null)`), add:

```js
// ── Inventory + farm gold (owner-private) → users/{uid} ───────────────────────
const inventorySync = createFirestoreSync({
  store: useInventoryStore,
  logName: 'syncInventory',
  toDoc: ({ hotbar, storage, gold }) => ({
    inventory: { hotbar, storage },
    farmGold: gold,
    inventoryUpdatedAt: serverTimestamp(),
  }),
  fromDoc: (data) => {
    const updates = {}
    if (data.inventory) {
      updates.hotbar = data.inventory.hotbar ?? Array(8).fill(null)
      updates.storage = data.inventory.storage ?? Array(30).fill(null)
    }
    if (typeof data.farmGold === 'number') updates.gold = data.farmGold
    return updates
  },
  changed: (s, p) => s.hotbar !== p.hotbar || s.storage !== p.storage || s.gold !== p.gold,
  needsSeed: () => false,
})

export const hydrateInventoryFromFirestore = inventorySync.hydrate
export const setInventorySyncUser = inventorySync.setSyncUser
export const disarmInventorySync = () => inventorySync.setSyncUser(null)

// ── Farm plots (visitor-readable) → maps/{uid}; owner-only writes ─────────────
// guard mirrors mapSync: only debounce-write when viewing one's OWN map, so
// visiting a friend (which loads their plots into the store) never overwrites
// your own map doc.
const farmSync = createFirestoreSync({
  store: useFarmStore,
  logName: 'syncFarm',
  ref: refs.map,
  toDoc: ({ plotsByMap }) => ({ farm: plotsByMap, farmUpdatedAt: serverTimestamp() }),
  fromDoc: (data) => (data.farm ? { plotsByMap: data.farm } : {}),
  changed: (s, p) => s.plotsByMap !== p.plotsByMap,
  guard: (_s, uid) => useWorldStore.getState().currentMapOwnerUid === uid,
  needsSeed: () => false,
})

export const hydrateFarmFromFirestore = farmSync.hydrate
export const armFarmSync = farmSync.setSyncUser
export const disarmFarmSync = () => farmSync.setSyncUser(null)
```

- [ ] **Step 2: Extend `visitMap` / `returnHome` to load the visited farm**

In `syncManager.js`, replace the `visitMap` and `returnHome` bodies so they also reset + hydrate the farm store (inventory is owner-private and is NOT touched on visit):

```js
export async function visitMap(ownerUid) {
  if (!ownerUid) return
  useWorldStore.setState({ currentMapOwnerUid: ownerUid, objectsByMap: {}, mapObjects: [], editMode: false })
  useFarmStore.setState({ plotsByMap: {}, plots: {} })
  await hydrateMapFromFirestore(ownerUid)
  await hydrateFarmFromFirestore(ownerUid)
}

export async function returnHome(selfUid) {
  if (!selfUid) return
  useWorldStore.setState({ currentMapOwnerUid: selfUid, objectsByMap: {}, mapObjects: [], editMode: false })
  useFarmStore.setState({ plotsByMap: {}, plots: {} })
  await hydrateMapFromFirestore(selfUid)
  await hydrateFarmFromFirestore(selfUid)
}
```

- [ ] **Step 3: Hydrate + arm the new stores in `sessionBootstrap.js`**

Add to the import block from `'../lib/syncManager'`:

```js
  hydrateInventoryFromFirestore,
  setInventorySyncUser,
  disarmInventorySync,
  hydrateFarmFromFirestore,
  armFarmSync,
  disarmFarmSync,
```

In `bootstrapSession`, immediately after the existing map `try { ... armMapSync(uid) }` block, add:

```js
  try {
    await hydrateInventoryFromFirestore(uid)
    setInventorySyncUser(uid)
  } catch (e) {
    console.error('[sessionBootstrap] hydrate/arm inventory failed:', e)
  }

  try {
    await hydrateFarmFromFirestore(uid)
    armFarmSync(uid)
  } catch (e) {
    console.error('[sessionBootstrap] hydrate/arm farm failed:', e)
  }
```

In `teardownSession`, after `disarmMapSync()`, add:

```js
  disarmInventorySync()
  disarmFarmSync()
```

- [ ] **Step 4: Mirror the active map key into the farm store (`GameCanvas.jsx`)**

The farm store partitions plots by map key, so it must learn the active map alongside `useWorldStore`. Add the import:

```js
import { useFarmStore } from '../stores/useFarmStore'
```

Then, everywhere `GameCanvas.jsx` calls `useWorldStore.getState().setCurrentMapKey(<key>)` (the boot effect's `setCurrentMapKey(entryKey)` and the portal `mapChangeRequested` handler's `setCurrentMapKey(mapKey)`), add the parallel line right after it:

```js
useFarmStore.getState().setCurrentMapKey(entryKey) // boot effect — use mapKey in the portal handler
```

- [ ] **Step 5: Verify build + full test suite**

Run: `npm run build`
Expected: clean build, no unresolved imports.

Run: `npm run test`
Expected: the existing suite plus the 4 new test files all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/syncManager.js src/services/sessionBootstrap.js src/components/GameCanvas.jsx
git commit -m "feat: persist inventory to users/{uid} and farm to maps/{uid} via syncManager"
```

---

## Self-Review

- **Spec coverage:** Decisions 1–5 from the design map to tasks — owner-scoped farm + visitor read (Task 6 `farmSync` guard + `visitMap`), separate gold (Task 4 + `farmGold` field), Firestore persistence (Task 6), Zustand source of truth (Tasks 4–5), deterministic growth enabling read-only visitor view (Task 3). Conflict deletions = Task 1. The stand-on-tile interaction + scene rendering + UI panel wiring are explicitly the deferred follow-up plan (Scope section), not silently dropped.
- **Placeholder scan:** none — every code/test/command step is concrete.
- **Type consistency:** `plotsByMap`/`plots`/`currentMapKey` names match across `useFarmStore`, `farmSync`, and `visitMap`. `inventory: { hotbar, storage }` + `farmGold` match between `toDoc`/`fromDoc` and `useInventoryStore` state. `tileKey`/`occupiedTiles`/`isReady`/`rollYield` signatures are consistent between `farmLogic` and `useFarmStore`.

## Follow-up plan (after the friend's map arrives)

Write a second plan covering: register the new map in `mapConfigs`; parse Tiled `FarmZones`/`Shops`/`Chests` object layers in `worldScenes.js` (Portal pattern via `tiledMapMeta.js`); render crop sprites from `useFarmStore.plots` using `currentStage`; the stand-on-tile floating Action button; and wiring `SeedPicker`/`ShopUI`/`StorageUI` + `DayNightOverlay`/`NotificationContainer`/`sound` into `GameCanvas`. Multiplayer needs no new farm-sync — avatars come from `presence.js` and visitor crop views from `hydrateFarmFromFirestore` + deterministic growth.
