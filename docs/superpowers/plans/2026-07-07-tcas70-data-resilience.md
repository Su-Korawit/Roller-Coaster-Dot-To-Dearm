# TCAS70 University Data Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make `/api/mytcas` survive TCAS cycle transitions by serving a last-known-good snapshot from Firebase Storage when the live MyTCAS dataset is mid-rebuild, with a configurable TCAS year and honest client copy for un-announced admission rounds.

**Architecture:** The `/api/mytcas` response contract stays frozen (additive fields only) — it is the single seam for university data. Degraded-mode decision logic lives in pure helpers (`api/mytcasSource.js`) tested like `shopCredit.test.js`; the Vercel handler stays thin and is verified manually through the vite dev middleware. The snapshot + a small meta document (TCAS year, row count, refresh time) live in Firebase Storage under a new public-read `data/` prefix, refreshed by a Node script following the `scripts/uploadAssets.mjs` pattern.

**Tech Stack:** Vercel serverless (plain Node, no deps), Firebase Storage + firebase-admin (script only), Vitest (+ jsdom for component tests), React hooks.

## Global Constraints

- **No TypeScript** — plain JS + JSX only. No type annotations.
- **`/api/mytcas` contract frozen** — every change to response bodies must be *additive* (new fields only); existing field names, shapes, and status codes for populated data are untouched.
- **No new test seams** — pure-helper tests (prior art `src/services/shopCredit.test.js`) and existing component/hook tests (`// @vitest-environment jsdom`) only. Do NOT write tests that import and invoke the `api/mytcas.js` handler.
- **Firebase paths** — this epic touches Storage only (no Firestore); client code must not inline Firebase calls.
- **User-facing copy is Thai**, rendered with `thai-font` class; keep existing tone.
- **`serviceAccountKey.json`** is gitignored — never read, commit, or log it.
- Bucket: `rollercoasterdottodream.firebasestorage.app`.
- Current cycle: **TCAS70 → Buddhist-era year 2570** (label = `TCAS${year - 2500}`).

**Background (why):** MyTCAS wiped `courses.json` for the TCAS70 cycle — as of 2026-07-07 it holds ~180 rows instead of tens of thousands, and `https://tcas65.as.r.appspot.com/program-projects/program-id/{id}` returns `[]`. Onboarding's university grid is nearly empty in production. This recurs every cycle transition. See PRD issue #36, Epic A.

---

### Task 1: Pure source-selection helpers

**Files:**
- Create: `api/mytcasSource.js`
- Test: `api/mytcasSource.test.js`

