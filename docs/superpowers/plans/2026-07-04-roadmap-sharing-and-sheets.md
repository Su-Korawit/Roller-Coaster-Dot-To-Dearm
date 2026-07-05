# Roadmap Sharing & Multi-Sheet Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task, OR hand this file to Cursor IDE to implement directly, checking off each `- [ ]`. Claude Code (terminal) should review/check the diff after each task per this repo's CLAUDE.md collaboration model.

> **Task order matters more than usual on this plan.** This is the highest-blast-radius change in the whole Roadmap feature set — it touches Firestore schema and security rules on `users/{uid}`, a document shared with tasks, portfolio, journeys, the social graph, farm/inventory, and more. Every later task depends on exact names/shapes introduced by an earlier one (`roadmapSheets` collection → `migrateLegacyRoadmap` → `useRoadmapStore` internals → `syncManager.js` → the service layer → the UI → the rules that lock it all down). **Do not reorder or skip tasks.** Do not rename `roadmapSheets`, `roadmapSheetIds`, `collaborators`, or `collaboratorUids` anywhere — those four names are used identically in code, tests, and rules across every task below.

**Goal:** Let a user create multiple Roadmap "sheets" (separate canvases) and share a specific sheet with another app user (drawn from their existing follow graph) at `view` or `edit` access — without breaking the single-document Roadmap that exists today, or any other field already living on `users/{uid}`.

**Architecture:**

