# 0026 — Open House campus: a walkable index of every admission path

**Status:** accepted
**Date:** 2026-10-23

## Context

Students choose a faculty first and a university second, but MyTCAS is organised by university. The
v2 design wants an "online open house": a pixel campus with one building per faculty group, where
entering a building lists every path into that faculty across all universities, round by round, and
feeds the TCAS Plan (ADR-0025). Design: `docs/superpowers/specs/2026-10-16-openhouse-campus-design.md`;
plan: `docs/superpowers/plans/2026-10-23-open-house-campus.md`.

## Decision

- **Precomputed data, never a live crawl from the client.** `scripts/refreshOpenHouseIndex.mjs`
  (owner-run, admin credentials, dry run by default) classifies every MyTCAS program into one of 18
  buildings and writes `data/mytcas/openhouse/index.json` plus one `{buildingId}.json` per building
  to public Storage. Building files are uploaded first, `index.json` last; a result smaller than the
  existing index is refused without `--force`; when the live MyTCAS data is thin it falls back to the
  snapshot like `refreshTcasSnapshot.mjs`. Until the owner runs it the popup says the building is
  being updated.
- **Pure classification shared by script and client** (`src/utils/openHouseIndex.js`, imported with
  explicit `.js` so Node can use it): MyTCAS `group_field_id` maps to a building; group 90 is split
  by keyword rules (law → comm → pol, language fields → hum, default hum); every program lands in
  exactly one building; duplicates by `program_id` merge. The crawl (`scripts/openHouseCrawl.mjs`)
  takes injectable fetch/clock/sleep, retries with backoff (4 at a time), counts failures instead of
  aborting, and is deterministic.
- **The index schema adds `interview`** to each project (from the interview score weight or
  location) so the Plan checklist can offer an interview item; scores carry the shared
  `SCORE_LABELS`.
- **The campus is a generated map plus sprites.** `scripts/buildCampus.mjs` writes
  `public/maps/campus.json` (107×85 tiles: ground, paths, lake, bridge, lawns, trees, fountain,
  stage, directory board) from the layout table `src/game/campusLayout.js`; the 18 faculty
  buildings, the hall and the gate are 96×80 sprites (`campus_buildings`) placed by the scene, each
  with a solid footprint and a one-row door zone. Both come from the art pipeline with the palette
  lint. Walkability is checked by a BFS over the collision grid in a test (every door is reachable
  from the bridge spawn on foot), not by a hand-drawn waypoint graph.
- **Registry flags are code, not documents.** `getMapConfig` now returns `room` and `campus` from
  the built-in registry only; a stored map document can no longer switch them off or on. (This also
  fixes a defect in the study-room branch: `withRegistryDefaults` dropped `room`, so furniture would
  not draw.)
- **Entering is explicit.** A door zone raises `buildingDoorEntered` and the UI shows "เข้าตึก"
  (tap, `E` or `Enter`); nothing opens by itself. Leaving the zone (debounced for three checks, so
  pressing against the wall cannot flicker it) closes that building's popup; `Esc` and the close
  button too. The directory board at the hall opens the same popup list.
- **Wayfinding by tile auto-walk.** `src/game/autoWalk.js` (pure BFS on the tile grid with building
  footprints, simplified to corners) feeds waypoints to the existing click-to-move fields, so it
  also works in joystick mode; any player input cancels it, and pressing against a wall for ~0.2 s
  counts as arrival (the 20 px body cannot fully enter a door strip). The minimap (every faculty is
  a button), the directory board and the Warp sheet's "ตึกคณะ" list all call `walkTo` through
  `useOpenHouseUiStore`.
- **The popup** (`FacultyPopup`) is data-driven from the building file: round tabs with counts
  (unannounced rounds greyed but selectable), Thai-normalised literal search, type chips, sort,
  windowed rows (40 at a time), per-program "+ เพิ่มเข้าแผน" → `usePlanUiStore.openAdd(program)`,
  clear loading/missing/error/empty states, footer with the index date. `useOpenHouseStore` keeps a
  ticketed session cache so a double open or a slow first answer never shows another building's data.
- **Guests.** `/openhouse` is a route on the hub and app sites outside `RequireAuth`;
  `OpenHousePage` mounts `GameCanvas` with the new `entryMapKey="campus"` pin (no registry read, no
  resume), a reduced guest hotbar (Plan, Guide, Settings, sign in) and mounts the Plan sheet and
  `RoundPickerSheet` itself (`RoomLayer` belongs to the signed-in home). Plans persist locally and
  merge at login (ADR-0025). `?b=<id>` stands the avatar at that door with its popup open and is kept
  in the address bar while a faculty is open; unknown ids are ignored.
- **First visit** plays one ≤ 2 s camera pan bridge → hall (skippable by tap; skipped under reduced
  motion or with a remembered spot), once per browser (`rc-campus-seen`).
- **The Guide's Plan step becomes available** wherever the campus map exists (guest or signed in);
  `usePlansStore.addFromProgram` emits the `planned` guide event.

## Considered options

- **Fetch MyTCAS per program from the popup.** Hundreds of requests per open, fragile, slow. Rejected
  for the precomputed files.
- **One index file for everything.** The medicine popup would download the whole country. Rejected
  for per-building files with a small index.
- **Buildings as tiles.** 18 distinct multi-tile buildings would multiply the tileset and the map
  generator; sprites with a layout table keep art and collision in one place. Rejected.
- **A new `openhouse` entry in `SITES`.** `SITES` has one entry per host (it drives subdomain
  detection, prerender and the tool strips); `/openhouse` is a route on existing hosts. Rejected;
  the page sets its own title. No server-rendered head for the hub path yet.
- **Auto-opening the popup on entering a door.** Walking past a door would keep covering the map.
  Rejected for the explicit action.

## Consequences

- Owner steps (not run by the code): `npm run refresh-openhouse-index -- --apply`, then upload the
  campus art and map with `scripts/uploadAssets.mjs` (all are also served from `public/`, so the
  app works before this). See `docs/open-house-ops.md`.
- Minimap has no live player dot and there is no ambient animation (spec: no fake crowd).
- The `room` flag fix lives on this branch's stack; the study-room PR needs it before furniture draws.
