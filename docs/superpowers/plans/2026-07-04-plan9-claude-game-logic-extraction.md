# Architecture Improvement — Plan 9: Extract Shop/Inventory Actions (Claude Code)

**Goal:** Extract `GameCanvas.jsx`'s 6 inline farm-shop/inventory handlers (`handleBuy`, `handleSell`, `handleSellAll`, `handleMoveToStorage`, `handleMoveToHotbar`, `handleSwapSlots`) into two new pure-orchestration modules — `src/systems/shopActions.js` and `src/systems/inventoryActions.js` — following the exact template `src/systems/farmActions.js` already established for plant/harvest. This makes previously-untestable business logic (currently trapped in a `.jsx` component with zero test coverage) unit-testable, and is the concrete, safely-scoped part of the "give the Phaser scene a seam" backlog item. Plan 10 swaps `GameCanvas.jsx`'s handler bodies for calls into these modules — Cursor's job.

**Architecture:** Two new plain-`.js` modules, each mirroring `farmActions.js`: import the relevant Zustand stores, read via `getState()`, mutate via `setState()`/store actions, return the same `{ success, reason }` / `{ success, goldEarned }` / `{ success, totalEarned }` shapes GameCanvas's handlers already return (so `ShopUI`/`StorageUI`/`Hotbar` — the consumers — need no changes). Byte-for-byte behavior preservation; this is an extraction, not a redesign.

**Tech Stack:** Zustand 5, Vitest.

## Global Constraints

- **No TypeScript** — plain JS only.
- Preserve exact current behavior (including the `farmShops`/`shopState` parameterization pattern already used by `farmActions.js`'s `plantSeed({ ..., farmTiles })` — inject caller-known context as a parameter rather than having the action reach for component-local state).
- Don't touch `GameCanvas.jsx` in this plan — that's Plan 10.
- Verify with `npm test` after each file.

---

### Task 1: Create `src/systems/inventoryActions.js`

**Files:**
- Create: `src/systems/inventoryActions.js`
- Create: `src/systems/inventoryActions.test.js`

**Interfaces:**
- Produces: `moveToStorage(fromIndex)`, `moveToHotbar(fromIndex)`, `swapSlots(fromIndex, toIndex, isHotbarSwap)` — same signatures and behavior as `GameCanvas.jsx`'s current `handleMoveToStorage`/`handleMoveToHotbar`/`handleSwapSlots` (`src/components/GameCanvas.jsx:346-387`).
- Consumes: `useInventoryStore` (existing), `useFarmDataStore` (existing), `addToSlots` from `./inventoryLogic.js` (existing), `notify` from `./NotificationSystem.js` (existing).

- [ ] **Step 1: Write the failing test** — `src/systems/inventoryActions.test.js`, following `farmActions.test.js`'s exact style (real store fixtures via `setState`, no mocking):

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useInventoryStore } from '../stores/useInventoryStore'
import { useFarmDataStore } from '../stores/useFarmDataStore'
import { notify } from './NotificationSystem'
import { moveToStorage, moveToHotbar, swapSlots } from './inventoryActions'

beforeEach(() => {
  useFarmDataStore.setState({ items: { wheat: { stackMax: 10 } }, plants: {}, shops: {} })
  useInventoryStore.setState({
    hotbar: [{ itemId: 'wheat', count: 3 }, null, null, null, null, null, null, null],
    storage: Array(30).fill(null),
    gold: 0,
  })
  vi.spyOn(notify, 'inventoryFull').mockImplementation(() => {})
})

describe('moveToStorage', () => {
  it('moves a hotbar slot into the first empty storage slot', () => {
    moveToStorage(0)
    expect(useInventoryStore.getState().hotbar[0]).toBeNull()
    expect(useInventoryStore.getState().storage[0]).toEqual({ itemId: 'wheat', count: 3 })
  })

  it('does nothing on an empty hotbar slot', () => {
    moveToStorage(1)
    expect(useInventoryStore.getState().storage[0]).toBeNull()
  })

  it('notifies and leaves the hotbar untouched when storage is full', () => {
    useInventoryStore.setState({ storage: Array(30).fill({ itemId: 'wheat', count: 10 }) })
    moveToStorage(0)
    expect(notify.inventoryFull).toHaveBeenCalled()
    expect(useInventoryStore.getState().hotbar[0]).toEqual({ itemId: 'wheat', count: 3 })
  })
})

describe('moveToHotbar', () => {
  it('moves a storage slot into the first empty hotbar slot', () => {
    useInventoryStore.setState({
      hotbar: Array(8).fill(null),
      storage: [{ itemId: 'wheat', count: 5 }, ...Array(29).fill(null)],
    })
    moveToHotbar(0)
    expect(useInventoryStore.getState().storage[0]).toBeNull()
    expect(useInventoryStore.getState().hotbar[0]).toEqual({ itemId: 'wheat', count: 5 })
  })
})

