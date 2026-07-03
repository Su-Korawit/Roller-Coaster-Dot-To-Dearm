# RC Assets Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the 39 Roller Coaster custom files that leaked into the official `sprites/` prefix (before `rc/` existed) to their correct `rc/` location, and repoint every code path and Firestore document that reads them — without breaking the live game at any point.

**Architecture:** Copy-then-delete across two repos. The Assets repo (`D:\Ikkyusan\Downloads\Assets`) owns the Storage-level file move (copy 39 objects to `rc/`, verify md5, delete originals only after verification). The main app repo owns repointing every reader: the static asset manifest (`assetManifest.js`), the map-config fallback defaults (`mapConfig.js`), and any live Firestore `mapConfigs/*` documents an admin already edited (which override the JS defaults at runtime). Nothing is deleted from `sprites/` until every reader has been repointed and the app has been manually verified.

**Tech Stack:** Node ESM scripts + `firebase-admin` (server-side migrations, both repos), Vitest (main app repo unit tests), plain Node assert-style tests (Assets repo, matching its existing `*.test.mjs` convention).

## Global Constraints

- No TypeScript in the main app repo — plain `.js`/`.jsx` only (per `CLAUDE.md`).
- `serviceAccountKey.json` is gitignored — never commit, log, or print its contents. All scripts in this plan take it via `GOOGLE_APPLICATION_CREDENTIALS` env var, matching `scripts/resetFarmData.mjs` and `scripts/uploadAssets.mjs`.
- "Firestore writes always debounced via `syncManager`, never inline `doc(db, ...)`" (CLAUDE.md) applies to **browser client code**. The Node migration scripts in this plan use the `firebase-admin` server SDK (batch/direct writes), matching the existing precedent in `scripts/resetFarmData.mjs` — this is not a violation.
- `rc/` is never written by the Sprout Lands sync script (`pushToFirebase.mjs`) or read by `UpdateAssetsSection.jsx` — this plan must not change that invariant.
- Every write-capable script defaults to a safe/dry-run mode; a script only touches Storage or Firestore when passed an explicit flag (`--copy`, `--delete`, `--apply`).
- Delete steps (Storage or otherwise) must re-verify state live at the moment of deletion — never trust a stale audit file as the sole basis for a delete decision.

## File Structure

**Assets repo** (`D:\Ikkyusan\Downloads\Assets`):
- `scripts/lib/rcMigrationPlan.mjs` — pure data: the fixed list of 39 `{from, to}` Storage path moves.
- `scripts/lib/rcMigrationPlan.test.mjs` — plain-Node test for the plan's shape (count, no duplicates, prefix invariants).
- `scripts/migrateRcAssets.mjs` — CLI: dry-run (default) / `--copy` / `--delete` against live Firebase Storage.

