# IR Board + iloveskill Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Admin Idea-Request (IR) Board on `roadmapSheets/admin-idea-board` (ADR 0013), then the `/iloveplan` → `/ilovetask` → `/ilovework` + `/unlock-bkb` workflow (ADR 0014) that reads/writes that board via `scripts/irReport.mjs`.

**Architecture:** Reuse the existing React Flow + `useRoadmapStore` + debounced `armRoadmapSheetSync` path for one fixed sheet id. Three new node types (`ideaRoot`, `update`, `success`) join the shared registry; the Admin tab mounts an IR-only canvas with a dedicated palette. Pure graph helpers in `src/lib/irBoard.js` are shared by the UI and the Admin-SDK CLI. Claude skills + one Cursor command glue around gitignored `.iloveskill/current.json` and a separate `pending-deploys.json` queue.

**Tech Stack:** Plain JS + JSX, React 19, `@xyflow/react`, Zustand (`useRoadmapStore`), Firebase client + Admin SDK (`firebase-admin`), Vitest (jsdom + rules emulator), Claude Code skills (`.claude/skills/`), Cursor commands (`.cursor/commands/`).

## Global Constraints

- No TypeScript — `.js` / `.jsx` only.
- Tailwind v4 tokens from `src/index.css` `@theme` (`text-brand`, `bg-surface`, `text-ink`, …).
- Firestore paths only via `src/lib/db.js` (`refs.*`, `cols.*`, `shapes.*`) in app code; Admin SDK scripts may use `db.doc('roadmapSheets/admin-idea-board')`.
- Store mutations auto-sync via `syncManager` — never add manual `saveToFirestore()` / `localStorage` / `useEffect` save timers in the IR UI.
- Never read, commit, or log `serviceAccountKey.json`.
- Domain terms from `UBIQUITOUS_LANGUAGE.md`: say **IR Board** (never "admin roadmap"); **Idea Root Block** ≠ Start block; leave `StartNode` untouched.
- Fixed sheet id contract: `admin-idea-board` (exact string).
- Idea Status values (exact): `idea` | `planned` | `in-progress` | `done`.
- Do not add an `idea-request` key to `ADMIN_SECTIONS` / each `ADMIN_ROLES` entry — every email in `ADMIN_ROLES` sees the tab automatically.
- Mid-task deploys (rules / functions / indexes / `vercel --prod` / anything permission-heavy) go into `.iloveskill/pending-deploys.json`; only `/unlock-bkb` runs them.
- Rules deploy itself is queued — Task 4 edits `firestore.rules` in git; live deploy waits for `/unlock-bkb` (or a human) after merge.

## File Structure

| Path | Responsibility |
|------|----------------|
| `src/constants/irBoard.js` | `IR_SHEET_ID`, `IDEA_STATUSES`, default data factories |
| `src/lib/irBoard.js` | Pure graph helpers: list ideas, subtree, append report nodes, status patch |
| `src/components/roadmap/IdeaRootNode.jsx` | Idea Root Block UI |
| `src/components/roadmap/UpdateNode.jsx` | Update Block UI (read-mostly) |
| `src/components/roadmap/SuccessNode.jsx` | Success Block UI (read-mostly) |
| `src/components/roadmap/nodeTypes.js` | Register the three new types |
| `src/stores/useRoadmapStore.js` | `addNode` defaults for new types |
| `src/services/irBoardSession.js` | Mount/unmount IR sheet into store without poisoning user roadmaps |
| `src/components/admin/IdeaRequestSection.jsx` | Full-bleed React Flow canvas + IR palette |
| `src/pages/AdminPage.jsx` | Append Idea-Request tab for every admin |
| `firestore.rules` | `isAnyAdmin()` + `admin-idea-board` R/W |
| `scripts/irReport.mjs` | CLI bridge (list / read / set-status / append-update / append-success / ensure) |
| `.iloveskill/` | gitignored: `current.json`, `pending-deploys.json` |
| `docs/plans/` | Plan Files written by `/iloveplan` |
| `.claude/skills/iloveplan/SKILL.md` | Plan skill |
| `.claude/skills/ilovework/SKILL.md` | Test → push → report skill |
| `.claude/skills/unlock-bkb/SKILL.md` | Drain pending deploy queue |
| `.cursor/commands/ilovetask.md` | Cursor implement-from-plan command |

## Judgment Calls (read before implementing)

1. **Reuse `useRoadmapStore`, snapshot on mount/unmount.** A second Zustand store would duplicate sync. `irBoardSession.mount()` injects the IR sheet, switches to it, arms sync; `unmount()` restores the previous `sheets`/`activeSheetId` and re-arms. Persist `partialize` filters out `admin-idea-board` so localStorage never keeps the admin board as a user sheet.
2. **Idea membership = undirected BFS from the Idea Root** over `edges` (ignore handle direction). An Idea = the root plus every reachable node. Two Ideas must not share nodes; if they do, CLI reports the first root that claims the node (document in helper JSDoc).
3. **Report blocks attach as children of the Idea Root** with a new edge `source: ideaId → target: reportId`. Place new report nodes at `{ x: root.x + 180, y: root.y + 40 + (existingReports * 120) }`.
4. **`update` / `success` data shape:** `{ summary: string, timestamp: string }` where `timestamp` is ISO-8601 from `new Date().toISOString()`. Display as read-only text (no textarea for CLI-written blocks; optional empty-state edit only if created from palette).
5. **`ideaRoot` data shape:** `{ title: string, status: 'idea' }`. Status changes from palette UI (select) and from CLI. Title is an editable input (like Process `label`).
6. **IR palette only:** `ideaRoot`, `process`, `image`, `update`, `success`. No `start` / `condition` / `video` / `stageLabel`.
7. **Sheet seed:** `irReport.mjs ensure` creates the doc if missing (`ownerUid` = `ADMIN_UID` from `src/constants/admin.js`, `name: 'IR Board'`, empty nodes/edges). Client mount also calls ensure-or-create via client SDK when rules allow.
8. **`/ilovework` pushes `main` directly** when tests pass (ADR) — no PR step.
9. **Extract pure helpers under `src/lib/irBoard.js`** so Vitest covers graph logic; `scripts/irReport.mjs` imports them (package is `"type": "module"`).

