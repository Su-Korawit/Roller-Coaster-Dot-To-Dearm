# Roadmap Canvas Interaction Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task, OR hand this file to Cursor IDE to implement directly task-by-task, checking off each `- [ ]` as completed. Claude Code (terminal) should review/check the diff after each task per this repo's CLAUDE.md collaboration model.

**Goal:** Add drag-and-drop block creation (desktop + touch) and per-block color to the Roadmap canvas, wire a real save/saved indicator to the debounced Firestore sync, remove the Timeline ruler, and fix the cursor-jump-to-end bug in block text inputs.

**Architecture:** All six changes live in the same small cluster of files: `src/pages/RoadmapPage.jsx` (canvas, toolbar, viewport), the four node components in `src/components/roadmap/` (`ProcessNode.jsx`, `ConditionNode.jsx`, `StageLabelNode.jsx`, `ImageNode.jsx`), `src/stores/useRoadmapStore.js` (Zustand store), and `src/lib/syncManager.js` (the shared debounced-Firestore-sync factory used by 6 stores, of which Roadmap is one). Drag-and-drop reuses the exact same screen-to-flow-position math `addAtCenter` already uses (`rfRef.current.screenToFlowPosition` + `computeCenteredPosition`), factored into a new pure helper so both the desktop HTML5 DnD path and the touch long-press path share it. Color and save-status are additive `data`/state fields that flow through existing generic actions (`updateNodeData`, a new `setSyncStatus`). The sync-status wiring adds an optional `onStatus` callback to `createFirestoreSync` that defaults to a no-op, so the other 5 sync instances (tasks, portfolio, map, inventory, farm) are behaviorally unchanged.

**Tech Stack:** React 19 (plain JS/JSX, no TypeScript), `@xyflow/react` v12, Zustand v5 (+ `persist` middleware), Tailwind v4 utility classes, `lucide-react` icons, Vitest + jsdom + `@testing-library/react`.

## Global Constraints