**Main app repo** (`d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm`):
- `scripts/auditMapConfigsTilesets.mjs` — read-only: lists every live `mapConfigs/*` Firestore doc's `tilesets` entries that still point into `sprites/tilesets/` or `sprites/objects/`.
- `src/utils/rcPathRewrite.js` — pure function: rewrites a single `sprites/tilesets/…` or `sprites/objects/…` path to its `rc/…` equivalent (or returns `null` if it doesn't match).
- `src/utils/rcPathRewrite.test.js` — Vitest unit test for the above.
- `scripts/migrateMapConfigsToRc.mjs` — CLI: dry-run (default) / `--apply`, uses `rcPathRewrite.js` to rewrite `mapConfigs/*` docs in Firestore.
- `src/game/assetManifest.js` — modify: `tileset()`, `object()` helpers and the MBTI/crops entries now emit `rc/…` storage paths.
- `src/game/assetManifest.test.js` — new: regression guard asserting no `GAME_ASSETS` entry still points at `sprites/tilesets/`, `sprites/objects/`, or `sprites/characters/`.
- `src/utils/mapConfig.js` — modify: `DEFAULT_MAP_CONFIGS` tileset values now use `rc/…` paths.
- `src/utils/mapConfig.test.js` — extend: regression guard asserting `DEFAULT_MAP_CONFIGS` has no `sprites/tilesets/` or `sprites/objects/` values.
- `docs/adr/0007-rc-assets-folder-separation.md` — modify: document the `objects/` folder under `rc/` and record Phase 2 complete.
- `docs/superpowers/plans/2026-07-03-rc-assets-jsx-followup.md` — new: handoff note listing the 4 JSX files that still write into `sprites/` and must be repointed to `rc/` by Cursor (out of scope for this plan per the project's Claude Code / Cursor split).

## Interfaces

- `rcMigrationPlan.mjs` exports `MIGRATION_PLAN: Array<{from: string, to: string}>` (39 entries) — consumed by `migrateRcAssets.mjs`.
- `rcPathRewrite.js` exports `toRcPath(value: string): string | null` — consumed by `migrateMapConfigsToRc.mjs`.

---

### Task 1: Migration plan data (Assets repo)

**Files:**
- Create: `D:\Ikkyusan\Downloads\Assets\scripts\lib\rcMigrationPlan.mjs`
- Test: `D:\Ikkyusan\Downloads\Assets\scripts\lib\rcMigrationPlan.test.mjs`

**Interfaces:**
- Produces: `MIGRATION_PLAN` (array of 39 `{from, to}` objects) — used by Task 2's `migrateRcAssets.mjs`.

- [ ] **Step 1: Write `rcMigrationPlan.mjs`**

```js
// scripts/lib/rcMigrationPlan.mjs
//
// Fixed list of the 39 Roller Coaster custom files that leaked into the
// official sprites/ prefix before rc/ existed (see ADR-0007 in the main
// app repo). Each entry maps the file's current sprites/ path to its
// correct rc/ destination. This is a one-time, hand-verified list — not a
// generic diff (see quarantineCustomStorageFiles.mjs for that).

const MBTI_TYPES = [
  'ENFJ', 'ENFP', 'ENTJ', 'ENTP',
  'ESFJ', 'ESFP', 'ESTJ', 'ESTP',
  'INFJ', 'INFP', 'INTJ', 'INTP',
  'ISFJ', 'ISFP', 'ISTJ', 'ISTP',
]

const TILESET_NAMES = [
  'Fences', 'Grass', 'Hills', 'Office',
  'Tilled_Dirt', 'Tilled_Dirt_v2', 'Tilled_Dirt_Wide', 'Tilled_Dirt_Wide_v2',
  'UiversityV1', 'Water',
  'Wooden_House', 'Wooden_House_Roof_Tilset', 'Wooden_House_Walls_Tilset',
  'fence_schoolV6', 'fence_schoolVPG', 'fence_schooฮl.V.Piyanggoon',
]

const OBJECT_NAMES = [
  'Basic_Furniture', 'Basic_Grass_Biom_things', 'Basic_Grass_Biom_things_1',
  'Basic_Plants', 'Chest', 'Shop4', 'Wood_Bridge',
]

function moves(category, names) {
  return names.map((name) => ({
    from: `sprites/${category}/${name}.png`,
    to: `rc/${category}/${name}.png`,
  }))
}

export const MIGRATION_PLAN = [
  ...moves('characters', MBTI_TYPES),
  ...moves('tilesets', TILESET_NAMES),
  ...moves('objects', OBJECT_NAMES),
]
```

- [ ] **Step 2: Write the test**

```js
// scripts/lib/rcMigrationPlan.test.mjs
//
// Run with: node scripts/lib/rcMigrationPlan.test.mjs

import { MIGRATION_PLAN } from './rcMigrationPlan.mjs'

let pass = 0, fail = 0
function check(name, cond) {
  if (cond) { console.log('PASS', name); pass++ }
  else { console.log('FAIL', name); fail++ }
}

check('has exactly 39 entries', MIGRATION_PLAN.length === 39)
check('every from path starts with sprites/', MIGRATION_PLAN.every((m) => m.from.startsWith('sprites/')))
check('every to path starts with rc/', MIGRATION_PLAN.every((m) => m.to.startsWith('rc/')))
check('no duplicate sources', new Set(MIGRATION_PLAN.map((m) => m.from)).size === MIGRATION_PLAN.length)
check('no duplicate destinations', new Set(MIGRATION_PLAN.map((m) => m.to)).size === MIGRATION_PLAN.length)
check('category is preserved between from and to', MIGRATION_PLAN.every((m) => {
  const fromCat = m.from.split('/')[1]
  const toCat = m.to.split('/')[1]
  return fromCat === toCat
}))

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
```

- [ ] **Step 3: Run the test**

Run: `cd "D:\Ikkyusan\Downloads\Assets" && node scripts/lib/rcMigrationPlan.test.mjs`
Expected: `6 passed, 0 failed`

- [ ] **Step 4: Commit**

```bash
cd "D:/Ikkyusan/Downloads/Assets"
git add scripts/lib/rcMigrationPlan.mjs scripts/lib/rcMigrationPlan.test.mjs
git commit -m "feat: add rc/ migration plan for 39 leaked custom files"
```

---

### Task 2: Storage migration CLI (Assets repo)

**Files:**
- Create: `D:\Ikkyusan\Downloads\Assets\scripts\migrateRcAssets.mjs`

**Interfaces:**
- Consumes: `MIGRATION_PLAN` from Task 1's `./lib/rcMigrationPlan.mjs`.

- [ ] **Step 1: Write the script**

```js
// scripts/migrateRcAssets.mjs
//
// One-time migration: moves the 39 Roller Coaster custom files that were
// uploaded into the official sprites/ prefix (via the Admin Dashboard,
// before rc/ existed — see ADR-0007 in the main app repo) to their correct
// rc/ location.
//
// Modes:
//   (no flag)   dry run — prints the plan, touches nothing
//   --copy      copies every file to its rc/ destination and verifies md5
//   --delete    deletes the sprites/ source ONLY when the rc/ destination
//               currently exists with a matching md5 (re-checked live)
//
// Run:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/migrateRcAssets.mjs [--copy|--delete]

import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'
import { MIGRATION_PLAN } from './lib/rcMigrationPlan.mjs'

const ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'rollercoasterdottodream.firebasestorage.app'
const MODE   = process.argv[2] === '--copy' ? 'copy' : process.argv[2] === '--delete' ? 'delete' : 'dry-run'

async function copyOne(bucket, { from, to }) {
  const src = bucket.file(from)
  const dest = bucket.file(to)
  const [srcMeta] = await src.getMetadata()

  let destMeta = null
  try {
    ;[destMeta] = await dest.getMetadata()
  } catch {
    // destination does not exist yet — normal case
  }

  if (destMeta) {
    if (destMeta.md5Hash === srcMeta.md5Hash) return { status: 'already-copied', from, to }
    return { status: 'conflict', from, to, reason: 'destination exists with different md5' }
  }

  const [, copyResponse] = await src.copy(dest)
  if (copyResponse.md5Hash !== srcMeta.md5Hash) {
    try { await dest.delete() } catch { /* best-effort cleanup */ }
    return { status: 'conflict', from, to, reason: 'copy verification failed — md5 mismatch after copy' }
  }
  return { status: 'copied', from, to, md5: srcMeta.md5Hash }
}

async function deleteOne(bucket, { from, to }) {
  const src = bucket.file(from)
  const dest = bucket.file(to)

  let srcMeta
  try {
    ;[srcMeta] = await src.getMetadata()
  } catch {
    return { status: 'already-deleted', from, to }
  }

  let destMeta
  try {
    ;[destMeta] = await dest.getMetadata()
  } catch {
    return { status: 'skipped', from, to, reason: 'rc/ destination missing — run --copy first' }
  }

  if (destMeta.md5Hash !== srcMeta.md5Hash) {
    return { status: 'skipped', from, to, reason: 'md5 mismatch between source and rc/ destination — investigate before deleting' }
  }

  await src.delete()
  return { status: 'deleted', from, to }
}

async function main() {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), storageBucket: BUCKET })
  const bucket = admin.storage().bucket()

  console.log(`Mode: ${MODE} — ${MIGRATION_PLAN.length} file(s) (bucket: ${BUCKET})\n`)

  if (MODE === 'dry-run') {
    for (const { from, to } of MIGRATION_PLAN) console.log(`  ${from}  ->  ${to}`)
    console.log('\nDry run only — no files were touched. Re-run with --copy to start.')
    return
  }

  const results = []
  for (const entry of MIGRATION_PLAN) {
    const result = MODE === 'copy' ? await copyOne(bucket, entry) : await deleteOne(bucket, entry)
    console.log(`  [${result.status}] ${result.from}${result.reason ? ` — ${result.reason}` : ''}`)
    results.push(result)
  }

  const counts = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {})
  console.log('\nDone ->', counts)

  await writeFile(
    path.join(ROOT, `meta/rc-migration-${MODE}.json`),
    JSON.stringify({ generatedAt: new Date().toISOString(), mode: MODE, bucket: BUCKET, results }, null, 2) + '\n',
  )
  console.log(`Audit written to meta/rc-migration-${MODE}.json`)

  const problems = results.filter((r) => r.status === 'conflict' || r.status === 'skipped')
  if (problems.length > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Dry-run to verify the plan prints correctly**

Run: `cd "D:\Ikkyusan\Downloads\Assets" && node scripts/migrateRcAssets.mjs`
Expected: 39 `sprites/... -> rc/...` lines, ending with `Dry run only — no files were touched.`

- [ ] **Step 3: Commit**

```bash
cd "D:/Ikkyusan/Downloads/Assets"
git add scripts/migrateRcAssets.mjs
git commit -m "feat: add copy/delete CLI to migrate leaked custom files into rc/"
```

---

### Task 3: Run the Storage copy (Assets repo, operational)

This step touches live Firebase Storage. It is purely additive — no existing path is modified or removed — so the live game is unaffected either way.

**Files:** none (operational step only)

- [ ] **Step 1: Run the copy**

Run: `cd "D:\Ikkyusan\Downloads\Assets" && GOOGLE_APPLICATION_CREDENTIALS="D:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\serviceAccountKey.json" node scripts/migrateRcAssets.mjs --copy`
Expected: 39 lines of `[copied] sprites/...`, then `Done -> { copied: 39 }`, exit code 0.

- [ ] **Step 2: Spot-check one file in the Firebase console or via a follow-up script**

Run: `cd "D:\Ikkyusan\Downloads\Assets" && GOOGLE_APPLICATION_CREDENTIALS="D:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\serviceAccountKey.json" node -e "import('firebase-admin').then(async ({default: admin}) => { admin.initializeApp({credential: admin.credential.applicationDefault(), storageBucket: 'rollercoasterdottodream.firebasestorage.app'}); const [meta] = await admin.storage().bucket().file('rc/characters/ENFJ.png').getMetadata(); console.log(meta.name, meta.md5Hash) })"`
Expected: prints `rc/characters/ENFJ.png <some-md5>` with no error.

- [ ] **Step 3: Commit the audit file**

```bash
cd "D:/Ikkyusan/Downloads/Assets"
git add meta/rc-migration-copy.json
git commit -m "chore: record rc/ migration copy audit"
```

---

### Task 4: Firestore mapConfigs audit (main app repo, read-only)

Confirms whether any live map already has Firestore-stored tileset paths that diverge from the JS defaults — these must be caught before Task 6/9, or the game will silently keep loading from `sprites/` after Task 11 deletes those files.

**Files:**
- Create: `d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\scripts\auditMapConfigsTilesets.mjs`

- [ ] **Step 1: Write the script**

```js
// scripts/auditMapConfigsTilesets.mjs
//
// Read-only: lists every mapConfigs/{key}.tilesets entry that still points
// into the official sprites/ prefix (sprites/tilesets/* or sprites/objects/*).
// These are Roller Coaster custom files (see docs/adr/0007) that must be
// migrated to rc/ before scripts/migrateRcAssets.mjs (Assets repo) deletes
// them from sprites/ — Firestore data overrides the DEFAULT_MAP_CONFIGS
// fallback in src/utils/mapConfig.js, so the JS default alone is not proof
// that nothing still points at the old path.
//
// Run:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/auditMapConfigsTilesets.mjs

import admin from 'firebase-admin'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rollercoasterdottodream'

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID })
const db = admin.firestore()

