# Architecture Improvement — Plan 2: Claude Code Tasks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slim the repo by ~58 MB of unreferenced assets, cut login latency by parallelizing the session bootstrap, make Storage asset URLs survive page reloads, and close the `db.js` ref seam in the non-JSX data layer.

**Architecture:** No new modules. Task 1 is pure deletion (guard-grep before every `git rm`). Task 2 restructures `bootstrapSession` into two `Promise.all` waves while keeping the per-step error isolation. Task 3 adds a localStorage tier under the existing `cloudAsset` interface (callers unchanged). Task 4 registers 5 collections in `db.js` and repoints the 4 lib/utils files that inline `doc(db,...)`.

**Tech Stack:** Node/git, Firebase JS SDK 12 (Firestore + Storage), Zustand 5, Vitest (jsdom).

**Prerequisite:** Plan 1 (`2026-07-03-arch-plan1-cursor-frontend.md`) is merged — Task 1's MP3 step and Task 4's `assetFolders.js` edits build on it. Verified if `git log --oneline` contains "perf: drop bundled background-music fallback".

## Global Constraints

- **No TypeScript** — plain JS only.
- **Firebase paths** — only via `src/lib/db.js` refs/cols/shapes (Task 4 enforces this, don't regress it elsewhere).
- **Firestore writes** — debounced via `syncManager`; never add synchronous writes.
- **ADR-0003** — Storage is authoritative for game assets; repo copies under `public/assets/` are live fallbacks — do NOT delete them in this plan.
- **ADR-0004** — game *state* must never persist to localStorage. Task 3 persists asset *URLs* (display-only, ADR-0003 territory) — not state; do not extend the pattern to stores.
- **`serviceAccountKey.json`** — never read, commit, or log.
- Each task ends with `npm test` green and its own commit(s).

---

### Task 1: Purge unreferenced assets and dead code from the repo

The repo is ~98.6 MB; `assets/` is 94.88 MB of which ~58 MB is referenced by nothing (verified by exploration: the only asset references are `new URL(...)` in `src/data/onboardingData.js`, `src/components/NewsPanel.jsx`, `src/pages/HomePage.jsx`, plus one dynamic pattern `assets/eachPageAssets/skill/Skill/${name}.png`). Every deletion below is re-guarded by grep at execution time — trust the grep, not this document.

**Files:**
- Delete: `assets/eachPageAssets/home/Background/` (entire dir, 47.10 MB — unused per-MBTI PNGs/MP4s)
- Delete: unreferenced top-level `assets/0*.png` design mockups (~15 files, 4.76 MB)
- Delete: unreferenced `assets/eachPageAssets/**/*_{Control,Nav-bar,Footer,Content,Refferent,Referent}.png` mockups (~28 files, 6.30 MB)
- Delete: `assets/eachPageAssets/home/Background_Music_1.mp3` (bundled fallback dropped in Plan 1 Task 4)
- Delete: Sprout Lands pack extras under `public/assets/` (aseprite source, palette refs, bitmask tutorials, read_me.txt)
- Delete: `public/maps/world.tmj`, `public/maps/indoor.tmj` (Tiled sources; runtime loads `.json` only — `grep -r "\.tmj" src/` = 0 hits)
- Delete: `src/utils/rcPathRewrite.js` + `src/utils/rcPathRewrite.test.js` (dead: only importer is its own test)
- Delete: `scripts/auditMapConfigsTilesets.mjs`, `scripts/migrateMapConfigsToRc.mjs` (one-shot ADR-0007 migration helpers, already run; not in `package.json` scripts)
- Modify: `.gitignore` (add `*.aseprite`, `coverage/`)

**Do NOT delete** (explicitly): `assets/03_Setup_Carrer_Refferent.png`, `assets/03_Setup_Mastery_Refferent.png` (referenced by `onboardingData.js:45-46`); anything under `eachPageAssets/mbti/Character/`, `eachPageAssets/news/`, `eachPageAssets/skill/Skill/`, `eachPageAssets/page4/` (Group D university logos stay pending a user decision — see Plan 3); any `*_Background.png`; the whole `public/assets/` fallback tree except the pack-extras listed; `public/maps/world.json` (pending Plan 3 decision).

- [ ] **Step 1: Guarded delete of Group A** (Git Bash):

```bash
grep -rn "home/Background/" src/ && echo "STOP - referenced" || git rm -r -q "assets/eachPageAssets/home/Background"
```

Expected: no grep hits, directory removed (25 files).

- [ ] **Step 2: Guarded delete of unreferenced mockups (Groups B + C).** For every candidate, delete only if its basename appears nowhere in `src/`:

```bash
candidates=$(git ls-files 'assets/0*.png' 'assets/eachPageAssets/**' \
  | grep -E '(_Control|_Nav-bar|_Footer|_Content|_Refferent|_Referent|/0[0-9]_[^/]+)\.png$')
for f in $candidates; do
  base=$(basename "$f")
  if grep -rqF "$base" src/; then echo "KEEP (referenced): $f"; else git rm -q "$f"; fi
done
git status --short | head -50
```

Expected: ~43 deletions; `KEEP` lines must include `03_Setup_Carrer_Refferent.png` and `03_Setup_Mastery_Refferent.png`.

- [ ] **Step 3: Delete the now-orphaned MP3** (guard: Plan 1 Task 4 removed the bundled reference):

```bash
grep -rn "eachPageAssets/home/Background_Music_1" src/ && echo "STOP - still referenced" \
  || git rm -q "assets/eachPageAssets/home/Background_Music_1.mp3"
```

- [ ] **Step 4: Commit the asset purge** — `git commit -m "chore: remove ~58MB of unreferenced design mockups and MBTI background media"`

- [ ] **Step 5: Delete public/ pack extras and Tiled sources** (each with the same basename guard-grep against `src/`):

```bash
for f in \
  "public/assets/sprites/Sprout_Lands_color_pallet/Sprout_Lands_defautlt_palette.aseprite" \
  "public/assets/sprites/Sprout_Lands_color_pallet/Sprout_Lands_defautlt_palette.png" \
  "public/assets/sprites/Sprout_Lands_color_pallet/Sprout_Lands_defautlt_palette_snip.PNG" \
  "public/assets/sprites/Tilesets/Bitmask_references_1.png" \
  "public/assets/sprites/Tilesets/Bitmask_references_2.png" \
  "public/assets/sprites/Tilesets/Bitmask_references_gif.gif" \
  "public/assets/sprites/read_me.txt" \
  "public/assets/ui/read_me.txt" \
  "public/maps/world.tmj" \
  "public/maps/indoor.tmj"; do
  [ -f "$f" ] || { echo "MISSING (check name): $f"; continue; }
  base=$(basename "$f")
  if grep -rqF "$base" src/; then echo "KEEP (referenced): $f"; else git rm -q "$f"; fi
done
```

If a listed file reports `MISSING`, find its real name with `git ls-files public/ | grep -i <fragment>` and re-run for it — do not skip silently.

- [ ] **Step 6: Delete dead code** (guard: prove the only importer of `rcPathRewrite` is its test, and the scripts aren't wired into `package.json`):

```bash
grep -rn "rcPathRewrite" src/ scripts/ --include='*.js' --include='*.mjs' | grep -v "rcPathRewrite.test\|rcPathRewrite.js:"
grep -n "auditMapConfigsTilesets\|migrateMapConfigsToRc" package.json
git rm -q src/utils/rcPathRewrite.js src/utils/rcPathRewrite.test.js \
  scripts/auditMapConfigsTilesets.mjs scripts/migrateMapConfigsToRc.mjs
```

Expected: both greps print nothing before the `git rm`.

- [ ] **Step 7: `.gitignore`** — append:

```gitignore
coverage/
*.aseprite
```

- [ ] **Step 8: Verify nothing broke** — `npm test` → PASS; `npm run build` → succeeds. Then `git count-objects -vH` and record size.

- [ ] **Step 9: Commit** — `git commit -m "chore: drop Tiled sources, asset-pack extras, dead rcPathRewrite and one-shot migration scripts"`

---

### Task 2: Parallelize `bootstrapSession` and drop the duplicate user-doc read

Login currently blocks the UI on ~10 *serial* Firestore round-trips (`useAuthStore.js:14-21` awaits the whole bootstrap before `loading: false`). The reads are independent except: the user doc must exist before user-scoped hydrations (new-user case), and coins re-reads the exact doc `ensureUserDoc` just fetched.

**Files:**
- Modify: `src/services/sessionBootstrap.js`
- Test: `src/services/sessionBootstrap.test.js` (exists — update)

**Interfaces:**
- Consumes: everything it already imports; no import changes.
- Produces: `bootstrapSession(firebaseUser)` / `teardownSession()` — signatures unchanged; `useAuthStore` needs no edit.

- [ ] **Step 1: Read `src/services/sessionBootstrap.test.js`** to learn the existing mock structure (it mocks `firebase/firestore`, `../lib/db`, `../lib/syncManager`, etc.). Preserve its patterns.

- [ ] **Step 2: Add failing tests** for the new behavior:

```js
it('reads the user doc exactly once (coins come from the ensureUserDoc read)', async () => {
  // arrange: getDoc resolves a doc with exists()=true and data()={ coins: 42 }
  await bootstrapSession(fakeUser)
  const userDocReads = getDoc.mock.calls.filter(([ref]) => ref === userRefSentinel)
  expect(userDocReads).toHaveLength(1)
  expect(useUserStore.getState().setCoins).toHaveBeenCalledWith(42)
})

it('one failing hydration does not block the others', async () => {
  hydrateTasksFromFirestore.mockRejectedValueOnce(new Error('boom'))
  await bootstrapSession(fakeUser)
  expect(hydrateRoadmapFromFirestore).toHaveBeenCalled()
  expect(setTaskSyncUser).not.toHaveBeenCalled() // arm skipped when its hydrate failed
})
```

(Adapt sentinel/mocking names to the existing file's conventions.) Run: `npx vitest run src/services/sessionBootstrap.test.js` → new tests FAIL.

- [ ] **Step 3: Rewrite the bootstrap body.** `ensureUserDoc` returns the doc data; the sequence becomes two waves:

```js
async function ensureUserDoc(firebaseUser) {
  const ref = refs.user(firebaseUser.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()
  const { mbti, program, university, mastery } = readSelectStore()
  const initial = shapes.initialUser(firebaseUser, { mbti, program, university, mastery })
  await setDoc(ref, initial)
  return initial
}

/**
 * Run the post-login sequence: ensure the user doc, hydrate each store from
 * Firestore, and arm the debounced sync writers. Steps run in two parallel
 * waves (the user doc must exist before the user-scoped hydrations); every
 * step is isolated so one failure never aborts the rest, and nothing is
 * swallowed silently.
 */
export async function bootstrapSession(firebaseUser) {
  const uid = firebaseUser.uid
  const step = (name, fn) =>
    fn().catch((e) => console.error(`[sessionBootstrap] ${name} failed:`, e))

  // Wave 1 — user doc creation gates the user-scoped reads below; the farm
  // data catalog is global and rides along in parallel.
  const [userData] = await Promise.all([
    step('ensureUserDoc', () => ensureUserDoc(firebaseUser)),
    step('hydrate farm data', () => hydrateFarmDataFromFirestore()),
  ])

  // Coins — authoritative value set by Cloud Functions, taken from the doc
  // ensureUserDoc already read (no second round-trip).
  const serverCoins = userData?.coins ?? 0
  if (serverCoins > 0) useUserStore.getState().setCoins(serverCoins)

  // Wave 2 — independent per-store hydrations; each arms its debounced
  // writer only after its own hydrate succeeded.
  await Promise.all([
    step('hydrate select', () => hydrateSelectStoreFromFirestore(uid)),
    step('hydrate/arm portfolio', async () => {
      await hydratePortfolioFromFirestore(uid)
      setPortfolioSyncUser(uid)
    }),
    step('hydrate/arm tasks', async () => {
      await hydrateTasksFromFirestore(uid)
      setTaskSyncUser(uid)
    }),
    step('hydrate/arm roadmap', async () => {
      await hydrateRoadmapFromFirestore(uid)
      setRoadmapSyncUser(uid)
    }),
    step('hydrate map', async () => {
      await hydrateMapFromFirestore(uid)
      useWorldStore.getState().setMapOwner(uid)
      armMapSync(uid)
    }),
    step('hydrate/arm inventory', async () => {
      await hydrateInventoryFromFirestore(uid)
      setInventorySyncUser(uid)
    }),
    step('hydrate/arm farm', async () => {
      await hydrateFarmFromFirestore(uid)
      armFarmSync(uid)
    }),
  ])
}
```

`readSelectStore`, imports, the module header comment, and `teardownSession` stay as they are (update the header's Thai summary if it describes the old serial flow).

- [ ] **Step 4: Run the suite** — `npx vitest run src/services/sessionBootstrap.test.js` → PASS (fix any pre-existing tests that asserted serial ordering — order within a wave is no longer defined; assert on *calls made*, not call order across stores).

- [ ] **Step 5: Full tests** — `npm test` → PASS.

- [ ] **Step 6: Commit** — `git commit -m "perf: parallelize session bootstrap into two waves, reuse the ensureUserDoc read for coins"`

---

### Task 3: Persist `cloudAsset` URL cache across reloads (and fix tech-debt M-6)

`src/utils/cloudAsset.js` caches `path → Promise<url>` in a `Map`, so every hard refresh re-runs up to ~34 `getDownloadURL` round-trips before the game can render. Add a localStorage tier (24 h TTL) under the same interface. This also fixes the documented M-6 debt: `bustCache` now clears a *resolved* value, and we persist resolved strings, not promises.

**Files:**
- Modify: `src/utils/cloudAsset.js` (complete replacement below)
- Test: `src/utils/cloudAsset.test.js` (exists — extend)

**Interfaces:**
- Produces: `cloudAsset(path, { fallback })` and `bustCache(path)` — signatures unchanged; no caller changes anywhere.

- [ ] **Step 1: Read `src/utils/cloudAsset.test.js`** to reuse its mock setup (`vi.mock('firebase/storage')` etc.).

- [ ] **Step 2: Add failing tests:**

```js
it('persists a resolved URL to localStorage and reuses it after a module reset (no second getDownloadURL)', async () => {
  getDownloadURL.mockResolvedValueOnce('https://cdn/x.png')
  await cloudAsset('rc/tilesets/Grass.png')
  vi.resetModules()
  const fresh = await import('./cloudAsset.js')
  const url = await fresh.cloudAsset('rc/tilesets/Grass.png')
  expect(url).toBe('https://cdn/x.png')
  expect(getDownloadURL).toHaveBeenCalledTimes(1)
})

it('refetches when the persisted entry is older than the TTL', async () => {
  localStorage.setItem('rc-asset-url:p', JSON.stringify({ url: 'https://old', ts: Date.now() - 25 * 60 * 60 * 1000 }))
  getDownloadURL.mockResolvedValueOnce('https://new')
  expect(await cloudAsset('p')).toBe('https://new')
})

it('bustCache clears the persisted entry too', async () => {
  getDownloadURL.mockResolvedValueOnce('https://cdn/x.png')
  await cloudAsset('p')
  bustCache('p')
  expect(localStorage.getItem('rc-asset-url:p')).toBeNull()
})

it('does not persist fallback results', async () => {
  getDownloadURL.mockRejectedValueOnce(new Error('offline'))
  await cloudAsset('p', { fallback: '/assets/x.png' })
  expect(localStorage.getItem('rc-asset-url:p')).toBeNull()
})
```

Run → FAIL.

- [ ] **Step 3: Replace `src/utils/cloudAsset.js`:**

```js
import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

// Resolves a Storage path to a download URL. Two cache tiers:
//   1. in-memory Promise map — concurrent callers share one round-trip
//   2. localStorage (`rc-asset-url:<path>`, 24 h TTL) — survives reloads so a
//      refresh doesn't re-run getDownloadURL for every asset before the game
//      can render. Display-asset URLs only (ADR-0003) — never game state
//      (ADR-0004).
// On any error (offline, missing object, rules) resolves to `fallback`;
// fallbacks are never persisted.
const urlCache = new Map() // path -> Promise<string|null>
const STORE_PREFIX = 'rc-asset-url:'
const TTL_MS = 24 * 60 * 60 * 1000

function readPersisted(path) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + path)
    if (!raw) return null
    const { url, ts } = JSON.parse(raw)
    return url && Date.now() - ts <= TTL_MS ? url : null
  } catch {
    return null
  }
}

function writePersisted(path, url) {
  try {
    localStorage.setItem(STORE_PREFIX + path, JSON.stringify({ url, ts: Date.now() }))
  } catch {
    /* quota full / private mode — the in-memory tier still works */
  }
}

export function cloudAsset(path, { fallback = null } = {}) {
  if (!urlCache.has(path)) {
    const persisted = readPersisted(path)
    urlCache.set(
      path,
      persisted
        ? Promise.resolve(persisted)
        : getDownloadURL(ref(storage, path))
            .then((url) => {
              writePersisted(path, url)
              return url
            })
            .catch((err) => {
              console.warn('[cloudAsset] falling back for', path, err?.code || err)
              return fallback
            }),
    )
  }
  return urlCache.get(path)
}

// Drop a cached URL (both tiers) so the next cloudAsset() re-fetches — used
// after an admin replaces an asset in Storage. Other clients' persisted
// entries age out within the TTL.
export function bustCache(path) {
  urlCache.delete(path)
  try {
    localStorage.removeItem(STORE_PREFIX + path)
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 4: Run** — `npx vitest run src/utils/cloudAsset.test.js` → PASS (fix any pre-existing test that assumed no localStorage side effects by clearing `localStorage` in `beforeEach`).

- [ ] **Step 5: Full tests** — `npm test` → PASS.

- [ ] **Step 6: Commit** — `git commit -m "perf: persist cloudAsset URL cache in localStorage with 24h TTL (fixes M-6)"`

---

### Task 4: Register the missing collections in `db.js` and repoint the lib/utils call sites

`src/lib/db.js` is the documented single seam for Firestore paths, but `farmPlants`/`farmItems`/`farmShops`/`mapConfigs`/`musicConfig`/`assetFolders` are managed by inline `doc(db,...)`/`collection(db,...)` in lib/utils files. Register them and repoint the non-JSX call sites (JSX call sites are Plan 3 backlog for Cursor).

**Files:**
- Modify: `src/lib/db.js`
- Modify: `src/lib/farmDataSync.js`
- Modify: `src/utils/musicConfig.js`
- Modify: `src/utils/assetFolders.js` (Firestore plumbing only — Plan 1 already changed its `rc/` paths; do not touch `SYSTEM_FOLDERS` values)
- Modify: `src/utils/mapConfig.js`
- Test: `src/lib/db.test.js`, `src/lib/farmDataSync.test.js`, `src/utils/musicConfig.test.js` (if present), `src/utils/assetFolders.test.js`, `src/utils/mapConfig.test.js`

**Interfaces:**
- Produces (new in `db.js`): `refs.mapConfig(key)`, `refs.musicConfig(docId)`, `refs.assetFolder(id)`; `cols.farmPlants`, `cols.farmItems`, `cols.farmShops`, `cols.mapConfigs`, `cols.assetFolders`. All existing exports unchanged.

- [ ] **Step 1: Extend `src/lib/db.js`** — add to `refs`:

```js
  map:         (uid)            => doc(db, 'maps', uid),
  mapConfig:   (key)            => doc(db, 'mapConfigs', key),
  musicConfig: (docId)          => doc(db, 'musicConfig', docId),
  assetFolder: (id)             => doc(db, 'assetFolders', id),
```

(keep `map` as-is; the three new lines go beside it) and to `cols`:

```js
  farmPlants:   collection(db, 'farmPlants'),
  farmItems:    collection(db, 'farmItems'),
  farmShops:    collection(db, 'farmShops'),
  mapConfigs:   collection(db, 'mapConfigs'),
  assetFolders: collection(db, 'assetFolders'),
```

Add matching cases to `src/lib/db.test.js` following its existing assertion style.

- [ ] **Step 2: `src/lib/farmDataSync.js`** — replace the inline names:

```js
import { getDocs, doc, setDoc } from 'firebase/firestore'
import { cols } from './db.js'
import { useFarmDataStore } from '../stores/useFarmDataStore.js'
import { PLANTS } from '../data/PlantData.js'
import { ITEMS } from '../data/ItemData.js'
import { SHOPS } from '../data/ShopData.js'

async function seedIfEmpty(col, defaults, snap) {
  if (!snap.empty) return snap
  await Promise.all(
    Object.entries(defaults).map(([id, data]) => setDoc(doc(col, id), data))
  )
  return null // signal: use JS defaults
}

export async function hydrateFarmDataFromFirestore() {
  const [plantsSnap, itemsSnap, shopsSnap] = await Promise.all([
    getDocs(cols.farmPlants),
    getDocs(cols.farmItems),
    getDocs(cols.farmShops),
  ])

  const plantsNull = await seedIfEmpty(cols.farmPlants, PLANTS, plantsSnap)
  const itemsNull  = await seedIfEmpty(cols.farmItems,  ITEMS,  itemsSnap)
  const shopsNull  = await seedIfEmpty(cols.farmShops,  SHOPS,  shopsSnap)
  // (setPlants/setItems/setShops block unchanged)
```

- [ ] **Step 3: `src/utils/musicConfig.js`** — `import { refs } from '../lib/db'`, drop `doc` and `db` imports, and:

```js
const cfgRef = () => refs.musicConfig(MUSIC_DOC_ID)
```

- [ ] **Step 4: `src/utils/mapConfig.js`** — `import { refs, cols } from '../lib/db'`, drop `doc`, `collection`, `db` imports, and:

```js
const cfgRef = (key) => refs.mapConfig(key)
// in listMapConfigs():
const snap = await getDocs(cols.mapConfigs)
```

- [ ] **Step 5: `src/utils/assetFolders.js`** — `import { refs, cols } from '../lib/db'`, drop `collection` and `db` imports, and:

```js
const col = () => cols.assetFolders
// in renameFolder() and trashFolder():
await updateDoc(refs.assetFolder(id), { ... })
```

(`doc(col())` auto-id call sites keep using `doc` from `firebase/firestore` — only the hardcoded collection/doc names move to the seam.)

- [ ] **Step 6: Run the touched suites** — `npx vitest run src/lib src/utils` → PASS. Existing tests that mock `firebase/firestore` keep working (db.js routes through the same mocked `doc`/`collection`); update any test that asserted literal `collection(db, 'farmPlants')` call args to assert through the seam instead.

- [ ] **Step 7: Verify the seam** — `grep -rn "collection(db, 'farm\|doc(db, 'mapConfigs\|doc(db, 'musicConfig\|'assetFolders'" src/lib src/utils` → only `src/lib/db.js` hits remain.

- [ ] **Step 8: Full tests** — `npm test` → PASS.

- [ ] **Step 9: Commit** — `git commit -m "refactor: register farm/map/music/assetFolder collections in db.js and repoint lib+utils call sites"`