---

### Task 1: IR constants + status helpers

**Files:**
- Create: `src/constants/irBoard.js`
- Create: `src/constants/irBoard.test.js`

**Interfaces:**
- Produces: `IR_SHEET_ID = 'admin-idea-board'`, `IDEA_STATUSES = ['idea','planned','in-progress','done']`, `isIdeaStatus(s)`, `defaultIdeaRootData()`, `defaultReportData(summary)` → `{ summary, timestamp }`

- [ ] **Step 1: Write the failing test**

Create `src/constants/irBoard.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  IR_SHEET_ID,
  IDEA_STATUSES,
  isIdeaStatus,
  defaultIdeaRootData,
  defaultReportData,
} from './irBoard'

describe('irBoard constants', () => {
  it('locks the fixed sheet id contract', () => {
    expect(IR_SHEET_ID).toBe('admin-idea-board')
  })

  it('lists statuses in lifecycle order', () => {
    expect(IDEA_STATUSES).toEqual(['idea', 'planned', 'in-progress', 'done'])
  })

  it('validates statuses', () => {
    expect(isIdeaStatus('planned')).toBe(true)
    expect(isIdeaStatus('nope')).toBe(false)
  })

  it('defaults an Idea Root to status idea', () => {
    expect(defaultIdeaRootData()).toEqual({ title: '', status: 'idea' })
  })

  it('builds report data with an ISO timestamp', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T05:00:00.000Z'))
    expect(defaultReportData('shipped')).toEqual({
      summary: 'shipped',
      timestamp: '2026-07-12T05:00:00.000Z',
    })
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/constants/irBoard.test.js`

Expected: FAIL — cannot resolve `./irBoard`

- [ ] **Step 3: Write minimal implementation**

Create `src/constants/irBoard.js`:

```js
export const IR_SHEET_ID = 'admin-idea-board'

export const IDEA_STATUSES = ['idea', 'planned', 'in-progress', 'done']

export function isIdeaStatus(value) {
  return IDEA_STATUSES.includes(value)
}

export function defaultIdeaRootData() {
  return { title: '', status: 'idea' }
}

export function defaultReportData(summary = '') {
  return { summary, timestamp: new Date().toISOString() }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/constants/irBoard.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/constants/irBoard.js src/constants/irBoard.test.js
git commit -m "feat(ir): add IR Board sheet id and idea status constants"
```

---

### Task 2: Pure idea-graph helpers

**Files:**
- Create: `src/lib/irBoard.js`
- Create: `src/lib/irBoard.test.js`

**Interfaces:**
- Consumes: `IDEA_STATUSES`, `isIdeaStatus`, `defaultReportData` from `src/constants/irBoard.js`
- Produces:
  - `listIdeas(nodes, { includeDone })` → `[{ id, title, status }]`
  - `collectIdeaSubtree(ideaId, nodes, edges)` → `{ root, nodes, edges }`
  - `setIdeaStatus(nodes, ideaId, status)` → new nodes array
  - `appendReportNode({ nodes, edges, ideaId, type, summary })` → `{ nodes, edges, reportId }` where `type` is `'update'|'success'`

- [ ] **Step 1: Write the failing test**

Create `src/lib/irBoard.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  listIdeas,
  collectIdeaSubtree,
  setIdeaStatus,
  appendReportNode,
} from './irBoard'

const nodes = [
  { id: 'r1', type: 'ideaRoot', position: { x: 0, y: 0 }, data: { title: 'Alpha', status: 'idea' } },
  { id: 'p1', type: 'process', position: { x: 200, y: 0 }, data: { label: 'Do X', note: '' } },
  { id: 'r2', type: 'ideaRoot', position: { x: 0, y: 300 }, data: { title: 'Beta', status: 'done' } },
  { id: 'u1', type: 'update', position: { x: 200, y: 300 }, data: { summary: 'old', timestamp: 't' } },
]
const edges = [
  { id: 'e1', source: 'r1', target: 'p1' },
  { id: 'e2', source: 'r2', target: 'u1' },
]

describe('listIdeas', () => {
  it('omits done by default', () => {
    expect(listIdeas(nodes)).toEqual([{ id: 'r1', title: 'Alpha', status: 'idea' }])
  })

  it('can include done', () => {
    expect(listIdeas(nodes, { includeDone: true })).toHaveLength(2)
  })
})

describe('collectIdeaSubtree', () => {
  it('returns the root plus reachable blocks', () => {
    const sub = collectIdeaSubtree('r1', nodes, edges)
    expect(sub.root.id).toBe('r1')
    expect(sub.nodes.map((n) => n.id).sort()).toEqual(['p1', 'r1'])
    expect(sub.edges).toHaveLength(1)
  })
})

describe('setIdeaStatus', () => {
  it('patches only the matching ideaRoot', () => {
    const next = setIdeaStatus(nodes, 'r1', 'planned')
    expect(next.find((n) => n.id === 'r1').data.status).toBe('planned')
    expect(next.find((n) => n.id === 'r2').data.status).toBe('done')
  })

  it('throws on invalid status', () => {
    expect(() => setIdeaStatus(nodes, 'r1', 'nope')).toThrow(/invalid status/i)
  })
})

describe('appendReportNode', () => {
  it('adds an update node edged from the idea root', () => {
    const { nodes: n2, edges: e2, reportId } = appendReportNode({
      nodes,
      edges,
      ideaId: 'r1',
      type: 'update',
      summary: 'blocked on rules',
    })
    const report = n2.find((n) => n.id === reportId)
    expect(report.type).toBe('update')
    expect(report.data.summary).toBe('blocked on rules')
    expect(typeof report.data.timestamp).toBe('string')
    expect(e2.some((e) => e.source === 'r1' && e.target === reportId)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/irBoard.test.js`

Expected: FAIL — cannot resolve `./irBoard`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/irBoard.js`:

```js
import { isIdeaStatus, defaultReportData } from '../constants/irBoard.js'

