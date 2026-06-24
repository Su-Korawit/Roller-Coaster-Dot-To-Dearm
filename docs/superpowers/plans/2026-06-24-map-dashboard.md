# Map Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins upload unlimited maps and configure each one (spawn, capabilities, tilesets, portals) through a Map Dashboard, with a generic Phaser scene that runs any uploaded map and portals between them.

**Architecture:** Collapse the two hardcoded Phaser scenes (`GameScene`, `IndoorScene`) into one generic `MapScene` parameterized by `mapKey`. Maps are driven by data: the Firestore `mapConfigs` collection becomes the map registry (one doc per map). Map switching happens via a `Portals` object layer where each rectangle carries `target`/`targetSpawn` properties; landing points come from a named `Spawns` object layer. Presence and decorations gain a `mapKey` dimension so each user keeps a personal multi-map world. Admin tooling (upload + validate + per-map settings + Phaser preview) and an in-app docs page round it out.

**Tech Stack:** React 19 + Vite, JavaScript/JSX (no TypeScript), Phaser 3.88, Firebase (Firestore + Storage + RTDB), Zustand, Tailwind v4, Vitest.

## Global Constraints

- **No TypeScript.** JavaScript + JSX only. No `tsconfig`, no type annotations.
- **Styling:** Tailwind v4 via `@tailwindcss/vite`. No `tailwind.config`, no PostCSS files. Use the existing `brand` / `brand-strong` color tokens.
- **UI copy is Thai** (match existing admin components, e.g. `MapConfigEditor.jsx`).
- **State:** Zustand, one store per concern, selector pattern `useStore((s) => s.x)`, verb setters.
- **Tests:** Vitest. Pure logic gets red-green-refactor TDD. Phaser scenes and Phaser-embedding React components are NOT unit-tested (jsdom has no canvas/WebGL) — they get explicit manual verification steps.
- **Map key is an immutable slug.** Only `displayName` is renameable. Portals reference the key forever.
- **Backward compatibility:** existing `test3` and `indoor` maps must keep working throughout. They get migrated into the new registry/model, never broken.
- **Commits:** commit in logical stages as each task completes (per project convention).

---

## File Structure

