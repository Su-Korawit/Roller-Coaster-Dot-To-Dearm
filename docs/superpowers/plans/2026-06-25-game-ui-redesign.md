# Game UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 UX conflicts where the game HUD overlaps or confuses the web-app UI — moving the Hotbar to the right side, removing the clock HUD, unifying currency display, replacing the planting button with walk-to-plant, and eliminating decorative emoji in favour of SVG icons.

**Architecture:** All changes are isolated to React overlay components and the GameCanvas event wiring; Phaser scene code and Zustand stores are untouched. The walk-to-plant mechanic replaces the FarmActionButton's plant branch with a `useEffect` that fires once per tile-entry event.

**Tech Stack:** React 19, Vite 8, Tailwind v4 (no config file), Zustand 5, Phaser 3.88, lucide-react 1.8, inline `style` for game-overlay components (pixel-art theme).

## Global Constraints

- No TypeScript — plain `.jsx` / `.js` only.
- Tailwind v4 tokens live in `src/index.css @theme` — never in a config file.
- Game-overlay components (Hotbar, DayNightOverlay, etc.) use inline `style` objects, NOT Tailwind classes.
- Icon components: SVG, no emoji, no external icon library beyond `lucide-react` already installed.
- Do NOT touch Phaser scene code (`src/game/`), Zustand stores, or Firestore sync paths.
- `farmActions.js` `plantSeed` / `harvestAt` are pure — call them directly, do not wrap them.
- Pixel font: `fontFamily: 'pixelFont-7, monospace'` (matches existing HUD style).
- Brand purple: `var(--color-brand)` = `#a78bda`. Amber/gold: `#f59e0b`. Dark brown (wood): `#3d2b1f`.

---

### Task 1: Hotbar — vertical right-side strip + selectedIndex tracking

**Files:**
- Modify: `src/components/Hotbar.jsx`
- Modify: `src/components/GameCanvas.jsx` (lines 429, add selectedHotbarIndex state)

**Interfaces:**
- Produces: `Hotbar` now accepts same props but renders vertically on the right. `GameCanvas` tracks `selectedHotbarIndex` state and wires it to `Hotbar`.

- [ ] **Step 1: Rewrite Hotbar container and slot layout to vertical**

Replace the entire contents of `src/components/Hotbar.jsx` with:

```jsx
import React from 'react'
import { getItemAbbr, getItemColor } from '../utils/itemHelpers'

export function Hotbar({ slots = [], selectedIndex = 0, gold = 0, onSelectSlot = () => {} }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const slotSize = isMobile ? 40 : 44
  const gap = 4
  const visibleSlots = 4
  const maxScrollHeight = slotSize * visibleSlots + gap * (visibleSlots - 1) + 16

  const styles = {
    container: {
      position: 'fixed',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
    },
    goldDisplay: {
      fontFamily: 'pixelFont-7, monospace',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#f5c542',
      textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
      textAlign: 'center',
      lineHeight: 1.2,
    },
    slotsColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: gap,
      backgroundColor: '#c8a96e',
      border: '3px solid #3d2b1f',
      padding: 6,
      overflowY: 'auto',
      maxHeight: maxScrollHeight,
      pointerEvents: 'auto',
      scrollbarWidth: 'none',
    },
    slot: {
      position: 'relative',
      width: slotSize,
      height: slotSize,
      backgroundColor: '#a89968',
      border: '2px solid #3d2b1f',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 0.1s',
    },
    slotSelected: {
      border: '2px solid #f5e642',
      boxShadow: 'inset 0 0 8px rgba(245, 230, 66, 0.5)',
      backgroundColor: '#b8a978',
    },
    slotBg: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      imageRendering: 'pixelated',
      opacity: 0.8,
    },
    itemAbbr: {
      position: 'relative',
      fontFamily: 'pixelFont-7, monospace',
      fontSize: '11px',
      fontWeight: 'bold',
      textAlign: 'center',
      lineHeight: 1,
      textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
      zIndex: 2,
    },
    countBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      fontFamily: 'pixelFont-7, monospace',
      fontSize: '9px',
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: '1px 3px',
      lineHeight: 1,
      textShadow: '1px 1px 0px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
      zIndex: 3,
    },
  }

  return (
    <div style={styles.container}>
      <div style={styles.goldDisplay}>{gold}g</div>
      <div style={styles.slotsColumn}>
        {slots.map((slot, i) => (
          <div
            key={i}
            style={{ ...styles.slot, ...(selectedIndex === i ? styles.slotSelected : {}) }}
            onClick={() => onSelectSlot(i)}
          >
            <img
              src="/assets/ui/emojis-free/Inventory_slot.png"
              alt=""
              style={styles.slotBg}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            {slot && (
              <>
                <span style={{ ...styles.itemAbbr, color: getItemColor?.(slot.itemId) ?? '#3d2b1f' }}>
                  {getItemAbbr(slot.itemId)}
                </span>
                <span style={styles.countBadge}>{slot.count}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add selectedHotbarIndex state to GameCanvas and wire to Hotbar**

In `src/components/GameCanvas.jsx`, find the existing farm state block (around line 57):
```js
const [activeTile, setActiveTile] = useState(null)
const [seedPickerOpen, setSeedPickerOpen] = useState(false)
```

Add after `activeTile`:
```js
const [selectedHotbarIndex, setSelectedHotbarIndex] = useState(0)
const selectedHotbarIndexRef = useRef(0)
useEffect(() => { selectedHotbarIndexRef.current = selectedHotbarIndex }, [selectedHotbarIndex])
```

Then find the Hotbar render (around line 429):
```jsx
{active && (
  <Hotbar slots={hotbar} selectedIndex={0} gold={gold} onSelectSlot={() => {}} />
)}
```

Replace with:
```jsx
{active && (
  <Hotbar slots={hotbar} selectedIndex={selectedHotbarIndex} gold={gold} onSelectSlot={setSelectedHotbarIndex} />
)}
```

- [ ] **Step 3: Verify visually — open the app on /home, check Hotbar appears on right side, 4 slots visible, scrollable if 8 slots present, gold text at top. Tap a slot to confirm selection highlight moves.**

- [ ] **Step 4: Commit**

```bash
git add src/components/Hotbar.jsx src/components/GameCanvas.jsx
git commit -m "feat: move Hotbar to right-side vertical strip, wire selectedIndex"
```

---

### Task 2: Remove DayNightOverlay clock HUD

**Files:**
- Modify: `src/components/DayNightOverlay.jsx`

**Interfaces:**
- Consumes: `dayNight` prop (unchanged).
- Produces: `DayNightOverlay` renders only `colorOverlay` + `periodToast`. The `hud` box (clock, day counter, progress bar) is removed entirely.

- [ ] **Step 1: Remove unused state and hud block from DayNightOverlay**

Replace the entire `src/components/DayNightOverlay.jsx` with:

```jsx
import React, { useState, useEffect, useRef } from 'react'

const PERIOD_LABELS = {
  morning: 'เช้าแล้ว!',
  day: 'กลางวัน',
  evening: 'ตะวันลับ',
  night: 'ค่ำคืนมาถึง',
}

