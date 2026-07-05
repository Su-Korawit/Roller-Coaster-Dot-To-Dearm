# Profile ↔ Roadmap Integration Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task, OR hand this file to Cursor IDE to implement directly, checking off each `- [ ]`. Claude Code (terminal) should review/check the diff after each task per this repo's CLAUDE.md collaboration model.

**Goal:** Bridge the two currently-unrelated data models — Roadmap (`useRoadmapStore`, a React-Flow canvas) and Journeys (`useUserStore.journeys`) — with a new `start` Roadmap node type that two-way-binds to one Journey item, plus a live embedded Roadmap preview surfaced from the Profile panel.

**Architecture:**
- A new `StartNode` component reads/writes a `journeyRef: { category, id }` pointer stored on the node's own `data` (persisted via the existing `roadmapSync` Firestore sync — no schema changes needed there since `toSchema`/`fromSchema` already copy `data` opaquely). It resolves and displays the *live* Journey item by reading `useUserStore.journeys` directly (no copy), and writes progress back through the existing `updateJourneyProgress` action — no new Journey-side store actions are added.
- The Roadmap node-type registry (`process`/`condition`/`stageLabel`/`image`/`start` → component) is extracted from `RoadmapPage.jsx` into a standalone `src/components/roadmap/nodeTypes.js` module. This is a judgment call made in this plan (not explicitly requested): `RoadmapPage.jsx` is lazy-loaded from `HomePage.jsx` specifically to keep its bundle out of the initial load, and the new Profile-embedded preview needs the exact same type→component map without pulling in the rest of `RoadmapPage.jsx` (toolbar, import/export, trash zone, etc.) or breaking that lazy boundary. Both `RoadmapPage.jsx` and the new `RoadmapPreview.jsx` import this one file, so a future new block type is registered once.
- `ProfilePanel.jsx` renders a lazy-loaded `RoadmapPreview` (own `<ReactFlowProvider>`, all interaction props disabled) reading straight from `useRoadmapStore`. Tapping it opens the real Roadmap overlay — the callback is threaded down from `HomePage.jsx` as `onOpenRoadmap`, and closes Profile first (Profile is `z-50`, the Roadmap overlay is `z-40`, so both open at once would hide the Roadmap behind Profile).

**Tech Stack:** React, Zustand, `@xyflow/react` (React Flow), Tailwind v4, Vitest + Testing Library (jsdom).

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- **Firestore writes** — nothing in this plan writes Firestore directly. `roadmapSync` (nodes/edges, copies `data` opaquely) and `portfolioSync` (`journeys`, whole-object) in `src/lib/syncManager.js` already cover every mutation this plan makes (`updateNodeData` on a `start` node, `updateJourneyProgress`/`updateJourneyItem` on a journey item) with zero changes to `syncManager.js`. Do not add a new sync entry.
- **Firebase paths** — not touched by this plan.
- **Do not add new `useUserStore` actions.** `updateJourneyProgress(key, id, noteString, gainedPercent)` and `updateJourneyItem(key, id, updates)` already do everything the Start block needs.
- **Progress-note wording (explicit choice):** every write-back from a Start block uses the literal note string `` `+${PROGRESS_GAIN}% via Roadmap` `` where `PROGRESS_GAIN = 10`, e.g. `"+10% via Roadmap"`. This mirrors the existing convention in `src/services/aiTasks.js` (`gainedPercent = task.estimatedProgress ?? 10`) — 10 is this app's default progress increment.
- **React Flow handles** — rotate only the inner element, never the root node `<div>` (breaks handle offset math). `StartNode` follows this exactly like `ProcessNode`/`ConditionNode`.
- Every function/prop/action name below is used identically across every task: `journeyRef`, `resolveLinkedJourney`, `updateNodeData`, `updateJourneyProgress`, `nodeTypes`, `RoadmapPreview`, `onOpenRoadmap`, `PROGRESS_GAIN`.

---

### Task 1: `resolveLinkedJourney` pure utility

**Files:**
- Create: `src/utils/resolveLinkedJourney.js`
- Create: `src/utils/resolveLinkedJourney.test.js`

**Interfaces:**
- Produces: `resolveLinkedJourney(journeyRef, journeys) -> item | null`. Pure, store-agnostic — `StartNode` (Task 4) calls it with whatever `journeys` slice it reads from `useUserStore`. Returns `null` when `journeyRef` is `null`, when the category is missing/empty, or when no item in that category matches `journeyRef.id` (the "linked journey was removed from Profile" case).