**Interfaces:**
- Consumes: nothing (pure module, zero imports).
- Produces (used by Task 2's handler wiring):
  - `MIN_LIVE_ROWS` — number constant, `5000`.
  - `pickCourseSource({ liveRows, snapshotRows, minRows? })` → `{ rows: Array, source: 'live' | 'snapshot' }`
  - `resolveTcasYear(meta, fallbackYear)` → integer Buddhist-era year
  - `buildRoundsPayload(programId, tcasYear, rounds)` → `{ program_id, tcas_year, rounds, announced }`

- [x] **Step 1: Write the failing tests**

Create `api/mytcasSource.test.js` (node environment — no jsdom pragma needed; vitest picks up any `*.test.js` outside `test/rules/`):

```js
import { describe, it, expect } from 'vitest'
import {
  MIN_LIVE_ROWS,
  pickCourseSource,
  resolveTcasYear,
  buildRoundsPayload,
} from './mytcasSource'

const rows = (n) => Array.from({ length: n }, (_, i) => ({ program_id: `p${i}` }))

describe('pickCourseSource', () => {
  it('serves live data when it passes the sanity threshold', () => {
    const live = rows(MIN_LIVE_ROWS)
    const snap = rows(10)
    expect(pickCourseSource({ liveRows: live, snapshotRows: snap })).toEqual({
      rows: live,
      source: 'live',
    })
  })

  it('falls back to the snapshot when live is mid-rebuild (few rows)', () => {
    const live = rows(180)
    const snap = rows(30000)
    expect(pickCourseSource({ liveRows: live, snapshotRows: snap })).toEqual({
      rows: snap,
      source: 'snapshot',
    })
  })

  it('serves degraded live data when the snapshot is even smaller', () => {
    const live = rows(180)
    const snap = rows(0)
    expect(pickCourseSource({ liveRows: live, snapshotRows: snap })).toEqual({
      rows: live,
      source: 'live',
    })
  })

  it('tolerates non-array inputs (failed fetches pass undefined)', () => {
    expect(pickCourseSource({ liveRows: undefined, snapshotRows: undefined })).toEqual({
      rows: [],
      source: 'live',
    })
    const snap = rows(3)
    expect(pickCourseSource({ liveRows: null, snapshotRows: snap })).toEqual({
      rows: snap,
      source: 'snapshot',
    })
  })

  it('honors a custom minRows threshold', () => {
    const live = rows(10)
    expect(pickCourseSource({ liveRows: live, snapshotRows: rows(5), minRows: 10 })).toEqual({
      rows: live,
      source: 'live',
    })
  })
})

describe('resolveTcasYear', () => {
  it('reads a valid year from meta', () => {
    expect(resolveTcasYear({ tcasYear: 2570 }, 2569)).toBe(2570)
  })
  it('accepts numeric strings (JSON edited by hand)', () => {
    expect(resolveTcasYear({ tcasYear: '2571' }, 2570)).toBe(2571)
  })
  it('falls back when meta is missing or absurd', () => {
    expect(resolveTcasYear(null, 2570)).toBe(2570)
    expect(resolveTcasYear({}, 2570)).toBe(2570)
    expect(resolveTcasYear({ tcasYear: 70 }, 2570)).toBe(2570)
    expect(resolveTcasYear({ tcasYear: 'next' }, 2570)).toBe(2570)
  })
})

describe('buildRoundsPayload', () => {
  it('marks announced=true when rounds exist', () => {
    const rounds = [{ round: 3, projects: [] }]
    expect(buildRoundsPayload('P1', 2570, rounds)).toEqual({
      program_id: 'P1',
      tcas_year: 2570,
      rounds,
      announced: true,
    })
  })
  it('marks announced=false for the empty upstream (criteria not yet published)', () => {
    expect(buildRoundsPayload('P1', 2570, [])).toEqual({
      program_id: 'P1',
      tcas_year: 2570,
      rounds: [],
      announced: false,
    })
  })
})
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run api/mytcasSource.test.js`
Expected: FAIL — `Cannot find module './mytcasSource'` (or equivalent resolve error).

- [x] **Step 3: Write the implementation**

Create `api/mytcasSource.js`:

```js
// api/mytcasSource.js
// Pure decision logic for /api/mytcas degraded-mode handling. No imports, no
// I/O — the handler does the fetching, these functions decide what to serve.
// Tested in api/mytcasSource.test.js (the handler itself is not a test seam).

// Live courses.json below this row count means MyTCAS is mid-rebuild for a new
// TCAS cycle (the full dataset is tens of thousands of rows; 2026-07-07 it
// briefly held ~180).
export const MIN_LIVE_ROWS = 5000

export function pickCourseSource({ liveRows, snapshotRows, minRows = MIN_LIVE_ROWS }) {
  const live = Array.isArray(liveRows) ? liveRows : []
  const snapshot = Array.isArray(snapshotRows) ? snapshotRows : []
  if (live.length >= minRows) return { rows: live, source: 'live' }
  if (snapshot.length > live.length) return { rows: snapshot, source: 'snapshot' }
  return { rows: live, source: 'live' }
}

export function resolveTcasYear(meta, fallbackYear) {
  const year = Number(meta?.tcasYear)
  // Sanity window: Buddhist-era years around the app's lifetime.
  if (Number.isInteger(year) && year >= 2560 && year <= 2620) return year
  return fallbackYear
}

export function buildRoundsPayload(programId, tcasYear, rounds) {
  return {
    program_id: programId,
    tcas_year: tcasYear,
    rounds,
    announced: rounds.length > 0,
  }
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run api/mytcasSource.test.js`
Expected: PASS — 10 tests.

- [x] **Step 5: Commit**

```bash
git add api/mytcasSource.js api/mytcasSource.test.js
git commit -m "feat(mytcas): pure source-selection helpers for TCAS cycle-transition fallback"
```

---

### Task 2: Storage rules — public-read `data/` prefix

**Files:**
- Modify: `storage.rules` (insert before the `/welcome/` block, around line 91)

**Interfaces:**
- Produces: public-read Storage prefix `data/**` (super-admin write) that Task 3's script writes to and Task 4's handler reads from via the REST `alt=media` URL.

- [x] **Step 1: Add the rule block**

In `storage.rules`, directly above the `// Welcome page media` comment, insert:

```
    // Server-consumed public datasets (e.g. the MyTCAS snapshot that
    // /api/mytcas falls back to during TCAS cycle transitions). World-readable
    // by design — the Vercel function fetches these anonymously via alt=media.
    // Written only by scripts/refreshTcasSnapshot.mjs (admin SDK) or the owner.
    match /data/{allPaths=**} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
```

- [x] **Step 2: Deploy the rules**

Run: `firebase deploy --only storage`
Expected output ends with: `Deploy complete!`
(If the Firebase CLI is not logged in on this machine, flag it to the human — do not skip; Task 4's fallback fetch returns 403 until this deploys.)

- [x] **Step 3: Commit**

```bash
git add storage.rules
git commit -m "feat(storage): public-read data/ prefix for server-consumed datasets"
```

---

### Task 3: Snapshot refresh script

**Files:**
- Create: `scripts/refreshTcasSnapshot.mjs`
- Modify: `package.json` (add script), `CLAUDE.md` (Key Commands block)

**Interfaces:**
- Consumes: Storage prefix `data/mytcas/` from Task 2; firebase-admin (already a devDependency — used by `scripts/uploadAssets.mjs`).
- Produces: Storage objects `data/mytcas/courses-snapshot.json` (full live dataset) and `data/mytcas/meta.json` with shape `{ tcasYear: number, rows: number, updatedAt: string }` — read by Task 4.

- [x] **Step 1: Write the script**

Create `scripts/refreshTcasSnapshot.mjs`:

```js
// Refreshes the MyTCAS fallback snapshot in Firebase Storage.
// /api/mytcas serves this snapshot whenever the live courses.json is
// mid-rebuild for a new TCAS cycle (row count under MIN_LIVE_ROWS).
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/refreshTcasSnapshot.mjs
//   ... --year 2570   also set the current TCAS Buddhist-era year in meta.json
//   ... --force       upload even if the live dataset looks mid-rebuild
//
// Refuses (without --force) to overwrite a larger snapshot with a smaller live
// dataset, so running it during a cycle transition cannot destroy the fallback.

import admin from 'firebase-admin'
import { MIN_LIVE_ROWS } from '../api/mytcasSource.js'

const S3_URL = 'https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json'
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'rollercoasterdottodream.firebasestorage.app'
const SNAPSHOT_PATH = 'data/mytcas/courses-snapshot.json'
const META_PATH = 'data/mytcas/meta.json'
const DEFAULT_TCAS_YEAR = 2570

function argValue(flag) {
  const i = process.argv.indexOf(flag)
  return i === -1 ? null : process.argv[i + 1]
}

async function readJsonIfExists(bucket, path) {
  const file = bucket.file(path)
  const [exists] = await file.exists()
  if (!exists) return null
  const [buf] = await file.download()
  return JSON.parse(buf.toString('utf8'))
}

async function saveJson(bucket, path, data) {
  await bucket.file(path).save(JSON.stringify(data), {
    contentType: 'application/json',
    metadata: { cacheControl: 'public, max-age=300' },
  })
}

async function main() {
  const force = process.argv.includes('--force')
  const yearArg = argValue('--year')

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: BUCKET,
  })
  const bucket = admin.storage().bucket()

  const existingMeta = await readJsonIfExists(bucket, META_PATH)
  const tcasYear = yearArg ? Number(yearArg) : (existingMeta?.tcasYear ?? DEFAULT_TCAS_YEAR)
  if (!Number.isInteger(tcasYear)) throw new Error(`--year must be an integer, got: ${yearArg}`)

  const res = await fetch(S3_URL)
  if (!res.ok) throw new Error(`live courses.json fetch failed: ${res.status}`)
  const liveRows = await res.json()
  if (!Array.isArray(liveRows)) throw new Error('live courses.json is not an array')

  console.log(`live rows:            ${liveRows.length}`)
  console.log(`existing snapshot:    ${existingMeta ? `${existingMeta.rows} rows @ ${existingMeta.updatedAt}` : '(none)'}`)
  console.log(`tcas year:            ${tcasYear} (TCAS${tcasYear - 2500})`)

  const liveLooksHealthy = liveRows.length >= MIN_LIVE_ROWS
  const shrinks = existingMeta && liveRows.length < existingMeta.rows

  if ((liveLooksHealthy || force) && !(shrinks && !force)) {
    await saveJson(bucket, SNAPSHOT_PATH, liveRows)
    await saveJson(bucket, META_PATH, {
      tcasYear,
      rows: liveRows.length,
      updatedAt: new Date().toISOString(),
    })
    console.log(`snapshot refreshed:   ${liveRows.length} rows uploaded`)
  } else {
    // Live data is mid-rebuild (or would shrink the fallback) — keep the
    // snapshot, but still persist a year change if one was requested.
    if (yearArg && existingMeta) {
      await saveJson(bucket, META_PATH, { ...existingMeta, tcasYear })
      console.log('snapshot kept; meta.tcasYear updated')
    } else {
      console.log('snapshot kept (live dataset looks mid-rebuild; use --force to override)')
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [x] **Step 2: Add the npm script**

In `package.json` `"scripts"`, after `"reset-farm-data"`, add:

```json
"refresh-tcas-snapshot": "node scripts/refreshTcasSnapshot.mjs"
```

- [x] **Step 3: Document the command**

In `CLAUDE.md`, inside the Key Commands code block, add after the pushToFirebase lines:

```bash
# Refresh the /api/mytcas fallback snapshot (run when MyTCAS data is healthy)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run refresh-tcas-snapshot
```

- [x] **Step 4: Seed the snapshot (manual, needs the service-account key)**

Run: `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run refresh-tcas-snapshot -- --year 2570`
Expected right now (live data mid-rebuild, no snapshot yet): `snapshot kept (live dataset looks mid-rebuild; use --force to override)`.
Then seed the degraded-but-real data once so the fallback path has *something*:
`GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run refresh-tcas-snapshot -- --year 2570 --force`
Expected: `snapshot refreshed: <n> rows uploaded`.
Re-run **without** `--force` after MyTCAS finishes repopulating (row count ≥ 5000) to capture the full dataset.
(If the key file is unavailable in this environment, flag to the human and continue — later tasks do not depend on the seed existing.)

- [x] **Step 5: Commit**

```bash
git add scripts/refreshTcasSnapshot.mjs package.json CLAUDE.md
git commit -m "feat(scripts): refreshTcasSnapshot — uploads MyTCAS fallback snapshot + meta to Storage"
```

---

### Task 4: Handler — snapshot fallback, configurable year, `data_source`, status probe

**Files:**
- Modify: `api/mytcas.js`

**Interfaces:**
- Consumes: `pickCourseSource`, `resolveTcasYear`, `buildRoundsPayload`, `MIN_LIVE_ROWS` from `api/mytcasSource.js` (Task 1); Storage objects from Task 3.
- Produces (additive contract fields consumed by Task 5/6):
  - University-list response gains `data_source: 'live' | 'snapshot'` and `tcas_year: number`.
  - Faculty / program-list / program-detail responses gain `data_source`.
  - `?program_id=...&rounds=true` response gains `announced: boolean`; upstream *fetch failures* on this route now return the `announced: false` payload (HTTP 200) instead of a 500 — an unreachable rounds service and "not yet published" look identical to a student.
  - New probe: `GET /api/mytcas?status=true` → `{ tcas_year, serving, live_rows, snapshot_rows, snapshot_updated_at }`.

- [x] **Step 1: Rewire data fetching in `api/mytcas.js`**

At the top of the file, add the import and replace the constants/fetchers. Replace lines 12–16 (`S3_URL` … `TCAS_YEAR`) with:

```js
import {
  MIN_LIVE_ROWS,
  pickCourseSource,
  resolveTcasYear,
  buildRoundsPayload,
} from "./mytcasSource.js";

const S3_URL      = "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json";
const PREVIEW_URL = "https://tcas65.as.r.appspot.com";
const LOGO_BASE   = "https://assets.mytcas.com/i/logo";
const CACHE_TTL   = 6 * 60 * 60 * 1000; // 6 hours
const DEFAULT_TCAS_YEAR = 2570; // TCAS70 — fallback when meta.json is unreachable

// Fallback snapshot maintained by scripts/refreshTcasSnapshot.mjs (public read
// — see the data/ block in storage.rules).
const STORAGE_BASE =
  "https://firebasestorage.googleapis.com/v0/b/rollercoasterdottodream.firebasestorage.app/o";
const SNAPSHOT_URL = `${STORAGE_BASE}/${encodeURIComponent("data/mytcas/courses-snapshot.json")}?alt=media`;
const META_URL     = `${STORAGE_BASE}/${encodeURIComponent("data/mytcas/meta.json")}?alt=media`;
```

Then delete the two lines `let _cache = null;` / `let _cacheTime = 0;` and the whole `getAllCourses` function, replacing them with the block below. **Keep** `_roundsCache`, `ROUNDS_MAX`, `ROUNDS_TTL`, and `getProgramRounds` exactly as they are.

```js
// ── Course data caches (live + fallback snapshot) ────────────────────────────
let _live = null;      // { rows, time }
let _snapshot = null;  // { rows, meta, time }

async function fetchJsonOrNull(url) {
  try {
    const res = await fetch(url, { headers: { "Accept-Encoding": "gzip" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getLiveRows() {
  if (_live && Date.now() - _live.time < CACHE_TTL) return _live.rows;
  const rows = await fetchJsonOrNull(S3_URL);
  _live = { rows: Array.isArray(rows) ? rows : [], time: Date.now() };
  return _live.rows;
}

async function getSnapshot() {
  if (_snapshot && Date.now() - _snapshot.time < CACHE_TTL) return _snapshot;
  const [rows, meta] = await Promise.all([
    fetchJsonOrNull(SNAPSHOT_URL),
    fetchJsonOrNull(META_URL),
  ]);
  _snapshot = { rows: Array.isArray(rows) ? rows : [], meta: meta ?? null, time: Date.now() };
  return _snapshot;
}

// Live data when healthy; the Storage snapshot while MyTCAS rebuilds between
// TCAS cycles. The snapshot is only fetched when live fails the sanity check.
async function getCourseData() {
  const liveRows = await getLiveRows();
  if (liveRows.length >= MIN_LIVE_ROWS) {
    return { rows: liveRows, source: "live", tcasYear: await getTcasYear() };
  }
  const snapshot = await getSnapshot();
  const picked = pickCourseSource({ liveRows, snapshotRows: snapshot.rows });
  return { rows: picked.rows, source: picked.source, tcasYear: await getTcasYear() };
}

async function getTcasYear() {
  const snapshot = await getSnapshot();
  return resolveTcasYear(snapshot.meta, DEFAULT_TCAS_YEAR);
}
```

- [x] **Step 2: Thread `data_source` / `tcas_year` through the handler**

Inside `handler`, replace `const courses = await getAllCourses();` with:

```js
const { rows: courses, source: dataSource, tcasYear } = await getCourseData();
```

Then make these additive response changes (field order doesn't matter):

- Program detail (`if (program_id)` branch): `return res.json({ ...program, data_source: dataSource });`
- Programs-in-faculty branch: add `data_source: dataSource,` next to `total`.
- Faculties branch: add `data_source: dataSource,` next to `total_programs`.
- All-universities return: add `data_source: dataSource,` and `tcas_year: tcasYear,` next to `total`.

Every occurrence of the old `TCAS_YEAR` constant becomes the resolved year:
- In the `rounds === "true"` branch and the single-`round` branch, first do `const tcasYear = await getTcasYear();` and use `tcasYear` in place of `TCAS_YEAR` (the `typePrefix` template becomes `` `${roundNum}_${tcasYear}` ``).

- [x] **Step 3: Make the rounds route honest about un-announced criteria**

Replace the body of the `if (program_id && rounds === "true")` branch with:

```js
if (program_id && rounds === "true") {
  const tcasYear = await getTcasYear();
  let rawRows = [];
  try {
    rawRows = await getProgramRounds(program_id);
  } catch {
    // Upstream rounds service unreachable — to a student this is identical
    // to "criteria not yet published", so say that instead of a 500.
    rawRows = [];
  }
  const allRounds = formatRounds(Array.isArray(rawRows) ? rawRows : []);
  return res.json(buildRoundsPayload(program_id, tcasYear, allRounds));
}
```

(The single-`round` variant keeps its 404 behavior — no client uses it.)

- [x] **Step 4: Add the status probe**

At the top of the `try` block in `handler`, before the rounds branches, add:

```js
// ── Ops probe (?status=true) — snapshot freshness + which source is serving ──
if (req.query.status === "true") {
  const liveRows = await getLiveRows();
  const snapshot = await getSnapshot();
  const picked = pickCourseSource({ liveRows, snapshotRows: snapshot.rows });
  return res.json({
    tcas_year: await getTcasYear(),
    serving: picked.source,
    live_rows: liveRows.length,
    snapshot_rows: snapshot.rows.length,
    snapshot_updated_at: snapshot.meta?.updatedAt ?? null,
  });
}
```

- [x] **Step 5: Verify the pure-helper suite still passes and lint is clean**

Run: `npx vitest run api/mytcasSource.test.js` → PASS.
Run: `npm run lint` → no new errors in `api/`.

- [x] **Step 6: Manual verification through the dev middleware**

Run: `npm run dev` (background), then:

```bash
curl -s "http://localhost:5173/api/mytcas?status=true"
```
Expected: JSON with `tcas_year: 2570`, `serving` = `"snapshot"` (or `"live"` once MyTCAS repopulates), integer row counts.

```bash
curl -s "http://localhost:5173/api/mytcas" | head -c 400
```
Expected: `{"total":...` including `"data_source"` and `"tcas_year":2570`; `total` > 0.

```bash
curl -s "http://localhost:5173/api/mytcas?program_id=10010121300001A&rounds=true"
```
Expected: HTTP 200, `{"program_id":"10010121300001A","tcas_year":2570,"rounds":[],"announced":false}` (until TPO publishes TCAS70 criteria).

Stop the dev server.

- [x] **Step 7: Commit**

```bash
git add api/mytcas.js
git commit -m "feat(mytcas): snapshot fallback, configurable TCAS year, data_source + status probe"
```

---

### Task 5: Client — surface the snapshot state in onboarding

**Files:**
- Modify: `src/hooks/useMytcas.js` (useTcasUniversities)
- Modify: `src/components/onboarding/UniversityStep.jsx`
- Test: `src/components/onboarding/UniversityStep.test.jsx`

**Interfaces:**
- Consumes: `data_source` field from Task 4.
- Produces: `useTcasUniversities()` return gains `dataSource: 'live' | 'snapshot'` (existing fields unchanged — `UniversityLogo`, PlanList, profile all keep working untouched).

- [x] **Step 1: Write the failing test**

In `src/components/onboarding/UniversityStep.test.jsx`, the `useMytcas` mock at the top currently returns a fixed object. Make it configurable and add a snapshot-notice case. Replace the existing `vi.mock('../../hooks/useMytcas', ...)` block with:

```js
let tcasState
vi.mock('../../hooks/useMytcas', () => ({
  useTcasUniversities: () => tcasState,
}))
```

In `beforeEach`, add:

```js
tcasState = {
  universities: [
    { university_id: 'CU', university_name_th: 'จุฬาลงกรณ์', university_name_en: 'Chulalongkorn', logo_url: null },
  ],
  total: 1,
  loading: false,
  error: null,
  dataSource: 'live',
  refetch: vi.fn(),
}
```

Add the new tests at the end of the `describe` block:

```js
it('shows a stale-data notice when universities come from the fallback snapshot', () => {
  tcasState = { ...tcasState, dataSource: 'snapshot' }
  render(<UniversityStep onNext={vi.fn()} />)
  expect(screen.getByText(/ข้อมูลรอบก่อนหน้า/)).toBeTruthy()
})

it('shows no stale-data notice when data is live', () => {
  render(<UniversityStep onNext={vi.fn()} />)
  expect(screen.queryByText(/ข้อมูลรอบก่อนหน้า/)).toBeNull()
})
```

- [x] **Step 2: Run tests to verify the new cases fail**

Run: `npx vitest run src/components/onboarding/UniversityStep.test.jsx`
Expected: the two new cases FAIL (notice not rendered); pre-existing cases PASS (the reshaped mock returns the same data).

- [x] **Step 3: Implement**

In `src/hooks/useMytcas.js`, replace the `useTcasUniversities` body with:

```js
export function useTcasUniversities() {
  const { data, loading, error, refetch } = useMytcasFetch({}, [])
  return {
    universities: data?.universities ?? [],
    total: data?.total ?? 0,
    dataSource: data?.data_source ?? 'live',
    loading,
    error,
    refetch,
  }
}
```

In `src/components/onboarding/UniversityStep.jsx`:
- Change the hook destructuring to `const { universities, loading, error, dataSource } = useTcasUniversities()`.
- Inside the `neo-card` div, directly above the `{loading ? (` expression, add:

```jsx
{dataSource === 'snapshot' && (
  <p className="thai-font mb-3 rounded-lg border-2 border-ink/25 bg-brand-soft px-3 py-2 text-center text-xs text-ink-soft">
    ข้อมูล TCAS กำลังอัปเดตสำหรับรอบใหม่ — แสดงข้อมูลรอบก่อนหน้าไปพลางก่อน
  </p>
)}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/onboarding/UniversityStep.test.jsx`
Expected: PASS — all cases including the two new ones.

- [x] **Step 5: Commit**

```bash
git add src/hooks/useMytcas.js src/components/onboarding/UniversityStep.jsx src/components/onboarding/UniversityStep.test.jsx
git commit -m "feat(onboarding): stale-data notice when university list serves from snapshot"
```

---

### Task 6: Client — honest "not yet announced" rounds state

**Files:**
- Modify: `src/hooks/useMytcas.js` (useTcasRounds)
- Modify: `src/components/onboarding/ProgramDetail.jsx`
- Test: `src/components/onboarding/ProgramDetail.test.jsx`

**Interfaces:**
- Consumes: `announced` + `tcas_year` fields from Task 4's rounds payload.
- Produces: `useTcasRounds()` return gains `announced: boolean` and `tcasYear: number` (existing fields unchanged).

- [x] **Step 1: Write the failing test**

In `src/components/onboarding/ProgramDetail.test.jsx`, make the mock configurable and add the case. Replace the whole file with:

```jsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProgramDetail from './ProgramDetail'

let roundsState
vi.mock('../../hooks/useMytcas', () => ({
  useTcasRounds: () => roundsState,
  tcasLogoUrl: () => '',
}))

describe('ProgramDetail', () => {
  beforeEach(() => {
    roundsState = {
      rounds: [{ id: 'r1', name: 'Portfolio', quota: 40, minGpa: 3.5 }],
      announced: true,
      tcasYear: 2570,
      loading: false,
    }
  })

  it('renders admission rounds', () => {
    render(<ProgramDetail programId="p1" onBack={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(/ADMISSION ROUNDS/i)).toBeTruthy()
    expect(screen.getByText('Portfolio')).toBeTruthy()
  })

  it('explains that criteria are not yet announced when the cycle has no data', () => {
    roundsState = { rounds: [], announced: false, tcasYear: 2570, loading: false }
    render(<ProgramDetail programId="p1" onBack={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(/TCAS70 ยังไม่ประกาศ/)).toBeTruthy()
  })
})
```

- [x] **Step 2: Run tests to verify the new case fails**

Run: `npx vitest run src/components/onboarding/ProgramDetail.test.jsx`
Expected: `renders admission rounds` PASS, `explains that criteria are not yet announced…` FAIL (old copy `ไม่พบข้อมูลรอบรับสมัคร` renders instead).

- [x] **Step 3: Implement**

In `src/hooks/useMytcas.js`, replace the `useTcasRounds` body with:

```js
export function useTcasRounds(program_id) {
  const { data, loading, error, refetch } = useMytcasFetch(
    { program_id, rounds: 'true' },
    [program_id],
    { enabled: !!program_id },
  )
  return {
    rounds: data?.rounds ?? [],
    announced: data?.announced ?? true,
    tcasYear: data?.tcas_year ?? null,
    loading,
    error,
    refetch,
  }
}
```

In `src/components/onboarding/ProgramDetail.jsx`:
- Change the hook destructuring to `const { rounds, announced, tcasYear, loading } = useTcasRounds(programId)`.
- Replace the empty-state paragraph (`ไม่พบข้อมูลรอบรับสมัคร`) with:

```jsx
<p className="thai-font text-center text-sm text-ink-soft">
  {announced === false && tcasYear
    ? `เกณฑ์รอบรับสมัคร TCAS${tcasYear - 2500} ยังไม่ประกาศ — โปรดติดตามประกาศจาก ทปอ.`
    : 'ไม่พบข้อมูลรอบรับสมัคร'}
</p>
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/onboarding/ProgramDetail.test.jsx`
Expected: PASS — both cases.

- [x] **Step 5: Commit**

```bash
git add src/hooks/useMytcas.js src/components/onboarding/ProgramDetail.jsx src/components/onboarding/ProgramDetail.test.jsx
git commit -m "feat(onboarding): explicit not-yet-announced state for TCAS admission rounds"
```

---

### Task 7: Full verification + docs close-out

**Files:**
- Modify: `CONTEXT.md` (API Backends table note)

- [x] **Step 1: Run the entire unit suite**

Run: `npm test`
Expected: all suites PASS (including the pre-existing hook/store/component tests — none of their contracts changed).

- [x] **Step 2: Run lint**

Run: `npm run lint`
Expected: no new errors.

- [x] **Step 3: End-to-end manual check in the app**

Run: `npm run dev`, open `http://localhost:5173`, walk the onboarding wizard to the University step.
Expected: the full university grid renders (snapshot data), with the Thai stale-data notice visible while `?status=true` reports `"serving":"snapshot"`. Open a program's detail: the rounds screen shows the "เกณฑ์รอบรับสมัคร TCAS70 ยังไม่ประกาศ" copy, not an error.

- [x] **Step 4: Document the seam**

In `CONTEXT.md`, in the **API Backends** table, change the "External data (camphub, MyTCAS)" row's How cell to:

```
`fetch('/api/camphub')`; MyTCAS falls back to a Storage snapshot (`data/mytcas/`, refreshed via `npm run refresh-tcas-snapshot`) when the live dataset is mid-rebuild between TCAS cycles
```

- [x] **Step 5: Commit**

```bash
git add CONTEXT.md
git commit -m "docs(context): document MyTCAS snapshot fallback seam"
```

---

## Cursor Conversation Prompts

Per the collaboration model (Claude Code plans, Cursor implements), run one Cursor conversation per prompt, in order. Each prompt assumes a fresh conversation with zero context.

**Conversation 1 — Tasks 1 + 2:**
> Read `docs/superpowers/plans/2026-07-07-tcas70-data-resilience.md` and execute **Task 1 (pure source-selection helpers)** and **Task 2 (storage rules)** exactly as written, step by step, checking off checkboxes as you go. TDD: write the failing test first, run it, then implement. Obey the plan's Global Constraints (no TypeScript, no handler tests). If `firebase deploy --only storage` cannot run (not logged in), say so and continue. Commit after each task with the exact messages given.

**Conversation 2 — Tasks 3 + 4:**
> Read `docs/superpowers/plans/2026-07-07-tcas70-data-resilience.md` and execute **Task 3 (snapshot refresh script)** and **Task 4 (handler rewiring)** exactly as written, step by step. Do not write any test that imports `api/mytcas.js` — the handler is verified via the curl steps in Task 4 Step 6 against `npm run dev`. Task 3 Step 4 needs `serviceAccountKey.json`; if it's missing, flag it and move on. Commit after each task with the exact messages given.

**Conversation 3 — Tasks 5 + 6:**
> Read `docs/superpowers/plans/2026-07-07-tcas70-data-resilience.md` and execute **Task 5 (snapshot notice in UniversityStep)** and **Task 6 (not-yet-announced rounds state in ProgramDetail)** exactly as written, TDD, step by step. Keep all existing test cases passing; user-facing copy is Thai with the `thai-font` class as specified. Commit after each task with the exact messages given.

**Conversation 4 — Task 7:**
> Read `docs/superpowers/plans/2026-07-07-tcas70-data-resilience.md` and execute **Task 7 (full verification + docs)**. Run `npm test` and `npm run lint`, do the manual onboarding walkthrough described, update `CONTEXT.md` as specified, and commit. Report any failing test verbatim instead of patching around it.

---

## Verification Log (2026-07-08)

All 7 tasks were implemented and committed via Cursor (commits `1687e84`..`dc0e337`, matching the plan's file lists and commit messages exactly). Independently re-verified:

- **Epic A test files** (`api/mytcasSource.test.js`, `src/hooks/fetchTcas.test.js`, `src/hooks/useMytcasFetch.test.jsx`, `src/components/onboarding/UniversityStep.test.jsx`, `src/components/onboarding/ProgramDetail.test.jsx`): 5 files, 21/21 tests pass.
- **Lint**: zero errors in any file this epic touched (`api/mytcas.js`, `api/mytcasSource.js`, `scripts/refreshTcasSnapshot.mjs`, `src/hooks/useMytcas.js`, `UniversityStep.jsx`, `ProgramDetail.jsx`). The repo has ~900 pre-existing lint problems elsewhere, unrelated to this epic.
- **Full suite** (`npm test`): flaky under full parallel load on this machine — three consecutive runs each failed a different ~7-11 file subset with `Test timed out in 5000ms` / vitest worker-pool timeouts, never touching an Epic A file. Re-running each "failed" file in isolation (e.g. `VideoPickerModal.test.jsx`, `MasteryTracks.test.jsx`, `HeroSection.test.jsx`) passed cleanly every time — confirms resource-contention flakiness in this environment, not a regression from this epic.
- **Manual end-to-end** via `npm run dev` + curl against real production endpoints: `?status=true` → `{"tcas_year":2570,"serving":"live","live_rows":4921,"snapshot_rows":180,...}` — MyTCAS has partially repopulated since the plan was written (180 → 4,921 rows) and `pickCourseSource` correctly still prefers live over the smaller snapshot even below the 5000-row healthy threshold, exactly as designed. `?program_id=...&rounds=true` now returns real TCAS70 round 1 data (`announced:true`) for a program that has published criteria — confirming the not-yet-announced path degrades gracefully and flips over automatically as real data arrives.