export function DayNightOverlay({ dayNight }) {
  const [overlayColor, setOverlayColor] = useState({ r: 255, g: 200, b: 100, alpha: 0.15 })
  const [periodToast, setPeriodToast] = useState(null)
  const toastTimerRef = useRef(null)

  useEffect(() => {
    if (!dayNight) return

    const intervalId = setInterval(() => {
      setOverlayColor(dayNight.getOverlayColor())
    }, 16)

    const handlePeriodChanged = ({ period: newPeriod }) => {
      clearTimeout(toastTimerRef.current)
      setPeriodToast(PERIOD_LABELS[newPeriod])
      toastTimerRef.current = setTimeout(() => setPeriodToast(null), 2000)
    }

    dayNight.on('periodChanged', handlePeriodChanged)

    return () => {
      clearInterval(intervalId)
      dayNight.off('periodChanged', handlePeriodChanged)
      clearTimeout(toastTimerRef.current)
    }
  }, [dayNight])

  const { r, g, b, alpha } = overlayColor

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: `rgba(${r},${g},${b},${alpha})`,
          pointerEvents: 'none',
          transition: 'background-color 2s ease',
          zIndex: 10,
        }}
      />
      {periodToast && (
        <>
          <style>{`
            @keyframes periodToastIn {
              from { transform: translateX(-50%) scale(0.8); opacity: 0; }
              to   { transform: translateX(-50%) scale(1);   opacity: 1; }
            }
          `}</style>
          <div
            key={periodToast}
            style={{
              position: 'fixed',
              top: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(61,43,31,0.9)',
              border: '3px solid #c8a96e',
              color: '#f0d9a0',
              fontFamily: 'pixelFont-7, monospace',
              fontSize: 16,
              fontWeight: 'bold',
              padding: '12px 24px',
              zIndex: 20,
              pointerEvents: 'none',
              animation: 'periodToastIn 0.3s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {periodToast}
          </div>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify — open /home, game running. The brown clock box (top-right, showing 06:00) must be gone. Day/night color tint on the screen must still work. Period change toast ("เช้าแล้ว!") must still appear.**

- [ ] **Step 3: Commit**

```bash
git add src/components/DayNightOverlay.jsx
git commit -m "feat: remove clock HUD from DayNightOverlay, keep color overlay and period toast"
```

---

### Task 3: Gold + Coin icons in HomePage header

**Files:**
- Create: `src/components/ui/GoldIcon.jsx`
- Create: `src/components/ui/CoinIcon.jsx`
- Modify: `src/pages/HomePage.jsx` (lines 229–236, add gold import + display)

**Interfaces:**
- Produces: `GoldIcon` and `CoinIcon` are 16×16 SVG components. `HomePage` shows `⊙ {coins}` replaced by `<CoinIcon/> {coins}` and adds `<GoldIcon/> {gold}g` next to it.

- [ ] **Step 1: Create GoldIcon SVG component**

Create `src/components/ui/GoldIcon.jsx`:

```jsx
export function GoldIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {/* stalk */}
      <line x1="8" y1="14" x2="8" y2="7" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
      {/* center head */}
      <ellipse cx="8" cy="5.5" rx="2.5" ry="2" fill="#f59e0b"/>
      {/* left ear */}
      <ellipse cx="5.2" cy="7.5" rx="1.8" ry="1.2" fill="#fbbf24" transform="rotate(-30 5.2 7.5)"/>
      {/* right ear */}
      <ellipse cx="10.8" cy="7.5" rx="1.8" ry="1.2" fill="#fbbf24" transform="rotate(30 10.8 7.5)"/>
    </svg>
  )
}
```

- [ ] **Step 2: Create CoinIcon SVG component**

Create `src/components/ui/CoinIcon.jsx`:

```jsx
export function CoinIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="#a78bda" stroke="#7c3aed" strokeWidth="1.5"/>
      <text
        x="8" y="11.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="bold"
        fill="white"
        fontFamily="system-ui, sans-serif"
      >
        ⊙
      </text>
    </svg>
  )
}
```

- [ ] **Step 3: Add gold to HomePage header pill**

In `src/pages/HomePage.jsx`:

Add imports at the top (after existing imports):
```js
import { GoldIcon } from '../components/ui/GoldIcon'
import { CoinIcon } from '../components/ui/CoinIcon'
import { useInventoryStore } from '../stores/useInventoryStore'
```

Add selector after existing `const coins = ...` line:
```js
const gold = useInventoryStore((s) => s.gold)
```

Find the existing Streak + Coins pill (lines 229–236):
```jsx
<div className="pointer-events-auto flex items-center gap-3 bg-white/90 rounded-full px-4 py-1.5 shadow">
  <span className="pixel-font text-[11px] text-orange-500">🔥 {totalStacks}</span>
  <span className="pixel-font text-[11px] text-yellow-700">
    {coins}
    <span className="inline-block ml-1 w-5 h-5 rounded-full border-2 border-yellow-600 text-center text-[9px] leading-4">$</span>
  </span>
</div>
```

Replace with:
```jsx
<div className="pointer-events-auto flex items-center gap-3 bg-white/90 rounded-full px-4 py-1.5 shadow">
  <span className="pixel-font text-[11px] text-orange-500 flex items-center gap-1">
    🔥 {totalStacks}
  </span>
  <span className="pixel-font text-[11px] text-brand flex items-center gap-1">
    <CoinIcon size={14} />
    {coins}
  </span>
  <span className="pixel-font text-[11px] text-amber-700 flex items-center gap-1">
    <GoldIcon size={14} />
    {gold}g
  </span>
</div>
```

- [ ] **Step 4: Verify — header pill shows streak + coin count with purple coin icon + gold count with wheat icon. All three separated clearly. No emoji `$` badge.**

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/GoldIcon.jsx src/components/ui/CoinIcon.jsx src/pages/HomePage.jsx
git commit -m "feat: add GoldIcon/CoinIcon SVGs, display gold + coins side by side in header"
```

---

### Task 4: Walk-to-plant — auto-plant from selected Hotbar slot

**Files:**
- Modify: `src/components/GameCanvas.jsx`

**Interfaces:**
- Consumes: `activeTile` (existing, set by Phaser `farmTileChanged` event on tile entry), `selectedHotbarIndexRef` (from Task 1), `useFarmStore.getState()`, `useInventoryStore.getState()`, `useFarmDataStore.getState()`, `plantSeed` (existing import).
- Produces: On tile entry to an empty FarmGround tile, auto-plants the seed from the selected Hotbar slot. `FarmActionButton` is shown only for harvest (ready crops). `SeedPicker` is removed entirely.

- [ ] **Step 1: Add auto-plant useEffect to GameCanvas**

In `src/components/GameCanvas.jsx`, after the existing `// ---------- Action button state ----------` block (around line 282), add:

```js
// Auto-plant: when player steps onto an empty farm tile, plant from selected hotbar slot.
useEffect(() => {
  if (!activeTile || !isOwner) return
  const { plots: currentPlots } = useFarmStore.getState()
  const plot = currentPlots[tileKey(activeTile.tileX, activeTile.tileY)]
  if (plot) return // tile already occupied — harvest button handles this
  const { hotbar: currentHotbar } = useInventoryStore.getState()
  const slot = currentHotbar[selectedHotbarIndexRef.current]
  if (!slot) return
  const { items } = useFarmDataStore.getState()
  if (items[slot.itemId]?.type !== 'seed') return
  plantSeed({
    tileX: activeTile.tileX,
    tileY: activeTile.tileY,
    seedItemId: slot.itemId,
    farmTiles: gameRef.current?.scene?.getScene('MapScene')?._farmTiles,
  })
}, [activeTile, isOwner]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: Update showAction and actionLabel to harvest-only**

Find (around line 285–287):
```js
const showAction = active && isOwner && activeTile != null
const actionLabel = activePlot ? (activeReady ? 'เก็บเกี่ยว' : 'กำลังโต…') : 'ปลูก'
```

Replace with:
```js
const showAction = active && isOwner && activePlot != null
const actionLabel = activeReady ? 'เก็บเกี่ยว' : 'กำลังโต…'
```

- [ ] **Step 3: Update handleAction to harvest-only, remove seedPickerOpen**

Find `handleAction` (around line 288–292):
```js
const handleAction = () => {
  if (!activeTile) return
  if (!activePlot) { setSeedPickerOpen(true); return }
  if (activeReady) harvestAt({ tileX: activeTile.tileX, tileY: activeTile.tileY })
}
```

Replace with:
```js
const handleAction = () => {
  if (!activeTile || !activePlot || !activeReady) return
  harvestAt({ tileX: activeTile.tileX, tileY: activeTile.tileY })
}
```

- [ ] **Step 4: Remove seedPickerOpen state and SeedPicker render**

Remove from the farm state block (around line 58):
```js
const [seedPickerOpen, setSeedPickerOpen] = useState(false)
```

Remove the `SeedPicker` import at the top:
```js
import { SeedPicker } from './SeedPicker'
```

Remove the entire SeedPicker render block from the return (around lines 434–450):
```jsx
{active && (
  <SeedPicker
    isOpen={seedPickerOpen}
    seeds={seedItems}
    onSelect={(seedItemId) => {
      if (activeTile) {
        plantSeed({
          tileX: activeTile.tileX,
          tileY: activeTile.tileY,
          seedItemId,
          farmTiles: gameRef.current?.scene?.getScene('MapScene')?._farmTiles,
        })
      }
      setSeedPickerOpen(false)
    }}
    onClose={() => setSeedPickerOpen(false)}
  />
)}
```

- [ ] **Step 5: Remove seedItems memo (no longer consumed)**

Find and remove (around line 295–306):
```js
const seedItems = useMemo(() => {
  const byId = {}
  ;[...hotbar, ...storage].forEach(slot => {
    if (!slot) return
    if (farmItems[slot.itemId]?.type === 'seed') {
      byId[slot.itemId] = (byId[slot.itemId] ?? 0) + slot.count
    }
  })
  return Object.entries(byId).map(([itemId, count]) => ({
    itemId, count, name: farmItems[itemId]?.name ?? itemId, iconIndex: farmItems[itemId]?.iconIndex ?? 0,
  }))
}, [hotbar, storage, farmItems])
```

- [ ] **Step 6: Verify walk-to-plant works**

1. Open the farm map (`test2`) in the browser.
2. Select a hotbar slot containing a seed (gold border).
3. Walk the character onto an empty FarmGround tile.
4. Confirm the seed is planted immediately — crop sprite appears, no dialog opened.
5. Walk onto an occupied tile where the crop is ready — FarmActionButton ("เก็บเกี่ยว") appears.
6. Tap it — crop is harvested, produce appears in inventory.
7. Walk onto a growing (not-ready) tile — FarmActionButton shows "กำลังโต…" (greyed out, no action on tap is fine).
8. Select a hotbar slot with produce (not a seed) and walk onto empty tile — nothing happens.

- [ ] **Step 7: Commit**

```bash
git add src/components/GameCanvas.jsx
git commit -m "feat: walk-to-plant auto-seeds from selected hotbar slot, remove plant button and SeedPicker"
```

---

### Task 5: Category B emoji replacements

**Files:**
- Modify: `src/components/ShopUI.jsx` (lines 308, 380 — `💰` in gold display + sell-all button)
- Modify: `src/components/ProfilePanel.jsx` (line 97 — `✏️` edit button)
- Modify: `src/pages/HomePage.jsx` (line 264 — `📰` News button)
- Modify: `src/components/ChatPanel.jsx` (line 423 — `📋` task share icon)

**Interfaces:**
- Consumes: `GoldIcon` (from Task 3), `lucide-react` icons already installed (`Newspaper`, `Pencil`, `ClipboardList`).
- Produces: All Category B decorative emojis replaced with SVG/lucide icons. No new dependencies added.

- [ ] **Step 1: Fix ShopUI gold display and sell-all button**

In `src/components/ShopUI.jsx`:

Add import at top:
```js
import { GoldIcon } from './ui/GoldIcon'
```

Find line 308:
```jsx
<div style={styles.gold}>💰 {gold}g</div>
```
Replace with:
```jsx
<div style={{ ...styles.gold, display: 'flex', alignItems: 'center', gap: 4 }}>
  <GoldIcon size={14} />
  {gold}g
</div>
```

Find line 380:
```jsx
💰 ขายทั้งหมดเลย — {totalProduceValue}g
```
Replace with:
```jsx
ขายทั้งหมด — {totalProduceValue}g
```

- [ ] **Step 2: Fix ProfilePanel edit button**

In `src/components/ProfilePanel.jsx`:

Add import at top (after existing imports):
```js
import { Pencil } from 'lucide-react'
```

Find line 97:
```jsx
✏️ Edit your path
```
Replace with:
```jsx
<Pencil size={12} strokeWidth={2} style={{ display: 'inline', marginRight: 4 }} />
Edit your path
```

- [ ] **Step 3: Fix HomePage News button**

In `src/pages/HomePage.jsx`:

Add `Newspaper` to the existing lucide-react import:
```js
import { Calendar, MessageCircle, Map, Newspaper } from 'lucide-react'
```

Find line 264:
```jsx
<span className="text-base" aria-hidden="true">📰</span>
```
Replace with:
```jsx
<Newspaper size={18} strokeWidth={1.5} className="text-gray-600" aria-hidden="true" />
```

- [ ] **Step 4: Fix ChatPanel task share icon**

In `src/components/ChatPanel.jsx`:

Add import at top (after existing imports):
```js
import { ClipboardList } from 'lucide-react'
```

Find line 423:
```jsx
<span className="text-lg leading-none shrink-0">📋</span>
```
Replace with:
```jsx
<ClipboardList size={18} strokeWidth={1.5} className="shrink-0 text-gray-500" aria-hidden="true" />
```

- [ ] **Step 5: Verify — open each affected screen**

- ShopUI (enter shop zone on farm map): gold display shows wheat icon + number, sell-all button has no emoji
- ProfilePanel (`/home` → profile tab): Edit button shows pencil SVG icon, not ✏️
- HomePage News button (top-right): shows Newspaper icon, not 📰
- ChatPanel (task share): shows ClipboardList icon, not 📋

- [ ] **Step 6: Commit**

```bash
git add src/components/ShopUI.jsx src/components/ProfilePanel.jsx src/pages/HomePage.jsx src/components/ChatPanel.jsx
git commit -m "feat: replace Category B decorative emojis with SVG/lucide icons"
```

---

### ADR: Walk-to-plant auto-seed mechanic

- [ ] **Write ADR**

Create `docs/adr/0006-walk-to-plant-auto-seed.md`:

```markdown
---
status: accepted
---

# Walk-to-plant: auto-seed on tile entry from selected Hotbar slot

## Context

The previous planting flow required three steps: stand on FarmGround tile → tap FarmActionButton → pick seed from SeedPicker dialog. This was borrowed from desktop farming games but is awkward on mobile touch screens.

## Decision

When the player enters an empty FarmGround tile, the React overlay fires `plantSeed` immediately using whichever seed is in the currently-selected Hotbar slot. The explicit "Plant" button and SeedPicker dialog are removed. Harvest ("เก็บเกี่ยว") retains its explicit button because it is a deliberate, irreversible action.

## Alternatives considered

- **Long-press to select seed:** More discoverable but adds latency and complexity for a core action that happens every few seconds.
- **Keep SeedPicker, auto-open on tile entry:** Removes the button tap but keeps the picker modal — still breaks flow.

## Consequences

- Planting is now a single gesture (walk). Seeds deplete silently if the player has the wrong slot selected; they must manage their Hotbar slot selection deliberately.
- The `SeedPicker` component remains in the codebase but is no longer rendered; it can be removed in a future cleanup pass if no other caller emerges.
```

- [ ] **Commit ADR**

```bash
git add docs/adr/0006-walk-to-plant-auto-seed.md
git commit -m "docs: ADR-0006 walk-to-plant auto-seed mechanic"
```