- [ ] **Step 1: Write the failing test** — create `src/utils/resolveLinkedJourney.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { resolveLinkedJourney } from './resolveLinkedJourney'

const journeys = {
  mastery: [{ id: 'm1', title: 'Learn React', progress: 40 }],
  career: [{ id: 'c1', title: 'Get internship', progress: 10 }],
  university: [],
}

describe('resolveLinkedJourney', () => {
  it('returns null when journeyRef is null', () => {
    expect(resolveLinkedJourney(null, journeys)).toBeNull()
  })

  it('resolves the live item for a valid ref', () => {
    const item = resolveLinkedJourney({ category: 'mastery', id: 'm1' }, journeys)
    expect(item).toEqual({ id: 'm1', title: 'Learn React', progress: 40 })
  })

  it('returns null when the referenced item was deleted', () => {
    const item = resolveLinkedJourney({ category: 'mastery', id: 'gone' }, journeys)
    expect(item).toBeNull()
  })

  it('returns null when the referenced category is empty', () => {
    const item = resolveLinkedJourney({ category: 'university', id: 'anything' }, journeys)
    expect(item).toBeNull()
  })

  it('reflects live progress updates without needing a copy', () => {
    const updated = { ...journeys, mastery: [{ id: 'm1', title: 'Learn React', progress: 90 }] }
    const item = resolveLinkedJourney({ category: 'mastery', id: 'm1' }, updated)
    expect(item.progress).toBe(90)
  })
})
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/utils/resolveLinkedJourney.test.js`
Expected: FAIL — `Failed to resolve import "./resolveLinkedJourney"` (module does not exist yet).

- [ ] **Step 3: Minimal implementation** — create `src/utils/resolveLinkedJourney.js`:

```js
// Resolves a Roadmap Start block's journeyRef against the live useUserStore
// journeys data. Pure and store-agnostic so it can be unit-tested without
// mounting React or wiring a store — StartNode calls it with whatever
// `journeys` slice it reads from useUserStore.
//
// Returns the live journey item, or null if there is no ref, or if the
// referenced category/id no longer exists (e.g. the item was deleted from
// Profile after being linked).
export function resolveLinkedJourney(journeyRef, journeys) {
  if (!journeyRef) return null
  const list = journeys?.[journeyRef.category]
  if (!Array.isArray(list)) return null
  return list.find((item) => item.id === journeyRef.id) || null
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npx vitest run src/utils/resolveLinkedJourney.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Manual verification** — none needed, pure function.

- [ ] **Step 6: Commit**

```bash
git add src/utils/resolveLinkedJourney.js src/utils/resolveLinkedJourney.test.js
git commit -m "feat(roadmap): add resolveLinkedJourney utility for Start-block journey lookup"
```

---

### Task 2: `useRoadmapStore` — `start` type support in `addNode` + block sizing

**Files:**
- Modify: `src/stores/useRoadmapStore.js`
- Modify: `src/stores/useRoadmapStore.test.js`
- Modify: `src/utils/computeSnapPosition.js`
- Modify: `src/utils/computeSnapPosition.test.js`

**Interfaces:**
- `addNode(type, position)` gains a `type === 'start'` branch producing initial `data: { journeyRef: null }` (every other type keeps today's `data: { label: '', note: '' }`).
- `BLOCK_SIZES.start = { w: 160, h: 148 }` — sizing judgment call: a Start block shows a title, a progress bar, and a button (richer than the plain 128×128 Process/Condition/Image blocks), so it gets a taller footprint. `w: 160` matches Tailwind's `w-40` used by `StartNode` in Task 4.

- [ ] **Step 1: Write the failing tests**

Add to `src/stores/useRoadmapStore.test.js` (after the existing `'addNode creates an image-typed node'` test):

```js
  it('addNode creates a start-typed node with a null journeyRef', () => {
    useRoadmapStore.getState().addNode('start')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes[0].type).toBe('start')
    expect(nodes[0].data).toEqual({ journeyRef: null })
  })
```

Add to `src/utils/computeSnapPosition.test.js` (after the `'uses measured dimensions...'` test):

```js
  it('uses the start block size fallback when unmeasured', () => {
    const source = { type: 'start', position: { x: 0, y: 0 } }
    const target = { type: 'process', position: { x: 500, y: 500 } }
    // right exit: x = 0 + 160 = 160; y = 0 + 148/2 - 128/2 = 74 - 64 = 10
    expect(computeSnapPosition(source, target, 'right')).toEqual({ x: 160, y: 10 })
  })
```

- [ ] **Step 2: Run them, confirm they fail**

Run: `npx vitest run src/stores/useRoadmapStore.test.js src/utils/computeSnapPosition.test.js`
Expected: FAIL — the new `useRoadmapStore` test gets `data: { label: '', note: '' }` instead of `{ journeyRef: null }`; the new `computeSnapPosition` test gets `{ x: 160, y: 46 }` (falls back to the generic `160`/`80` defaults, not `160`/`148`).

- [ ] **Step 3: Implementation**

In `src/utils/computeSnapPosition.js`, add the `start` entry to `BLOCK_SIZES`:

```js
export const BLOCK_SIZES = {
  process: { w: 128, h: 128 },
  condition: { w: 128, h: 128 },
  image: { w: 128, h: 128 },
  stageLabel: { w: 120, h: 40 },
  start: { w: 160, h: 148 },
}
```

In `src/stores/useRoadmapStore.js`, change `addNode`:

```js
      addNode: (type, position = { x: 100, y: 100 }) =>
        set((state) => {
          const id = nextId()
          const data = type === 'start' ? { journeyRef: null } : { label: '', note: '' }
          return {
            setpoint: id,
            nodes: [
              ...state.nodes,
              { id, type, position, data },
            ],
          }
        }),
