# Architecture Improvement — Plan 10: GameCanvas Handler Swap (Cursor)

> **Prerequisite:** Plan 9 (`2026-07-04-plan9-claude-game-logic-extraction.md`) Tasks 1-2 must be done first — it creates `src/systems/inventoryActions.js` (`moveToStorage`, `moveToHotbar`, `swapSlots`) and `src/systems/shopActions.js` (`buyItem`, `sellItem`, `sellAllProduce`). Confirm both files exist before starting.

**Goal:** Replace `GameCanvas.jsx`'s 6 inline handler bodies with thin calls into the new extracted action modules. No behavior change — same function names (`handleBuy`, `handleSell`, etc.) stay as the props passed to `ShopUI`/`StorageUI`/`Hotbar`, only their bodies become one-line delegations.

**Architecture:** Pure call-site swap in one file. No new components, no JSX layout changes.

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- Don't touch any JSX markup — only the 6 handler function bodies and imports.
- The prop names passed to `ShopUI`/`StorageUI`/`Hotbar` (wherever `handleBuy`/`handleSell`/etc. are passed down) must not change — only what's inside each handler.
- Verify with `npm test` after the change; manual in-game test at the end (this is core gameplay — farm/shop/inventory — so manual verification matters).

---

### Task 1: Rewire `src/components/GameCanvas.jsx`

**Files:** Modify `src/components/GameCanvas.jsx`

- [ ] **Step 1:** Update imports — currently (lines 21-24):
```jsx
import { tileKey, isReady } from '../systems/farmLogic'
import { addToSlots, countInSlots } from '../systems/inventoryLogic'
import { plantSeed, harvestAt } from '../systems/farmActions'
import { notify } from '../systems/NotificationSystem'
```
Add two new imports (keep all 4 existing ones — `countInSlots` is still used elsewhere in this file, e.g. the `stockList`/`produceList` memos; `notify` may become unused after this task, check Step 6 before removing it):
```jsx
import { tileKey, isReady } from '../systems/farmLogic'
import { addToSlots, countInSlots } from '../systems/inventoryLogic'
import { plantSeed, harvestAt } from '../systems/farmActions'
import { notify } from '../systems/NotificationSystem'
import { moveToStorage, moveToHotbar, swapSlots } from '../systems/inventoryActions'
import { buyItem, sellItem, sellAllProduce } from '../systems/shopActions'
```

- [ ] **Step 2 — storage/hotbar handlers** (currently lines 346-387), replace:
```jsx
  // ---------- Storage move/swap handlers ----------
  const handleMoveToStorage = (fromIndex) => {
    const inv = useInventoryStore.getState()
    const slot = inv.hotbar[fromIndex]
    if (!slot) return
    const stackMax = useFarmDataStore.getState().items[slot.itemId]?.stackMax ?? 99
    const result = addToSlots(inv.storage, slot.itemId, slot.count, stackMax)
    if (result.remaining === 0) {
      const newHotbar = [...inv.hotbar]
      newHotbar[fromIndex] = null
      useInventoryStore.setState({ hotbar: newHotbar, storage: result.slots })
    } else {
      notify.inventoryFull()
    }
  }

  const handleMoveToHotbar = (fromIndex) => {
    const inv = useInventoryStore.getState()
    const slot = inv.storage[fromIndex]
    if (!slot) return
    const stackMax = useFarmDataStore.getState().items[slot.itemId]?.stackMax ?? 99
    const result = addToSlots(inv.hotbar, slot.itemId, slot.count, stackMax)
    if (result.remaining === 0) {
      const newStorage = [...inv.storage]
      newStorage[fromIndex] = null
      useInventoryStore.setState({ hotbar: result.slots, storage: newStorage })
    } else {
      notify.inventoryFull()
    }
  }

  const handleSwapSlots = (fromIndex, toIndex, isHotbarSwap) => {
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
with:
```jsx
  // ---------- Storage move/swap handlers ----------
  const handleMoveToStorage = (fromIndex) => moveToStorage(fromIndex)
  const handleMoveToHotbar = (fromIndex) => moveToHotbar(fromIndex)
  const handleSwapSlots = (fromIndex, toIndex, isHotbarSwap) => swapSlots(fromIndex, toIndex, isHotbarSwap)
```

- [ ] **Step 3 — shop handlers** (currently lines 390-432), replace:
```jsx
  // ---------- Shop buy/sell handlers ----------
  const handleBuy = (itemId, qty) => {
    const shop = farmShops[shopState?.shopId]
    if (!shop) return {}
    const item = shop.sells.find(s => s.itemId === itemId)
    if (!item) return {}
    const total = item.price * qty
    const inv = useInventoryStore.getState()
    if (!inv.hasGold(total)) return { success: false, reason: 'เงินไม่พอ' }
    inv.removeGold(total)
    inv.addItem(itemId, qty)
    return { success: true }
  }

  const handleSell = (itemId, count) => {
    const inv = useInventoryStore.getState()
    const sellPrice = useFarmDataStore.getState().items[itemId]?.sellPrice ?? 0
    const goldEarned = sellPrice * count
    inv.removeItem(itemId, count)
    inv.addGold(goldEarned)
    return { success: true, goldEarned }
  }

  const handleSellAll = () => {
    const inv = useInventoryStore.getState()
    const { items } = useFarmDataStore.getState()
    const allSlots = [...inv.hotbar, ...inv.storage]
    let totalEarned = 0
    const sold = {}
    allSlots.forEach(slot => {
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
with:
```jsx
  // ---------- Shop buy/sell handlers ----------
  const handleBuy = (itemId, qty) => buyItem(farmShops, shopState?.shopId, itemId, qty)
  const handleSell = (itemId, count) => sellItem(itemId, count)
  const handleSellAll = () => sellAllProduce()
```

- [ ] **Step 4:** Check whether `useInventoryStore`/`useFarmDataStore`/`addToSlots`/`notify` are still used anywhere else in `GameCanvas.jsx` (they very likely are — `useInventoryStore`/`useFarmDataStore` are used elsewhere in the component for e.g. the `stockList`/`produceList` memos and hooks at the top of the file; `addToSlots` may now be unused if nothing else calls it — check before removing its import). Do not remove any import that's still used elsewhere.

- [ ] **Step 5:** `npm test` → PASS (this file has no `GameCanvas.test.jsx`, so this confirms nothing else in the suite broke — the new logic itself is covered by Plan 9's `inventoryActions.test.js`/`shopActions.test.js`).

- [ ] **Step 6: Manual verification in dev** (`npm run dev`) — this touches live gameplay, verify each path:
  - Walk into a shop zone, open Shop UI, buy an item (gold decreases, item appears in hotbar/storage)
  - Try to buy with insufficient gold (should show the "เงินไม่พอ" refusal, no state change)
  - Sell an item from the shop UI (gold increases)
  - Use "sell all" with produce in inventory (all produce sold, non-produce items untouched)
  - Use "sell all" with no produce (should show "ไม่มีของขาย", no crash)
  - Open Storage UI, move an item from hotbar to storage and back
  - Fill storage completely, try to move another item in — confirm the "inventory full" notification still shows and nothing is lost
  - Swap two hotbar slots, swap two storage slots

- [ ] **Step 7: Commit**

```bash
git add src/components/GameCanvas.jsx
git commit -m "refactor: delegate GameCanvas shop/inventory handlers to systems/shopActions and inventoryActions"
```

---

## Final check

- [ ] `npm run build` → succeeds.
- [ ] `GameCanvas.jsx`'s handler section should now be ~6 one-line delegations instead of ~87 lines of inline logic.