const snap = await db.collection('mapConfigs').get()
if (snap.empty) {
  console.log('mapConfigs collection is empty — nothing stored in Firestore, JS defaults are authoritative.')
  process.exit(0)
}

let flagged = 0
for (const doc of snap.docs) {
  const tilesets = doc.data().tilesets ?? {}
  for (const [name, value] of Object.entries(tilesets)) {
    if (value.startsWith('sprites/tilesets/') || value.startsWith('sprites/objects/')) {
      console.log(`  [${doc.id}] ${name}: ${value}`)
      flagged++
    }
  }
}

console.log(`\n${flagged} tileset reference(s) still point into sprites/ — these need scripts/migrateMapConfigsToRc.mjs.`)
process.exit(0)
```

- [ ] **Step 2: Run it**

Run: `cd "d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm" && GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/auditMapConfigsTilesets.mjs`
Expected: either `mapConfigs collection is empty…` or a list of `[mapKey] tilesetName: sprites/...` lines followed by a count. Record the output — it tells you exactly which maps Task 9 will touch.

- [ ] **Step 3: Commit**

```bash
git add scripts/auditMapConfigsTilesets.mjs
git commit -m "feat: add read-only audit for mapConfigs tileset paths still under sprites/"
```

---

### Task 5: `rcPathRewrite` pure function (main app repo)

**Files:**
- Create: `d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\src\utils\rcPathRewrite.js`
- Test: `d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\src\utils\rcPathRewrite.test.js`

**Interfaces:**
- Produces: `toRcPath(value: string): string | null` — consumed by Task 6's `migrateMapConfigsToRc.mjs`.

- [ ] **Step 1: Write the failing test**

```js
// src/utils/rcPathRewrite.test.js
import { describe, it, expect } from 'vitest'
import { toRcPath } from './rcPathRewrite'

