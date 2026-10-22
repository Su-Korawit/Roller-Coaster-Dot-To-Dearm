# Open House Campus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (Native, inline). Steps use checkbox syntax.

**Goal:** An online "travel university open house": a walkable pixel campus (`/openhouse`, guest-usable; map key `campus`) with a building per faculty group; entering a building opens a popup listing every admission path into that faculty across all universities, round by round, with "+ เพิ่มเข้าแผน" into the TCAS Plan.

**Architecture:** The data is **precomputed** by a script into public Storage files (the popup never crawls); pure classification/summary code is shared by the script and the client. The map is a generated Tiled ground map (new art family) with the 18 buildings drawn as generated sprites placed by the scene; door zones raise an "เข้าตึก" action (never auto-open), a React popup shows the index, a minimap/directory/auto-walk help wayfinding. `OpenHousePage` mounts the existing `GameCanvas` pinned to the `campus` map for guests; the main app reaches the same map by Warp.

**Tech Stack:** React 19, Zustand, Phaser 3 (generic `MapScene`), Node ESM scripts (`firebase-admin`), the Part A art pipeline (`scripts/art`), Vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-16-openhouse-campus-design.md`. Images: `assets/2026-10-16-ilovetcas-v2/campus-layout.svg` (layout), `faculty-building-styles.png` (**middle row**: white block + zone-colour signature element), `mockups/openhouse-popup.html` (popup; Soft Pixel tokens, rounded 8/12 px instead of notched). Depends on: TCAS Plan (#42: `usePlanUiStore.openAdd`, `planDerive`), Hotbar/Warp (#41: `campus` warp place appears once `DEFAULT_MAP_CONFIGS.campus` exists).

## Scope rulings

- **No data written by this plan's code run:** `refreshOpenHouseIndex.mjs` needs owner credentials and the network; it is built and tested against a mocked upstream (dry-run on a fixture). Until the owner runs it the popup shows the "ข้อมูลตึกนี้กำลังอัปเดต" state.
- **Index schema extension:** each project also carries `interview: boolean` (from `interview_location`/score keys) so the Plan can build its checklist; `scores` entries use the shared `SCORE_LABELS`.
- **Ambient extras cut:** no lake shimmer animation, birds or crowd (spec: no fake crowd). Static lily pads/trees only. Time-of-day tint reuses the existing `DayNightOverlay`.
- **Buildings are sprites, not tiles:** 18 generated sprites (96×80 px, 6×5 tiles) placed by the scene from a layout table (`campusLayout.js`), each with a collision rect and a door zone; ground, water, paths and props are tiles.
- **Minimap + auto-walk:** minimap is a React canvas drawn from the layout table; auto-walk follows a waypoint graph (`campusPaths.js`) and stops on any player input.
- **Add to plan:** the popup's button calls `usePlanUiStore.openAdd(program)`; the Plan's round picker is mounted by `RoomLayer`, which `OpenHousePage` does not render, so the page mounts `RoundPickerSheet` itself. The guide's Plan step becomes available once the campus map exists.
- **Guests:** `/openhouse` is outside `RequireAuth`; guests get a reduced hotbar (Plan, Guide, Bag, "เข้าสู่ระบบ").
- **Out of scope (spec):** live per-program fetch, fee filter (cost shown verbatim), multiplayer, per-university campuses, NPCs.

## Global Constraints

- Plain JS/JSX, Soft Pixel tokens only, text ≥ 12 px, Firestore paths via `src/lib/db.js`; scripts use admin credentials like `refreshTcasSnapshot.mjs`; never read `serviceAccountKey.json`.
- Index files: `data/mytcas/openhouse/index.json`, `data/mytcas/openhouse/{buildingId}.json` (public read via the existing `data/` Storage rule). Current TCAS year only (`type` suffix), dedupe by `program_id`, crawl concurrency 4 with retry/backoff.
- Buildings (18): `med dent pharm vet allied sci it eng arch law comm pol hum biz tour fine edu agri`; zones `health sci soc biz arts earth` with colours red `#E8817B` / blue `#5B8DEF` / purple `#9B7BD6` / amber `#E8A93B` / pink `#E58BC0` / green `#5FB57A`.
- Group 90 split: law → comm → pol rules on `field_name_th`; language fields → `hum`; else program+faculty names; default `hum`.
- Map ≈ 107×85 tiles; spawn on the bridge (south); first-visit camera pan ≤ 2 s, skipped under reduced motion.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Classification correctness:** group 90 edge cases (a program in two keyword rules, language fields, empty names), rows with missing/zero `major_id`, duplicate `program_id`, a `group_field_id` we do not map — never a crash, never a program in two buildings, every program in exactly one.
2. **Crawl safety:** an upstream failure for one program must not abort or corrupt the run; a smaller result than the existing index must not overwrite it (like the snapshot script); partial output never published half-written.
3. **Popup robustness:** missing/corrupt building file, 600+ rows (virtualisation/perf), search with Thai/English/empty/regex characters, filters yielding nothing, round with no entries, double-open race when switching buildings.
4. **Map/scene:** player cannot walk through buildings or water, spawn is walkable, every door zone reachable (path graph connectivity), door action never auto-opens, popup closes on walking away/Esc, deep link `?b=` for an unknown id, reduced motion.
5. **Guest page:** `/openhouse` loads with no account (no auth-only calls fail loudly), plan entries persist locally, `?b=` deep link works on first load, hub/app sites both route it, SEO head tags.

