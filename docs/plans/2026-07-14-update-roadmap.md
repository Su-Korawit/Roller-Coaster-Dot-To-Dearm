# Roadmap (Shift-marquee verify · Process expand · Ctrl+C/V/D shortcuts · IR Board realtime · Public share link) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Idea:** `node-2-1783984996269` — "Update Roadmap 14/07/2026" on the IR Board.

**Requirements (from the Idea's Process notes, translated):**
1. **Roadmap Bug** (`node-3-1783985002428`): Shift-marquee selection is broken — selecting only a few blocks doesn't select all of them.
2. **ขยาย Block Process** (`node-4-1783985283104`): Process blocks should be expandable to view and edit.
3. **ทำ Short Cut Tool** (`node-8-1783986196996`): Ctrl+C/Ctrl+V/Ctrl+D keyboard shortcuts for blocks (copy/paste/duplicate).
4. **Roadmap Realtime Update** (`node-4-1783860252109`): when working concurrently with the Agent Skill workflow (Claude Code/Cursor planning + updating via scripts), writes shouldn't overwrite each other.
5. **Sharing แบบให้คนไม่มี Account ก็ดูได้** (`node-36-1783987956144`): allow uploading/making a Roadmap board public so people without an account can view it.

**Interpretation (verified against the code):**

- **(1)** Already fixed on `main` in commit `13df7b0`, part of `docs/plans/2026-07-12-roadmap-files-and-editor-fixes.md` Task 3. Verified: `src/pages/RoadmapPage.jsx` has no `multiSelectionKeyCode="Shift"` prop today. Task 1 below re-verifies the fix holds and checks the two spots that could regress it (mobile select-mode toggle, `nodesDraggable={canEdit}`) rather than re-implementing anything.
- **(2)** `ProcessNode.jsx` is a fixed 128×128 block with an always-inline `<input>` (label, 12px) + a tiny `<textarea>` (note, 10px). No expand affordance exists. `ImageNode`/`FileNode` both already have a `Maximize2` button opening a full-screen portal (`MediaLightbox.jsx` / `FileViewerModal.jsx`) — same Escape/backdrop-click/`nodrag` pattern. Task 2 adds the same button to `ProcessNode` opening a new `ProcessEditorModal.jsx` with a full-size label input + full-size textarea bound to the same `updateNodeData`. Scoped to **Process only** — the Idea literally says "Block Process"; `ConditionNode`/`IdeaRootNode`/`UpdateNode`/`SuccessNode` keep their current inline-only editing (deferred, see Out of scope).
- **(3)** No keyboard-shortcut listener exists anywhere on the Roadmap canvas (grepped `keydown|ctrlKey|metaKey` in `RoadmapPage.jsx` and `src/components/roadmap/` — no hits). `useRoadmapStore.duplicateSelection` already exists and is wired to the mouse-only "Dupe" button in `SelectionActionBar.jsx` — Ctrl/Cmd+D reuses it verbatim. There is no OS-clipboard round-trip anywhere (only `roadmapExport.js`'s JSON file export). Task 3 adds an **in-memory** clipboard (a new `clipboard` field on `useRoadmapStore`, never persisted, never synced to Firestore) plus a small testable hook `useRoadmapShortcuts` — not `navigator.clipboard`, since nothing here needs to leave the tab or survive a reload.
- **(4)** Read `src/lib/syncManager.js`, `src/services/irBoardSession.js`, `scripts/irReport.mjs`, `src/constants/irBoard.js` in full. `roadmapSheetSync` has no `onSnapshot` listener — only a one-shot `hydrate` + a 1s-debounced `setDoc(merge:true)` per store mutation. **Scope check confirmed:** `scripts/irReport.mjs` writes exclusively to the single fixed doc `roadmapSheets/admin-idea-board` (`IR_SHEET_ID`) — no per-user Roadmap sheet is ever touched by the script. The conflict can only happen on that one document, when an admin has the IR tab mounted (`irBoardSession.mountIrBoard`, armed via the same debounced pipeline, pointed at `IR_SHEET_ID`) at the same moment `irReport.mjs` does a `loadBoard → mutate → saveBoard` non-transactional read-modify-write. Task 4 fixes **both halves** of the race, scoped to `admin-idea-board` only:
  - the script's `saveBoard` becomes a Firestore transaction (`db.runTransaction`) so it always mutates a **fresh** read, never a copy loaded earlier in the process — it can no longer silently clobber a browser write that landed in between;
  - `irBoardSession.js` attaches a real-time `onSnapshot` listener (via the existing `createFirestoreListener()` lifecycle, same one chat/social/shop already use) **only while the IR tab is mounted**, so the admin's browser picks up the script's write live and its *own* next debounced write carries that change forward instead of overwriting it. `snap.metadata.hasPendingWrites` filters out the echo of the browser's own optimistic write so this never fights itself.
  - No change to `roadmapSheetSync` for ordinary per-user sheets, no new synchronous writes, no `firestore.rules` change (Admin SDK bypasses rules; the existing `admin-idea-board` carve-out already covers the browser side).
- **(5)** Read ADR `docs/adr/0012-feature-subdomains-and-guest-mode.md` in full — it covers **guest editing** (an unauthenticated visitor's own local board, `localStorage`-persisted, no Firebase Anonymous Auth). That is a different feature. This item is: a **signed-in user's saved board** becoming viewable by someone with no account at all. Also discovered `SheetSwitcher.jsx` already has a "Share" button → `ShareSheetModal.jsx` → `services/roadmapSheets.js#shareSheet` — but that is **account-to-account collaborator sharing** (adds a `collaboratorUids` entry, requires the viewer to follow/be-followed and be signed in). It does not solve "no account." Task 5 adds a **separate, additive** "Public link" section inside the same `ShareSheetModal` (reusing its existing owner-only affordance rather than adding new header clutter): a `public`/`shareId` pair on the `roadmapSheets/{sheetId}` doc, a `firestore.rules` carve-out for unauthenticated read when `public == true`, a composite index for the `shareId` lookup query (no `firestore.indexes.json` exists yet — this task creates it), and a new read-only route `roadmap.ilovetcas.com/view/:shareId` rendering a small standalone `RoadmapPublicView.jsx` — deliberately **not** wired through `useRoadmapStore`/`syncManager` at all, so a visitor's own guest/local board is never touched and nothing on the public view can write back to the shared board.

**Goal:** Verify the marquee-selection fix still holds; make Process blocks expandable for comfortable editing; add Ctrl+C/V/D shortcuts; stop the admin IR Board from silently losing writes when a human and the iloveskill script edit it at the same time; let a signed-in user publish a view-only, no-account-required link to one of their Roadmap sheets.

**Architecture:** Every change follows patterns already established in this codebase — the `Maximize2` full-screen-portal pattern (`ImageNode`/`FileNode` → `MediaLightbox`/`FileViewerModal`) for Task 2; the existing `duplicateSelection` id-remap-and-offset pattern for Task 3's paste; the existing `createFirestoreListener()` lifecycle (chat/social/shop) for Task 4's admin-only realtime read; the existing owner-only `ShareSheetModal` + `roadmapSheets.js` service seam for Task 5, extended (not replaced) with a public-link affordance; the existing feature-subdomain routing (`App.jsx` site-key switch, ADR-0012) for the new public viewer route.

**Tech Stack:** React 19 + JSX (no TypeScript), `@xyflow/react` 12, Zustand, Tailwind v4 tokens, Firebase Firestore + Admin SDK, Vitest + `@testing-library/react` (jsdom), `@firebase/rules-unit-testing` for rules tests.

## Global Constraints

- **No TypeScript** — plain JS/JSX only.
- **Tailwind v4** — reuse existing token classes (`bg-surface`, `border-ink`, `pixel-font`, `neo-btn`, `shadow-hard-sm`, `bg-brand-soft`); no config files.
- **Never touch `StartNode.jsx`** and never change its behaviour.
- **React Flow handles** — never rotate/transform a node's root `<div>`; not touched by this plan anyway (no ConditionNode/rotation work here).
- **Firestore writes stay debounced** via the existing store→syncManager pipe for every ordinary sheet. The one deliberate exception (Task 4) is a **read-only** real-time listener scoped to `admin-idea-board` only — it must never add a new synchronous/undebounced *write* path.
- **Never deploy** rules/functions/indexes/vercel — append the exact command to `.iloveskill/pending-deploys.json` (`src/lib/iloveskillState.js#enqueuePending`) instead.
- **Firebase paths only via `src/lib/db.js`** — never inline `doc(db, 'collection', id)` or `collection(db, ...)`.
- Commit after every task (logical stages, not one giant commit).
- Test-driven where jsdom can express the interaction; manual-QA-only where it can't (this codebase never renders a *real* `@xyflow/react` canvas in jsdom — see `ConnectionDot.test.jsx`, which mocks `@xyflow/react` entirely — so every test in this plan that touches React Flow internals follows that same mocking convention rather than trying to mount a live canvas).

---

### Task 1: Verify the shift-marquee fix still holds (no re-implementation)

**Files:**
- Read only: `src/pages/RoadmapPage.jsx`
- Run: `src/stores/useRoadmapStore.test.js`

**Interfaces:** none — this task produces no API change. If verification passes, it produces **no diff** at all.

- [ ] **Step 1: Confirm the fix is actually on this branch**

Run:
```bash
grep -n "multiSelectionKeyCode" src/pages/RoadmapPage.jsx
```
Expected: **no output**. (Confirmed already during planning — `RoadmapPage.jsx` has no `multiSelectionKeyCode` prop on `<ReactFlow>` as of this plan's writing. If this grep DOES find something, stop — the fix regressed — and go straight to `superpowers:systematic-debugging` before touching anything else in this plan.)

- [ ] **Step 2: Re-read the two spots that could silently regress this**

In `src/pages/RoadmapPage.jsx`:
- `onNodeClick` (around line 167): mobile select-mode toggles `n.selected` per-tap and is gated on `mobileSelectMode`, not on any Shift-key state — confirm it's still independent of the marquee/Shift path.
- The `<ReactFlow>` props block (around line 294–323): confirm `nodesDraggable={canEdit}`, `nodesConnectable={canEdit}`, `elementsSelectable={canEdit}` are still present and `multiSelectionKeyCode` is still absent (React Flow's library default reverts multi-select to Ctrl/Cmd-click; Shift stays purely the marquee key).

- [ ] **Step 3: Run the regression-guarding suite**

Run: `npx vitest run src/stores/useRoadmapStore.test.js`
Expected: PASS.

- [ ] **Step 4: Manual QA (jsdom cannot express marquee geometry)**

`npm run dev` → sign in → open the Roadmap → add 4+ blocks spread apart. Shift-drag a marquee over blocks A+B, release, then shift-drag over C only.
Expected: the second marquee selects **only** C (SelectionActionBar count = 1) — A+B are no longer selected. Ctrl/Cmd-click still adds a single block to the current selection. Mobile select-mode (tap-to-toggle) still works independently.

- [ ] **Step 5: No commit**

This task should produce zero file changes. Do not create an empty commit. If Steps 1–4 surfaced a regression, fix it, write a regression test first (TDD), then commit as `fix(roadmap): restore shift-marquee replace-not-accumulate behaviour` and continue to Task 2.

---

### Task 2: Expand-to-view/edit for Process blocks

**Files:**
- Modify: `src/components/roadmap/ProcessNode.jsx`
- Create: `src/components/roadmap/ProcessEditorModal.jsx`
- Modify (extend): `src/components/roadmap/ProcessNode.test.jsx`
- Create: `src/components/roadmap/ProcessEditorModal.test.jsx`

**Interfaces:**
- Consumes: `useRoadmapStore.updateNodeData` (unchanged signature).
- Produces: `<ProcessEditorModal nodeId data onClose />` — a full-screen portal, modelled on `FileViewerModal.jsx`'s Escape/backdrop-click contract, editing the **same** `data.label`/`data.note` fields the inline block already writes. `ProcessNode`'s own API (`{ id, data, selected }`) is unchanged — no call-site churn.

- [ ] **Step 1: Write the failing tests**

Extend `src/components/roadmap/ProcessNode.test.jsx` (the file already mocks `../../stores/useRoadmapStore` and `./ConnectionDot` — reuse that harness):

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
```
(add `fireEvent` to the existing `@testing-library/react` import)

```jsx
  it('has an expand button that opens the editor modal', () => {
    render(<ProcessNode id="n1" data={{ label: 'Step', note: 'a long note' }} selected={false} />)
    expect(screen.queryByTestId('process-editor-backdrop')).toBeNull()
    fireEvent.click(screen.getByLabelText('ขยายดู/แก้ไข'))
    expect(screen.getByTestId('process-editor-backdrop')).toBeInTheDocument()
  })
```

Create `src/components/roadmap/ProcessEditorModal.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const updateNodeData = vi.fn()
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData }),
}))