describe('toRcPath', () => {
  it('rewrites a sprites/tilesets path to rc/tilesets', () => {
    expect(toRcPath('sprites/tilesets/Grass.png')).toBe('rc/tilesets/Grass.png')
  })

  it('rewrites a sprites/objects path to rc/objects', () => {
    expect(toRcPath('sprites/objects/Chest.png')).toBe('rc/objects/Chest.png')
  })

  it('returns null for a path already under rc/', () => {
    expect(toRcPath('rc/tilesets/Grass.png')).toBeNull()
  })

  it('returns null for an unrelated sprites/ path', () => {
    expect(toRcPath('sprites/animals/Chicken.png')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- rcPathRewrite`
Expected: FAIL — `Failed to resolve import "./rcPathRewrite"`

- [ ] **Step 3: Write the implementation**

```js
// src/utils/rcPathRewrite.js
//
// Rewrites a Storage path from the legacy sprites/tilesets or sprites/objects
// prefix (where Roller Coaster custom files leaked before rc/ existed — see
// docs/adr/0007) to its rc/ equivalent. Returns null for any other path.

export function toRcPath(value) {
  if (value.startsWith('sprites/tilesets/')) return value.replace('sprites/tilesets/', 'rc/tilesets/')
  if (value.startsWith('sprites/objects/')) return value.replace('sprites/objects/', 'rc/objects/')
  return null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- rcPathRewrite`
Expected: PASS — 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/utils/rcPathRewrite.js src/utils/rcPathRewrite.test.js
git commit -m "feat: add pure rc/ path rewrite helper"
```

---

### Task 6: Firestore mapConfigs rewrite CLI (main app repo)

**Files:**
- Create: `d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\scripts\migrateMapConfigsToRc.mjs`

**Interfaces:**
- Consumes: `toRcPath` from Task 5's `src/utils/rcPathRewrite.js`.

- [ ] **Step 1: Write the script**

```js
// scripts/migrateMapConfigsToRc.mjs
//
// Rewrites mapConfigs/{key}.tilesets entries that point into sprites/tilesets/
// or sprites/objects/ to their rc/ equivalent. Dry-run by default; pass
// --apply to write. Run scripts/auditMapConfigsTilesets.mjs first to see
// what this will touch.
//
// Run:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/migrateMapConfigsToRc.mjs [--apply]

import admin from 'firebase-admin'
import { toRcPath } from '../src/utils/rcPathRewrite.js'

const APPLY = process.argv.includes('--apply')
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rollercoasterdottodream'

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID })
const db = admin.firestore()

const snap = await db.collection('mapConfigs').get()
let changed = 0

for (const doc of snap.docs) {
  const tilesets = doc.data().tilesets ?? {}
  const next = { ...tilesets }
  let dirty = false
  for (const [name, value] of Object.entries(tilesets)) {
    const rc = toRcPath(value)
    if (rc) {
      console.log(`  [${doc.id}] ${name}: ${value} -> ${rc}`)
      next[name] = rc
      dirty = true
    }
  }
  if (dirty) {
    changed++
    if (APPLY) await doc.ref.update({ tilesets: next })
  }
}

console.log(`\n${changed} map(s) ${APPLY ? 'updated' : 'would be updated'} (${APPLY ? 'applied' : 'dry run — pass --apply to write'})`)
process.exit(0)
```

- [ ] **Step 2: Dry-run and compare against Task 4's audit output**

Run: `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/migrateMapConfigsToRc.mjs`
Expected: the same `[mapKey] name: sprites/... -> rc/...` lines as Task 4's audit flagged, ending with `N map(s) would be updated (dry run…)`.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrateMapConfigsToRc.mjs
git commit -m "feat: add dry-run/--apply CLI to rewrite mapConfigs tileset paths to rc/"
```

---

### Task 7: Repoint `assetManifest.js` to `rc/`

**Files:**
- Modify: `d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\src\game\assetManifest.js`
- Create: `d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\src\game\assetManifest.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/game/assetManifest.test.js
import { describe, it, expect } from 'vitest'
import { GAME_ASSETS } from './assetManifest'

describe('GAME_ASSETS storage paths', () => {
  it('has no entry still pointing at the legacy sprites/tilesets, sprites/objects, or sprites/characters prefixes', () => {
    const legacy = GAME_ASSETS.filter((a) =>
      a.storagePath?.startsWith('sprites/tilesets/') ||
      a.storagePath?.startsWith('sprites/objects/') ||
      a.storagePath?.startsWith('sprites/characters/')
    )
    expect(legacy).toEqual([])
  })

  it('MBTI character entries use the rc/characters/ prefix', () => {
    const enfj = GAME_ASSETS.find((a) => a.key === 'ENFJ')
    expect(enfj.storagePath).toBe('rc/characters/ENFJ.png')
  })

  it('the crops spritesheet uses the rc/objects/ prefix', () => {
    const crops = GAME_ASSETS.find((a) => a.key === 'crops')
    expect(crops.storagePath).toBe('rc/objects/Basic_Plants.png')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- assetManifest`
Expected: FAIL — legacy array is non-empty (current code still uses `sprites/...`)

- [ ] **Step 3: Update `assetManifest.js`**

Modify `src/game/assetManifest.js:18-30` (the `tileset` and `object` helpers):

```js
const tileset = (name) => ({
  key: name,
  type: 'image',
  storagePath: `rc/tilesets/${name}.png`,
  localPath: `/assets/sprites/Tilesets/${name}.png`,
})

const object = (key, file) => ({
  key,
  type: 'image',
  storagePath: `rc/objects/${file}.png`,
  localPath: `/assets/sprites/Objects/${file}.png`,
})
```

Modify `src/game/assetManifest.js:56-63` (the crops entry):

```js
  // Crops — 6×2 grid of 16px frames (turnip/carrot/potato/pumpkin stages)
  {
    key: 'crops',
    type: 'spritesheet',
    storagePath: 'rc/objects/Basic_Plants.png',
    localPath: '/assets/sprites/Objects/Basic_Plants.png',
    frameConfig: { frameWidth: 16, frameHeight: 16 },
  },
```

Modify `src/game/assetManifest.js:65-72` (MBTI characters):

```js
  // Characters — one 48×48 spritesheet per MBTI type
  ...MBTI_TYPES.map((m) => ({
    key: m,
    type: 'spritesheet',
    storagePath: `rc/characters/${m}.png`,
    localPath: `/assets/sprites/Characters/${m}_Charakter_Spritesheet.png`,
    frameConfig: { frameWidth: 48, frameHeight: 48 },
  })),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- assetManifest`
Expected: PASS — 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/game/assetManifest.js src/game/assetManifest.test.js
git commit -m "feat: repoint assetManifest.js tileset/object/character paths to rc/"
```

---

### Task 8: Repoint `mapConfig.js` `DEFAULT_MAP_CONFIGS` to `rc/`

**Files:**
- Modify: `d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\src\utils\mapConfig.js`
- Modify: `d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\src\utils\mapConfig.test.js`

- [ ] **Step 1: Add the failing regression test**

Add to `src/utils/mapConfig.test.js` (new `describe` block, e.g. after the existing `pickEntryKey` block):

```js
import { DEFAULT_MAP_CONFIGS } from './mapConfig'

describe('DEFAULT_MAP_CONFIGS tileset paths', () => {
  it('has no tileset value pointing at the legacy sprites/tilesets or sprites/objects prefixes', () => {
    const legacy = Object.values(DEFAULT_MAP_CONFIGS).flatMap((cfg) =>
      Object.values(cfg.tilesets).filter(
        (v) => v.startsWith('sprites/tilesets/') || v.startsWith('sprites/objects/')
      )
    )
    expect(legacy).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mapConfig`
Expected: FAIL — `legacy` array is non-empty

- [ ] **Step 3: Update `DEFAULT_MAP_CONFIGS`**

Modify `src/utils/mapConfig.js:15-44`:

```js
export const DEFAULT_MAP_CONFIGS = {
  test3: {
    tilesets: {
      'Grass':                     'rc/tilesets/Grass.png',
      'Water':                     'rc/tilesets/Water.png',
      'Wooden House':              'rc/tilesets/Wooden_House.png',
      'Wooden_House_Walls_Tilset': 'rc/tilesets/Wooden_House_Walls_Tilset.png',
      'Wooden_House_Roof_Tilset':  'rc/tilesets/Wooden_House_Roof_Tilset.png',
      'Hills':                     'rc/tilesets/Hills.png',
      'Tilled Dirt':               'rc/tilesets/Tilled_Dirt.png',
      'Tilled_Dirt_v2':            'rc/tilesets/Tilled_Dirt_v2.png',
      'Tilled_Dirt_Wide':          'rc/tilesets/Tilled_Dirt_Wide.png',
      'Tilled_Dirt_Wide_v2':       'rc/tilesets/Tilled_Dirt_Wide_v2.png',
      'Wood_Bridge':               'rc/objects/Wood_Bridge.png',
      'Basic Grass Biom things 1': 'rc/objects/Basic_Grass_Biom_things_1.png',
      'Fences':                    'rc/tilesets/Fences.png',
    },
    collision: { 'Water': true, 'Hill/Wall': true, 'Object': true },
    hidden: {},
  },
  indoor: {
    tilesets: {
      'Basic_Furniture': 'rc/objects/Basic_Furniture.png',
      'Wooden_House':    'rc/tilesets/Wooden_House.png',
      'Chest':           'rc/objects/Chest.png',
    },
    collision: { 'Collision': true },
    hidden: { 'Collision': true },
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- mapConfig`
Expected: PASS — all `mapConfig.test.js` tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/mapConfig.js src/utils/mapConfig.test.js
git commit -m "feat: repoint DEFAULT_MAP_CONFIGS tileset paths to rc/"
```

---

### Task 9: Run the Firestore mapConfigs rewrite (operational)

Only run this after Task 7 and Task 8 are committed — keeps `assetManifest.js`'s `LOCAL_BY_STORAGE` lookup (in `src/game/worldScenes.js`) in sync with whatever `cfg.tilesets` returns, whether from `DEFAULT_MAP_CONFIGS` or a live Firestore doc.

**Files:** none (operational step only)

- [ ] **Step 1: Apply the Firestore rewrite**

Run: `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/migrateMapConfigsToRc.mjs --apply`
Expected: same lines as Task 6's dry-run, ending with `N map(s) updated (applied)`.

- [ ] **Step 2: Re-run the audit to confirm zero remain**

Run: `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/auditMapConfigsTilesets.mjs`
Expected: `0 tileset reference(s) still point into sprites/ — these need scripts/migrateMapConfigsToRc.mjs.`

---

### Task 10: Manual verification

The live game must load correctly from `rc/` before any deletion happens.

**Files:** none (manual verification step)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new/updated `assetManifest.test.js`, `mapConfig.test.js`, `rcPathRewrite.test.js`.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Expected: starts on `http://localhost:5173` with no errors.

- [ ] **Step 3: Load the game and check the outdoor map (`test3`)**

Open `http://localhost:5173` in a browser, open DevTools → Network tab, filter by `rc/`. Confirm:
- Tilesets (Grass, Water, Wooden_House, Hills, Tilled_Dirt variants, Fences) render with no missing/broken tiles.
- Network tab shows successful (200) requests to `rc/tilesets/...` and `rc/objects/...` paths — not `sprites/tilesets/...` or `sprites/objects/...`.
- A player character (any MBTI type) renders and animates — confirms `rc/characters/...` spritesheets load.

- [ ] **Step 4: Load the indoor map**

Navigate to the indoor map in-game. Confirm `Wooden_House`, `Basic_Furniture`, and `Chest` render correctly and Network tab shows `rc/tilesets/Wooden_House.png`, `rc/objects/Basic_Furniture.png`, `rc/objects/Chest.png`.

- [ ] **Step 5: Confirm no console errors**

Check the browser console for any 404s or Phaser load errors related to the migrated files. If any appear, stop — do not proceed to Task 11 until resolved.

---

### Task 11: Run the Storage delete (Assets repo, operational)

Only run this after Task 10 passes in full.

**Files:** none (operational step only)

- [ ] **Step 1: Run the delete**

Run: `cd "D:\Ikkyusan\Downloads\Assets" && GOOGLE_APPLICATION_CREDENTIALS="D:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\serviceAccountKey.json" node scripts/migrateRcAssets.mjs --delete`
Expected: 39 lines of `[deleted] sprites/...`, then `Done -> { deleted: 39 }`, exit code 0.

- [ ] **Step 2: Commit the audit file**

```bash
cd "D:/Ikkyusan/Downloads/Assets"
git add meta/rc-migration-delete.json
git commit -m "chore: record rc/ migration delete audit"
```

---

### Task 12: Confirm Storage is clean (Assets repo, operational)

Reuses the repo's existing quarantine script in dry-run mode — no new script needed, since `quarantineCustomStorageFiles.mjs` without `--apply` already reports exactly this.

**Files:** none (operational step only)

- [ ] **Step 1: Run the existing dry-run diff**

Run: `cd "D:\Ikkyusan\Downloads\Assets" && GOOGLE_APPLICATION_CREDENTIALS="D:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\serviceAccountKey.json" node scripts/quarantineCustomStorageFiles.mjs`
Expected: `Storage is clean — nothing to quarantine.`

---

### Task 13: Update ADR-0007 and write the JSX follow-up handoff

**Files:**
- Modify: `d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\docs\adr\0007-rc-assets-folder-separation.md`
- Create: `d:\Ikkyusan\Desktop\Roller Coaster Dot To Dearm\docs\superpowers\plans\2026-07-03-rc-assets-jsx-followup.md`

- [ ] **Step 1: Update the ADR's directory layout**

Modify `docs/adr/0007-rc-assets-folder-separation.md:15-20`:

```markdown
```
rc/
├── characters/   MBTI spritesheet PNGs (ENFJ.png … ISTP.png)
├── maps/         Tiled JSON map files (test3.json, indoor.json, test2.json …)
├── tilesets/     Custom tileset PNGs not sourced from Sprout Lands
└── objects/      Custom object/furniture PNGs not sourced from Sprout Lands
```
```

- [ ] **Step 2: Add a Phase 2 completion note to the Consequences section**

Append to the end of `docs/adr/0007-rc-assets-folder-separation.md`:

```markdown

## Phase 2 (2026-07-03)

The 39 files that had leaked into `sprites/characters/`, `sprites/tilesets/`, and `sprites/objects/` before this ADR were migrated to `rc/characters/`, `rc/tilesets/`, and `rc/objects/` respectively (see `docs/superpowers/plans/2026-07-03-rc-assets-migration.md`). `assetManifest.js`, `mapConfig.js`, and all live `mapConfigs/*` Firestore documents were repointed to match. `sprites/`, `ui/`, `audio/` in Storage now contain only official Sprout Lands files.

**Not yet done:** `AssetsSection.jsx`, `MapConfigEditor.jsx`, `MapInfoScreen.jsx`, and `assetFolders.js` still write new artist uploads into `sprites/characters/`, `sprites/tilesets/`, and `sprites/objects/` — see the follow-up handoff at `docs/superpowers/plans/2026-07-03-rc-assets-jsx-followup.md`. Until that's fixed, every future Sprout Lands sync will re-flag new artist uploads as orphans.
```

- [ ] **Step 3: Write the JSX follow-up handoff doc**

```markdown
# Follow-up: repoint artist-upload JSX to rc/ (Cursor)

**Context:** `docs/superpowers/plans/2026-07-03-rc-assets-migration.md` migrated the 39 files that had already leaked into `sprites/characters/`, `sprites/tilesets/`, and `sprites/objects/` to their correct `rc/` locations. This is a one-time data fix, not a code fix — the Admin Dashboard components that let artists upload new sprites still write into `sprites/`, so the leak will recur on the next artist upload. Per this project's Claude Code / Cursor split (`CLAUDE.md`), JSX/UI wiring is Cursor's job — this note hands that off.

**Files that need their upload/list/browse targets changed from `sprites/...` to `rc/...`:**

1. `src/components/admin/AssetsSection.jsx` — character upload paths (lines ~116, 133, 141, 160, 205, 224) currently target `sprites/characters/...`. Change to `rc/characters/...`.
2. `src/components/admin/MapConfigEditor.jsx` — `TILESET_FOLDERS` (line 9) is `['sprites/tilesets', 'sprites/objects']` and the upload destination (line 110) is `sprites/tilesets/${sanitize(name)}.png`. Change both to the `rc/` equivalents.
3. `src/components/admin/MapInfoScreen.jsx` — same pattern as MapConfigEditor: `TILESET_FOLDERS` (line 12), `listAll` calls (lines 132-133, 210-211), upload destination (line 180), display paths (lines 397, 406). Change all `sprites/tilesets`/`sprites/objects` references to `rc/tilesets`/`rc/objects`.
4. `src/utils/assetFolders.js` — `SYSTEM_FOLDERS` (lines 4-6) hardcodes `sprites/tilesets` and `sprites/objects` as the two system folders, and `createFolder()` (line 43) builds new custom folders as `sprites/${slug}`. Change the system folder paths to `rc/tilesets`/`rc/objects`, and change `createFolder` to build `rc/${slug}` so any future custom folder an artist creates also lands under `rc/`.

**Also check:** `src/components/admin/FarmItemsTab.jsx:61`, `src/components/admin/FarmPlantsTab.jsx:66`, and `src/components/ItemSprite.jsx:17` all hardcode `getDownloadURL(ref(storage, 'sprites/objects/Basic_Plants.png'))` — these read the crops spritesheet directly rather than via `assetManifest.js`. They must be repointed to `rc/objects/Basic_Plants.png` in the same change, or they'll 404 once this migration's Task 11 delete step removes the old file.

**Not in scope for this note:** Firestore `assetFolders` collection may already contain custom (non-system) folder documents with `path` values under `sprites/`, created via `createFolder()` before this fix. Those existing documents need the same kind of Storage-file migration this plan did for `mapConfigs` — audit `assetFolders` docs for `sprites/` paths and decide whether to migrate them once the JSX change lands.
```

- [ ] **Step 4: Commit**

```bash
git add docs/adr/0007-rc-assets-folder-separation.md docs/superpowers/plans/2026-07-03-rc-assets-jsx-followup.md
git commit -m "docs: mark ADR-0007 phase 2 complete, hand off remaining JSX repoint to Cursor"
```

---

## Self-Review Notes

- **Spec coverage:** every bullet in the approved spec (copy → repoint → verify → delete → confirm clean) has a task. The Firestore `mapConfigs` audit/rewrite (Tasks 4, 6, 9) was added because `src/game/worldScenes.js:45-56` proves `assetManifest.js` storage paths and `mapConfig.js` tileset values must stay byte-identical for the local-fallback lookup (`LOCAL_BY_STORAGE`) to work — this wasn't visible until reading `worldScenes.js`, so it's a necessary addition, not scope creep.
- **Ownership boundary respected:** Tasks 1-13 touch only Node scripts, pure `.js` utils, tests, and docs — no `.jsx` file is modified, matching the user's chosen scope. The 4 JSX files and their `sprites/objects/Basic_Plants.png` readers are fully enumerated in Task 13's handoff doc for Cursor.
- **Ordering safety:** Storage copy (Task 3) happens before any repoint, so nothing is ever unreachable. Storage delete (Task 11) happens only after manual verification (Task 10) confirms the app loads from `rc/`.
