# Roadmap Stage Grouping & Main-Line Layout Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task, OR hand this file to Cursor IDE to implement directly, checking off each `- [ ]` as completed. Claude Code (terminal) should review/check the diff after each task per this repo's CLAUDE.md collaboration model.

**Goal:** Make `stageLabel` nodes act as vertical column/lane markers so that any `process`/`condition`/`image` node dropped inside a stage's horizontal `[x, x + width]` range automatically snaps its vertical position onto one shared horizontal "main line" that runs across the whole roadmap canvas.

**Architecture:** Three new pure functions in `src/utils/` — `computeStageMembership(nodes)` (which stage owns which node, by X-range), `computeMainLineY(nodes)` (the one shared Y coordinate every member aligns to), and `computeGroupedLayout(nodes)` (composes the two into a new, repositioned `nodes` array) — are wired into `useRoadmapStore.js` as a `regroupNodes()` action, which `RoadmapPage.jsx` calls after a node finishes dragging and after a `stageLabel` node finishes resizing.

**Tech Stack:** Plain JS (no TypeScript), `@xyflow/react` (React Flow) node objects, Zustand store (`src/stores/useRoadmapStore.js`), Vitest + jsdom for unit tests.

## Global Constraints

- No TypeScript anywhere — plain JS/JSX only, no type annotations.
- Every new function in `src/utils/` must be a pure function operating on plain node/position data (no React, no React Flow imports beyond plain data shapes) and must have a co-located `*.test.js` file, matching the existing pattern of `src/utils/computeSnapPosition.js`, `src/utils/findProximityConnection.js`, and `src/utils/computeNodeCenter.js`.
- Pure layout functions must **never mutate their input** — always return a new array/object, following the convention already used by every existing util in `src/utils/`.
- Node dimensions: for `process`/`condition`/`image` nodes, width/height come from `node.measured?.width`/`node.measured?.height` (React Flow's measured size) falling back to `BLOCK_SIZES[node.type]` from `src/utils/computeSnapPosition.js` (`{ w: 128, h: 128 }` for all three types) — this is the exact pattern used in `computeNodeCenter.js` and `findProximityConnection.js`.
- Node dimensions for `stageLabel` nodes are different: its resizable width/height are **top-level fields on the node object** (`node.width`, `node.height`), not `node.measured` — confirmed by `src/utils/roadmapExport.js` lines 14-15 and 49-50, which only serialize `n.width`/`n.height` when set by `NodeResizer`. Fall back to `BLOCK_SIZES.stageLabel` (`{ w: 120, h: 40 }`) when a stage hasn't been resized yet.
- Firestore sync: do **not** add any Firestore/`syncManager` wiring for this feature. `src/lib/syncManager.js` already subscribes generically to `useRoadmapStore`'s `nodes`/`edges` state and debounce-pushes on any change — a new store action that calls `set(...)` is automatically covered, no extra sync code needed.
- Follow the existing action style in `src/stores/useRoadmapStore.js`: an action is a top-level key on the store object, defined as `actionName: (...args) => set((state) => ({ ...patch })), `.
- Test commands in this plan assume the repo root (`d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm`) as the working directory and use `npx vitest run <path>` (per `package.json`'s `"test": "vitest run"` script, using `vitest@^4`).

---

### Task 1: `computeStageMembership(nodes)`

**Files:**
- Create: `src/utils/computeStageMembership.js`
- Test: `src/utils/computeStageMembership.test.js`

**Interfaces:**
- Consumes: the full React Flow `nodes` array (`{ id, type, position: {x,y}, width?, height?, measured?, data }[]`), as stored in `useRoadmapStore`'s `nodes` state.
- Produces: `{ [stageNodeId: string]: string[] }` — for every `stageLabel` node in the input, an array of the ids of non-`stageLabel` nodes whose horizontal center falls within that stage's `[x, x + width]` range. A node whose center falls in no stage's range is omitted entirely from every array (no "unassigned" bucket key is created for it). A `stageLabel` node itself is never a member of another stage. If a node's center falls within more than one stage's range (overlapping stages), it is assigned to the stage whose left edge (`x`) is closest to the node's center — since every candidate stage's `x` is `<=` the node's center by definition of "in range", this means picking the candidate with the **largest** `x`.

- [ ] **Step 1: Write the failing test**

  Create `src/utils/computeStageMembership.test.js`:

  ```js
  import { describe, it, expect } from 'vitest'
  import { computeStageMembership } from './computeStageMembership'

  // stageA: range [0, 200]. stageB: range [150, 350] — overlaps stageA on [150, 200].
  const stageA = { id: 'stageA', type: 'stageLabel', position: { x: 0, y: 0 }, width: 200, data: { label: 'A' } }
  const stageB = { id: 'stageB', type: 'stageLabel', position: { x: 150, y: 0 }, width: 200, data: { label: 'B' } }

  describe('computeStageMembership', () => {
    it('assigns a node whose center falls in exactly one stage range', () => {
      // process default width 128 (BLOCK_SIZES.process.w); center = 20 + 64 = 84 -> inside stageA[0,200] only
      const node1 = { id: 'node1', type: 'process', position: { x: 20, y: 300 }, data: {} }
      const membership = computeStageMembership([stageA, stageB, node1])
      expect(membership.stageA).toEqual(['node1'])
      expect(membership.stageB).toEqual([])
    })

    it('breaks a tie between overlapping stages by picking the stage with the closest (largest) left edge', () => {
      // center = 111 + 64 = 175 -> inside both stageA[0,200] and stageB[150,350]
      // stageB.x (150) is closer to 175 than stageA.x (0), so stageB wins
      const node2 = { id: 'node2', type: 'process', position: { x: 111, y: 300 }, data: {} }
      const membership = computeStageMembership([stageA, stageB, node2])
      expect(membership.stageB).toEqual(['node2'])
      expect(membership.stageA).toEqual([])
    })

    it('assigns a node that only falls within the second stage range', () => {
      // center = 220 + 64 = 284 -> inside stageB[150,350] only (284 > stageA's max of 200)
      const node3 = { id: 'node3', type: 'condition', position: { x: 220, y: 300 }, data: {} }
      const membership = computeStageMembership([stageA, stageB, node3])
      expect(membership.stageB).toEqual(['node3'])
      expect(membership.stageA).toEqual([])
    })

    it('omits a node whose center falls outside every stage range (orphan)', () => {
      // center = 900 + 64 = 964 -> outside both ranges
      const node4 = { id: 'node4', type: 'process', position: { x: 900, y: 300 }, data: {} }
      const membership = computeStageMembership([stageA, stageB, node4])
      expect(Object.values(membership).flat()).not.toContain('node4')
    })

    it('returns an empty-array entry per stage when a stage has no members, and an empty object when there are no stages', () => {
      expect(computeStageMembership([stageA, stageB])).toEqual({ stageA: [], stageB: [] })
      expect(computeStageMembership([])).toEqual({})
    })

    it('never includes a stageLabel node as a member of another stage', () => {
      const membership = computeStageMembership([stageA, stageB])
      expect(Object.values(membership).flat()).toEqual([])
    })
  })
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/utils/computeStageMembership.test.js`

  Expected failure: `Cannot find module './computeStageMembership'` (or equivalent "failed to resolve import") because `src/utils/computeStageMembership.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

  Create `src/utils/computeStageMembership.js`:

  ```js
  import { BLOCK_SIZES } from './computeSnapPosition'
  import { computeNodeCenter } from './computeNodeCenter'

  // Returns { [stageId]: [memberId, ...] } — for every non-stageLabel node whose
  // horizontal center falls within a stageLabel's [x, x + width] range. A node
  // outside every stage's range is omitted entirely (no "unassigned" bucket).
  // When a node's center falls inside more than one stage's range (overlapping
  // stages), it is assigned to the stage whose left edge (x) is closest to the
  // node's center — i.e. the stage with the largest x among the matches, since
  // every matching stage's x is <= the node's center by definition of "in range".
  export function computeStageMembership(nodes) {
    const stages = nodes
      .filter((n) => n.type === 'stageLabel')
      .map((n) => ({
        id: n.id,
        x: n.position.x,
        width: n.width ?? BLOCK_SIZES.stageLabel.w,
      }))

    const membership = {}
    for (const stage of stages) membership[stage.id] = []

    for (const node of nodes) {
      if (node.type === 'stageLabel') continue
      const { x: centerX } = computeNodeCenter(node)
      let best = null
      for (const stage of stages) {
        const inRange = centerX >= stage.x && centerX <= stage.x + stage.width
        if (!inRange) continue
        if (!best || stage.x > best.x) best = stage
      }
      if (best) membership[best.id].push(node.id)
    }

    return membership
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `npx vitest run src/utils/computeStageMembership.test.js` — all 6 tests should pass.

- [ ] **Step 5: Manual verification in `npm run dev`**

  Not applicable for this task (pure data function, no visual surface) — covered by Task 5's end-to-end manual check.

- [ ] **Step 6: Commit**

  ```bash
  git add src/utils/computeStageMembership.js src/utils/computeStageMembership.test.js
  git commit -m "feat(roadmap): add computeStageMembership pure function"
  ```

---

### Task 2: `computeMainLineY(nodes)`

**Files:**
- Create: `src/utils/computeMainLineY.js`
- Test: `src/utils/computeMainLineY.test.js`

**Interfaces:**
- Consumes: the full `nodes` array (same shape as Task 1).
- Produces: a single `number` (the Y coordinate of the shared main line) or `null` if there are no `stageLabel` nodes on the board.
- **Rule (judgment call — see final summary):** the main line Y is the vertical center of the **first `stageLabel` node found in array order** (i.e. `nodes.find(n => n.type === 'stageLabel')` — first by array position, which for freshly-added nodes matches creation order since `addNode` in `useRoadmapStore.js` appends to the end of the array). This is deterministic and stable: moving or resizing any stage *other than* the first one never shifts where every other stage's members line up, whereas an "average of all stage Y positions" rule would silently reflow every stage's members any time any single stage moved.

- [ ] **Step 1: Write the failing test**

  Create `src/utils/computeMainLineY.test.js`:

  ```js
  import { describe, it, expect } from 'vitest'
  import { computeMainLineY } from './computeMainLineY'

  describe('computeMainLineY', () => {
    it('returns null when there are no stageLabel nodes', () => {
      expect(computeMainLineY([{ id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} }])).toBeNull()
    })

    it('returns the vertical center of the first stageLabel node in array order', () => {
      const nodes = [
        { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 100 }, width: 200, height: 40, data: {} },
        { id: 'stage-2', type: 'stageLabel', position: { x: 300, y: 900 }, width: 200, height: 40, data: {} },
      ]
      // first stage's center: 100 + 40/2 = 120 — the second stage's y (900) must NOT be used
      expect(computeMainLineY(nodes)).toBe(120)
    })

    it('falls back to the default stageLabel height (40) when height is not set', () => {
      const nodes = [{ id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 100 }, data: {} }]
      // 100 + 40/2 = 120
      expect(computeMainLineY(nodes)).toBe(120)
    })

    it('ignores non-stageLabel nodes that appear earlier in the array', () => {
      const nodes = [
        { id: 'proc-1', type: 'process', position: { x: 0, y: 5 }, data: {} },
        { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 100 }, width: 200, height: 40, data: {} },
      ]
      expect(computeMainLineY(nodes)).toBe(120)
    })
  })
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/utils/computeMainLineY.test.js`

  Expected failure: `Cannot find module './computeMainLineY'` because `src/utils/computeMainLineY.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

  Create `src/utils/computeMainLineY.js`:

  ```js
  import { BLOCK_SIZES } from './computeSnapPosition'

  // The shared horizontal reference line every stage's members align to.
  // Rule: the main line Y is the vertical center of the FIRST stageLabel node
  // in the array (first by array order, i.e. creation order — new nodes are
  // appended in useRoadmapStore.addNode). This is deterministic and stable:
  // moving or resizing a later stage never shifts where every other stage's
  // members line up, which an average-of-all-stages rule would do on every
  // drag. Returns null when there are no stageLabel nodes (nothing to align to).
  export function computeMainLineY(nodes) {
    const firstStage = nodes.find((n) => n.type === 'stageLabel')
    if (!firstStage) return null
    const height = firstStage.height ?? BLOCK_SIZES.stageLabel.h
    return firstStage.position.y + height / 2
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `npx vitest run src/utils/computeMainLineY.test.js` — all 4 tests should pass.

- [ ] **Step 5: Manual verification in `npm run dev`**

  Not applicable for this task (pure data function, no visual surface) — covered by Task 5's end-to-end manual check.

- [ ] **Step 6: Commit**

  ```bash
  git add src/utils/computeMainLineY.js src/utils/computeMainLineY.test.js
  git commit -m "feat(roadmap): add computeMainLineY pure function"
  ```

---

### Task 3: `computeGroupedLayout(nodes)`

**Files:**
- Create: `src/utils/computeGroupedLayout.js`
- Test: `src/utils/computeGroupedLayout.test.js`

**Interfaces:**
- Consumes: the full `nodes` array (same shape as Task 1); internally calls `computeStageMembership(nodes)` (Task 1, exact name/signature) and `computeMainLineY(nodes)` (Task 2, exact name/signature).
- Produces: a **new** `nodes` array (input array and its node objects are never mutated — every node reference in the output is a fresh shallow copy). Every node that is a member of some stage (per `computeStageMembership`) has its `position.y` changed so its vertical center sits exactly on the main line (per `computeMainLineY`): `position.y = mainLineY - height / 2`, where `height` follows the same measured/`BLOCK_SIZES` fallback rule as `computeNodeCenter.js`. `position.x` is left **untouched** for every node.
- **Ordering rule (judgment call — see final summary):** members are NOT horizontally redistributed or reordered. The spec only calls for members to align vertically onto one shared line ("their Y position aligns to that one shared horizontal reference line") — it says nothing about changing X. Preserving each member's existing X keeps the left-to-right ordering the user already established by where they dropped/dragged the block, and avoids introducing an unrequested horizontal-spacing behavior. Two members will only visually overlap if the user drags them to (near-)identical X inside the same stage, which is no different from today's overlap behavior for any two blocks.
- Non-member nodes (orphans, and `stageLabel` nodes themselves, which are never members) are returned unchanged (still shallow-copied). If there is no main line yet (`computeMainLineY` returns `null` — no `stageLabel` nodes on the board), every node is returned unchanged (still shallow-copied, still a new array).

- [ ] **Step 1: Write the failing test**

  Create `src/utils/computeGroupedLayout.test.js`:

  ```js
  import { describe, it, expect } from 'vitest'
  import { computeGroupedLayout } from './computeGroupedLayout'

  describe('computeGroupedLayout', () => {
    it('returns nodes unchanged (but as a new array) when there are no stageLabel nodes', () => {
      const nodes = [{ id: 'a', type: 'process', position: { x: 10, y: 10 }, data: {} }]
      const result = computeGroupedLayout(nodes)
      expect(result).toEqual(nodes)
      expect(result).not.toBe(nodes)
    })

    it('aligns a member node vertical center onto the main line, x untouched', () => {
      const nodes = [
        { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 200 }, width: 300, height: 40, data: { label: 'S1' } },
        { id: 'proc-1', type: 'process', position: { x: 50, y: 900 }, data: {} },
      ]
      const result = computeGroupedLayout(nodes)
      const proc1 = result.find((n) => n.id === 'proc-1')
      // main line y = 200 + 40/2 = 220; process default height 128 -> y = 220 - 128/2 = 156
      expect(proc1.position).toEqual({ x: 50, y: 156 })
    })

    it('leaves an orphan node (outside every stage range) unchanged', () => {
      const nodes = [
        { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 200 }, width: 100, height: 40, data: { label: 'S1' } },
        { id: 'proc-1', type: 'process', position: { x: 900, y: 900 }, data: {} },
      ]
      const result = computeGroupedLayout(nodes)
      const proc1 = result.find((n) => n.id === 'proc-1')
      expect(proc1.position).toEqual({ x: 900, y: 900 })
    })

    it('leaves stageLabel nodes themselves unchanged (they are never members)', () => {
      const nodes = [
        { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 200 }, width: 300, height: 40, data: { label: 'S1' } },
      ]
      const result = computeGroupedLayout(nodes)
      expect(result[0].position).toEqual({ x: 0, y: 200 })
    })

    it('does not mutate the input array or its node objects', () => {
      const nodes = [
        { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 200 }, width: 300, height: 40, data: { label: 'S1' } },
        { id: 'proc-1', type: 'process', position: { x: 50, y: 900 }, data: {} },
      ]
      const snapshot = JSON.parse(JSON.stringify(nodes))
      computeGroupedLayout(nodes)
      expect(nodes).toEqual(snapshot)
    })
  })
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/utils/computeGroupedLayout.test.js`

  Expected failure: `Cannot find module './computeGroupedLayout'` because `src/utils/computeGroupedLayout.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

  Create `src/utils/computeGroupedLayout.js`:

  ```js
  import { BLOCK_SIZES } from './computeSnapPosition'
  import { computeStageMembership } from './computeStageMembership'
  import { computeMainLineY } from './computeMainLineY'

  // Returns a NEW nodes array (input is never mutated) where every node that is
  // a member of some stage (per computeStageMembership) has its position.y
  // changed so its vertical center sits exactly on the shared main line (per
  // computeMainLineY). Horizontal position (x) is left untouched: the spec only
  // calls for members to align vertically onto one shared line, so preserving
  // each member's existing x keeps the ordering/spacing the user already chose
  // by where they dropped the block, and avoids an extra, unrequested
  // horizontal-redistribution behavior. Non-member nodes (orphans, stageLabel
  // nodes themselves) are returned unchanged. If there is no main line yet (no
  // stageLabel nodes on the board), all nodes are returned unchanged (as a new array).
  export function computeGroupedLayout(nodes) {
    const mainLineY = computeMainLineY(nodes)
    if (mainLineY == null) return nodes.map((n) => ({ ...n }))

    const membership = computeStageMembership(nodes)
    const memberIds = new Set(Object.values(membership).flat())

    return nodes.map((node) => {
      if (!memberIds.has(node.id)) return { ...node }
      const height = node.measured?.height ?? BLOCK_SIZES[node.type]?.h ?? 80
      return {
        ...node,
        position: { ...node.position, y: mainLineY - height / 2 },
      }
    })
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `npx vitest run src/utils/computeGroupedLayout.test.js` — all 5 tests should pass.

- [ ] **Step 5: Manual verification in `npm run dev`**

  Not applicable for this task (pure data function, no visual surface) — covered by Task 5's end-to-end manual check.

- [ ] **Step 6: Commit**

  ```bash
  git add src/utils/computeGroupedLayout.js src/utils/computeGroupedLayout.test.js
  git commit -m "feat(roadmap): add computeGroupedLayout pure function"
  ```

---

### Task 4: Wire `regroupNodes` into the store and trigger it from the canvas

**Files:**
- Modify: `src/stores/useRoadmapStore.js` (add import + one new action, near the other node-mutating actions, e.g. after `removeNode` around line 77)
- Modify: `src/pages/RoadmapPage.jsx` (add store hook + call sites in `onNodesChange` around line 69-72 and `onNodeDragStop` around line 108-127)
- Test: `src/stores/useRoadmapStore.test.js` (append new tests to the existing `describe('useRoadmapStore', ...)` block)

**Interfaces:**
- Consumes: `computeGroupedLayout(nodes)` (Task 3, exact name/signature).
- Produces: a new store action `regroupNodes: () => void` that replaces `state.nodes` with `computeGroupedLayout(state.nodes)`.
- Trigger points in `RoadmapPage.jsx`:
  1. End of `onNodeDragStop` — covers moving any node (a member into/out of a stage's X-range, or moving a `stageLabel` node itself, which changes that stage's range or the main line).
  2. Inside `onNodesChange`, when a `'dimensions'` change finishes (`change.resizing === false`) — covers resizing a `stageLabel` node's width/height via `NodeResizer`, which changes that stage's X-range or (for the first stage) the main line Y.

- [ ] **Step 1: Write the failing test**

  Open `src/stores/useRoadmapStore.test.js` and append these two `it` blocks inside the existing `describe('useRoadmapStore', () => { ... })`, right before the final closing `})` (after the `'adding a second node updates setpoint to the latest'` test, i.e. after line 280 in the current file):

  ```js
  it('regroupNodes aligns a member node onto the main line established by the first stageLabel node', () => {
    useRoadmapStore.getState().setNodes([
      { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 200 }, width: 300, height: 40, data: { label: 'Stage 1' } },
      { id: 'proc-1', type: 'process', position: { x: 50, y: 500 }, data: { label: '' } },
    ])
    useRoadmapStore.getState().regroupNodes()
    const proc1 = useRoadmapStore.getState().nodes.find((n) => n.id === 'proc-1')
    // main line y = 200 + 40/2 = 220; process default height 128 -> position.y = 220 - 64 = 156
    expect(proc1.position).toEqual({ x: 50, y: 156 })
  })

  it('regroupNodes leaves a node outside every stage range unchanged', () => {
    useRoadmapStore.getState().setNodes([
      { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 200 }, width: 100, height: 40, data: { label: 'Stage 1' } },
      { id: 'proc-1', type: 'process', position: { x: 900, y: 500 }, data: { label: '' } },
    ])
    useRoadmapStore.getState().regroupNodes()
    const proc1 = useRoadmapStore.getState().nodes.find((n) => n.id === 'proc-1')
    expect(proc1.position).toEqual({ x: 900, y: 500 })
  })
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/stores/useRoadmapStore.test.js`

  Expected failure: `TypeError: useRoadmapStore.getState().regroupNodes is not a function` because the action does not exist yet.

- [ ] **Step 3: Write minimal implementation**

  In `src/stores/useRoadmapStore.js`, add the import at the top (after the existing `import { fromSchema } from '../utils/roadmapExport'` on line 5):

  ```js
  import { computeGroupedLayout } from '../utils/computeGroupedLayout'
  ```

  Then add the new action inside the store object, directly after the `removeNode` action (after its closing `}),` — currently lines 73-77):

  ```js
      regroupNodes: () =>
        set((state) => ({ nodes: computeGroupedLayout(state.nodes) })),
  ```

  In `src/pages/RoadmapPage.jsx`, add the store hook next to the other `useRoadmapStore` hooks (after the `importRoadmap` line, currently line 58):

  ```js
    const regroupNodes = useRoadmapStore((s) => s.regroupNodes)
  ```

  Update `onNodesChange` (currently lines 69-72) to trigger `regroupNodes()` when a resize finishes:

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

  Update `onNodeDragStop` (currently lines 108-127) to call `regroupNodes()` at the very end, on every path that doesn't delete the node — add the call right after the existing `setEdges(addEdge(match.connection, edges))` line, AND add a call right before the final closing of the function so the no-match path also regroups. Concretely, replace the body from `const others = nodes.filter(...)` to the end with:

  ```js
      const others = nodes.filter((n) => n.id !== node.id)
      const match = findProximityConnection(node, others, SNAP_THRESHOLD)
      if (match) {
        setNodes(nodes.map((n) => (n.id === node.id ? { ...n, position: match.position } : n)))
        setEdges(addEdge(match.connection, edges))
      }
      regroupNodes()
    },
    [nodes, edges, setNodes, setEdges, removeNode, regroupNodes],
  )
  ```

  (This changes the early `if (!match) return` into an `if (match) { ... }` block so `regroupNodes()` always runs for the non-trash path, and adds `regroupNodes` to the `useCallback` dependency array.)

- [ ] **Step 4: Run test to verify it passes**

  Run: `npx vitest run src/stores/useRoadmapStore.test.js` — all tests (including the 2 new ones) should pass.

  Then run the full suite to confirm nothing else broke: `npm test`

- [ ] **Step 5: Manual verification in `npm run dev`**

  Covered by Task 5's end-to-end manual check (this task's wiring has no isolated visual check of its own — it only makes sense combined with the full flow).

- [ ] **Step 6: Commit**

  ```bash
  git add src/stores/useRoadmapStore.js src/stores/useRoadmapStore.test.js src/pages/RoadmapPage.jsx
  git commit -m "feat(roadmap): wire regroupNodes action into drag and resize handlers"
  ```

---

### Task 5: Manual end-to-end verification

**Files:** none (manual QA task only — no code changes).

**Interfaces:** none.

- [ ] **Step 1: Start the dev server**

  Run: `npm run dev`, open `http://localhost:5173`, navigate to the Roadmap canvas (`/home` overlay or the roadmap route, per whatever entry point the app currently uses).

- [ ] **Step 2: Create two side-by-side stages**

  Add two `stageLabel` nodes (via whatever "add node" control the roadmap toolbar exposes) named "Stage 1" and "Stage 2". Drag them so they sit side by side horizontally with a visible gap between them (e.g. Stage 1 around x=100, Stage 2 around x=500), and leave their default resized widths.

- [ ] **Step 3: Drop process/condition nodes into each stage's column**

  Add 2 `process` nodes and drop them so they land horizontally within Stage 1's width range, at different (arbitrary) Y positions on the canvas. Add 2 more `process`/`condition` nodes and drop them within Stage 2's width range, also at different Y positions.

  **Expected result:** the moment you release each drag (`onNodeDragStop` fires `regroupNodes()`), the dropped node's Y position snaps so it visually lines up with the other stage-member nodes — all members across BOTH stages should end up sitting on the exact same horizontal line (the main line, anchored to Stage 1 since it was created first), even though Stage 2's members are in a completely different X column.

- [ ] **Step 4: Drag a node from one stage's column into the other's**

  Drag one of Stage 1's member nodes far enough right that its horizontal center now falls inside Stage 2's `[x, x+width]` range, then release.

  **Expected result:** the node stays on the same main line (Y unchanged, since the main line is shared across all stages), and if you then resize or drag Stage 1 itself, this node no longer moves with Stage 1's other members (because `computeStageMembership` now attributes it to Stage 2) — confirming it was re-grouped into Stage 2's membership, not just visually near it.

- [ ] **Step 5: Resize a stage**

  Select Stage 1 and drag its resize handle (the `NodeResizer` border) to change its width so it now overlaps Stage 2's X-range, or shrinks so it no longer contains a node that was previously inside it.

  **Expected result:** upon releasing the resize handle (`onNodesChange` fires `regroupNodes()` because `resizing` becomes `false`), any node that fell out of Stage 1's new (shrunk) range keeps its current Y unless it now belongs to Stage 2 or becomes an orphan, in which case only newly-orphaned or newly-claimed nodes' Y snaps per the current membership.

- [ ] **Step 6: Confirm an orphan stays put**

  Drop one more `process` node far to the right, outside both stages' X-ranges entirely.

  **Expected result:** this node's Y position is completely unaffected by any of the above drags/resizes — it never snaps to the main line because it belongs to no stage.

- [ ] **Step 7: Commit**

  No code changes in this task — nothing to commit. If any step's expected result does NOT hold, stop and re-open Task 1-4 to fix the underlying pure function or wiring before considering this plan complete.
