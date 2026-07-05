# Start Block Size Parity Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task, OR hand this file to Cursor IDE to implement directly, checking off each `- [ ]` as completed. Claude Code (terminal) should review/check the diff after each task per this repo's CLAUDE.md collaboration model.

**Goal:** Resize the Start block from its current `160×148px` to `128×128px`, matching Process/Condition/Image/Video so all blocks read as one consistent family on the canvas, and fit its content (title/link-button/progress bar) into the smaller square without clipping.

**Architecture:** The Start block's size is defined in two places that must change together: the Tailwind size classes on `StartNode.jsx`'s root `<div>`, and the `start` entry in `BLOCK_SIZES` (`src/utils/computeSnapPosition.js`) — the latter is read by snap-to-connector math whenever another block connects near a Start block and by initial placement before React Flow has measured the real DOM size. Only the size and internal spacing change; no behavior (journey picker, progress write-back) changes.

**Tech Stack:** React, Tailwind v4, Vitest + Testing Library.

## Global Constraints
- No TypeScript.
- Do not change `StartNode`'s behavior, only its size/spacing — the existing `StartNode.test.jsx` suite must keep passing unmodified (it asserts on text content and callback calls, not layout).
- Do not change `BLOCK_SIZES` entries for any other type (`process`/`condition`/`image`/`video`/`stageLabel`).

---

### Task 1: Update `BLOCK_SIZES.start` to match the standard block size

**Files:**
- Modify: `src/utils/computeSnapPosition.js:9`
- Test: `src/utils/computeSnapPosition.test.js`

**Interfaces:**
- Consumes: nothing new
- Produces: `BLOCK_SIZES.start === { w: 128, h: 128 }`, used by `computeSnapPosition` and by initial-placement code that reads default sizes before a node has been measured by React Flow.

- [x] **Step 1: Write the failing test**

  Read `src/utils/computeSnapPosition.test.js` first to match its existing fixture style, then add:

  ```js
  it('uses the standard 128x128 default size for an unmeasured start node', () => {
    const source = { id: 's1', type: 'process', position: { x: 0, y: 0 } }
    const target = { id: 't1', type: 'start', position: { x: 0, y: 0 } }
    const result = computeSnapPosition(source, target, 'right')
    // process default size (128x128) + start default size (128x128):
    // x = sx + sw = 0 + 128 = 128; y = sy + sh/2 - th/2 = 0 + 64 - 64 = 0
    expect(result).toEqual({ x: 128, y: 0 })
  })
  ```

- [x] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/utils/computeSnapPosition.test.js`
  Expected: FAIL — with the current `BLOCK_SIZES.start = { w: 160, h: 148 }`, the computed result is `{ x: 128, y: -10 }` (since `th/2` would be 74, not 64), not `{ x: 128, y: 0 }`.

- [x] **Step 3: Update `BLOCK_SIZES`**

  In `src/utils/computeSnapPosition.js`, change line 9 from:
  ```js
    start: { w: 160, h: 148 },
  ```
  to:
  ```js
    start: { w: 128, h: 128 },
  ```

- [x] **Step 4: Run test to verify it passes**

  Run: `npx vitest run src/utils/computeSnapPosition.test.js`
  Expected: PASS.

- [x] **Step 5: Commit**

  ```bash
  git add src/utils/computeSnapPosition.js src/utils/computeSnapPosition.test.js
  git commit -m "fix(roadmap): size Start block's BLOCK_SIZES entry to match the standard 128x128 blocks"
  ```

---

### Task 2: Resize `StartNode.jsx`'s root element and tighten internal spacing to fit

**Files:**
- Modify: `src/components/roadmap/StartNode.jsx:34-94`
- Test: `src/components/roadmap/StartNode.test.jsx` (no assertion changes expected — run as a regression check)

**Interfaces:**
- Consumes: nothing new
- Produces: same `StartNode` component, same default export signature — only className/layout changes.

- [x] **Step 1: Confirm the existing test suite passes before touching layout (baseline)**

  Run: `npx vitest run src/components/roadmap/StartNode.test.jsx`
  Expected: PASS (5 tests, all text/callback assertions — establishes that these must still pass unchanged after the resize).

- [x] **Step 2: Resize the root container and tighten spacing**

  In `src/components/roadmap/StartNode.jsx`, replace the root `<div>` (line 35-39):
  ```jsx
    <div
      className={`relative w-40 h-[148px] rounded-2xl border-2 bg-white shadow-md p-2.5 flex flex-col gap-1.5 transition-all ${
        selected ? 'border-emerald-500 shadow-emerald-500/30 shadow-lg' : 'border-emerald-500/40'
      }`}
    >
  ```
  with:
  ```jsx
    <div
      className={`relative w-32 h-32 rounded-2xl border-2 bg-white shadow-md p-2 flex flex-col gap-1 transition-all ${
        selected ? 'border-emerald-500 shadow-emerald-500/30 shadow-lg' : 'border-emerald-500/40'
      }`}
    >
  ```
  (Matches `ProcessNode.jsx`'s `w-32 h-32` root exactly; padding drops from `p-2.5` to `p-2` and gap from `gap-1.5` to `gap-1` to reclaim space for the smaller square — same technique `ProcessNode.jsx` uses at this size.)

  Then, in the `linked` branch (currently lines 65-86), clamp the title to a single line instead of two so it can't push the progress bar/button out of the shorter box — replace:
  ```jsx
          <span className="text-[11px] font-semibold text-ink leading-tight line-clamp-2">
            {linked.title || '—'}
          </span>
  ```
  with:
  ```jsx
          <span className="text-[11px] font-semibold text-ink leading-tight line-clamp-1">
            {linked.title || '—'}
          </span>
  ```

  Leave every other line (the `START` label, the `Link to Journey` button, the `isBroken` branch, the progress bar markup, the `+10% progress` button, the `ConnectionDot`s, `JourneyPickerModal`) untouched — only the two changes above.

- [x] **Step 3: Run the existing test suite to confirm no regression**

  Run: `npx vitest run src/components/roadmap/StartNode.test.jsx`
  Expected: PASS — same 5 tests, unmodified, still green (they assert on text/callbacks, not size).

- [x] **Step 4: Manual verification in `npm run dev`**

  Open `/roadmap`, add a Start block from the toolbar and a Process block next to it — confirm they now render as the same size square. Check all three Start-block states fit without clipping or overflow: (a) empty (`Link to Journey` button state), (b) linked to a journey with a long title (confirm it truncates to one line with an ellipsis instead of wrapping/overflowing), (c) linked to a journey that's since been deleted from Profile (`Linked journey was removed` state). Also confirm the connection dots (bottom, right) still sit correctly on the smaller box's edges.

- [x] **Step 5: Commit**

  ```bash
  git add src/components/roadmap/StartNode.jsx
  git commit -m "fix(roadmap): resize Start block to 128x128 to match Process/Condition/Image/Video"
  ```

## Self-Review
- Both places the Start block's size lives (`BLOCK_SIZES.start`, `StartNode.jsx`'s root classes) are updated in this plan — confirmed by Grep during planning that these are the only two size references (no other file hardcodes Start's dimensions).
- `StartNode.test.jsx`'s 5 existing tests are never edited, only re-run as a regression gate before and after — if the product owner wants dedicated size-related test coverage beyond `computeSnapPosition.test.js`, that would need a visual/snapshot test this repo doesn't currently have a pattern for, and is out of scope here.
- No placeholders — every step is real, complete code.
