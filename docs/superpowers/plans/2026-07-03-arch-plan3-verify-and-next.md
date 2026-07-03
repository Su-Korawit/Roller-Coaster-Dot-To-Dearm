# Architecture Improvement — Plan 3: Verify Plans 1+2, Decide, Plan Next

> **For agentic workers:** This is a verification protocol + decision checklist, not a TDD task plan. Run it after Plans 1 and 2 are both merged. Evidence before assertions: paste actual command output, don't summarize from memory.

**Goal:** Prove Plans 1+2 delivered (smaller repo, split bundle, faster login, stable seams), close the deferred human decisions, and pick the next architecture phase.

---

## Part A — Verification protocol

- [ ] **A1. Test suites** — `npm test` and `npm run test:rules` → both PASS. Paste totals.

- [ ] **A2. Build + bundle audit** — `npm run build`, then list `dist/assets/*.js` with sizes.
  Expected: entry `index-*.js` **< 1 MB** (was 3,371,429 bytes in one chunk); separate chunks exist for Phaser (~1.2 MB, loaded only on `/home`), React Flow, and the admin page; no `.mp3` in `dist/assets` (was ~6 MB).
  Decision hook: if the entry chunk is still > 1 MB, inspect what's in it (`npx vite-bundle-visualizer` or rollup `--sourcemap` + `source-map-explorer`) before considering `build.rollupOptions.output.manualChunks` — do not add manualChunks speculatively.

- [ ] **A3. Repo size** — `git count-objects -vH` and `git ls-files | xargs -d '\n' stat -c %s 2>/dev/null | awk '{s+=$1} END {print s}'` (Git Bash).
  Expected: tracked checkout ≈ 40 MB (was ~98.6 MB). Note: `.git` history still holds the old blobs; that only shrinks with a history rewrite, which is NOT planned — the goal was the GitHub checkout going forward.

- [ ] **A4. Login latency (manual)** — `npm run dev`, DevTools Network, throttle "Fast 4G", sign in.
  Expected: the Firestore hydration requests fire in two parallel bursts (wave 1: user doc + farm catalog; wave 2: everything else) instead of a serial staircase; exactly one read of `users/{uid}` during bootstrap.

- [ ] **A5. Asset URL cache (manual)** — load `/home`, then hard-refresh.
  Expected: on the second load, no burst of `getDownloadURL` calls to `firebasestorage.googleapis.com` (URLs come from `rc-asset-url:*` localStorage keys); game renders noticeably sooner.

- [ ] **A6. ADR-0007 upload path (manual, admin)** — Admin Dashboard → upload a test tileset and a test character.
  Expected: objects land under `rc/tilesets/` / `rc/characters/` in Storage (not `sprites/`); map still renders; delete the test objects after.

- [ ] **A7. Smoke the panels** — open Task, News, Profile, Social, Chat, Skill, Calendar, Settings; play music; open Roadmap overlay; walk into a farm tile and a shop zone.
  Expected: no regressions from the selector rewrite or lazy loading.

- [ ] **A8. Sync still works** — edit the roadmap, add a task, plant a crop; reload.
  Expected: all persist (debounced writers still armed after the bootstrap rewrite).

If anything fails: fix forward with a focused commit per fix; re-run the failed check.

---

## Part B — Deferred human decisions (ask the owner, then act)

| # | Decision | Context | Default if no answer |
|---|---|---|---|
| B1 | Delete ~50 unused Thai university logos (2.25 MB) in `assets/eachPageAssets/page4/University/`? | `onboardingData.js` references a curated ~30 by exact filename; the rest are referenced by nothing — future data or leftovers? | Keep (data, cheap) |
| B2 | Delete `public/maps/world.json`? | Not in `assetManifest.js`; verify no `mapConfigs/*` Firestore doc references a `world` map before deleting | Keep until verified |
| B3 | Retire the `public/assets/**` fallback tree (~1 MB)? | ADR-0003 calls them best-effort legacy fallbacks; deleting means fully trusting Storage at runtime | Keep |
| B4 | Keep `docs/superpowers/plans+specs/` (18 internal AI-planning docs) in a public GitHub repo? | Internal working notes; harmless but noisy. Options: keep / move to a private wiki / add to `.gitignore` going forward | Keep (repo is the record) |
| B5 | Audit Firestore `assetFolders` docs for stale `sprites/` paths | Custom folders created via `createFolder()` before Plan 1 Task 1 still point at `sprites/…` — same data migration `mapConfigs` got in ADR-0007 phase 2 | Do it (small script, Claude Code) |

---

## Part C — Next-phase backlog (ranked; pick with the owner)

From the 2026-07-03 architecture review (full findings in `C:\Users\Admin\.claude\plans\vast-jingling-kite.md` and the review conversation):

1. **Close the db.js ref seam in JSX** *(Cursor, mechanical)* — ~25 remaining inline `doc(db,'users',…)`/collection call sites in components: ProfilePanel, SettingsSheet, SocialPanel, PublicProfileSheet, UserProfileSheet, NewsPanel, UserManagementSection, AnalyticsSection, ShopSection (use existing `cols.shopProducts`), FinanceSection (use existing `cols.purchases`), FarmItems/FarmShops/FarmPlants tabs + MapDashboard (use the `cols.*` added by Plan 2 Task 4). Register `appUpdates` in `db.js` when NewsPanel is touched.
2. **Deepen the god-panels** *(joint)* — ChatPanel (812 lines), SocialPanel (714), TaskPanel (655), NewsPanel (593) each mix Firestore + business logic + rendering and have zero tests. Extract their data access into stores/services behind `db.js` + `createFirestoreListener` (NewsPanel's raw `onSnapshot` at `:291` is the only listener outside the seam). One panel per plan; start with NewsPanel (smallest, worst offender).
3. **Storage write/list seam** *(Claude Code)* — ~15 files call `uploadBytes`/`listAll`/`getDownloadURL` raw; `cloudAsset` covers cached reads and `storageOps` covers move/trash only. One `assetPaths`-style module = the "where does asset type X live" question answered once (ADR-0007's spirit).
4. **Phaser scene seam** *(Claude Code, big)* — `worldScenes.js` imports 3 Zustand stores + `presence` + Firestore-backed `mapConfig` directly; GameCanvas traps farm buy/sell logic in component handlers (`GameCanvas.jsx:346-432`). Extend the existing registry/event bridge so the scene stops reaching into stores; move buy/sell into `systems/*Logic` (testable). Only worth it if game features keep growing.
5. **Perf follow-ups** *(measure first, via A2/A4/A5 numbers)* — resolve only the player's MBTI spritesheet instead of all 16 (`worldScenes.js resolveAssetUrls`); reconsider presence write throttle (120 ms ≈ 8 writes/s, `presence.js:11`); unblock `loading: false` before wave 2 of the bootstrap (needs empty-state audit of HomePage panels); `manualChunks` only if A2 says the entry chunk is still fat.

**Then:** re-run `/improve-codebase-architecture` after the next phase lands to re-rank.