const { default: ProcessEditorModal } = await import('./ProcessEditorModal')

describe('ProcessEditorModal', () => {
  beforeEach(() => updateNodeData.mockClear())

  it('shows the current label and note', () => {
    render(<ProcessEditorModal nodeId="n1" data={{ label: 'Apply', note: 'Deadline soon' }} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Apply')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Deadline soon')).toBeInTheDocument()
  })

  it('edits patch the node via updateNodeData', () => {
    render(<ProcessEditorModal nodeId="n1" data={{ label: '', note: '' }} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'New title' } })
    expect(updateNodeData).toHaveBeenCalledWith('n1', { label: 'New title' })
    fireEvent.change(screen.getByPlaceholderText('Note (optional)'), { target: { value: 'New note' } })
    expect(updateNodeData).toHaveBeenCalledWith('n1', { note: 'New note' })
  })

  it('closes on backdrop click and Escape', () => {
    const onClose = vi.fn()
    render(<ProcessEditorModal nodeId="n1" data={{ label: '', note: '' }} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('process-editor-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/roadmap/ProcessNode.test.jsx src/components/roadmap/ProcessEditorModal.test.jsx`
Expected: FAIL — `ProcessEditorModal` module not found; `ขยายดู/แก้ไข` label doesn't exist yet.

- [ ] **Step 3: Implement `ProcessEditorModal.jsx`**

```jsx
import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Full-size editor for a Process block, portalled to document.body for the
// same transformed-viewport reason as FileViewerModal/MediaLightbox — the
// block lives inside React Flow's transformed pane, where a `position:fixed`
// child would inherit that scale/offset instead of the real screen. The
// block itself keeps its compact inline <input>/<textarea> for quick edits;
// this modal is only a more comfortable surface for a long note, writing
// through the exact same updateNodeData calls.
export default function ProcessEditorModal({ nodeId, data, onClose }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const onLabelChange = useCallback(
    (e) => updateNodeData(nodeId, { label: e.target.value }),
    [nodeId, updateNodeData],
  )
  const onNoteChange = useCallback(
    (e) => updateNodeData(nodeId, { note: e.target.value }),
    [nodeId, updateNodeData],
  )

  return createPortal(
    <div
      data-testid="process-editor-backdrop"
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface rounded-2xl shadow-hard-sm border-2 border-ink flex flex-col overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b-2 border-ink/10">
          <span className="pixel-font text-[11px] text-ink font-bold flex-1">Edit Process</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="neo-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:text-ink"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
          <input
            className="w-full text-[14px] font-semibold text-ink bg-transparent border-b-2 border-ink/10 outline-none focus:border-brand pb-2 placeholder:text-ink-soft/50"
            placeholder="Title"
            value={data.label}
            onChange={onLabelChange}
            autoFocus
          />
          <textarea
            className="w-full flex-1 min-h-[220px] text-[13px] text-ink bg-transparent outline-none resize-none placeholder:text-ink-soft/50 leading-relaxed"
            placeholder="Note (optional)"
            value={data.note}
            onChange={onNoteChange}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
```

- [ ] **Step 4: Wire the expand button into `ProcessNode.jsx`**

```jsx
import { useCallback, useState } from 'react'
import { Position } from '@xyflow/react'
import { Maximize2 } from 'lucide-react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import ConnectionDot from './ConnectionDot'
import ProcessEditorModal from './ProcessEditorModal'

export default function ProcessNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const [expanded, setExpanded] = useState(false)

  const onLabelChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )
  const onNoteChange = useCallback(
    (e) => updateNodeData(id, { note: e.target.value }),
    [id, updateNodeData],
  )

  return (
    <div
      className={`relative w-32 h-32 rounded-xl border-2 bg-surface p-2.5 flex flex-col gap-1 transition-all ${
        selected ? 'border-ink shadow-hard-sm' : 'border-ink/30 shadow-none'
      }`}
    >
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />

      <input
        className="w-full text-[12px] font-semibold text-ink bg-transparent outline-none placeholder:text-ink-soft/50 focus:placeholder:text-ink-soft"
        placeholder="Title"
        value={data.label}
        onChange={onLabelChange}
      />
      <textarea
        className="w-full flex-1 text-[10px] text-ink-soft bg-transparent outline-none resize-none placeholder:text-ink-soft/50 focus:placeholder:text-ink-soft leading-tight"
        placeholder="Note (optional)"
        value={data.note}
        onChange={onNoteChange}
      />

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
        aria-label="ขยายดู/แก้ไข"
        className="nodrag absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-surface border-2 border-ink flex items-center justify-center text-ink-soft hover:text-brand"
      >
        <Maximize2 size={13} />
      </button>

      <ConnectionDot type="source" position={Position.Right} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />

      {expanded && (
        <ProcessEditorModal nodeId={id} data={data} onClose={() => setExpanded(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/roadmap/ProcessNode.test.jsx src/components/roadmap/ProcessEditorModal.test.jsx`
Expected: PASS.

- [ ] **Step 6: Manual QA**

`npm run dev` → add a Process block, type a long note, click the new expand button (bottom-right corner). Confirm the modal shows the full label + a roomy textarea, edits reflect live on the block behind it once closed, Escape and backdrop-click both close it, and the inline block still works for quick edits without opening the modal.

- [ ] **Step 7: Commit**

```bash
git add src/components/roadmap/ProcessNode.jsx src/components/roadmap/ProcessEditorModal.jsx src/components/roadmap/ProcessNode.test.jsx src/components/roadmap/ProcessEditorModal.test.jsx
git commit -m "feat(roadmap): expand-to-edit modal for Process blocks"
```

---

### Task 3: Ctrl/Cmd+C / +V / +D shortcuts

**Files:**
- Modify: `src/stores/useRoadmapStore.js` (`clipboard` field, `copySelectionToClipboard`, `pasteClipboard`)
- Modify (extend): `src/stores/useRoadmapStore.test.js`
- Create: `src/hooks/useRoadmapShortcuts.js`
- Create: `src/hooks/useRoadmapShortcuts.test.js`
- Modify: `src/pages/RoadmapPage.jsx`

**Interfaces:**
- Produces: `useRoadmapStore.copySelectionToClipboard()` / `.pasteClipboard()` (mirrors the existing `duplicateSelection` id-remap-and-offset pattern, but decoupled into two steps so copy and paste can happen on different sheets/times); `useRoadmapShortcuts({ enabled, hasSelection, onDuplicate, onCopy, onPaste })` — a small hook, same shape/testing style as the existing `useLongPressDrag`.
- Consumes: nothing new from outside the store/hook themselves.

- [ ] **Step 1: Write the failing store tests**

Extend `src/stores/useRoadmapStore.test.js` inside the top `describe('useRoadmapStore', …)` block — add `clipboard: null` to the `beforeEach` reset object, then add:

```js
  it('copySelectionToClipboard snapshots selected nodes and internal edges', () => {
    useRoadmapStore.getState().setNodes([
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'b', type: 'process', position: { x: 100, y: 0 }, data: { label: 'B' } },
    ])
    useRoadmapStore.getState().setEdges([{ id: 'e1', source: 'a', target: 'b' }])
    useRoadmapStore.getState().setSelection(['a', 'b'])
    useRoadmapStore.getState().copySelectionToClipboard()
    const { clipboard } = useRoadmapStore.getState()
    expect(clipboard.nodes.map((n) => n.id)).toEqual(['a', 'b'])
    expect(clipboard.edges).toHaveLength(1)
  })

  it('copySelectionToClipboard does nothing when nothing is selected', () => {
    useRoadmapStore.getState().copySelectionToClipboard()
    expect(useRoadmapStore.getState().clipboard).toBeNull()
  })

  it('pasteClipboard adds new nodes with regenerated ids and an offset position', () => {
    useRoadmapStore.getState().setNodes([{ id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } }])
    useRoadmapStore.getState().setSelection(['a'])
    useRoadmapStore.getState().copySelectionToClipboard()
    useRoadmapStore.getState().pasteClipboard()
    const { nodes } = useRoadmapStore.getState()
    expect(nodes).toHaveLength(2)
    const pasted = nodes.find((n) => n.id !== 'a')
    expect(pasted.data.label).toBe('A')
    expect(pasted.position).toEqual({ x: 60, y: 60 })
  })

  it('pasteClipboard can be invoked repeatedly to paste multiple copies', () => {
    useRoadmapStore.getState().setNodes([{ id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} }])
    useRoadmapStore.getState().setSelection(['a'])
    useRoadmapStore.getState().copySelectionToClipboard()
    useRoadmapStore.getState().pasteClipboard()
    useRoadmapStore.getState().pasteClipboard()
    expect(useRoadmapStore.getState().nodes).toHaveLength(3)
  })

  it('pasteClipboard is a no-op with an empty clipboard', () => {
    useRoadmapStore.getState().pasteClipboard()
    expect(useRoadmapStore.getState().nodes).toHaveLength(0)
  })
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/stores/useRoadmapStore.test.js`
Expected: FAIL — `copySelectionToClipboard`/`pasteClipboard` are not functions.

- [ ] **Step 3: Implement the store additions**

In `src/stores/useRoadmapStore.js`, add `clipboard: null,` to the initial state object (near `selection: [],`), then add these two actions directly after `duplicateSelection`:

```js
      // In-memory clipboard for Ctrl/Cmd+C/V (Idea: "ทำ Short Cut Tool"). Never
      // touches the OS clipboard and never persists (omitted from
      // roadmapStorePartialize and from the Firestore sync toDoc/fromDoc) —
      // it's a short-lived, session-only buffer, same lifetime as `selection`.
      copySelectionToClipboard: () =>
        set((state) => {
          const ids = new Set(state.selection)
          if (ids.size === 0) return {}
          const nodes = state.nodes.filter((n) => ids.has(n.id))
          const edges = state.edges.filter((e) => ids.has(e.source) && ids.has(e.target))
          return { clipboard: { nodes, edges } }
        }),
      pasteClipboard: () =>
        set((state) => {
          if (!state.clipboard || state.clipboard.nodes.length === 0) return {}
          const OFFSET = 60
          const idMap = new Map(state.clipboard.nodes.map((n) => [n.id, nextId()]))
          const newNodes = state.clipboard.nodes.map((n) => ({
            ...n,
            id: idMap.get(n.id),
            position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
            selected: true,
          }))
          const newEdges = state.clipboard.edges.map((e) => ({
            ...e, id: nextId(), source: idMap.get(e.source), target: idMap.get(e.target),
          }))
          const nodes = [...state.nodes.map((n) => ({ ...n, selected: false })), ...newNodes]
          const edges = [...state.edges, ...newEdges]
          return { selection: newNodes.map((n) => n.id), ...applyToActive(state, { nodes, edges }) }
        }),
```

- [ ] **Step 4: Run the store tests**

Run: `npx vitest run src/stores/useRoadmapStore.test.js`
Expected: PASS.

- [ ] **Step 5: Write the failing hook tests**

Create `src/hooks/useRoadmapShortcuts.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRoadmapShortcuts } from './useRoadmapShortcuts'

function fireKey(key, opts = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true, ...opts }))
}

describe('useRoadmapShortcuts', () => {
  let onDuplicate, onCopy, onPaste
  beforeEach(() => {
    onDuplicate = vi.fn()
    onCopy = vi.fn()
    onPaste = vi.fn()
    document.body.innerHTML = ''
  })

  it('Ctrl/Cmd+D calls onDuplicate', () => {
    renderHook(() => useRoadmapShortcuts({ enabled: true, hasSelection: true, onDuplicate, onCopy, onPaste }))
    fireKey('d')
    expect(onDuplicate).toHaveBeenCalledTimes(1)
  })

  it('Ctrl/Cmd+C calls onCopy only when something is selected', () => {
    const { rerender } = renderHook(
      ({ hasSelection }) => useRoadmapShortcuts({ enabled: true, hasSelection, onDuplicate, onCopy, onPaste }),
      { initialProps: { hasSelection: false } },
    )
    fireKey('c')
    expect(onCopy).not.toHaveBeenCalled()
    rerender({ hasSelection: true })
    fireKey('c')
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('Ctrl/Cmd+V calls onPaste', () => {
    renderHook(() => useRoadmapShortcuts({ enabled: true, hasSelection: false, onDuplicate, onCopy, onPaste }))
    fireKey('v')
    expect(onPaste).toHaveBeenCalledTimes(1)
  })

  it('is a no-op while focus is inside a text input (normal text copy/paste keeps working)', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    renderHook(() => useRoadmapShortcuts({ enabled: true, hasSelection: true, onDuplicate, onCopy, onPaste }))
    fireKey('d')
    fireKey('c')
    fireKey('v')
    expect(onDuplicate).not.toHaveBeenCalled()
    expect(onCopy).not.toHaveBeenCalled()
    expect(onPaste).not.toHaveBeenCalled()
  })

  it('is a no-op when disabled (view-only sheet)', () => {
    renderHook(() => useRoadmapShortcuts({ enabled: false, hasSelection: true, onDuplicate, onCopy, onPaste }))
    fireKey('d')
    expect(onDuplicate).not.toHaveBeenCalled()
  })

  it('ignores keydown without Ctrl/Cmd held', () => {
    renderHook(() => useRoadmapShortcuts({ enabled: true, hasSelection: true, onDuplicate, onCopy, onPaste }))
    fireKey('d', { ctrlKey: false })
    expect(onDuplicate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run src/hooks/useRoadmapShortcuts.test.js`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement the hook**

Create `src/hooks/useRoadmapShortcuts.js`:

```js
import { useEffect } from 'react'

const isEditableTarget = (el) =>
  el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable

// Ctrl/Cmd+C/V/D for the Roadmap canvas (Idea: "ทำ Short Cut Tool"). A no-op
// while focus is inside a text field (so normal browser copy/paste inside a
// block's own label/note input keeps working) and while the sheet is
// read-only. Duplicate mirrors the existing "Dupe" button in
// SelectionActionBar exactly; Copy/Paste read/write an in-memory clipboard
// (see useRoadmapStore) — never the OS clipboard, so nothing here needs
// navigator.clipboard permissions.
export function useRoadmapShortcuts({ enabled, hasSelection, onDuplicate, onCopy, onPaste }) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e) => {
      if (isEditableTarget(document.activeElement)) return
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'd') {
        e.preventDefault()
        onDuplicate()
      } else if (key === 'c') {
        if (!hasSelection) return
        e.preventDefault()
        onCopy()
      } else if (key === 'v') {
        e.preventDefault()
        onPaste()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, hasSelection, onDuplicate, onCopy, onPaste])
}
```

- [ ] **Step 8: Run the hook tests**

Run: `npx vitest run src/hooks/useRoadmapShortcuts.test.js`
Expected: PASS.

- [ ] **Step 9: Wire it into `RoadmapPage.jsx`**

Add the import near the other hook imports:

```jsx
import { useRoadmapShortcuts } from '../hooks/useRoadmapShortcuts'
```

Add two store selectors next to the existing `duplicateSelection` one:

```jsx
  const copySelectionToClipboard = useRoadmapStore((s) => s.copySelectionToClipboard)
  const pasteClipboard = useRoadmapStore((s) => s.pasteClipboard)
```

Call the hook once, anywhere in the component body after `selection`/`canEdit` are defined (e.g. right after the `onSelectionChange` callback):

```jsx
  useRoadmapShortcuts({
    enabled: canEdit,
    hasSelection: selection.length > 0,
    onDuplicate: duplicateSelection,
    onCopy: copySelectionToClipboard,
    onPaste: pasteClipboard,
  })
```

- [ ] **Step 10: Manual QA**

`npm run dev` → open the Roadmap, select a block, press Ctrl/Cmd+D → duplicated in place (60px offset), same as the "Dupe" button. Select a block on Sheet A, Ctrl/Cmd+C, switch to Sheet B (`SheetSwitcher`), Ctrl/Cmd+V → pastes a copy into Sheet B. Click into a block's title/note field and press Ctrl/Cmd+C/V/D — confirm normal browser text copy/paste still works and nothing on the canvas duplicates. Switch a sheet to view-only (or open a shared `view` sheet) and confirm the shortcuts do nothing.

- [ ] **Step 11: Commit**

```bash
git add src/stores/useRoadmapStore.js src/stores/useRoadmapStore.test.js src/hooks/useRoadmapShortcuts.js src/hooks/useRoadmapShortcuts.test.js src/pages/RoadmapPage.jsx
git commit -m "feat(roadmap): Ctrl/Cmd+C/V/D shortcuts (in-memory clipboard, reuses duplicateSelection for Ctrl+D)"
```

---

### Task 4: IR Board — stop the admin browser and `irReport.mjs` from clobbering each other

**Files:**
- Modify: `src/services/irBoardSession.js`
- Modify (extend): `src/services/irBoardSession.test.js`
- Modify: `scripts/irReport.mjs`
- Create: `scripts/irReport.test.mjs`

**Interfaces:**
- Consumes: `createFirestoreListener()` from `src/lib/firestoreListener.js` (already used by chat/social/shop — same `attach`/`detach` lifecycle, new call site).
- Produces: `mountIrBoard`/`unmountIrBoard`'s existing return/side-effect contract is unchanged (still returns a `token`, still arms/disarms `roadmapSheetSync`) — the only addition is a live listener attached/detached alongside it. `scripts/irReport.mjs` gains an exported `runInTransaction(db, mutate)`; `runCommand`'s external contract (`runCommand(parsed, { db })`) is unchanged.

- [ ] **Step 1: Write the failing `irBoardSession` tests**

In `src/services/irBoardSession.test.js`, add `onSnapshot` to the mocks and mock `../lib/firestoreListener`:

```js
const m = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  armRoadmapSheetSync: vi.fn(),
  disarmRoadmapSheetSync: vi.fn(),
  attach: vi.fn(),
  detach: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getDoc: (...a) => m.getDoc(...a),
  setDoc: (...a) => m.setDoc(...a),
}))
vi.mock('../lib/firestoreListener', () => ({
  createFirestoreListener: () => ({ attach: (...a) => m.attach(...a), detach: (...a) => m.detach(...a) }),
}))
```
(keep the existing `../lib/db` and `../lib/syncManager` mocks unchanged)

Append new tests at the end of the `describe('irBoardSession', …)` block:

```js
  it('mountIrBoard attaches a real-time listener on the admin-idea-board doc', async () => {
    await mountIrBoard()
    expect(m.attach).toHaveBeenCalledWith({ _path: `roadmapSheets/${IR_SHEET_ID}` }, expect.any(Function))
  })

  it('the listener ignores the local echo of our own pending write', async () => {
    await mountIrBoard()
    const handler = m.attach.mock.calls[0][1]
    handler({
      metadata: { hasPendingWrites: true },
      data: () => ({ nodes: [{ id: 'from-remote' }], edges: [] }),
    })
    expect(useRoadmapStore.getState().nodes).not.toEqual([{ id: 'from-remote' }])
  })

  it('the listener applies a genuine remote snapshot (a script write) into the live IR sheet', async () => {
    await mountIrBoard()
    const handler = m.attach.mock.calls[0][1]
    handler({
      metadata: { hasPendingWrites: false },
      data: () => ({ nodes: [{ id: 'from-script' }], edges: [] }),
    })
    const { nodes, sheets } = useRoadmapStore.getState()
    expect(nodes).toEqual([{ id: 'from-script' }])
    expect(sheets.find((s) => s.id === IR_SHEET_ID).nodes).toEqual([{ id: 'from-script' }])
  })

  it('unmountIrBoard detaches the listener', async () => {
    const token = await mountIrBoard()
    await unmountIrBoard(token)
    expect(m.detach).toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/services/irBoardSession.test.js`
Expected: FAIL — `m.attach`/`m.detach` never called; the module doesn't import `createFirestoreListener` yet.

- [ ] **Step 3: Implement the listener in `irBoardSession.js`**

Replace `src/services/irBoardSession.js` in full:

```js
import { getDoc, setDoc } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import { IR_SHEET_ID } from '../constants/irBoard'
import { ADMIN_UID } from '../constants/admin'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import { armRoadmapSheetSync, disarmRoadmapSheetSync } from '../lib/syncManager'
import { createFirestoreListener } from '../lib/firestoreListener'

export async function ensureIrBoardDoc() {
  const ref = refs.roadmapSheet(IR_SHEET_ID)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()
  const data = shapes.newRoadmapSheet({
    ownerUid: ADMIN_UID,
    name: 'IR Board',
    nodes: [],
    edges: [],
    order: -1,
  })
  await setDoc(ref, data)
  return data
}

// Overlapping mount/unmount pairs happen in dev (React StrictMode runs the IR
// tab effect twice, so two mounts race the same await). Only the newest mount
// may hydrate the store, and only that mount's token may later restore it —
// otherwise a stale unmount could re-arm the user's sheet sync while the
// visible board still edits the IR sheet.
let mountSeq = 0
let liveToken = null

// admin-idea-board is the ONLY roadmapSheets doc a live browser session and
// scripts/irReport.mjs (Claude Code/Cursor's iloveskill workflow) can write
// concurrently — every other Roadmap sheet is per-user and the script never
// touches it. roadmapSheetSync is otherwise a one-shot hydrate + a
// 1s-debounced write with no listener (CLAUDE.md: debounced writes only) —
// this real-time listener is scoped to that single document so an admin's
// open IR tab picks up a script's append/status write live instead of only
// on the next remount, and so the browser's own next debounced write carries
// the script's change forward instead of blindly overwriting it.
const irListener = createFirestoreListener()

export async function mountIrBoard() {
  const prev = useRoadmapStore.getState()
  const token = {
    seq: ++mountSeq,
    sheets: prev.sheets,
    activeSheetId: prev.activeSheetId,
  }
  disarmRoadmapSheetSync()
  let data
  try {
    data = await ensureIrBoardDoc()
  } catch (err) {
    if (token.seq === mountSeq && token.activeSheetId) armRoadmapSheetSync(token.activeSheetId)
    throw err
  }
  if (token.seq !== mountSeq) return token
  const irSheet = {
    id: IR_SHEET_ID,
    name: data.name ?? 'IR Board',
    nodes: data.nodes ?? [],
    edges: data.edges ?? [],
    timeline: data.timeline ?? null,
    ownerUid: data.ownerUid ?? ADMIN_UID,
    myRole: 'edit',
  }
  const sheets = [
    ...token.sheets.filter((s) => s.id !== IR_SHEET_ID),
    irSheet,
  ]
  useRoadmapStore.getState().hydrateSheets(sheets, IR_SHEET_ID)
  useRoadmapStore.setState({ irReturnSheetId: token.activeSheetId })
  armRoadmapSheetSync(IR_SHEET_ID)
  liveToken = token

  // Skip the local echo of our own pending write (hasPendingWrites) so this
  // never races the admin's own debounced save; only apply a snapshot while
  // this mount is still the live one and the IR sheet is still the one open.
  irListener.attach(refs.roadmapSheet(IR_SHEET_ID), (snap) => {
    if (token.seq !== mountSeq || snap.metadata.hasPendingWrites) return
    if (useRoadmapStore.getState().activeSheetId !== IR_SHEET_ID) return
    const remote = snap.data()
    if (!remote) return
    useRoadmapStore.setState((state) => ({
      nodes: remote.nodes ?? [],
      edges: remote.edges ?? [],
      sheets: state.sheets.map((sh) =>
        sh.id === IR_SHEET_ID ? { ...sh, nodes: remote.nodes ?? [], edges: remote.edges ?? [] } : sh,
      ),
    }))
  })

  return token
}

export async function unmountIrBoard(token) {
  if (!token || token !== liveToken) return
  liveToken = null
  irListener.detach()
  disarmRoadmapSheetSync()
  const sheets = (token.sheets ?? []).filter((s) => s.id !== IR_SHEET_ID)
  const activeSheetId = token.activeSheetId === IR_SHEET_ID
    ? (sheets[0]?.id ?? null)
    : token.activeSheetId
  useRoadmapStore.getState().hydrateSheets(sheets, activeSheetId)
  useRoadmapStore.setState({ irReturnSheetId: null })
  if (activeSheetId) armRoadmapSheetSync(activeSheetId)
}
```

- [ ] **Step 4: Run the `irBoardSession` tests**

Run: `npx vitest run src/services/irBoardSession.test.js`
Expected: PASS (including the four pre-existing tests — they only exercise `getDoc`/`setDoc`/sync arm/disarm, unaffected by the listener addition).

- [ ] **Step 5: Write the failing `irReport.mjs` transaction test**

Create `scripts/irReport.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { runCommand } from './irReport.mjs'

// Minimal fake of the Admin SDK surface irReport.mjs touches: db.doc(path)
// for read-only commands, and db.runTransaction(fn) for the three mutating
// commands. tx.get() re-reads `store` fresh each call, so a test can put a
// "concurrent write" into the store right before invoking runCommand and
// prove the transaction picks it up instead of silently dropping it.
function makeFakeDb(initialDoc) {
  let store = initialDoc
  return {
    _peek: () => store,
    doc: () => ({
      get: async () => ({ exists: store != null, data: () => store }),
    }),
    runTransaction: async (fn) => {
      const ref = {}
      const tx = {
        get: async () => ({ exists: store != null, data: () => store }),
        set: (_ref, data) => { store = { ...store, ...data } },
      }
      return fn(tx, ref)
    },
  }
}

describe('irReport.mjs — transactional writes (admin-idea-board only)', () => {
  it('set-status recomputes off a fresh transaction read, preserving a concurrent write', async () => {
    const db = makeFakeDb({
      nodes: [{ id: 'idea-1', type: 'ideaRoot', position: { x: 0, y: 0 }, data: { status: 'idea' } }],
      edges: [{ id: 'e-existing', source: 'a', target: 'b' }],
    })

    // Simulate the admin's browser autosave landing "between" the script
    // starting and actually committing — mutate the fake store directly
    // before runCommand's transaction reads it.
    db._peek().edges.push({ id: 'e-from-browser', source: 'x', target: 'y' })

    await runCommand({ command: 'set-status', ideaId: 'idea-1', status: 'planned' }, { db })

    const final = db._peek()
    expect(final.nodes.find((n) => n.id === 'idea-1').data.status).toBe('planned')
    // The concurrent edge survived — the transaction wrote off a fresh read
    // that already included it, not a stale copy loaded earlier.
    expect(final.edges.map((e) => e.id)).toContain('e-from-browser')
  })

  it('append-update sets status to in-progress and appends a report node from a fresh read', async () => {
    const db = makeFakeDb({
      nodes: [{ id: 'idea-1', type: 'ideaRoot', position: { x: 0, y: 0 }, data: { status: 'idea', title: 'X' } }],
      edges: [],
    })

    await runCommand({ command: 'append-update', ideaId: 'idea-1', summary: 'progress note' }, { db })

    const final = db._peek()
    expect(final.nodes.find((n) => n.id === 'idea-1').data.status).toBe('in-progress')
    expect(final.nodes.some((n) => n.type === 'update')).toBe(true)
  })
})
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run scripts/irReport.test.mjs`
Expected: FAIL — `set-status`/`append-update` currently call `saveBoard`'s blind `set(merge:true)` against data loaded before this test's simulated concurrent mutation, so the concurrent edge is silently dropped (or, depending on the exact fake shape, the test simply can't be satisfied by the current `loadBoard`/`saveBoard` code path).

- [ ] **Step 7: Implement the transaction in `scripts/irReport.mjs`**

Replace the `docRef`/`loadBoard`/`saveBoard` block and the three mutating `case`s:

```js
const docRef = (db) => db.doc(`roadmapSheets/${IR_SHEET_ID}`)

async function loadBoard(db) {
  const snap = await docRef(db).get()
  if (!snap.exists) {
    throw new Error('IR Board missing — run: node scripts/irReport.mjs ensure')
  }
  return snap.data()
}

// Wrap a read-modify-write in a Firestore transaction so a concurrent writer
// (the admin's browser, autosaving via roadmapSheetSync's 1s-debounced
// setDoc(merge:true)) can never be silently clobbered by a stale read:
// tx.get() re-reads the doc fresh at commit time and `mutate` computes off
// THAT data — never off whatever an earlier loadBoard() call returned.
export async function runInTransaction(db, mutate) {
  const ref = docRef(db)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new Error('IR Board missing — run: node scripts/irReport.mjs ensure')
    }
    const { nodes, edges } = mutate(snap.data())
    tx.set(ref, { nodes, edges, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
  })
}

async function ensureBoard(db) {
  const ref = docRef(db)
  const snap = await ref.get()
  if (snap.exists) return
  await ref.set({
    ownerUid: ADMIN_UID,
    name: 'IR Board',
    nodes: [],
    edges: [],
    order: -1,
    collaborators: {},
    collaboratorUids: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}
```

(`saveBoard` is deleted — nothing calls it anymore.)

In `runCommand`'s `switch`, replace the three mutating cases:

```js
    case 'set-status': {
      await runInTransaction(firestore, (board) => ({
        nodes: setIdeaStatus(board.nodes, parsed.ideaId, parsed.status),
        edges: board.edges ?? [],
      }))
      return
    }
    case 'append-update': {
      await runInTransaction(firestore, (board) => {
        let { nodes, edges } = appendReportNode({
          nodes: board.nodes,
          edges: board.edges,
          ideaId: parsed.ideaId,
          type: 'update',
          summary: parsed.summary,
        })
        nodes = setIdeaStatus(nodes, parsed.ideaId, 'in-progress')
        return { nodes, edges }
      })
      return
    }
    case 'append-success': {
      await runInTransaction(firestore, (board) => {
        let { nodes, edges } = appendReportNode({
          nodes: board.nodes,
          edges: board.edges,
          ideaId: parsed.ideaId,
          type: 'success',
          summary: parsed.summary,
        })
        nodes = setIdeaStatus(nodes, parsed.ideaId, 'done')
        return { nodes, edges }
      })
      return
    }
```

(`list`/`read` keep using `loadBoard` — they're read-only, no conflict risk.)

- [ ] **Step 8: Run tests**

Run: `npx vitest run scripts/irReport.test.mjs`
Expected: PASS.

- [ ] **Step 9: Manual QA (real Firestore concurrency can't be expressed in a unit test)**

With `GOOGLE_APPLICATION_CREDENTIALS` set: open the Admin Dashboard IR tab in a browser, add an idea, wait for it to sync. In a terminal run `node scripts/irReport.mjs append-update <ideaId> "test update"` while the tab stays open. Confirm: (a) the browser's IR tab shows the new update node appear **without a remount** (the realtime listener), and (b) if you simultaneously edit an unrelated field in the browser right as the script runs, neither write is lost after both settle (refresh to confirm).

- [ ] **Step 10: Commit**

```bash
git add src/services/irBoardSession.js src/services/irBoardSession.test.js scripts/irReport.mjs scripts/irReport.test.mjs
git commit -m "fix(ir-board): admin-idea-board realtime listener + transactional script writes so concurrent edits stop clobbering each other"
```

---

### Task 5: Public, no-account share link for a Roadmap sheet

**Files:**
- Modify: `src/lib/db.js` (`queries.sheetByShareId`)
- Modify: `src/services/roadmapSheets.js` (`setSheetPublic`, `buildPublicShareUrl`)
- Modify (extend): `src/services/roadmapSheets.test.js`
- Modify: `src/components/roadmap/ShareSheetModal.jsx` ("Public link" section)
- Create: `src/components/roadmap/ShareSheetModal.test.jsx`
- Create: `src/pages/RoadmapPublicView.jsx`
- Create: `src/pages/RoadmapPublicView.test.jsx`
- Modify: `src/App.jsx` (lazy import + `/view/:shareId` route on `RoadmapSiteRoutes`)
- Modify: `firestore.rules` (unauthenticated read when `public == true`; block collaborators from toggling it)
- Modify (extend): `test/rules/firestore.rules.test.js`
- Create: `firestore.indexes.json` (no such file exists yet)
- Modify: `.iloveskill/pending-deploys.json` (enqueue both deploys — never deploy directly)

**Interfaces:**
- Produces: `roadmapSheets/{sheetId}` gains optional `public: boolean` + `shareId: string` fields, toggled only by the sheet owner. `queries.sheetByShareId(shareId)` — a one-shot `where('shareId','==',…).where('public','==',true).limit(1)` query. `buildPublicShareUrl(shareId) -> string` — the canonical `https://roadmap.ilovetcas.com/view/{shareId}` URL. `RoadmapPublicView` — a standalone read-only page, **not** wired through `useRoadmapStore`/`syncManager` (fetches its own one-shot snapshot into local component state), so a visitor's own guest/local board is never touched.
- Consumes: `nodeTypes` (`src/components/roadmap/nodeTypes.js`) purely for rendering fidelity — see Step 9 for why interaction is disabled without touching any individual node component.

- [ ] **Step 1: Write the failing rules tests**

In `test/rules/firestore.rules.test.js`, inside `describe('Roadmap Sheets rules (roadmapSheets/{sheetId})', …)`, append:

```js
  it('allows an unauthenticated visitor to read a sheet with public:true', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'roadmapSheets/sheet-1'), { public: true, shareId: 'share-abc' }, { merge: true })
    })
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'roadmapSheets/sheet-1')))
  })

  it('BLOCKS an unauthenticated visitor when the sheet is not public', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'roadmapSheets/sheet-1')))
  })

  it('lets an unauthenticated visitor run the shareId lookup query when scoped to public docs', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'roadmapSheets/sheet-1'), { public: true, shareId: 'share-abc' }, { merge: true })
    })
    const anon = testEnv.unauthenticatedContext().firestore()
    const q = query(collection(anon, 'roadmapSheets'), where('shareId', '==', 'share-abc'), where('public', '==', true))
    await assertSucceeds(getDocs(q))
  })

  it('lets the owner toggle public sharing', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(alice, 'roadmapSheets/sheet-1'), { public: true, shareId: 'share-xyz' }))
  })

  it('BLOCKS an edit-collaborator from turning on public sharing', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), { public: true, shareId: 'x' }))
  })
```

- [ ] **Step 2: Run rules tests to verify they fail**

Run: `npm run test:rules`
Expected: FAIL on the new tests (no `public` carve-out in the rule yet — the read/query tests fail; the owner-toggle test currently passes trivially since owners can already write anything, which is fine, but the edit-collaborator test also currently passes since nothing blocks `public`/`shareId` today — expect that one to actually be a false-pass right now and re-check it after Step 3 tightens the rule). Requires the emulator; if it can't run locally, note it and continue — Step 3's rule text is exact.

- [ ] **Step 3: Add the rules**

In `firestore.rules`, inside the `match /roadmapSheets/{sheetId}` block, update `canReadSheet()` and `isEditCollaborator`'s update guard:

```
      function canReadSheet() {
        return isSheetOwner() ||
          (isSignedIn() && request.auth.uid in resource.data.get('collaboratorUids', [])) ||
          resource.data.get('public', false) == true;
      }
      function isEditCollaborator() {
        return isSheetCollaborator() && resource.data.collaborators[request.auth.uid] == 'edit';
      }

      allow read: if canReadSheet() || (sheetId == 'admin-idea-board' && isAnyAdmin());
      allow create: if (isSignedIn() && request.auth.uid == request.resource.data.ownerUid)
        || (sheetId == 'admin-idea-board' && isAnyAdmin());
      allow update: if isSheetOwner() ||
        (isEditCollaborator() &&
          resource.data.ownerUid == request.resource.data.ownerUid &&
          resource.data.collaborators == request.resource.data.collaborators &&
          resource.data.collaboratorUids == request.resource.data.collaboratorUids &&
          !request.resource.data.diff(resource.data).affectedKeys().hasAny(['public', 'shareId']))
        || (sheetId == 'admin-idea-board' && isAnyAdmin());
      allow delete: if isSheetOwner();
```

(Only `canReadSheet()`'s function body and `isEditCollaborator`'s update-guard line change — everything else in the match block is unchanged.)

- [ ] **Step 4: Run rules tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS (all Roadmap Sheets rules tests green, including the pre-existing ones — the added `public`/`shareId` guard only restricts edit-collaborators, owners are untouched).

- [ ] **Step 5: Create `firestore.indexes.json`**

No such file exists in the repo yet. The `shareId`+`public` two-field equality query needs a composite index in production (the local rules-emulator suite passes without it — the emulator doesn't enforce composite-index requirements — but a live Firestore query would fail with a "requires an index" error until this is deployed). Create `firestore.indexes.json` at the repo root:

```json
{
  "indexes": [
    {
      "collectionGroup": "roadmapSheets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "shareId", "order": "ASCENDING" },
        { "fieldPath": "public", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 6: Enqueue both deploys (never deploy directly)**

Edit `.iloveskill/pending-deploys.json` so `commands` contains (keep any existing entries):

```json
{
  "commands": [
    "firebase deploy --only firestore:rules",
    "firebase deploy --only firestore:indexes"
  ]
}
```

(`.iloveskill/` is gitignored — do not `git add` it. Until `/unlock-bkb` runs, public sheets are unreadable by anonymous visitors in production and the shareId query will fail there — Task 5's own manual QA in Step 12 will surface this if run against prod before the unlock.)

- [ ] **Step 7: Commit the rules + indexes**

```bash
git add firestore.rules firestore.indexes.json test/rules/firestore.rules.test.js
git commit -m "feat(roadmap): firestore rules + index for public (no-account) sheet viewing"
```

- [ ] **Step 8: Add the query builder and service functions**

In `src/lib/db.js`, add to `queries`:

```js
  sheetByShareId: (shareId) => query(
    cols.roadmapSheets,
    where('shareId', '==', shareId),
    where('public', '==', true),
    limit(1),
  ),
```

In `src/services/roadmapSheets.js`, add `getDoc` to the `firebase/firestore` import and `SITES` from `../constants/sites`, then add:

```js
// A shared link always points at the public roadmap subdomain viewer so it
// works for a recipient with no account and no session on this host.
export function buildPublicShareUrl(shareId) {
  return `${SITES.roadmap.path}/view/${shareId}`
}

// Toggling on mints a shareId once (random, not the raw sheetId, to avoid
// enumeration) and reuses it on subsequent enables — turning sharing off
// alone already revokes every outstanding link via the `public` gate in
// firestore.rules, so a fresh id is only needed if the owner wants to
// invalidate one specific leaked link while staying public (not built here —
// see Out of scope).
export async function setSheetPublic(sheetId, isPublic) {
  const sheet = useRoadmapStore.getState().sheets.find((s) => s.id === sheetId)
  if (!sheet || sheet.myRole !== 'owner') {
    throw new Error('[roadmapSheets] Only the owner can toggle public sharing')
  }
  const snap = await getDoc(refs.roadmapSheet(sheetId))
  const existingShareId = snap.exists() ? snap.data().shareId : null
  const shareId = isPublic ? (existingShareId ?? crypto.randomUUID()) : existingShareId
  const patch = { public: isPublic }
  if (isPublic && !existingShareId) patch.shareId = shareId
  await updateDoc(refs.roadmapSheet(sheetId), patch)
  return shareId
}
```

- [ ] **Step 9: Write the failing service tests**

Extend `src/services/roadmapSheets.test.js` — add `getDoc: vi.fn()` to the hoisted `m` and to the `vi.mock('firebase/firestore', …)` return, then import `setSheetPublic, buildPublicShareUrl` alongside the existing named imports, then append:

```js
  describe('setSheetPublic / buildPublicShareUrl', () => {
    it('mints a shareId on first enable', async () => {
      m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) })
      const shareId = await setSheetPublic('sheet-1', true)
      expect(shareId).toBeTruthy()
      expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/sheet-1' }, { public: true, shareId })
    })

    it('reuses an existing shareId instead of minting a new one', async () => {
      m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ shareId: 'existing-id' }) })
      const shareId = await setSheetPublic('sheet-1', true)
      expect(shareId).toBe('existing-id')
      expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/sheet-1' }, { public: true })
    })

    it('turning off just flips public, keeping shareId untouched', async () => {
      m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ shareId: 'existing-id', public: true }) })
      const shareId = await setSheetPublic('sheet-1', false)
      expect(shareId).toBe('existing-id')
      expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/sheet-1' }, { public: false })
    })

    it('throws when the caller is not the owner', async () => {
      useRoadmapStore.setState((s) => ({
        sheets: s.sheets.map((sh) => (sh.id === 'sheet-1' ? { ...sh, myRole: 'edit' } : sh)),
      }))
      await expect(setSheetPublic('sheet-1', true)).rejects.toThrow()
      expect(m.updateDoc).not.toHaveBeenCalled()
    })

    it('builds the canonical roadmap.ilovetcas.com view URL', () => {
      expect(buildPublicShareUrl('abc123')).toBe('https://roadmap.ilovetcas.com/view/abc123')
    })
  })