**New (pure logic — TDD'd):**
- `src/utils/tiledMapMeta.js` — parse a Tiled JSON into `{ spawns, defaultSpawnName, portals, tilesetNames, width, height }`.
- `src/utils/resolveTilesets.js` — auto-match tileset names to Storage paths from a file listing.
- `src/utils/validateMap.js` — hard-error / soft-warning validation of an uploaded map.
- `src/utils/mapSlug.js` — slugify a display name into a unique immutable key.

**New (UI / glue — manual verify):**
- `src/components/admin/MapDashboard.jsx` — map list + upload + delete-with-guard; hosts MapInfoScreen.
- `src/components/admin/MapInfoScreen.jsx` — per-map settings: preview, default-spawn picker, capability toggles, displayName, tileset resolution, save.
- `src/components/admin/MapPreview.jsx` — read-only Phaser instance rendering a map with spawn/portal overlays.
- `src/data/mapDocs/tiled-guide.md` — the authoring guide content.
- `src/components/admin/MapDocsPanel.jsx` — renders the guide markdown in-app.

**Modified:**
- `src/utils/mapConfig.js` — add registry fields + `listMapConfigs()`.
- `src/lib/presence.js` — key presence paths by `mapKey`.
- `src/lib/syncManager.js` — decorations stored per `mapKey`.
- `src/stores/useWorldStore.js` — add `currentMapKey`; decorations scoped to current map.
- `src/game/worldScenes.js` — replace both scenes with generic `MapScene`; lazy per-map loading; portal/spawn/capability driven by data; preview mode.
- `src/components/GameCanvas.jsx` — boot `MapScene`; switch via `scene.restart`; presence keyed by mapKey.
- `src/components/admin/AssetsSection.jsx` — replace the hardcoded `MapsPanel` with `MapDashboard`.

---

## Phase A — Pure data utilities (foundation, fully TDD'd)

These modules have zero Phaser/React/Firebase dependency and are the correctness-critical core. Build and test them first; everything else consumes them.

### Task A1: Map slug generator

**Files:**
- Create: `src/utils/mapSlug.js`
- Test: `src/utils/mapSlug.test.js`

**Interfaces:**
- Produces: `slugify(name: string): string` — lowercase, spaces→`_`, strip non `[a-z0-9_]`, collapse repeats, trim leading/trailing `_`. `uniqueSlug(name: string, existingKeys: string[]): string` — `slugify` then append `_2`, `_3`… until unique.

- [ ] **Step 1: Write the failing test**

```js
// src/utils/mapSlug.test.js
import { describe, it, expect } from 'vitest'
import { slugify, uniqueSlug } from './mapSlug'

describe('slugify', () => {
  it('lowercases and replaces spaces with underscores', () => {
    expect(slugify('Mystic Forest')).toBe('mystic_forest')
  })
  it('strips characters outside [a-z0-9_]', () => {
    expect(slugify('Cave #2!')).toBe('cave_2')
  })
  it('collapses repeated separators and trims edges', () => {
    expect(slugify('  --Hello   World--  ')).toBe('hello_world')
  })
  it('returns "map" for an all-symbol name', () => {
    expect(slugify('!!!')).toBe('map')
  })
})

describe('uniqueSlug', () => {
  it('returns the plain slug when unused', () => {
    expect(uniqueSlug('Forest', ['cave'])).toBe('forest')
  })
  it('suffixes _2 on first collision', () => {
    expect(uniqueSlug('Forest', ['forest'])).toBe('forest_2')
  })
  it('increments until free', () => {
    expect(uniqueSlug('Forest', ['forest', 'forest_2'])).toBe('forest_3')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/mapSlug.test.js`
Expected: FAIL — "Failed to resolve import './mapSlug'".

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/mapSlug.js
// Turn a human display name into a safe, immutable map key.
export function slugify(name) {
  const s = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  return s || 'map'
}

// slugify then append _2, _3... until the key is not in existingKeys.
export function uniqueSlug(name, existingKeys = []) {
  const base = slugify(name)
  if (!existingKeys.includes(base)) return base
  let n = 2
  while (existingKeys.includes(`${base}_${n}`)) n++
  return `${base}_${n}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/mapSlug.test.js`
Expected: PASS (9 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/utils/mapSlug.js src/utils/mapSlug.test.js
git commit -m "feat(maps): add map slug generator for immutable keys"
```

---

### Task A2: Tiled map metadata parser

Parses a Tiled JSON (already `JSON.parse`d) into the structured data the scene and UI need. The Tiled object-layer shape: `map.layers` is an array; an object layer has `type: 'objectgroup'` and `objects: [{ name, x, y, width, height, properties: [{name, value}] }]`.

**Files:**
- Create: `src/utils/tiledMapMeta.js`
- Test: `src/utils/tiledMapMeta.test.js`

**Interfaces:**
- Consumes: a parsed Tiled map object.
- Produces: `parseMapMeta(map): { width, height, tilesetNames: string[], spawns: Array<{name, x, y, isDefault}>, defaultSpawnName: string|null, portals: Array<{x, y, width, height, target: string|null, targetSpawn: string|null}> }`. Spawns come from the object layer named `Spawns`; a spawn is default when its `properties` contains `{name:'default', value:true}`. If none flagged, the first spawn is `defaultSpawnName`. Portals come from the object layer named `Portals`; `target`/`targetSpawn` read from each object's `properties`.

- [ ] **Step 1: Write the failing test**

```js
// src/utils/tiledMapMeta.test.js
import { describe, it, expect } from 'vitest'
import { parseMapMeta } from './tiledMapMeta'

const sampleMap = {
  width: 80, height: 60,
  tilesets: [{ name: 'Grass' }, { name: 'Water' }],
  layers: [
    { name: 'Ground', type: 'tilelayer' },
    {
      name: 'Spawns', type: 'objectgroup',
      objects: [
        { name: 'entry', x: 100, y: 200, properties: [{ name: 'default', value: true }] },
        { name: 'south_gate', x: 300, y: 400 },
      ],
    },
    {
      name: 'Portals', type: 'objectgroup',
      objects: [
        {
          name: 'p1', x: 10, y: 20, width: 16, height: 16,
          properties: [{ name: 'target', value: 'cave' }, { name: 'targetSpawn', value: 'entry' }],
        },
      ],
    },
  ],
}

describe('parseMapMeta', () => {
  it('reads map dimensions and tileset names', () => {
    const m = parseMapMeta(sampleMap)
    expect(m.width).toBe(80)
    expect(m.height).toBe(60)
    expect(m.tilesetNames).toEqual(['Grass', 'Water'])
  })
  it('reads named spawns and marks the default-flagged one', () => {
    const m = parseMapMeta(sampleMap)
    expect(m.spawns).toEqual([
      { name: 'entry', x: 100, y: 200, isDefault: true },
      { name: 'south_gate', x: 300, y: 400, isDefault: false },
    ])
    expect(m.defaultSpawnName).toBe('entry')
  })
  it('falls back to the first spawn when none flagged default', () => {
    const map = { ...sampleMap, layers: [
      { name: 'Spawns', type: 'objectgroup', objects: [{ name: 'a', x: 1, y: 1 }, { name: 'b', x: 2, y: 2 }] },
    ] }
    expect(parseMapMeta(map).defaultSpawnName).toBe('a')
  })
  it('reads portal target and targetSpawn from properties', () => {
    const m = parseMapMeta(sampleMap)
    expect(m.portals).toEqual([
      { x: 10, y: 20, width: 16, height: 16, target: 'cave', targetSpawn: 'entry' },
    ])
  })
  it('returns empty spawns/portals and null default when layers absent', () => {
    const m = parseMapMeta({ width: 10, height: 10, tilesets: [], layers: [] })
    expect(m.spawns).toEqual([])
    expect(m.portals).toEqual([])
    expect(m.defaultSpawnName).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/tiledMapMeta.test.js`
Expected: FAIL — cannot resolve `./tiledMapMeta`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/tiledMapMeta.js
// Extract the spawn/portal/tileset metadata the game + dashboard need from a
// parsed Tiled JSON. Pure: no Phaser, no IO.

function propValue(obj, key) {
  const p = (obj.properties || []).find((pr) => pr.name === key)
  return p ? p.value : null
}

function objectLayer(map, name) {
  return (map.layers || []).find((l) => l.name === name && l.type === 'objectgroup') || null
}

export function parseMapMeta(map) {
  const tilesetNames = (map.tilesets || []).map((t) => t.name)

  const spawnLayer = objectLayer(map, 'Spawns')
  const spawns = (spawnLayer?.objects || []).map((o) => ({
    name: o.name,
    x: o.x,
    y: o.y,
    isDefault: propValue(o, 'default') === true,
  }))
  const flagged = spawns.find((s) => s.isDefault)
  const defaultSpawnName = flagged?.name ?? spawns[0]?.name ?? null

  const portalLayer = objectLayer(map, 'Portals')
  const portals = (portalLayer?.objects || []).map((o) => ({
    x: o.x,
    y: o.y,
    width: o.width,
    height: o.height,
    target: propValue(o, 'target'),
    targetSpawn: propValue(o, 'targetSpawn'),
  }))

  return {
    width: map.width,
    height: map.height,
    tilesetNames,
    spawns,
    defaultSpawnName,
    portals,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/tiledMapMeta.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/tiledMapMeta.js src/utils/tiledMapMeta.test.js
git commit -m "feat(maps): parse spawns/portals/tilesets from Tiled JSON"
```

---

### Task A3: Tileset auto-matcher

Given the tileset names a map needs and a flat list of existing Storage file paths (e.g. `['sprites/tilesets/Grass.png', 'sprites/objects/Chest.png']`), auto-resolve each name to a path by filename match (case-insensitive, spaces↔underscores tolerant).

**Files:**
- Create: `src/utils/resolveTilesets.js`
- Test: `src/utils/resolveTilesets.test.js`

**Interfaces:**
- Produces: `autoMatchTilesets(names: string[], storagePaths: string[]): { matched: Record<string,string>, unmatched: string[] }`. A name matches a path when the path's basename without extension equals the name after both are normalized via `norm(s) = s.toLowerCase().replace(/[\s_]+/g,'')`.

- [ ] **Step 1: Write the failing test**

```js
// src/utils/resolveTilesets.test.js
import { describe, it, expect } from 'vitest'
import { autoMatchTilesets } from './resolveTilesets'

const paths = [
  'sprites/tilesets/Grass.png',
  'sprites/tilesets/Tilled_Dirt.png',
  'sprites/objects/Wood_Bridge.png',
]

describe('autoMatchTilesets', () => {
  it('matches exact basename ignoring extension', () => {
    const r = autoMatchTilesets(['Grass'], paths)
    expect(r.matched).toEqual({ Grass: 'sprites/tilesets/Grass.png' })
    expect(r.unmatched).toEqual([])
  })
  it('matches across space/underscore and case differences', () => {
    const r = autoMatchTilesets(['Tilled Dirt'], paths)
    expect(r.matched).toEqual({ 'Tilled Dirt': 'sprites/tilesets/Tilled_Dirt.png' })
  })
  it('reports names with no matching file as unmatched', () => {
    const r = autoMatchTilesets(['Grass', 'Lava'], paths)
    expect(r.matched).toEqual({ Grass: 'sprites/tilesets/Grass.png' })
    expect(r.unmatched).toEqual(['Lava'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/resolveTilesets.test.js`
Expected: FAIL — cannot resolve `./resolveTilesets`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/resolveTilesets.js
// Auto-resolve Tiled tileset names to existing Storage paths by filename.
// Pure: caller supplies the path listing.

const norm = (s) => String(s).toLowerCase().replace(/[\s_]+/g, '')

function baseNoExt(path) {
  const file = path.split('/').pop() || ''
  return file.replace(/\.[^.]+$/, '')
}

export function autoMatchTilesets(names, storagePaths) {
  const byNorm = new Map()
  for (const p of storagePaths) {
    const key = norm(baseNoExt(p))
    if (!byNorm.has(key)) byNorm.set(key, p) // first wins; deterministic on caller order
  }
  const matched = {}
  const unmatched = []
  for (const name of names) {
    const hit = byNorm.get(norm(name))
    if (hit) matched[name] = hit
    else unmatched.push(name)
  }
  return { matched, unmatched }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/resolveTilesets.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/resolveTilesets.js src/utils/resolveTilesets.test.js
git commit -m "feat(maps): auto-match tileset names to storage paths"
```

---

### Task A4: Upload validator

Validate a parsed map + its resolved tilesets against the documented schema. Hard errors block the upload (the map would crash); soft warnings are advisory (still allowed). Consumes `parseMapMeta` (A2) and `autoMatchTilesets` (A3) output.

**Files:**
- Create: `src/utils/validateMap.js`
- Test: `src/utils/validateMap.test.js`

**Interfaces:**
- Consumes: `parseMapMeta` result, the `unmatched` tileset names from A3, and `existingMapKeys: string[]`.
- Produces: `validateMap({ meta, unmatchedTilesets, existingMapKeys }): { errors: string[], warnings: string[] }`. Hard errors: no `Spawns` layer / no spawns at all; no default spawn resolvable; any unmatched tileset. Warnings: a portal whose `target` is not in `existingMapKeys`; a portal missing `target`; zero portals.

- [ ] **Step 1: Write the failing test**

```js
// src/utils/validateMap.test.js
import { describe, it, expect } from 'vitest'
import { validateMap } from './validateMap'

const okMeta = {
  spawns: [{ name: 'entry', x: 0, y: 0, isDefault: true }],
  defaultSpawnName: 'entry',
  portals: [{ x: 0, y: 0, width: 16, height: 16, target: 'cave', targetSpawn: 'entry' }],
}

describe('validateMap', () => {
  it('passes a well-formed map (target exists)', () => {
    const r = validateMap({ meta: okMeta, unmatchedTilesets: [], existingMapKeys: ['cave'] })
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
  })
  it('hard-errors when there are no spawns', () => {
    const r = validateMap({ meta: { spawns: [], defaultSpawnName: null, portals: [] }, unmatchedTilesets: [], existingMapKeys: [] })
    expect(r.errors.some((e) => e.includes('Spawns'))).toBe(true)
  })
  it('hard-errors on unmatched tilesets', () => {
    const r = validateMap({ meta: okMeta, unmatchedTilesets: ['Lava'], existingMapKeys: ['cave'] })
    expect(r.errors.some((e) => e.includes('Lava'))).toBe(true)
  })
  it('warns when a portal target does not exist yet', () => {
    const r = validateMap({ meta: okMeta, unmatchedTilesets: [], existingMapKeys: [] })
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => w.includes('cave'))).toBe(true)
  })
  it('warns when the map has no portals', () => {
    const r = validateMap({ meta: { ...okMeta, portals: [] }, unmatchedTilesets: [], existingMapKeys: [] })
    expect(r.warnings.some((w) => w.toLowerCase().includes('portal'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/validateMap.test.js`
Expected: FAIL — cannot resolve `./validateMap`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/validateMap.js
// Validate an uploaded map. Hard errors block; warnings are advisory.
// Messages are Thai-facing (shown in the dashboard).

export function validateMap({ meta, unmatchedTilesets = [], existingMapKeys = [] }) {
  const errors = []
  const warnings = []

  if (!meta.spawns || meta.spawns.length === 0) {
    errors.push('ไม่พบ Spawns layer หรือไม่มีจุด spawn — ผู้เล่นจะไม่มีที่เกิด')
  } else if (!meta.defaultSpawnName) {
    errors.push('ไม่มีจุด spawn ที่เป็น default')
  }

  for (const name of unmatchedTilesets) {
    errors.push(`Tileset "${name}" ยังหา asset ไม่เจอ — เลือกหรืออัปโหลดก่อน`)
  }

  if (!meta.portals || meta.portals.length === 0) {
    warnings.push('แมพนี้ไม่มี Portals layer (เป็นแมพปลายทางอย่างเดียว — ออกไม่ได้)')
  }
  for (const p of meta.portals || []) {
    if (!p.target) {
      warnings.push('มี portal ที่ยังไม่ได้ตั้ง target')
    } else if (!existingMapKeys.includes(p.target)) {
      warnings.push(`portal ชี้ไปแมพ "${p.target}" ที่ยังไม่มี (อัปโหลดทีหลังได้)`)
    }
  }

  return { errors, warnings }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/validateMap.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/validateMap.js src/utils/validateMap.test.js
git commit -m "feat(maps): validate uploaded maps (block hard, warn soft)"
```

---

## Phase B — Data model: registry, presence, decorations

Extend the persistence layer so maps form a registry and presence/decorations gain a `mapKey` dimension. **Backward compatibility is mandatory** — `test3`/`indoor` keep working.

### Task B1: Extend mapConfig with registry fields + listing

**Files:**
- Modify: `src/utils/mapConfig.js`
- Test: `src/utils/mapConfig.test.js` (create)

**Interfaces:**
- Produces:
  - `getMapConfig(key)` now also returns `displayName, order, isEntry, defaultSpawn, multiplayer, editable` (with defaults so existing docs don't break).
  - `saveMapConfig(key, { tilesets, collision, hidden, displayName, order, isEntry, defaultSpawn, multiplayer, editable }, uid)` persists the new fields.
  - New `listMapConfigs(): Promise<Array<{ key, displayName, order, isEntry, ... }>>` — reads all docs in the `mapConfigs` collection, sorted by `order` then `key`.
  - New pure helper `pickEntryKey(maps): string|null` — the key with `isEntry === true`, else the first by order, else null.

The pure `pickEntryKey` is the only unit-tested part (Firestore reads are integration-verified manually); keep it exported and pure.

- [ ] **Step 1: Write the failing test**

```js
// src/utils/mapConfig.test.js
import { describe, it, expect } from 'vitest'
import { pickEntryKey } from './mapConfig'

describe('pickEntryKey', () => {
  it('returns the map flagged isEntry', () => {
    expect(pickEntryKey([
      { key: 'a', order: 1, isEntry: false },
      { key: 'b', order: 2, isEntry: true },
    ])).toBe('b')
  })
  it('falls back to lowest order when none flagged', () => {
    expect(pickEntryKey([
      { key: 'a', order: 5 },
      { key: 'b', order: 2 },
    ])).toBe('b')
  })
  it('returns null for an empty registry', () => {
    expect(pickEntryKey([])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/mapConfig.test.js`
Expected: FAIL — `pickEntryKey` is not exported.

- [ ] **Step 3: Implement the changes**

In `src/utils/mapConfig.js`:

a) Add `collection, getDocs` to the firestore import:
```js
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'
```

b) Replace the body of `getMapConfig` to include the new fields with defaults:
```js
export async function getMapConfig(key) {
  const base = DEFAULT_MAP_CONFIGS[key] ?? { tilesets: {}, collision: {}, hidden: {} }
  const fallback = {
    tilesets: base.tilesets ?? {},
    collision: base.collision ?? {},
    hidden: base.hidden ?? {},
    displayName: key,
    order: 0,
    isEntry: key === 'test3',   // preserve test3 as the original home map
    defaultSpawn: null,
    multiplayer: key === 'test3',
    editable: key === 'test3',
  }
  try {
    const snap = await getDoc(cfgRef(key))
    if (!snap.exists()) return fallback
    const d = snap.data()
    return {
      tilesets: d.tilesets ?? fallback.tilesets,
      collision: d.collision ?? {},
      hidden: d.hidden ?? {},
      displayName: d.displayName ?? fallback.displayName,
      order: d.order ?? fallback.order,
      isEntry: d.isEntry ?? fallback.isEntry,
      defaultSpawn: d.defaultSpawn ?? fallback.defaultSpawn,
      multiplayer: d.multiplayer ?? fallback.multiplayer,
      editable: d.editable ?? fallback.editable,
    }
  } catch {
    return fallback
  }
}
```

c) Replace `saveMapConfig` to persist the new fields:
```js
export async function saveMapConfig(key, cfg, uid) {
  if (!uid) console.warn('[saveMapConfig] no uid passed — updatedBy will be null (audit trail lost)')
  const { tilesets, collision, hidden, displayName, order, isEntry, defaultSpawn, multiplayer, editable } = cfg
  await setDoc(
    cfgRef(key),
    {
      tilesets, collision, hidden,
      displayName, order, isEntry, defaultSpawn, multiplayer, editable,
      updatedAt: serverTimestamp(), updatedBy: uid ?? null,
    },
    { merge: true },
  )
}
```

d) Add the listing + pure entry picker at the end of the file:
```js
// List every map in the registry, sorted by order then key.
export async function listMapConfigs() {
  const snap = await getDocs(collection(db, 'mapConfigs'))
  const maps = snap.docs.map((d) => ({ key: d.id, ...d.data() }))
  maps.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.key.localeCompare(b.key))
  return maps
}

// Pure: choose which map loads on boot.
export function pickEntryKey(maps) {
  if (!maps || maps.length === 0) return null
  const flagged = maps.find((m) => m.isEntry === true)
  if (flagged) return flagged.key
  return [...maps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0].key
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/mapConfig.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/mapConfig.js src/utils/mapConfig.test.js
git commit -m "feat(maps): registry fields + listMapConfigs + pickEntryKey"
```

---

### Task B2: Key presence by mapKey

Presence rooms become per-(owner, map): `worlds/{ownerUid}/maps/{mapKey}/players/{selfUid}`. Update `presence.js` and its callers' signatures. The existing `presence.test.js` will need its expected paths updated.

**Files:**
- Modify: `src/lib/presence.js`
- Modify: `src/lib/presence.test.js`

**Interfaces:**
- Produces (new signatures):
  - `joinWorld(ownerUid, mapKey, selfUid, selfState)`
  - `leaveWorld(ownerUid, mapKey, selfUid)`
  - `subscribeWorldPlayers(ownerUid, mapKey, cb)`
  - `updateSelf(ownerUid, mapKey, selfUid, partial)`

- [ ] **Step 1: Update the test to assert the new paths**

Open `src/lib/presence.test.js`, change every RTDB path expectation from `worlds/{owner}/players/...` to `worlds/{owner}/maps/{mapKey}/players/...` and pass a `mapKey` argument (use `'test3'`) in each `joinWorld`/`leaveWorld`/`subscribeWorldPlayers`/`updateSelf` call. Example edit pattern:

```js
// before
joinWorld('owner1', 'self1', { x: 0 })
// after
joinWorld('owner1', 'test3', 'self1', { x: 0 })
// and the ref-path assertion:
expect(refPathArg).toBe('worlds/owner1/maps/test3/players/self1')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/presence.test.js`
Expected: FAIL — paths don't include `/maps/test3/`.

- [ ] **Step 3: Implement the path change**

In `src/lib/presence.js`, update the ref builders and exported functions:

```js
function playerRef(ownerUid, mapKey, selfUid) {
  return ref(rtdb, `worlds/${ownerUid}/maps/${mapKey}/players/${selfUid}`)
}

function playersRef(ownerUid, mapKey) {
  return ref(rtdb, `worlds/${ownerUid}/maps/${mapKey}/players`)
}

export async function joinWorld(ownerUid, mapKey, selfUid, selfState) {
  const pRef = playerRef(ownerUid, mapKey, selfUid)
  await set(pRef, selfState)
  onDisconnect(pRef).remove()
}

export function leaveWorld(ownerUid, mapKey, selfUid) {
  const pRef = playerRef(ownerUid, mapKey, selfUid)
  onDisconnect(pRef).cancel()
  remove(pRef).catch(() => {})
}

export function subscribeWorldPlayers(ownerUid, mapKey, cb) {
  if (_playersUnsub) { _playersUnsub(); _playersUnsub = null }
  _playersUnsub = onValue(playersRef(ownerUid, mapKey), (snapshot) => {
    cb(snapshot.val() ?? {})
  })
  return () => detachWorldPlayers()
}

export function updateSelf(ownerUid, mapKey, selfUid, partial) {
  const now = Date.now()
  if (now - _lastUpdateMs < UPDATE_INTERVAL_MS) return
  _lastUpdateMs = now
  set(playerRef(ownerUid, mapKey, selfUid), partial).catch(() => {})
}
```

Leave `detachWorldPlayers` and `_resetThrottleForTest` unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/presence.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/presence.js src/lib/presence.test.js
git commit -m "feat(maps): key presence rooms by mapKey"
```

---

### Task B3: Scope decorations to the current map

Decorations move from a flat `objects` array to a per-map map. The `maps/{uid}` Firestore doc gains `objectsByMap: { [mapKey]: [...] }`. The store tracks `currentMapKey` and exposes the current map's objects as `mapObjects`.

**Files:**
- Modify: `src/stores/useWorldStore.js`
- Modify: `src/stores/useWorldStore.test.js`
- Modify: `src/lib/syncManager.js`

**Interfaces:**
- Produces (store):
  - state adds `currentMapKey: string|null` and `objectsByMap: Record<string, Array>`.
  - `mapObjects` stays as a derived convenience: keep it in state but always equal to `objectsByMap[currentMapKey] ?? []`, maintained by the setters below.
  - `setCurrentMapKey(key)` — sets `currentMapKey` and refreshes `mapObjects`.
  - `setObjectsByMap(obj)` — replaces the whole per-map map and refreshes `mapObjects`.
  - `addObject`, `removeObject`, `moveObject` operate on the current map's array within `objectsByMap` and refresh `mapObjects`.

- [ ] **Step 1: Update the store test**

In `src/stores/useWorldStore.test.js`, update the reset/init block to include `currentMapKey: null` and `objectsByMap: {}`, and add tests:

```js
it('setCurrentMapKey switches which map objects mapObjects reflects', () => {
  useWorldStore.setState({ objectsByMap: { a: [{ key: 'wood_bridge', x: 0, y: 0 }], b: [] }, currentMapKey: null, mapObjects: [] })
  useWorldStore.getState().setCurrentMapKey('a')
  expect(useWorldStore.getState().mapObjects).toEqual([{ key: 'wood_bridge', x: 0, y: 0 }])
  useWorldStore.getState().setCurrentMapKey('b')
  expect(useWorldStore.getState().mapObjects).toEqual([])
})

it('addObject appends to the current map only', () => {
  useWorldStore.setState({ objectsByMap: {}, currentMapKey: 'a', mapObjects: [] })
  useWorldStore.getState().addObject({ key: 'grass_things', x: 5, y: 5 })
  expect(useWorldStore.getState().objectsByMap.a).toEqual([{ key: 'grass_things', x: 5, y: 5 }])
  expect(useWorldStore.getState().mapObjects).toEqual([{ key: 'grass_things', x: 5, y: 5 }])
})
```

Keep the existing `setMapObjects` tests but note `setMapObjects` now writes into the current map (see impl). Adjust those two existing assertions to set `currentMapKey: 'a'` first.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useWorldStore.test.js`
Expected: FAIL — `setCurrentMapKey`/`objectsByMap` undefined.

- [ ] **Step 3: Implement the store**

Replace `src/stores/useWorldStore.js` with:

```js
import { create } from 'zustand'

const objectsFor = (objectsByMap, key) => (key && objectsByMap[key]) || []

export const useWorldStore = create((set) => ({
  currentMapOwnerUid: null,
  currentMapKey:     null,
  objectsByMap:      {},
  mapObjects:        [],   // derived = objectsByMap[currentMapKey] ?? []
  editMode:          false,
  selectedItemKey:   null,
  remotePlayers:     {},

  setMapOwner: (uid) => set({ currentMapOwnerUid: uid }),

  setCurrentMapKey: (key) =>
    set((s) => ({ currentMapKey: key, mapObjects: objectsFor(s.objectsByMap, key) })),

  setObjectsByMap: (obj) =>
    set((s) => ({ objectsByMap: obj, mapObjects: objectsFor(obj, s.currentMapKey) })),

  // Replace the current map's objects.
  setMapObjects: (objects) =>
    set((s) => {
      const next = { ...s.objectsByMap, [s.currentMapKey]: objects }
      return { objectsByMap: next, mapObjects: objects }
    }),

  setRemotePlayers: (snapshot) => set({ remotePlayers: snapshot }),

  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  setSelectedItem: (key) => set({ selectedItemKey: key }),

  addObject: (obj) =>
    set((s) => {
      const arr = [...objectsFor(s.objectsByMap, s.currentMapKey), obj]
      return { objectsByMap: { ...s.objectsByMap, [s.currentMapKey]: arr }, mapObjects: arr }
    }),

  removeObject: (i) =>
    set((s) => {
      const arr = objectsFor(s.objectsByMap, s.currentMapKey).filter((_, idx) => idx !== i)
      return { objectsByMap: { ...s.objectsByMap, [s.currentMapKey]: arr }, mapObjects: arr }
    }),

  moveObject: (i, x, y) =>
    set((s) => {
      const arr = objectsFor(s.objectsByMap, s.currentMapKey).map((o, idx) => idx === i ? { ...o, x, y } : o)
      return { objectsByMap: { ...s.objectsByMap, [s.currentMapKey]: arr }, mapObjects: arr }
    }),
}))
```

- [ ] **Step 4: Run store test to verify it passes**

Run: `npx vitest run src/stores/useWorldStore.test.js`
Expected: PASS.

- [ ] **Step 5: Update syncManager to persist `objectsByMap`**

In `src/lib/syncManager.js`, change the `mapSync` config and helpers to read/write `objectsByMap`:

```js
const mapSync = createFirestoreSync({
  store: useWorldStore,
  logName: 'syncMap',
  ref: refs.map,
  toDoc: ({ objectsByMap }) => ({ objectsByMap, mapUpdatedAt: serverTimestamp() }),
  fromDoc: (data) => {
    if (data.objectsByMap) return { objectsByMap: data.objectsByMap }
    // Back-compat: migrate an old flat `objects` array into the entry map slot.
    if (data.objects) return { objectsByMap: { test3: data.objects } }
    return {}
  },
  changed: (s, p) => s.objectsByMap !== p.objectsByMap,
  guard: (s, uid) => s.currentMapOwnerUid === uid,
  needsSeed: () => false,
})
```

Update `syncMapToFirestore`, `visitMap`, `returnHome`:
```js
export async function syncMapToFirestore(uid, objectsByMap) {
  if (!uid) return
  try {
    await setDoc(refs.map(uid), { objectsByMap, mapUpdatedAt: serverTimestamp() }, { merge: true })
  } catch (e) {
    console.error('[syncMap] push failed:', e)
  }
}

export async function visitMap(ownerUid) {
  if (!ownerUid) return
  useWorldStore.setState({ currentMapOwnerUid: ownerUid, objectsByMap: {}, mapObjects: [], editMode: false })
  await hydrateMapFromFirestore(ownerUid)
}

export async function returnHome(selfUid) {
  if (!selfUid) return
  useWorldStore.setState({ currentMapOwnerUid: selfUid, objectsByMap: {}, mapObjects: [], editMode: false })
  await hydrateMapFromFirestore(selfUid)
}
```

> Note: `MapPalette` calls `syncMapToFirestore(uid, objects)` — find that call and change it to pass `useWorldStore.getState().objectsByMap`. (Grep `syncMapToFirestore` to locate the caller.)

- [ ] **Step 6: Run the full suite + lint**

Run: `npx vitest run && npm run lint`
Expected: PASS. Fix any caller the rename orphaned (especially `MapPalette`).

- [ ] **Step 7: Commit**

```bash
git add src/stores/useWorldStore.js src/stores/useWorldStore.test.js src/lib/syncManager.js src/components/MapPalette.jsx
git commit -m "feat(maps): scope decorations per map via objectsByMap"
```

---

## Phase C — Generic MapScene (Phaser; manual verification)

This replaces both scenes with one data-driven `MapScene`. Phaser scenes can't run in jsdom, so verification is by running the app. Make small, runnable increments.

### Task C1: Generic loader — `loadSceneData(mapKey)`

**Files:**
- Modify: `src/game/worldScenes.js`

**Interfaces:**
- Produces: `loadSceneData(mapKey): Promise<{ assetUrls, mapConfig, tilesetUrls }>` — resolves character URLs once, the single map's config (via `getMapConfig`), and that map's tileset URLs. (Replaces the test3+indoor hardcode.)

- [ ] **Step 1: Replace `loadSceneData`**

```js
export async function loadSceneData(mapKey) {
  const [assetUrls, mapConfig] = await Promise.all([
    resolveAssetUrls(),
    getMapConfig(mapKey),
  ])
  const tilesetUrls = await resolveMapTilesets(mapConfig)
  return { assetUrls, mapConfig, tilesetUrls }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: build fails only where `GameScene`/`IndoorScene` still reference removed registry keys (those are replaced in C2). If it fails elsewhere, fix the import. (This step is a checkpoint, not a finished feature.)

- [ ] **Step 3: Commit (WIP checkpoint)**

```bash
git add src/game/worldScenes.js
git commit -m "refactor(maps): loadSceneData takes a mapKey"
```

---

### Task C2: Implement `MapScene` (replaces GameScene + IndoorScene)

This is the core refactor. The new `MapScene` reads `mapKey` and `spawn` from `init` data, loads tiles in `preload`, builds layers/collision in `create`, places the player at the named spawn (or default), wires portals from the `Portals` object layer, and arms presence/edit only when the map's capability flags allow.

**Files:**
- Modify: `src/game/worldScenes.js`

**Interfaces:**
- Consumes: `parseMapMeta` (A2), `getMapConfig` fields (B1), registry keys set by `GameCanvas` (C3): `assetUrls`, `mapConfig`, `tilesetUrls`, `selectedMbti`, `mapObjects`, `editMode`, `selectedItemKey`, `controlMode`, `ownerUid`, `selfUid`, `selfName`, `remotePlayers`.
- Produces: `class MapScene extends Phaser.Scene` with `super({ key: 'MapScene' })`; `init({ mapKey, spawn })`; behavior switching via `this.scene.restart({ mapKey, spawn })`.

- [ ] **Step 1: Add the `init` + generic `preload`**

Add to the new `MapScene` class:

```js
init(data) {
  this.mapKey = data?.mapKey ?? 'test3'
  this.spawnName = data?.spawn ?? null   // null → use map's default spawn
}

preload() {
  const onLoadError = (file) => console.error('Failed to load:', file.src)
  this.load.on('loaderror', onLoadError)
  this.events.once('shutdown', () => this.load.off('loaderror', onLoadError))

  const r = this.registry
  const localByKey = {}

  localByKey[this.mapKey] = { local: GAME_ASSET_BY_KEY[this.mapKey]?.localPath, kind: 'tilemap' }
  this.load.tilemapTiledJSON(this.mapKey, urlFor(r, this.mapKey) ?? `/maps/${this.mapKey}.json`)

  const tiles = r.get('tilesetUrls') ?? {}
  Object.entries(tiles).forEach(([name, { url, local }]) => {
    localByKey[name] = { local, kind: 'image' }
    this.load.image(name, url)
  })

  MBTI_TYPES.forEach((mbti) => {
    localByKey[mbti] = {
      local: GAME_ASSET_BY_KEY[mbti]?.localPath,
      kind: 'spritesheet',
      frameConfig: { frameWidth: 48, frameHeight: 48 },
    }
    this.load.spritesheet(mbti, urlFor(r, mbti), { frameWidth: 48, frameHeight: 48 })
  })

  attachLocalFallback(this, localByKey)
}
```

> Note: `urlFor` reads `assetUrls` for tilemap keys. Since uploaded maps aren't in `GAME_ASSETS`, add the loaded tilemap URL into the registry from `GameCanvas` (C3) under `assetUrls[mapKey]`, OR fall back to `/maps/{mapKey}.json` as shown. For uploaded-only maps the URL comes from `loadSceneData` → see C3 where we set `assetUrls[mapKey]` to the resolved Storage/local URL.

- [ ] **Step 2: Add the generic `create`**

The `create` is GameScene's `create` generalized:
- `const map = this.make.tilemap({ key: this.mapKey })`
- `const cfg = this.registry.get('mapConfig') ?? DEFAULT_MAP_CONFIGS[this.mapKey] ?? { tilesets:{}, collision:{}, hidden:{} }`
- build tilesets/layers/scale/bounds exactly as GameScene does today (lines 174–197).
- animations block: copy GameScene's `CHARACTER_MODE` animation setup (lines 199–258) verbatim.
- **Spawn** — replace the hardcoded `spawnX/spawnY` with:
```js
const meta = parseMapMeta(map)   // map.objects available via Tiled JSON cache
const spawnName = this.spawnName ?? cfg.defaultSpawn ?? meta.defaultSpawnName
const spawnObj = meta.spawns.find((s) => s.name === spawnName) ?? meta.spawns[0] ?? null
const spawnX = (spawnObj ? spawnObj.x : (map.width / 2) * 16) * mapScale
const spawnY = (spawnObj ? spawnObj.y : (map.height / 2) * 16) * mapScale
```
> `parseMapMeta` needs the raw JSON. Phaser caches it: `const rawJson = this.cache.tilemap.get(this.mapKey).data` then `parseMapMeta(rawJson)`.
- player creation, `applyCollision`, decorations group, decoration/edit/presence event wiring: copy from GameScene (lines 262–299).
- **Edit mode arming** — only attach the edit-mode pointer branch when `cfg.editable`. Keep the existing pointerdown handler but guard the decoration-place branch with `if (cfg.editable && this.registry.get('editMode'))`.
- **Portals** — replace the single `doorToIndoor` zone (lines 301–320) with a loop over `meta.portals`:
```js
this.transitioning = false
this.time.delayedCall(500, () => { this.transitioning = false }) // block re-fire on arrival
meta.portals.forEach((p) => {
  if (!p.target) return
  const dz = this.add.zone(
    p.x * mapScale + (p.width * mapScale) / 2,
    p.y * mapScale + (p.height * mapScale) / 2,
    p.width * mapScale,
    p.height * mapScale,
  )
  this.physics.world.enable(dz)
  dz.body.setAllowGravity(false)
  dz.body.moves = false
  this.physics.add.overlap(this.player, dz, () => {
    if (this.transitioning) return
    this.transitioning = true
    this.scene.restart({ mapKey: p.target, spawn: p.targetSpawn ?? null })
  })
})
```
> Because `scene.restart` re-runs `preload`, and the target map's config/tilesets differ, `GameCanvas` must reload scene data on restart. Handle this in C3 by listening for a scene event; simplest: emit `this.game.events.emit('mapChangeRequested', { mapKey, spawn })` instead of calling `restart` directly, and let `GameCanvas` reload data then restart. **Use the event approach** (see C3). Replace the `this.scene.restart(...)` line with:
```js
    this.game.events.emit('mapChangeRequested', { mapKey: p.target, spawn: p.targetSpawn ?? null })
```
- camera/input/wheel/wasd/resize wiring: copy from GameScene (lines 322–416).

- [ ] **Step 3: Generalize `_tickPresence` to use mapKey + capability flag**

```js
_tickPresence() {
  for (const entry of this._remoteAvatars.values()) {
    entry.sprite.x = Phaser.Math.Linear(entry.sprite.x, entry.targetX, 0.2)
    entry.sprite.y = Phaser.Math.Linear(entry.sprite.y, entry.targetY, 0.2)
    entry.label.x  = entry.sprite.x
    entry.label.y  = entry.sprite.y - 24 * this._mapScale
  }
  if (!this._multiplayer) return
  const ownerUid = this.registry.get('ownerUid')
  const selfUid  = this.registry.get('selfUid')
  if (ownerUid && selfUid) {
    updateSelf(ownerUid, this.mapKey, selfUid, {
      x: this.player.x, y: this.player.y,
      dir: this._currentDir ?? 'down',
      moving: this.isMoving || this.usingWasd || this.joystickActive,
      mbti: this.currentMbti,
      name: this.registry.get('selfName') ?? '',
    })
  }
}
```
Set `this._multiplayer = !!cfg.multiplayer` in `create`. Keep the rest of `update`, `_renderDecorations`, `_reconcileRemotePlayers` identical to GameScene.

- [ ] **Step 4: Delete `GameScene` and `IndoorScene`**

Remove both classes. Export `MapScene` (and keep `loadSceneData`, `getZoom`). Import `parseMapMeta` at the top:
```js
import { parseMapMeta } from '../utils/tiledMapMeta'
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: PASS (no references to removed scenes remain after C3).

- [ ] **Step 6: Commit**

```bash
git add src/game/worldScenes.js
git commit -m "feat(maps): generic data-driven MapScene with portals + named spawns"
```

---

### Task C3: Boot + switch maps in `GameCanvas`

**Files:**
- Modify: `src/components/GameCanvas.jsx`

**Interfaces:**
- Consumes: `MapScene`, `loadSceneData(mapKey)`, `listMapConfigs`/`pickEntryKey` (B1), presence functions keyed by mapKey (B2), `useWorldStore.setCurrentMapKey`/`setObjectsByMap` (B3).
- Behavior: boot the entry map; on `mapChangeRequested`, reload that map's data into the registry, set `currentMapKey`, then `scene.restart`. Presence subscribes to `(ownerUid, currentMapKey)`.

- [ ] **Step 1: Swap imports + scene list**

```js
import { joinWorld, leaveWorld, subscribeWorldPlayers } from '../lib/presence'
import { MapScene, loadSceneData } from '../game/worldScenes'
import { listMapConfigs, pickEntryKey } from '../utils/mapConfig'
import { useWorldStore } from '../stores/useWorldStore'
```
Change `scene: [GameScene, IndoorScene]` → `scene: [MapScene]`.

- [ ] **Step 2: Resolve entry map before boot, set initial registry**

In the boot effect, replace `loadSceneData().then(...)` with:
```js
;(async () => {
  const maps = await listMapConfigs()
  const entryKey = pickEntryKey(maps) ?? 'test3'
  const data = await loadSceneData(entryKey)
  if (cancelled) return
  assetUrlsRef.current = { ...data, mapKey: entryKey }
  useWorldStore.getState().setCurrentMapKey(entryKey)
  if (containerRef.current) {
    const { width, height } = containerRef.current.getBoundingClientRect()
    if (width > 0 && height > 0) bootGame(width, height)
  }
})()
```
In `bootGame`, set the per-map registry keys and start the scene with the entry key:
```js
game.registry.set('assetUrls', { ...assetUrlsRef.current.assetUrls, [assetUrlsRef.current.mapKey]: undefined })
game.registry.set('mapConfig', assetUrlsRef.current.mapConfig)
game.registry.set('tilesetUrls', assetUrlsRef.current.tilesetUrls)
// ...existing selectedMbti/mapObjects/editMode/selectedItemKey/controlMode sets...
game.scene.start('MapScene', { mapKey: assetUrlsRef.current.mapKey, spawn: null })
```
> Remove the old `game.registry.set('mapConfigs', ...)` / `set('tilesetUrls', ...)` lines that used the test3/indoor shape; replace with the per-map `mapConfig`/`tilesetUrls` above.

- [ ] **Step 3: Handle `mapChangeRequested`**

After `bootGame`, register a handler that reloads data then restarts:
```js
game.events.on('mapChangeRequested', async ({ mapKey, spawn }) => {
  const data = await loadSceneData(mapKey)
  game.registry.set('mapConfig', data.mapConfig)
  game.registry.set('tilesetUrls', data.tilesetUrls)
  game.registry.set('assetUrls', { ...data.assetUrls, [mapKey]: undefined })
  useWorldStore.getState().setCurrentMapKey(mapKey)
  game.scene.start('MapScene', { mapKey, spawn })
})
```

- [ ] **Step 4: Presence subscribes per mapKey**

Add `currentMapKey` to the presence effect deps and signatures:
```js
const currentMapKey = useWorldStore((s) => s.currentMapKey)
// ...
useEffect(() => {
  if (!currentMapOwnerUid || !selfUid || !currentMapKey) return
  const selfState = { /* unchanged */ }
  joinWorld(currentMapOwnerUid, currentMapKey, selfUid, selfState).catch(() => {})
  if (gameRef.current) {
    gameRef.current.registry.set('ownerUid', currentMapOwnerUid)
    gameRef.current.registry.set('selfUid', selfUid)
    gameRef.current.registry.set('selfName', user?.displayName ?? '')
  }
  const unsub = subscribeWorldPlayers(currentMapOwnerUid, currentMapKey, (snapshot) => {
    useWorldStore.getState().setRemotePlayers(snapshot)
  })
  return () => {
    leaveWorld(currentMapOwnerUid, currentMapKey, selfUid)
    unsub()
    useWorldStore.getState().setRemotePlayers({})
  }
}, [currentMapOwnerUid, selfUid, currentMapKey])  // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 5: Manual verification — run the app**

Run: `npm run dev`, open the app, sign in.
Verify (Karpathy goal-driven success criteria):
1. The entry map (`test3`) loads and renders, player spawns at the named/default spawn (no crash, not stuck in a wall).
2. Walking into the door/portal switches to `indoor` and the player appears at the target spawn.
3. Walking back returns to `test3`.
4. On `test3` (multiplayer=true) a second browser session shows the other avatar; on `indoor` (multiplayer=false) it does not.
5. Decoration edit mode still works on `test3` and decorations persist after reload.

Fix any issue before committing. If `test3`/`indoor` need portal/spawn object layers they don't have yet, see Task C4.

- [ ] **Step 6: Commit**

```bash
git add src/components/GameCanvas.jsx
git commit -m "feat(maps): boot entry map + portal-driven map switching"
```

---

### Task C4: Migrate `test3`/`indoor` to the new layer convention

The existing maps use `Doors`/`Door` object layers with `door_to_indoor`/`door_to_world` objects, and hardcoded spawns. To run under the generic scene they need `Spawns` and `Portals` layers. This is a data edit to the Tiled JSON + a Firestore config update — no code.

**Files:**
- Modify: `public/maps/test3.json`, `public/maps/indoor.json` (and their Storage copies via the dashboard once Phase D exists; for now edit local + re-upload).

- [ ] **Step 1: Add layers to `test3.json`**

Add a `Spawns` object layer with an `entry` object (default=true) at the old spawn tile (x≈`35*16`, y≈`32*16`), and rename/retag the `Doors` layer to `Portals` with the door object carrying `target: 'indoor'`, `targetSpawn: 'from_world'`. (Keep coordinates.)

- [ ] **Step 2: Add layers to `indoor.json`**

Add a `Spawns` object layer with `from_world` (default=true) at the old indoor spawn (x≈`6*16`, y≈`12*16`), and a `Portals` layer with the exit door carrying `target: 'test3'`, `targetSpawn: 'entry'`.

- [ ] **Step 3: Seed Firestore registry fields**

Via the dashboard (Phase D) or a one-off: set `mapConfigs/test3` `{ displayName:'โลกหลัก', isEntry:true, order:1, defaultSpawn:'entry', multiplayer:true, editable:true }` and `mapConfigs/indoor` `{ displayName:'ในบ้าน', isEntry:false, order:2, defaultSpawn:'from_world', multiplayer:false, editable:false }`.

- [ ] **Step 4: Manual verification**

Run: `npm run dev` — repeat C3 Step 5 checks. Both maps load, portals work both ways, spawns correct.

- [ ] **Step 5: Commit**

```bash
git add public/maps/test3.json public/maps/indoor.json
git commit -m "chore(maps): migrate test3/indoor to Spawns/Portals layers"
```

---

## Phase D — Map Dashboard UI (admin; manual verify)

### Task D1: Map list + upload + delete-with-guard

**Files:**
- Create: `src/components/admin/MapDashboard.jsx`
- Modify: `src/components/admin/AssetsSection.jsx` (replace `MapsPanel` usage with `MapDashboard`)

**Interfaces:**
- Consumes: `listMapConfigs`, `saveMapConfig`, `getMapConfig` (B1), `slugify`/`uniqueSlug` (A1), `parseMapMeta` (A2), `autoMatchTilesets` (A3), `validateMap` (A4), `useToast`, Firebase Storage.
- Produces: a panel listing all maps (displayName + key + health pill + Settings/Delete buttons), an "อัปโหลดแมพใหม่" flow, and a delete guard that scans other maps' portals.

- [ ] **Step 1: Build the list + upload flow**

`MapDashboard` renders `listMapConfigs()` results. "อัปโหลดแมพใหม่" opens a file picker for a `.json`; on pick:
1. `JSON.parse` the file (toast error on failure).
2. `const meta = parseMapMeta(json)`.
3. Ask for a display name (prompt or inline field), compute `key = uniqueSlug(name, existingKeys)`.
4. List Storage tileset files (reuse `StorageBrowser`'s listing or `listAll` on `sprites/tilesets` + `sprites/objects`), `autoMatchTilesets(meta.tilesetNames, paths)`.
5. `validateMap({ meta, unmatchedTilesets: r.unmatched, existingMapKeys: existingKeys })`.
6. If `errors.length` → show them, block. Else upload `maps/{key}.json` to Storage, `saveMapConfig(key, { tilesets: r.matched, collision:{}, hidden:{}, displayName: name, order: maxOrder+1, isEntry:false, defaultSpawn: meta.defaultSpawnName, multiplayer:true, editable:true }, adminUid)`, show warnings as non-blocking toasts, refresh.

- [ ] **Step 2: Delete with portal guard**

Delete button → load all maps, for each OTHER map fetch its JSON (`loadMapText`-style) and `parseMapMeta`, collect portals whose `target === key`. If any, show a confirm listing the breakages ("cave.Portals → forest จะใช้ไม่ได้"). On confirm, delete the Storage `maps/{key}.json` and the `mapConfigs/{key}` doc.

- [ ] **Step 3: Wire into AssetsSection**

In `AssetsSection.jsx`, replace the `MapsPanel` export/usage with `MapDashboard`. Remove the now-dead `MAP_KEYS` constant and the old `MapsPanel` body (it's superseded). Keep other panels untouched (surgical).

- [ ] **Step 4: Manual verification**

Run: `npm run dev` → admin → Maps.
1. Existing maps list with display names.
2. Upload a valid new map → appears in list, tilesets auto-matched, walkable in game via a portal from `test3`.
3. Upload a map with a missing tileset → blocked with the Thai error.
4. Delete a map that another map's portal targets → warned before delete.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/MapDashboard.jsx src/components/admin/AssetsSection.jsx
git commit -m "feat(maps): Map Dashboard list + validated upload + delete guard"
```

---

### Task D2: Phaser map preview component

**Files:**
- Create: `src/components/admin/MapPreview.jsx`

**Interfaces:**
- Consumes: `MapScene` (preview flag) or a dedicated lightweight render; `loadSceneData(mapKey)`.
- Produces: `<MapPreview mapKey={key} />` — a contained Phaser canvas rendering the map's tiles with spawn pins and portal rectangles overlaid, no player/physics/input movement.

- [ ] **Step 1: Add a `preview` flag to MapScene**

In `MapScene.init`, read `this.preview = !!data?.preview`. In `create`, when `this.preview`: skip player creation, presence, edit, input-movement; instead draw spawn pins (small circles + name text from `meta.spawns`) and portal rects (semi-transparent fill from `meta.portals`), and set the camera to fit the whole map (`setZoom` to fit, `centerOn` map center). Guard the movement/presence wiring with `if (this.preview) return` right after layers+overlays are drawn.

- [ ] **Step 2: Build the React wrapper**

`MapPreview` mounts a `Phaser.Game` into a ref'd div (mirroring `GameCanvas`'s boot/teardown but minimal): load data via `loadSceneData(mapKey)`, set registry keys, `scene.start('MapScene', { mapKey, preview: true })`. Destroy the game on unmount / mapKey change.

- [ ] **Step 3: Manual verification**

Render `<MapPreview mapKey="test3" />` in the dashboard: tiles render, spawn pins labeled, portal rects visible, no avatar, no movement.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/MapPreview.jsx src/game/worldScenes.js
git commit -m "feat(maps): read-only Phaser map preview with spawn/portal overlay"
```

---

### Task D3: Map Info screen (per-map settings)

**Files:**
- Create: `src/components/admin/MapInfoScreen.jsx`

**Interfaces:**
- Consumes: `getMapConfig`/`saveMapConfig` (B1), `parseMapMeta` (A2), `autoMatchTilesets` (A3), `MapPreview` (D2), the existing tileset browse/upload UI from `MapConfigEditor.jsx` (reuse its tileset section).
- Produces: `<MapInfoScreen mapKey adminUid onClose onSaved />` — preview + editable displayName + default-spawn radio (from `meta.spawns`) + `multiplayer`/`editable` toggles + `isEntry` toggle + tileset resolution (auto-matched, with browse/upload for gaps) + collision/hidden layer ticks (port from MapConfigEditor) + Save.

- [ ] **Step 1: Build the screen**

Compose the preview at the top, then a settings form:
- displayName text input.
- default spawn: radio list of `meta.spawns` names (default-checked = `cfg.defaultSpawn ?? meta.defaultSpawnName`).
- toggles: `multiplayer`, `editable`, `isEntry` (note: setting `isEntry` should warn it will unset others — handle on save by clearing other docs' `isEntry`, or just document that the picker is last-write-wins).
- tilesets: reuse `MapConfigEditor`'s tileset rows, pre-filled by `autoMatchTilesets`.
- collision/hidden layer ticks: reuse from `MapConfigEditor`.
- Save → `saveMapConfig(mapKey, { ...all fields }, adminUid)`.

- [ ] **Step 2: Open it from the dashboard**

In `MapDashboard`, the per-map "Settings" button opens `MapInfoScreen` (replacing the old `MapConfigEditor` modal). `MapConfigEditor.jsx` may be retired once its reusable sections are extracted; if extraction is heavy, keep `MapConfigEditor` for the tileset/layer sub-UI and have `MapInfoScreen` wrap it — decide based on the actual diff (mention, don't over-refactor).

- [ ] **Step 3: Manual verification**

Run: `npm run dev` → admin → Maps → Settings on a map.
1. Preview shows the map with pins/portals.
2. Changing default spawn + Save → re-entering the map spawns at the new point.
3. Toggling `multiplayer` off → presence stops on that map.
4. Editing displayName → list reflects it; game still keyed by immutable key.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/MapInfoScreen.jsx src/components/admin/MapDashboard.jsx
git commit -m "feat(maps): per-map info screen (spawn, capabilities, tilesets)"
```

---

## Phase E — Docs

### Task E1: In-app Tiled authoring guide

**Files:**
- Create: `src/data/mapDocs/tiled-guide.md`
- Create: `src/components/admin/MapDocsPanel.jsx`
- Modify: `src/components/admin/MapDashboard.jsx` (add a "คู่มือการสร้างแมพ" link/tab)

**Interfaces:**
- Produces: a rendered docs page inside the dashboard. Use a minimal markdown render (the app has no markdown lib; either add a tiny renderer or render the guide as structured JSX). Decision: keep the guide as a `.md` string imported via Vite's `?raw` and render with a small, dependency-free markdown-to-JSX (headings, lists, tables, code). If that's heavy, author the guide directly as JSX in `MapDocsPanel.jsx` and keep `.md` as the source of truth for copy.

- [ ] **Step 1: Write the guide content**

Populate `tiled-guide.md` with the authoring spec, made consistent with the final conventions:
- Required layers table: `Ground` (Tile), `FarmGround` (Tile), `Plants` (Tile), `Objects` (Tile), `Collision` (Tile), **`Spawns` (Object)** — named points, mark one `default=true`, **`Portals` (Object)** — each rect with `target` + `targetSpawn` properties.
- How to make a map in Tiled (tilesets, drawing).
- Spawns: create `Spawns` object layer, draw a point/rect per entry, name it, set property `default` (bool) on the main one.
- Portals: create `Portals` object layer, draw a rect over each exit, set `target` (destination map key) + `targetSpawn` (a spawn name in that map).
- Performance note: use object layers instead of per-frame tile checks.
- Upload flow: upload `.json` in the dashboard → auto tileset match → fix gaps → validation → set default spawn + capabilities in the Info screen.

- [ ] **Step 2: Render it**

Import the markdown raw (`import guide from '../../data/mapDocs/tiled-guide.md?raw'`) and render in `MapDocsPanel`. Link it from `MapDashboard`.

- [ ] **Step 3: Manual verification**

Run: `npm run dev` → admin → Maps → คู่มือ. The guide renders readably with tables/lists/code.

- [ ] **Step 4: Commit**

```bash
git add src/data/mapDocs/tiled-guide.md src/components/admin/MapDocsPanel.jsx src/components/admin/MapDashboard.jsx
git commit -m "feat(maps): in-app Tiled authoring guide"
```

---

## Final verification

- [ ] **Run the whole test suite + lint + build**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all green.

- [ ] **End-to-end manual pass**

1. Boot → entry map renders, correct spawn.
2. Portals move between `test3` ↔ `indoor` ↔ an uploaded map, each landing at the right spawn.
3. Multiplayer only on maps flagged `multiplayer`.
4. Decorations persist per map.
5. Upload a new map (auto tileset match, validation blocks a broken one), set its default spawn + capabilities, walk it via a portal.
6. Delete guard warns on inbound portals.
7. Docs page readable.

---

## Self-Review notes (for the implementer)

- **Spec coverage:** Map Info screen = D3; spawn = A2/C2/D3; unlimited upload = D1; Object-Layer switching = A2/C2; docs = E1. All covered.
- **Type consistency:** presence functions take `(ownerUid, mapKey, selfUid, ...)` everywhere (B2, C2, C3). Store derived `mapObjects` always equals `objectsByMap[currentMapKey]` (B3). `parseMapMeta` field names (`spawns`, `defaultSpawnName`, `portals`, `tilesetNames`) are identical in A2, A4, C2, D1, D2, D3.
- **Known risk:** `scene.restart` re-runs `preload` before `GameCanvas` reloads registry data — that's why C2 emits `mapChangeRequested` and C3 reloads-then-starts instead of restarting in-scene. Do not shortcut this.
- **Phaser raw JSON for `parseMapMeta`:** read from `this.cache.tilemap.get(mapKey).data` in `create` (the tilemap is already loaded). Verify this returns the full Tiled object including object layers.