---

### Task 1: Pure index module (`openHouseIndex`) + fixtures

**Files:** create `src/constants/openHouseBuildings.js` (+ test), `src/utils/openHouseIndex.js` (+ test), `src/utils/openHouseFixtures.js` (real-shaped rows).

**Produces:** `BUILDINGS` (id, nameTh, zone, sourceGroup, signature text), `ZONES`, `splitGroup90({ fieldName, programName, facultyName }) → 'law'|'comm'|'pol'|'hum'`, `classifyBuilding(row) → id|null`, `dedupePrograms(rows)`, `thaiNormalize(text)` (lowercase, strips "มหาวิทยาลัย", spaces, diacritics for search), `summariseRounds(programs) → { [1..4]: { universities, seats } }`, `filterUniversities(universities, { query, types, round, sort })`, `sortUniversities`.

- [ ] Failing tests: every building id has name/zone/group; each of the 18 mapped from its source group id; group-90 cases (law keywords, comm, pol, language → hum, ambiguous law+comm picks law by rule order, empty → hum); unknown group → null; dedupe keeps first and merges majors; `summariseRounds` counts universities/seats per round; search is Thai-normalised ("จุฬา" finds "จุฬาลงกรณ์มหาวิทยาลัย"; regex characters are literal; empty query = all); type chips; sort by seats/name/program count; round filter.
- [ ] Implement; run; commit.

### Task 2: Crawl script `refreshOpenHouseIndex.mjs`

**Files:** `scripts/openHouseCrawl.mjs` (pure crawl logic, injectable fetch/clock), `scripts/refreshOpenHouseIndex.mjs` (CLI), tests `scripts/openHouseCrawl.test.js`; `package.json` script `refresh-openhouse-index`.

**Contract:** `buildIndex({ rows, fetchRounds, year, now, concurrency = 4, retries = 3 }) → { index, buildings }` using Task 1; per-program failures are retried with backoff then recorded as "no rounds" (counted in `index.failed`); `year` filters `type` suffix; output matches the schema in the spec plus `interview`. CLI: dry run by default (prints counts), `--apply` uploads (`index.json` last, files first), refuses to replace a larger existing index unless `--force`.

- [ ] Tests on a 50-program fixture with a mocked upstream: schema, year filter, dedupe, retry then give up, concurrency cap, deterministic output, refuse-smaller guard, CLI dry run writes nothing.
- [ ] Implement; run; commit.

### Task 3: Client data (`openHouseClient`, `useOpenHouseStore`)

**Files:** `src/services/openHouseClient.js`, `src/stores/useOpenHouseStore.js` (+ tests).

**Produces:** `fetchIndex()`, `fetchBuilding(id)` (public Storage URL, validates shape, never throws raw), store `{ index, buildings: {[id]: {status:'loading'|'ready'|'error', data}}, loadIndex(), loadBuilding(id), retry(id) }` with session cache and a request guard so switching buildings quickly never shows stale data.

- [ ] Tests: ready/error/corrupt JSON/404, cache hit, retry, out-of-order responses.
- [ ] Implement; run; commit.

### Task 4: Art — campus tileset and 18 building sprites