```

- [ ] **Step 4: Run them, confirm they pass**

Run: `npx vitest run src/stores/useRoadmapStore.test.js src/utils/computeSnapPosition.test.js`
Expected: PASS.

- [ ] **Step 5: Manual verification** — none yet (no UI wired to `addNode('start')` until Task 4).

- [ ] **Step 6: Commit**

```bash
git add src/stores/useRoadmapStore.js src/stores/useRoadmapStore.test.js src/utils/computeSnapPosition.js src/utils/computeSnapPosition.test.js
git commit -m "feat(roadmap): support start-type nodes in addNode and snap sizing"
```

---

### Task 3: `JourneyPickerModal` component

**Files:**
- Create: `src/components/roadmap/JourneyPickerModal.jsx`
- Create: `src/components/roadmap/JourneyPickerModal.test.jsx`

**Interfaces:**
- `<JourneyPickerModal nodeId={string} onClose={() => void} />` — lists every `useUserStore.journeys` item across all 3 categories, grouped by category. Selecting one calls `useRoadmapStore.getState().updateNodeData` equivalent (via the hook) with `{ journeyRef: { category, id } }`, then calls `onClose()`. Reuses `ImagePickerModal.jsx`'s portal-to-`document.body` pattern verbatim: `StartNode` (like `ImageNode`) lives inside React Flow's transformed viewport, so a `fixed` child would anchor to that transform instead of the real screen — portalling out fixes this the same way `ImagePickerModal` already does.

- [ ] **Step 1: Write the failing test** — create `src/components/roadmap/JourneyPickerModal.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let userState
let updateNodeData

vi.mock('../../stores/useUserStore', () => ({
  useUserStore: (sel) => sel(userState),
}))
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData }),
}))

const { default: JourneyPickerModal } = await import('./JourneyPickerModal')

