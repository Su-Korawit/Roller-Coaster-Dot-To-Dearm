# Roadmap Showcase (Text / Sticker / Annotation Line + Stage Timeline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Roadmap demo- and ad-ready per the wireframe toolbar (Text · Line · Sticker · +): free-placement text labels, a curated sticker picker (university logos + motivational emoji), dashed annotation edges, and a School → University stage band over the timeline.

**Architecture:** Zero new node types — the **Text tool** exposes the existing `stageLabel` node, the **Sticker tool** inserts the existing `image` node with a curated catalog URL, so the export schema needs no version bump. The **Line tool** adds an `annotation` **edge type** (dashed, non-snapping); the export schema passes an optional `type` field through on edges (additive to schema v1 — old files stay valid, old readers just drop the field). The **stage timeline** stores `timeline: { stages: [{ label, startMonth, endMonth }] }` on the sheet doc (additive) and renders as colored bands above `TimelineRuler`.

**Tech Stack:** React Flow (`@xyflow/react`), existing node components, `roadmapExport.js` (ADR-0001), Vitest + jsdom.

## Global Constraints

- **No TypeScript**; Thai student-facing copy; existing tokens.
- **ADR-0001 governs the file format**: any shape change must round-trip through `toSchema`/`fromSchema` with tests in `roadmapExport.test.js`. This plan adds ONE additive optional field (`edges[].type`) and does NOT bump the version.
- **ConditionNode rotation invariant** (CONTEXT.md): never rotate a node's root `<div>`.
- **React Flow style overrides need `!`-important classes**.
- **Grep-first integration**: RoadmapPage's toolbar/palette internals were not fully mapped when this plan was written. Before each RoadmapPage/palette edit, locate the anchor with the grep given in the step; if the structure differs, adapt the insertion to the real structure while keeping the specified component names, props, and aria-labels EXACTLY (tests depend on them).
- **Sticker assets**: university logos come from the existing `tcasLogoUrl(id)` CDN helper (`src/hooks/useMytcas.js`); no Storage uploads required for v1.

**Background:** PRD #36 Epic F (stories 32–35); master roadmap item 4. Also feeds Epic G: the sticker catalog is what premium sticker packs later extend.

---

### Task 1: Export schema — annotation edge passthrough

**Files:**
- Modify: `src/utils/roadmapExport.js`
- Modify: `src/utils/roadmapExport.test.js`

- [ ] **Step 1: Write the failing tests** — append to `roadmapExport.test.js`:

```js
describe('annotation edge type passthrough', () => {
  const EDGE = { id: 'a1', source: 'a', target: 'b', sourceHandle: null, targetHandle: null, type: 'annotation' }
  const NODES = [
    { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} },
    { id: 'b', type: 'process', position: { x: 100, y: 0 }, data: {} },
  ]

  it('round-trips an edge type through toSchema/fromSchema', () => {
    const out = fromSchema(JSON.parse(JSON.stringify(toSchema(NODES, [EDGE]))))
    expect(out.edges[0].type).toBe('annotation')
  })

  it('omits the type field entirely for plain edges (v1 files stay byte-stable)', () => {
    const plain = { id: 'e1', source: 'a', target: 'b', sourceHandle: null, targetHandle: null }
    const schema = toSchema(NODES, [plain])
    expect('type' in schema.edges[0]).toBe(false)
    expect(fromSchema(JSON.parse(JSON.stringify(schema))).edges[0].type).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify failure** — the round-trip case FAILS (type dropped).
- [ ] **Step 3: Implement** — in `roadmapExport.js`, in BOTH `toSchema`'s and `fromSchema`'s edge mappers, replace the object literal with a variant that conditionally carries `type`:

```js
    edges: schema.edges.map((e) => {
      const out = {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      }
      if (e.type != null) out.type = e.type
      return out
    }),
```

(same shape in `toSchema`, reading from the runtime edge). Update the file's header comment to note the additive optional `edges[].type`.

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/utils/roadmapExport.test.js` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/utils/roadmapExport.js src/utils/roadmapExport.test.js
git commit -m "feat(roadmap): additive annotation edge type in export schema v1"
```

---

### Task 2: `AnnotationEdge` component + registration

**Files:**
- Create: `src/components/roadmap/AnnotationEdge.jsx`
- Test: `src/components/roadmap/AnnotationEdge.test.jsx`
- Modify: `src/pages/RoadmapPage.jsx` (edgeTypes registration)

- [ ] **Step 1: Write the failing test**

```jsx
// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@xyflow/react', () => ({
  BaseEdge: (props) => <path data-testid="base-edge" {...props} />,
  getBezierPath: () => ['M0,0 L10,10', 5, 5],
}))