function undirectedAdj(edges) {
  const map = new Map()
  for (const e of edges) {
    if (!map.has(e.source)) map.set(e.source, [])
    if (!map.has(e.target)) map.set(e.target, [])
    map.get(e.source).push(e.target)
    map.get(e.target).push(e.source)
  }
  return map
}

export function listIdeas(nodes, { includeDone = false } = {}) {
  return (nodes ?? [])
    .filter((n) => n.type === 'ideaRoot')
    .filter((n) => includeDone || n.data?.status !== 'done')
    .map((n) => ({
      id: n.id,
      title: n.data?.title ?? '',
      status: n.data?.status ?? 'idea',
    }))
}

export function collectIdeaSubtree(ideaId, nodes, edges) {
  const byId = new Map((nodes ?? []).map((n) => [n.id, n]))
  const root = byId.get(ideaId)
  if (!root || root.type !== 'ideaRoot') {
    throw new Error(`ideaRoot not found: ${ideaId}`)
  }
  const adj = undirectedAdj(edges ?? [])
  const seen = new Set([ideaId])
  const queue = [ideaId]
  while (queue.length) {
    const cur = queue.shift()
    for (const next of adj.get(cur) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  const subNodes = [...seen].map((id) => byId.get(id)).filter(Boolean)
  const subEdges = (edges ?? []).filter((e) => seen.has(e.source) && seen.has(e.target))
  return { root, nodes: subNodes, edges: subEdges }
}

export function setIdeaStatus(nodes, ideaId, status) {
  if (!isIdeaStatus(status)) throw new Error(`invalid status: ${status}`)
  return (nodes ?? []).map((n) =>
    n.id === ideaId && n.type === 'ideaRoot'
      ? { ...n, data: { ...n.data, status } }
      : n,
  )
}

export function appendReportNode({ nodes, edges, ideaId, type, summary }) {
  if (type !== 'update' && type !== 'success') {
    throw new Error(`invalid report type: ${type}`)
  }
  const root = (nodes ?? []).find((n) => n.id === ideaId && n.type === 'ideaRoot')
  if (!root) throw new Error(`ideaRoot not found: ${ideaId}`)

  const existingReports = (nodes ?? []).filter(
    (n) => (n.type === 'update' || n.type === 'success') &&
      (edges ?? []).some((e) => e.source === ideaId && e.target === n.id),
  ).length

  const reportId = `node-ir-${Date.now()}`
  const edgeId = `edge-ir-${Date.now()}`
  const report = {
    id: reportId,
    type,
    position: {
      x: (root.position?.x ?? 0) + 180,
      y: (root.position?.y ?? 0) + 40 + existingReports * 120,
    },
    data: defaultReportData(summary),
  }
  return {
    nodes: [...(nodes ?? []), report],
    edges: [...(edges ?? []), { id: edgeId, source: ideaId, target: reportId }],
    reportId,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/irBoard.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/irBoard.js src/lib/irBoard.test.js
git commit -m "feat(ir): add pure idea-graph helpers for list/subtree/report"
```

---

### Task 3: Idea Root / Update / Success nodes + registry

**Files:**
- Create: `src/components/roadmap/IdeaRootNode.jsx`
- Create: `src/components/roadmap/IdeaRootNode.test.jsx`
- Create: `src/components/roadmap/UpdateNode.jsx`
- Create: `src/components/roadmap/SuccessNode.jsx`
- Create: `src/components/roadmap/UpdateNode.test.jsx`
- Modify: `src/components/roadmap/nodeTypes.js`
- Modify: `src/stores/useRoadmapStore.js` (`addNode` defaults)
- Modify: `src/stores/useRoadmapStore.test.js` (one assertion for new defaults)

**Interfaces:**
- Consumes: `IDEA_STATUSES`, `defaultIdeaRootData`, `defaultReportData`
- Produces: registered `ideaRoot` / `update` / `success` in `nodeTypes`; `addNode('ideaRoot')` → `{ title:'', status:'idea' }`; `addNode('update'|'success')` → `{ summary:'', timestamp }`

- [ ] **Step 1: Write the failing IdeaRootNode test**

Create `src/components/roadmap/IdeaRootNode.test.jsx`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let roadmapState

vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: () => null,
  useNodeConnections: () => [],
}))
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel(roadmapState),
}))

const { default: IdeaRootNode } = await import('./IdeaRootNode')

describe('IdeaRootNode', () => {
  beforeEach(() => {
    roadmapState = { updateNodeData: vi.fn() }
  })

  it('renders title and status, writes both via updateNodeData', () => {
    render(
      <IdeaRootNode
        id="r1"
        data={{ title: 'Ship IR', status: 'idea' }}
        selected={false}
      />,
    )
    expect(screen.getByDisplayValue('Ship IR')).toBeTruthy()
    fireEvent.change(screen.getByDisplayValue('Ship IR'), {
      target: { value: 'Ship IR Board' },
    })
    expect(roadmapState.updateNodeData).toHaveBeenCalledWith('r1', {
      title: 'Ship IR Board',
    })
    fireEvent.change(screen.getByLabelText('Idea status'), {
      target: { value: 'planned' },
    })
    expect(roadmapState.updateNodeData).toHaveBeenCalledWith('r1', {
      status: 'planned',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- IdeaRootNode.test`

Expected: FAIL — module not found

- [ ] **Step 3: Implement IdeaRootNode, UpdateNode, SuccessNode**

`IdeaRootNode.jsx` — both target + source handles (unlike Start). Title input + status `<select aria-label="Idea status">`. Mirror ProcessNode sizing/border conventions (`w-40`, `rounded-xl`, `border-2`, `bg-surface`, `nodrag` on inputs).

```jsx
import { useCallback } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { IDEA_STATUSES } from '../../constants/irBoard'
import ConnectionDot from './ConnectionDot'

export default function IdeaRootNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const onTitle = useCallback(
    (e) => updateNodeData(id, { title: e.target.value }),
    [id, updateNodeData],
  )
  const onStatus = useCallback(
    (e) => updateNodeData(id, { status: e.target.value }),
    [id, updateNodeData],
  )

  return (
    <div
      className={`relative w-40 min-h-32 rounded-xl border-2 bg-brand-soft p-2.5 flex flex-col gap-1 ${
        selected ? 'border-brand shadow-hard-sm' : 'border-brand/40'
      }`}
    >
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />
      <p className="pixel-font text-[8px] text-brand">IDEA</p>
      <input
        className="nodrag w-full text-[12px] font-semibold text-ink bg-transparent outline-none"
        placeholder="Idea title"
        value={data.title ?? ''}
        onChange={onTitle}
      />
      <select
        aria-label="Idea status"
        className="nodrag w-full text-[10px] text-ink bg-surface border border-ink/20 rounded px-1 py-0.5"
        value={data.status ?? 'idea'}
        onChange={onStatus}
      >
        {IDEA_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <ConnectionDot type="source" position={Position.Right} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
    </div>
  )
}
```

`UpdateNode.jsx` / `SuccessNode.jsx` — read-only summary + timestamp display; left target + right/bottom source handles so they can sit in the tree. Use `bg-amber-50` for update and `bg-emerald-50` for success (or brand tokens if amber/emerald feel off — keep distinct). Allow empty `summary` with placeholder "Summary".

- [ ] **Step 4: Register types + store defaults**

`nodeTypes.js` — add:

```js
import IdeaRootNode from './IdeaRootNode'
import UpdateNode from './UpdateNode'
import SuccessNode from './SuccessNode'

export const nodeTypes = {
  // ...existing
  ideaRoot: IdeaRootNode,
  update: UpdateNode,
  success: SuccessNode,
}
```

In `useRoadmapStore.js` `addNode`, replace the data line with:

```js
import { defaultIdeaRootData, defaultReportData } from '../constants/irBoard'

// inside addNode:
const data =
  type === 'start' ? { journeyRef: null }
  : type === 'ideaRoot' ? defaultIdeaRootData()
  : type === 'update' || type === 'success' ? defaultReportData('')
  : { label: '', note: '', color: null }
```

Add a store test assertion that `addNode('ideaRoot')` yields `data.status === 'idea'`.

- [ ] **Step 5: Write UpdateNode smoke test + run all**

`UpdateNode.test.jsx` — render with `{ summary: 'hi', timestamp: '2026-07-12T00:00:00.000Z' }`, assert text visible.

Run: `npm test -- IdeaRootNode.test UpdateNode.test useRoadmapStore.test`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/roadmap/IdeaRootNode.jsx src/components/roadmap/IdeaRootNode.test.jsx \
  src/components/roadmap/UpdateNode.jsx src/components/roadmap/UpdateNode.test.jsx \
  src/components/roadmap/SuccessNode.jsx src/components/roadmap/nodeTypes.js \
  src/stores/useRoadmapStore.js src/stores/useRoadmapStore.test.js
git commit -m "feat(ir): add ideaRoot, update, and success roadmap node types"
```

---

### Task 4: Firestore rules for `admin-idea-board`

**Files:**
- Modify: `firestore.rules`
- Modify: `src/constants/adminRulesSync.test.js`
- Modify: `test/rules/firestore.rules.test.js`

**Interfaces:**
- Produces: `isAnyAdmin()` listing every `ADMIN_ROLES` email (super-admin also via `isSuperAdmin()`); `sheetId == 'admin-idea-board'` may be read/created/updated by any admin. Delete stays owner-only (seed owner = `ADMIN_UID`).

- [ ] **Step 1: Extend adminRulesSync test (fails until rules exist)**

Add to `adminRulesSync.test.js`:

```js
it('firestore isAnyAdmin() lists every ADMIN_ROLES email exactly once', () => {
  const body = fnBody(firestoreRules, 'isAnyAdmin')
  const emails = extractEmails(body)
  expect([...new Set(emails)].sort()).toEqual(Object.keys(ADMIN_ROLES).sort())
})
```

Also update the "every section-admin email appears" test if needed — once `isAnyAdmin` lists all emails including super-admin email, section-admins remain covered.

- [ ] **Step 2: Run sync test — expect FAIL**

Run: `npm test -- adminRulesSync`

Expected: FAIL — `isAnyAdmin() not found`

- [ ] **Step 3: Patch firestore.rules**

After `canEditShop`, add:

```
function isAnyAdmin() {
  return isSuperAdmin()
    || userEmail() == 'o.korawitt@gmail.com'
    || userEmail() == 'takadaoni07@gmail.com'
    || userEmail() == 'play198725@gmail.com'
    || userEmail() == 'itcity9476@gmail.com';
}
```

(Keep emails in sync with `ADMIN_ROLES` keys — the sync test enforces this.)

Inside `match /roadmapSheets/{sheetId}`:

```
allow read: if canReadSheet() || (sheetId == 'admin-idea-board' && isAnyAdmin());
allow create: if (isSignedIn() && request.auth.uid == request.resource.data.ownerUid)
  || (sheetId == 'admin-idea-board' && isAnyAdmin());
allow update: if isSheetOwner()
  || (isEditCollaborator()
      && resource.data.ownerUid == request.resource.data.ownerUid
      && resource.data.collaborators == request.resource.data.collaborators
      && resource.data.collaboratorUids == request.resource.data.collaboratorUids)
  || (sheetId == 'admin-idea-board' && isAnyAdmin());
allow delete: if isSheetOwner();
```

- [ ] **Step 4: Add emulator rules tests**

In `test/rules/firestore.rules.test.js`, new describe block:

```js
describe('IR Board sheet (roadmapSheets/admin-idea-board)', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'roadmapSheets/admin-idea-board'), {
        ownerUid: 'IaltEhO0mPVfK3ng8npr4CdqnEE3',
        name: 'IR Board',
        nodes: [],
        edges: [],
        order: 0,
        collaborators: {},
        collaboratorUids: [],
      })
    })
  })

  it('lets a maps-section admin read and update nodes', async () => {
    const mapsAdmin = testEnv.authenticatedContext('maps-uid', {
      email: 'takadaoni07@gmail.com',
    }).firestore()
    await assertSucceeds(getDoc(doc(mapsAdmin, 'roadmapSheets/admin-idea-board')))
    await assertSucceeds(updateDoc(doc(mapsAdmin, 'roadmapSheets/admin-idea-board'), {
      nodes: [{ id: 'r1', type: 'ideaRoot' }],
    }))
  })

  it('BLOCKS a non-admin from reading the IR Board', async () => {
    const rando = testEnv.authenticatedContext('rando').firestore()
    await assertFails(getDoc(doc(rando, 'roadmapSheets/admin-idea-board')))
  })

  it('does not grant non-admins access to ordinary sheets', async () => {
    // existing sheet-1 fixture from sibling describe, or seed here
  })
})
```

- [ ] **Step 5: Run unit + rules tests**

Run: `npm test -- adminRulesSync`

Expected: PASS

Run: `npm run test:rules:emu` (or project’s usual rules command)

Expected: new IR Board cases PASS; existing roadmap sheet cases still PASS

- [ ] **Step 6: Commit (do NOT deploy rules)**

```bash
git add firestore.rules src/constants/adminRulesSync.test.js test/rules/firestore.rules.test.js
git commit -m "feat(ir): allow any admin to read/write admin-idea-board"
```

Note: queue `firebase deploy --only firestore:rules` into `.iloveskill/pending-deploys.json` once that file exists (Task 7+), or leave a comment in the PR that unlock-bkb must deploy rules.

---

### Task 5: IR board session mount/unmount

**Files:**
- Create: `src/services/irBoardSession.js`
- Create: `src/services/irBoardSession.test.js`
- Modify: `src/stores/useRoadmapStore.js` (persist `partialize`)

**Interfaces:**
- Consumes: `IR_SHEET_ID`, `refs.roadmapSheet`, `getDoc`/`setDoc`, `shapes.newRoadmapSheet`, `ADMIN_UID`, `armRoadmapSheetSync`, `disarmRoadmapSheetSync`, `useRoadmapStore.hydrateSheets` / `switchSheet`
- Produces: `async function mountIrBoard({ uid })` → loads/creates sheet, injects into store, arms sync, returns restore token; `async function unmountIrBoard(token)` → restores prior sheets/active, re-arms prior sheet if any

- [ ] **Step 1: Write failing session test (mocked firebase + store)**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const hydrateSheets = vi.fn()
const switchSheet = vi.fn()
const getState = vi.fn()

vi.mock('../stores/useRoadmapStore', () => ({
  useRoadmapStore: { getState: () => getState() },
}))
vi.mock('../lib/syncManager', () => ({
  armRoadmapSheetSync: vi.fn(),
  disarmRoadmapSheetSync: vi.fn(),
}))
vi.mock('../lib/db', () => ({
  refs: { roadmapSheet: (id) => ({ path: `roadmapSheets/${id}` }) },
  shapes: {
    newRoadmapSheet: (args) => ({ ...args, collaborators: {}, collaboratorUids: [] }),
  },
}))

// mock getDoc / setDoc from firebase/firestore as needed for your test harness
```