describe('JourneyPickerModal', () => {
  beforeEach(() => {
    updateNodeData = vi.fn()
    userState = {
      journeys: {
        mastery: [{ id: 'm1', title: 'Learn React' }],
        career: [],
        university: [{ id: 'u1', title: 'Apply to KMUTT' }],
      },
    }
  })

  it('lists journey items grouped by category', () => {
    render(<JourneyPickerModal nodeId="n1" onClose={() => {}} />)
    expect(screen.getByText('Learn React')).toBeTruthy()
    expect(screen.getByText('Apply to KMUTT')).toBeTruthy()
  })

  it('shows an empty state for a category with no items', () => {
    render(<JourneyPickerModal nodeId="n1" onClose={() => {}} />)
    expect(screen.getAllByText('No journey items yet')).toHaveLength(1) // only 'career' is empty
  })

  it('picking an item calls updateNodeData with the journeyRef and closes', () => {
    const onClose = vi.fn()
    render(<JourneyPickerModal nodeId="n1" onClose={onClose} />)
    fireEvent.click(screen.getByText('Learn React'))
    expect(updateNodeData).toHaveBeenCalledWith('n1', { journeyRef: { category: 'mastery', id: 'm1' } })
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/components/roadmap/JourneyPickerModal.test.jsx`
Expected: FAIL — `Failed to resolve import "./JourneyPickerModal"` (component does not exist yet).

- [ ] **Step 3: Minimal implementation** — create `src/components/roadmap/JourneyPickerModal.jsx`:

```jsx
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useUserStore } from '../../stores/useUserStore'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

const CATEGORIES = [
  { key: 'mastery', label: 'Mastery' },
  { key: 'career', label: 'Career' },
  { key: 'university', label: 'University' },
]

// Picker for linking a Roadmap Start block to one Journey item across all 3
// useUserStore categories. Rendered through a portal to document.body — same
// reason as ImagePickerModal: the Start block lives inside React Flow's
// transformed viewport, where a `fixed` child would anchor to that transform
// (scaled/offset, unclickable) instead of the real screen.
export default function JourneyPickerModal({ nodeId, onClose }) {
  const journeys = useUserStore((s) => s.journeys)
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  function pick(category, item) {
    updateNodeData(nodeId, { journeyRef: { category, id: item.id } })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm max-h-[80vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <p className="pixel-font text-[11px] font-bold text-gray-800">Link to Journey</p>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition-all"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {CATEGORIES.map(({ key, label }) => {
            const items = journeys?.[key] || []
            return (
              <div key={key} className="flex flex-col gap-2">
                <p className="pixel-font text-[9px] text-gray-400">{label}</p>
                {items.length === 0 ? (
                  <span className="pixel-font text-[8px] text-gray-300">No journey items yet</span>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => pick(key, item)}
                      className="w-full text-left rounded-xl border border-gray-100 px-3 py-2 hover:border-brand hover:bg-brand/5 active:scale-95 transition-all"
                    >
                      <span className="text-[11px] font-semibold text-gray-700">{item.title || '—'}</span>
                    </button>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npx vitest run src/components/roadmap/JourneyPickerModal.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Manual verification in `npm run dev`** — deferred to Task 4 (no way to open this modal until `StartNode` exists).

- [ ] **Step 6: Commit**

```bash
git add src/components/roadmap/JourneyPickerModal.jsx src/components/roadmap/JourneyPickerModal.test.jsx
git commit -m "feat(roadmap): add JourneyPickerModal for linking a Start block to a journey item"
```

---

### Task 4: `StartNode` component + shared `nodeTypes` registry + `RoadmapPage` wiring

**Files:**
- Create: `src/components/roadmap/nodeTypes.js`
- Create: `src/components/roadmap/StartNode.jsx`
- Create: `src/components/roadmap/StartNode.test.jsx`
- Modify: `src/pages/RoadmapPage.jsx`

**Interfaces:**
- `nodeTypes` (named export) — `{ process, condition, stageLabel, image, start }`, the single shared React-Flow type registry (see Architecture above for why this is extracted).
- `<StartNode id={string} data={{ journeyRef: {category,id} | null }} selected={bool} />` — React-Flow node-component contract, same shape as `ProcessNode`/`ConditionNode`. No target handle (a Start block has no incoming connection — only outgoing). Renders:
  - `journeyRef == null` → "Link to Journey" button opening `JourneyPickerModal`.
  - `journeyRef` set and `resolveLinkedJourney` finds the item → live `title` + progress bar (same markup/classes as `JourneyManager.jsx`'s detail modal: `flex-1 h-2 bg-gray-100 rounded-full overflow-hidden` wrapping `h-full bg-purple-400 rounded-full transition-all` sized by `style={{ width: ... }}`, plus a `text-purple-600` percentage label) + a `+10% progress` button calling `updateJourneyProgress(category, id, '+10% via Roadmap', 10)`.
  - `journeyRef` set but `resolveLinkedJourney` returns `null` → "Linked journey was removed" message with a "Choose another" button that clears `journeyRef` back to `null` (does not crash).

- [ ] **Step 1: Write the failing tests**

Create `src/components/roadmap/StartNode.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let roadmapState
let userState

// @xyflow/react's Handle/useNodeConnections normally require a
// <ReactFlowProvider> ancestor. These tests exercise StartNode's own logic
// (picker, live display, write-back) in isolation, so the React-Flow-specific
// bits ConnectionDot depends on are stubbed out here — this is the pattern to
// reuse for any future roadmap node-component test.
vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: () => null,
  useNodeConnections: () => [],
}))
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel(roadmapState),
}))
vi.mock('../../stores/useUserStore', () => ({
  useUserStore: (sel) => sel(userState),
}))

const { default: StartNode } = await import('./StartNode')

describe('StartNode', () => {
  beforeEach(() => {
    roadmapState = { updateNodeData: vi.fn() }
    userState = {
      journeys: {
        mastery: [{ id: 'm1', title: 'Learn React', progress: 40 }],
        career: [],
        university: [],
      },
      updateJourneyProgress: vi.fn(),
    }
  })

  it('shows the Link to Journey button when journeyRef is null', () => {
    render(<StartNode id="n1" data={{ journeyRef: null }} selected={false} />)
    expect(screen.getByText('Link to Journey')).toBeTruthy()
  })

  it('opens the picker and links a journey on selection', () => {
    render(<StartNode id="n1" data={{ journeyRef: null }} selected={false} />)
    fireEvent.click(screen.getByText('Link to Journey'))
    fireEvent.click(screen.getByText('Learn React'))
    expect(roadmapState.updateNodeData).toHaveBeenCalledWith('n1', {
      journeyRef: { category: 'mastery', id: 'm1' },
    })
  })

  it('renders the live title and progress once linked', () => {
    render(<StartNode id="n1" data={{ journeyRef: { category: 'mastery', id: 'm1' } }} selected={false} />)
    expect(screen.getByText('Learn React')).toBeTruthy()
    expect(screen.getByText('40%')).toBeTruthy()
  })

  it('calls updateJourneyProgress with a Roadmap-attributed note on +10% progress', () => {
    render(<StartNode id="n1" data={{ journeyRef: { category: 'mastery', id: 'm1' } }} selected={false} />)
    fireEvent.click(screen.getByText('+10% progress'))
    expect(userState.updateJourneyProgress).toHaveBeenCalledWith('mastery', 'm1', '+10% via Roadmap', 10)
  })

  it('shows a removed-journey state without crashing when the linked item is gone', () => {
    render(<StartNode id="n1" data={{ journeyRef: { category: 'mastery', id: 'gone' } }} selected={false} />)
    expect(screen.getByText('Linked journey was removed')).toBeTruthy()
  })

  it('choosing another from the removed state clears journeyRef', () => {
    render(<StartNode id="n1" data={{ journeyRef: { category: 'mastery', id: 'gone' } }} selected={false} />)
    fireEvent.click(screen.getByText('Choose another'))
    expect(roadmapState.updateNodeData).toHaveBeenCalledWith('n1', { journeyRef: null })
  })
})
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/components/roadmap/StartNode.test.jsx`
Expected: FAIL — `Failed to resolve import "./StartNode"` (component does not exist yet).

- [ ] **Step 3: Minimal implementation**

Create `src/components/roadmap/StartNode.jsx`:

```jsx
import { useCallback, useState } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { useUserStore } from '../../stores/useUserStore'
import { resolveLinkedJourney } from '../../utils/resolveLinkedJourney'
import ConnectionDot from './ConnectionDot'
import JourneyPickerModal from './JourneyPickerModal'

const PROGRESS_GAIN = 10

// Start block — the entry point of a Roadmap, two-way bound to one Journey
// item from Profile (useUserStore.journeys). Unlike Process/Condition it has
// no target handle: a Start block is never the destination of a connection,
// only ever the source of one.
export default function StartNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const journeys = useUserStore((s) => s.journeys)
  const updateJourneyProgress = useUserStore((s) => s.updateJourneyProgress)
  const [pickerOpen, setPickerOpen] = useState(false)

  const journeyRef = data.journeyRef ?? null
  const linked = resolveLinkedJourney(journeyRef, journeys)
  // A ref exists but resolveLinkedJourney came back empty: the item was
  // deleted from Profile after this block was linked to it.
  const isBroken = Boolean(journeyRef) && !linked

  const unlink = useCallback(() => updateNodeData(id, { journeyRef: null }), [id, updateNodeData])

  const gainProgress = useCallback(() => {
    if (!journeyRef) return
    updateJourneyProgress(journeyRef.category, journeyRef.id, `+${PROGRESS_GAIN}% via Roadmap`, PROGRESS_GAIN)
  }, [journeyRef, updateJourneyProgress])

  return (
    <div
      className={`relative w-40 h-[148px] rounded-2xl border-2 bg-white shadow-md p-2.5 flex flex-col gap-1.5 transition-all ${
        selected ? 'border-emerald-500 shadow-emerald-500/30 shadow-lg' : 'border-emerald-500/40'
      }`}
    >
      <span className="pixel-font text-[8px] text-emerald-600 font-bold">START</span>

      {!journeyRef && (
        <button
          onClick={() => setPickerOpen(true)}
          className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 text-emerald-500 text-[10px] px-2 hover:bg-emerald-50 active:scale-95 transition-all"
        >
          Link to Journey
        </button>
      )}

      {isBroken && (
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
          <span className="text-[9px] text-red-500 text-center leading-tight">
            Linked journey was removed
          </span>
          <button
            onClick={unlink}
            className="text-[9px] text-emerald-600 underline hover:text-emerald-700"
          >
            Choose another
          </button>
        </div>
      )}

      {linked && (
        <div className="flex-1 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-ink leading-tight line-clamp-2">
            {linked.title || '—'}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, linked.progress || 0)}%` }}
              />
            </div>
            <span className="text-[10px] text-purple-600 font-semibold">{linked.progress || 0}%</span>
          </div>
          <button
            onClick={gainProgress}
            className="mt-auto text-[9px] bg-emerald-500 text-white rounded-lg py-1 hover:bg-emerald-600 active:scale-95 transition-all"
          >
            +{PROGRESS_GAIN}% progress
          </button>
        </div>
      )}

      {/* No target handle — a Start block has no incoming connection. */}
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
      <ConnectionDot type="source" position={Position.Right} />

      {pickerOpen && <JourneyPickerModal nodeId={id} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}
```

Create `src/components/roadmap/nodeTypes.js`:

```js
// Single shared registry of Roadmap node-type -> component. Both RoadmapPage
// (the interactive canvas) and ProfilePanel's RoadmapPreview (a read-only
// embed) render the same React Flow nodes/edges from useRoadmapStore, so both
// need this exact map — kept in one place so a new block type is registered
// once, not twice, and so ProfilePanel doesn't have to import all of
// RoadmapPage.jsx (which is lazy-loaded on its own) just to get this map.
import ProcessNode from './ProcessNode'
import ConditionNode from './ConditionNode'
import StageLabelNode from './StageLabelNode'
import ImageNode from './ImageNode'
import StartNode from './StartNode'

export const nodeTypes = {
  process: ProcessNode,
  condition: ConditionNode,
  stageLabel: StageLabelNode,
  image: ImageNode,
  start: StartNode,
}
```

In `src/pages/RoadmapPage.jsx`, replace the four individual node-component imports and the local `nodeTypes` map:

```js
import ProcessNode from '../components/roadmap/ProcessNode'
import ConditionNode from '../components/roadmap/ConditionNode'
import StageLabelNode from '../components/roadmap/StageLabelNode'
import ImageNode from '../components/roadmap/ImageNode'
```
```js
const nodeTypes = { process: ProcessNode, condition: ConditionNode, stageLabel: StageLabelNode, image: ImageNode }
```

with:

```js
import { nodeTypes } from '../components/roadmap/nodeTypes'
```

Then add a "Start" toolbar button to the palette in `RoadmapPage.jsx`, right after the existing "Image" button and before the mobile "Select" toggle button:

```jsx
              <button
                onClick={() => addAtCenter('start')}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-emerald-500/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Add Start block"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
                  <span className="text-[14px]">🚩</span>
                </div>
                <span className="pixel-font text-[8px] text-ink">Start</span>
              </button>
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npx vitest run src/components/roadmap/StartNode.test.jsx`
Expected: PASS (6 tests).

Then run the full suite to confirm the `RoadmapPage.jsx` import swap didn't break anything:

Run: `npm test`
Expected: all green, no new failures.

- [ ] **Step 5: Manual verification in `npm run dev`**

1. `npm run dev`, open the app, open Roadmap (map FAB on Home).
2. Click "Start" in the toolbar — a green-bordered block appears with a "Link to Journey" button.
3. Click it, confirm the picker lists your Mastery/Career/University journey items grouped by category (add one from Profile first if all are empty).
4. Pick one — the block now shows its title, progress bar, and a "+10% progress" button.
5. Open Profile — confirm the same journey item's progress bar reflects the same percentage (they read the same store).
6. Click "+10% progress" on the Start block, reopen Profile, confirm the percentage went up and the new progress note appears in that journey's detail view.
7. In Profile, delete that journey item, go back to the Start block — confirm it now shows "Linked journey was removed" instead of crashing, and "Choose another" resets it to the link button.

- [ ] **Step 6: Commit**

```bash
git add src/components/roadmap/nodeTypes.js src/components/roadmap/StartNode.jsx src/components/roadmap/StartNode.test.jsx src/pages/RoadmapPage.jsx
git commit -m "feat(roadmap): add StartNode two-way bound to a Journey item, extract shared nodeTypes registry"
```

---

### Task 5: Roadmap export schema — regression test for the `start` type

**Files:**
- Modify: `src/utils/roadmapExport.test.js`

**Interfaces:** none new — this task verifies (and locks in with a regression test) that `src/utils/roadmapExport.js` needs **no code changes** for the new `start` type. `toSchema`/`fromSchema` copy `node.data` opaquely (`data: n.data`, no per-type field enumeration) and `fromSchema` only validates `schema.version`, never the node `type` against an allowlist — so a `start` node's `journeyRef` (including `null`) already round-trips correctly today.

- [ ] **Step 1: Write the test** — add to `src/utils/roadmapExport.test.js` (new `describe` block at the end of the file):

```js
describe('start node schema round-trip', () => {
  it('preserves a start node journeyRef through toSchema/fromSchema', () => {
    const nodes = [
      { id: 's1', type: 'start', position: { x: 0, y: 0 }, data: { journeyRef: { category: 'mastery', id: 'm1' } } },
    ]
    const roundTripped = fromSchema(JSON.parse(JSON.stringify(toSchema(nodes, []))))
    expect(roundTripped.nodes[0]).toMatchObject({
      type: 'start',
      data: { journeyRef: { category: 'mastery', id: 'm1' } },
    })
  })

  it('preserves a start node with a null journeyRef (not yet linked)', () => {
    const nodes = [
      { id: 's1', type: 'start', position: { x: 0, y: 0 }, data: { journeyRef: null } },
    ]
    const roundTripped = fromSchema(JSON.parse(JSON.stringify(toSchema(nodes, []))))
    expect(roundTripped.nodes[0].data).toEqual({ journeyRef: null })
  })
})
```

- [ ] **Step 2: Run it — this is a verification task, not red/green TDD**

Run: `npx vitest run src/utils/roadmapExport.test.js`
Expected: **PASS immediately.** This confirms `toSchema`/`fromSchema`'s existing generic, per-type-agnostic handling of `data` already supports the `start` type with zero production changes — there is nothing to implement in Step 3.

- [ ] **Step 3: Implementation** — none. `src/utils/roadmapExport.js` is not modified in this task; Step 2's immediate pass is the evidence that it doesn't need to be.

- [ ] **Step 4: N/A** — already confirmed passing in Step 2.

- [ ] **Step 5: Manual verification in `npm run dev`**

1. Build a small roadmap containing a linked Start block (from Task 4's manual verification).
2. Click the Download/export icon in the Roadmap header, confirm `roadmap.json` downloads and its `nodes` array contains an entry with `"type": "start"` and a populated `"journeyRef"` inside `"data"`.
3. Click the Upload/import icon, re-import that same file into a fresh board (or the same one), confirm the Start block reappears still linked and showing the correct live title/progress (proving the round-trip through the real file-based import path, not just the pure function).

- [ ] **Step 6: Commit**

```bash
git add src/utils/roadmapExport.test.js
git commit -m "test(roadmap): lock in that the schema-v1 export already round-trips start-node journeyRef"
```

---

### Task 6: `RoadmapPreview` in Profile + prop-threading from `HomePage`

**Files:**
- Create: `src/components/profile/RoadmapPreview.jsx`
- Create: `src/components/profile/RoadmapPreview.test.jsx`
- Modify: `src/components/ProfilePanel.jsx`
- Modify: `src/components/ProfilePanel.test.jsx`
- Modify: `src/pages/HomePage.jsx`

**Interfaces:**
- `<RoadmapPreview onOpen={() => void} />` — reads `useRoadmapStore(s => s.nodes)` / `s.edges` directly (no props in, live store read like the spec requires). Renders a non-interactive `<ReactFlow>` (own `<ReactFlowProvider>`) using the same `nodeTypes` from Task 4, with `nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}` — mirrors `RoadmapPage.jsx`'s own `<ReactFlow>` configuration with those props flipped off. Wrapped in a button so the whole preview is one tap target calling `onOpen`. Shows an empty-state "No roadmap yet" prompt (also tappable, also calls `onOpen`) when `nodes.length === 0`.
- `ProfilePanel.jsx` gains an `onOpenRoadmap` prop, forwarded straight to `RoadmapPreview`'s `onOpen`, and lazy-loads `RoadmapPreview` the same way `HomePage.jsx` already lazy-loads `RoadmapPage`.
- `HomePage.jsx` gains `handleOpenRoadmapFromProfile()`, which calls `closePanel()` then `setShowRoadmap(true)` — Profile (`z-50`) must close before the Roadmap overlay (`z-40`) opens, otherwise Profile would render on top of it and hide it. Passed to `<ProfilePanel onOpenRoadmap={handleOpenRoadmapFromProfile} />`.
- Placement (explicit, not hand-waved): the preview section sits directly below `<JourneyManager />` and above the existing "Edit your path" button in `ProfilePanel.jsx`'s body.

- [ ] **Step 1: Write the failing tests**

Create `src/components/profile/RoadmapPreview.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let roadmapState

vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel(roadmapState),
}))
// Real <ReactFlow> needs browser measuring APIs (ResizeObserver etc.) jsdom
// doesn't provide. This component's own logic (empty state vs. preview,
// onOpen wiring) is what's under test here — actual React Flow rendering is
// verified manually in npm run dev (Step 5).
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }) => <div data-testid="react-flow-stub">{children}</div>,
  ReactFlowProvider: ({ children }) => <>{children}</>,
  Background: () => null,
}))