```

- [ ] **Step 10: Run to verify failure, then implement, then re-run**

Run: `npx vitest run src/services/roadmapSheets.test.js` → FAIL (functions don't exist yet — if Step 8 was already applied, skip straight to the pass check). After Step 8's implementation:
Run: `npx vitest run src/services/roadmapSheets.test.js`
Expected: PASS.

- [ ] **Step 11: Add the "Public link" section to `ShareSheetModal.jsx`**

Add imports: `Globe`, `Copy` to the existing `lucide-react` import; `getDoc` from `'firebase/firestore'`; `refs` from `'../../lib/db'`; `setSheetPublic, buildPublicShareUrl` alongside the existing `shareSheet` import. Add state and effect near the top of the component:

```jsx
  const [publicState, setPublicState] = useState({ loading: true, isPublic: false, shareId: null })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    getDoc(refs.roadmapSheet(sheetId)).then((snap) => {
      if (!alive || !snap.exists()) return
      const data = snap.data()
      setPublicState({ loading: false, isPublic: Boolean(data.public), shareId: data.shareId ?? null })
    })
    return () => { alive = false }
  }, [sheetId])

  const togglePublic = async () => {
    const next = !publicState.isPublic
    setPublicState((s) => ({ ...s, loading: true }))
    const shareId = await setSheetPublic(sheetId, next)
    setPublicState({ loading: false, isPublic: next, shareId: shareId ?? publicState.shareId })
  }

  const copyLink = async () => {
    if (!publicState.shareId) return
    await navigator.clipboard.writeText(buildPublicShareUrl(publicState.shareId))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
```

Insert this new section between the header `<div>` and the existing "Access:" `<div>`:

```jsx
        {/* Public link — no account needed to view */}
        <div className="px-4 py-3 border-b-2 border-ink/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="pixel-font text-[10px] text-ink flex items-center gap-1.5">
              <Globe size={13} className="text-brand" /> Public link
            </span>
            <button
              type="button"
              onClick={togglePublic}
              disabled={publicState.loading}
              aria-pressed={publicState.isPublic}
              aria-label="Toggle public link"
              className={[
                'pixel-font text-[9px] px-3 py-1 rounded-full transition-all disabled:opacity-50',
                publicState.isPublic ? 'bg-brand text-white' : 'bg-brand/10 text-ink',
              ].join(' ')}
            >
              {publicState.isPublic ? 'On' : 'Off'}
            </button>
          </div>
          {publicState.isPublic && publicState.shareId && (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={buildPublicShareUrl(publicState.shareId)}
                aria-label="Public share link"
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 text-[10px] px-2 py-1.5 rounded-lg border border-ink/20 bg-brand-soft/30 text-ink-soft truncate"
              />
              <button
                type="button"
                onClick={copyLink}
                aria-label="Copy link"
                className="neo-btn w-8 h-8 rounded-lg flex items-center justify-center text-ink-soft hover:text-brand shrink-0"
              >
                {copied ? <Check size={14} className="text-good" /> : <Copy size={14} />}
              </button>
            </div>
          )}
          <p className="pixel-font text-[8px] text-ink-soft/70">Anyone with the link can view — they cannot edit.</p>
        </div>
```

Also add `useEffect` to the existing `react` import (currently only `useEffect, useMemo, useState` — `useEffect` is already imported, no change needed there).

- [ ] **Step 12: Write and run the modal test**

Create `src/components/roadmap/ShareSheetModal.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({ getDoc: vi.fn(), setSheetPublic: vi.fn() }))