- **New Firestore collection `roadmapSheets/{sheetId}`** — one document per sheet: `{ ownerUid, name, nodes, edges, order, collaborators: { [uid]: 'view'|'edit' }, collaboratorUids: [uid,...], createdAt, updatedAt }`. `collaborators` (a map) gives O(1) permission lookups for security rules and the sharing UI; `collaboratorUids` (a denormalized array, kept in lockstep with `collaborators`' keys on every write that touches sharing) exists solely so `queries.sheetsSharedWithMe(uid)` can run a Firestore `array-contains` query — Firestore cannot query on a dynamic map key directly, so the array is the query-support shadow of the map.
- **`users/{uid}` gains exactly one new field: `roadmapSheetIds: [sheetId, ...]`** — an ordered array of the ids of sheets the user **owns** (never sheets shared *with* them — those are discovered via the `collaboratorUids` query, not this array). **`roadmapSheetIds[0]` is, by definition, "the user's default Roadmap sheet"** — the one the (separately planned) Profile-integration feature must read. This is a position-based contract, not a name-based one: a user can rename or even delete what was originally sheet #1, and whatever ends up at index 0 becomes the new default. **This is a real constraint on the sibling Profile-integration plan being written in parallel — it must resolve "the user's roadmap" via `roadmapSheetIds[0]`, never by matching on the sheet name "Roadmap".** No other existing field on `users/{uid}` (tasks, portfolio, journeys, followers/following/followRequests/sentRequests, farmGold, inventory, coins, profile.*) is touched by this plan.
- **The legacy `users/{uid}.roadmap` field is never deleted.** A one-time migration copies it into a new `roadmapSheets` doc named "Roadmap" the first time a user with no `roadmapSheetIds` logs in after this ships; the legacy field is left in place, frozen, for rollback safety. Nothing writes to it ever again after this ships (the old `roadmapSync`/`syncRoadmapToFirestore`/`hydrateRoadmapFromFirestore`/`setRoadmapSyncUser` code in `syncManager.js` is deleted as dead code in Task 4, per this repo's stated preference for removing unreferenced code rather than leaving it around unused).
- **Compatibility path (the highest-risk decision in this plan):** `useRoadmapStore` keeps its existing top-level `nodes`, `edges`, `setpoint`, `selection` state fields and every existing action (`setNodes`, `setEdges`, `addNode`, `updateNodeData`, `removeNode`, `connect`, `removeEdge`, `detachNode`, `importRoadmap`, `duplicateSelection`, `removeSelection`, `setSelection`, `clearSelection`) with **identical call signatures**. Nothing in `RoadmapPage.jsx`, `ProcessNode.jsx`, `ConditionNode.jsx`, `StageLabelNode.jsx`, `ImageNode.jsx`, or `ImagePickerModal.jsx` changes how it calls the store (verified by Grep in Task 3). Internally, the store adds `sheets: [{ id, name, nodes, edges, ownerUid, myRole }]` and `activeSheetId`. Every mutator that touches `nodes`/`edges` routes through one internal helper, `applyToActive(state, patch)`, which writes the patch to the top-level fields **and** mirrors it into the matching entry of `sheets` in the same `set()` call — so `nodes`/`edges` are always exactly `sheets.find(s => s.id === activeSheetId).nodes/edges`, just also available flat so no call site has to change.
- **All of a user's sheets (owned + shared-with-them) are fully hydrated into `sheets` at session-bootstrap time**, not lazily fetched on switch — this app's roadmap graphs are small (tens of nodes) and users are expected to have a handful of sheets, so eager hydration keeps `switchSheet` a pure local pointer-flip with no network round trip. (If sheet counts grow large later, this can be revisited — out of scope here.)
- **Sync model — no changes to the `createFirestoreSync` factory itself.** `mapSync`/`farmSync` already prove the factory's `ref` and `guard` options are overridable per-instance; a new `roadmapSheetSync` instance reuses this as-is, pointing `ref` at `refs.roadmapSheet` and repurposing the factory's generic "uid" parameter to mean "the currently-armed sheetId." Its `guard` checks both `state.activeSheetId === sheetId` (only the active sheet ever syncs) and that this user's role on that sheet isn't `'view'` (a viewer's local mutations, if any slip through the UI, never reach Firestore). Switching sheets tears down the old armed target and arms the new one.
- **Sharing pool:** reuses `useSocialStore`'s `following` ∪ `followers` (the union of both follow directions) as "people you can share with" — no new user-search UI, per product decision. A sheet's owner picks a `view` or `edit` level per person; both `collaborators` and `collaboratorUids` are written together in one `updateDoc` so they can never drift apart.
- **New service layer `src/services/roadmapSheets.js`** holds the non-debounced, immediate Firestore writes for sheet lifecycle (create/switch/rename/delete/share) — mirroring how `useSocialStore`'s `sendFollowRequest`/`saveSchool` are immediate one-off writes rather than debounced. This keeps `syncManager.js` scoped to what its own file header already says it's for (the generic debounce factory + thin per-store instances), per this repo's existing separation of concerns.

**Tech Stack:** Plain JS + JSX (no TypeScript), Zustand, Firebase Firestore (`firebase/firestore` v12), Vitest + jsdom for unit tests, `@firebase/rules-unit-testing` for security-rules tests (`npm run test:rules`).

---

## Global Constraints

- **No TypeScript.** Plain JS/JSX only — no `.ts` files, no type annotations.
- **Firestore writes for continuous editing (nodes/edges) go through the debounced `syncManager.js` factory only** — never a synchronous direct `setDoc` for per-keystroke/per-drag data. One-off, infrequent writes (create sheet, rename, delete, share) may write immediately via `setDoc`/`updateDoc`/`deleteDoc`, matching the existing `useSocialStore` precedent (`sendFollowRequest`, `saveSchool`).
- **Never inline `doc(db, 'collection', id)` outside `src/lib/db.js`.** Every new Firestore path goes through `refs`/`cols`/`queries` in `db.js` (Task 1).
- **Must not break any other field on `users/{uid}`** — tasks, portfolio, journeys, followers/following/followRequests/sentRequests, farmGold, inventory, coins, profile.*. The only new field there is `roadmapSheetIds`.
- **The legacy `users/{uid}.roadmap` field must never be deleted or overwritten** by this plan's migration — additive only.
- **Security-rules changes must ship with rules tests** in `test/rules/firestore.rules.test.js`, run via `npm run test:rules`.
- **Names must stay identical everywhere they appear:** `roadmapSheets` (collection), `roadmapSheetIds` (field on `users/{uid}`), `collaborators` (map field), `collaboratorUids` (array field), `myRole` (in-memory store field, never persisted to Firestore as-is).
- Every task's automated tests must pass via `npm test` (or `npm run test:rules` for Task 7) before moving to the next task.

---

### Task 1: Firestore schema — `db.js` refs, collection, query, and doc-shape factory

**Files:** `src/lib/db.js`, `src/lib/db.test.js`

**Interfaces:**
- `refs.roadmapSheet(sheetId) → DocumentRef` at `roadmapSheets/{sheetId}`
- `cols.roadmapSheets → CollectionRef` at `roadmapSheets`
- `queries.sheetsSharedWithMe(uid) → Query` — `roadmapSheets` where `collaboratorUids` array-contains `uid`
- `shapes.newRoadmapSheet({ ownerUid, name, nodes, edges, order }) → object` — canonical doc shape for a brand-new sheet

- [ ] Step 1: Write the failing test (full code)

  Append to `src/lib/db.test.js` (the file already mocks `collection`/`doc`/`query`/`where`/`orderBy`/`limit`/`serverTimestamp` at the top — no import changes needed):

  ```js
  describe('refs.roadmapSheet', () => {
    it('builds a roadmapSheets/{sheetId} document ref', () => {
      expect(refs.roadmapSheet('sheet-1')).toEqual({ _path: 'roadmapSheets/sheet-1' })
    })
  })

  describe('cols.roadmapSheets', () => {
    it('is the roadmapSheets collection ref', () => {
      expect(cols.roadmapSheets).toEqual({ _col: 'roadmapSheets' })
    })
  })

  describe('queries.sheetsSharedWithMe', () => {
    it('queries roadmapSheets where collaboratorUids array-contains the uid', async () => {
      const { where } = await import('firebase/firestore')
      queries.sheetsSharedWithMe('bob')
      expect(where).toHaveBeenCalledWith('collaboratorUids', 'array-contains', 'bob')
    })
  })

  describe('shapes.newRoadmapSheet', () => {
    it('builds a fresh sheet doc with empty collaborators and the given nodes/edges', () => {
      const result = shapes.newRoadmapSheet({ ownerUid: 'alice', name: 'Roadmap', nodes: [{ id: 'n1' }], edges: [] })
      expect(result).toEqual({
        ownerUid: 'alice',
        name: 'Roadmap',
        nodes: [{ id: 'n1' }],
        edges: [],
        order: 0,
        collaborators: {},
        collaboratorUids: [],
        createdAt: { _type: 'serverTimestamp' },
        updatedAt: { _type: 'serverTimestamp' },
      })
    })

    it('defaults nodes/edges/order when omitted', () => {
      const result = shapes.newRoadmapSheet({ ownerUid: 'alice', name: 'Empty' })
      expect(result.nodes).toEqual([])
      expect(result.edges).toEqual([])
      expect(result.order).toBe(0)
    })
  })
  ```

- [ ] Step 2: Run it, confirm it fails

  ```bash
  npm test -- src/lib/db.test.js
  ```
  Expected failure: `refs.roadmapSheet is not a function` (and similarly for `cols.roadmapSheets`, `queries.sheetsSharedWithMe`, `shapes.newRoadmapSheet`) — none of these exist yet.

- [ ] Step 3: Minimal implementation (full code)

  In `src/lib/db.js`, add to the `refs` object (after the `farmShop` line):
  ```js
    farmShop:    (id)             => doc(db, 'farmShops', id),
    roadmapSheet: (sheetId)       => doc(db, 'roadmapSheets', sheetId),
    appUpdate:   (id)             => doc(db, 'appUpdates', id),
  ```

  Add to the `cols` object (after `farmShops`):
  ```js
    farmShops:    collection(db, 'farmShops'),
    roadmapSheets: collection(db, 'roadmapSheets'),
    mapConfigs:   collection(db, 'mapConfigs'),
  ```

  Add to the `queries` object (after `purchasesByUser`):
  ```js
    purchasesByUser: (uid) => query(cols.purchases, where('uid', '==', uid)),
    sheetsSharedWithMe: (uid) => query(cols.roadmapSheets, where('collaboratorUids', 'array-contains', uid)),
    appUpdatesByDate: () => query(cols.appUpdates, orderBy('createdAt', 'desc')),
  ```

  Add to the `shapes` object (after `initialUser`):
  ```js
    // Canonical write shape for a brand-new Roadmap sheet doc — the single seam
    // used by migrateLegacyRoadmap (Task 2), sessionBootstrap's fresh-user seed
    // path (Task 4), and createSheetAndSync / shareSheet (Task 5).
    newRoadmapSheet: ({ ownerUid, name, nodes = [], edges = [], order = 0 }) => ({
      ownerUid,
      name,
      nodes,
      edges,
      order,
      collaborators: {},
      collaboratorUids: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  ```

- [ ] Step 4: Run it, confirm it passes

  ```bash
  npm test -- src/lib/db.test.js
  ```
  All new + existing `db.test.js` assertions pass.

- [ ] Step 5: Manual verification in `npm run dev`

  N/A — pure data-layer addition, no UI surface yet. Skip to commit.

- [ ] Step 6: Commit

  ```bash
  git add src/lib/db.js src/lib/db.test.js
  git commit -m "feat(roadmap): add roadmapSheets refs/collection/query/shape to db.js"
  ```

---

### Task 2: Pure migration function — `migrateLegacyRoadmap`

**Files:** `src/utils/migrateLegacyRoadmap.js` (new), `src/utils/migrateLegacyRoadmap.test.js` (new)

**Interfaces:**
- `migrateLegacyRoadmap(userDoc, sheetId) → { sheetId, sheetDoc, userDocPatch } | null`
  - `userDoc` — a plain object (the already-fetched `users/{uid}` doc data)
  - `sheetId` — pre-generated by the caller (kept out of this function so it stays pure/deterministic for tests — no `crypto.randomUUID()` call inside)
  - Returns `null` when no migration is needed: no legacy `roadmap` field, OR `roadmapSheetIds` already exists (migration already ran — idempotent).
  - Otherwise returns the new sheet doc to write to `roadmapSheets/{sheetId}` and the patch to merge into `users/{uid}`. **Never mutates `userDoc` and never includes a deletion of the legacy `roadmap` field.**

- [ ] Step 1: Write the failing test (full code)

  Create `src/utils/migrateLegacyRoadmap.test.js`:
  ```js
  import { describe, it, expect, vi } from 'vitest'

  vi.mock('../lib/db', () => ({
    shapes: {
      newRoadmapSheet: ({ ownerUid, name, nodes, edges, order }) => ({
        ownerUid, name, nodes, edges, order,
        collaborators: {}, collaboratorUids: [],
        createdAt: { _type: 'serverTimestamp' },
        updatedAt: { _type: 'serverTimestamp' },
      }),
    },
  }))

  const { migrateLegacyRoadmap } = await import('./migrateLegacyRoadmap')

  describe('migrateLegacyRoadmap', () => {
    it('returns null when there is no legacy roadmap field', () => {
      expect(migrateLegacyRoadmap({ uid: 'alice' }, 'sheet-1')).toBeNull()
    })

    it('returns null when roadmapSheetIds already exists (already migrated)', () => {
      const userDoc = { uid: 'alice', roadmap: { nodes: [], edges: [] }, roadmapSheetIds: ['sheet-0'] }
      expect(migrateLegacyRoadmap(userDoc, 'sheet-1')).toBeNull()
    })

    it('builds a "Roadmap"-named sheet doc from the legacy nodes/edges', () => {
      const nodes = [{ id: 'n1', type: 'process', position: { x: 0, y: 0 }, data: {} }]
      const edges = [{ id: 'e1', source: 'n1', target: 'n2' }]
      const userDoc = { uid: 'alice', roadmap: { nodes, edges } }

      const result = migrateLegacyRoadmap(userDoc, 'sheet-1')

      expect(result.sheetId).toBe('sheet-1')
      expect(result.sheetDoc).toEqual({
        ownerUid: 'alice',
        name: 'Roadmap',
        nodes,
        edges,
        order: 0,
        collaborators: {},
        collaboratorUids: [],
        createdAt: { _type: 'serverTimestamp' },
        updatedAt: { _type: 'serverTimestamp' },
      })
    })

    it('sets roadmapSheetIds to exactly the new sheetId on the user-doc patch', () => {
      const userDoc = { uid: 'alice', roadmap: { nodes: [], edges: [] } }
      const result = migrateLegacyRoadmap(userDoc, 'sheet-1')
      expect(result.userDocPatch).toEqual({ roadmapSheetIds: ['sheet-1'] })
    })

    it('defaults to empty nodes/edges when the legacy roadmap field is malformed', () => {
      const userDoc = { uid: 'alice', roadmap: {} }
      const result = migrateLegacyRoadmap(userDoc, 'sheet-1')
      expect(result.sheetDoc.nodes).toEqual([])
      expect(result.sheetDoc.edges).toEqual([])
    })

    it('never mutates the input userDoc', () => {
      const userDoc = { uid: 'alice', roadmap: { nodes: [{ id: 'n1' }], edges: [] } }
      const before = JSON.stringify(userDoc)
      migrateLegacyRoadmap(userDoc, 'sheet-1')
      expect(JSON.stringify(userDoc)).toBe(before)
    })
  })
  ```

- [ ] Step 2: Run it, confirm it fails

  ```bash
  npm test -- src/utils/migrateLegacyRoadmap.test.js
  ```
  Expected failure: cannot find module `./migrateLegacyRoadmap` (file doesn't exist yet).

- [ ] Step 3: Minimal implementation (full code)

  Create `src/utils/migrateLegacyRoadmap.js`:
  ```js
  import { shapes } from '../lib/db'

  /**
   * Pure migration check: given a plain users/{uid} doc (already fetched) and a
   * pre-generated sheetId (the caller mints it — kept out of this function so it
   * stays pure/deterministic for tests), decide whether the legacy single-document
   * Roadmap needs to become "sheet #1, named Roadmap".
   *
   * Returns null when no migration is needed (no legacy `roadmap` field, or
   * `roadmapSheetIds` already exists — migration already ran). Otherwise returns
   * the new sheet doc (write to roadmapSheets/{sheetId}) and the user-doc patch
   * (merge into users/{uid}) — the legacy `roadmap` field is NEVER removed, so
   * rollback is always possible.
   */
  export function migrateLegacyRoadmap(userDoc, sheetId) {
    if (!userDoc?.roadmap) return null
    if (Array.isArray(userDoc.roadmapSheetIds) && userDoc.roadmapSheetIds.length > 0) return null

    const { nodes = [], edges = [] } = userDoc.roadmap
    const sheetDoc = shapes.newRoadmapSheet({
      ownerUid: userDoc.uid,
      name: 'Roadmap',
      nodes,
      edges,
      order: 0,
    })

    return {
      sheetId,
      sheetDoc,
      userDocPatch: { roadmapSheetIds: [sheetId] },
    }
  }
  ```

- [ ] Step 4: Run it, confirm it passes

  ```bash
  npm test -- src/utils/migrateLegacyRoadmap.test.js
  ```
  All 6 tests pass.

- [ ] Step 5: Manual verification in `npm run dev`

  N/A — pure function, no UI/Firestore wiring yet (wired in Task 4).

- [ ] Step 6: Commit

  ```bash
  git add src/utils/migrateLegacyRoadmap.js src/utils/migrateLegacyRoadmap.test.js
  git commit -m "feat(roadmap): add pure migrateLegacyRoadmap function for sheet #1 migration"
  ```

---

### Task 3: `useRoadmapStore` multi-sheet restructuring with top-level compatibility path

**Files:** `src/stores/useRoadmapStore.js`, `src/stores/useRoadmapStore.test.js`

**Call-site audit (must NOT need to change after this task):**
```
src/pages/RoadmapPage.jsx            — s.nodes, s.edges, s.setNodes, s.setEdges, s.addNode, s.removeNode,
                                        s.connect, s.removeEdge, s.detachNode, s.setpoint, s.selection,
                                        s.setSelection, s.clearSelection, s.removeSelection,
                                        s.duplicateSelection, s.importRoadmap
src/components/roadmap/ProcessNode.jsx     — s.updateNodeData
src/components/roadmap/ConditionNode.jsx   — s.updateNodeData
src/components/roadmap/StageLabelNode.jsx  — s.updateNodeData
src/components/roadmap/ImageNode.jsx       — s.updateNodeData
src/components/roadmap/ImagePickerModal.jsx — s.updateNodeData
```
Every one of these reads/actions keeps its exact name and signature. Confirmed via `Grep -n "useRoadmapStore" src/**` before writing this task.

**Interfaces (new):**
- State: `sheets: [{ id, name, nodes, edges, ownerUid, myRole }]`, `activeSheetId`, `myUid`
- Actions: `setRoadmapMyUid(uid)`, `hydrateSheets(sheets, activeSheetId)`, `createSheet(name) → newSheetId`, `switchSheet(sheetId)`, `renameSheet(sheetId, name)`, `deleteSheet(sheetId)`

- [ ] Step 1: Write the failing test (full code)

  In `src/stores/useRoadmapStore.test.js`, first **replace** the existing `beforeEach` (so the 27 pre-existing tests keep passing against the new shape):
  ```js
  beforeEach(() => {
    useRoadmapStore.setState({
      nodes: [], edges: [], setpoint: null, selection: [],
      sheets: [{ id: 'local-default', name: 'Roadmap', nodes: [], edges: [], ownerUid: null, myRole: 'owner' }],
      activeSheetId: 'local-default',
      myUid: null,
    })
  })
  ```

  Then **append** this new `describe` block at the end of the file:
  ```js
  describe('multi-sheet: createSheet / switchSheet / renameSheet / deleteSheet / hydrateSheets', () => {
    beforeEach(() => {
      useRoadmapStore.setState({
        nodes: [], edges: [], setpoint: null, selection: [],
        sheets: [{ id: 'local-default', name: 'Roadmap', nodes: [], edges: [], ownerUid: null, myRole: 'owner' }],
        activeSheetId: 'local-default',
        myUid: 'me',
      })
    })

    it('createSheet adds a new empty sheet and switches to it', () => {
      const id = useRoadmapStore.getState().createSheet('Side Project')
      const { sheets, activeSheetId, nodes, edges } = useRoadmapStore.getState()
      expect(sheets).toHaveLength(2)
      expect(activeSheetId).toBe(id)
      expect(nodes).toEqual([])
      expect(edges).toEqual([])
      expect(sheets.find((s) => s.id === id).name).toBe('Side Project')
      expect(sheets.find((s) => s.id === id).ownerUid).toBe('me')
    })

    it('switching sheets does not lose the other sheet\'s data', () => {
      useRoadmapStore.getState().addNode('process') // on sheet 1 (local-default)
      const sheet2Id = useRoadmapStore.getState().createSheet('Sheet 2')
      useRoadmapStore.getState().addNode('condition') // on sheet 2

      useRoadmapStore.getState().switchSheet('local-default')
      expect(useRoadmapStore.getState().nodes).toHaveLength(1)
      expect(useRoadmapStore.getState().nodes[0].type).toBe('process')

      useRoadmapStore.getState().switchSheet(sheet2Id)
      expect(useRoadmapStore.getState().nodes).toHaveLength(1)
      expect(useRoadmapStore.getState().nodes[0].type).toBe('condition')
    })

    it('adding a node while on sheet 2 does not touch sheet 1', () => {
      useRoadmapStore.getState().addNode('process') // sheet 1 gets 1 node
      const sheet2Id = useRoadmapStore.getState().createSheet('Sheet 2')
      useRoadmapStore.getState().addNode('condition')
      useRoadmapStore.getState().addNode('image')

      const { sheets } = useRoadmapStore.getState()
      const sheet1 = sheets.find((s) => s.id === 'local-default')
      const sheet2 = sheets.find((s) => s.id === sheet2Id)
      expect(sheet1.nodes).toHaveLength(1)
      expect(sheet2.nodes).toHaveLength(2)
    })

    it('renameSheet updates only the target sheet\'s name', () => {
      const sheet2Id = useRoadmapStore.getState().createSheet('Sheet 2')
      useRoadmapStore.getState().renameSheet(sheet2Id, 'Renamed')
      const { sheets } = useRoadmapStore.getState()
      expect(sheets.find((s) => s.id === sheet2Id).name).toBe('Renamed')
      expect(sheets.find((s) => s.id === 'local-default').name).toBe('Roadmap')
    })

    it('deleteSheet refuses to delete the last remaining sheet', () => {
      useRoadmapStore.getState().deleteSheet('local-default')
      expect(useRoadmapStore.getState().sheets).toHaveLength(1)
      expect(useRoadmapStore.getState().activeSheetId).toBe('local-default')
    })

    it('deleting the active sheet falls back to another sheet sensibly', () => {
      const sheet2Id = useRoadmapStore.getState().createSheet('Sheet 2')
      useRoadmapStore.getState().addNode('process') // on sheet 2, which is active

      useRoadmapStore.getState().deleteSheet(sheet2Id)

      const { sheets, activeSheetId, nodes } = useRoadmapStore.getState()
      expect(sheets).toHaveLength(1)
      expect(activeSheetId).toBe('local-default')
      expect(nodes).toEqual([]) // fell back to sheet 1's (empty) nodes
    })

    it('deleting a non-active sheet leaves the active sheet untouched', () => {
      useRoadmapStore.getState().addNode('process') // sheet 1
      const sheet2Id = useRoadmapStore.getState().createSheet('Sheet 2')
      useRoadmapStore.getState().switchSheet('local-default')

      useRoadmapStore.getState().deleteSheet(sheet2Id)

      const { sheets, activeSheetId, nodes } = useRoadmapStore.getState()
      expect(sheets).toHaveLength(1)
      expect(activeSheetId).toBe('local-default')
      expect(nodes).toHaveLength(1)
    })

    it('switchSheet resets selection and setpoint (no stale cross-sheet references)', () => {
      useRoadmapStore.getState().addNode('process')
      useRoadmapStore.getState().setSelection(['some-id'])
      useRoadmapStore.getState().createSheet('Sheet 2')
      expect(useRoadmapStore.getState().selection).toEqual([])
      expect(useRoadmapStore.getState().setpoint).toBeNull()
    })

    it('hydrateSheets replaces the sheet list and activates the given sheet', () => {
      const incoming = [
        { id: 's1', name: 'Roadmap', nodes: [{ id: 'n1', type: 'process', position: { x: 0, y: 0 }, data: {} }], edges: [], ownerUid: 'me', myRole: 'owner' },
        { id: 's2', name: 'Extra', nodes: [], edges: [], ownerUid: 'me', myRole: 'owner' },
      ]
      useRoadmapStore.getState().hydrateSheets(incoming, 's1')
      const { sheets, activeSheetId, nodes } = useRoadmapStore.getState()
      expect(sheets).toEqual(incoming)
      expect(activeSheetId).toBe('s1')
      expect(nodes).toHaveLength(1)
    })
  })
  ```

- [ ] Step 2: Run it, confirm it fails

  ```bash
  npm test -- src/stores/useRoadmapStore.test.js
  ```
  Expected failure: `useRoadmapStore.getState().createSheet is not a function` (and similarly for `switchSheet`/`renameSheet`/`deleteSheet`/`hydrateSheets`) — none exist yet.

- [ ] Step 3: Minimal implementation (full code)

  Replace the entire contents of `src/stores/useRoadmapStore.js`:
  ```js
  import { create } from 'zustand'
  import { persist } from 'zustand/middleware'
  import { addEdge } from '@xyflow/react'
  import { computeSnapPosition } from '../utils/computeSnapPosition'
  import { fromSchema } from '../utils/roadmapExport'

  const IMPORT_GAP = 80

  let _counter = 0
  function nextId() {
    return `node-${++_counter}-${Date.now()}`
  }

  // Mirrors a { nodes, edges } patch onto both the top-level state (kept for
  // zero call-site churn on every existing action) AND the matching entry in
  // `sheets` — the store's single source of truth for "which sheet has what."
  function applyToActive(state, patch) {
    const sheetPatch = {}
    if ('nodes' in patch) sheetPatch.nodes = patch.nodes
    if ('edges' in patch) sheetPatch.edges = patch.edges
    return {
      ...patch,
      sheets: state.sheets.map((sh) =>
        sh.id === state.activeSheetId ? { ...sh, ...sheetPatch } : sh,
      ),
    }
  }

  export const useRoadmapStore = create(
    persist(
      (set) => ({
        // ── Multi-sheet state ──────────────────────────────────────────────
        // `myUid` is stamped by sessionBootstrap via setRoadmapMyUid so newly
        // created sheets know their owner before any Firestore round trip.
        myUid: null,
        sheets: [{ id: 'local-default', name: 'Roadmap', nodes: [], edges: [], ownerUid: null, myRole: 'owner' }],
        activeSheetId: 'local-default',

        // ── Compatibility fields — always mirror sheets[activeSheetId] ─────
        nodes: [],
        edges: [],
        setpoint: null,
        selection: [],

        setRoadmapMyUid: (uid) => set({ myUid: uid }),

        // Bulk-replace the sheet list (called once per session by
        // sessionBootstrap after fetching owned + shared sheets from Firestore).
        hydrateSheets: (sheets, activeSheetId) =>
          set(() => {
            const active = sheets.find((sh) => sh.id === activeSheetId) ?? sheets[0]
            return {
              sheets,
              activeSheetId: active?.id ?? null,
              nodes: active?.nodes ?? [],
              edges: active?.edges ?? [],
              setpoint: null,
              selection: [],
            }
          }),

        createSheet: (name) => {
          const id = crypto.randomUUID()
          set((state) => ({
            sheets: [...state.sheets, { id, name, nodes: [], edges: [], ownerUid: state.myUid, myRole: 'owner' }],
            activeSheetId: id,
            nodes: [],
            edges: [],
            setpoint: null,
            selection: [],
          }))
          return id
        },

        switchSheet: (sheetId) =>
          set((state) => {
            if (sheetId === state.activeSheetId) return {}
            const target = state.sheets.find((sh) => sh.id === sheetId)
            if (!target) return {}
            return {
              activeSheetId: sheetId,
              nodes: target.nodes,
              edges: target.edges,
              setpoint: null,
              selection: [],
            }
          }),

        renameSheet: (sheetId, name) =>
          set((state) => ({
            sheets: state.sheets.map((sh) => (sh.id === sheetId ? { ...sh, name } : sh)),
          })),

        // Guards against deleting the last remaining sheet. Falls back to the
        // first remaining sheet when the deleted one was active.
        deleteSheet: (sheetId) =>
          set((state) => {
            if (state.sheets.length <= 1) return {}
            const remaining = state.sheets.filter((sh) => sh.id !== sheetId)
            if (state.activeSheetId !== sheetId) return { sheets: remaining }
            const fallback = remaining[0]
            return {
              sheets: remaining,
              activeSheetId: fallback.id,
              nodes: fallback.nodes,
              edges: fallback.edges,
              setpoint: null,
              selection: [],
            }
          }),

        // ── Existing graph-editing actions — unchanged call signatures,
        // now routed through applyToActive so they operate on the active
        // sheet while still exposing flat nodes/edges. ─────────────────────
        setNodes: (nodes) => set((state) => applyToActive(state, { nodes })),
        setEdges: (edges) => set((state) => applyToActive(state, { edges })),
        setSelection: (ids) => set({ selection: ids }),
        clearSelection: () => set({ selection: [] }),
        removeSelection: () =>
          set((state) => {
            const ids = new Set(state.selection)
            const nodes = state.nodes.filter((n) => !ids.has(n.id))
            const edges = state.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target))
            return { selection: [], ...applyToActive(state, { nodes, edges }) }
          }),
        duplicateSelection: () =>
          set((state) => {
            const selectedIds = new Set(state.selection)
            const selectedNodes = state.nodes.filter((n) => selectedIds.has(n.id))
            if (selectedNodes.length === 0) return {}
            const OFFSET = 60
            const idMap = new Map(selectedNodes.map((n) => [n.id, nextId()]))
            const newNodes = selectedNodes.map((n) => ({
              ...n,
              id: idMap.get(n.id),
              position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
              selected: true,
            }))
            const newEdges = state.edges
              .filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))
              .map((e) => ({ ...e, id: nextId(), source: idMap.get(e.source), target: idMap.get(e.target) }))
            const nodes = [...state.nodes.map((n) => ({ ...n, selected: false })), ...newNodes]
            const edges = [...state.edges, ...newEdges]
            return { selection: newNodes.map((n) => n.id), ...applyToActive(state, { nodes, edges }) }
          }),
        addNode: (type, position = { x: 100, y: 100 }) =>
          set((state) => {
            const id = nextId()
            const newNode = { id, type, position, data: { label: '', note: '' } }
            return { setpoint: id, ...applyToActive(state, { nodes: [...state.nodes, newNode] }) }
          }),
        updateNodeData: (id, patch) =>
          set((state) => applyToActive(state, {
            nodes: state.nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
            ),
          })),
        removeNode: (id) =>
          set((state) => applyToActive(state, {
            nodes: state.nodes.filter((n) => n.id !== id),
            edges: state.edges.filter((e) => e.source !== id && e.target !== id),
          })),
        connect: (connection) =>
          set((state) => {
            const source = state.nodes.find((n) => n.id === connection.source)
            const target = state.nodes.find((n) => n.id === connection.target)
            const nodes =
              source && target
                ? state.nodes.map((n) =>
                    n.id === target.id
                      ? { ...n, position: computeSnapPosition(source, target, connection.sourceHandle) }
                      : n,
                  )
                : state.nodes
            return applyToActive(state, { nodes, edges: addEdge(connection, state.edges) })
          }),
        removeEdge: (id) =>
          set((state) => applyToActive(state, { edges: state.edges.filter((e) => e.id !== id) })),
        detachNode: (id) =>
          set((state) => applyToActive(state, {
            edges: state.edges.filter((e) => e.source !== id && e.target !== id),
          })),
        importRoadmap: (schema) =>
          set((state) => {
            const { nodes: incoming, edges: incomingEdges } = fromSchema(schema)
            if (incoming.length === 0) return {}
            const maxExistingX = state.nodes.reduce((m, n) => Math.max(m, n.position.x), -Infinity)
            const minIncomingX = incoming.reduce((m, n) => Math.min(m, n.position.x), Infinity)
            const dx = state.nodes.length === 0 ? 0 : maxExistingX + IMPORT_GAP - minIncomingX
            const idMap = new Map(incoming.map((n) => [n.id, nextId()]))
            const mappedNodes = incoming.map((n) => ({
              ...n,
              id: idMap.get(n.id),
              position: { x: n.position.x + dx, y: n.position.y },
            }))
            const mappedEdges = incomingEdges.map((e) => ({
              ...e,
              id: nextId(),
              source: idMap.get(e.source),
              target: idMap.get(e.target),
            }))
            return applyToActive(state, {
              nodes: [...state.nodes, ...mappedNodes],
              edges: [...state.edges, ...mappedEdges],
            })
          }),
      }),
      { name: 'rc-roadmap-store' },
    ),
  )
  ```

- [ ] Step 4: Run it, confirm it passes

  ```bash
  npm test -- src/stores/useRoadmapStore.test.js
  ```
  All 27 pre-existing tests plus the 9 new multi-sheet tests pass.

- [ ] Step 5: Manual verification in `npm run dev`

  N/A for this task alone (no UI wired to the new actions yet — the toolbar/RoadmapPage.jsx wiring happens in Task 6). Confirm instead that the existing Roadmap page still works exactly as before: `npm run dev`, open `/roadmap`, add a Process block, drag it, delete it, export/import a schema file — all should behave identically to before this task (they're all still driving the same top-level `nodes`/`edges`/actions, now backed by the `local-default` sheet).

- [ ] Step 6: Commit

  ```bash
  git add src/stores/useRoadmapStore.js src/stores/useRoadmapStore.test.js
  git commit -m "feat(roadmap): restructure useRoadmapStore for multiple sheets with a top-level compatibility path"
  ```

---

### Task 4: `syncManager.js` per-sheet sync + `sessionBootstrap.js` migration wiring

**Files:** `src/lib/syncManager.js`, `src/lib/syncManager.test.js`, `src/services/sessionBootstrap.js`, `src/services/sessionBootstrap.test.js`

**Interfaces (new, in `syncManager.js`):**
- `pushRoadmapSheetToFirestore(sheetId)`, `hydrateRoadmapSheetFromFirestore(sheetId)`, `armRoadmapSheetSync(sheetId)`, `disarmRoadmapSheetSync()`

**Removed (dead code — nothing must write to `users/{uid}.roadmap` again after this ships):**
- `roadmapSync`, `syncRoadmapToFirestore`, `hydrateRoadmapFromFirestore`, `setRoadmapSyncUser`

**Interfaces (new, in `sessionBootstrap.js`, module-local, not exported):**
- `bootstrapRoadmapSheets(uid, userDoc)` — migrates-if-needed, fetches owned + shared sheets, hydrates the store, arms sync for the active sheet.

- [ ] Step 1: Write the failing test (full code)

  **4a. `src/lib/syncManager.test.js`** — replace the `vi.mock('./db', ...)` block near the top with:
  ```js
  vi.mock('./db', () => ({
    refs: {
      user: (uid) => ({ _path: `users/${uid}` }),
      map:  (uid) => ({ _path: `maps/${uid}` }),
      roadmapSheet: (sheetId) => ({ _path: `roadmapSheets/${sheetId}` }),
    },
  }))
  ```

  Then **delete** the entire `describe('SyncManager (roadmap instance)', ...)` block (it tests the now-removed `users/{uid}.roadmap` sync) and **replace it** with:
  ```js
  describe('SyncManager (roadmap sheet instance)', () => {
    beforeEach(() => {
      setDoc.mockReset()
      getDoc.mockReset()
      useRoadmapStore.setState({
        nodes: [], edges: [], setpoint: null, selection: [],
        sheets: [{ id: 'sheet-a', name: 'Roadmap', nodes: [], edges: [], ownerUid: 'uid-123', myRole: 'owner' }],
        activeSheetId: 'sheet-a',
        myUid: 'uid-123',
      })
      disarmRoadmapSheetSync()
    })

    it('writes nodes and edges to roadmapSheets/{sheetId} with merge:true', async () => {
      const nodes = [{ id: 'n1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Step' } }]
      const edges = [{ id: 'e1', source: 'n1', target: 'n2' }]
      useRoadmapStore.setState((s) => ({
        nodes, edges,
        sheets: s.sheets.map((sh) => (sh.id === 'sheet-a' ? { ...sh, nodes, edges } : sh)),
      }))
      setDoc.mockResolvedValue(undefined)

      await pushRoadmapSheetToFirestore('sheet-a')

      expect(setDoc).toHaveBeenCalledWith(
        { _path: 'roadmapSheets/sheet-a' },
        { nodes, edges, updatedAt: { _type: 'serverTimestamp' } },
        { merge: true },
      )
    })

    it('loads a sheet doc\'s nodes/edges into the store when hydrating', async () => {
      const cloudNodes = [{ id: 'cloud-1', type: 'condition', position: { x: 50, y: 50 }, data: {} }]
      getDoc.mockResolvedValue({ exists: () => true, data: () => ({ nodes: cloudNodes, edges: [] }) })

      await hydrateRoadmapSheetFromFirestore('sheet-a')

      const { nodes, edges } = useRoadmapStore.getState()
      expect(nodes).toEqual(cloudNodes)
      expect(edges).toEqual([])
    })

    it('debounces a write only for the ACTIVE sheet', async () => {
      vi.useFakeTimers()
      setDoc.mockResolvedValue(undefined)
      armRoadmapSheetSync('sheet-a')

      useRoadmapStore.getState().addNode('process')
      expect(setDoc).not.toHaveBeenCalled()

      await vi.runAllTimersAsync()

      expect(setDoc).toHaveBeenCalledWith(
        { _path: 'roadmapSheets/sheet-a' },
        expect.objectContaining({ nodes: expect.any(Array) }),
        { merge: true },
      )
      vi.useRealTimers()
    })

    it('does not write when the caller\'s role on the sheet is "view"', async () => {
      vi.useFakeTimers()
      useRoadmapStore.setState((s) => ({
        sheets: s.sheets.map((sh) => (sh.id === 'sheet-a' ? { ...sh, myRole: 'view' } : sh)),
      }))
      armRoadmapSheetSync('sheet-a')

      useRoadmapStore.getState().addNode('process')
      await vi.runAllTimersAsync()

      expect(setDoc).not.toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('stops writing after disarmRoadmapSheetSync is called', async () => {
      vi.useFakeTimers()
      setDoc.mockResolvedValue(undefined)
      armRoadmapSheetSync('sheet-a')
      disarmRoadmapSheetSync()

      useRoadmapStore.getState().addNode('process')
      await vi.runAllTimersAsync()

      expect(setDoc).not.toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('switching the armed target stops writes to the old sheet and starts writing to the new one', async () => {
      vi.useFakeTimers()
      setDoc.mockResolvedValue(undefined)
      useRoadmapStore.setState((s) => ({
        sheets: [...s.sheets, { id: 'sheet-b', name: 'Other', nodes: [], edges: [], ownerUid: 'uid-123', myRole: 'owner' }],
      }))
      armRoadmapSheetSync('sheet-a')

      useRoadmapStore.getState().switchSheet('sheet-b')
      useRoadmapStore.getState().addNode('process') // mutates sheet-b while target is still sheet-a
      await vi.runAllTimersAsync()
      expect(setDoc).not.toHaveBeenCalled() // guard blocked it: activeSheetId (b) !== armed target (a)

      armRoadmapSheetSync('sheet-b')
      useRoadmapStore.getState().addNode('condition')
      await vi.runAllTimersAsync()
      expect(setDoc).toHaveBeenCalledWith(
        { _path: 'roadmapSheets/sheet-b' },
        expect.anything(),
        { merge: true },
      )
      vi.useRealTimers()
    })
  })
  ```

  And update the top-level import list (the `await import('./syncManager')` block) to import the new names instead of the removed ones:
  ```js
  const {
    syncRoadmapToFirestore: _unused_syncRoadmapToFirestore, // placeholder removed below — see Step 3 note
  } = {}
  ```
  (Do this properly, not as a placeholder: **remove** `syncRoadmapToFirestore, hydrateRoadmapFromFirestore` from the destructured import and **add** `pushRoadmapSheetToFirestore, hydrateRoadmapSheetFromFirestore, armRoadmapSheetSync, disarmRoadmapSheetSync`, e.g.:)
  ```js
  const {
    syncTasksToFirestore,
    hydratePortfolioFromFirestore,
    syncMapToFirestore,
    hydrateMapFromFirestore,
    armMapSync,
    disarmMapSync,
    visitMap,
    returnHome,
    pushRoadmapSheetToFirestore,
    hydrateRoadmapSheetFromFirestore,
    armRoadmapSheetSync,
    disarmRoadmapSheetSync,
  } = await import('./syncManager')
  ```

  **4b. `src/services/sessionBootstrap.test.js`** — replace the entire file:
  ```js
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  const m = vi.hoisted(() => ({
    hydratePortfolio: vi.fn(),
    setPortfolioSyncUser: vi.fn(),
    hydrateTasks: vi.fn(),
    setTaskSyncUser: vi.fn(),
    armRoadmapSheetSync: vi.fn(),
    disarmRoadmapSheetSync: vi.fn(),
    hydrateMap: vi.fn(),
    armMapSync: vi.fn(),
    disarmMapSync: vi.fn(),
    hydrateInventory: vi.fn(),
    setInventorySyncUser: vi.fn(),
    disarmInventorySync: vi.fn(),
    hydrateFarm: vi.fn(),
    armFarmSync: vi.fn(),
    disarmFarmSync: vi.fn(),
    setCoins: vi.fn(),
    setMapOwner: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    hydrateFarmData: vi.fn(),
    hydrateSelect: vi.fn(),
    setRoadmapMyUid: vi.fn(),
    hydrateSheetsAction: vi.fn(),
    migrateLegacyRoadmap: vi.fn(),
  }))

  vi.mock('firebase/firestore', () => ({
    getDoc: (...a) => m.getDoc(...a),
    getDocs: (...a) => m.getDocs(...a),
    setDoc: (...a) => m.setDoc(...a),
  }))
  vi.mock('../lib/farmDataSync', () => ({
    hydrateFarmDataFromFirestore: (...a) => m.hydrateFarmData(...a),
  }))
  vi.mock('../lib/db', () => ({
    refs: {
      user: (uid) => ({ _path: `users/${uid}` }),
      roadmapSheet: (id) => ({ _path: `roadmapSheets/${id}` }),
    },
    shapes: {
      initialUser: () => ({}),
      newRoadmapSheet: ({ ownerUid, name }) => ({
        ownerUid, name, nodes: [], edges: [], order: 0, collaborators: {}, collaboratorUids: [],
      }),
    },
    queries: {
      sheetsSharedWithMe: (uid) => ({ _query: `sheetsSharedWithMe(${uid})` }),
    },
  }))
  vi.mock('../utils/migrateLegacyRoadmap', () => ({
    migrateLegacyRoadmap: (...a) => m.migrateLegacyRoadmap(...a),
  }))
  vi.mock('../stores/useUserStore', () => ({
    useUserStore: { getState: () => ({ setCoins: m.setCoins }) },
  }))
  vi.mock('../stores/useWorldStore', () => ({
    useWorldStore: { getState: () => ({ setMapOwner: m.setMapOwner }) },
  }))
  vi.mock('../stores/useRoadmapStore', () => ({
    useRoadmapStore: { getState: () => ({ setRoadmapMyUid: m.setRoadmapMyUid, hydrateSheets: m.hydrateSheetsAction }) },
  }))
  vi.mock('../utils/syncSelectToFirestore', () => ({
    hydrateSelectStoreFromFirestore: (...a) => m.hydrateSelect(...a),
  }))
  vi.mock('../lib/syncManager', () => ({
    hydratePortfolioFromFirestore: (...a) => m.hydratePortfolio(...a),
    setPortfolioSyncUser: (...a) => m.setPortfolioSyncUser(...a),
    hydrateTasksFromFirestore: (...a) => m.hydrateTasks(...a),
    setTaskSyncUser: (...a) => m.setTaskSyncUser(...a),
    armRoadmapSheetSync: (...a) => m.armRoadmapSheetSync(...a),
    disarmRoadmapSheetSync: (...a) => m.disarmRoadmapSheetSync(...a),
    hydrateMapFromFirestore: (...a) => m.hydrateMap(...a),
    armMapSync: (...a) => m.armMapSync(...a),
    disarmMapSync: (...a) => m.disarmMapSync(...a),
    hydrateInventoryFromFirestore: (...a) => m.hydrateInventory(...a),
    setInventorySyncUser: (...a) => m.setInventorySyncUser(...a),
    disarmInventorySync: (...a) => m.disarmInventorySync(...a),
    hydrateFarmFromFirestore: (...a) => m.hydrateFarm(...a),
    armFarmSync: (...a) => m.armFarmSync(...a),
    disarmFarmSync: (...a) => m.disarmFarmSync(...a),
  }))

  const { bootstrapSession, teardownSession } = await import('./sessionBootstrap')

  describe('bootstrapSession', () => {
    beforeEach(() => {
      vi.resetAllMocks()
      vi.spyOn(console, 'error').mockImplementation(() => {})
      // Default: existing user, already migrated, owns exactly sheet-1, no shares.
      m.getDoc.mockImplementation((ref) =>
        ref._path === 'users/u1'
          ? Promise.resolve({ exists: () => true, data: () => ({ coins: 0, roadmapSheetIds: ['sheet-1'] }) })
          : Promise.resolve({ exists: () => true, id: 'sheet-1', data: () => ({ ownerUid: 'u1', name: 'Roadmap', nodes: [], edges: [] }) }),
      )
      m.getDocs.mockResolvedValue({ docs: [] })
      m.setDoc.mockResolvedValue(undefined)
      m.hydrateFarmData.mockResolvedValue(undefined)
      m.hydrateSelect.mockResolvedValue(undefined)
      m.hydratePortfolio.mockResolvedValue(undefined)
      m.hydrateTasks.mockResolvedValue(undefined)
      m.hydrateMap.mockResolvedValue(undefined)
      m.hydrateInventory.mockResolvedValue(undefined)
      m.hydrateFarm.mockResolvedValue(undefined)
      m.migrateLegacyRoadmap.mockReturnValue(null)
    })

    it('keeps hydrating later stores when an earlier hydration throws', async () => {
      m.hydratePortfolio.mockRejectedValue(new Error('portfolio boom'))

      await bootstrapSession({ uid: 'u1' })

      expect(m.hydrateTasks).toHaveBeenCalledWith('u1')
      expect(m.setTaskSyncUser).toHaveBeenCalledWith('u1')
      expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-1')
    })

    it('hydrates the Personal Map on login', async () => {
      await bootstrapSession({ uid: 'u1' })
      expect(m.hydrateMap).toHaveBeenCalledWith('u1')
    })

    it('keeps hydrating later stores when map hydration throws', async () => {
      m.hydrateMap.mockRejectedValue(new Error('map boom'))
      await bootstrapSession({ uid: 'u1' })
      expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-1')
    })

    it('hydrates inventory and arms its sync writer on login', async () => {
      await bootstrapSession({ uid: 'u1' })
      expect(m.hydrateInventory).toHaveBeenCalledWith('u1')
      expect(m.setInventorySyncUser).toHaveBeenCalledWith('u1')
    })

    it('hydrates farm and arms its sync writer on login', async () => {
      await bootstrapSession({ uid: 'u1' })
      expect(m.hydrateFarm).toHaveBeenCalledWith('u1')
      expect(m.armFarmSync).toHaveBeenCalledWith('u1')
    })

    it('keeps hydrating farm even when inventory hydration throws', async () => {
      m.hydrateInventory.mockRejectedValue(new Error('inventory boom'))
      await bootstrapSession({ uid: 'u1' })
      expect(m.hydrateFarm).toHaveBeenCalledWith('u1')
    })

    it('keeps arming inventory sync even when farm hydration throws', async () => {
      m.hydrateFarm.mockRejectedValueOnce(new Error('farm err'))
      await bootstrapSession({ uid: 'u1' })
      expect(m.setInventorySyncUser).toHaveBeenCalledWith('u1')
      expect(m.armFarmSync).not.toHaveBeenCalled()
    })

    it('sets the current map owner to own uid and arms the map sync writer', async () => {
      await bootstrapSession({ uid: 'u1' })
      expect(m.setMapOwner).toHaveBeenCalledWith('u1')
      expect(m.armMapSync).toHaveBeenCalledWith('u1')
    })

    it('reads the user doc exactly once for ensureUserDoc (coins come from that read)', async () => {
      m.getDoc.mockImplementation((ref) =>
        ref._path === 'users/u1'
          ? Promise.resolve({ exists: () => true, data: () => ({ coins: 42, roadmapSheetIds: ['sheet-1'] }) })
          : Promise.resolve({ exists: () => true, id: 'sheet-1', data: () => ({ ownerUid: 'u1', name: 'Roadmap', nodes: [], edges: [] }) }),
      )

      await bootstrapSession({ uid: 'u1' })

      const userDocReads = m.getDoc.mock.calls.filter(([ref]) => ref._path === 'users/u1')
      expect(userDocReads).toHaveLength(1)
      expect(m.setCoins).toHaveBeenCalledWith(42)
    })

    it('one failing hydration does not block the others', async () => {
      m.hydrateTasks.mockRejectedValueOnce(new Error('boom'))

      await bootstrapSession({ uid: 'u1' })

      expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-1')
      expect(m.setTaskSyncUser).not.toHaveBeenCalled() // arm skipped when its hydrate failed
    })

    it('migrates the legacy roadmap field into sheet #1 when roadmapSheetIds is missing', async () => {
      m.getDoc.mockImplementation((ref) =>
        ref._path === 'users/u1'
          ? Promise.resolve({ exists: () => true, data: () => ({ coins: 0, roadmap: { nodes: [{ id: 'n1' }], edges: [] } }) })
          : Promise.resolve({ exists: () => true, id: 'new-sheet', data: () => ({ ownerUid: 'u1', name: 'Roadmap', nodes: [{ id: 'n1' }], edges: [] }) }),
      )
      m.migrateLegacyRoadmap.mockReturnValue({
        sheetId: 'new-sheet',
        sheetDoc: { ownerUid: 'u1', name: 'Roadmap', nodes: [{ id: 'n1' }], edges: [], order: 0, collaborators: {}, collaboratorUids: [] },
        userDocPatch: { roadmapSheetIds: ['new-sheet'] },
      })

      await bootstrapSession({ uid: 'u1' })

      expect(m.setDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/new-sheet' }, expect.objectContaining({ name: 'Roadmap' }))
      expect(m.setDoc).toHaveBeenCalledWith({ _path: 'users/u1' }, { roadmapSheetIds: ['new-sheet'] }, { merge: true })
      expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('new-sheet')
    })

    it('seeds a fresh empty "Roadmap" sheet for a brand-new user with no legacy data', async () => {
      m.getDoc.mockImplementation((ref) =>
        ref._path === 'users/u1'
          ? Promise.resolve({ exists: () => true, data: () => ({ coins: 0 }) })
          : Promise.resolve({ exists: () => true, id: 'sheet-x', data: () => ({ ownerUid: 'u1', name: 'Roadmap', nodes: [], edges: [] }) }),
      )
      m.migrateLegacyRoadmap.mockReturnValue(null)

      await bootstrapSession({ uid: 'u1' })

      expect(m.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: expect.stringMatching(/^roadmapSheets\//) }),
        expect.objectContaining({ name: 'Roadmap' }),
      )
      expect(m.hydrateSheetsAction).toHaveBeenCalled()
    })

    it('does not attempt migration again when roadmapSheetIds already exists', async () => {
      await bootstrapSession({ uid: 'u1' })

      const sheetWrites = m.setDoc.mock.calls.filter(([ref]) => ref._path?.startsWith('roadmapSheets/'))
      expect(sheetWrites).toHaveLength(0)
      expect(m.migrateLegacyRoadmap).not.toHaveBeenCalled()
    })

    it('hydrates owned sheets and shared-with-me sheets into the roadmap store, activating sheet #1', async () => {
      m.getDocs.mockResolvedValue({
        docs: [{ id: 'shared-1', data: () => ({ ownerUid: 'friend', name: 'Friend Sheet', nodes: [], edges: [], collaborators: { u1: 'edit' } }) }],
      })

      await bootstrapSession({ uid: 'u1' })

      expect(m.setRoadmapMyUid).toHaveBeenCalledWith('u1')
      const [sheetsArg, activeArg] = m.hydrateSheetsAction.mock.calls[0]
      expect(sheetsArg.map((s) => s.id)).toEqual(['sheet-1', 'shared-1'])
      expect(sheetsArg.find((s) => s.id === 'sheet-1').myRole).toBe('owner')
      expect(sheetsArg.find((s) => s.id === 'shared-1').myRole).toBe('edit')
      expect(activeArg).toBe('sheet-1')
      expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-1')
    })
  })

  describe('teardownSession', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('stops every debounced sync writer by passing null', () => {
      teardownSession()
      expect(m.setPortfolioSyncUser).toHaveBeenCalledWith(null)
      expect(m.setTaskSyncUser).toHaveBeenCalledWith(null)
    })

    it('disarms the roadmap sheet sync writer on logout', () => {
      teardownSession()
      expect(m.disarmRoadmapSheetSync).toHaveBeenCalled()
    })

    it('disarms the map sync writer and clears the map owner on logout', () => {
      teardownSession()
      expect(m.disarmMapSync).toHaveBeenCalled()
      expect(m.setMapOwner).toHaveBeenCalledWith(null)
    })

    it('disarms inventory and farm sync writers on logout', () => {
      teardownSession()
      expect(m.disarmInventorySync).toHaveBeenCalled()
      expect(m.disarmFarmSync).toHaveBeenCalled()
    })
  })
  ```

- [ ] Step 2: Run it, confirm it fails

  ```bash
  npm test -- src/lib/syncManager.test.js src/services/sessionBootstrap.test.js
  ```
  Expected failures: `pushRoadmapSheetToFirestore`/`armRoadmapSheetSync`/etc. are undefined (not yet exported from `syncManager.js`); `bootstrapSession` still calls the old `hydrateRoadmapFromFirestore`/`setRoadmapSyncUser` mocks which no longer match the new test's mock shape.

- [ ] Step 3: Minimal implementation (full code)

  **4a.** In `src/lib/syncManager.js`, **delete** this whole block:
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
  and this block:
  ```js
  export const syncRoadmapToFirestore = roadmapSync.push
  export const hydrateRoadmapFromFirestore = roadmapSync.hydrate
  export const setRoadmapSyncUser = roadmapSync.setSyncUser
  ```

  In their place, add (right after the `tasksSync` block, before `portfolioSync`):
  ```js
  // ── Roadmap Sheets ───────────────────────────────────────────────────────────
  // Sheets live at roadmapSheets/{sheetId}, not users/{uid}.roadmap. Reuses
  // createFirestoreSync's existing ref-override + guard mechanics (same
  // precedent as mapSync/farmSync below) — no factory change needed. The
  // factory's generic "uid" parameter is repurposed here to mean "the
  // currently-armed sheetId." Only the ACTIVE sheet syncs at a time: the guard
  // checks both that the sheet is active AND that this user's role on it isn't
  // 'view' (a viewer must never trigger a write, even to someone else's sheet).
  const roadmapSheetSync = createFirestoreSync({
    store: useRoadmapStore,
    logName: 'syncRoadmapSheet',
    ref: refs.roadmapSheet,
    toDoc: ({ nodes, edges }) => ({ nodes, edges, updatedAt: serverTimestamp() }),
    fromDoc: (data) =>
      ('nodes' in data || 'edges' in data) ? { nodes: data.nodes ?? [], edges: data.edges ?? [] } : {},
    changed: (s, p) => s.nodes !== p.nodes || s.edges !== p.edges,
    guard: (state, sheetId) => {
      const sheet = state.sheets.find((sh) => sh.id === sheetId)
      return state.activeSheetId === sheetId && sheet?.myRole !== 'view'
    },
    needsSeed: () => false,
  })

  export const pushRoadmapSheetToFirestore = roadmapSheetSync.push
  export const hydrateRoadmapSheetFromFirestore = roadmapSheetSync.hydrate
  export const armRoadmapSheetSync = (sheetId) => roadmapSheetSync.setSyncUser(sheetId)
  export const disarmRoadmapSheetSync = () => roadmapSheetSync.setSyncUser(null)
  ```

  **4b.** In `src/services/sessionBootstrap.js`:

  Update the imports:
  ```js
  import { getDoc, getDocs, setDoc } from 'firebase/firestore'
  import { refs, shapes, queries } from '../lib/db'
  import { useUserStore } from '../stores/useUserStore'
  import { useWorldStore } from '../stores/useWorldStore'
  import { useRoadmapStore } from '../stores/useRoadmapStore'
  import { hydrateSelectStoreFromFirestore } from '../utils/syncSelectToFirestore'
  import { hydrateFarmDataFromFirestore } from '../lib/farmDataSync.js'
  import { migrateLegacyRoadmap } from '../utils/migrateLegacyRoadmap'
  import {
    hydratePortfolioFromFirestore,
    setPortfolioSyncUser,
    hydrateTasksFromFirestore,
    setTaskSyncUser,
    armRoadmapSheetSync,
    disarmRoadmapSheetSync,
    hydrateMapFromFirestore,
    armMapSync,
    disarmMapSync,
    hydrateInventoryFromFirestore,
    setInventorySyncUser,
    disarmInventorySync,
    hydrateFarmFromFirestore,
    armFarmSync,
    disarmFarmSync,
  } from '../lib/syncManager'
  ```

  Add these two new functions after `ensureUserDoc`:
  ```js
  // Resolve uid's access level on a fetched sheet doc: owner, an explicit
  // collaborator level, or 'view' as the safe default (should not happen once
  // queries.sheetsSharedWithMe has already filtered to docs listing this uid).
  function roleForSheet(sheet, uid) {
    if (sheet.ownerUid === uid) return 'owner'
    return sheet.collaborators?.[uid] ?? 'view'
  }

  /**
   * One-time-per-login bootstrap for Roadmap Sheets:
   *  1. Migrate the legacy users/{uid}.roadmap field into sheet #1 (idempotent
   *     — no-op once roadmapSheetIds exists). A brand-new user with neither
   *     field gets a fresh empty "Roadmap" sheet #1 instead.
   *  2. Fetch every owned sheet (roadmapSheetIds) + every shared-with-me sheet
   *     (collaboratorUids array-contains uid) in parallel.
   *  3. Hydrate them all into useRoadmapStore, activating sheet #1
   *     (roadmapSheetIds[0]) — the sheet the Profile-integration feature reads.
   *  4. Arm the debounced sheet sync for the active sheet.
   */
  async function bootstrapRoadmapSheets(uid, userDoc) {
    useRoadmapStore.getState().setRoadmapMyUid(uid)

    let sheetIds = userDoc?.roadmapSheetIds ?? []

    if (sheetIds.length === 0) {
      const sheetId = crypto.randomUUID()
      const migration = migrateLegacyRoadmap(userDoc, sheetId)
      const sheetDoc = migration ? migration.sheetDoc : shapes.newRoadmapSheet({ ownerUid: uid, name: 'Roadmap' })
      await setDoc(refs.roadmapSheet(sheetId), sheetDoc)
      await setDoc(refs.user(uid), { roadmapSheetIds: [sheetId] }, { merge: true })
      sheetIds = [sheetId]
    }

    const [ownedSnaps, sharedSnap] = await Promise.all([
      Promise.all(sheetIds.map((id) => getDoc(refs.roadmapSheet(id)))),
      getDocs(queries.sheetsSharedWithMe(uid)),
    ])

    const ownedSheets = ownedSnaps
      .filter((snap) => snap.exists())
      .map((snap) => ({ id: snap.id, ...snap.data() }))
    const sharedSheets = sharedSnap.docs
      .filter((d) => d.data().ownerUid !== uid) // safety: never double-list an owned sheet
      .map((d) => ({ id: d.id, ...d.data() }))

    const sheets = [...ownedSheets, ...sharedSheets].map((sheet) => ({
      id: sheet.id,
      name: sheet.name,
      nodes: sheet.nodes ?? [],
      edges: sheet.edges ?? [],
      ownerUid: sheet.ownerUid,
      myRole: roleForSheet(sheet, uid),
    }))

    const activeSheetId = sheetIds[0] ?? sheets[0]?.id ?? null
    useRoadmapStore.getState().hydrateSheets(sheets, activeSheetId)
    if (activeSheetId) armRoadmapSheetSync(activeSheetId)
  }
  ```

  In `bootstrapSession`, replace the `'hydrate/arm roadmap'` step with:
  ```js
      step('bootstrap roadmap sheets', () => bootstrapRoadmapSheets(uid, userData)),
  ```

  In `teardownSession`, replace `setRoadmapSyncUser(null)` with:
  ```js
    disarmRoadmapSheetSync()
  ```

- [ ] Step 4: Run it, confirm it passes

  ```bash
  npm test -- src/lib/syncManager.test.js src/services/sessionBootstrap.test.js
  ```
  All tests pass.

- [ ] Step 5: Manual verification in `npm run dev`

  1. Sign in as an existing test account that has an existing single-document Roadmap with a few blocks on it.
  2. Open `/roadmap` — confirm the existing blocks appear exactly as before (this proves the migration ran and hydrated sheet #1 correctly).
  3. In the Firebase console, confirm a new `roadmapSheets/{someId}` document now exists with `ownerUid` = your uid, `name: "Roadmap"`, and the same nodes/edges you had before — and that `users/{uid}.roadmap` (the legacy field) is still present, untouched.
  4. Confirm `users/{uid}.roadmapSheetIds` is `[thatSameId]`.
  5. Add a new block, wait ~1s, confirm the `roadmapSheets/{someId}` doc's `nodes` field updates in the console (debounced sync working against the new location).
  6. Sign in as a brand-new test account with no prior Roadmap data — confirm it gets a fresh empty `roadmapSheets` doc named "Roadmap" and `roadmapSheetIds` with one entry, with no `roadmap` legacy field ever created.

- [ ] Step 6: Commit

  ```bash
  git add src/lib/syncManager.js src/lib/syncManager.test.js src/services/sessionBootstrap.js src/services/sessionBootstrap.test.js
  git commit -m "feat(roadmap): sync sheets to roadmapSheets/{sheetId}, wire migration into session bootstrap"
  ```

---

### Task 5: Service layer — `src/services/roadmapSheets.js` (create / switch / rename / delete / share)

**Files:** `src/services/roadmapSheets.js` (new), `src/services/roadmapSheets.test.js` (new)

**Interfaces:**
- `createSheetAndSync(name) → Promise<sheetId>`
- `switchSheetAndSync(sheetId) → void`
- `renameSheetAndSync(sheetId, name) → Promise<void>`
- `deleteSheetAndSync(sheetId) → Promise<void>`
- `shareSheet(sheetId, targetUid, level) → Promise<void>` — `level` is `'view'` or `'edit'`; throws if the caller isn't the sheet's owner.

- [ ] Step 1: Write the failing test (full code)

  Create `src/services/roadmapSheets.test.js`:
  ```js
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  const m = vi.hoisted(() => ({
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    arrayUnion: vi.fn((v) => ({ _arrayUnion: v })),
    arrayRemove: vi.fn((v) => ({ _arrayRemove: v })),
    armRoadmapSheetSync: vi.fn(),
  }))

  vi.mock('firebase/firestore', () => ({
    setDoc: (...a) => m.setDoc(...a),
    updateDoc: (...a) => m.updateDoc(...a),
    deleteDoc: (...a) => m.deleteDoc(...a),
    arrayUnion: (...a) => m.arrayUnion(...a),
    arrayRemove: (...a) => m.arrayRemove(...a),
  }))
  vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'alice' } } }))
  vi.mock('../lib/db', () => ({
    refs: {
      user: (uid) => ({ _path: `users/${uid}` }),
      roadmapSheet: (id) => ({ _path: `roadmapSheets/${id}` }),
    },
    shapes: {
      newRoadmapSheet: ({ ownerUid, name, order }) => ({
        ownerUid, name, order, nodes: [], edges: [], collaborators: {}, collaboratorUids: [],
      }),
    },
  }))
  vi.mock('../lib/syncManager', () => ({
    armRoadmapSheetSync: (...a) => m.armRoadmapSheetSync(...a),
  }))

  // Stub localStorage for the zustand persist middleware.
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })

  const { useRoadmapStore } = await import('../stores/useRoadmapStore')
  const {
    createSheetAndSync,
    switchSheetAndSync,
    renameSheetAndSync,
    deleteSheetAndSync,
    shareSheet,
  } = await import('./roadmapSheets')

  describe('roadmapSheets service', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      m.setDoc.mockResolvedValue(undefined)
      m.updateDoc.mockResolvedValue(undefined)
      m.deleteDoc.mockResolvedValue(undefined)
      useRoadmapStore.setState({
        nodes: [], edges: [], setpoint: null, selection: [],
        sheets: [{ id: 'sheet-1', name: 'Roadmap', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' }],
        activeSheetId: 'sheet-1',
        myUid: 'alice',
      })
    })

    it('createSheetAndSync creates the sheet locally, persists it, registers it, and arms sync', async () => {
      const id = await createSheetAndSync('Side Project')

      expect(useRoadmapStore.getState().sheets.find((s) => s.id === id).name).toBe('Side Project')
      expect(m.setDoc).toHaveBeenCalledWith({ _path: `roadmapSheets/${id}` }, expect.objectContaining({ name: 'Side Project', ownerUid: 'alice' }))
      expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'users/alice' }, { roadmapSheetIds: { _arrayUnion: id } })
      expect(m.armRoadmapSheetSync).toHaveBeenCalledWith(id)
    })

    it('switchSheetAndSync flips the active sheet locally and re-arms sync without any Firestore read', async () => {
      useRoadmapStore.setState((s) => ({ sheets: [...s.sheets, { id: 'sheet-2', name: 'Other', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' }] }))

      switchSheetAndSync('sheet-2')

      expect(useRoadmapStore.getState().activeSheetId).toBe('sheet-2')
      expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-2')
      expect(m.setDoc).not.toHaveBeenCalled()
      expect(m.updateDoc).not.toHaveBeenCalled()
    })

    it('renameSheetAndSync updates the store immediately and writes the name directly (not debounced)', async () => {
      await renameSheetAndSync('sheet-1', 'Renamed')

      expect(useRoadmapStore.getState().sheets.find((s) => s.id === 'sheet-1').name).toBe('Renamed')
      expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/sheet-1' }, { name: 'Renamed' })
    })

    it('deleteSheetAndSync deletes the doc, removes it from roadmapSheetIds, and re-arms sync to the fallback sheet', async () => {
      useRoadmapStore.setState((s) => ({ sheets: [...s.sheets, { id: 'sheet-2', name: 'Other', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' }] }))

      await deleteSheetAndSync('sheet-1')

      expect(useRoadmapStore.getState().sheets.find((s) => s.id === 'sheet-1')).toBeUndefined()
      expect(m.deleteDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/sheet-1' })
      expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'users/alice' }, { roadmapSheetIds: { _arrayRemove: 'sheet-1' } })
      expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-2')
    })

    it('deleteSheetAndSync does not re-arm sync when the deleted sheet was not active', async () => {
      useRoadmapStore.setState((s) => ({ sheets: [...s.sheets, { id: 'sheet-2', name: 'Other', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' }] }))

      await deleteSheetAndSync('sheet-2')

      expect(m.armRoadmapSheetSync).not.toHaveBeenCalled()
    })

    it('shareSheet writes both collaborators and collaboratorUids in one update', async () => {
      await shareSheet('sheet-1', 'bob', 'edit')

      expect(m.updateDoc).toHaveBeenCalledWith(
        { _path: 'roadmapSheets/sheet-1' },
        { 'collaborators.bob': 'edit', collaboratorUids: { _arrayUnion: 'bob' } },
      )
    })

    it('shareSheet throws when the caller is not the sheet\'s owner', async () => {
      useRoadmapStore.setState((s) => ({
        sheets: s.sheets.map((sh) => (sh.id === 'sheet-1' ? { ...sh, myRole: 'edit' } : sh)),
      }))

      await expect(shareSheet('sheet-1', 'bob', 'edit')).rejects.toThrow()
      expect(m.updateDoc).not.toHaveBeenCalled()
    })
  })
  ```

- [ ] Step 2: Run it, confirm it fails

  ```bash
  npm test -- src/services/roadmapSheets.test.js
  ```
  Expected failure: cannot find module `./roadmapSheets` — file doesn't exist yet.

- [ ] Step 3: Minimal implementation (full code)

  Create `src/services/roadmapSheets.js`:
  ```js
  import { setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
  import { auth } from '../firebase'
  import { refs, shapes } from '../lib/db'
  import { useRoadmapStore } from '../stores/useRoadmapStore'
  import { armRoadmapSheetSync } from '../lib/syncManager'

  function myUid() {
    const uid = auth.currentUser?.uid
    if (!uid) throw new Error('[roadmapSheets] Not authenticated')
    return uid
  }

  // Create a new sheet locally, persist it, register it on
  // users/{uid}.roadmapSheetIds, and switch the debounced sync target to it.
  // Sheets beyond the first are just extra canvases — they never connect to
  // Profile integration, which reads roadmapSheetIds[0] specifically.
  export async function createSheetAndSync(name) {
    const uid = myUid()
    const id = useRoadmapStore.getState().createSheet(name)
    const order = useRoadmapStore.getState().sheets.length - 1
    const sheetDoc = shapes.newRoadmapSheet({ ownerUid: uid, name, order })
    await setDoc(refs.roadmapSheet(id), sheetDoc)
    await updateDoc(refs.user(uid), { roadmapSheetIds: arrayUnion(id) })
    armRoadmapSheetSync(id)
    return id
  }

  // All of the user's sheets (owned + shared) are already resident in the
  // store (hydrated at session bootstrap), so switching never re-fetches — it
  // just flips the local pointer and re-arms the debounced sync target.
  export function switchSheetAndSync(sheetId) {
    useRoadmapStore.getState().switchSheet(sheetId)
    armRoadmapSheetSync(sheetId)
  }

  // Renames write immediately (not debounced) — infrequent, low-risk, and the
  // sheet-switcher UI needs to reflect the new name right away.
  export async function renameSheetAndSync(sheetId, name) {
    useRoadmapStore.getState().renameSheet(sheetId, name)
    await updateDoc(refs.roadmapSheet(sheetId), { name })
  }

  // Only the owner may delete a sheet (mirrors the Task 7 security rules).
  // Deletes locally first (useRoadmapStore.deleteSheet decides the fallback
  // active sheet), then mirrors the delete to Firestore and re-arms sync to
  // whichever sheet the store now considers active.
  export async function deleteSheetAndSync(sheetId) {
    const uid = myUid()
    const wasActive = useRoadmapStore.getState().activeSheetId === sheetId
    useRoadmapStore.getState().deleteSheet(sheetId)
    await deleteDoc(refs.roadmapSheet(sheetId))
    await updateDoc(refs.user(uid), { roadmapSheetIds: arrayRemove(sheetId) })
    if (wasActive) {
      const newActive = useRoadmapStore.getState().activeSheetId
      if (newActive) armRoadmapSheetSync(newActive)
    }
  }

  // Share a sheet with another app user (drawn from the follow graph — no
  // separate user-search UI, per product decision). Writes BOTH the display
  // map (collaborators) and the denormalized array (collaboratorUids) in one
  // update so they can never drift — collaboratorUids exists solely to support
  // the array-contains query in queries.sheetsSharedWithMe.
  export async function shareSheet(sheetId, targetUid, level) {
    const sheet = useRoadmapStore.getState().sheets.find((s) => s.id === sheetId)
    if (!sheet || sheet.myRole !== 'owner') {
      throw new Error('[roadmapSheets] Only the owner can share a sheet')
    }
    await updateDoc(refs.roadmapSheet(sheetId), {
      [`collaborators.${targetUid}`]: level,
      collaboratorUids: arrayUnion(targetUid),
    })
  }
  ```

- [ ] Step 4: Run it, confirm it passes

  ```bash
  npm test -- src/services/roadmapSheets.test.js
  ```
  All 7 tests pass.

- [ ] Step 5: Manual verification in `npm run dev`

  N/A for this task alone — exercised end-to-end via the UI in Task 6.

- [ ] Step 6: Commit

  ```bash
  git add src/services/roadmapSheets.js src/services/roadmapSheets.test.js
  git commit -m "feat(roadmap): add roadmapSheets service layer for create/switch/rename/delete/share"
  ```

---

### Task 6: Sheet Switcher + Share UI in `RoadmapPage.jsx`

**Files:** `src/pages/RoadmapPage.jsx`, `src/components/roadmap/SheetSwitcher.jsx` (new), `src/components/roadmap/ShareSheetModal.jsx` (new)

**Interfaces:**
- `<SheetSwitcher />` — reads `sheets`/`activeSheetId`/`myRole` of the active sheet from `useRoadmapStore`; renders a horizontally-scrollable pill list of sheet names (tap to switch via `switchSheetAndSync`), a "+" button (`createSheetAndSync`, prompts for a name), a rename affordance (double-tap/long-press opens an inline rename via `renameSheetAndSync`), and a delete affordance (via `deleteSheetAndSync`, disabled when only one sheet remains — mirrors the store's own guard so the button is never shown as clickable when it would no-op).
- `<ShareSheetModal sheetId onClose />` — lists `useSocialStore`'s `following` ∪ `followers` as the sharable pool, lets the owner pick a person + `view`/`edit` level, calls `shareSheet`.
- `RoadmapPage.jsx` gains a `myRole` computed value (`sheets.find(s => s.id === activeSheetId)?.myRole`) that gates: the Add-block toolbar and the Share button are hidden and `nodesDraggable`/`nodesConnectable`/`elementsSelectable` are set to `false` on the `<ReactFlow>` canvas when `myRole === 'view'` — a viewer sees the sheet but cannot edit it, consistent with the sync guard from Task 4 that would silently drop any edits anyway.

  This task is UI-only wiring on top of the fully-tested service layer from Task 5 and store from Task 3 — there is no new pure logic to unit-test here (this repo's `components/roadmap/` folder has no `.test.jsx` files; UI-level correctness here is verified manually per the project's existing convention). Steps 1–4 are therefore folded into the manual verification in Step 5.

- [ ] Step 1: Write the failing test (full code)

  N/A — see note above. Skip directly to implementation; verification is manual (Step 5).

- [ ] Step 2: Run it, confirm it fails

  N/A.

- [ ] Step 3: Minimal implementation (full code)

  Create `src/components/roadmap/SheetSwitcher.jsx`:
  ```jsx
  import { useState } from 'react'
  import { Plus, Share2, Pencil, Trash2 } from 'lucide-react'
  import { useRoadmapStore } from '../../stores/useRoadmapStore'
  import { createSheetAndSync, switchSheetAndSync, renameSheetAndSync, deleteSheetAndSync } from '../../services/roadmapSheets'
  import ShareSheetModal from './ShareSheetModal'

  export default function SheetSwitcher() {
    const sheets = useRoadmapStore((s) => s.sheets)
    const activeSheetId = useRoadmapStore((s) => s.activeSheetId)
    const [shareTarget, setShareTarget] = useState(null)

    const activeSheet = sheets.find((s) => s.id === activeSheetId)
    const canEdit = activeSheet?.myRole !== 'view'

    const handleCreate = () => {
      const name = window.prompt('New sheet name', `Sheet ${sheets.length + 1}`)
      if (name?.trim()) createSheetAndSync(name.trim())
    }

    const handleRename = (sheet) => {
      const name = window.prompt('Rename sheet', sheet.name)
      if (name?.trim() && name.trim() !== sheet.name) renameSheetAndSync(sheet.id, name.trim())
    }

    const handleDelete = (sheet) => {
      if (sheets.length <= 1) return
      if (window.confirm(`Delete "${sheet.name}"? This cannot be undone.`)) deleteSheetAndSync(sheet.id)
    }

    return (
      <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {sheets.map((sheet) => (
          <button
            key={sheet.id}
            onClick={() => switchSheetAndSync(sheet.id)}
            onDoubleClick={() => sheet.myRole === 'owner' && handleRename(sheet)}
            className={[
              'pixel-font text-[9px] px-3 py-1.5 rounded-full whitespace-nowrap transition-all active:scale-95',
              sheet.id === activeSheetId ? 'bg-brand text-white' : 'bg-brand/10 text-ink hover:bg-brand/20',
            ].join(' ')}
            aria-current={sheet.id === activeSheetId}
          >
            {sheet.name}
            {sheet.myRole && sheet.myRole !== 'owner' && <span className="ml-1 opacity-60">({sheet.myRole})</span>}
          </button>
        ))}

        <button onClick={handleCreate} aria-label="New sheet" className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-brand hover:bg-brand/10 active:scale-95 transition-all">
          <Plus size={14} strokeWidth={2.5} />
        </button>

        {activeSheet?.myRole === 'owner' && (
          <>
            <button onClick={() => handleRename(activeSheet)} aria-label="Rename sheet" className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 active:scale-95 transition-all">
              <Pencil size={13} strokeWidth={2.5} />
            </button>
            <button onClick={() => setShareTarget(activeSheet.id)} aria-label="Share sheet" className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 active:scale-95 transition-all">
              <Share2 size={13} strokeWidth={2.5} />
            </button>
            {sheets.length > 1 && (
              <button onClick={() => handleDelete(activeSheet)} aria-label="Delete sheet" className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 active:scale-95 transition-all">
                <Trash2 size={13} strokeWidth={2.5} />
              </button>
            )}
          </>
        )}

        {shareTarget && <ShareSheetModal sheetId={shareTarget} onClose={() => setShareTarget(null)} />}
        {!canEdit && <span className="pixel-font text-[8px] text-gray-400 ml-1">View only</span>}
      </div>
    )
  }
  ```

  Create `src/components/roadmap/ShareSheetModal.jsx`:
  ```jsx
  import { useEffect, useMemo, useState } from 'react'
  import { createPortal } from 'react-dom'
  import { X, Check } from 'lucide-react'
  import { useSocialStore } from '../../stores/useSocialStore'
  import { shareSheet } from '../../services/roadmapSheets'

  // Sharable pool = the union of who I follow and who follows me — reuses the
  // existing follow graph rather than a separate user-search feature, per
  // product decision. No public/unauthenticated link sharing exists.
  export default function ShareSheetModal({ sheetId, onClose }) {
    const following = useSocialStore((s) => s.following)
    const followers = useSocialStore((s) => s.followers)
    const requestUsers = useSocialStore((s) => s.requestUsers)
    const hydrateRequestUsers = useSocialStore((s) => s.hydrateRequestUsers)

    const pool = useMemo(() => [...new Set([...following, ...followers])], [following, followers])

    useEffect(() => {
      const missing = pool.filter((uid) => !requestUsers[uid])
      if (missing.length > 0) hydrateRequestUsers(missing)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pool])

    const [level, setLevel] = useState('view')
    const [sharedWith, setSharedWith] = useState(null)
    const [busy, setBusy] = useState(false)

    const handleShare = async (targetUid) => {
      setBusy(true)
      try {
        await shareSheet(sheetId, targetUid, level)
        setSharedWith(targetUid)
      } finally {
        setBusy(false)
      }
    }

    return createPortal(
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="w-full max-w-sm bg-white rounded-lg shadow-xl flex flex-col overflow-hidden max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <p className="pixel-font text-[11px] font-bold text-gray-800">Share sheet</p>
            <button onClick={onClose} aria-label="ปิด" className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95 transition-all">
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
            <span className="pixel-font text-[9px] text-gray-400">Access:</span>
            {['view', 'edit'].map((lv) => (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                className={[
                  'pixel-font text-[9px] px-3 py-1 rounded-full transition-all',
                  level === lv ? 'bg-brand text-white' : 'bg-brand/10 text-ink',
                ].join(' ')}
              >
                {lv}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {pool.length === 0 && <span className="pixel-font text-[8px] text-gray-300">Follow someone first to share with them.</span>}
            {pool.map((uid) => (
              <button
                key={uid}
                disabled={busy}
                onClick={() => handleShare(uid)}
                className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-100 hover:bg-brand/5 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="pixel-font text-[9px] text-ink">{requestUsers[uid]?.displayName ?? uid}</span>
                {sharedWith === uid && <Check size={14} className="text-green-500" />}
              </button>
            ))}
          </div>
        </div>
      </div>,
      document.body,
    )
  }
  ```

  In `src/pages/RoadmapPage.jsx`:

  Add the import:
  ```js
  import SheetSwitcher from '../components/roadmap/SheetSwitcher'
  ```

  Add, right after the existing `const importRoadmap = ...` line:
  ```js
    const sheets = useRoadmapStore((s) => s.sheets)
    const activeSheetId = useRoadmapStore((s) => s.activeSheetId)
    const canEdit = (sheets.find((s) => s.id === activeSheetId)?.myRole ?? 'owner') !== 'view'
  ```

  Insert `<SheetSwitcher />` in the header, right after the closing `</div>` of the Import/Export button group (still inside the header `<div className="shrink-0 flex ...">`):
  ```jsx
        {/* Sheet switcher */}
        <div className="shrink-0 border-t border-gray-50">
          <SheetSwitcher />
        </div>
  ```
  (placed as a new full-width row directly under the existing header `<div>` block, i.e. as a sibling right after it and before the `{/* Canvas */}` comment)

  Gate the toolbar Panel and canvas interactivity on `canEdit` — wrap the existing "Tool palette" `<Panel position="top-center">...</Panel>` block in `{canEdit && (...)}`, and add these props to the `<ReactFlow>` element:
  ```jsx
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable={canEdit}
  ```

- [ ] Step 4: N/A (see Step 1 note — no automated test for this task)

- [ ] Step 5: Manual verification in `npm run dev`

  1. `npm run dev`, open `/roadmap` as a signed-in user. Confirm the new sheet-switcher row appears under the header, showing one pill ("Roadmap") — the existing blocks still render.
  2. Tap "+", name a new sheet "Test Sheet 2" — confirm the canvas clears to empty and the new pill appears and is highlighted as active.
  3. Add a block on "Test Sheet 2", switch back to "Roadmap" via its pill — confirm the original blocks are still there and the new block is not present on this sheet.
  4. Switch back to "Test Sheet 2" — confirm the block you added is still there (proves in-memory sheet isolation survives switching, matching Task 3's tests).
  5. Double-tap the "Test Sheet 2" pill, rename it to "Renamed Sheet" — confirm the pill label updates and (checking Firebase console) `roadmapSheets/{id}.name` updates immediately.
  6. Tap the delete icon while "Renamed Sheet" is active — confirm it's removed and the view falls back to "Roadmap".
  7. Tap the Share icon on "Roadmap" — confirm the modal lists people you follow/are followed by (seed test follow relationships first if the account has none), pick "edit" level and a person, tap them, confirm the checkmark appears and (in Firebase console) `roadmapSheets/{id}.collaborators.{uid}` = `"edit"` and `collaboratorUids` contains that uid.
  8. Sign in as the person you shared with — confirm their sheet-switcher shows the shared sheet (labeled `(edit)`), they can switch to it and edit nodes, and those edits sync back to the same `roadmapSheets` doc (confirm in console).
  9. Repeat sharing at "view" level with a third test account — confirm that account can switch to the sheet and see it, but the toolbar/Add buttons are hidden, `nodesDraggable` is false (blocks cannot be dragged), and no writes ever land in Firestore from that account's edits (there shouldn't be any edit surface exposed, but double check by inspecting network/console — nothing fires).

- [ ] Step 6: Commit

  ```bash
  git add src/pages/RoadmapPage.jsx src/components/roadmap/SheetSwitcher.jsx src/components/roadmap/ShareSheetModal.jsx
  git commit -m "feat(roadmap): add sheet switcher and share-sheet UI to RoadmapPage"
  ```

---

### Task 7: Firestore security rules for `roadmapSheets/{sheetId}`

**Files:** `firestore.rules`, `test/rules/firestore.rules.test.js`

**Rule summary:**
- Owner (`request.auth.uid == resource.data.ownerUid`): full read/write/delete.
- `edit` collaborator: read + write, but forbidden from touching `ownerUid`, `collaborators`, or `collaboratorUids` (cannot self-promote to owner or add other collaborators).
- `view` collaborator: read-only.
- Everyone else: no access.
- `create`: only as yourself as the owner.

- [ ] Step 1: Write the failing test (full code)

  Append to `test/rules/firestore.rules.test.js` (imports already include `doc, getDoc, setDoc, updateDoc, deleteDoc` — no import changes needed):
  ```js
  describe('Roadmap Sheets rules (roadmapSheets/{sheetId})', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore()
        await setDoc(doc(db, 'roadmapSheets/sheet-1'), {
          ownerUid: 'alice',
          name: 'Roadmap',
          nodes: [],
          edges: [],
          order: 0,
          collaborators: { bob: 'edit', carol: 'view' },
          collaboratorUids: ['bob', 'carol'],
        })
      })
    })

    it('lets the owner read and write freely, including changing collaborators', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(getDoc(doc(alice, 'roadmapSheets/sheet-1')))
      await assertSucceeds(updateDoc(doc(alice, 'roadmapSheets/sheet-1'), {
        nodes: [{ id: 'n1' }],
        collaborators: { bob: 'view', carol: 'view' },
      }))
    })

    it('lets the owner delete their own sheet', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(deleteDoc(doc(alice, 'roadmapSheets/sheet-1')))
    })

    it('lets an edit-collaborator read and write nodes/edges', async () => {
      const bob = testEnv.authenticatedContext('bob').firestore()
      await assertSucceeds(getDoc(doc(bob, 'roadmapSheets/sheet-1')))
      await assertSucceeds(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), { nodes: [{ id: 'n1' }], edges: [] }))
    })

    it('BLOCKS an edit-collaborator from changing ownerUid', async () => {
      const bob = testEnv.authenticatedContext('bob').firestore()
      await assertFails(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), { ownerUid: 'bob' }))
    })

    it('BLOCKS an edit-collaborator from adding another collaborator', async () => {
      const bob = testEnv.authenticatedContext('bob').firestore()
      await assertFails(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), {
        collaborators: { bob: 'edit', carol: 'view', dave: 'edit' },
      }))
      await assertFails(updateDoc(doc(bob, 'roadmapSheets/sheet-1'), {
        collaboratorUids: ['bob', 'carol', 'dave'],
      }))
    })

    it('lets a view-collaborator read but BLOCKS any write', async () => {
      const carol = testEnv.authenticatedContext('carol').firestore()
      await assertSucceeds(getDoc(doc(carol, 'roadmapSheets/sheet-1')))
      await assertFails(updateDoc(doc(carol, 'roadmapSheets/sheet-1'), { nodes: [{ id: 'n1' }] }))
    })

    it('BLOCKS a non-collaborator from reading or writing', async () => {
      const eve = testEnv.authenticatedContext('eve').firestore()
      await assertFails(getDoc(doc(eve, 'roadmapSheets/sheet-1')))
      await assertFails(updateDoc(doc(eve, 'roadmapSheets/sheet-1'), { nodes: [] }))
    })

    it('BLOCKS an unauthenticated user from reading', async () => {
      const anon = testEnv.unauthenticatedContext().firestore()
      await assertFails(getDoc(doc(anon, 'roadmapSheets/sheet-1')))
    })

    it('lets a signed-in user create a new sheet they own', async () => {
      const dave = testEnv.authenticatedContext('dave').firestore()
      await assertSucceeds(setDoc(doc(dave, 'roadmapSheets/sheet-2'), {
        ownerUid: 'dave', name: 'Roadmap', nodes: [], edges: [], order: 0,
        collaborators: {}, collaboratorUids: [],
      }))
    })

    it('BLOCKS creating a sheet owned by someone else', async () => {
      const dave = testEnv.authenticatedContext('dave').firestore()
      await assertFails(setDoc(doc(dave, 'roadmapSheets/sheet-3'), {
        ownerUid: 'alice', name: 'Hijack', nodes: [], edges: [], order: 0,
        collaborators: {}, collaboratorUids: [],
      }))
    })
  })
  ```

- [ ] Step 2: Run it, confirm it fails

  ```bash
  npm run test:rules
  ```
  Expected failure: every `roadmapSheets` assertion fails (no `match /roadmapSheets/{sheetId}` block exists yet, so Firestore's default-deny applies — the `assertSucceeds` cases fail).

- [ ] Step 3: Minimal implementation (full code)

  In `firestore.rules`, add this block inside `service cloud.firestore { match /databases/{database}/documents { ... } }`, after the closing `}` of the `match /maps/{ownerUid} { ... }` block:
  ```
      // Roadmap Sheets — one document per user-created canvas. Owner has full
      // control; an 'edit' collaborator may write nodes/edges but can never
      // touch ownerUid/collaborators/collaboratorUids (no self-promotion, no
      // adding other collaborators); a 'view' collaborator gets read-only.
      match /roadmapSheets/{sheetId} {
        function isSheetOwner() {
          return isSignedIn() && request.auth.uid == resource.data.ownerUid;
        }
        function isSheetCollaborator() {
          return isSignedIn() && request.auth.uid in resource.data.collaborators;
        }
        function isEditCollaborator() {
          return isSheetCollaborator() && resource.data.collaborators[request.auth.uid] == 'edit';
        }

        allow read: if isSheetOwner() || isSheetCollaborator();
        allow create: if isSignedIn() && request.auth.uid == request.resource.data.ownerUid;
        allow update: if isSheetOwner() ||
          (isEditCollaborator() &&
            !request.resource.data.diff(resource.data).affectedKeys()
              .hasAny(['ownerUid', 'collaborators', 'collaboratorUids']));
        allow delete: if isSheetOwner();
      }
  ```

- [ ] Step 4: Run it, confirm it passes

  ```bash
  npm run test:rules
  ```
  All new + existing rules tests pass.

- [ ] Step 5: Manual verification in `npm run dev`

  N/A for the rules themselves (covered by the emulator test suite); already exercised end-to-end against real Firestore in Task 6 Step 5's manual verification (share as edit/view, confirm access boundaries hold). Before deploying, diff this rules file against the live console rules per the file's own header comment, then:
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] Step 6: Commit

  ```bash
  git add firestore.rules test/rules/firestore.rules.test.js
  git commit -m "feat(roadmap): add Firestore security rules for roadmapSheets/{sheetId} with owner/edit/view access"
  ```

---

## Self-Review

- All 6 requested decompose items are covered: (1) schema → Task 1, (2) migration → Task 2, (3) store restructuring → Task 3, (4) sync → Task 4, (5) sharing UI + data → split across Task 5 (service layer) and Task 6 (UI), (6) security rules → Task 7.
- Dependency order is schema → migration → store → sync/bootstrap → service layer → UI → rules; each task only uses names/shapes already established by an earlier task.
- `roadmapSheets`, `roadmapSheetIds`, `collaborators`, `collaboratorUids` are spelled identically in `db.js`, `migrateLegacyRoadmap.js`, `useRoadmapStore.js`, `syncManager.js`, `sessionBootstrap.js`, `roadmapSheets.js` (service), the UI components, `firestore.rules`, and both test suites.
- The legacy `users/{uid}.roadmap` field is written once at creation (`shapes.initialUser` — unaffected) and by the pre-existing (now-removed) `roadmapSync`; after this plan ships, nothing ever writes to it again, and `migrateLegacyRoadmap` never deletes it — confirmed by a dedicated test ("never mutates the input userDoc").
- No other field on `users/{uid}` is touched: `db.test.js`'s existing `shapes.initialUser`/`shapes.profileFields`/`shapes.readProfile` tests are untouched by this plan; the only new field is `roadmapSheetIds`.
- Compatibility path is explicit and tested: `useRoadmapStore`'s 27 pre-existing tests pass unchanged against the new internals, plus 9 new multi-sheet tests covering the exact three scenarios called for (no data loss on switch, sheet isolation on mutation, sensible fallback on delete-active) plus the last-sheet-deletion guard.