const { default: RoadmapPreview } = await import('./RoadmapPreview')

describe('RoadmapPreview', () => {
  it('shows an empty-state prompt when the roadmap has no nodes', () => {
    roadmapState = { nodes: [], edges: [] }
    render(<RoadmapPreview onOpen={() => {}} />)
    expect(screen.getByText('No roadmap yet — tap to create one')).toBeTruthy()
    expect(screen.queryByTestId('react-flow-stub')).toBeNull()
  })

  it('renders the React Flow preview when nodes exist', () => {
    roadmapState = { nodes: [{ id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} }], edges: [] }
    render(<RoadmapPreview onOpen={() => {}} />)
    expect(screen.getByTestId('react-flow-stub')).toBeTruthy()
  })

  it('calls onOpen when the preview is tapped', () => {
    roadmapState = { nodes: [{ id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} }], edges: [] }
    const onOpen = vi.fn()
    render(<RoadmapPreview onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalled()
  })

  it('calls onOpen from the empty state too', () => {
    roadmapState = { nodes: [], edges: [] }
    const onOpen = vi.fn()
    render(<RoadmapPreview onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalled()
  })
})
```

Add to `src/components/ProfilePanel.test.jsx` — first change the Testing Library import line to add `fireEvent`:

```js
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
```

then add this mock alongside the existing `vi.mock('./profile/JourneyManager', ...)` block:

```js
vi.mock('./profile/RoadmapPreview', () => ({
  default: ({ onOpen }) => <button onClick={onOpen}>ROADMAP_PREVIEW_STUB</button>,
}))
```

then add this test inside the existing `describe('ProfilePanel', ...)` block:

```js
  it('renders the Roadmap preview and forwards onOpenRoadmap when tapped', async () => {
    const onOpenRoadmap = vi.fn()
    render(<ProfilePanel onClose={vi.fn()} onOpenRoadmap={onOpenRoadmap} />)
    resolveGetDoc({ exists: () => false, data: () => ({}) })
    const button = await screen.findByText('ROADMAP_PREVIEW_STUB')
    fireEvent.click(button)
    expect(onOpenRoadmap).toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run them, confirm they fail**

Run: `npx vitest run src/components/profile/RoadmapPreview.test.jsx src/components/ProfilePanel.test.jsx`
Expected: FAIL — `RoadmapPreview.test.jsx` fails to resolve `./RoadmapPreview` (doesn't exist yet); the new `ProfilePanel` test fails with "Unable to find an element with the text: ROADMAP_PREVIEW_STUB" (not rendered yet).

- [ ] **Step 3: Minimal implementation**

Create `src/components/profile/RoadmapPreview.jsx`:

```jsx
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { nodeTypes } from '../roadmap/nodeTypes'

// Read-only, non-interactive embed of the user's own Roadmap canvas — same
// useRoadmapStore data and node registry as the full RoadmapPage, just with
// every interaction prop turned off. Wrapped in its own ReactFlowProvider
// since it mounts independently of RoadmapPage's own instance. The whole
// thing is one tap target that opens the real, interactive Roadmap overlay.
export default function RoadmapPreview({ onOpen }) {
  const nodes = useRoadmapStore((s) => s.nodes)
  const edges = useRoadmapStore((s) => s.edges)

  if (nodes.length === 0) {
    return (
      <button
        onClick={onOpen}
        className="w-full h-32 rounded-2xl border-2 border-dashed border-purple-200 flex items-center justify-center text-purple-400 hover:border-purple-400 hover:text-purple-500 transition-colors text-sm"
      >
        No roadmap yet — tap to create one
      </button>
    )
  }

  return (
    <button
      onClick={onOpen}
      aria-label="เปิด Roadmap"
      className="w-full h-40 rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative"
    >
      <div className="absolute inset-0 pointer-events-none">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} color="#e2e8f0" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </button>
  )
}
```

In `src/components/ProfilePanel.jsx`, change the React import line:

```js
import { useState, useEffect } from 'react'
```
to:
```js
import { useState, useEffect, lazy, Suspense } from 'react'
```

Add the lazy import next to the other imports:

```js
const RoadmapPreview = lazy(() => import('./profile/RoadmapPreview'))
```

Change the function signature:

```js
export default function ProfilePanel({ onClose }) {
```
to:
```js
export default function ProfilePanel({ onClose, onOpenRoadmap }) {
```

Insert this block directly after `<JourneyManager />` and before the "Edit your path" button:

```jsx
        {/* Roadmap preview — live embed of the same useRoadmapStore canvas the
            Roadmap FAB opens, so Profile and Roadmap are one tap apart */}
        <div>
          <p className="pixel-font text-[9px] text-gray-500 mb-2">Your Roadmap</p>
          <Suspense fallback={<div className="w-full h-40 rounded-2xl bg-gray-100 animate-pulse" />}>
            <RoadmapPreview onOpen={onOpenRoadmap} />
          </Suspense>
        </div>
```

In `src/pages/HomePage.jsx`, add this function near `closePanel` (right after it):

```js
  // Opens the full Roadmap overlay from inside Profile. Profile (z-50) sits
  // above the Roadmap overlay (z-40), so Profile must close first or the
  // Roadmap would render invisibly underneath it.
  function handleOpenRoadmapFromProfile() {
    closePanel()
    setShowRoadmap(true)
  }
```

and change:

```jsx
      {activeTab === APP_VIEWS.PROFILE && <ProfilePanel onClose={closePanel} />}
```
to:
```jsx
      {activeTab === APP_VIEWS.PROFILE && (
        <ProfilePanel onClose={closePanel} onOpenRoadmap={handleOpenRoadmapFromProfile} />
      )}
```

- [ ] **Step 4: Run them, confirm they pass**

Run: `npx vitest run src/components/profile/RoadmapPreview.test.jsx src/components/ProfilePanel.test.jsx`
Expected: PASS (4 + 2 tests).

Then run the full suite:

Run: `npm test`
Expected: all green, no new failures.

- [ ] **Step 5: Manual verification in `npm run dev`**

1. `npm run dev`, sign in, build a small roadmap with at least one Start block linked to a journey item (Task 4).
2. Open Profile — confirm a "Your Roadmap" section appears below the journey chip list, showing a small non-interactive preview of the same blocks (matching what's on the real Roadmap canvas).
3. Confirm you cannot drag/pan/zoom/select inside the preview (it's read-only).
4. Tap anywhere on the preview — confirm Profile closes and the full interactive Roadmap overlay opens on top (not hidden behind anything).
5. Delete all Roadmap nodes (or test with a fresh account) and reopen Profile — confirm the "No roadmap yet — tap to create one" empty state shows instead, and tapping it also opens the Roadmap overlay.

- [ ] **Step 6: Commit**

```bash
git add src/components/profile/RoadmapPreview.jsx src/components/profile/RoadmapPreview.test.jsx src/components/ProfilePanel.jsx src/components/ProfilePanel.test.jsx src/pages/HomePage.jsx
git commit -m "feat(profile): embed a live read-only Roadmap preview, opening the full overlay on tap"
```

---

## Handoff

All 6 tasks are independently committable and reviewable in order — Claude Code should review each diff against this plan before Cursor moves to the next task, per this repo's CLAUDE.md collaboration model. After Task 6, the two data models are bridged both ways: Start blocks read/write live Journey data, and Profile surfaces a live view of the Roadmap.