Assert: after `mountIrBoard`, store received a sheet with `id: 'admin-idea-board'` and `myRole: 'edit'`; `armRoadmapSheetSync` called with `admin-idea-board`. After `unmountIrBoard(token)`, previous `activeSheetId` restored.

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- irBoardSession`

- [ ] **Step 3: Implement `irBoardSession.js`**

```js
import { getDoc, setDoc } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import { IR_SHEET_ID } from '../constants/irBoard'
import { ADMIN_UID } from '../constants/admin'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import { armRoadmapSheetSync, disarmRoadmapSheetSync } from '../lib/syncManager'

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

export async function mountIrBoard() {
  const prev = useRoadmapStore.getState()
  const token = {
    sheets: prev.sheets,
    activeSheetId: prev.activeSheetId,
  }
  disarmRoadmapSheetSync()
  const data = await ensureIrBoardDoc()
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
  armRoadmapSheetSync(IR_SHEET_ID)
  return token
}

export async function unmountIrBoard(token) {
  if (!token) return
  disarmRoadmapSheetSync()
  const sheets = (token.sheets ?? []).filter((s) => s.id !== IR_SHEET_ID)
  const activeSheetId = token.activeSheetId === IR_SHEET_ID
    ? (sheets[0]?.id ?? null)
    : token.activeSheetId
  useRoadmapStore.getState().hydrateSheets(sheets, activeSheetId)
  if (activeSheetId) armRoadmapSheetSync(activeSheetId)
}
```

Add persist `partialize` on `useRoadmapStore`:

```js
{
  name: 'rc-roadmap-store',
  partialize: (state) => ({
    myUid: state.myUid,
    sheets: state.sheets.filter((s) => s.id !== 'admin-idea-board'),
    activeSheetId:
      state.activeSheetId === 'admin-idea-board'
        ? (state.sheets.find((s) => s.id !== 'admin-idea-board')?.id ?? 'local-default')
        : state.activeSheetId,
    // do NOT persist live nodes/edges mirroring — they rehydrate from sheets
  }),
}
```

**Careful:** check current persist behavior — if the store today persists the full state and sessionBootstrap always overwrites on login, prefer the minimal filter above. If partialize currently does not exist, adding it must still persist whatever the app already relied on (open the file and mirror existing fields; if there was no partialize, filter sheets/activeSheetId only via a custom `storage` wrapper OR document that IR unmount is the primary safeguard and partialize is optional). **Preferred:** add `partialize` that returns the same shape zustand was saving, minus IR sheet — read current persisted keys from a quick `localStorage` check or from tests.

If existing tests assume full persist, update them.

- [ ] **Step 4: Tests PASS**

Run: `npm test -- irBoardSession useRoadmapStore`

- [ ] **Step 5: Commit**

```bash
git add src/services/irBoardSession.js src/services/irBoardSession.test.js src/stores/useRoadmapStore.js
git commit -m "feat(ir): mount/unmount IR Board sheet in roadmap store session"
```

---

### Task 6: Admin Idea-Request tab + canvas

**Files:**
- Create: `src/components/admin/IdeaRequestSection.jsx`
- Modify: `src/pages/AdminPage.jsx`

**Interfaces:**
- Consumes: `mountIrBoard` / `unmountIrBoard`, `nodeTypes`, `useRoadmapStore` selectors/actions (`nodes`, `edges`, `onNodesChange` pattern from RoadmapPage, `addNode`, `setNodes`, `setEdges`, `connect`)
- Produces: Tab `idea-request` visible whenever `getAdminSections(email).length > 0` (any `ADMIN_ROLES` member)

- [ ] **Step 1: Wire AdminPage tab (no section key)**

Replace tab construction:

```js
import IdeaRequestSection from '../components/admin/IdeaRequestSection'