vi.mock('firebase/firestore', () => ({ getDoc: (...a) => m.getDoc(...a) }))
vi.mock('../../lib/db', () => ({ refs: { roadmapSheet: (id) => ({ _path: `roadmapSheets/${id}` }) } }))
vi.mock('../../stores/useSocialStore', () => ({
  useSocialStore: (sel) => sel({ following: [], followers: [], requestUsers: {}, hydrateRequestUsers: () => {} }),
}))
vi.mock('../../services/roadmapSheets', () => ({
  shareSheet: vi.fn(),
  setSheetPublic: (...a) => m.setSheetPublic(...a),
  buildPublicShareUrl: (shareId) => `https://roadmap.ilovetcas.com/view/${shareId}`,
}))

const { default: ShareSheetModal } = await import('./ShareSheetModal')

describe('ShareSheetModal — public link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ public: false, shareId: null }) })
  })

  it('shows the toggle off and no link input when the sheet is not public', async () => {
    render(<ShareSheetModal sheetId="sheet-1" onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Toggle public link')).toHaveTextContent('Off'))
    expect(screen.queryByLabelText('Public share link')).toBeNull()
  })

  it('shows the copy-link input once already public', async () => {
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ public: true, shareId: 'share-abc' }) })
    render(<ShareSheetModal sheetId="sheet-1" onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByLabelText('Public share link')).toHaveValue('https://roadmap.ilovetcas.com/view/share-abc'),
    )
  })

  it('toggling on calls setSheetPublic and reveals the link once it resolves', async () => {
    m.setSheetPublic.mockResolvedValue('new-share-id')
    render(<ShareSheetModal sheetId="sheet-1" onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Toggle public link')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Toggle public link'))
    await waitFor(() => expect(m.setSheetPublic).toHaveBeenCalledWith('sheet-1', true))
    await waitFor(() =>
      expect(screen.getByLabelText('Public share link')).toHaveValue('https://roadmap.ilovetcas.com/view/new-share-id'),
    )
  })
})
```

Run: `npx vitest run src/components/roadmap/ShareSheetModal.test.jsx`
Expected: PASS.

- [ ] **Step 13: Write the failing `RoadmapPublicView` test**

Create `src/pages/RoadmapPublicView.test.jsx`. Note: this codebase never renders a real `@xyflow/react` canvas in jsdom tests (`ConnectionDot.test.jsx` mocks `@xyflow/react` entirely) — follow that convention rather than mounting a live `<ReactFlow>`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const m = vi.hoisted(() => ({ getDocs: vi.fn() }))
vi.mock('firebase/firestore', () => ({ getDocs: (...a) => m.getDocs(...a) }))
vi.mock('../lib/db', () => ({ queries: { sheetByShareId: (id) => ({ _shareId: id }) } }))
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }) => <div data-testid="reactflow-stub">{children}</div>,
  Background: () => null,
  Controls: () => null,
}))
vi.mock('../components/roadmap/nodeTypes', () => ({ nodeTypes: {} }))
vi.mock('../components/roadmap/AnnotationEdge', () => ({ default: () => null }))
vi.mock('../components/roadmap/InvisibleEdge', () => ({ default: () => null }))

const { default: RoadmapPublicView } = await import('./RoadmapPublicView')

function renderAt(shareId) {
  return render(
    <MemoryRouter initialEntries={[`/view/${shareId}`]}>
      <Routes>
        <Route path="/view/:shareId" element={<RoadmapPublicView />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoadmapPublicView', () => {
  beforeEach(() => m.getDocs.mockReset())

  it('shows a not-found state when no public sheet matches the shareId', async () => {
    m.getDocs.mockResolvedValue({ docs: [] })
    renderAt('missing')
    await waitFor(() => expect(screen.getByText(/isn't public/i)).toBeInTheDocument())
  })

  it('renders the sheet name and a View only badge for a matching public sheet', async () => {
    m.getDocs.mockResolvedValue({ docs: [{ data: () => ({ name: 'My Plan', nodes: [], edges: [] }) }] })
    renderAt('share-abc')
    await waitFor(() => expect(screen.getByText('My Plan')).toBeInTheDocument())
    expect(screen.getByText('View only')).toBeInTheDocument()
  })
})
```