const { default: AnnotationEdge } = await import('./AnnotationEdge')

describe('AnnotationEdge', () => {
  it('renders a dashed bezier path', () => {
    const { getByTestId } = render(
      <svg><AnnotationEdge id="e1" sourceX={0} sourceY={0} targetX={10} targetY={10} /></svg>,
    )
    const edge = getByTestId('base-edge')
    expect(edge.getAttribute('path')).toBe('M0,0 L10,10')
    expect(edge.style.strokeDasharray).toBe('6 4')
  })
})
```

- [ ] **Step 2: Run to verify failure** — module not found.
- [ ] **Step 3: Implement**

```jsx
// src/components/roadmap/AnnotationEdge.jsx
// Dashed free-annotation connector (Line tool). Unlike default edges it never
// participates in snap logic — it is pure decoration between two blocks.
import { BaseEdge, getBezierPath } from '@xyflow/react'

export default function AnnotationEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  return (
    <BaseEdge
      id={id}
      path={path}
      style={{ strokeDasharray: '6 4', stroke: 'var(--color-brand-strong, #7c3aed)', strokeWidth: 2 }}
    />
  )
}
```

Register it: `grep -n "edgeTypes" src/pages/RoadmapPage.jsx` — add `annotation: AnnotationEdge` to the stable edgeTypes object (import the component). If no custom edgeTypes object exists yet, create one at module level (`const stableEdgeTypes = { annotation: AnnotationEdge }`) and pass `edgeTypes={stableEdgeTypes}` to `<ReactFlow>` — grep first; RoadmapPage already references `stableEdgeTypes` at the `<ReactFlow>` callsite, so extend whatever it points to.

- [ ] **Step 4: Run to verify pass** — component test PASS; `npx vitest run src/pages src/components/roadmap 2>/dev/null || npx vitest run src/components/roadmap` → no regressions.
- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/AnnotationEdge.jsx src/components/roadmap/AnnotationEdge.test.jsx src/pages/RoadmapPage.jsx
git commit -m "feat(roadmap): dashed AnnotationEdge type (Line tool)"
```

---

### Task 3: Sticker catalog + store action + picker sheet

**Files:**
- Create: `src/constants/stickerCatalog.js`
- Create: `src/components/roadmap/StickerPickerSheet.jsx`
- Test: `src/components/roadmap/StickerPickerSheet.test.jsx`
- Modify: `src/stores/useRoadmapStore.js` + `src/stores/useRoadmapStore.test.js`

**Interfaces:**
- `STICKER_CATALOG` — `[{ id, label, url, group: 'university' | 'motivation' }]`. University entries use `https://assets.mytcas.com/i/logo/{id}.png` (duplicate the URL pattern as a local constant — do not import the hook file into constants). Motivation entries use emoji rendered to data-URLs via a tiny `emojiDataUrl(emoji)` helper included in the same file (SVG `<text>` wrapped in `data:image/svg+xml;utf8,`).
- `useRoadmapStore.addSticker(url, position?)` → adds an `image` node (`type: 'image'`, `data: { url, offset: { x: 0, y: 0 } }`) via the same `applyToActive` + `setpoint` flow as `addNode`, returns the node id.
- `<StickerPickerSheet onPick={fn(url)} onClose={fn} />` — grouped grid; tapping a sticker calls `onPick(url)` then `onClose()`.

- [ ] **Step 1: Write the failing tests**

Append to `useRoadmapStore.test.js` (match its existing setup style — grep how other cases reset state):

```js
  it('addSticker adds an image node with the sticker url and sets the setpoint', () => {
    const id = useRoadmapStore.getState().addSticker('https://assets.mytcas.com/i/logo/001.png', { x: 50, y: 60 })
    const node = useRoadmapStore.getState().nodes.find((n) => n.id === id)
    expect(node).toMatchObject({
      type: 'image',
      position: { x: 50, y: 60 },
      data: { url: 'https://assets.mytcas.com/i/logo/001.png', offset: { x: 0, y: 0 } },
    })
    expect(useRoadmapStore.getState().setpoint).toBe(id)
  })
```