describe('swapSlots', () => {
  it('swaps two hotbar slots', () => {
    useInventoryStore.setState({
      hotbar: [{ itemId: 'wheat', count: 3 }, { itemId: 'corn', count: 1 }, null, null, null, null, null, null],
    })
    swapSlots(0, 1, true)
    expect(useInventoryStore.getState().hotbar[0]).toEqual({ itemId: 'corn', count: 1 })
    expect(useInventoryStore.getState().hotbar[1]).toEqual({ itemId: 'wheat', count: 3 })
  })

  it('swaps two storage slots', () => {
    useInventoryStore.setState({
      storage: [{ itemId: 'wheat', count: 3 }, { itemId: 'corn', count: 1 }, ...Array(28).fill(null)],
    })
    swapSlots(0, 1, false)
    expect(useInventoryStore.getState().storage[0]).toEqual({ itemId: 'corn', count: 1 })
    expect(useInventoryStore.getState().storage[1]).toEqual({ itemId: 'wheat', count: 3 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/systems/inventoryActions.test.js`
Expected: FAIL — `Cannot find module './inventoryActions'`

- [ ] **Step 3: Write the implementation** — `src/systems/inventoryActions.js`:

```js
// src/systems/inventoryActions.js
// Orchestrates the inventory store for hotbar/storage slot management.
// Pure of React; reads live state via getState() so React handlers can call
// it directly. Extracted verbatim from GameCanvas.jsx's inline handlers.
import { useInventoryStore } from '../stores/useInventoryStore.js'
import { useFarmDataStore } from '../stores/useFarmDataStore.js'
import { addToSlots } from './inventoryLogic.js'
import { notify } from './NotificationSystem.js'

function stackMaxFor(itemId) {
  return useFarmDataStore.getState().items[itemId]?.stackMax ?? 99
}

export function moveToStorage(fromIndex) {
  const inv = useInventoryStore.getState()
  const slot = inv.hotbar[fromIndex]
  if (!slot) return
  const result = addToSlots(inv.storage, slot.itemId, slot.count, stackMaxFor(slot.itemId))
  if (result.remaining === 0) {
    const newHotbar = [...inv.hotbar]
    newHotbar[fromIndex] = null
    useInventoryStore.setState({ hotbar: newHotbar, storage: result.slots })
  } else {
    notify.inventoryFull()
  }
}

export function moveToHotbar(fromIndex) {
  const inv = useInventoryStore.getState()
  const slot = inv.storage[fromIndex]
  if (!slot) return
  const result = addToSlots(inv.hotbar, slot.itemId, slot.count, stackMaxFor(slot.itemId))
  if (result.remaining === 0) {
    const newStorage = [...inv.storage]
    newStorage[fromIndex] = null
    useInventoryStore.setState({ hotbar: result.slots, storage: newStorage })
  } else {
    notify.inventoryFull()
  }
}

export function swapSlots(fromIndex, toIndex, isHotbarSwap) {
  const inv = useInventoryStore.getState()
  if (isHotbarSwap) {
    const newHotbar = [...inv.hotbar]
    ;[newHotbar[fromIndex], newHotbar[toIndex]] = [newHotbar[toIndex], newHotbar[fromIndex]]
    useInventoryStore.setState({ hotbar: newHotbar })
  } else {
    const newStorage = [...inv.storage]
    ;[newStorage[fromIndex], newStorage[toIndex]] = [newStorage[toIndex], newStorage[fromIndex]]
    useInventoryStore.setState({ storage: newStorage })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/systems/inventoryActions.test.js`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add src/systems/inventoryActions.js src/systems/inventoryActions.test.js
git commit -m "feat: extract inventoryActions from GameCanvas (moveToStorage/moveToHotbar/swapSlots)"
```

---

### Task 2: Create `src/systems/shopActions.js`

**Files:**
- Create: `src/systems/shopActions.js`
- Create: `src/systems/shopActions.test.js`

**Interfaces:**
- Produces: `buyItem(farmShops, shopId, itemId, qty)`, `sellItem(itemId, count)`, `sellAllProduce()` — same behavior as `GameCanvas.jsx`'s current `handleBuy`/`handleSell`/`handleSellAll` (`src/components/GameCanvas.jsx:390-432`). `farmShops` is passed in (mirrors `farmActions.js`'s `plantSeed({ ..., farmTiles })` pattern — the action doesn't reach into component-local selector state itself).
- Consumes: `useInventoryStore` (existing), `useFarmDataStore` (existing).

- [ ] **Step 1: Write the failing test** — `src/systems/shopActions.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { useInventoryStore } from '../stores/useInventoryStore'
import { useFarmDataStore } from '../stores/useFarmDataStore'
import { buyItem, sellItem, sellAllProduce } from './shopActions'

const farmShops = {
  'shop-1': { sells: [{ itemId: 'seed_rice', price: 10 }] },
}

beforeEach(() => {
  useFarmDataStore.setState({
    items: {
      seed_rice: { type: 'seed' },
      rice: { type: 'produce', sellPrice: 5 },
      tomato: { type: 'produce', sellPrice: 8 },
    },
    plants: {},
    shops: {},
  })
  useInventoryStore.setState({ hotbar: Array(8).fill(null), storage: Array(30).fill(null), gold: 100 })
})

describe('buyItem', () => {
  it('deducts gold and adds the item when affordable', () => {
    const r = buyItem(farmShops, 'shop-1', 'seed_rice', 2)
    expect(r.success).toBe(true)
    expect(useInventoryStore.getState().gold).toBe(80)
    expect(useInventoryStore.getState().countItem('seed_rice')).toBe(2)
  })

  it('refuses when gold is insufficient', () => {
    useInventoryStore.setState({ gold: 5 })
    const r = buyItem(farmShops, 'shop-1', 'seed_rice', 2)
    expect(r.success).toBe(false)
    expect(useInventoryStore.getState().gold).toBe(5)
  })

  it('returns {} for an unknown shop', () => {
    expect(buyItem(farmShops, 'missing-shop', 'seed_rice', 1)).toEqual({})
  })
})

describe('sellItem', () => {
  it('removes the item and adds gold at sellPrice', () => {
    useInventoryStore.getState().addItem('rice', 3)
    const r = sellItem('rice', 3)
    expect(r.success).toBe(true)
    expect(r.goldEarned).toBe(15)
    expect(useInventoryStore.getState().gold).toBe(115)
    expect(useInventoryStore.getState().countItem('rice')).toBe(0)
  })
})

describe('sellAllProduce', () => {
  it('sells every produce-type slot and leaves non-produce items alone', () => {
    useInventoryStore.getState().addItem('rice', 2)
    useInventoryStore.getState().addItem('tomato', 1)
    useInventoryStore.getState().addItem('seed_rice', 4) // not produce — must survive
    const r = sellAllProduce()
    expect(r.success).toBe(true)
    expect(r.totalEarned).toBe(2 * 5 + 1 * 8)
    expect(useInventoryStore.getState().countItem('rice')).toBe(0)
    expect(useInventoryStore.getState().countItem('tomato')).toBe(0)
    expect(useInventoryStore.getState().countItem('seed_rice')).toBe(4)
  })

  it('refuses when there is nothing to sell', () => {
    expect(sellAllProduce()).toEqual({ success: false, reason: 'ไม่มีของขาย' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/systems/shopActions.test.js`
Expected: FAIL — `Cannot find module './shopActions'`

- [ ] **Step 3: Write the implementation** — `src/systems/shopActions.js`:

```js
// src/systems/shopActions.js
// Orchestrates the inventory store for shop buy/sell, returning the result
// shapes ShopUI already expects. Pure of React; reads live state via
// getState() so React handlers can call it directly. Extracted verbatim from
// GameCanvas.jsx's inline handlers.
import { useInventoryStore } from '../stores/useInventoryStore.js'
import { useFarmDataStore } from '../stores/useFarmDataStore.js'

export function buyItem(farmShops, shopId, itemId, qty) {
  const shop = farmShops[shopId]
  if (!shop) return {}
  const item = shop.sells.find((s) => s.itemId === itemId)
  if (!item) return {}
  const total = item.price * qty
  const inv = useInventoryStore.getState()
  if (!inv.hasGold(total)) return { success: false, reason: 'เงินไม่พอ' }
  inv.removeGold(total)
  inv.addItem(itemId, qty)
  return { success: true }
}

export function sellItem(itemId, count) {
  const inv = useInventoryStore.getState()
  const sellPrice = useFarmDataStore.getState().items[itemId]?.sellPrice ?? 0
  const goldEarned = sellPrice * count
  inv.removeItem(itemId, count)
  inv.addGold(goldEarned)
  return { success: true, goldEarned }
}

export function sellAllProduce() {
  const inv = useInventoryStore.getState()
  const { items } = useFarmDataStore.getState()
  const allSlots = [...inv.hotbar, ...inv.storage]
  let totalEarned = 0
  const sold = {}
  allSlots.forEach((slot) => {
    if (!slot) return
    if (items[slot.itemId]?.type === 'produce') {
      sold[slot.itemId] = (sold[slot.itemId] ?? 0) + slot.count
    }
  })
  if (Object.keys(sold).length === 0) return { success: false, reason: 'ไม่มีของขาย' }
  Object.entries(sold).forEach(([itemId, count]) => {
    const sellPrice = items[itemId]?.sellPrice ?? 0
    inv.removeItem(itemId, count)
    inv.addGold(sellPrice * count)
    totalEarned += sellPrice * count
  })
  return { success: true, totalEarned }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/systems/shopActions.test.js`
Expected: PASS (6/6)

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: all green, output pristine

- [ ] **Step 6: Commit**

```bash
git add src/systems/shopActions.js src/systems/shopActions.test.js
git commit -m "feat: extract shopActions from GameCanvas (buyItem/sellItem/sellAllProduce)"
```

---

### Task 3 (optional, small): Scope the presence throttle to the (ownerUid, mapKey, selfUid) tuple

**Context:** `src/lib/presence.js:11,13,65-70` — `updateSelf`'s 120ms throttle uses a single module-level `_lastUpdateMs`, shared across ALL calls regardless of which room/uid. Today this is harmless (only one `MapScene` instance ever calls `updateSelf`, so there's only ever one active tuple at a time) — but it's implicit global state that would silently misbehave if that assumption ever changes (e.g. a future multi-window/multi-map-preview feature). This task scopes the throttle per-tuple defensively; it is **not fixing an active bug**, just removing a latent footgun. Skip this task if you'd rather not touch working code for a non-issue — it's genuinely optional.

**Files:**
- Modify: `src/lib/presence.js`
- Modify: `src/lib/presence.test.js`

- [ ] **Step 1: Read `src/lib/presence.js` and `src/lib/presence.test.js` in full** to confirm the exact current shape of `_lastUpdateMs`/`_resetThrottleForTest` and how existing tests exercise the throttle, before making any change — this task must not break the existing throttle test(s).

- [ ] **Step 2:** Replace the single `let _lastUpdateMs = 0` with a `Map` keyed by `` `${ownerUid}:${mapKey}:${selfUid}` ``:
```js
const _lastUpdateMs = new Map()
```
Update `updateSelf`:
```js
export function updateSelf(ownerUid, mapKey, selfUid, partial) {
  const key = `${ownerUid}:${mapKey}:${selfUid}`
  const now = Date.now()
  if (now - (_lastUpdateMs.get(key) ?? 0) < UPDATE_INTERVAL_MS) return
  _lastUpdateMs.set(key, now)
  set(playerRef(ownerUid, mapKey, selfUid), partial).catch(() => {})
}
```
Update `_resetThrottleForTest` to clear the Map instead of resetting a number (check its current signature first — it may need a `key` param, or may just do `_lastUpdateMs.clear()` if tests always want a full reset).

- [ ] **Step 3:** Run `npx vitest run src/lib/presence.test.js` → PASS, same test count as before.

- [ ] **Step 4:** Run `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/presence.js src/lib/presence.test.js
git commit -m "refactor: scope presence throttle per (ownerUid,mapKey,selfUid) instead of one global clock"
```

---

## Design decision needed — NOT a task (do not implement blindly)

**The "only resolve the current player's MBTI spritesheet" perf idea has a chicken-and-egg problem that needs a human decision before any code is written:**

`resolveAssetUrls()` (`src/game/worldScenes.js:30-38`) eagerly resolves all 16 MBTI spritesheets because **remote players' MBTI types aren't known until after the scene boots** — `_reconcileRemotePlayers` (`worldScenes.js:768-811`) only learns which MBTI types are actually present in a room once presence data arrives, which happens after `resolveAssetUrls()`/`preload()`/`create()` have already run. Two real options, each with a real cost:

1. **Lazy-load per remote MBTI as it's first seen** — smallest fix scope (skip the other 15 in `GAME_ASSETS`/`resolveAssetUrls`, load the current player's 1 eagerly), but requires adding *runtime* texture loading to a live Phaser scene (`this.load.spritesheet(...)` + `this.load.start()` mid-game, handling the load-completion callback before a remote avatar can render) — Phaser's loader has real async-lifecycle subtleties mid-scene that don't show up in the existing boot-time-only load path. This is genuinely new plumbing, not a mechanical trim.
2. **Keep loading all 16 eagerly, accept the cost** — zero risk, zero benefit; the status quo.

Given the effort/risk of option 1 relative to its payoff (saves ~15 Storage round-trips on a cold cache, ~0 after the first session thanks to Plan 2's `cloudAsset` localStorage cache), **this needs a scoping decision from you before it becomes a task** — it is not a safe mechanical refactor like the rest of this plan. Flag it back if you want option 1 scoped into its own plan; otherwise it stays as-is.