- [ ] **Step 14: Run to verify failure**

Run: `npx vitest run src/pages/RoadmapPublicView.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 15: Implement `RoadmapPublicView.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ReactFlow, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getDocs } from 'firebase/firestore'
import { queries } from '../lib/db'
import { nodeTypes } from '../components/roadmap/nodeTypes'
import AnnotationEdge from '../components/roadmap/AnnotationEdge'
import InvisibleEdge from '../components/roadmap/InvisibleEdge'

const edgeTypes = { default: InvisibleEdge, annotation: AnnotationEdge }

// Public, unauthenticated, view-only Roadmap — reached via a shareId minted
// by ShareSheetModal's "Public link" toggle (never the raw Firestore
// sheetId, to avoid enumeration). Deliberately bypasses
// useRoadmapStore/syncManager entirely: it renders a one-shot snapshot in
// local component state, so a visitor's own guest/local roadmap is never
// touched and nothing here can write back to the shared board. Node
// internals (ProcessNode's <input>, etc.) stay mounted as-is for visual
// fidelity, but the `[&_.react-flow__node]` wrapper strips pointer-events
// off everything inside a node so nothing is focusable/editable — clicks
// fall through to the pane for pan/zoom instead. This avoids threading a
// readOnly prop through every node component (ProcessNode, ImageNode,
// FileNode, ConditionNode, IdeaRootNode…) for a view that must never touch
// StartNode.jsx either way.
export default function RoadmapPublicView() {
  const { shareId } = useParams()
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let alive = true
    getDocs(queries.sheetByShareId(shareId))
      .then((snap) => {
        if (!alive) return
        const doc = snap.docs[0]
        if (!doc) { setState({ status: 'not-found' }); return }
        const data = doc.data()
        setState({ status: 'ready', name: data.name ?? 'Roadmap', nodes: data.nodes ?? [], edges: data.edges ?? [] })
      })
      .catch(() => { if (alive) setState({ status: 'error' }) })
    return () => { alive = false }
  }, [shareId])

  if (state.status === 'loading') {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span className="pixel-font text-[10px] text-ink-soft">Loading...</span>
      </div>
    )
  }

  if (state.status !== 'ready') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-center px-6">
        <span className="text-3xl" aria-hidden="true">🔒</span>
        <p className="pixel-font text-[10px] text-ink">This Roadmap link isn't public</p>
        <p className="pixel-font text-[9px] text-ink-soft">It may have been unshared, or the link is wrong.</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#F4F7FC]">
      <div className="shrink-0 px-4 py-2 border-b border-ink/10 bg-white flex items-center gap-2">
        <span className="pixel-font text-[10px] text-ink font-bold truncate">{state.name}</span>
        <span className="pixel-font text-[8px] text-ink-soft ml-auto">View only</span>
      </div>
      <div className="flex-1 relative [&_.react-flow__node]:pointer-events-none">
        <ReactFlow
          nodes={state.nodes}
          edges={state.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          fitView
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  )
}
```

- [ ] **Step 16: Run the test**

Run: `npx vitest run src/pages/RoadmapPublicView.test.jsx`
Expected: PASS.

- [ ] **Step 17: Wire the route in `App.jsx`**

Add the lazy import next to the other feature-site pages:

```jsx
const RoadmapPublicView = lazy(() => import('./pages/RoadmapPublicView'))
```

In `RoadmapSiteRoutes`, add the route between `/editor` and the catch-all:

```jsx
      <Route
        path="/view/:shareId"
        element={(
          <FeatureLayout>
            <RoadmapPublicView />
          </FeatureLayout>
        )}
      />