Create `StickerPickerSheet.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
vi.mock('../ui/Popup', () => ({ default: ({ children }) => <div>{children}</div> }))
const { default: StickerPickerSheet } = await import('./StickerPickerSheet')
const { STICKER_CATALOG } = await import('../../constants/stickerCatalog')

describe('StickerPickerSheet', () => {
  it('lists both groups and picks a sticker', () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<StickerPickerSheet onPick={onPick} onClose={onClose} />)
    const first = STICKER_CATALOG[0]
    fireEvent.click(screen.getByLabelText(first.label))
    expect(onPick).toHaveBeenCalledWith(first.url)
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**

`src/constants/stickerCatalog.js`:

```js
// Curated Roadmap sticker catalog. University logos ride the MyTCAS CDN;
// motivation stickers are emoji baked into SVG data-URLs (offline-safe).
// Premium packs (Epic G) extend this list behind entitlements later.
const LOGO_BASE = 'https://assets.mytcas.com/i/logo'

export function emojiDataUrl(emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><text x="50%" y="50%" font-size="72" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const STICKER_CATALOG = [
  { id: 'uni-001', label: 'จุฬาลงกรณ์มหาวิทยาลัย', url: `${LOGO_BASE}/001.png`, group: 'university' },
  { id: 'uni-002', label: 'มหาวิทยาลัยเกษตรศาสตร์', url: `${LOGO_BASE}/002.png`, group: 'university' },
  { id: 'uni-003', label: 'มหาวิทยาลัยขอนแก่น', url: `${LOGO_BASE}/003.png`, group: 'university' },
  { id: 'uni-004', label: 'มหาวิทยาลัยเชียงใหม่', url: `${LOGO_BASE}/004.png`, group: 'university' },
  { id: 'uni-005', label: 'มหาวิทยาลัยธรรมศาสตร์', url: `${LOGO_BASE}/005.png`, group: 'university' },
  { id: 'uni-006', label: 'มหาวิทยาลัยมหิดล', url: `${LOGO_BASE}/006.png`, group: 'university' },
  { id: 'mot-fire', label: 'ไฟลุก', url: emojiDataUrl('🔥'), group: 'motivation' },
  { id: 'mot-star', label: 'ดาว', url: emojiDataUrl('⭐'), group: 'motivation' },
  { id: 'mot-target', label: 'เป้าหมาย', url: emojiDataUrl('🎯'), group: 'motivation' },
  { id: 'mot-trophy', label: 'ถ้วยรางวัล', url: emojiDataUrl('🏆'), group: 'motivation' },
  { id: 'mot-rocket', label: 'จรวด', url: emojiDataUrl('🚀'), group: 'motivation' },
  { id: 'mot-books', label: 'หนังสือ', url: emojiDataUrl('📚'), group: 'motivation' },
]
```

`useRoadmapStore.addSticker` (place next to `addNode`, reusing its `applyToActive` idiom):

```js
      addSticker: (url, position = { x: 120, y: 120 }) => {
        const id = nextId()
        let result
        set((state) => {
          result = applyToActive(state, {
            nodes: [...state.nodes, { id, type: 'image', position, data: { url, offset: { x: 0, y: 0 } } }],
          })
          return { setpoint: id, ...result }
        })
        return id
      },
```

`StickerPickerSheet.jsx`:

```jsx
import Popup from '../ui/Popup'
import { STICKER_CATALOG } from '../../constants/stickerCatalog'

const GROUPS = [
  { key: 'university', label: 'มหาวิทยาลัย' },
  { key: 'motivation', label: 'กำลังใจ' },
]

export default function StickerPickerSheet({ onPick, onClose }) {
  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div className="px-5 pb-6 overflow-y-auto">
        <p className="pixel-font text-[10px] text-center text-ink mb-3">Sticker</p>
        {GROUPS.map((g) => (
          <div key={g.key} className="mb-4">
            <p className="thai-font text-[11px] text-ink-soft mb-2">{g.label}</p>
            <div className="grid grid-cols-4 gap-3">
              {STICKER_CATALOG.filter((s) => s.group === g.key).map((s) => (
                <button
                  key={s.id}
                  aria-label={s.label}
                  onClick={() => { onPick(s.url); onClose() }}
                  className="neo-card p-2 flex items-center justify-center aspect-square active:scale-95"
                >
                  <img src={s.url} alt="" className="max-w-full max-h-full object-contain" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Popup>
  )
}
```

- [ ] **Step 4: Run to verify pass** — both suites PASS.
- [ ] **Step 5: Commit**

```bash
git add src/constants/stickerCatalog.js src/components/roadmap/StickerPickerSheet.jsx src/components/roadmap/StickerPickerSheet.test.jsx src/stores/useRoadmapStore.js src/stores/useRoadmapStore.test.js
git commit -m "feat(roadmap): sticker catalog, addSticker action, picker sheet"
```

---

### Task 4: Toolbar — Text / Line / Sticker per the wireframe

**Files:**
- Modify: `src/pages/RoadmapPage.jsx`

- [ ] **Step 1: Locate the add-palette** — `grep -n "addNode\|palette\|Palette" src/pages/RoadmapPage.jsx` and open the surrounding JSX. The wireframe's bottom toolbar is Text · Line · Sticker · +.
- [ ] **Step 2: Wire the three tools** (adapting to the real palette structure, keeping these exact behaviors):
  - **Text** (`aria-label="เพิ่มข้อความ"`): calls `addNode('stageLabel', ...)` — if `stageLabel` already sits in the palette, just relabel/expose it as the Text tool.
  - **Sticker** (`aria-label="เพิ่มสติกเกอร์"`): opens `StickerPickerSheet`; `onPick={(url) => addSticker(url)}` (add local `const [showStickers, setShowStickers] = useState(false)` + render the sheet).
  - **Line** (`aria-label="โหมดเส้น"`): toggles a local `lineMode` boolean styled active; while on, `onConnect` creates the edge with `type: 'annotation'` and **skips the snap logic** — in the store's `connect` action path this means calling `setEdges([...edges, { ...connection, id: nextId-style, type: 'annotation' }])` from the page (or add a small `connectAnnotation(connection)` store action mirroring `connect` minus `computeSnapPosition`, if the page-level approach fights React Flow's controlled flow — implementer's choice, tests below pin the store behavior if you add the action).
- [ ] **Step 3: Manual verify** — `npm run dev` → Roadmap: Text drops an editable label; Sticker opens the picker and drops the image node; Line mode connects two blocks with a dashed line that does NOT snap-move the target; export the board → the JSON carries `"type": "annotation"` on that edge; re-import → dashed line survives.
- [ ] **Step 4: Run** `npx vitest run src/components/roadmap src/stores/useRoadmapStore.test.js src/utils/roadmapExport.test.js` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/pages/RoadmapPage.jsx
git commit -m "feat(roadmap): Text / Line / Sticker toolbar per wireframe"
```

---

### Task 5: Stage timeline bands (School → University)

**Files:**
- Create: `src/components/roadmap/StageBands.jsx`
- Test: `src/components/roadmap/StageBands.test.jsx`
- Modify: `src/pages/RoadmapPage.jsx`, `src/stores/useRoadmapStore.js`

**Interfaces:**
- Sheet doc gains optional `timeline: { stages: [{ label, startMonth, endMonth }] }` (months 1–12; additive field — `hydrateSheets`/`toDoc` in `syncManager.js`'s `roadmapSheetSync` must pass it through: add `timeline: sheet?.timeline ?? state.timeline ?? null` to `toDoc` and mirror it in the store's sheet objects — grep `roadmapSheetSync` and extend `toDoc` plus the store's `hydrateSheets` mapping).
- `DEFAULT_STAGES = [{ label: 'School', startMonth: 1, endMonth: 5 }, { label: 'University', startMonth: 6, endMonth: 12 }]`.
- `<StageBands stages={stages} />` — a pointer-events-none bar above the ruler: each stage a colored band with its label, width proportional to its month span (`(endMonth - startMonth + 1) / 12`). Double-click a label (`aria-label={'แก้ชื่อช่วง ' + stage.label}`) prompts (`window.prompt`) to rename → `onRename(index, newLabel)`.

- [ ] **Step 1: Write the failing test**

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
const { default: StageBands, DEFAULT_STAGES } = await import('./StageBands')

describe('StageBands', () => {
  it('renders a band per stage with proportional width', () => {
    render(<StageBands stages={DEFAULT_STAGES} onRename={vi.fn()} />)
    const school = screen.getByText('School').closest('[data-testid="stage-band"]')
    expect(school.style.width).toBe(`${(5 / 12) * 100}%`)
    expect(screen.getByText('University')).toBeTruthy()
  })

  it('renaming via double-click calls onRename', () => {
    const onRename = vi.fn()
    vi.spyOn(window, 'prompt').mockReturnValue('มัธยม')
    render(<StageBands stages={DEFAULT_STAGES} onRename={onRename} />)
    fireEvent.doubleClick(screen.getByLabelText('แก้ชื่อช่วง School'))
    expect(onRename).toHaveBeenCalledWith(0, 'มัธยม')
  })
})
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**

```jsx
// src/components/roadmap/StageBands.jsx
export const DEFAULT_STAGES = [
  { label: 'School', startMonth: 1, endMonth: 5 },
  { label: 'University', startMonth: 6, endMonth: 12 },
]

const BAND_COLORS = ['bg-good/30', 'bg-accent-pink/20', 'bg-brand-soft']

export default function StageBands({ stages, onRename }) {
  return (
    <div className="flex w-full h-6 border-b-2 border-ink/20 select-none">
      {stages.map((stage, i) => (
        <div
          key={`${stage.label}-${i}`}
          data-testid="stage-band"
          style={{ width: `${((stage.endMonth - stage.startMonth + 1) / 12) * 100}%` }}
          className={`flex items-center justify-center border-r border-ink/10 ${BAND_COLORS[i % BAND_COLORS.length]}`}
        >
          <button
            aria-label={`แก้ชื่อช่วง ${stage.label}`}
            onDoubleClick={() => {
              const name = window.prompt('ชื่อช่วง', stage.label)
              if (name && name.trim()) onRename(i, name.trim())
            }}
            className="pixel-font text-[8px] text-ink truncate px-1"
          >
            {stage.label}
          </button>
        </div>
      ))}
    </div>
  )
}
```

Store: add `timeline: null` to sheet objects in `hydrateSheets`/`createSheet`, plus an action `renameStage(index, label)` updating the active sheet's `timeline.stages` (initializing from `DEFAULT_STAGES` on first rename); extend `roadmapSheetSync.toDoc` in `syncManager.js` to persist `timeline`. RoadmapPage: render `<StageBands stages={activeSheetTimelineOrDefault} onRename={renameStage} />` directly above the `TimelineRuler` (grep `TimelineRuler` for the anchor).

- [ ] **Step 4: Run** component + store + full roadmap suites → PASS. Manual: bands render above the ruler, rename persists across reload (after debounce).
- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/StageBands.jsx src/components/roadmap/StageBands.test.jsx src/pages/RoadmapPage.jsx src/stores/useRoadmapStore.js src/lib/syncManager.js
git commit -m "feat(roadmap): School→University stage bands over the timeline"
```

---

### Task 6: WelcomePage showcase + verification

**Files:**
- Modify: `src/pages/WelcomePage.jsx` (or its section components — grep first)

- [ ] **Step 1:** `grep -n "section\|Section" src/pages/WelcomePage.jsx | head -20` — find where feature sections render; add a "จุดเด่น" trio block (Roadmap · Gamification · School System) using the existing section styling: three `neo-card`s with a pixel-font heading, one-line Thai description each (Roadmap: "วางแผนเส้นทางสู่มหาลัยแบบเห็นภาพ ลากวาง ตกแต่งได้"; Gamification: "ทำการบ้านได้เหรียญ สะสมสตรีค เลี้ยงฟาร์มของตัวเอง"; School System: "ตารางเรียน การบ้าน โน้ตประจำวัน ครบในที่เดียว"). Reuse whatever image/screenshot slot pattern neighboring sections use; if none fits, text-only cards are fine for v1.
- [ ] **Step 2:** `npm test` + `npm run lint` (touched files clean; isolate-re-run unrelated flakes).
- [ ] **Step 3:** In `CONTEXT.md`, extend the **Roadmap export schema** vocabulary row: append `; edges may carry an optional additive `type` (`annotation` = dashed free connector)` — and add a **Sticker** row: `| **Sticker** | A curated image node inserted from `STICKER_CATALOG` (university logos via MyTCAS CDN + emoji SVG data-URLs). Premium packs extend the catalog (Epic G) |`.
- [ ] **Step 4: Commit**

```bash
git add src/pages/WelcomePage.jsx CONTEXT.md
git commit -m "feat(welcome): showcase Roadmap, gamification, and School System"
```

---

## Out of Scope

- Premium sticker packs / entitlement gating (Epic G — the catalog is deliberately a plain constant it can wrap).
- Free-drawn (hand-drawn path) lines; the Line tool connects existing blocks only.
- Month tick marks inside stage bands; per-stage month editing UI (labels only for v1).
- Custom sticker uploads (ImagePickerModal already covers arbitrary images).

---

## Cursor Prompt (single conversation, pre-authorized)

> Read `docs/superpowers/plans/2026-07-09-roadmap-showcase.md` and execute **ALL tasks (1–6) in order**, exactly as written, TDD, committing after each task with the exact messages given. The owner has pre-authorized every command — run directly; only stop on errors. This plan uses **grep-first anchors** for RoadmapPage/WelcomePage edits: run the greps, adapt insertions to the real structure, but keep component names, props, and aria-labels EXACTLY as specified (tests depend on them). Respect the ConditionNode rotation invariant and ADR-0001 (schema changes only as specified in Task 1). Do the manual verifications in Tasks 4–5 and report what you saw. Then run the full `npm test` suite and report final counts verbatim.