- No TypeScript — plain JS + JSX only (per `CLAUDE.md`).
- Tailwind v4 — use existing utility classes / `@theme` tokens only, no new config files, no `sr-only`-style custom classes (Tailwind's built-in `sr-only` utility is used, it needs no config).
- Firestore writes always go through the debounced `src/lib/syncManager.js` — never a synchronous direct write. This plan only adds a status *callback* to the existing debounce/push path; it does not add any new write path.
- Firebase paths only via `src/lib/db.js` refs — this plan does not touch Firestore paths at all (`roadmapSync` already exists and is reused as-is).
- React Flow handles: rotate only the inner element, not the root `<div>` (already respected by `ConditionNode.jsx`; do not change that pattern when adding color).
- Surgical, additive changes only — do not remove or restructure the existing click-to-add toolbar behavior, the existing snap/connect logic, or the other 5 `createFirestoreSync` instances' behavior.
- This is a planning artifact for **Cursor** to implement (per this repo's Claude Code ↔ Cursor split). Claude Code's role after this plan is written is to check/verify and edit, not to author the UI changes itself.

---

### Task 1: `computeDropPosition` shared drag-drop helper

**Files:**
- Create: `src/utils/computeDropPosition.js`
- Test: `src/utils/computeDropPosition.test.js`

**Interfaces:**
- Produces: `computeDropPosition({ clientX, clientY }, screenToFlowPosition, type) => { x, y }` — given a screen-space point and a React Flow instance's `screenToFlowPosition` function, returns the top-left position a new block of `type` should be created at so it is centred on that screen point. Consumed by Task 2 (desktop HTML5 drag-and-drop) and Task 3 (touch long-press drag).
- Consumes: `computeCenteredPosition` from `src/utils/computeCenteredPosition.js` (existing, unmodified — the same helper `addAtCenter` in `RoadmapPage.jsx` already uses).

- [ ] **Step 1: Write the failing test**

Create `src/utils/computeDropPosition.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { computeDropPosition } from './computeDropPosition'

describe('computeDropPosition', () => {
  it('centres a process block (128x128) on the flow point the screen point maps to', () => {
    const screenToFlowPosition = vi.fn(({ x, y }) => ({ x: x + 10, y: y + 10 }))
    const result = computeDropPosition({ clientX: 190, clientY: 190 }, screenToFlowPosition, 'process')
    expect(screenToFlowPosition).toHaveBeenCalledWith({ x: 190, y: 190 })
    // flow point becomes (200,200); process is 128x128 -> top-left (136,136)
    expect(result).toEqual({ x: 136, y: 136 })
  })

  it('centres a stageLabel block (120x40) using its own size', () => {
    const screenToFlowPosition = ({ x, y }) => ({ x, y })
    const result = computeDropPosition({ clientX: 60, clientY: 60 }, screenToFlowPosition, 'stageLabel')
    expect(result).toEqual({ x: 0, y: 40 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/utils/computeDropPosition.test.js`
  Expected: FAIL because `src/utils/computeDropPosition.js` does not exist yet ("Failed to resolve import").

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/computeDropPosition.js`:

```js
import { computeCenteredPosition } from './computeCenteredPosition'

// Given a screen-space point (e.g. a drag/drop event's or a touch
// long-press-release's clientX/clientY) and the React Flow instance's
// `screenToFlowPosition` function, return the top-left position a new block
// of `type` should be created at so it is centred on that screen point.
// Shared by the desktop HTML5 drag-and-drop path (Task 2) and the touch
// long-press drag path (Task 3) so both drop a block in exactly the same
// spot relative to the pointer, using the same math as the existing
// click-to-add path (`addAtCenter` in RoadmapPage.jsx).
export function computeDropPosition({ clientX, clientY }, screenToFlowPosition, type) {
  const flowPoint = screenToFlowPosition({ x: clientX, y: clientY })
  return computeCenteredPosition(flowPoint, type)
}
```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/utils/computeDropPosition.test.js`
  Expected: PASS (2 tests)

- [ ] **Step 5: Commit**
  ```bash
  git add src/utils/computeDropPosition.js src/utils/computeDropPosition.test.js
  git commit -m "feat(roadmap): add computeDropPosition helper for drag-and-drop block creation"
  ```

---

### Task 2: Desktop drag-and-drop block creation (additive, toolbar → canvas)

**Files:**
- Modify: `src/pages/RoadmapPage.jsx`

**Interfaces:**
- Consumes: `computeDropPosition` from Task 1 (`../utils/computeDropPosition`); `addNode` (existing store action, unchanged); `rfRef.current.screenToFlowPosition` (existing React Flow instance method, already used by `addAtCenter`).
- Produces: nothing new for later tasks — Task 3 extends the same toolbar buttons this task modifies.

This is **additive**: the existing `onClick={() => addAtCenter(type)}` on each toolbar button is kept as-is (click-to-add still works). Dragging a button onto the canvas is a new, second way to add a block.

- [ ] **Step 1: Add the import**

In `src/pages/RoadmapPage.jsx`, after the existing import on line 24:

```js
import { computeCenteredPosition } from '../utils/computeCenteredPosition'
```

add:

```js
import { computeDropPosition } from '../utils/computeDropPosition'
```

- [ ] **Step 2: Add the canvas drag-over/drop handlers**

Immediately after the `addAtCenter` callback (ends at line 171, right before the `downloadSchema` callback at line 174), insert:

```js
  // Desktop drag-and-drop: a toolbar button is dragged onto the canvas and
  // dropped at the pointer's position (converted screen -> flow space with
  // the same math addAtCenter uses). Additive to the existing click-to-add
  // toolbar behavior, not a replacement for it.
  const onCanvasDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])
  const onCanvasDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/roadmap-node-type')
    if (!type || !rfRef.current) return
    addNode(type, computeDropPosition({ clientX: e.clientX, clientY: e.clientY }, rfRef.current.screenToFlowPosition, type))
  }, [addNode])
```

- [ ] **Step 3: Wire the handlers onto the canvas wrapper**

Replace line 247:

```jsx
      <div ref={canvasRef} className="flex-1 relative">
```

with:

```jsx
      <div ref={canvasRef} className="flex-1 relative" onDragOver={onCanvasDragOver} onDrop={onCanvasDrop}>
```

- [ ] **Step 4: Make the toolbar buttons draggable**

Replace the four "Add" buttons (lines 285–320):

```jsx
              <button
                onClick={() => addAtCenter('process')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Process block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/20 border-2 border-brand/50" />
                <span className="pixel-font text-[8px] text-ink">Process</span>
              </button>
              <button
                onClick={() => addAtCenter('condition')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-accent-pink/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink"
                aria-label="Add Condition block"
              >
                <div className="w-8 h-8 rotate-45 bg-accent-pink/20 border-2 border-accent-pink/50" style={{ borderRadius: '6px' }} />
                <span className="pixel-font text-[8px] text-ink">Condition</span>
              </button>
              <button
                onClick={() => addAtCenter('stageLabel')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Stage Label"
              >
                <div className="w-8 h-5 rounded-full bg-brand/20 border-2 border-brand/50 flex items-center justify-center">
                  <span className="pixel-font text-[6px] text-brand">Aa</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Stage</span>
              </button>
              <button
                onClick={() => addAtCenter('image')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Image block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
                  <span className="text-[14px]">🖼️</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Image</span>
              </button>
```

with:

```jsx
              <button
                onClick={() => addAtCenter('process')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'process')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Process block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/20 border-2 border-brand/50" />
                <span className="pixel-font text-[8px] text-ink">Process</span>
              </button>
              <button
                onClick={() => addAtCenter('condition')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'condition')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-accent-pink/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink"
                aria-label="Add Condition block"
              >
                <div className="w-8 h-8 rotate-45 bg-accent-pink/20 border-2 border-accent-pink/50" style={{ borderRadius: '6px' }} />
                <span className="pixel-font text-[8px] text-ink">Condition</span>
              </button>
              <button
                onClick={() => addAtCenter('stageLabel')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'stageLabel')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Stage Label"
              >
                <div className="w-8 h-5 rounded-full bg-brand/20 border-2 border-brand/50 flex items-center justify-center">
                  <span className="pixel-font text-[6px] text-brand">Aa</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Stage</span>
              </button>
              <button
                onClick={() => addAtCenter('image')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'image')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Image block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
                  <span className="text-[14px]">🖼️</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Image</span>
              </button>
```

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open `http://localhost:5173`, navigate to the Roadmap page on a desktop browser (mouse, not touch emulation).
- Confirm clicking "Process"/"Condition"/"Stage"/"Image" still adds a block at the centre of the viewport (unchanged behavior).
- Click-and-drag the "Process" button from the toolbar onto an empty spot on the canvas, release the mouse. A new Process block appears centred under the drop point (not at the toolbar or the viewport centre).
- Repeat for "Condition", "Stage", and "Image" — each drops the correct block type at the drop point.
- Drag a button and drop it outside the canvas (e.g. onto the header) — no block should be created (the canvas's `onDrop` never fires).

- [ ] **Step 6: Commit**
  ```bash
  git add src/pages/RoadmapPage.jsx
  git commit -m "feat(roadmap): support desktop drag-and-drop to create blocks from the toolbar"
  ```

---

### Task 3: Touch long-press drag-and-drop block creation

**Files:**
- Create: `src/hooks/useLongPressDrag.js`
- Modify: `src/pages/RoadmapPage.jsx`

**Interfaces:**
- Produces (hook): `useLongPressDrag(onDrop) => { dragState, getHandlers }`
  - `dragState` — `null` when idle, otherwise `{ type, x, y }` while a long-press drag is in progress (`x`/`y` are the live pointer screen coordinates).
  - `getHandlers(type)` — returns `{ onPointerDown, onPointerMove, onPointerUp, onPointerCancel }` to spread onto a toolbar button, where `type` is the block type that button creates (e.g. `'process'`).
  - `onDrop(type, { clientX, clientY })` — called once, on release, only if the long-press actually fired (i.e. the user held long enough to start dragging).
- Consumes: `computeDropPosition` from Task 1 (called from `RoadmapPage.jsx`'s `onDrop` callback passed into the hook, not from inside the hook itself — the hook has no knowledge of React Flow).

HTML5 drag-and-drop (`draggable`/`dataTransfer`, added in Task 2) does not fire on touch devices, so this is a separate Pointer Events based path. It follows the tap-vs-long-press disambiguation already used by `src/components/profile/PortfolioCircle.jsx` (a `setTimeout` + a "did it fire" ref flag), extended to track the pointer's live position afterwards so a ghost preview can follow it, and uses `setPointerCapture` the same way `src/components/roadmap/ImageNode.jsx`'s `onPointerDown` already does.

- [ ] **Step 1: Write the failing test for the hook's non-gesture logic**

Full pointer-gesture sequences (real touch drag-and-release) are not meaningfully testable under jsdom (see Task 1's `computeDropPosition` for the part of this feature that *is* unit-tested). This hook's only testable-without-a-real-pointer behavior is that a mouse pointer is ignored entirely (so it never interferes with the desktop drag-and-drop path from Task 2).

Create `src/hooks/useLongPressDrag.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLongPressDrag } from './useLongPressDrag'

describe('useLongPressDrag', () => {
  it('ignores mouse pointers entirely (desktop uses HTML5 drag-and-drop instead)', () => {
    const onDrop = vi.fn()
    const { result } = renderHook(() => useLongPressDrag(onDrop))
    act(() => {
      result.current.getHandlers('process').onPointerDown({ pointerType: 'mouse', clientX: 10, clientY: 10 })
    })
    expect(result.current.dragState).toBeNull()
  })

  it('starts idle with no drag in progress', () => {
    const { result } = renderHook(() => useLongPressDrag(vi.fn()))
    expect(result.current.dragState).toBeNull()
  })

  it('a touch pointer released before the long-press timer fires does not call onDrop', () => {
    vi.useFakeTimers()
    const onDrop = vi.fn()
    const { result } = renderHook(() => useLongPressDrag(onDrop))
    const target = { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() }
    act(() => {
      result.current.getHandlers('process').onPointerDown({ pointerType: 'touch', pointerId: 1, clientX: 10, clientY: 10, currentTarget: target })
    })
    act(() => {
      result.current.getHandlers('process').onPointerUp({ pointerType: 'touch', pointerId: 1, clientX: 10, clientY: 10, currentTarget: target, preventDefault: vi.fn() })
    })
    expect(onDrop).not.toHaveBeenCalled()
    expect(result.current.dragState).toBeNull()
    vi.useRealTimers()
  })

  it('a touch pointer held past 500ms starts a drag, and releasing it calls onDrop with the drop point', () => {
    vi.useFakeTimers()
    const onDrop = vi.fn()
    const { result } = renderHook(() => useLongPressDrag(onDrop))
    const target = { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() }
    act(() => {
      result.current.getHandlers('image').onPointerDown({ pointerType: 'touch', pointerId: 1, clientX: 10, clientY: 20, currentTarget: target })
    })
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.dragState).toEqual({ type: 'image', x: 10, y: 20 })
    act(() => {
      result.current.getHandlers('image').onPointerMove({ pointerType: 'touch', pointerId: 1, clientX: 30, clientY: 40 })
    })
    expect(result.current.dragState).toEqual({ type: 'image', x: 30, y: 40 })
    act(() => {
      result.current.getHandlers('image').onPointerUp({ pointerType: 'touch', pointerId: 1, clientX: 30, clientY: 40, currentTarget: target, preventDefault: vi.fn() })
    })
    expect(onDrop).toHaveBeenCalledWith('image', { clientX: 30, clientY: 40 })
    expect(result.current.dragState).toBeNull()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/hooks/useLongPressDrag.test.js`
  Expected: FAIL because `src/hooks/useLongPressDrag.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useLongPressDrag.js`:

```js
import { useCallback, useRef, useState } from 'react'

const LONG_PRESS_MS = 500

// Touch/pen long-press-and-drag gesture for creating a new Roadmap block from
// a toolbar button. HTML5 drag-and-drop (`draggable`/`dataTransfer`) never
// fires on touch devices, so this is a separate Pointer Events based path,
// following the tap-vs-long-press disambiguation already used by
// PortfolioCircle.jsx (setTimeout + a "did it fire" ref flag), extended to
// track the pointer's live position afterwards so a ghost preview can follow
// it. Mouse pointers are ignored entirely — desktop uses the HTML5
// drag-and-drop path instead (see RoadmapPage.jsx / Task 2).
export function useLongPressDrag(onDrop) {
  const [dragState, setDragState] = useState(null)
  const timerRef = useRef(null)
  const draggingRef = useRef(false)

  const getHandlers = useCallback((type) => ({
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse') return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      draggingRef.current = false
      timerRef.current = setTimeout(() => {
        draggingRef.current = true
        setDragState({ type, x: e.clientX, y: e.clientY })
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e) => {
      if (e.pointerType === 'mouse' || !draggingRef.current) return
      setDragState((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
    },
    onPointerUp: (e) => {
      if (e.pointerType === 'mouse') return
      clearTimeout(timerRef.current)
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      if (draggingRef.current) {
        // A real gesture happened (movement past the long-press threshold) —
        // suppress the browser's synthetic "click" so tapping-then-dragging
        // doesn't also fire the button's click-to-add-at-centre handler.
        e.preventDefault?.()
        onDrop(type, { clientX: e.clientX, clientY: e.clientY })
      }
      draggingRef.current = false
      setDragState(null)
    },
    onPointerCancel: (e) => {
      clearTimeout(timerRef.current)
      e.currentTarget?.releasePointerCapture?.(e.pointerId)
      draggingRef.current = false
      setDragState(null)
    },
  }), [onDrop])

  return { dragState, getHandlers }
}
```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/hooks/useLongPressDrag.test.js`
  Expected: PASS (4 tests)

- [ ] **Step 5: Wire the hook into `RoadmapPage.jsx`**

Add the imports. After the existing import on line 13:

```js
import { ArrowLeft, X, MousePointer2, Download, Upload } from 'lucide-react'
```

add:

```js
import { createPortal } from 'react-dom'
```

After the existing import on line 25 (`import { toSchema, selectSubset } from '../utils/roadmapExport'`), add:

```js
import { useLongPressDrag } from '../hooks/useLongPressDrag'
```

Right after the `onCanvasDrop` callback added in Task 2 (Step 2 of that task), add:

```js
  // Touch long-press drag: same drop-position math as the desktop path
  // (Task 2), triggered by the hook's onPointerUp instead of a native drop.
  const onTouchDrop = useCallback((type, { clientX, clientY }) => {
    if (!rfRef.current) return
    addNode(type, computeDropPosition({ clientX, clientY }, rfRef.current.screenToFlowPosition, type))
  }, [addNode])
  const { dragState, getHandlers } = useLongPressDrag(onTouchDrop)
```

- [ ] **Step 6: Spread the long-press handlers onto the toolbar buttons**

Starting from the state left by Task 2 Step 4, replace the four "Add" buttons again — this time adding `{...getHandlers(type)}` to each (keeping every attribute Task 2 added):

```jsx
              <button
                onClick={() => addAtCenter('process')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'process')}
                {...getHandlers('process')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Process block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/20 border-2 border-brand/50" />
                <span className="pixel-font text-[8px] text-ink">Process</span>
              </button>
              <button
                onClick={() => addAtCenter('condition')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'condition')}
                {...getHandlers('condition')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-accent-pink/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink"
                aria-label="Add Condition block"
              >
                <div className="w-8 h-8 rotate-45 bg-accent-pink/20 border-2 border-accent-pink/50" style={{ borderRadius: '6px' }} />
                <span className="pixel-font text-[8px] text-ink">Condition</span>
              </button>
              <button
                onClick={() => addAtCenter('stageLabel')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'stageLabel')}
                {...getHandlers('stageLabel')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Stage Label"
              >
                <div className="w-8 h-5 rounded-full bg-brand/20 border-2 border-brand/50 flex items-center justify-center">
                  <span className="pixel-font text-[6px] text-brand">Aa</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Stage</span>
              </button>
              <button
                onClick={() => addAtCenter('image')}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', 'image')}
                {...getHandlers('image')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Add Image block"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
                  <span className="text-[14px]">🖼️</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Image</span>
              </button>
```

- [ ] **Step 7: Render the ghost preview**

Immediately before the closing `</div>` of the canvas wrapper (after the `<TrashZone ... />` line, currently line 370, right before the wrapper's closing `</div>` on line 371), add:

```jsx
        {/* Ghost preview for a touch long-press drag, portalled to
            document.body: the toolbar lives inside React Flow's transformed
            viewport, so a `fixed` child positioned via clientX/clientY here
            would otherwise inherit that transform (scaled/offset) instead of
            tracking the real screen position (same reasoning as the portal
            in ImagePickerModal.jsx). */}
        {dragState && createPortal(
          <div
            className="fixed z-50 pointer-events-none flex items-center justify-center rounded-xl border-2 border-brand/60 bg-brand/20 backdrop-blur-sm"
            style={{ left: dragState.x - 24, top: dragState.y - 24, width: 48, height: 48 }}
          >
            <span className="pixel-font text-[7px] text-brand">{dragState.type}</span>
          </div>,
          document.body,
        )}
```

- [ ] **Step 8: Manual verification**

Run `npm run dev`, open `http://localhost:5173` in Chrome, open DevTools → Toggle device toolbar (Ctrl+Shift+M) to enable touch emulation, pick any mobile device preset, and reload.
- Tap a toolbar button quickly (no hold) → the existing click-to-add-at-centre behavior still fires (a block appears at the viewport centre). This confirms the hook doesn't break the existing tap path.
- Press and hold a toolbar button for over half a second, then drag your pointer over the canvas before releasing → a small ghost chip labeled with the block type follows your finger/pointer.
- Release over the canvas → a new block of that type is created at the release position (not the toolbar or the viewport centre).
- Press and hold, then release without moving → confirm a block is still created at that same spot (the long press itself is enough to arm the drag; movement is optional).
- Press and hold, then drag off-canvas and release → a block should still be created (position math doesn't depend on being over the canvas element, only on `screenToFlowPosition`).

- [ ] **Step 9: Commit**
  ```bash
  git add src/hooks/useLongPressDrag.js src/hooks/useLongPressDrag.test.js src/pages/RoadmapPage.jsx
  git commit -m "feat(roadmap): support touch long-press drag-and-drop to create blocks from the toolbar"
  ```

---

### Task 4: Node color — data model

**Files:**
- Modify: `src/stores/useRoadmapStore.js:56-66`
- Test: `src/stores/useRoadmapStore.test.js`

**Interfaces:**
- Produces: `addNode(type, position)` now seeds `data.color: null` on every new node (in addition to the existing `label`/`note`). `updateNodeData(id, { color })` (the existing generic action, unmodified) is how Task 5's UI will set it.
- Consumes: nothing new.
- Verified, no change needed: `src/utils/roadmapExport.js` — both `toSchema` (line 13: `data: n.data`) and `fromSchema` (line 48: `data: n.data`) copy the whole `data` object through as-is rather than enumerating specific keys, so `color` automatically round-trips through export/import/schema-v1 with zero changes to that file.

- [ ] **Step 1: Write the failing tests**

In `src/stores/useRoadmapStore.test.js`, immediately after the existing test `'updateNodeData patches data on the correct node'` (ends at line 56), insert:

```js
  it('addNode defaults data.color to null', () => {
    useRoadmapStore.getState().addNode('process')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes[0].data.color).toBeNull()
  })

  it('updateNodeData sets color on the correct node without touching others', () => {
    useRoadmapStore.getState().addNode('process')
    useRoadmapStore.getState().addNode('process')
    const [a, b] = useRoadmapStore.getState().nodes.map((n) => n.id)
    useRoadmapStore.getState().updateNodeData(a, { color: '#fff' })
    const { nodes } = useRoadmapStore.getState()
    expect(nodes.find((n) => n.id === a).data.color).toBe('#fff')
    expect(nodes.find((n) => n.id === b).data.color).toBeNull()
  })
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/stores/useRoadmapStore.test.js`
  Expected: FAIL on `addNode defaults data.color to null` — `nodes[0].data.color` is `undefined`, not `null`, because `addNode` doesn't set it yet.

- [ ] **Step 3: Write minimal implementation**

In `src/stores/useRoadmapStore.js`, replace lines 56–66:

```js
      addNode: (type, position = { x: 100, y: 100 }) =>
        set((state) => {
          const id = nextId()
          return {
            setpoint: id,
            nodes: [
              ...state.nodes,
              { id, type, position, data: { label: '', note: '' } },
            ],
          }
        }),
```

with:

```js
      addNode: (type, position = { x: 100, y: 100 }) =>
        set((state) => {
          const id = nextId()
          return {
            setpoint: id,
            nodes: [
              ...state.nodes,
              { id, type, position, data: { label: '', note: '', color: null } },
            ],
          }
        }),
```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/stores/useRoadmapStore.test.js`
  Expected: PASS (all tests in the file, including the 2 new ones)

- [ ] **Step 5: Commit**
  ```bash
  git add src/stores/useRoadmapStore.js src/stores/useRoadmapStore.test.js
  git commit -m "feat(roadmap): add color field to node data model"
  ```

---

### Task 5: Node color — picker UI on all 4 node types

**Files:**
- Modify: `src/components/roadmap/ProcessNode.jsx`
- Modify: `src/components/roadmap/ConditionNode.jsx`
- Modify: `src/components/roadmap/StageLabelNode.jsx`
- Modify: `src/components/roadmap/ImageNode.jsx`
- Test: `src/components/roadmap/ProcessNode.test.jsx`

**Interfaces:**
- Consumes: `data.color` (from Task 4) and `updateNodeData` (existing store action) on all 4 node components.
- Produces: nothing new for later tasks.

No color-picker library exists in this codebase (confirmed — `package.json` has no such dependency). This uses a native `<input type="color">`, visually hidden via Tailwind's built-in `sr-only` utility, triggered by a small colored-dot swatch button matching each node's existing hover-action-icon styling (`ImageNode.jsx`'s existing `Pencil` button is the closest precedent: `absolute ... w-6 h-6 rounded-lg bg-white/90 shadow ...`, adapted here to a small circular swatch). Each node applies `data.color` as an inline `style` override on top of its existing hardcoded Tailwind border classes (the Tailwind classes stay as the default/fallback when no color is chosen).

- [ ] **Step 1: Write the failing test**

Create `src/components/roadmap/ProcessNode.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const updateNodeData = vi.fn()
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData }),
}))
// ConnectionDot uses React Flow's useNodeConnections, which requires a
// <ReactFlowProvider> we don't have in this standalone render — mock it out,
// the same way its rendering is irrelevant to the color-picker behavior under test.
vi.mock('./ConnectionDot', () => ({ default: () => null }))

const { default: ProcessNode } = await import('./ProcessNode')

describe('ProcessNode color picker', () => {
  beforeEach(() => {
    updateNodeData.mockClear()
  })

  it('clicking the color swatch opens the native color input', () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    render(<ProcessNode id="n1" data={{ label: '', note: '', color: null }} selected={false} />)
    fireEvent.click(screen.getByLabelText('Choose block color'))
    expect(clickSpy).toHaveBeenCalledTimes(1)
    clickSpy.mockRestore()
  })

  it('changing the hidden color input patches data.color for this node', () => {
    render(<ProcessNode id="n1" data={{ label: '', note: '', color: null }} selected={false} />)
    const colorInput = document.querySelector('input[type="color"]')
    fireEvent.change(colorInput, { target: { value: '#a78bfa' } })
    expect(updateNodeData).toHaveBeenCalledWith('n1', { color: '#a78bfa' })
  })

  it('applies data.color as an inline borderColor style', () => {
    const { container } = render(<ProcessNode id="n1" data={{ label: '', note: '', color: '#ff0000' }} selected={false} />)
    expect(container.firstChild.style.borderColor).toBe('rgb(255, 0, 0)')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/components/roadmap/ProcessNode.test.jsx`
  Expected: FAIL — `screen.getByLabelText('Choose block color')` finds no element, because `ProcessNode.jsx` has no color swatch yet.

- [ ] **Step 3: Implement the color picker on all 4 node components**

Replace the entire contents of `src/components/roadmap/ProcessNode.jsx` with:

```jsx
import { useCallback, useRef } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import ConnectionDot from './ConnectionDot'

export default function ProcessNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const colorInputRef = useRef(null)

  const onLabelChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )
  const onNoteChange = useCallback(
    (e) => updateNodeData(id, { note: e.target.value }),
    [id, updateNodeData],
  )
  const onColorChange = useCallback(
    (e) => updateNodeData(id, { color: e.target.value }),
    [id, updateNodeData],
  )

  return (
    <div
      className={`relative w-32 h-32 rounded-2xl border-2 bg-white shadow-md p-2.5 flex flex-col gap-1 transition-all ${
        selected ? 'border-brand shadow-brand/30 shadow-lg' : 'border-brand/40'
      }`}
      style={data.color ? { borderColor: data.color } : undefined}
    >
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => colorInputRef.current?.click()}
        aria-label="Choose block color"
        className="nodrag absolute top-1 right-1 w-5 h-5 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: data.color ?? '#94a3b8' }}
      />
      <input
        ref={colorInputRef}
        type="color"
        value={data.color ?? '#94a3b8'}
        onChange={onColorChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <input
        className="w-full text-[12px] font-semibold text-ink bg-transparent outline-none placeholder:text-gray-300 focus:placeholder:text-gray-200"
        placeholder="Title"
        value={data.label}
        onChange={onLabelChange}
      />
      <textarea
        className="w-full flex-1 text-[10px] text-gray-500 bg-transparent outline-none resize-none placeholder:text-gray-300 focus:placeholder:text-gray-200 leading-tight"
        placeholder="Note (optional)"
        value={data.note}
        onChange={onNoteChange}
      />

      <ConnectionDot type="source" position={Position.Right} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
    </div>
  )
}
```

Replace the entire contents of `src/components/roadmap/ConditionNode.jsx` with:

```jsx
import { useCallback, useRef } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import ConnectionDot from './ConnectionDot'

export default function ConditionNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const colorInputRef = useRef(null)

  const onLabelChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )
  const onColorChange = useCallback(
    (e) => updateNodeData(id, { color: e.target.value }),
    [id, updateNodeData],
  )

  return (
    // Root stays un-rotated — React Flow computes handle offsets from this
    // element's bounding box, so a transform here would misplace the handles.
    <div className="relative w-32 h-32">
      {/* Visual diamond — rotation lives here, not on the root. The square is
          sized 1/√2 (70.71%) of the frame and centered so that once rotated 45°
          its four vertices land exactly on the frame's edge midpoints, where
          React Flow anchors the handles. This keeps the diamond's footprint at
          the full 128x128 (matching ProcessNode) and the dots flush on the edge. */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 bg-white shadow-md transition-all ${
          selected ? 'border-accent-pink shadow-accent-pink/30 shadow-lg' : 'border-accent-pink/50'
        }`}
        style={{ width: '70.71%', height: '70.71%', borderRadius: '8px', ...(data.color ? { borderColor: data.color } : {}) }}
      />

      {/* Centered text (root is upright, so no counter-rotation needed) */}
      <div className="absolute inset-0 flex items-center justify-center px-1">
        <input
          className="w-20 text-center text-[11px] font-semibold text-ink bg-transparent outline-none placeholder:text-gray-300"
          placeholder="Decision"
          value={data.label}
          onChange={onLabelChange}
        />
      </div>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => colorInputRef.current?.click()}
        aria-label="Choose block color"
        className="nodrag absolute top-1 right-1 w-5 h-5 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: data.color ?? '#f472b6' }}
      />
      <input
        ref={colorInputRef}
        type="color"
        value={data.color ?? '#f472b6'}
        onChange={onColorChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Handles map to the true diamond corners now that the root is upright */}
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
    </div>
  )
}
```

Replace the entire contents of `src/components/roadmap/StageLabelNode.jsx` with:

```jsx
import { useCallback, useRef } from 'react'
import { NodeResizer } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Stage Label — a freely-draggable text node used as a presentational scaffold.
// No connection handles; position carries no semantic meaning. Resizable by
// dragging its edges/corners when selected (React Flow's NodeResizer); the new
// width/height ride the existing node-change -> store -> Firestore sync.
export default function StageLabelNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const colorInputRef = useRef(null)

  const onChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )
  const onColorChange = useCallback(
    (e) => updateNodeData(id, { color: e.target.value }),
    [id, updateNodeData],
  )

  return (
    <>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={32} />
      <div
        className={`group w-full h-full min-w-[100px] px-4 py-1.5 rounded-full border flex items-center gap-2 transition-all ${
          selected
            ? 'border-brand bg-brand/10'
            : 'border-brand/30 bg-white/70 hover:border-brand/60'
        }`}
        style={data.color ? { borderColor: data.color } : undefined}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => colorInputRef.current?.click()}
          aria-label="Choose block color"
          className="nodrag shrink-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow"
          style={{ backgroundColor: data.color ?? '#94a3b8' }}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={data.color ?? '#94a3b8'}
          onChange={onColorChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          className="pixel-font text-[10px] font-bold text-brand bg-transparent outline-none text-center w-full placeholder:text-brand/30"
          placeholder="Stage name"
          value={data.label}
          onChange={onChange}
        />
      </div>
    </>
  )
}
```

In `src/components/roadmap/ImageNode.jsx`, replace line 1–7 (imports) and the component body's opening (lines 14–19):

```jsx
import { useRef, useState } from 'react'
import { Position } from '@xyflow/react'
import { ImageIcon, Pencil } from 'lucide-react'
import ImagePickerModal from './ImagePickerModal'
import ConnectionDot from './ConnectionDot'
import { computeImageOffset } from '../../utils/computeImageOffset'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Decorative connection points on all four sides — used to snap the image
// adjacent to flow blocks (lineless, like every other connection).
const SIDES = [Position.Top, Position.Bottom, Position.Left, Position.Right]
const DEFAULT_OFFSET = { x: 50, y: 50 }

export default function ImageNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Holds the last pointer position + the frame's screen size while panning.
  // Screen size (not the 128 world size) keeps the math correct under zoom.
  const dragRef = useRef(null)
```

with:

```jsx
import { useRef, useState } from 'react'
import { Position } from '@xyflow/react'
import { ImageIcon, Pencil } from 'lucide-react'
import ImagePickerModal from './ImagePickerModal'
import ConnectionDot from './ConnectionDot'
import { computeImageOffset } from '../../utils/computeImageOffset'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Decorative connection points on all four sides — used to snap the image
// adjacent to flow blocks (lineless, like every other connection).
const SIDES = [Position.Top, Position.Bottom, Position.Left, Position.Right]
const DEFAULT_OFFSET = { x: 50, y: 50 }

export default function ImageNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Holds the last pointer position + the frame's screen size while panning.
  // Screen size (not the 128 world size) keeps the math correct under zoom.
  const dragRef = useRef(null)
  const colorInputRef = useRef(null)
```

Then, after the existing `onPointerUp` function (currently lines 41–44):

```jsx
  const onPointerUp = (e) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }
```

add:

```jsx
  const onColorChange = (e) => updateNodeData(id, { color: e.target.value })
```

Then update the frame `<div>`'s className/style (currently lines 48–58):

```jsx
      <div
        className={`w-full h-full rounded-2xl border-2 bg-white shadow-md overflow-hidden flex items-center justify-center transition-all ${
          panning ? 'nodrag cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${selected ? 'border-brand shadow-brand/30 shadow-lg' : 'border-brand/40'}`}
        onClick={hasImage ? undefined : () => setPickerOpen(true)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="button"
        aria-label="Choose image"
      >
```

with:

```jsx
      <div
        className={`w-full h-full rounded-2xl border-2 bg-white shadow-md overflow-hidden flex items-center justify-center transition-all ${
          panning ? 'nodrag cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${selected ? 'border-brand shadow-brand/30 shadow-lg' : 'border-brand/40'}`}
        style={data.color ? { borderColor: data.color } : undefined}
        onClick={hasImage ? undefined : () => setPickerOpen(true)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="button"
        aria-label="Choose image"
      >
```

Finally, right after that frame `<div>`'s closing `</div>` (currently line 73, immediately before the "Re-open the picker" comment on line 75), add:

```jsx
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => colorInputRef.current?.click()}
        aria-label="Choose block color"
        className="nodrag absolute top-1 left-1 w-5 h-5 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: data.color ?? '#94a3b8' }}
      />
      <input
        ref={colorInputRef}
        type="color"
        value={data.color ?? '#94a3b8'}
        onChange={onColorChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
```

(The existing "Re-open the picker" `Pencil` button stays at `top-1 right-1`; the new color swatch sits at `top-1 left-1`, so the two never overlap.)

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/components/roadmap/ProcessNode.test.jsx`
  Expected: PASS (3 tests)

- [ ] **Step 5: Run the full suite to confirm the other 3 node components didn't regress anything**
  Run: `npm test`
  Expected: PASS — no existing test imports `ConditionNode.jsx`, `StageLabelNode.jsx`, or `ImageNode.jsx` directly today, so this is a regression check (e.g. `useRoadmapStore.test.js`, `roadmapExport.test.js`) rather than a check on the new color-picker UI in those 3 files — that's covered by Step 6's manual pass.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, open `http://localhost:5173`, go to the Roadmap page.
- Add one of each block type (Process, Condition, Stage, Image).
- On each block, find the small colored circle (swatch) — Process/Condition: top-right corner; Stage: left end of the pill; Image: top-left corner (top-right is the existing pencil "change image" button once an image is set).
- Click the swatch — the browser's native color picker opens.
- Pick a color — the block's border (Process/Image: rounded frame border; Condition: diamond border; Stage: pill border) immediately updates to that color.
- Reload the page — the chosen colors persist (round-trip through the Zustand `persist` + Firestore sync already wired for `nodes`).
- Export the roadmap (Download icon in the header) and open the downloaded JSON — confirm each node's `data.color` is present in the file.

- [ ] **Step 7: Commit**
  ```bash
  git add src/components/roadmap/ProcessNode.jsx src/components/roadmap/ProcessNode.test.jsx src/components/roadmap/ConditionNode.jsx src/components/roadmap/StageLabelNode.jsx src/components/roadmap/ImageNode.jsx
  git commit -m "feat(roadmap): add per-block color picker to all 4 node types"
  ```

---

### Task 6: Save/saved status — `onStatus` hook in `syncManager.js`

**Files:**
- Modify: `src/lib/syncManager.js:39-118`
- Modify: `src/stores/useRoadmapStore.js`
- Test: `src/lib/syncManager.test.js`
- Test: `src/stores/useRoadmapStore.test.js`

**Interfaces:**
- Produces: `createFirestoreSync(opts)` gains an optional `opts.onStatus(status)` callback (`status` is one of `'saving' | 'saved' | 'error'`), defaulting to a no-op so the other 5 existing instances (`tasksSync`, `portfolioSync`, `mapSync`, `inventorySync`, `farmSync`) are behaviorally unchanged. `useRoadmapStore` gains `syncStatus: 'idle'` state and a `setSyncStatus(status)` action, consumed by Task 7's UI.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing tests**

In `src/stores/useRoadmapStore.test.js`, add (anywhere top-level inside the `describe` block, e.g. right after the `'setSelection stores the array of selected ids'` test):

```js
  it('syncStatus starts idle', () => {
    expect(useRoadmapStore.getState().syncStatus).toBe('idle')
  })

  it('setSyncStatus updates syncStatus', () => {
    useRoadmapStore.getState().setSyncStatus('saving')
    expect(useRoadmapStore.getState().syncStatus).toBe('saving')
    useRoadmapStore.getState().setSyncStatus('saved')
    expect(useRoadmapStore.getState().syncStatus).toBe('saved')
  })
```

Also update the `beforeEach` reset (currently `useRoadmapStore.setState({ nodes: [], edges: [], setpoint: null, selection: [] })`) to also reset `syncStatus`:

```js
  beforeEach(() => {
    useRoadmapStore.setState({ nodes: [], edges: [], setpoint: null, selection: [], syncStatus: 'idle' })
  })
```

In `src/lib/syncManager.test.js`, inside the existing `describe('SyncManager (roadmap instance)', ...)` block (after the `'loads Firestore roadmap into the store when cloud data exists'` test, before its closing `})`), add:

```js
  it('sets syncStatus to saving then saved around a successful push', async () => {
    useRoadmapStore.setState({ nodes: [], edges: [], syncStatus: 'idle' })
    let resolveSetDoc
    setDoc.mockReturnValue(new Promise((resolve) => { resolveSetDoc = resolve }))

    const pushPromise = syncRoadmapToFirestore('uid-123')
    expect(useRoadmapStore.getState().syncStatus).toBe('saving')

    resolveSetDoc()
    await pushPromise

    expect(useRoadmapStore.getState().syncStatus).toBe('saved')
  })

  it('sets syncStatus to error when the push fails', async () => {
    useRoadmapStore.setState({ nodes: [], edges: [], syncStatus: 'idle' })
    setDoc.mockRejectedValue(new Error('network down'))

    await syncRoadmapToFirestore('uid-123')

    expect(useRoadmapStore.getState().syncStatus).toBe('error')
  })
```

- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/stores/useRoadmapStore.test.js src/lib/syncManager.test.js`
  Expected: FAIL — `syncStatus` is `undefined` (no such state yet) and `setSyncStatus` is not a function.

- [ ] **Step 3: Write minimal implementation**

In `src/stores/useRoadmapStore.js`, add `syncStatus: 'idle',` to the initial state object (right after `selection: [],` on line 20):

```js
      nodes: [],
      edges: [],
      setpoint: null,
      selection: [],
      syncStatus: 'idle',
```

and add a `setSyncStatus` action right after the existing `setSelection` action (line 23):

```js
      setSelection: (ids) => set({ selection: ids }),
      setSyncStatus: (status) => set({ syncStatus: status }),
```

In `src/lib/syncManager.js`, update the `createFirestoreSync` signature (line 39) and its JSDoc (lines 25-38) and the `push` function (lines 48-55):

Replace:

```js
/**
 * Build a debounced Firestore sync for a single Zustand store.
 *
 * @param {object}   opts
 * @param {object}   opts.store      Zustand store (has getState/setState/subscribe)
 * @param {string}   opts.logName    prefix for console.error logging
 * @param {(state) => object} opts.toDoc     doc fields to merge-write (call serverTimestamp() here)
 * @param {(data) => object}  opts.fromDoc   store.setState updates from a Firestore doc ({} = none)
 * @param {(state, prev) => boolean} opts.changed   whether a relevant slice changed
 * @param {(data) => boolean} opts.needsSeed  whether to push local up on first migration
 * @param {(uid) => DocumentRef} [opts.ref]   doc ref factory — defaults to refs.user
 * @param {(state, uid) => boolean} [opts.guard]  extra condition checked before debouncing
 * @returns {{ push(uid): Promise<void>, hydrate(uid): Promise<void>, setSyncUser(uid): void }}
 */
export function createFirestoreSync({ store, logName, toDoc, fromDoc, changed, needsSeed, ref, guard }) {
  const getRef = ref ?? refs.user

  let currentUid = null   // latest signed-in uid; null when logged out
  let subscribed = false  // store subscription is set up once
  let timer = null        // debounce handle for auto-sync writes
  let suppress = false    // skip auto-sync while hydrating from Firestore

  // Write the store's slice into the target doc; merge keeps other fields.
  async function push(uid) {
    if (!uid) return
    try {
      await setDoc(getRef(uid), toDoc(store.getState()), { merge: true })
    } catch (error) {
      console.error(`[${logName}] push failed:`, error)
    }
  }
```

with:

```js
/**
 * Build a debounced Firestore sync for a single Zustand store.
 *
 * @param {object}   opts
 * @param {object}   opts.store      Zustand store (has getState/setState/subscribe)
 * @param {string}   opts.logName    prefix for console.error logging
 * @param {(state) => object} opts.toDoc     doc fields to merge-write (call serverTimestamp() here)
 * @param {(data) => object}  opts.fromDoc   store.setState updates from a Firestore doc ({} = none)
 * @param {(state, prev) => boolean} opts.changed   whether a relevant slice changed
 * @param {(data) => boolean} opts.needsSeed  whether to push local up on first migration
 * @param {(uid) => DocumentRef} [opts.ref]   doc ref factory — defaults to refs.user
 * @param {(state, uid) => boolean} [opts.guard]  extra condition checked before debouncing
 * @param {(status: 'saving'|'saved'|'error') => void} [opts.onStatus]  save-status callback, defaults to a no-op — only the roadmap instance passes one today
 * @returns {{ push(uid): Promise<void>, hydrate(uid): Promise<void>, setSyncUser(uid): void }}
 */
export function createFirestoreSync({ store, logName, toDoc, fromDoc, changed, needsSeed, ref, guard, onStatus }) {
  const getRef = ref ?? refs.user
  const emitStatus = onStatus ?? (() => {})

  let currentUid = null   // latest signed-in uid; null when logged out
  let subscribed = false  // store subscription is set up once
  let timer = null        // debounce handle for auto-sync writes
  let suppress = false    // skip auto-sync while hydrating from Firestore

  // Write the store's slice into the target doc; merge keeps other fields.
  async function push(uid) {
    if (!uid) return
    emitStatus('saving')
    try {
      await setDoc(getRef(uid), toDoc(store.getState()), { merge: true })
      emitStatus('saved')
    } catch (error) {
      console.error(`[${logName}] push failed:`, error)
      emitStatus('error')
    }
  }
```

Then wire `onStatus` for the roadmap instance only. Replace lines 109-118:

```js
// ── Roadmap ──────────────────────────────────────────────────────────────────
const roadmapSync = createFirestoreSync({
  store: useRoadmapStore,
  logName: 'syncRoadmap',
  toDoc: ({ nodes, edges }) => ({ roadmap: { nodes, edges }, roadmapUpdatedAt: serverTimestamp() }),
  fromDoc: (data) =>
    data.roadmap ? { nodes: data.roadmap.nodes ?? [], edges: data.roadmap.edges ?? [] } : {},
  changed: (s, p) => s.nodes !== p.nodes || s.edges !== p.edges,
  needsSeed: (data) => !data.roadmap,
})
```

with:

```js
// ── Roadmap ──────────────────────────────────────────────────────────────────
const roadmapSync = createFirestoreSync({
  store: useRoadmapStore,
  logName: 'syncRoadmap',
  toDoc: ({ nodes, edges }) => ({ roadmap: { nodes, edges }, roadmapUpdatedAt: serverTimestamp() }),
  fromDoc: (data) =>
    data.roadmap ? { nodes: data.roadmap.nodes ?? [], edges: data.roadmap.edges ?? [] } : {},
  changed: (s, p) => s.nodes !== p.nodes || s.edges !== p.edges,
  needsSeed: (data) => !data.roadmap,
  onStatus: (status) => useRoadmapStore.getState().setSyncStatus(status),
})
```

No other `createFirestoreSync` call site (`tasksSync`, `portfolioSync`, `mapSync`, `inventorySync`, `farmSync`) is touched — each keeps using the default no-op `onStatus`.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/stores/useRoadmapStore.test.js src/lib/syncManager.test.js`
  Expected: PASS (all tests in both files, including the 4 new ones)

- [ ] **Step 5: Run the full suite to confirm the other 5 sync instances are unaffected**
  Run: `npm test`
  Expected: PASS — in particular every existing assertion in `syncManager.test.js` for the tasks/portfolio/map instances (which never pass `onStatus`) keeps passing unchanged, since `emitStatus` is a no-op for them.

- [ ] **Step 6: Commit**
  ```bash
  git add src/lib/syncManager.js src/stores/useRoadmapStore.js src/stores/useRoadmapStore.test.js src/lib/syncManager.test.js
  git commit -m "feat(roadmap): add onStatus hook to createFirestoreSync, wire to Roadmap store"
  ```

---

### Task 7: Save/saved status indicator in `RoadmapPage.jsx`

**Files:**
- Modify: `src/pages/RoadmapPage.jsx`

**Interfaces:**
- Consumes: `syncStatus` from `useRoadmapStore` (Task 6).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Read `syncStatus` and auto-hide `'saved'`**

In `src/pages/RoadmapPage.jsx`, add the import of `useEffect` — replace line 1:

```js
import { useCallback, useMemo, useRef, useState } from 'react'
```

with:

```js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
```

After the existing store-selector lines (after `const importRoadmap = useRoadmapStore((s) => s.importRoadmap)` on line 58), add:

```js
  const syncStatus = useRoadmapStore((s) => s.syncStatus)
  const setSyncStatus = useRoadmapStore((s) => s.setSyncStatus)

  // "Saved" is a transient confirmation — auto-revert to idle (hiding the
  // indicator) after 2s so it doesn't sit on screen forever.
  useEffect(() => {
    if (syncStatus !== 'saved') return
    const timer = setTimeout(() => setSyncStatus('idle'), 2000)
    return () => clearTimeout(timer)
  }, [syncStatus, setSyncStatus])
```

- [ ] **Step 2: Render the indicator**

Add the indicator inside the canvas wrapper, as a `Panel` positioned top-right so it doesn't collide with the top-center toolbar. Immediately after the opening `<Background gap={20} color="#e2e8f0" />` and `<Controls />` lines (currently lines 278-279, before the `{/* Tool palette */}` comment on line 281), add:

```jsx
          {/* Save/saved status indicator */}
          {syncStatus !== 'idle' && (
            <Panel position="top-right">
              <div className="mt-2 mr-2 px-3 py-1.5 rounded-xl bg-white shadow-md border border-gray-100">
                {syncStatus === 'saving' && (
                  <span className="pixel-font text-[8px] text-gray-400">Saving...</span>
                )}
                {syncStatus === 'saved' && (
                  <span className="pixel-font text-[8px] text-green-500">Saved</span>
                )}
                {syncStatus === 'error' && (
                  <span className="pixel-font text-[8px] text-red-500">Save failed</span>
                )}
              </div>
            </Panel>
          )}
```

- [ ] **Step 3: Manual verification**

This state is driven by the real debounced Firestore sync (Task 6), so it requires a signed-in session with Firestore configured (same as any other Roadmap sync behavior already in the app — no mocking).

Run `npm run dev`, sign in, open the Roadmap page.
- Add or edit a block. Within ~1 second (the existing debounce), the indicator should read "Saving..." briefly, then switch to "Saved" (green), then disappear after ~2 seconds.
- Turn off network access (DevTools → Network → Offline), edit another block, wait past the debounce — the indicator should show "Save failed" (red) and stay visible (no auto-hide for the error state).
- Restore network access and edit again — confirm the indicator returns to the normal Saving → Saved → hidden cycle.

- [ ] **Step 4: Commit**
  ```bash
  git add src/pages/RoadmapPage.jsx
  git commit -m "feat(roadmap): show a save/saved status indicator wired to the debounced Firestore sync"
  ```

---

### Task 8: Remove the Timeline ruler

**Files:**
- Modify: `src/pages/RoadmapPage.jsx`
- Delete: `src/components/roadmap/TimelineRuler.jsx`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing — pure removal. Verified via Grep that `TimelineRuler` is imported only by `src/pages/RoadmapPage.jsx`, and that `viewport`/`onMove`/`onScrub` in `RoadmapPage.jsx` are used only to feed the ruler (not by any other feature in that file — `rfRef` is used elsewhere and is untouched).

- [ ] **Step 1: Remove the import**

In `src/pages/RoadmapPage.jsx`, delete line 21:

```js
import TimelineRuler from '../components/roadmap/TimelineRuler'
```

- [ ] **Step 2: Remove the viewport state and its handlers**

Delete lines 132-140:

```js
  // Timeline ruler stays in lockstep with the canvas viewport (pan + zoom).
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })
  const rfRef = useRef(null)
  const canvasRef = useRef(null)
  const onMove = useCallback((_event, vp) => setViewport(vp), [])
  // Ruler scrubbed -> pan the canvas horizontally to match.
  const onScrub = useCallback((x) => {
    rfRef.current?.setViewport({ ...rfRef.current.getViewport(), x })
  }, [])
```

Replace with (keeping the two refs, which are used elsewhere in the file):

```js
  const rfRef = useRef(null)
  const canvasRef = useRef(null)
```

- [ ] **Step 3: Remove the `onMove` prop from `<ReactFlow>`**

Delete line 274:

```jsx
          onMove={onMove}
```

(This line currently sits between the `}}` closing `onInit` and the `connectionMode="loose"` line — after removal, `onInit={...}}` is immediately followed by `connectionMode="loose"`.)

- [ ] **Step 4: Remove the `<TimelineRuler>` render**

Delete line 367 (and the comment above it, line 366):

```jsx
        {/* Full-width time ruler, synced both ways with the viewport */}
        <TimelineRuler viewport={viewport} onScrub={onScrub} />
```

- [ ] **Step 5: Delete the component file**
  Delete `src/components/roadmap/TimelineRuler.jsx`.

- [ ] **Step 6: Run the full suite to confirm nothing references the removed code**
  Run: `npm test`
  Expected: PASS — no test file imports `TimelineRuler.jsx` (confirmed via Grep before starting this task), so this is a pure regression check.

- [ ] **Step 7: Manual verification**

Run `npm run dev`, open the Roadmap page.
- Confirm no ruler strip renders at the bottom of the canvas.
- Pan the canvas (drag empty space) and zoom (scroll wheel / pinch) — both should work exactly as before, since `rfRef`, `onNodeClick`'s `setCenter` call, and `addAtCenter`'s `screenToFlowPosition` call are untouched.

- [ ] **Step 8: Commit**
  ```bash
  git add src/pages/RoadmapPage.jsx
  git rm src/components/roadmap/TimelineRuler.jsx
  git commit -m "refactor(roadmap): remove the Timeline ruler"
  ```

---

### Task 9: Investigate and address the cursor-jump-to-end bug

**Files:**
- Test: `src/components/roadmap/ProcessNode.cursor.test.jsx` (new — regression guard, see finding below)
- Modify: none confirmed yet — see the empirical finding in Step 1 before any fix is attempted

**Interfaces:** none new.

**Investigation already performed for this plan (do not re-derive — read this before doing anything else):** two reproduction attempts were run against the *current* (pre-Task-4/5) `ProcessNode.jsx` + `useRoadmapStore.js` code, both matching the exact data flow described in the bug report (typing into the controlled `<input>`, `onChange` calling `updateNodeData`, which produces a brand-new `data` object and a brand-new top-level `nodes` array on every keystroke — exactly what the real store does):

1. An isolated harness (`ProcessNode` alone, with a local `useState`-backed `data` prop standing in for the store) — typing a character mid-string via `fireEvent.change` with explicit `selectionStart`/`selectionEnd` did **not** reset the caret to the end of the string.
2. The same scenario rendered inside a real `<ReactFlowProvider><ReactFlow nodes={...} nodeTypes={{ process: ProcessNode }} onNodesChange={...} /></ReactFlowProvider>` tree (with `ResizeObserver` stubbed, since jsdom has no native implementation and `@xyflow/react` requires one) — also did **not** reset the caret.

Both attempts passed (i.e. did not reproduce the reported bug) under jsdom. Per this plan's own instruction not to fabricate a fix for a bug that doesn't reproduce: **do not commit to hypothesis (a) or (b) from the original bug description (missing `React.memo`, or missing local input buffering) without first reproducing the bug yourself in a real browser**, because the isolated-component and real-React-Flow-reconciliation explanations were both ruled out by the tests above. The likely remaining causes are environmental/timing issues that jsdom cannot exercise (React 19 `StrictMode` — confirmed enabled in `src/main.jsx` — double-invoking effects; a race between the 1-second-debounced Firestore push/hydrate cycle in `syncManager.js` and an in-flight keystroke; or IME/composition-event handling), none of which a synthetic `fireEvent.change` can trigger.

- [ ] **Step 1: Reproduce the bug manually in a real browser to gather real evidence**

Run `npm run dev`, open `http://localhost:5173` in an actual browser (not a jsdom test), sign in, open the Roadmap page, add a Process block, type "hello world" into its title field, then:
- Click (or use arrow keys) to place the caret between "hello" and " world" (i.e. right after the "o" in "hello", before the space).
- Type a character, e.g. "X".
- Observe: does the caret land right after the "X" (correct) or jump to the end of the full string (the reported bug)?

Repeat the same steps on the Condition block's decision field and the Stage Label's name field (the spec calls out that these have the identical input pattern and likely the identical bug).

Record, for whichever field(s) actually reproduce the bug:
- Does it happen on every keystroke, or only sometimes (e.g. only right after the debounced Firestore push fires — check the Network tab for a `setDoc`-triggered request around the same time)?
- Does disabling `<StrictMode>` in `src/main.jsx` (temporarily, for this investigation only — revert after) change the behavior?
- Does it happen with a fresh, empty Roadmap with only one block (ruling out interference from `onNodesChange`/`applyNodeChanges` reconciling a large `nodes` array), or only with many blocks on the board?

- [ ] **Step 2: Branch on what Step 1 finds**

**If the bug reproduces reliably and correlates with the Firestore debounce window (a `hydrate` re-entry overwriting the in-progress edit):** the real fix is in `syncManager.js`'s `hydrate`/`suppress` handling, not in the node components — file that as a *new*, separate investigation (do not guess at a `syncManager.js` fix here; this plan's scope and its pre-verified `onStatus` change in Task 6 assumed `hydrate` behavior is unchanged, so a fix here needs its own reproducing test against `syncManager.js`, following the mocking patterns already in `src/lib/syncManager.test.js`).

**If the bug reproduces reliably and disabling `StrictMode` fixes it:** the fix is likely `React.memo` on `ProcessNode`/`ConditionNode`/`StageLabelNode` with a custom comparator (comparing `id`, `data`, and `selected`) to stop an extra render pass from fighting the browser's native caret positioning — write a reproducing test using `render` + `act` from `@testing-library/react` with `React.StrictMode` explicitly wrapping the test's `render()` call (jsdom + RTL *can* exercise `StrictMode`'s double-invoke behavior, unlike the two attempts already ruled out above, since neither wrapped its render in `<StrictMode>`). Confirm this new test fails first, then add `React.memo` and confirm it passes, then apply the identical fix to `ConditionNode.jsx` and `StageLabelNode.jsx`.

**If the bug does not reproduce at all in a real browser today:** it may already be fixed by unrelated changes since the bug was filed, or it may be intermittent/hardware-specific. Do not fabricate a fix. Instead:

- [ ] **Step 3 (only if Step 1 found no reproduction): add a regression-guard test and stop here**

Create `src/components/roadmap/ProcessNode.cursor.test.jsx`:

```jsx
// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let updateNodeDataSpy
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData: (...args) => updateNodeDataSpy(...args) }),
}))
vi.mock('./ConnectionDot', () => ({ default: () => null }))

const { default: ProcessNode } = await import('./ProcessNode')

// Regression guard: reproduces the exact data flow described in the reported
// cursor-jump-to-end bug (typing mid-string in a controlled input whose value
// comes from a brand-new object on every keystroke, matching how
// useRoadmapStore.updateNodeData + RoadmapPage really re-render this
// component). This passed when written (see Task 9 in
// docs/superpowers/plans/2026-07-04-roadmap-canvas-interaction.md for the
// full investigation) — if it ever starts failing, that's a real regression
// to fix, not a flake to skip.
function Harness({ initialLabel }) {
  const [data, setData] = useState({ label: initialLabel, note: '' })
  updateNodeDataSpy = (id, patch) => setData((d) => ({ ...d, ...patch }))
  return <ProcessNode id="n1" data={data} selected={false} />
}

describe('ProcessNode — caret position while editing mid-word', () => {
  it('typing a character after moving the caret inserts it there, not at the end', () => {
    render(<Harness initialLabel="hello world" />)
    const input = screen.getByPlaceholderText('Title')
    input.setSelectionRange(6, 6)
    fireEvent.change(input, { target: { value: 'hello Xworld', selectionStart: 7, selectionEnd: 7 } })
    expect(input.value).toBe('hello Xworld')
    expect(input.selectionStart).toBe(7)
  })
})
```

Run: `npx vitest run src/components/roadmap/ProcessNode.cursor.test.jsx`
Expected: PASS (this documents the verified-passing behavior as a regression guard; it does not fix anything because Step 1 found nothing to fix).

Commit:
```bash
git add src/components/roadmap/ProcessNode.cursor.test.jsx
git commit -m "test(roadmap): add cursor-position regression guard for ProcessNode's title input"
```

**Do not mark this task's investigation "done" if Step 1 reproduces the bug** — in that case, follow Step 2's applicable branch, write that branch's reproducing test first (confirm it fails), implement the targeted fix, confirm the test passes, apply the same fix to `ConditionNode.jsx` and `StageLabelNode.jsx` with their own reproducing tests, then commit each in its own logical commit (matching this repo's preference for staged commits, per project conventions).

---

## Self-Review Notes

- **Scope coverage:** item 1 (desktop drag-and-drop) → Task 2; item 1.1 (mobile long-press drag-and-drop) → Task 3; item 1.2 (node color) → Tasks 4–5; item 1.3 (save/saved indicator) → Tasks 6–7; item 7 (remove Timeline ruler) → Task 8; item 10 (cursor-jump bug) → Task 9. Task 1 is shared infrastructure for items 1 and 1.1.
- **Empirical verification performed, not assumed:** before writing this plan, the `computeDropPosition`/color-picker code in Tasks 1, 4, and 5 were run against throwaway copies of the real files (then deleted, leaving the repo unchanged) to confirm the tests as written actually pass against the implementations as written. The cursor-jump bug in Task 9 was investigated the same way — twice — and **did not reproduce** under jsdom with the realistic data flow (a new `data`/`nodes` object per keystroke, both in isolation and inside real `@xyflow/react` reconciliation), which is why Task 9 does not prescribe a specific code fix and instead requires a real-browser reproduction step before any fix is attempted, per this plan's own "verify, don't assume" instruction.
- **Judgment calls made where the spec was ambiguous:**
  1. *Color swatch placement*: the spec didn't say where on each block the swatch should go. Chose corners/pill-ends that don't collide with each node's existing connection dots or (for `ImageNode`) the existing pencil button — Process/Condition: top-right; Image: top-left (pencil keeps top-right); Stage Label: inline at the pill's left end (its height is too small for a floating absolute corner button at all zoom/resize states).
  2. *`addNode`'s "accept/default" the color field*: interpreted literally as "the default `data` object `addNode` creates now includes `color: null`," not as a new positional/options parameter on `addNode(type, position)` — `updateNodeData(id, { color })` (already generic) is how color actually gets set, so no new parameter was needed.
  3. *`syncStatus` persistence*: `useRoadmapStore` uses `persist` with no `partialize`, so `syncStatus` will be written to `localStorage` like every other field. This means a tab closed mid-save could reload showing a stale `'saving'`/`'error'` status. This plan does not add a `partialize` to fix that (out of scope for "add a status indicator") — flagging it here so Cursor/reviewers know it's a known, accepted edge case rather than an oversight.
  4. *Error-state auto-hide*: the spec only specified auto-hiding `'saved'` after ~2s; `'error'` is left visible indefinitely (until the next successful save) since silently hiding a failed save seemed like the wrong default — flagged in Task 7's manual verification step.
- **No placeholders:** every step has literal, complete code or an exact command; no "TBD" or "similar to Task N" shortcuts.
- **Naming consistency check:** `setSyncStatus` (Task 6) is the exact name used in Task 7's `useRoadmapStore((s) => s.setSyncStatus)` and nowhere renamed. `computeDropPosition` (Task 1) is the exact name imported in both Task 2 and Task 3. `useLongPressDrag` (Task 3) returns `{ dragState, getHandlers }` — the exact shape consumed by `RoadmapPage.jsx` in that same task (no later task renames these).
