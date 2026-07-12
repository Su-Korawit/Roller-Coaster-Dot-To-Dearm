# Roadmap (File blocks · connect-point glow · marquee fix · paste image · IR palette drag) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Idea:** `node-6-1783857619979` — Process "Roadmap" on the IR Board.

**Requirements (from the Idea's Process notes, translated):**
1. **Roadmap** — add a File-upload block beyond images and videos: `.md`, `.pdf`, `.docx`, etc.
2. **Open file** — a PDF file can be opened and read in-app.
3. **Download file** — when a file is opened for viewing there is a Download button.
4. **Bug** — Shift-drag marquee does not select "only what the mouse covers" — it selects more. Fix so only the covered blocks are selected.
5. **Connect Point** — the four dots must be clearly separated per-dot, and the focus colour must light **only the dot being connected** (reference image: today all four dots glow green at once).
6. **เพิ่ม Feature Image Block** — an image can be placed straight into the block (paste / drop a file), without going through the picker.
7. **เพิ่ม Tool Block** — the IR Board's admin palette buttons become draggable-to-place, like the user Roadmap's toolbar (reference image: the `+ Idea Root / + Process / + Image / + Update / + Success` strip).

**Interpretation (verified against the code):**
- (5) Root cause found: `ConnectionDot.jsx` calls `useNodeConnections({ handleType, handleId: id ?? null })`, but the Left (target) and Right (source) dots of `ProcessNode`/`ConditionNode`/`IdeaRootNode`/`UpdateNode`/`SuccessNode` render **without an `id`**. With no `handleId`, the hook returns *every* connection of that role on the node, so those dots glow whenever *any* dot is wired. Fix inside `ConnectionDot` by filtering the node's connections down to this exact handle (null-safe) — **do not** rename handle ids; saved edges carry `sourceHandle: null` and `findProximityConnection.getHandles` emits `id: null` for those dots, so id changes would orphan existing boards. "Focus only the dot being connected" additionally means: while a connection drag is in progress, highlight only the origin dot (via `useConnection`).
- (4) Root cause hypothesis (verify by reproduction first): `RoadmapPage.jsx` passes `multiSelectionKeyCode="Shift"` while React Flow's default `selectionKeyCode` is also `Shift`. Holding Shift to draw the marquee therefore *also* activates multi-select mode, so each marquee **adds to** the previous selection instead of replacing it — the user sees blocks selected that the rectangle never covered. Fix: stop binding multi-select to Shift (leave the library default Ctrl/Cmd), keeping Shift purely as the marquee key.
- (1–3) Model the File block on the existing Video block (`VideoNode` + `VideoPickerModal`: one file per block, picker-on-empty). **Storage rules gap:** `storage.rules` only covers `users/{uid}/roadmap/{imageId}` — the `users/{uid}/roadmap-video/` prefix that `VideoPickerModal` already uses has **no rule** (pre-existing bug), and the new `users/{uid}/roadmap-file/` prefix needs one too. Rules change ⇒ **enqueue** `firebase deploy --only storage` into the Pending Deploy Queue (never deploy directly); until `/unlock-bkb` runs, file/video upload fails against production rules.
- (6) "Place straight into the block": drop an image file onto an Image block, or press Ctrl/Cmd+V with an Image block selected — the file uploads to the existing `users/{uid}/roadmap/` prefix and appends to the album, same as the picker's Upload button.
- (7) The user Roadmap already has the full drag pattern (`draggable` + `application/roadmap-node-type` dataTransfer + `computeDropPosition` + `useLongPressDrag` for touch). Reuse it verbatim on `IdeaRequestSection.jsx`; click-to-add stays.

**Goal:** File blocks (upload/open/download) on the Roadmap, correct per-dot connect-point glow with drag focus, marquee selection that matches the drawn rectangle, direct image paste/drop into Image blocks, and a draggable IR Board palette.

**Architecture:** All block work follows the established React Flow node pattern: one component per node type registered once in `nodeTypes.js`, per-type default `data` in `useRoadmapStore.addNode`, size in `BLOCK_SIZES`, dots in `findProximityConnection.getHandles`. Uploads go through `utils/storageOps.uploadAsset` under per-user Storage prefixes; Firestore persistence rides the existing debounced roadmap sync (no new writes). The export schema (v1) copies `type` + `data` generically, so the new `file` type round-trips with no schema change.

**Tech Stack:** React 19 + JSX (no TypeScript), `@xyflow/react` 12, Zustand, Tailwind v4 tokens, Firebase Storage, Vitest + @testing-library/react (jsdom), `@firebase/rules-unit-testing` for storage rules.

## Global Constraints

- **No TypeScript** — plain JS/JSX only.
- **Tailwind v4** — reuse existing token classes (`bg-surface`, `border-ink`, `text-ink-soft`, `pixel-font`, `shadow-hard-sm`, `neo-btn`); no config files.
- **Never touch `StartNode.jsx`** and never change its behaviour (UBIQUITOUS_LANGUAGE.md flagged constraint).
- **React Flow handles** — never rotate/transform a node's root `<div>`; React Flow computes handle offsets from it.
- **Firestore writes stay debounced** via the existing store→syncManager pipe; add no direct writes.
- **Never deploy** rules/functions/vercel — append the command to `.iloveskill/pending-deploys.json` instead.
- **Do not rename existing handle ids or edge `sourceHandle`/`targetHandle` values** — saved boards depend on them (`null` for left/right dots on process-family blocks).
- Commit after every task (logical stages, not one big commit at the end).

---

### Task 1: Storage rules for `roadmap-file/` (+ missing `roadmap-video/`)

**Files:**
- Modify: `storage.rules` (after the `users/{uid}/roadmap/{imageId}` match block)
- Test: `test/rules/storage.rules.test.js` (extend the `owner-scoped paths` describe)
- Modify: `.iloveskill/pending-deploys.json`

**Interfaces:**
- Produces: Storage write access to `users/{uid}/roadmap-file/{fileId}` and `users/{uid}/roadmap-video/{videoId}` for the owning user — Task 4's `FilePickerModal` uploads there.

- [ ] **Step 1: Write the failing rules tests**

In `test/rules/storage.rules.test.js`, inside `describe('owner-scoped paths', …)` after the existing roadmap-image test:

```js
  it('owner writes their own roadmap-file; a stranger cannot', async () => {
    await assertSucceeds(uploadBytes(ref(ctx('alice'), 'users/alice/roadmap-file/n1-doc.pdf'), PNG, META))
    await assertFails(uploadBytes(ref(ctx('bob'), 'users/alice/roadmap-file/n2-doc.pdf'), PNG, META))
  })

  it('owner writes their own roadmap-video; a stranger cannot', async () => {
    await assertSucceeds(uploadBytes(ref(ctx('alice'), 'users/alice/roadmap-video/n1'), PNG, META))
    await assertFails(uploadBytes(ref(ctx('bob'), 'users/alice/roadmap-video/n2'), PNG, META))
  })
```

- [ ] **Step 2: Run rules tests to verify they fail**

Run: `npm run test:rules`
Expected: the two new tests FAIL (`assertSucceeds` rejects — no matching rule ⇒ write denied). Requires the emulator the script already starts; if the suite can't run locally, note it and continue — Step 3's rule text is exact.

- [ ] **Step 3: Add the rules**

In `storage.rules`, directly below the `match /users/{uid}/roadmap/{imageId}` block:

```
    // Roadmap Video blocks — same owner-write/authed-read contract as images.
    // Prefix was already used by VideoPickerModal but had no rule (uploads 403'd).
    match /users/{uid}/roadmap-video/{videoId} {
      allow write: if request.auth != null && request.auth.uid == uid;
      allow read:  if request.auth != null;
    }

    // Roadmap File blocks (.pdf/.md/.docx/…) — users/{uid}/roadmap-file/{fileId}.
    match /users/{uid}/roadmap-file/{fileId} {
      allow write: if request.auth != null && request.auth.uid == uid;
      allow read:  if request.auth != null;
    }
```

- [ ] **Step 4: Run rules tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS (all storage rules tests green).

- [ ] **Step 5: Enqueue the deploy (never deploy directly)**

Edit `.iloveskill/pending-deploys.json` so `commands` contains (keep any existing entries):

```json
{
  "commands": [
    "firebase deploy --only storage"
  ]
}
```

- [ ] **Step 6: Commit**

```bash
git add storage.rules test/rules/storage.rules.test.js
git commit -m "fix(storage-rules): owner-write rules for roadmap-file/ and missing roadmap-video/ prefixes"
```

(`.iloveskill/` is gitignored — do not commit it.)

---

### Task 2: Per-dot connect-point glow + connecting-focus highlight

**Files:**
- Modify: `src/components/roadmap/ConnectionDot.jsx`
- Test: `src/components/roadmap/ConnectionDot.test.jsx`

**Interfaces:**
- Consumes: `useNodeConnections`, `useConnection`, `useNodeId` from `@xyflow/react`.
- Produces: unchanged component API `<ConnectionDot type position id? />` — every node keeps rendering it exactly as today (no call-site churn, no handle-id changes).

- [ ] **Step 1: Write the failing tests**

Extend `src/components/roadmap/ConnectionDot.test.jsx` (follow the file's existing render harness — it already mounts dots inside a `ReactFlow` with seeded nodes/edges; reuse that helper). New cases:

```jsx
it('does NOT glow an id-less dot when the connection is via a different handle', () => {
  // node A ProcessNode-style: left target (no id), right source (no id), top/bottom sources
  // edge: { source: 'a', sourceHandle: 'top', target: 'b', targetHandle: null }
  // expect: the RIGHT (id-less source) dot of node a has !bg-gray-300, only the TOP dot glows
})

it('glows the id-less dot when the connection really uses it', () => {
  // edge: { source: 'a', sourceHandle: null, target: 'b', targetHandle: null }
  // expect: right dot of a glows green; top/bottom dots stay grey
})

it('focus-highlights only the origin dot during an in-progress connection drag', () => {
  // start a connection from a's top handle (fireEvent.mouseDown on that Handle),
  // expect: top dot carries the connecting style (ring/brand), right dot does not
})
```

Write them as real tests with the harness's node/edge fixtures — the comments above are the scenario spec, not placeholders to leave in.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/components/roadmap/ConnectionDot.test.jsx`
Expected: FAIL — today the id-less dot glows for the `sourceHandle: 'top'` edge, and no connecting style exists.

- [ ] **Step 3: Implement**

Replace `src/components/roadmap/ConnectionDot.jsx` with:

```jsx
import { Handle, useConnection, useNodeConnections, useNodeId } from '@xyflow/react'

// A connection dot wrapping a React Flow handle. Colour derives from THIS
// handle's live state: grey when free, green when an edge really terminates at
// this exact dot, brand-ring while a connection drag starts from it. Several
// dots on one block legitimately have no id (legacy boards store
// sourceHandle/targetHandle as null), so matching must be null-safe and
// role-aware rather than relying on unique handle ids.
export default function ConnectionDot({ type, position, id }) {
  const nodeId = useNodeId()
  const handleId = id ?? null

  // useNodeConnections without handleId returns every connection where this
  // node plays that role; narrow to the edges that terminate at THIS dot.
  const asSource = useNodeConnections({ handleType: 'source' })
    .filter((c) => c.source === nodeId && (c.sourceHandle ?? null) === handleId)
  const asTarget = useNodeConnections({ handleType: 'target' })
    .filter((c) => c.target === nodeId && (c.targetHandle ?? null) === handleId)
  const connected = asSource.length > 0 || asTarget.length > 0

  // True only while the user is dragging a new connection out of this dot.
  const connecting = useConnection((conn) =>
    conn.inProgress &&
    conn.fromNode?.id === nodeId &&
    (conn.fromHandle?.id ?? null) === handleId,
  )

  const tone = connecting
    ? '!bg-brand ring-2 ring-brand/40 shadow-[0_0_8px_2px_rgba(59,130,246,0.6)]'
    : connected
      ? '!bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]'
      : '!bg-gray-300'

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={`!w-3 !h-3 !border-white !border-2 ${tone}`}
    />
  )
}
```

(If the repo's brand token resolves to a different rgb, adjust the shadow literal to match `--color-brand` in `src/index.css`.)

- [ ] **Step 4: Run the dot tests, then the node suites that render dots**

Run: `npx vitest run src/components/roadmap/ConnectionDot.test.jsx src/components/roadmap/ProcessNode.test.jsx src/components/roadmap/ImageNode.test.jsx src/components/roadmap/IdeaRootNode.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/ConnectionDot.jsx src/components/roadmap/ConnectionDot.test.jsx
git commit -m "fix(roadmap): glow only the exact connected dot; brand focus on the dot being dragged"
```

---

### Task 3: Shift-drag marquee selects only what it covers

**Files:**
- Modify: `src/pages/RoadmapPage.jsx:309` (the `multiSelectionKeyCode="Shift"` prop)

**Interfaces:**
- Consumes: nothing new. Produces: no API change — behaviour only.

- [ ] **Step 1: Reproduce first (systematic debugging — do not skip)**

Run: `npm run dev` → open `http://localhost:5173`, sign in, open the Roadmap, add 4+ blocks spread apart. Shift-drag a marquee over blocks A+B, release, then shift-drag over C only.
Expected bug: A+B are *still selected* alongside C (SelectionActionBar count = 3) — the marquee accumulates because Shift is simultaneously the marquee key (`selectionKeyCode` default) and the multi-select key (explicit prop). If the observed behaviour differs from this, stop and re-diagnose before changing anything.

- [ ] **Step 2: Fix**

In `src/pages/RoadmapPage.jsx` delete the line:

```jsx
          multiSelectionKeyCode="Shift"
```

(React Flow's default multi-select key reverts to Ctrl/Cmd-click; Shift remains the marquee key, and each marquee now **replaces** the selection.)

- [ ] **Step 3: Verify manually**

Repeat Step 1's steps. Expected: second marquee selects only C (count = 1). Ctrl/Cmd-click still adds single blocks to the selection. Mobile select-mode toggle still multi-selects by tap. (jsdom cannot express marquee geometry, so this task is manual-QA only — run the existing page-level suites to guard against regressions.)

Run: `npx vitest run src/stores/useRoadmapStore.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/RoadmapPage.jsx
git commit -m "fix(roadmap): shift-marquee replaces selection instead of accumulating (unbind multi-select from Shift)"
```

---

### Task 4: File block — `FileNode` + `FilePickerModal` + registration

**Files:**
- Create: `src/components/roadmap/FileNode.jsx`
- Create: `src/components/roadmap/FilePickerModal.jsx`
- Create: `src/components/roadmap/FileNode.test.jsx`
- Modify: `src/components/roadmap/nodeTypes.js` (register `file`)
- Modify: `src/stores/useRoadmapStore.js:183-192` (`addNode` default data)
- Modify: `src/utils/computeSnapPosition.js` (`BLOCK_SIZES.file`)
- Modify: `src/utils/findProximityConnection.js` (`getHandles` case `'file'`)
- Modify: `src/pages/RoadmapPage.jsx` (palette button "File" next to Video)

**Interfaces:**
- Consumes: `uploadAsset(path, file, { contentType })` and `listFlat(path)` from `src/utils/storageOps.js`; Storage prefix `users/{uid}/roadmap-file/` (Task 1).
- Produces: node type `'file'` with `data = { url: '', name: '' }` (name keeps the original filename incl. extension — the viewer and download derive everything from it). `FileViewerModal` (Task 5) consumes `{ url, name }`.

- [ ] **Step 1: Write the failing component tests**

`src/components/roadmap/FileNode.test.jsx`, modeled line-for-line on `VideoNode.test.jsx`'s harness (same ReactFlow wrapper/mocks):

```jsx
it('renders the empty state with a choose prompt', () => {
  // render FileNode with data { url: '', name: '' } → expect 'tap to choose'
})

it('shows the file name and extension badge when a file is set', () => {
  // data { url: 'https://x/f', name: 'answer-key.pdf' }
  // expect text 'answer-key.pdf' and badge 'PDF'
})

it('opens the picker when the empty block is clicked', () => {
  // click the block body → ImagePickerModal-style modal appears (mock FilePickerModal or assert dialog text 'Choose file')
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/roadmap/FileNode.test.jsx`
Expected: FAIL (`FileNode` module not found).

- [ ] **Step 3: Implement `FileNode.jsx`**

```jsx
import { useState } from 'react'
import { Position } from '@xyflow/react'
import { FileText, Pencil, Maximize2 } from 'lucide-react'
import FilePickerModal from './FilePickerModal'
import FileViewerModal from './FileViewerModal'
import ConnectionDot from './ConnectionDot'

const SIDES = [Position.Top, Position.Bottom, Position.Left, Position.Right]

// Extension badge, e.g. 'answer-key.pdf' -> 'PDF'. Files with no dot get 'FILE'.
export function fileExt(name) {
  const i = (name ?? '').lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toUpperCase() : 'FILE'
}

// Modeled on VideoNode.jsx: one file per block, picker-on-empty, portal
// modals. The block never embeds the document — it shows name + type and
// opens FileViewerModal for reading/downloading.
export default function FileNode({ id, data, selected }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const hasFile = Boolean(data?.url)

  return (
    <div className="relative w-32 h-32">
      <div
        className={`w-full h-full rounded-xl border-2 bg-surface overflow-hidden flex flex-col items-center justify-center gap-1 p-2 transition-all cursor-pointer ${
          selected ? 'border-ink shadow-hard-sm' : 'border-ink/30 shadow-none'
        }`}
        onClick={() => (hasFile ? setViewerOpen(true) : setPickerOpen(true))}
        role="button"
        aria-label={hasFile ? 'เปิดไฟล์' : 'Choose file'}
      >
        <FileText size={28} strokeWidth={1.5} className={hasFile ? 'text-brand' : 'text-brand/50'} />
        {hasFile ? (
          <>
            <span className="pixel-font text-[9px] text-ink text-center break-all leading-tight line-clamp-2">{data.name}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-brand/10 border border-brand/30 pixel-font text-[8px] text-brand">{fileExt(data.name)}</span>
          </>
        ) : (
          <span className="pixel-font text-[10px] text-ink-soft">tap to choose</span>
        )}
      </div>

      {hasFile && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setPickerOpen(true) }}
          aria-label="เปลี่ยนไฟล์"
          className="nodrag absolute top-1 right-1 w-6 h-6 rounded-lg bg-surface border-2 border-ink flex items-center justify-center text-ink-soft hover:text-brand"
        >
          <Pencil size={13} />
        </button>
      )}

      {hasFile && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setViewerOpen(true) }}
          aria-label="เปิดไฟล์"
          className="nodrag absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-surface border-2 border-ink flex items-center justify-center text-ink-soft hover:text-brand"
        >
          <Maximize2 size={13} />
        </button>
      )}

      {SIDES.map((pos) => (
        <ConnectionDot key={pos} id={pos} type="source" position={pos} />
      ))}

      {pickerOpen && <FilePickerModal nodeId={id} onClose={() => setPickerOpen(false)} />}
      {viewerOpen && <FileViewerModal url={data.url} name={data.name} onClose={() => setViewerOpen(false)} />}
    </div>
  )
}
```

(Task 5 creates `FileViewerModal`; until then stub it in this commit as a minimal portal that renders nothing but the download link, or land Tasks 4+5 together if the reviewer prefers — the test file for Task 4 must not depend on viewer internals.)

- [ ] **Step 4: Implement `FilePickerModal.jsx`**

Copy `VideoPickerModal.jsx`'s structure exactly, with these deltas:

```jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDownloadURL } from 'firebase/storage'
import { X, Upload, Loader, FileText } from 'lucide-react'
import { listFlat, uploadAsset } from '../../utils/storageOps'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

const ACCEPT = '.pdf,.md,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx'

// Strips the `${nodeId}-${timestamp}-` upload prefix back off a Storage
// object name so the picker lists human filenames. Names uploaded elsewhere
// (no prefix) pass through unchanged.
export function displayName(objectName) {
  const m = /^node-[^-]*-\d+-\d+-(.+)$/.exec(objectName)
  return m ? m[1] : objectName
}

export default function FilePickerModal({ nodeId, onClose }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const [uploads, setUploads] = useState([]) // [{ url, name }]
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!uid) return
    let alive = true
    listFlat(`users/${uid}/roadmap-file/`)
      .then((entries) => Promise.all(entries.map(async ({ ref }) => ({
        url: await getDownloadURL(ref),
        name: displayName(ref.name),
      }))))
      .then((files) => { if (alive) setUploads(files) })
      .catch(() => { if (alive) setUploads([]) })
    return () => { alive = false }
  }, [uid])

  const pick = useCallback((file) => {
    updateNodeData(nodeId, { url: file.url, name: file.name })
    onClose()
  }, [nodeId, updateNodeData, onClose])

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    setUploading(true)
    try {
      const url = await uploadAsset(
        `users/${uid}/roadmap-file/${nodeId}-${Date.now()}-${file.name}`,
        file,
        { contentType: file.type || 'application/octet-stream' },
      )
      updateNodeData(nodeId, { url, name: file.name })
      onClose()
    } catch {
      setUploading(false)
      e.target.value = ''
    }
  }, [uid, nodeId, updateNodeData, onClose])

  // JSX: same shell as VideoPickerModal ('Choose file' header, 'My uploads'
  // section, dashed Upload-new button, hidden <input type="file" accept={ACCEPT}>).
  // Each upload renders as a row button: <FileText size={14}/> + name text
  // (pixel-font text-[10px]) instead of a video thumbnail.
}
```

Fill the JSX in full by transcribing `VideoPickerModal.jsx:52-90` with the row-button swap described in the comment — same portal, same close semantics.

- [ ] **Step 5: Register the type everywhere**

`src/components/roadmap/nodeTypes.js` — add `import FileNode from './FileNode'` and `file: FileNode,` to the map.

`src/stores/useRoadmapStore.js` `addNode` — add a branch:

```js
            : type === 'file' ? { url: '', name: '' }
```

`src/utils/computeSnapPosition.js` — add `file: { w: 128, h: 128 },` to `BLOCK_SIZES`.

`src/utils/findProximityConnection.js` `getHandles` — add `'file'` to the `case 'image':` group (same four source dots `left/right/top/bottom`):

```js
    case 'image':
    case 'file':
```

`src/pages/RoadmapPage.jsx` — in the block palette Panel, after the Video button, add a File button with the identical drag/click/long-press wiring (`addAtCenter('file')`, `e.dataTransfer.setData('application/roadmap-node-type', 'file')`, `{...getHandlers('file')}`, aria-label `"Add File block"`, tile emoji `📄`, caption `File`).

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/components/roadmap/FileNode.test.jsx src/stores/useRoadmapStore.test.js src/utils/roadmapExport.test.js`
Expected: PASS (export schema copies `type`/`data` generically — no schema change needed).

- [ ] **Step 7: Commit**

```bash
git add src/components/roadmap/FileNode.jsx src/components/roadmap/FilePickerModal.jsx src/components/roadmap/FileNode.test.jsx src/components/roadmap/nodeTypes.js src/stores/useRoadmapStore.js src/utils/computeSnapPosition.js src/utils/findProximityConnection.js src/pages/RoadmapPage.jsx
git commit -m "feat(roadmap): File block — upload .pdf/.md/.docx via roadmap-file/ prefix"
```

---

### Task 5: FileViewerModal — open PDF in-app, Download button

**Files:**
- Create: `src/components/roadmap/FileViewerModal.jsx`
- Create: `src/components/roadmap/FileViewerModal.test.jsx`

**Interfaces:**
- Consumes: `{ url, name, onClose }` props (from Task 4's `FileNode`); `fileExt(name)` exported by `FileNode.jsx`.
- Produces: full-screen portal viewer. PDF renders inline; every file type gets a Download button and an open-in-new-tab link.

- [ ] **Step 1: Write the failing tests**

```jsx
it('renders an inline iframe viewer for a .pdf', () => {
  // render FileViewerModal({ url: 'https://x/f.pdf?alt=media', name: 'sheet.pdf' })
  // expect an <iframe title="sheet.pdf"> with src === url
})

it('shows the no-preview fallback for a .docx', () => {
  // name: 'essay.docx' → no iframe; text matches /ยังไม่รองรับ|no preview/i
})

it('has a Download button and an open-in-new-tab link for every type', () => {
  // expect button aria-label 'ดาวน์โหลดไฟล์' and link with target="_blank" href === url
})

it('closes on backdrop click and Escape', () => {
  // same contract as MediaLightbox (fireEvent.click(backdrop) / keyDown Escape → onClose called)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/roadmap/FileViewerModal.test.jsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```jsx
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, ExternalLink, FileText, Loader } from 'lucide-react'
import { fileExt } from './FileNode'

// Full-screen file viewer, portalled to document.body for the same
// transformed-viewport reason as MediaLightbox. PDFs render inline via an
// <iframe> pointing at the Firebase download URL (alt=media serves
// Content-Type: application/pdf, which browsers display natively). Other
// types show a fallback card. Download fetches the object into a Blob so the
// anchor's `download` attribute works cross-origin (the firebasestorage
// endpoint sends permissive CORS headers for GET).
export default function FileViewerModal({ url, name, onClose }) {
  const [downloading, setDownloading] = useState(false)
  const isPdf = fileExt(name) === 'PDF'

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const download = async (e) => {
    e.stopPropagation()
    setDownloading(true)
    try {
      const blob = await (await fetch(url)).blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = name
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(url, '_blank', 'noopener') // fallback: let the browser handle it
    } finally {
      setDownloading(false)
    }
  }

  return createPortal(
    <div
      data-testid="file-viewer-backdrop"
      className="fixed inset-0 z-[60] bg-black/80 flex flex-col"
      onClick={onClose}
    >
      <div
        className="shrink-0 flex items-center gap-2 px-4 py-3 bg-surface border-b-2 border-ink/10"
        onClick={(e) => e.stopPropagation()}
      >
        <FileText size={16} className="text-brand shrink-0" />
        <span className="pixel-font text-[11px] text-ink font-bold truncate flex-1">{name}</span>
        <button
          type="button"
          onClick={download}
          aria-label="ดาวน์โหลดไฟล์"
          className="neo-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:text-brand"
        >
          {downloading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="เปิดในแท็บใหม่"
          className="neo-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:text-brand"
        >
          <ExternalLink size={16} />
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="neo-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:text-ink"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 min-h-0" onClick={(e) => e.stopPropagation()}>
        {isPdf ? (
          <iframe src={url} title={name} className="w-full h-full bg-white" />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <FileText size={48} strokeWidth={1.5} className="text-white/50" />
            <p className="pixel-font text-[11px] text-white">ไฟล์ {fileExt(name)} ยังไม่รองรับการเปิดดูในแอป</p>
            <p className="pixel-font text-[10px] text-white/60">กด Download หรือเปิดในแท็บใหม่แทน</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/roadmap/FileViewerModal.test.jsx src/components/roadmap/FileNode.test.jsx`
Expected: PASS.

- [ ] **Step 5: Verify end-to-end in the browser**

`npm run dev` → add a File block, upload a small PDF, click the block: the PDF renders inline; Download saves it with the original filename; a `.md` upload shows the fallback card. (Requires the Task 1 rules deploy or the local emulator — if production rules still 403 the upload, note it in the commit body and re-verify after `/unlock-bkb`.)

- [ ] **Step 6: Commit**

```bash
git add src/components/roadmap/FileViewerModal.jsx src/components/roadmap/FileViewerModal.test.jsx
git commit -m "feat(roadmap): file viewer — inline PDF reading with download and new-tab actions"
```

---

### Task 6: Image block — paste / drop an image straight into the block

**Files:**
- Create: `src/utils/uploadRoadmapImage.js`
- Create: `src/utils/uploadRoadmapImage.test.js`
- Modify: `src/components/roadmap/ImageNode.jsx`
- Modify: `src/components/roadmap/ImagePickerModal.jsx:51-64` (reuse the util)
- Test: `src/components/roadmap/ImageNode.test.jsx` (extend)

**Interfaces:**
- Consumes: `uploadAsset` from `storageOps`, prefix `users/{uid}/roadmap/` (existing rule — no rules change).
- Produces: `uploadRoadmapImage(uid, nodeId, file) -> Promise<string /* download url */>`; ImageNode accepts OS drag-drop of an image file and Ctrl/Cmd+V paste while selected.

- [ ] **Step 1: Write the failing util test**

`src/utils/uploadRoadmapImage.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'

vi.mock('./storageOps', () => ({ uploadAsset: vi.fn().mockResolvedValue('https://x/u') }))
import { uploadAsset } from './storageOps'
import { uploadRoadmapImage } from './uploadRoadmapImage'

describe('uploadRoadmapImage', () => {
  it('uploads under users/{uid}/roadmap/{nodeId}- and returns the url', async () => {
    const file = new File(['x'], 'p.png', { type: 'image/png' })
    const url = await uploadRoadmapImage('u1', 'node-9', file)
    expect(url).toBe('https://x/u')
    const [path, passedFile, opts] = uploadAsset.mock.calls[0]
    expect(path).toMatch(/^users\/u1\/roadmap\/node-9-\d+$/)
    expect(passedFile).toBe(file)
    expect(opts).toEqual({ contentType: 'image/png' })
  })

  it('rejects non-image files', async () => {
    const file = new File(['x'], 'p.pdf', { type: 'application/pdf' })
    await expect(uploadRoadmapImage('u1', 'n', file)).rejects.toThrow(/image/i)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/utils/uploadRoadmapImage.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the util**

`src/utils/uploadRoadmapImage.js`:

```js
import { uploadAsset } from './storageOps'

// One image file -> users/{uid}/roadmap/{nodeId}-{ts} -> download URL.
// Shared by ImagePickerModal's Upload button and ImageNode's direct
// drop/paste path so the storage layout stays identical either way.
export async function uploadRoadmapImage(uid, nodeId, file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Not an image file')
  return uploadAsset(`users/${uid}/roadmap/${nodeId}-${Date.now()}`, file, { contentType: file.type })
}
```

Then in `ImagePickerModal.jsx` replace the inline `uploadAsset(...)` call in `onFileChange` with `await uploadRoadmapImage(uid, nodeId, file)` (import it; drop the now-unused `uploadAsset` import if nothing else uses it).

- [ ] **Step 4: Write the failing ImageNode tests**

Extend `src/components/roadmap/ImageNode.test.jsx` (reuse its harness; mock `../../utils/uploadRoadmapImage` to resolve `'https://x/new'`):

```jsx
it('uploads and appends a dropped image file', async () => {
  // fireEvent.drop(nodeRoot, { dataTransfer: { files: [pngFile] } })
  // await → updateNodeData called with images ending in { url: 'https://x/new', offset: DEFAULT_IMAGE_OFFSET }
})

it('uploads and appends a pasted image while the node is selected', async () => {
  // render with selected: true; dispatch window paste event with clipboardData.files = [pngFile]
  // await → same append assertion
})

it('ignores paste when the node is not selected', () => {
  // selected: false → uploadRoadmapImage never called
})
```

Run: `npx vitest run src/components/roadmap/ImageNode.test.jsx` — the three new cases FAIL.

- [ ] **Step 5: Implement in `ImageNode.jsx`**

Add imports (`useEffect`, `useCallback` from react; `useAuthStore`; `uploadRoadmapImage`), then inside the component:

```jsx
  const uid = useAuthStore((s) => s.user?.uid)

  // Direct-place path (Idea: "วางภาพได้ในบล็อคเลย"): an image file dropped on
  // the block or pasted while it is selected uploads and appends, exactly as
  // the picker's Upload button would.
  const appendFile = useCallback(async (file) => {
    if (!uid || !file?.type?.startsWith('image/')) return
    try {
      const url = await uploadRoadmapImage(uid, id, file)
      const next = [...images, { url, offset: DEFAULT_IMAGE_OFFSET }]
      updateNodeData(id, { images: next, activeIndex: next.length - 1 })
    } catch {
      // leave the block unchanged; the picker path stays available
    }
  }, [uid, id, images, updateNodeData])

  const onDrop = useCallback((e) => {
    const file = e.dataTransfer?.files?.[0]
    if (!file) return // not an OS file drag (e.g. a palette-block drag) — let it bubble
    e.preventDefault()
    e.stopPropagation()
    appendFile(file)
  }, [appendFile])

  useEffect(() => {
    if (!selected) return
    const onPaste = (e) => {
      const file = e.clipboardData?.files?.[0]
      if (file) appendFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [selected, appendFile])
```

Wire the root `<div className="relative w-32 h-32">` with `onDrop={onDrop}` and `onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault() }}` — guard on `Files` so palette-button drags (`application/roadmap-node-type`) still reach the canvas drop handler.

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/components/roadmap/ImageNode.test.jsx src/components/roadmap/ImagePickerModal.test.jsx src/utils/uploadRoadmapImage.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/uploadRoadmapImage.js src/utils/uploadRoadmapImage.test.js src/components/roadmap/ImageNode.jsx src/components/roadmap/ImageNode.test.jsx src/components/roadmap/ImagePickerModal.jsx
git commit -m "feat(roadmap): drop or paste an image straight onto an Image block"
```

---

### Task 7: IR Board palette — drag blocks onto the canvas (Tool Block)

**Files:**
- Modify: `src/components/admin/IdeaRequestSection.jsx`

**Interfaces:**
- Consumes: `computeDropPosition(point, screenToFlowPosition, type)` from `src/utils/computeDropPosition.js` and `useLongPressDrag(onDrop)` from `src/hooks/useLongPressDrag.js` — the exact pattern already live in `RoadmapPage.jsx:194-210, 351-398, 530-538`.
- Produces: IR Board palette buttons (`+ Idea Root … + Success`) support click-to-add (unchanged), desktop drag-to-place, and touch long-press-drag. User Roadmap untouched.

- [ ] **Step 1: Implement (pattern transplant from RoadmapPage)**

In `IdeaRequestSection.jsx`:

1. Add imports: `createPortal` from `react-dom`; `computeDropPosition` from `../../utils/computeDropPosition`; `useLongPressDrag` from `../../hooks/useLongPressDrag`.
2. Add `const rfRef = useRef(null)` and pass `onInit={(instance) => { rfRef.current = instance }}` to `<ReactFlow>`.
3. Add the drop plumbing next to the other callbacks:

```jsx
  const onCanvasDragOver = useCallback((e) => { e.preventDefault() }, [])
  const onCanvasDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/roadmap-node-type')
    if (!type || !rfRef.current) return
    addNode(type, computeDropPosition({ clientX: e.clientX, clientY: e.clientY }, rfRef.current.screenToFlowPosition, type))
  }, [addNode])
  const onTouchDrop = useCallback((type, { clientX, clientY }) => {
    if (!rfRef.current) return
    addNode(type, computeDropPosition({ clientX, clientY }, rfRef.current.screenToFlowPosition, type))
  }, [addNode])
  const { dragState, getHandlers } = useLongPressDrag(onTouchDrop)
```

4. Wire the wrapper `<div className="relative w-full h-full min-h-[480px] bg-surface">` with `onDragOver={onCanvasDragOver} onDrop={onCanvasDrop}`.
5. Make each palette button draggable (click-to-add stays):

```jsx
          <button
            key={p.type}
            type="button"
            draggable="true"
            onDragStart={(e) => e.dataTransfer.setData('application/roadmap-node-type', p.type)}
            {...getHandlers(p.type)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-ink/20 bg-white hover:border-brand cursor-grab active:cursor-grabbing"
            onClick={() => addNode(p.type, { x: 120 + Math.random() * 80, y: 120 + Math.random() * 80 })}
          >
            + {p.label}
          </button>
```

6. Add the touch ghost preview just before the closing wrapper `</div>`, portalled for the same transformed-viewport reason documented in `RoadmapPage.jsx:524-538` (copy that JSX block verbatim, including the comment).

- [ ] **Step 2: Verify manually**

`npm run dev` → sign in as an Admin → Admin Dashboard → IR tab. Drag `+ Process` from the palette onto the canvas: the block lands under the pointer (correct at zoom ≠ 1 too — zoom first, then drop). Click-to-add still works. On a touch device/emulation, long-press a palette button and drag: ghost follows the finger, block lands on release.

- [ ] **Step 3: Run the admin/roadmap suites**

Run: `npx vitest run src/components/roadmap src/stores/useRoadmapStore.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/IdeaRequestSection.jsx
git commit -m "feat(ir-board): drag palette blocks onto the canvas (desktop drag + touch long-press)"
```

---

### Task 8: Full-suite gate

- [ ] **Step 1: Run everything**

Run: `npm test`
Expected: entire Vitest suite PASS. Then `npm run test:rules` — PASS.

- [ ] **Step 2: Fix any fallout, commit fixes individually**

If a suite fails, use superpowers:systematic-debugging — reproduce, isolate to the owning task's files, fix there, and commit as `fix(...)`.

---

## Out of scope / deferred

- Deploying `storage.rules` — queued in the Pending Deploy Queue; run `/unlock-bkb` to flush.
- In-app rendering of `.docx`/`.xlsx` (fallback card + download only).
- File-size quotas on uploads (no existing quota on image/video either — the "Limit Bag 1GB/User" Idea `node-10-1783857922378` owns that story).
- `StartNode.jsx` — untouched by design.
