# Roadmap System (IR Board block parity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Idea:** `node-6-1783834686123` — Process "Roadmap System" on the IR Board.

**Requirement (from the Idea's Process note, translated):**
1. Roadmap Block [system on the IR Board]
2. Make block sizes equal (equal to Process, Image)
3. Change the block connection system to have **no line** — blocks connect by
   snapping dot-to-dot; once connected, the dot glows **only at the connected
   point**.

**Interpretation (verified against the code):** the user Roadmap
(`RoadmapPage.jsx`) already has this exact system — `InvisibleEdge` (no lines),
`findProximityConnection` drop-snap, detach-on-drag, and per-handle green
`ConnectionDot`. The IR Board (`IdeaRequestSection.jsx`) does **not**: it draws
default React Flow edges (visible lines) and has no drag-snap. The three
IR-only blocks (IdeaRoot `w-40 min-h-32`, Update/Success `w-40 min-h-24`) are
also the only blocks not sized 128×128 like Process/Image. This Idea therefore
means: **bring the Roadmap block system to the IR Board**. The user Roadmap's
behavior is not changed (standing rule).

**Goal:** IR Board blocks are all 128×128, connect with no visible line by
snapping dot-to-dot on drag-drop, and the connected dots glow.

**Architecture:** Reuse the existing Roadmap snap machinery — extend
`BLOCK_SIZES` + `findProximityConnection.getHandles` to cover the IR-only node
types (`ideaRoot`, `update`, `success`), extract the `InvisibleEdge` component
so both canvases share it, and wire `IdeaRequestSection`'s React Flow with the
same `edgeTypes` / `onNodeDragStart` / `onNodeDragStop` handlers RoadmapPage
uses. Add a glow to `ConnectionDot`'s connected state.

**Tech Stack:** React 18 (plain JSX, no TypeScript), @xyflow/react (React
Flow), Zustand (`useRoadmapStore`), Tailwind v4, Vitest + Testing Library
(jsdom).

## Global Constraints

- **No TypeScript** — plain JS + JSX only. No `.ts`, no type annotations.
- **Tailwind v4** — utility classes only; tokens live in `src/index.css` `@theme`.
- **Never modify `StartNode` or user Roadmap behavior.** Task 3 touches
  `RoadmapPage.jsx` only to swap an inline component for an identical import
  (zero behavior change). Task 5 changes `ConnectionDot`'s connected *visual*
  (adds a glow) — this is shared with the Roadmap and is the intended look per
  the requirement; behavior is untouched.
- **Firestore writes** go through `useRoadmapStore` → `syncManager` (already
  the case for `setNodes`/`setEdges`); never write Firestore directly.
- **No deploys** — this is frontend-only; nothing to enqueue in
  `.iloveskill/pending-deploys.json`.
- Run tests with `npx vitest run <file>` (single file) or `npm test` (all).
- Commit after each task (small, staged commits).

---

### Task 1: Make IR-only blocks 128×128 like Process/Image

**Files:**
- Modify: `src/components/roadmap/IdeaRootNode.jsx:20`
- Modify: `src/components/roadmap/UpdateNode.jsx:16`
- Modify: `src/components/roadmap/SuccessNode.jsx:16`
- Modify: `src/utils/computeSnapPosition.js:3-10` (register sizes)
- Test: `src/components/roadmap/IdeaRootNode.test.jsx`
- Test: `src/components/roadmap/UpdateNode.test.jsx`
- Test: `src/components/roadmap/SuccessNode.test.jsx` (new file)
- Test: `src/utils/computeSnapPosition.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `BLOCK_SIZES.ideaRoot`, `BLOCK_SIZES.update`, `BLOCK_SIZES.success`
  all `{ w: 128, h: 128 }` — Task 2's handle math relies on these exact values.

- [ ] **Step 1: Write the failing size tests**

Append to the `describe` block in `src/components/roadmap/UpdateNode.test.jsx`:

```jsx
  it('is a 128×128 block like Process/Image', () => {
    const { container } = render(<UpdateNode id="u1" data={{ summary: '' }} selected={false} />)
    expect(container.firstChild.className).toContain('w-32 h-32')
  })
```

Append the same shape to `src/components/roadmap/IdeaRootNode.test.jsx`
(inside its existing `describe`, using its existing render helper/props):

```jsx
  it('is a 128×128 block like Process/Image', () => {
    const { container } = render(<IdeaRootNode id="i1" data={{ title: '', status: 'idea' }} selected={false} />)
    expect(container.firstChild.className).toContain('w-32 h-32')
  })
```

Create `src/components/roadmap/SuccessNode.test.jsx` (mirrors
`UpdateNode.test.jsx`'s mocking exactly):

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: () => null,
  useNodeConnections: () => [],
}))
vi.mock('./ConnectionDot', () => ({ default: () => null }))

const updateNodeData = vi.fn()
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (selector) => selector({ updateNodeData }),
}))

const { default: SuccessNode } = await import('./SuccessNode')

describe('SuccessNode', () => {
  beforeEach(() => {
    updateNodeData.mockClear()
  })

  it('edits summary via the store', () => {
    render(<SuccessNode id="s1" data={{ summary: '' }} selected={false} />)
    fireEvent.change(screen.getByPlaceholderText('Summary'), {
      target: { value: 'shipped' },
    })
    expect(updateNodeData).toHaveBeenCalledWith('s1', { summary: 'shipped' })
  })

  it('is a 128×128 block like Process/Image', () => {
    const { container } = render(<SuccessNode id="s1" data={{ summary: '' }} selected={false} />)
    expect(container.firstChild.className).toContain('w-32 h-32')
  })
})
```

Append to `src/utils/computeSnapPosition.test.js` (inside its existing
`describe`, matching its existing style):

```js
  it('snaps an update block flush right of an ideaRoot using 128×128 sizes', () => {
    const root = { id: 'r', type: 'ideaRoot', position: { x: 100, y: 100 } }
    const upd = { id: 'u', type: 'update', position: { x: 0, y: 0 } }
    expect(computeSnapPosition(root, upd, null)).toEqual({ x: 228, y: 100 })
  })

  it('snaps a success block flush below an update using 128×128 sizes', () => {
    const upd = { id: 'u', type: 'update', position: { x: 100, y: 100 } }
    const succ = { id: 's', type: 'success', position: { x: 0, y: 0 } }
    expect(computeSnapPosition(upd, succ, 'bottom')).toEqual({ x: 100, y: 228 })
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/roadmap/UpdateNode.test.jsx src/components/roadmap/IdeaRootNode.test.jsx src/components/roadmap/SuccessNode.test.jsx src/utils/computeSnapPosition.test.js`
Expected: the new tests FAIL — className still contains `w-40`, and snap
positions computed from the `160×80` fallback (e.g. `{ x: 260, ... }`).

- [ ] **Step 3: Implement the size changes**

In `src/components/roadmap/IdeaRootNode.jsx` change the root div class:

```jsx
      className={`relative w-32 h-32 rounded-xl border-2 bg-brand-soft p-2.5 flex flex-col gap-1 ${
        selected ? 'border-brand shadow-hard-sm' : 'border-brand/40'
      }`}
```

In `src/components/roadmap/UpdateNode.jsx`:

```jsx
      className={`relative w-32 h-32 rounded-xl border-2 bg-amber-50 p-2.5 flex flex-col gap-1 ${
        selected ? 'border-amber-500 shadow-hard-sm' : 'border-amber-300'
      }`}
```

In `src/components/roadmap/SuccessNode.jsx`:

```jsx
      className={`relative w-32 h-32 rounded-xl border-2 bg-emerald-50 p-2.5 flex flex-col gap-1 ${
        selected ? 'border-emerald-500 shadow-hard-sm' : 'border-emerald-300'
      }`}
```

In `src/utils/computeSnapPosition.js` extend `BLOCK_SIZES`:

```js
export const BLOCK_SIZES = {
  process: { w: 128, h: 128 },
  condition: { w: 128, h: 128 },
  image: { w: 128, h: 128 },
  video: { w: 128, h: 128 },
  stageLabel: { w: 120, h: 40 },
  start: { w: 128, h: 128 },
  ideaRoot: { w: 128, h: 128 },
  update: { w: 128, h: 128 },
  success: { w: 128, h: 128 },
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/roadmap/UpdateNode.test.jsx src/components/roadmap/IdeaRootNode.test.jsx src/components/roadmap/SuccessNode.test.jsx src/utils/computeSnapPosition.test.js`
Expected: PASS (all, including the pre-existing tests in those files).

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/IdeaRootNode.jsx src/components/roadmap/UpdateNode.jsx src/components/roadmap/SuccessNode.jsx src/components/roadmap/SuccessNode.test.jsx src/components/roadmap/IdeaRootNode.test.jsx src/components/roadmap/UpdateNode.test.jsx src/utils/computeSnapPosition.js src/utils/computeSnapPosition.test.js
git commit -m "feat(ir): size IdeaRoot/Update/Success blocks 128x128 like Process/Image"
```

---

### Task 2: Teach `findProximityConnection` the IR-only block dots

**Files:**
- Modify: `src/utils/findProximityConnection.js:14-37` (`getHandles` switch)
- Test: `src/utils/findProximityConnection.test.js`

**Interfaces:**
- Consumes: `BLOCK_SIZES.ideaRoot/update/success = { w: 128, h: 128 }` (Task 1).
- Produces: `findProximityConnection(draggedNode, otherNodes, threshold)`
  now returns matches for nodes of type `ideaRoot`, `update`, `success`.
  Task 4's drop handler relies on this.

All three IR node components place the exact same dots as `ProcessNode`:
target Left (id `null`), source Top (`top`), source Right (id `null`),
source Bottom (`bottom`) — so they share the `process` case.

- [ ] **Step 1: Write the failing tests**

Append to the `describe` in `src/utils/findProximityConnection.test.js`:

```js
  it('snaps a dragged update block onto an ideaRoot right dot', () => {
    // ideaRoot 128×128 at (100,100): right-source dot at (228,164).
    // dragged update at (238,100): left-target dot at (238,164) — 10px away.
    const root = { id: 'root', type: 'ideaRoot', position: { x: 100, y: 100 } }
    const upd = { id: 'upd', type: 'update', position: { x: 238, y: 100 } }
    expect(findProximityConnection(upd, [root], 40)).toEqual({
      connection: { source: 'root', target: 'upd', sourceHandle: null, targetHandle: null },
      position: { x: 228, y: 100 },
    })
  })

  it('snaps a dragged success top dot onto an update bottom dot', () => {
    // update 128×128 at (100,100): bottom-source dot at (164,228).
    // dragged success at (100,220): top-source dot at (164,220) — 8px away.
    const upd = { id: 'upd', type: 'update', position: { x: 100, y: 100 } }
    const succ = { id: 'succ', type: 'success', position: { x: 100, y: 220 } }
    expect(findProximityConnection(succ, [upd], 40)).toEqual({
      connection: { source: 'succ', target: 'upd', sourceHandle: 'top', targetHandle: 'bottom' },
      position: { x: 100, y: 228 },
    })
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/findProximityConnection.test.js`
Expected: the two new tests FAIL with `expected null to deeply equal …`
(`getHandles` returns `[]` for unknown types, so no match is found).

- [ ] **Step 3: Implement — share the `process` handle layout**

In `src/utils/findProximityConnection.js`, change the `case 'process':` line
into a fall-through group (the returned handle list is unchanged):

```js
    case 'process':
    case 'ideaRoot':
    case 'update':
    case 'success':
      return [
        { role: 'target', id: null, x, y: y + h / 2 },
        { role: 'source', id: null, x: x + w, y: y + h / 2 },
        { role: 'source', id: 'top', x: x + w / 2, y },
        { role: 'source', id: 'bottom', x: x + w / 2, y: y + h },
      ]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/findProximityConnection.test.js`
Expected: PASS (new tests plus all pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/utils/findProximityConnection.js src/utils/findProximityConnection.test.js
git commit -m "feat(ir): proximity-snap dots for ideaRoot/update/success blocks"
```

---

### Task 3: Extract the shared `InvisibleEdge` component

**Files:**
- Create: `src/components/roadmap/InvisibleEdge.jsx`
- Modify: `src/pages/RoadmapPage.jsx:32-36` (replace inline definition with the
  import — **behavior-preserving refactor only**, nothing else in this file)
- Test: `src/components/roadmap/InvisibleEdge.test.jsx`

**Interfaces:**
- Produces: `InvisibleEdge` — default export, a React component that renders
  `null`. Task 4 imports it for the IR Board's `edgeTypes`.

- [ ] **Step 1: Write the failing test**

Create `src/components/roadmap/InvisibleEdge.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import InvisibleEdge from './InvisibleEdge'

describe('InvisibleEdge', () => {
  it('renders nothing — blocks snap edge-to-edge, no line is drawn', () => {
    const { container } = render(<InvisibleEdge />)
    expect(container.innerHTML).toBe('')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/roadmap/InvisibleEdge.test.jsx`
Expected: FAIL — `Cannot find module './InvisibleEdge'` (or equivalent
resolve error).

- [ ] **Step 3: Create the component and swap RoadmapPage to it**

Create `src/components/roadmap/InvisibleEdge.jsx`:

```jsx
// Blocks snap edge-to-edge, so connection lines are never drawn. Registered as
// the `default` edge type on both the user Roadmap and the IR Board.
export default function InvisibleEdge() {
  return null
}
```

In `src/pages/RoadmapPage.jsx`, delete the inline definition (lines 32–35):

```jsx
// Blocks snap edge-to-edge, so connection lines are never drawn.
function InvisibleEdge() {
  return null
}
```

and add the import next to the `AnnotationEdge` import:

```jsx
import AnnotationEdge from '../components/roadmap/AnnotationEdge'
import InvisibleEdge from '../components/roadmap/InvisibleEdge'
```

The existing `const edgeTypes = { default: InvisibleEdge, annotation: AnnotationEdge }`
line stays exactly as is.

- [ ] **Step 4: Run the test suite to verify the refactor is clean**

Run: `npx vitest run src/components/roadmap/InvisibleEdge.test.jsx src/components/roadmap/AnnotationEdge.test.jsx`
Expected: PASS. Then run `npm test` — expected: full suite PASS (RoadmapPage
behavior unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/InvisibleEdge.jsx src/components/roadmap/InvisibleEdge.test.jsx src/pages/RoadmapPage.jsx
git commit -m "refactor(roadmap): extract shared InvisibleEdge component"
```

---

### Task 4: Wire the IR Board with no-line snap connections

**Files:**
- Modify: `src/components/admin/IdeaRequestSection.jsx`
- Test: `src/components/admin/IdeaRequestSection.test.jsx` (new file)

**Interfaces:**
- Consumes: `InvisibleEdge` (Task 3), `findProximityConnection` (Task 2),
  `useRoadmapStore.detachNode(id)` (already exists in the store),
  `addEdge` from `@xyflow/react`.
- Produces: the IR Board canvas with `edgeTypes = { default: InvisibleEdge }`,
  detach-on-drag-start, and proximity snap-on-drop (threshold 40) — same
  behavior as RoadmapPage.

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/IdeaRequestSection.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

let captured = null
vi.mock('@xyflow/react', () => ({
  ReactFlow: (props) => {
    captured = props
    return null
  },
  ReactFlowProvider: ({ children }) => children,
  Background: () => null,
  Controls: () => null,
  applyNodeChanges: (_changes, nodes) => nodes,
  applyEdgeChanges: (_changes, edges) => edges,
  addEdge: (connection, edges) => [...edges, { id: 'new-edge', ...connection }],
}))
vi.mock('../../services/irBoardSession', () => ({
  mountIrBoard: vi.fn().mockResolvedValue('token-1'),
  unmountIrBoard: vi.fn().mockResolvedValue(undefined),
}))

// Two 128×128 process blocks 10px apart: a's right dot (428,164) is within
// the 40px threshold of b's left dot (438,164).
const storeState = {
  nodes: [
    { id: 'a', type: 'process', position: { x: 300, y: 100 } },
    { id: 'b', type: 'process', position: { x: 438, y: 100 } },
  ],
  edges: [],
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  addNode: vi.fn(),
  connect: vi.fn(),
  detachNode: vi.fn(),
  syncStatus: 'idle',
}
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (selector) => selector(storeState),
}))

const { default: IdeaRequestSection } = await import('./IdeaRequestSection')
const { default: InvisibleEdge } = await import('../roadmap/InvisibleEdge')

describe('IdeaRequestSection snap connections', () => {
  beforeEach(() => {
    captured = null
    storeState.setNodes.mockClear()
    storeState.setEdges.mockClear()
    storeState.detachNode.mockClear()
  })

  it('hides edge lines by registering InvisibleEdge as the default edge type', async () => {
    render(<IdeaRequestSection />)
    await waitFor(() => expect(captured).not.toBeNull())
    expect(captured.edgeTypes.default).toBe(InvisibleEdge)
  })

  it('detaches a block from its connections when a drag starts', async () => {
    render(<IdeaRequestSection />)
    await waitFor(() => expect(captured).not.toBeNull())
    captured.onNodeDragStart({}, { id: 'a' })
    expect(storeState.detachNode).toHaveBeenCalledWith('a')
  })

  it('snaps the dropped block dot-to-dot and adds the edge', async () => {
    render(<IdeaRequestSection />)
    await waitFor(() => expect(captured).not.toBeNull())
    captured.onNodeDragStop({}, storeState.nodes[0])
    expect(storeState.setNodes).toHaveBeenCalledWith([
      { id: 'a', type: 'process', position: { x: 310, y: 100 } },
      { id: 'b', type: 'process', position: { x: 438, y: 100 } },
    ])
    expect(storeState.setEdges).toHaveBeenCalledWith([
      { id: 'new-edge', source: 'a', target: 'b', sourceHandle: null, targetHandle: null },
    ])
  })

  it('leaves nodes and edges alone when the drop is nowhere near a dot', async () => {
    render(<IdeaRequestSection />)
    await waitFor(() => expect(captured).not.toBeNull())
    captured.onNodeDragStop({}, { id: 'a', type: 'process', position: { x: 900, y: 900 } })
    expect(storeState.setNodes).not.toHaveBeenCalled()
    expect(storeState.setEdges).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/admin/IdeaRequestSection.test.jsx`
Expected: FAIL — `captured.edgeTypes` is `undefined` and
`captured.onNodeDragStart is not a function`.

- [ ] **Step 3: Implement the wiring**

In `src/components/admin/IdeaRequestSection.jsx`:

Add imports (`addEdge` joins the existing `@xyflow/react` import list):

```jsx
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react'
import InvisibleEdge from '../roadmap/InvisibleEdge'
import { findProximityConnection } from '../../utils/findProximityConnection'
```

Add module-level constants under `IR_PALETTE` (mirrors RoadmapPage):

```jsx
const SNAP_THRESHOLD = 40

// Blocks snap edge-to-edge — the default edge renders no line.
const edgeTypes = { default: InvisibleEdge }
```

Inside the component, add the `detachNode` selector next to `connect`:

```jsx
  const detachNode = useRoadmapStore((s) => s.detachNode)
```

Add the drag handlers after `onEdgesChange` (same semantics as
`RoadmapPage.jsx:116-154`, minus the trash zone the IR Board doesn't have):

```jsx
  // Dragging a block detaches it from all connections so it can be re-snapped elsewhere.
  const onNodeDragStart = useCallback(
    (_event, node) => detachNode(node.id),
    [detachNode],
  )
  // On drop, snap dot-to-dot when a dot pair is within threshold — no line is drawn.
  const onNodeDragStop = useCallback(
    (_event, node) => {
      const others = nodes.filter((n) => n.id !== node.id)
      const match = findProximityConnection(node, others, SNAP_THRESHOLD)
      if (!match) return
      setNodes(nodes.map((n) => (n.id === node.id ? { ...n, position: match.position } : n)))
      setEdges(addEdge(match.connection, edges))
    },
    [nodes, edges, setNodes, setEdges],
  )
```

Pass them to `<ReactFlow>` (existing props stay):

```jsx
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(c) => connect(c)}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          connectionMode="loose"
          fitView
          className="w-full h-full"
        >
```

Note: `onConnect` → `connect(c)` stays — dragging a line between dots still
works and the store's `connect` already snaps the target flush against the
source via `computeSnapPosition` (which Task 1 taught the IR block sizes).
Existing IR edges have no `type`, so they resolve to `default` and stop
rendering as lines the moment `edgeTypes` lands — requirement 3's "ไม่มี Line".

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/admin/IdeaRequestSection.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/IdeaRequestSection.jsx src/components/admin/IdeaRequestSection.test.jsx
git commit -m "feat(ir): no-line dot-to-dot snap connections on the IR Board"
```

---

### Task 5: Glow the connected dot

**Files:**
- Modify: `src/components/roadmap/ConnectionDot.jsx:19`
- Test: `src/components/roadmap/ConnectionDot.test.jsx` (new file)

**Interfaces:**
- Consumes: nothing new.
- Produces: connected dots render with a green glow (`shadow-[0_0_8px_2px_…]`)
  in addition to the existing green fill. Per-handle as before — only the dot
  actually holding a connection glows, satisfying "จุดเรืองแสง ณ จุดที่ต่อเท่านั้น".
  Shared component: the user Roadmap's dots get the same glow (visual-only;
  no behavior change).

- [ ] **Step 1: Write the failing test**

Create `src/components/roadmap/ConnectionDot.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

let sourceConnections = []
let targetConnections = []
vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: ({ className }) => <div data-testid="dot" className={className} />,
  useNodeConnections: ({ handleType }) =>
    handleType === 'source' ? sourceConnections : targetConnections,
}))

const { default: ConnectionDot } = await import('./ConnectionDot')

describe('ConnectionDot', () => {
  beforeEach(() => {
    sourceConnections = []
    targetConnections = []
  })

  it('glows green when this dot holds a connection', () => {
    targetConnections = [{ source: 'a', target: 'b' }]
    render(<ConnectionDot type="target" position="left" />)
    const cls = screen.getByTestId('dot').className
    expect(cls).toContain('!bg-green-400')
    expect(cls).toContain('shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]')
  })

  it('stays grey with no glow while free', () => {
    render(<ConnectionDot type="target" position="left" />)
    const cls = screen.getByTestId('dot').className
    expect(cls).toContain('!bg-gray-300')
    expect(cls).not.toContain('shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/roadmap/ConnectionDot.test.jsx`
Expected: FAIL — the connected class list has no `shadow-[…]` entry.

- [ ] **Step 3: Add the glow to the connected state**

In `src/components/roadmap/ConnectionDot.jsx` change the `className` line to:

```jsx
      className={`!w-3 !h-3 !border-white !border-2 ${connected ? '!bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]' : '!bg-gray-300'}`}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/roadmap/ConnectionDot.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/ConnectionDot.jsx src/components/roadmap/ConnectionDot.test.jsx
git commit -m "feat(roadmap): green glow on connected dots"
```

---

### Task 6: Full-suite verification

- [ ] **Step 1: Run the entire unit suite**

Run: `npm test`
Expected: PASS — no regressions anywhere (RoadmapPage untouched behaviorally;
`node scripts/…` and rules tests are not affected by this frontend-only work).

- [ ] **Step 2: Manual smoke check (dev server)**

Run: `npm run dev`, open `http://localhost:5173`, log in as an Admin, open the
IR tab and verify:
1. IdeaRoot / Update / Success blocks are the same 128×128 square as
   Process / Image.
2. Dragging a block next to another and releasing within ~40px snaps them
   dot-to-dot with **no line** drawn.
3. Only the two dots at the joint glow green; every other dot stays grey.
4. Dragging a connected block away detaches it (dots go grey) and it can be
   re-snapped elsewhere.
5. The user Roadmap page still behaves exactly as before (snap + glow dots).

- [ ] **Step 3: Done — hand off to /ilovework**

No deploys to queue. `/ilovework` will run tests, push `main`, and report a
Success Block onto the IR Board.