const IR_TAB = { id: 'idea-request', label: 'Idea-Request' }

// inside component:
const sections = getAdminSections(user?.email)
const tabs = [
  ...ALL_TABS.filter((t) => sections.includes(t.id)),
  ...(sections.length > 0 ? [IR_TAB] : []),
]
```

Change `<main>` so the IR tab is full-bleed:

```jsx
<main className={tab === 'idea-request' ? 'h-[calc(100vh-8rem)]' : 'max-w-5xl mx-auto px-6 py-8'}>
  {/* existing branches */}
  {tab === 'idea-request' && <IdeaRequestSection />}
</main>
```

- [ ] **Step 2: Implement IdeaRequestSection**

Pattern after `RoadmapPage`’s React Flow core, stripped of SheetSwitcher / Start / export:

```jsx
import { useEffect, useCallback, useState } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  useNodesState, useEdgesState, addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from '../roadmap/nodeTypes'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { mountIrBoard, unmountIrBoard } from '../../services/irBoardSession'

const IR_PALETTE = [
  { type: 'ideaRoot', label: 'Idea Root' },
  { type: 'process', label: 'Process' },
  { type: 'image', label: 'Image' },
  { type: 'update', label: 'Update' },
  { type: 'success', label: 'Success' },
]

export default function IdeaRequestSection() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const nodes = useRoadmapStore((s) => s.nodes)
  const edges = useRoadmapStore((s) => s.edges)
  const setNodes = useRoadmapStore((s) => s.setNodes)
  const setEdges = useRoadmapStore((s) => s.setEdges)
  const addNode = useRoadmapStore((s) => s.addNode)
  const connect = useRoadmapStore((s) => s.connect)
  const syncStatus = useRoadmapStore((s) => s.syncStatus)

  useEffect(() => {
    let token = null
    let cancelled = false
    ;(async () => {
      try {
        token = await mountIrBoard()
        if (!cancelled) setReady(true)
      } catch (e) {
        if (!cancelled) setError(e.message ?? String(e))
      }
    })()
    return () => {
      cancelled = true
      unmountIrBoard(token)
    }
  }, [])

  // Prefer store onNodesChange/onEdgesChange if RoadmapPage exposes them via store;
  // otherwise mirror RoadmapPage's local handlers that call setNodes/setEdges.
  // Read RoadmapPage.jsx and copy the same change handlers + connectionMode="loose".

  if (error) return <p className="p-6 text-sm text-red-600">IR Board: {error}</p>
  if (!ready) return <p className="p-6 text-sm text-ink-soft">Loading IR Board…</p>

  return (
    <div className="relative w-full h-full min-h-[480px] bg-surface">
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        {IR_PALETTE.map((p) => (
          <button
            key={p.type}
            type="button"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-ink/20 bg-white hover:border-brand"
            onClick={() => addNode(p.type, { x: 120 + Math.random() * 80, y: 120 + Math.random() * 80 })}
          >
            + {p.label}
          </button>
        ))}
        <span className="text-[10px] text-ink-soft self-center ml-2">sync: {syncStatus}</span>
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={/* same as RoadmapPage */}
          onEdgesChange={/* same as RoadmapPage */}
          onConnect={(c) => connect(c)}
          connectionMode="loose"
          fitView
          className="w-full h-full"
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
```

**Important:** copy `onNodesChange` / `onEdgesChange` exactly from `RoadmapPage.jsx` (they usually wrap `applyNodeChanges` then `setNodes`). Do not invent a second source of truth.

Fix the unmount race: store `token` in a `useRef` so cleanup always has it:

```js
const tokenRef = useRef(null)
useEffect(() => {
  let cancelled = false
  ;(async () => {
    const token = await mountIrBoard()
    tokenRef.current = token
    if (!cancelled) setReady(true)
  })().catch(...)
  return () => {
    cancelled = true
    unmountIrBoard(tokenRef.current)
    tokenRef.current = null
  }
}, [])
```

- [ ] **Step 3: Manual check**

Run: `npm run dev` → sign in as any `ADMIN_ROLES` email → `/admin` → **Idea-Request** tab → create Idea Root + Process, connect them, wait for sync `saved`. Confirm maps-only admin (`takadaoni07@gmail.com`) sees the tab. Confirm `/roadmap` still shows the user sheet after leaving the tab.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/IdeaRequestSection.jsx src/pages/AdminPage.jsx
git commit -m "feat(ir): embed Idea-Request board tab in Admin dashboard"
```

---

### Task 7: `.iloveskill/` gitignore + `docs/plans/` + pending-deploy helper

**Files:**
- Modify: `.gitignore`
- Create: `docs/plans/.gitkeep`
- Create: `src/lib/iloveskillState.js`
- Create: `src/lib/iloveskillState.test.js`

**Interfaces:**
- Produces (node fs helpers used by skills docs; also unit-tested):
  - `CURRENT_PATH = '.iloveskill/current.json'`
  - `PENDING_PATH = '.iloveskill/pending-deploys.json'`
  - `readCurrent()` / `writeCurrent({ ideaId, ideaTitle, planPath })` / `clearCurrent()`
  - `readPending()` / `enqueuePending(command)` / `clearPending()`
  - Queue file shape: `{ commands: string[] }`

- [ ] **Step 1: Tests for state helpers**

Use `fs` against a temp dir via injecting `baseDir` parameter for testability:

```js
export function writeCurrent(data, baseDir = process.cwd()) { ... }
```

Assert round-trip and that `clearCurrent` deletes the file; `enqueuePending` appends; `clearPending` resets to `{ commands: [] }`.

- [ ] **Step 2: Implement + gitignore**

`.gitignore` add:

```
.iloveskill/
```

Create `docs/plans/.gitkeep`.

- [ ] **Step 3: Pass tests + commit**

```bash
git add .gitignore docs/plans/.gitkeep src/lib/iloveskillState.js src/lib/iloveskillState.test.js
git commit -m "feat(iloveskill): add gitignored state helpers and docs/plans/"
```

---

### Task 8: `scripts/irReport.mjs` CLI

**Files:**
- Create: `scripts/irReport.mjs`
- Modify: `package.json` (optional script alias)
- Create: `scripts/irReport.test.js` — unit-test argv parsing / dry helpers by exporting `parseArgs` from a tiny `scripts/irReportLib.mjs` OR test only via importing `src/lib/irBoard.js` (already covered) and a thin `parseArgs` export

**Interfaces:**
- CLI (Admin SDK, env `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json`):

```
node scripts/irReport.mjs ensure
node scripts/irReport.mjs list [--include-done]
node scripts/irReport.mjs read <ideaId>
node scripts/irReport.mjs set-status <ideaId> <status>
node scripts/irReport.mjs append-update <ideaId> <summary...>
node scripts/irReport.mjs append-success <ideaId> <summary...>
```

Stdout for `list`: one JSON line per idea `{"id","title","status"}` (or a JSON array — pick **JSON array** for machine parsing).

- [ ] **Step 1: Implement script following `resetFarmData.mjs` init**

```js
// GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs <cmd> ...
import admin from 'firebase-admin'
import { IR_SHEET_ID } from '../src/constants/irBoard.js'
import { ADMIN_UID } from '../src/constants/admin.js'
import {
  listIdeas,
  collectIdeaSubtree,
  setIdeaStatus,
  appendReportNode,
} from '../src/lib/irBoard.js'

// init admin like resetFarmData.mjs
const docRef = () => db.doc(`roadmapSheets/${IR_SHEET_ID}`)

async function loadBoard() {
  const snap = await docRef().get()
  if (!snap.exists) throw new Error('IR Board missing — run: node scripts/irReport.mjs ensure')
  return snap.data()
}

async function saveBoard(data) {
  await docRef().set(
    { nodes: data.nodes, edges: data.edges, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  )
}
```

`ensure`: create with empty nodes/edges if missing.

`read`: print JSON `{ idea, blocks:[{id,type,data}] }` using `collectIdeaSubtree`.

`append-update` / `append-success`: load → appendReportNode → optionally `setIdeaStatus(..., 'in-progress'|'done')` — **status transitions:**

| Command | Status side-effect |
|---------|-------------------|
| `set-status` | exact status |
| `append-update` | set `in-progress` |
| `append-success` | set `done` |

(Matches ADR 0014 `/ilovework` behavior.)

- [ ] **Step 2: Manual smoke (requires local key)**

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs ensure
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs list
```

Expected: `[]` or existing ideas; no stack trace.

- [ ] **Step 3: Add package.json script**

```json
"ir-report": "node scripts/irReport.mjs"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/irReport.mjs package.json
git commit -m "feat(ir): add irReport.mjs CLI to list and update the IR Board"
```

---

### Task 9: `/iloveplan` Claude skill

**Files:**
- Create: `.claude/skills/iloveplan/SKILL.md`

**Interfaces:**
- Consumes: `irReport.mjs list/read/set-status`, `writeCurrent`
- Produces: `docs/plans/YYYY-MM-DD-<slug>.md`, `.iloveskill/current.json`, idea status `planned`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: iloveplan
description: Pick a non-done Idea from the IR Board, write a Cursor plan under docs/plans/, and set Current Work State. Use when the user runs /iloveplan or asks to plan the next IR Idea.
---

# /iloveplan

## Preconditions
- `serviceAccountKey.json` present locally (never read it into chat context).
- IR Board exists (`node scripts/irReport.mjs ensure` if unsure).

## Steps
1. Run:
   `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs list`
2. Show the user the ideas (id, title, status). Ask them to pick **one** (if only one, confirm it).
3. Run `... irReport.mjs read <ideaId>`. Treat Process `label`/`note` and Image URLs as requirements. Ignore Update/Success history except as context.
4. Write an implementation plan to `docs/plans/YYYY-MM-DD-<slug>.md` using the writing-plans header (Goal / Architecture / Tech Stack / checkbox tasks). Slug = kebab-case from the idea title.
5. Write Current Work State via Node (do not invent a different shape):

```js
import { writeCurrent } from './src/lib/iloveskillState.js'
await writeCurrent({
  ideaId: '<id>',
  ideaTitle: '<title>',
  planPath: 'docs/plans/YYYY-MM-DD-<slug>.md',
})
```

Or equivalent: create `.iloveskill/current.json` with exactly `{ "ideaId", "ideaTitle", "planPath" }`.

6. Run:
   `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs set-status <ideaId> planned`

7. Tell the user: plan path + "Open Cursor and run /ilovetask".

## Standing rules
- Never deploy rules/functions/indexes/vercel prod — enqueue into `.iloveskill/pending-deploys.json` instead.
- Never modify `StartNode` or user Roadmap behavior.
- Use IR Board vocabulary from UBIQUITOUS_LANGUAGE.md.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/iloveplan/SKILL.md
git commit -m "feat(iloveskill): add /iloveplan skill"
```

---

### Task 10: `/ilovetask` Cursor command

**Files:**
- Create: `.cursor/commands/ilovetask.md`

**Interfaces:**
- Consumes: `.iloveskill/current.json` → `planPath`
- Produces: implementation commits as the plan requests (only when the user/plan says to commit)

- [ ] **Step 1: Write the command file**

```markdown
---
description: Implement the current IR Idea plan from .iloveskill/current.json
---

# /ilovetask

You are implementing one Idea from the IR Board.

1. Read `.iloveskill/current.json`. If missing, stop and tell the user to run `/iloveplan` in Claude Code first.
2. Read the file at `planPath`.
3. Follow that plan task-by-task (prefer superpowers:subagent-driven-development or executing-plans).
4. Do **not** deploy Firebase rules, functions, indexes, or `vercel --prod`. If a task needs a deploy, append the exact shell command as a new string in `.iloveskill/pending-deploys.json` under `commands` (create `{ "commands": [] }` if missing) and continue with code-only work.
5. Do not ask which idea to work on — trust Current Work State.
6. When the plan is fully implemented, stop and tell the user to run `/ilovework` in Claude Code.
```

- [ ] **Step 2: Commit**

```bash
git add .cursor/commands/ilovetask.md
git commit -m "feat(iloveskill): add /ilovetask Cursor command"
```

---

### Task 11: `/ilovework` Claude skill

**Files:**
- Create: `.claude/skills/ilovework/SKILL.md`

**Interfaces:**
- Consumes: `current.json`, `npm test`, optional `npm run test:rules`, git push main, `irReport append-*`
- Produces: Success Block + `done` + clear current **or** Update Block + `in-progress` (no push)

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: ilovework
description: Verify tests, push main on success, and report Update/Success Blocks onto the IR Board. Use when the user runs /ilovework after /ilovetask.
---

# /ilovework

## Preconditions
- `.iloveskill/current.json` exists.
- `serviceAccountKey.json` available for irReport (never paste into chat).

## Steps
1. Read `.iloveskill/current.json` → `{ ideaId, ideaTitle, planPath }`.
2. Run `npm test`. If `firestore.rules` / `storage.rules` / indexes changed in this worktree vs `main`, also run `npm run test:rules` (or `test:rules:emu`).
3. **If any test fails or work is blocked:**
   - Do **not** push.
   - Build a short summary: what landed locally + what is blocked.
   - Run:
     `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs append-update <ideaId> <summary>`
     (this also sets status `in-progress`)
   - Stop. Leave `current.json` in place.
4. **If all green:**
   - Commit any remaining uncommitted work only if the user already asked for commits during /ilovetask; otherwise commit with a clear message covering the idea title.
   - `git push origin main` (ADR: direct to main — no PR).
   - Run:
     `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs append-success <ideaId> <summary>`
   - Delete `.iloveskill/current.json` (or `clearCurrent()`).
   - Remind user: if `pending-deploys.json` has commands, run `/unlock-bkb`.

## Standing rules
- Never run deploy commands here — only enqueue.
- Never force-push.
- Never read serviceAccountKey contents into the transcript.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/ilovework/SKILL.md
git commit -m "feat(iloveskill): add /ilovework skill"
```

---

### Task 12: `/unlock-bkb` Claude skill

**Files:**
- Create: `.claude/skills/unlock-bkb/SKILL.md`

**Interfaces:**
- Consumes: `.iloveskill/pending-deploys.json` `{ commands: string[] }`
- Produces: runs each command in order, then `clearPending()`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: unlock-bkb
description: Run every queued permission-heavy deploy command from pending-deploys.json in one authorized batch, then clear the queue. Use when the user runs /unlock-bkb.
---

# /unlock-bkb

1. Read `.iloveskill/pending-deploys.json`. If missing or `commands` is empty, say so and stop.
2. Print the full queue to the user and ask for a single yes/no confirmation.
3. On yes: run each command **sequentially** in a shell from the repo root. Stop on first non-zero exit; leave remaining commands in the queue.
4. On full success: write `{ "commands": [] }` (or delete the file) and report what ran.
5. This is the **only** skill allowed to run firebase/vercel production deploys for the iloveskill series.
```

- [ ] **Step 2: Enqueue the rules deploy from Task 4 if not yet live**

If production rules still lack `isAnyAdmin`, append:

```json
{ "commands": ["firebase deploy --only firestore:rules"] }
```

to `.iloveskill/pending-deploys.json` locally (gitignored — do not commit).

- [ ] **Step 3: Commit skill only**

```bash
git add .claude/skills/unlock-bkb/SKILL.md
git commit -m "feat(iloveskill): add /unlock-bkb skill to drain pending deploys"
```

---

### Task 13: End-to-end verification checklist

**Files:** none new (verification only)

- [ ] **Step 1: Unit suite**

Run: `npm test`

Expected: all green including irBoard / nodes / session / iloveskillState / adminRulesSync

- [ ] **Step 2: Rules suite**

Run: `npm run test:rules:emu`

Expected: IR Board admin allow + non-admin deny PASS

- [ ] **Step 3: Seed + list**

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs ensure
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs list
```

- [ ] **Step 4: UI path**

Dev server → Admin → Idea-Request → create Idea with Process child → reload → still there (Firestore sync).

- [ ] **Step 5: Workflow dry-run (optional if key present)**

Create a throwaway Idea on the board → `/iloveplan` → confirm `docs/plans/...` + `current.json` + status `planned` → note `/ilovetask` prompt works → `/ilovework` with a deliberate failing test should append Update (skip push).

- [ ] **Step 6: Final commit only if verification fixed anything; otherwise done**

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| Reuse `roadmapSheets/admin-idea-board` | 1, 5, 8 |
| Idea = Idea Root + attached blocks | 2, 6 |
| Status `idea→planned→in-progress→done` | 1, 3, 8, 9, 11 |
| No Start block changes | Judgment + Task 3 (new types only) |
| Reuse Process + Image; add ideaRoot/update/success | 3, 6 |
| Admin tab for every `ADMIN_ROLES` email | 6 |
| Rules for any admin on fixed sheet | 4 |
| `irReport.mjs` CLI | 8 |
| `/iloveplan` → plan + current + planned | 9 |
| `/ilovetask` Cursor command | 10 |
| `/ilovework` test/push/report | 11 |
| `/unlock-bkb` + pending queue separate from current | 7, 12 |
| `.iloveskill/` gitignored | 7 |
| UBIQUITOUS_LANGUAGE / ADRs already exist | no rewrite needed |

## Placeholder scan

No TBD / "implement later" / "similar to Task N" left unresolved — Task 6 explicitly says copy change handlers from `RoadmapPage.jsx` (open that file at implement time for the exact lines).

## Type consistency

- Sheet id: always `admin-idea-board` / `IR_SHEET_ID`
- Report data: always `{ summary, timestamp }`
- Idea Root data: always `{ title, status }`
- Current Work State: always `{ ideaId, ideaTitle, planPath }`
- Pending queue: always `{ commands: string[] }`
- `append-update` → status `in-progress`; `append-success` → status `done`