**Files:** `scripts/art/families/campus.mjs` (ground/water/path/props tiles), `scripts/art/families/campusbuildings.mjs` (18 sprites, 96×80, zone-coloured signature forms per the middle row of `faculty-building-styles.png` + a zone badge), tests `scripts/art/campusart.test.js`; generated `public/assets/rc/campus_tiles.{png,json}`, `campus_buildings.{png,json}`.

- [ ] Tests: palette lint passes, every building id has a frame, frames are 96×80, doors are on the bottom edge at the documented x, tileset has the named tiles the map builder needs.
- [ ] Implement with `px.mjs`; build with `node scripts/art/build.mjs campus campusbuildings`; commit.

### Task 5: Map generator + layout/path tables

**Files:** `src/game/campusLayout.js` (building positions, door tiles, labels, minimap data, waypoint graph), `scripts/buildCampus.mjs` (→ `public/maps/campus.json`), tests `scripts/buildCampus.test.js`, `src/game/campusLayout.test.js`; modify `src/utils/mapConfig.js` (`DEFAULT_MAP_CONFIGS.campus`), `src/game/assetManifest.js`.

- [ ] Tests: map is 107×85 with the expected layers; spawn tile walkable; no building footprint overlaps another or the lake; every door tile is walkable and reachable from the spawn through the waypoint graph (BFS over the collision grid); the graph's edges are walkable segments; layout covers all 18 buildings once; Tiled JSON parses with `parseMapMeta`.
- [ ] Implement; `node scripts/buildCampus.mjs`; commit.

### Task 6: Scene — buildings, doors, signs, auto-walk, first-visit pan

**Files:** `src/game/campusRender.js` (sprites + collision + signs), `src/game/autoWalk.js` (pure path follower), modify `src/game/worldScenes.js` (`cfg.campus` branch: render, door zones → `buildingDoorEntered/Exited`, `walkTo` command, pan), tests for the pure parts.

- [ ] Tests: `autoWalk` steps along waypoints, stops when blocked/at goal/on input; door-zone state machine (enter/exit once); sign visibility by distance; reduced-motion skips the pan.
- [ ] Implement; commit.

### Task 7: Popup UI (matches the mockup)

**Files:** `src/components/openhouse/{FacultyPopup,RoundTabs,UniversityRow,ProjectCard,FilterBar,EnterBuildingButton,Minimap,DirectoryBoard}.jsx` (+ tests), `src/stores/useOpenHouseUiStore.js` (open building, door-near state).

**Behaviour:** header (building sprite thumb, name, "N มหาลัย / N หลักสูตร", zone tint, close), round tabs 1–4 with counts and "ยังไม่ประกาศ" (greyed, still selectable), search + type chips + sort, rows (logo, name, program summary, seats for the round), expand → projects (name, seats, min GPAX, score-weight bars, cost verbatim truncated/expandable, "เปิดใน MyTCAS", "+ เพิ่มเข้าแผน" → `openAdd`), error/empty/loading states with retry and clear-filters, footer `updatedAt`; desktop right panel / mobile 84% bottom sheet; Esc closes; "เข้าตึก" button on door zones (tap, `E`/`Enter`); minimap (tap a building → auto-walk), directory board lists all buildings.

- [ ] Component tests for each state above, keyboard, a11y names, add-to-plan wiring (calls `openAdd` with the Plan program shape incl. `rounds[].projects[]`), 600-row list stays responsive (render window).
- [ ] Implement; commit.

### Task 8: Page, routes, guests, deep link, integration

**Files:** `src/pages/OpenHousePage.jsx`, `src/constants/sites.js` (`openhouse` head entry), `src/App.jsx` (routes on hub and app sites, outside `RequireAuth`), `src/components/GameCanvas.jsx` (`entryMapKey` prop, guest-safe), `scripts/prerender.mjs`/`prerenderPlan` if the head entry needs a page, `vercel.json` rewrites if needed, `src/constants/hotbarItems`/Hotbar guest variant, `src/constants/guideSteps.js` (Plan step available when the campus exists), Warp sheet "ตึกคณะ" list (auto-walk).

- [ ] Tests: route resolution on hub/app, guest page renders without auth, `?b=med` opens the popup after boot, unknown `?b` ignored, guest hotbar items, guide plan step availability, warp building list.
- [ ] Implement; `npm run build`; commit.

### Task 9: Docs, verification, review

- [ ] ADR `0026-open-house-campus.md`, CONTEXT rows, ops (`refresh-openhouse-index`), OWNER-TODO; full suites + build; browser check with a temporary harness; whole-branch review; fix pass; PR.
