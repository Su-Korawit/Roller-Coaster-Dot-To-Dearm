# Revert State (StageLabel) Node to Plain Original Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task, OR hand this file to Cursor IDE to implement directly, checking off each `- [ ]` as completed. Claude Code (terminal) should review/check the diff after each task per this repo's CLAUDE.md collaboration model.

**Goal:** Revert the "State" (`stageLabel`) node back to its original plain scaffold — no resize, no per-block color, no main-line auto-grouping — while leaving Process/Condition/Image/Video's own color-picker feature and the `computeStageMembership`/`computeMainLineY`/`computeGroupedLayout` utility files untouched and in place (kept unwired, not deleted, per explicit product-owner instruction).

**Architecture:** Three features were added to `stageLabel` across three prior commits (`8ca5390` resize, `12e2fc2` color, `f51b2d8` main-line grouping wired into `RoadmapPage.jsx`'s drag/resize handlers). This plan removes the `stageLabel`-specific UI for resize/color and removes the `regroupNodes` store action + its two call sites in `RoadmapPage.jsx`, restoring `StageLabelNode.jsx` to its pre-`8ca5390` content (verified against git history at commit `ef3d005`). The grouping utility files stay on disk, fully tested, simply unreferenced — a deliberate choice, not an oversight, so they can be re-wired later without rewriting them.

**Tech Stack:** React, Zustand, Vitest.

## Global Constraints
- No TypeScript.
- Do NOT touch `ProcessNode.jsx`, `ConditionNode.jsx`, `ImageNode.jsx`, or `VideoNode.jsx` — their color pickers are staying exactly as shipped. This plan only touches `StageLabelNode.jsx`.
- Do NOT delete `src/utils/computeStageMembership.js`, `computeMainLineY.js`, `computeGroupedLayout.js`, or their `*.test.js` files — keep them in place, unwired.
- Every removed line must trace to one of the three reverted features (resize, color, grouping) — do not remove anything else from the touched files.

---

### Task 1: Revert `StageLabelNode.jsx` to its plain, pre-resize/pre-color form

**Files:**
- Modify: `src/components/roadmap/StageLabelNode.jsx` (currently 59 lines)

**Interfaces:**
- Consumes: `useRoadmapStore.updateNodeData` (unchanged, still used for `label`)
- Produces: `StageLabelNode` component, same default export signature `{ id, data, selected }`, registered under `stageLabel` in `src/components/roadmap/nodeTypes.js` (no change needed there — the registry maps to this file's default export regardless of its internal implementation)

- [x] **Step 1: Confirm the current file's full content matches what this plan expects to remove**

  Run: `git show ef3d005:src/components/roadmap/StageLabelNode.jsx` and compare against the current file — the current file should be a superset (same base + `NodeResizer` + color picker markup added). This confirms there's no unrelated drift before you revert.

- [x] **Step 2: Replace the file's full content**

  Replace the entire contents of `src/components/roadmap/StageLabelNode.jsx` with:

  ```jsx
  import { useCallback } from 'react'
  import { useRoadmapStore } from '../../stores/useRoadmapStore'

  // Stage Label — a freely-draggable text node used as a presentational scaffold.
  // No connection handles; position carries no semantic meaning.
  export default function StageLabelNode({ id, data, selected }) {
    const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

    const onChange = useCallback(
      (e) => updateNodeData(id, { label: e.target.value }),
      [id, updateNodeData],
    )

    return (
      <div
        className={`group min-w-[100px] px-4 py-1.5 rounded-full border transition-all ${
          selected
            ? 'border-brand bg-brand/10'
            : 'border-brand/30 bg-white/70 hover:border-brand/60'
        }`}
      >
        <input
          className="pixel-font text-[10px] font-bold text-brand bg-transparent outline-none text-center w-full placeholder:text-brand/30"
          placeholder="Stage name"
          value={data.label}
          onChange={onChange}
        />
      </div>
    )
  }
  ```

  This removes: the `NodeResizer` import/usage, the `colorInputRef`, `onColorChange`, the color swatch `<button>`, the hidden `<input type="color">`, and the `style={data.color ? ...}` override. `data.color` may still exist on old saved `stageLabel` nodes (harmless, simply unread now) and `data.width`/`data.height` set by a prior resize likewise remain harmless unread leftovers on old nodes — do not write a migration for this, it's inert data.

- [x] **Step 3: Run the existing roadmap test suite to confirm nothing else depended on the removed markup**

  Run: `npx vitest run src/stores/useRoadmapStore.test.js src/utils/roadmapExport.test.js`
  Expected: PASS — neither file asserts on `stageLabel`'s resize/color DOM, only on data shape, which is unchanged.

- [x] **Step 4: Manual verification in `npm run dev`**

  Open `/roadmap`, add a State block from the toolbar. Confirm: (a) selecting it shows no resize handles on its corners/edges, (b) there is no color swatch button next to the label input, (c) typing in the label field still works and still saves (watch the save indicator from the canvas-interaction feature go "Saving..." → "Saved").

- [x] **Step 5: Commit**

  ```bash
  git add src/components/roadmap/StageLabelNode.jsx
  git commit -m "revert(roadmap): strip resize and color from StageLabelNode, back to plain scaffold"
  ```

---

### Task 2: Remove the `regroupNodes` action from `useRoadmapStore.js`

**Files:**
- Modify: `src/stores/useRoadmapStore.js:6` (import), `:152-156` (action)
- Modify: `src/stores/useRoadmapStore.test.js:321-339` (its two tests)

**Interfaces:**
- Consumes: nothing new
- Produces: `useRoadmapStore` no longer exposes a `regroupNodes` action. `computeGroupedLayout` becomes unimported here (its file/test stay on disk, per Global Constraints).

- [x] **Step 1: Remove the two `regroupNodes` tests**

  In `src/stores/useRoadmapStore.test.js`, delete lines 321-339 (the two `it('regroupNodes ...')` blocks, from `it('regroupNodes aligns a member node...` through the closing `})` right before the `describe('multi-sheet: ...')` block on line 342) — leave the surrounding `describe` block's other tests (`addNode records the new node id as setpoint`, etc.) untouched.

- [x] **Step 2: Run the test file to confirm it fails as expected (no more, no less)**

  Run: `npx vitest run src/stores/useRoadmapStore.test.js`
  Expected: currently PASSES (the two tests you just deleted are gone, nothing references `regroupNodes` in the test file anymore) — this step just confirms deletion was clean, not a red-green cycle, since we're removing coverage for code we're about to remove in Step 3.

- [x] **Step 3: Remove the `regroupNodes` action and its now-unused import**

  In `src/stores/useRoadmapStore.js`, delete line 6:
  ```js
  import { computeGroupedLayout } from '../utils/computeGroupedLayout'
  ```
  And delete the `regroupNodes` action (lines 152-156):
  ```js
      regroupNodes: () =>
        set((state) => {
          const nodes = computeGroupedLayout(state.nodes)
          return applyToActive(state, { nodes })
        }),
  ```
  (Leave `addNode`, `updateNodeData`, `removeNode`, and `connect` — the actions immediately before/after it in the file — untouched.)

- [x] **Step 4: Run the full store test suite to confirm the removal is clean**

  Run: `npx vitest run src/stores/useRoadmapStore.test.js`
  Expected: PASS — no test references `s.regroupNodes` anymore (confirmed by Step 1's deletion), and no other action's behavior changed.

- [x] **Step 5: Commit**

  ```bash
  git add src/stores/useRoadmapStore.js src/stores/useRoadmapStore.test.js
  git commit -m "revert(roadmap): remove regroupNodes action, keep computeGroupedLayout util unwired"
  ```

---

### Task 3: Remove `regroupNodes` wiring from `RoadmapPage.jsx`

**Files:**
- Modify: `src/pages/RoadmapPage.jsx:60`, `:84-88`, `:142-144`

**Interfaces:**
- Consumes: nothing new
- Produces: `onNodesChange` and `onNodeDragStop` no longer call `regroupNodes()`; dragging a block or finishing a resize no longer re-lays-out any other node.

- [x] **Step 1: Remove the `regroupNodes` selector**

  In `src/pages/RoadmapPage.jsx`, delete line 60:
  ```js
    const regroupNodes = useRoadmapStore((s) => s.regroupNodes)
  ```

- [x] **Step 2: Simplify `onNodesChange`**

  Replace (lines 81-88):
  ```js
    const onNodesChange = useCallback(
      (changes) => {
        setNodes(applyNodeChanges(changes, nodes))
        const resizeFinished = changes.some((c) => c.type === 'dimensions' && c.resizing === false)
        if (resizeFinished) regroupNodes()
      },
      [nodes, setNodes, regroupNodes],
    )
  ```
  with:
  ```js
    const onNodesChange = useCallback(
      (changes) => setNodes(applyNodeChanges(changes, nodes)),
      [nodes, setNodes],
    )
  ```

- [x] **Step 3: Remove the `regroupNodes()` call from `onNodeDragStop`**

  In the `onNodeDragStop` callback (around line 124-145), remove the line:
  ```js
        regroupNodes()
  ```
  (immediately before the closing of the function body) and remove `regroupNodes` from its dependency array:
  ```js
      [nodes, edges, setNodes, setEdges, removeNode, regroupNodes],
  ```
  becomes:
  ```js
      [nodes, edges, setNodes, setEdges, removeNode],
  ```

- [x] **Step 4: Grep to confirm no remaining reference**

  Run (PowerShell): `Select-String -Path src/pages/RoadmapPage.jsx -Pattern 'regroupNodes'`
  Expected: no matches.

- [x] **Step 5: Manual verification in `npm run dev`**

  Open `/roadmap`. Create a State block and a Process block positioned under it, drag the Process block around — confirm it no longer snaps its Y position onto any shared line. Resize a State block (if any resize handle still visually appears due to caching, hard-refresh) — confirm nothing else on the canvas moves. Confirm ordinary block-to-block proximity snapping (unrelated feature) still works: drag one Process block near another's connector and confirm they still snap together.

- [x] **Step 6: Run the full test suite**

  Run: `npm test`
  Expected: PASS — no test in the suite references `regroupNodes` in `RoadmapPage.jsx` context (there is no dedicated `RoadmapPage.test.jsx` in this repo; this is a full-suite regression check, not a targeted one).

- [x] **Step 7: Commit**

  ```bash
  git add src/pages/RoadmapPage.jsx
  git commit -m "revert(roadmap): remove regroupNodes wiring from drag and resize handlers"
  ```

---

## Self-Review

- All three shipped State features (resize, color, grouping) are removed: Task 1 removes resize+color from the component; Tasks 2-3 remove grouping end-to-end (store action + both call sites).
- `computeStageMembership.js`, `computeMainLineY.js`, `computeGroupedLayout.js` and their test files are never touched or deleted anywhere in this plan — confirmed by Grep in Task 3 Step 4 and by Global Constraints.
- Process/Condition/Image/Video node files are never touched — this plan's diff is scoped to exactly 3 files (`StageLabelNode.jsx`, `useRoadmapStore.js` + its test, `RoadmapPage.jsx`).
- No placeholders — every step is a real, complete diff or command.