```

- [ ] **Step 18: Manual QA**

`npm run dev` → sign in → open the Roadmap → `SheetSwitcher` → Share icon → toggle "Public link" on → copy the link. Open that link in a private/incognito window (no session): confirm the board renders read-only (pan/zoom work, but clicking into any block's input/textarea does nothing, no palette/toolbar/SelectionActionBar visible). Toggle "Public link" off in the original tab, reload the incognito tab: confirm it now shows the "isn't public" state. (Requires the Task 5 rules+index deploy or the local emulator — if production rules/index still reject the read/query, note it in the commit body and re-verify after `/unlock-bkb`.)

- [ ] **Step 19: Commit**

```bash
git add src/lib/db.js src/services/roadmapSheets.js src/services/roadmapSheets.test.js src/components/roadmap/ShareSheetModal.jsx src/components/roadmap/ShareSheetModal.test.jsx src/pages/RoadmapPublicView.jsx src/pages/RoadmapPublicView.test.jsx src/App.jsx
git commit -m "feat(roadmap): public no-account share link (view-only) for a Roadmap sheet"
```

---

### Task 6: Full-suite gate

- [ ] **Step 1: Run everything**

Run: `npm test`
Expected: entire Vitest suite PASS. Then `npm run test:rules` — PASS.

- [ ] **Step 2: Fix any fallout, commit fixes individually**

If a suite fails, use `superpowers:systematic-debugging` — reproduce, isolate to the owning task's files, fix there, and commit as `fix(...)`.

- [ ] **Step 3: Confirm the pending-deploy queue is correct**

`cat .iloveskill/pending-deploys.json` (gitignored, not committed) should contain exactly:
```json
{ "commands": ["firebase deploy --only firestore:rules", "firebase deploy --only firestore:indexes"] }
```
Do not run `/unlock-bkb` as part of this plan unless the user explicitly asks — flushing the queue is a separate, deliberate step.

---

## Out of scope / deferred

- Expand-to-edit for `ConditionNode`/`IdeaRootNode`/`UpdateNode`/`SuccessNode` — the Idea names "Block Process" specifically; Task 2 is scoped to `ProcessNode` only.
- OS-level clipboard integration (`navigator.clipboard`) for blocks — Task 3's Ctrl+C/V is an in-memory buffer only, by design.
- A general real-time (`onSnapshot`) sync path for ordinary per-user Roadmap sheets — Task 4's listener is deliberately scoped to `admin-idea-board` only; this must not be generalized without a separate design pass on the debounced-writes-only constraint.
- Revoking one specific leaked public link while keeping sharing on (regenerating `shareId` without a full off/on cycle) — `setSheetPublic` reuses the existing `shareId` across toggles; turning sharing off already blocks all reads of that link via the `public` rule gate.
- Comments/collaboration/presence on the public share view — view-only, no account, no writes, by design.
- `StartNode.jsx` — untouched by design.
- Deploying `firestore.rules`/`firestore.indexes.json` — queued in the Pending Deploy Queue; run `/unlock-bkb` to flush.