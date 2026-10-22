# Study Room (core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Personal Map and Farm with a Forest-style study room: verified focus (Strict/Flexible) grows a tree and earns server-owned **Leaves**; Leaves buy furniture; the student decorates a small room that is where the app opens.

**Architecture:** Leaves, purchases and layout saving are Cloud Functions (transactions; clients never write economy fields). The room is the existing generic `MapScene` loading a generated `room` Tiled map plus furniture sprites rendered from the saved layout (no second scene class). Pure logic (leaf formula, tree species, placement rules, strict-mode guard) lives in small modules with parity fixtures between Functions (CJS) and client (ESM). The farm and the two old maps are removed last, once the room is the entry map.

**Tech Stack:** React 19, Zustand, Phaser 3, Firebase Functions v2 (`onCall`, transactions), Firestore rules + emulator tests, the Part A art pipeline (`scripts/art`), Vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-16-study-room-design.md`. Overview: `2026-10-16-ilovetcas-v2-overview.md`. Focus background: `docs/adr/0018-school-community-world.md`.

## Scope split (ruling for this plan)

The spec is several subsystems. This plan delivers the **core loop**: focus modes + trees + Leaves, catalog/shop/inventory, the starter room + decorate mode, welcome pack, farm/Personal Map removal. A **second plan** (written after this ships) covers: room tiers 1–3 and extra themes, pets, character accessories/outfit hue (wardrobe), the studygram card, trophy history sheet, friend visits of rooms, and the Guide's practice focus (owned by the Hotbar sub-project). Where this plan touches those (catalog `kind` values, `rooms/{uid}.tier|theme|petId`), it keeps the fields so part 2 needs no migration.

## Global Constraints

- Plain JS/JSX; Tailwind tokens only (Soft Pixel names: `paper`, `mist`, `line`, `ink`, `leaf`…; no legacy aliases); Firestore paths only via `src/lib/db.js`; client Firestore writes debounced via `syncManager`; `serviceAccountKey.json` never read or committed.
- Economy fields `users/{uid}.leaves`, `.roomInventory`, `.welcomePack` are **Functions-owned** (rules deny client writes, like `coins`/`focusXp`). Coins never convert to Leaves; Leaves come only from verified focus.
- Focus numbers: planned minutes 10–120 integer; modes `strict` | `flexible`; rate 1 (flexible) / 1.5 (strict); completion bonus ×1.1 when `verified ≥ planned`; Strict withered = 0 Leaves; existing `CHECKIN_WINDOW_MS`, `DAILY_CAP_MS` (8 h), `focusXp`, MBTI multiplier and leaderboard behaviour unchanged. Leaves are credited once, at session end.
- Tree species by planned minutes: sprout < 25, shrub 25–49, tree 50–89, blossom ≥ 90; withered variant on wither.
- Starter room 11×9 tiles, theme `minimal`; welcome pack = 100 Leaves + starter furniture set, idempotent via `users/{uid}.welcomePack = 'v2'`.
- Prices live in Firestore `roomCatalog` (tunable without deploy); the seed is `src/data/roomCatalogSeed.js`.
- Guests (ADR-0012, no account): see the starter room from a local default layout; no focus, no purchases (those need sign-in).
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Double-spend and negative Leaves:** two parallel `buyRoomItem` calls, or a buy racing a focus credit, must never drive `leaves` below zero or grant an item twice. Pinned in Task 4 (emulator test with `Promise.all`).
2. **Focus gaming:** tampered `mode`/`plannedMin` (e.g. strict with 1 min, 5000 min), calling `endFocus` twice, ending right after start, a strict session that lapsed but is ended "normally", flexible away-time reported as completed. Server decides: validated at start, wither set by server on lapse, credit idempotent. Pinned in Tasks 2–3.
3. **Layout integrity:** `saveRoomLayout` with more copies than owned, an unknown item id, off-grid/out-of-bounds/overlapping placement, a desk-slot item placed on the floor, a theme/tier/pet not owned. Pinned in Tasks 4–5.
4. **App boot and old accounts after removal:** a user with no `rooms/{uid}` doc, no `welcomePack`, leftover `maps/{uid}`/`farmGold`/inventory fields, or a stale saved `currentMapKey` of `test3`/`test2` must still land in the room; the existing coins, `focusXp` and leaderboard data are untouched. Pinned in Tasks 9 and 11.
5. **Strict-mode false wither:** background-tab timer throttling, a 1–2 s focus loss (permission prompt, notification shade), device sleep. The guard uses timestamps, not tick counts. Pinned by the fake-clock state machine in Task 6.

---

### Task 1: Leaves, tree and focus-parameter math

**Files:**
- Create: `functions/leavesMath.js`, `functions/leavesMath.test.js`, `src/room/focusRules.js`, `src/room/focusRules.test.js`, `src/room/focusRulesFixtures.json`

**Interfaces:**
- Produces (`functions/leavesMath.js`, CJS): `MODES = ['strict','flexible']`, `PLANNED_MIN = { min: 10, max: 120 }`, `validateFocusParams({ mode, plannedMin }) -> { ok: true, mode, plannedMin } | { ok: false, code: 'bad_mode'|'bad_planned' }` (plannedMin must be an integer in range; missing values default to `{ mode: 'flexible', plannedMin: 25 }`), `treeFor({ plannedMin, withered }) -> 'sprout'|'shrub'|'tree'|'blossom'|'withered'`, `leavesFor({ mode, verifiedMs, plannedMin, withered }) -> integer` = `0` if `mode==='strict' && withered`, else `floor((verifiedMs/60000) * rate * (verifiedMs >= plannedMin*60000 && !withered ? 1.1 : 1))`.
- Produces (`src/room/focusRules.js`, ESM): the same three functions with identical results, for the HUD (tree preview, planned-duration validation). `focusRulesFixtures.json` is a list of `{ fn, input, output }` rows both test suites run (parity).

- [ ] **Step 1: Write the failing tests.** Fixtures cover: strict 25 min completed → `floor(25*1.5*1.1)=41`; flexible 25 min completed → 27; flexible 10 of 25 planned (not completed) → 10; flexible 30 of 25 → `floor(30*1.1)=33`; strict withered at 12 min → 0; flexible withered at 12 min → 12 (no bonus); `verifiedMs: 0` → 0; `treeFor` at 24/25/49/50/89/90 and withered; `validateFocusParams` rejects `plannedMin` 9, 121, 25.5, `'30'`, mode `'hard'`, accepts `{}` → defaults. Each suite loads the same JSON and asserts every row; plus "functions and client modules export the same function names".
- [ ] **Step 2: Run** `npx vitest run functions/leavesMath.test.js src/room/focusRules.test.js` — Expected: FAIL (modules not found).
- [ ] **Step 3: Implement** both modules (CJS file has the real code; the ESM one is a straight port — no shared import across the `functions/` boundary).
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(room): leaves, tree species and focus parameter rules`.

---

### Task 2: Focus callables — modes, planned time, wither, Leaves credit

**Files:**
- Modify: `functions/index.js` (`startFocus`, `settleActive`, add `abandonFocus`), `test/rules/focus.functions.test.js`
- Modify: `firestore.rules` (users deny-list gains `leaves`, `roomInventory`, `welcomePack`; `focusActive`/`focusSessions` stay Functions-only)
- Test: `test/rules/focus.functions.test.js` (emulator), `test/rules/firestore.rules.test.js` (add the three fields)

**Interfaces:**
- Consumes: `validateFocusParams`, `treeFor`, `leavesFor` (Task 1).
- Produces callables (all `onCall`, auth required):
  - `startFocus({ mode?, plannedMin? })` — validates with `validateFocusParams` (`invalid-argument` with `details.code` otherwise), stores `{ mode, plannedMin, withered: false }` on `focusActive/{uid}` and returns them. A resumed session returns its stored mode/plannedMin (the request's values are ignored).
  - `checkInFocus()` — unchanged result plus `withered` (a **strict** session whose gap exceeded `CHECKIN_WINDOW_MS` is marked `withered: true` on the active doc; flexible lapses only drop the gap as today).
  - `endFocus()` — result gains `{ leaves, tree, mode, plannedMin, withered }`; the finished-session doc gains `{ mode, plannedMin, subjectKey: null, tree, leaves, withered }`; `users/{uid}.leaves` is incremented by `leaves` in the same transaction. Calling it again returns `NO_ACTIVE_SESSION` (`failed-precondition`) and credits nothing.
  - `abandonFocus()` — ends the session as withered (strict → 0 Leaves; flexible → verified minutes without bonus), same result shape as `endFocus`.

- [ ] **Step 1: Write the failing emulator tests** (extend `focus.functions.test.js`, same helpers): start with `{ mode:'strict', plannedMin:25 }` stores them; start with `plannedMin: 5`, `plannedMin: 500`, `mode: 'x'` → `invalid-argument`; completed flexible session (advance the stored `lastCheckInAt`/`startedAt` in the emulator doc to simulate 25 verified min, as the existing tests do) → `leaves` 27 and `users.leaves` is 27; strict completed → 41; strict with a lapsed gap → `withered: true`, `leaves: 0`, tree `withered`; `abandonFocus` strict → 0, flexible 12 min → 12; `endFocus` twice credits once; resumed `startFocus` ignores new params; the daily cap still limits `verifiedMs` (and therefore Leaves). Rules test: an owner `update` containing `leaves`, `roomInventory` or `welcomePack` is denied.
- [ ] **Step 2: Run** `npm run test:rules:emu -- test/rules/focus.functions.test.js` (or the `runEmu` equivalent used by earlier plans) — Expected: FAIL.
- [ ] **Step 3: Implement** in `functions/index.js`: parameter validation at the top of `startFocus`; strict-lapse marking inside `settleActive`; Leaves credit and session fields in the `end` branch; `abandonFocus` reusing `settleActive` with `{ end: true, forceWither: true }`. Reads before writes in every transaction.
- [ ] **Step 4: Run** the same command and `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(functions): focus modes, planned time, wither and Leaves credit`.

---

### Task 3: Room catalog, rules and seed

**Files:**
- Create: `src/data/roomCatalogSeed.js`, `src/data/roomCatalogSeed.test.js`, `scripts/seedRoomCatalog.mjs`
- Modify: `firestore.rules` (`roomCatalog`, `rooms`), `src/lib/db.js` (`refs.roomCatalog(id)`, `refs.room(uid)`, `cols.roomCatalog`, `shapes.roomLayout`), `src/lib/db.test.js`, `test/rules/firestore.rules.test.js`

**Interfaces:**
- Produces `ROOM_CATALOG: Record<string, Item>` with `Item = { name, kind: 'furniture'|'decor'|'desk'|'wall'|'pet'|'outfit'|'accessory'|'theme'|'tier', price, footprint: [w,h], spriteKey, frames, deskSlot?: boolean, tierMin }` and the starter set `STARTER_ITEMS: Record<string, number>` (item id → count). Seeded ids: `desk_basic` (desk, 2×1), `chair_basic` (furniture, 1×1), `bed_basic` (furniture, 2×1), `bookshelf_basic` (furniture, 1×1), `rug_round` (decor, 2×2, walk-over), `lamp_desk`, `mug`, `books_stack`, `plant_small`, `laptop` (all `deskSlot: true`, 1×1), `poster_pastel` (wall), `theme_minimal` (theme, price 0); prices 80–400 Leaves; tier/pet/outfit/theme rows other than `theme_minimal` are **not** seeded in this plan. `STARTER_ITEMS = { desk_basic:1, chair_basic:1, bed_basic:1, bookshelf_basic:1, lamp_desk:1, plant_small:1, rug_round:1, theme_minimal:1 }`.
- Rules: `roomCatalog/{id}` read signed-in, write super-admin; `rooms/{uid}` read signed-in, **write false** (Functions only — see ruling in Task 5).
- Produces `shapes.roomLayout(doc) -> { tier: number, theme: string, placed: Array<{ itemId, x, y, slot? }>, petId: string|null }` with defaults for a missing doc.
- Produces `scripts/seedRoomCatalog.mjs`: `node scripts/seedRoomCatalog.mjs` dry run prints the rows, `--apply` writes with the admin SDK (merge, never deletes), owner credentials like `uploadAssets.mjs`.

- [ ] **Step 1: Write the failing tests:** seed — every item has the required fields, `price >= 0` integer, `footprint` two positive integers, every `deskSlot` item is 1×1, every id in `STARTER_ITEMS` exists in the catalog, ids unique, no `tier`/`pet` rows yet; `shapes.roomLayout(undefined)` → `{ tier: 0, theme: 'minimal', placed: [], petId: null }`; rules (emulator): anyone signed-in reads `roomCatalog` and `rooms/*`, nobody but the super-admin writes `roomCatalog`, nobody writes `rooms/*`; `db.test.js` ref paths.
- [ ] **Step 2: Run** `npx vitest run src/data/roomCatalogSeed.test.js src/lib/db.test.js` and the rules file — Expected: FAIL.
- [ ] **Step 3: Implement** the seed, db refs/shape, rules and the seed script.
- [ ] **Step 4: Run** the same commands — Expected: PASS.
- [ ] **Step 5: Commit** `feat(room): catalog seed, rules and db refs`.

---

### Task 4: `buyRoomItem` and `claimWelcomePack`

**Files:**
- Modify: `functions/index.js`
- Create: `functions/roomLogic.js`, `functions/roomLogic.test.js`, `test/rules/room.functions.test.js`

**Interfaces:**
- Produces (`functions/roomLogic.js`, pure): `planPurchase({ item, itemId, leaves, inventory, currentTier }) -> { price, inventoryDelta } | throws { code, extra }` with codes `not-found` (no item), `failed-precondition` + `extra.reason` ∈ `INSUFFICIENT_LEAVES` (`extra.missing` = shortfall), `TIER_REQUIRED` (`item.tierMin > currentTier`), `ALREADY_OWNED` (kinds `theme|tier|pet` are unique). `planWelcomePack({ welcomePack }) -> { grant: boolean }`.
- Produces callables: `buyRoomItem({ itemId }) -> { ok, leaves, owned }` (transaction: reads `roomCatalog/{itemId}` and the user doc, decrements `leaves`, increments `roomInventory.<itemId>`); `claimWelcomePack() -> { ok, already }` (idempotent via `welcomePack === 'v2'`; grants 100 Leaves + `STARTER_ITEMS` copied from the catalog doc ids that exist, and writes a default `rooms/{uid}` layout with the desk, chair, bed and lamp placed, only if the doc is missing).

- [ ] **Step 1: Write the failing tests:** pure — price exactly equal to leaves succeeds and leaves 0; one short → `INSUFFICIENT_LEAVES` with `missing: 1`; unique kinds owned → `ALREADY_OWNED`; furniture may be bought repeatedly; tier gating. Emulator — insufficient leaves writes nothing; **two parallel `buyRoomItem` calls for an item the user can afford once → exactly one succeeds, `leaves >= 0`, `roomInventory.x === 1`**; unknown item `not-found`; unauthenticated rejected; welcome pack grants 100 Leaves + starter items once, a second call returns `already: true` and changes nothing; the default layout is written only when missing and never overwrites an existing one; a pack claimed by two parallel calls grants once.
- [ ] **Step 2: Run** the new tests — Expected: FAIL.
- [ ] **Step 3: Implement** `roomLogic.js` and the two callables (transactions; every read before every write).
- [ ] **Step 4: Run** `npm run test:rules:emu` for the new file and `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(functions): buyRoomItem and claimWelcomePack`.

---

### Task 5: Placement rules and `saveRoomLayout`

**Files:**
- Create: `src/room/placement.js`, `src/room/placement.test.js`, `functions/placement.js`, `functions/placement.test.js`, `src/room/placementFixtures.json`
- Modify: `functions/index.js`

**Interfaces:**
- Produces (identical logic in `src/room/placement.js` ESM and `functions/placement.js` CJS, same fixtures):
  - `TIER_SIZES = { 0: { w: 11, h: 9 } }` (tiles; part 2 adds the rest), `GRID = 8` (px), `TILE = 16`.
  - `validateLayout({ layout, catalog, inventory }) -> { ok: true } | { ok: false, errors: Array<{ code, index?, itemId? }> }` with codes `unknown_item`, `not_owned` (placed copies of an id exceed `roomInventory[id]`), `off_grid` (x or y not a multiple of 8), `out_of_bounds` (footprint leaves the tier's room), `overlap` (two floor items' footprint rectangles intersect; `decor` rugs and `wall` items do not collide), `bad_slot` (a `deskSlot` item must carry `slot` ∈ `left|centre|right|back` and sit on a `desk` item; at most one item per slot per desk; a non-`deskSlot` item must have no `slot`), `bad_theme|bad_tier|bad_pet` (not owned), `too_many` (> 60 placed).
  - `canPlace({ layout, catalog, inventory, itemId, x, y, slot }) -> boolean` (the same checks applied to the layout plus the candidate).
- Produces callable `saveRoomLayout({ layout }) -> { ok }`: validates with `validateLayout` against the caller's `roomInventory` and the catalog, then `set`s `rooms/{uid}` with `{ tier, theme, placed, petId, updatedAt }`. Invalid → `invalid-argument` with `details.errors`.
- **Ruling:** the spec says the client writes `rooms/{uid}` under rules that check counts. Firestore rules cannot iterate a list to count copies per id, so the layout is saved through this callable and `rooms/{uid}` is client-read-only (Task 3). Cost: one callable per debounced save (≈ every 2 s while decorating).

- [ ] **Step 1: Write the failing tests** (both suites run `placementFixtures.json` rows `{ name, layout, inventory, catalog, expected }`): valid starter layout; one extra lamp beyond owned → `not_owned`; unknown id; `x: 4` → `off_grid`; desk at the room edge → `out_of_bounds`; two chairs on one tile → `overlap`; a rug under a chair → ok; lamp on the floor (no slot) → `bad_slot`; two lamps on `left`; a lamp slotted when no desk placed; a floor item with a `slot`; 61 items → `too_many`; theme/pet not owned. Emulator test for `saveRoomLayout`: valid saves, over-placement rejected and the doc unchanged, unauthenticated rejected, another user's doc untouched.
- [ ] **Step 2: Run** `npx vitest run src/room/placement.test.js functions/placement.test.js` and the emulator file — Expected: FAIL.
- [ ] **Step 3: Implement** both placement modules and the callable.
- [ ] **Step 4: Run** the same commands — Expected: PASS.
- [ ] **Step 5: Commit** `feat(room): placement rules and saveRoomLayout`.

---

### Task 6: Client stores, sync and the strict-mode guard

**Files:**
- Create: `src/stores/useLeavesStore.js`, `src/stores/useRoomStore.js`, `src/stores/useFocusStore.js`, `src/lib/roomSync.js`, `src/room/focusGuard.js`, matching `*.test.js`
- Modify: `src/services/focus.js` (params, `abandonFocus`), `src/services/roomApi.js` (new: `buyRoomItem`, `claimWelcomePack`, `saveRoomLayout` wrappers)

**Interfaces:**
- `useLeavesStore`: `{ leaves: number, inventory: Record<string,number>, welcomePack: string|null, loaded: boolean, hydrate(uid), applyServer({ leaves, inventory }) }` (`hydrate` = one read of `users/{uid}`; purchases/focus results call `applyServer` from the callable response — no listeners).
- `useRoomStore`: `{ layout, catalog, decorating: boolean, hydrate(uid), setDecorating(b), place(itemId, x, y, slot?), pickUp(index) }` — `place` runs `canPlace` and returns `false` without changing state when it fails; every change calls `roomSync.schedule()`.
- `roomSync`: `schedule()` debounces 2000 ms then calls `saveRoomLayout`; `flush()` on `visibilitychange: hidden`/`pagehide`; a failed save keeps the layout locally and retries (same retry/backoff idea as the Studio autosaver — reuse `createAutosaver` from `src/content/autosave.js` rather than writing a second debouncer).
- `useFocusStore`: `{ status: 'idle'|'running'|'withered'|'done', mode, plannedMin, startedAt, verifiedMs, result, start({mode, plannedMin}), checkIn(), end(), abandon() }` wrapping `services/focus.js`; derives `progress` (0–1) from server `startedAt`/`lastCheckInAt`, never from tick counts.
- `createFocusGuard({ mode, now, onWither }) -> { onHidden(), onVisible(), tick() }` (`src/room/focusGuard.js`): strict → hidden for **more than 10 s** (measured with `now()` timestamps) calls `onWither('hidden')`; flexible → hidden pauses accounting and returning after **more than 120 s** away calls `onWither('away')`; a hidden→visible round trip shorter than the limit changes nothing; `tick()` also evaluates the limit so a tab that stays hidden is caught without a visible event.

- [ ] **Step 1: Write the failing tests:** guard with a fake clock — strict hidden 9 s then visible → no wither; hidden 11 s → wither once (not twice); throttled timers (only one `tick()` after 60 s hidden) still withers via timestamps; flexible hidden 100 s ok, 130 s → wither `away`; `onVisible` without a prior `onHidden` is a no-op. Stores — `place` refuses an overlap and keeps state; `schedule()` debounces three quick placements into one save with the final layout; `applyServer` updates the balance; focus store `start` calls the service with the chosen params and `abandon` sets `withered`. `services/focus.js` — `startFocus` sends `{ mode, plannedMin }`, `abandonFocus` calls the callable.
- [ ] **Step 2: Run** `npx vitest run src/room src/stores/useLeavesStore.test.js src/stores/useRoomStore.test.js src/stores/useFocusStore.test.js src/services/focus.test.js src/lib/roomSync.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** the modules.
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(room): leaves, room and focus stores with strict-mode guard`.

---

### Task 7: Room art — shell tiles, furniture, trees and pots

**Files:**
- Create: `scripts/art/families/room.mjs`, `scripts/art/families/roomitems.mjs`, `scripts/art/families/focus.mjs` (+ `*.test.js` beside each)
- Generated: `public/assets/rc/room_tiles.{png,json}`, `room_items.{png,json}`, `focus.{png,json}`

**Interfaces:**
- `room.mjs` — tileset `room_tiles` (16×16, `columns: 16`), `TILE_NAMES`/`FIRSTGID` exports like the School Hub family: `floor_minimal` (light wood), `floor_rug_edge`, `wall_minimal_{t,tl,tr,l,r,b}` (white/mist walls with a skirting line), `window_day`, `door`, `shadow_wall` (translucent purple strip under the top wall).
- `roomitems.mjs` — sprites `32×32` frames, one row per catalog `spriteKey`, anchored bottom-left of the footprint: every seeded item id (`desk_basic` 2 frames for the reading loop is **not** needed here — the desk is static; `lamp_desk` 2 frames on/off glow; others 1 frame).
- `focus.mjs` — `tree_sprout`, `tree_shrub`, `tree_tree`, `tree_blossom`, `tree_withered` (48×48, 4 growth stages each as frames 0–3, withered 1 frame) and `pot_growth` (16×16, 4 frames: soil, sprout, leaf, full) for the desk pot.
- Art rules: Soft Pixel palette (`scripts/art/palette.mjs`; extend deliberately for any new colour), rounded corners 2–4 px, outline `#5c4e92`/`#6f63a6`, no pure black.

- [ ] **Step 1: Write the failing tests** per family: every promised key exists once; palette lint passes; no tile/frame fully transparent; `room_tiles` floor/wall tiles are fully opaque except `window_day`/`door` borders; `focus` growth frames differ pairwise (stage 0 vs 3 differ by ≥ 15% of pixels); `lamp_desk` frame 1 differs from frame 0.
- [ ] **Step 2: Run** `npx vitest run scripts/art` — Expected: FAIL.
- [ ] **Step 3: Implement** the three families and run `node scripts/art/build.mjs room roomitems focus`; open each ×4 contact sheet in `docs/art-review/` and check every sprite at 1× (silhouette reads, no stray pixels, light from top-left).
- [ ] **Step 4: Run** `npx vitest run scripts/art` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(art): study room tiles, furniture, trees and pots` (include generated assets; note "contact sheets reviewed").

---

### Task 8: The room map and its scene wiring

**Files:**
- Create: `scripts/buildRoom.mjs`, `scripts/buildRoom.test.js`, `src/game/roomRender.js`, `src/game/roomRender.test.js`, `public/maps/room.json` (generated)
- Modify: `src/utils/mapConfig.js` (`DEFAULT_MAP_CONFIGS.room`), `src/game/assetManifest.js` (map, `room_tiles` tileset, `room_items` + `focus` spritesheets), `src/game/assetManifest.test.js`, `src/game/worldScenes.js` (call `renderRoom` when `cfg.room`), `src/utils/tiledMapMeta.js` (parse the new interactions)

**Interfaces:**
- `buildRoom() -> { map }` (deterministic Tiled JSON, 11×9, layers `Floor`, `Wall` (collides), `Decor`, `Interactions`, `Spawns`, `Portals`): spawn `entry` near the door, a `deskSeat` interaction at the chair tile (`action: 'roomSeat'`), a door `portals` object to `school_hub` (temporary warp until the Hotbar sub-project), walls collide, everything else walkable. Written to `public/maps/room.json` by `node scripts/buildRoom.mjs`.
- `DEFAULT_MAP_CONFIGS.room = { tilesets: { 'Room Tiles': 'rc/tilesets/room_tiles.png' }, collision: { Wall: true }, hidden: {}, displayName: 'My room', multiplayer: false, editable: false, room: true, defaultSpawn: 'entry', isEntry: true }`; manifest keys `room` (tilemap), `Room Tiles`, `room_items`, `focus_art` (spritesheets from the atlas JSON frame sizes).
- `roomRender.js` (pure over a scene-like object so it unit-tests without Phaser): `furnitureSprites({ layout, catalog, atlas }) -> Array<{ itemId, key, frame, x, y, depth, slot }>` ordered back-to-front by `y`; `potFrame(progress) -> 0|1|2|3` (thresholds 0, 0.34, 0.67, 1.0 → frames 0..3); `renderRoom(scene, { layout, catalog, atlas, progress })` creates/updates sprites and listens to the game event `roomChanged`. `worldScenes.js` calls it at the end of `create()` for `cfg.room` maps (no new scene class).
- `tiledMapMeta`: `Interactions` with `action: 'roomSeat'` are exposed as `meta.interactions` like `focusSeat`.

- [ ] **Step 1: Write the failing tests:** `buildRoom` — size 11×9, layer names, every gid within the tileset, walls collide and the spawn is walkable, the seat tile is reachable from the spawn, the portal object targets `school_hub`, deterministic, `public/maps/room.json` equals the generator output; `roomRender` — a placed desk plus lamp slotted `left` yields the lamp above the desk (higher depth) and at the slot's pixel offset, items sort by `y`, an item id missing from the catalog is skipped (layout kept), `potFrame` thresholds; manifest entries; `tiledMapMeta` parses `roomSeat`.
- [ ] **Step 2: Run** `npx vitest run scripts/buildRoom.test.js src/game src/utils` — Expected: FAIL.
- [ ] **Step 3: Implement** the map generator, config, manifest, `renderRoom` and the `worldScenes` hook; run `node scripts/buildRoom.mjs`.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS. Then `npm run dev`, boot the app, confirm the room loads, the avatar walks, walls block, furniture draws, and the desk seat triggers `roomSeatEntered` (check the console event); screenshot at 375 and 1280 if the pane is visible.
- [ ] **Step 5: Commit** `feat(room): generated room map and furniture rendering`.

---

### Task 9: Boot into the room — entry map, welcome pack, Leaves in the top bar

**Files:**
- Modify: `src/components/GameCanvas.jsx` (entry fallback `'room'`, `roomChanged`/`roomSeatEntered` wiring), `src/game/worldScenes.js` (`loadSceneData` default key), `src/services/sessionBootstrap.js` (+test), `src/pages/HomePage.jsx` (Leaves counter replaces gold), `src/stores/useWorldStore.js` (default key), `src/utils/mapConfig.js` (`isEntry` default)
- Test: `src/services/sessionBootstrap.test.js`, `src/pages/HomePage.test.jsx` (new or extend)

**Interfaces:**
- `sessionBootstrap` gains steps (parallel, each failure non-fatal like the existing `step()` wrapper): `claim welcome pack` (calls `claimWelcomePack` only when `useLeavesStore.welcomePack !== 'v2'` after hydrate; result applied via `applyServer`), `hydrate leaves`, `hydrate room` (layout + catalog). Guests skip all three and `useRoomStore` loads the default starter layout from `STARTER_LAYOUT` (`src/room/defaultLayout.js`, the same placement the server writes).
- A stale `currentMapKey` of `test3`/`test2` (localStorage or store) is treated as unknown: boot goes to the entry map `room`.
- Top bar: shows `{leaves}` with a leaf icon (`PxIcon` leaf sprite from the icon family — add a `leaf` icon to `scripts/art/families/icons.mjs` with a test row) where farm gold was.

- [ ] **Step 1: Write the failing tests:** bootstrap calls `claimWelcomePack` once when the flag is missing and not when it is `'v2'`; a failing claim does not stop the other steps; guests make no callable calls and get the default layout; `loadSceneData()` with no key and with `'test3'`/`'test2'` resolves the `room` map; HomePage renders the Leaves count from the store and no gold/`g` text.
- [ ] **Step 2: Run** `npx vitest run src/services/sessionBootstrap.test.js src/pages src/game` — Expected: FAIL.
- [ ] **Step 3: Implement** the changes; regenerate `public/assets/rc/icons.*` for the leaf icon (`node scripts/art/build.mjs icons`).
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS. `npm run dev` as a signed-in test account and as a guest: lands in the room with 100 Leaves and the starter furniture.
- [ ] **Step 5: Commit** `feat(room): boot into the study room with welcome pack and Leaves counter`.

---

### Task 10: Focus, shop and decorate UI

**Files:**
- Create: `src/components/room/FocusSetupSheet.jsx`, `FocusHud.jsx`, `FocusCompleteScreen.jsx`, `ShopSheet.jsx`, `DecorateBar.jsx`, `RoomLayer.jsx` (mounted by `HomePage`), each with a `*.test.jsx`
- Modify: `src/pages/HomePage.jsx` (mount `RoomLayer`; temporary entry buttons **โฟกัส** and **ร้านค้า** until the Hotbar sub-project replaces them), `src/components/GameCanvas.jsx` (decorate drag → `useRoomStore.place`)

**Interfaces:**
- `FocusSetupSheet({ onClose })`: durations 25/50/90 chips + custom 10–120 (validated with `validateFocusParams`, inline Thai error), mode toggle **เข้มงวด** (Strict ×1.5) / **ยืดหยุ่น** (Flexible), tree preview (`treeFor`) and a **เริ่มโฟกัส** button that calls `useFocusStore.start`.
- `FocusHud`: remaining time from server timestamps, a growing tree (frame by `progress`), a mode badge; installs `createFocusGuard` on `document.visibilitychange` while running and calls `abandon()` on wither, then shows the explanation ("ออกจากหน้านี้นานเกินไป ต้นไม้เลยเหี่ยว"); check-in prompt cadence from `CHECKIN_PROMPT_MS`.
- `FocusCompleteScreen`: tree species, Leaves earned (animated count), mode, **ปิด** — no studygram card in this plan (button hidden behind nothing; part 2 adds it).
- `ShopSheet`: tabs by `kind` (เฟอร์นิเจอร์ / ของตกแต่ง / ธีม), cards with price and owned count, **ซื้อ** calls `buyRoomItem` → toast per outcome ("ใบไม้ไม่พอ ขาดอีก N ใบ" using `extra.missing`), no optimistic deduction; a **แต่งห้อง** toggle starts decorate mode.
- `DecorateBar`: lists owned-but-unplaced items; drag onto the room (or tap item → tap tile) calls `place`; tap a placed item to pick up; shows why a placement was refused (`overlap`, `out_of_bounds`, `bad_slot`) as a short toast.

- [ ] **Step 1: Write the failing tests** (jsdom, mocked stores/services): setup sheet rejects 9 and 121 minutes with the Thai message and starts with `{ mode:'strict', plannedMin:50 }`; HUD withers strict on hidden > 10 s (fake timers, mocked guard clock) and not on 5 s; buying with too few Leaves shows the shortfall and the balance does not change; a successful buy updates the balance from the response; decorate refuses an overlap with the toast and leaves the layout unchanged; complete screen shows leaves and species.
- [ ] **Step 2: Run** `npx vitest run src/components/room src/pages` — Expected: FAIL.
- [ ] **Step 3: Implement** the components with Soft Pixel tokens (`px-card`, `px-btn`, ≥ 12 px text).
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS. In `npm run dev` (signed-in test account against the emulators or a test project): start a 10-minute flexible focus with the test hook, see the tree grow, end it, see Leaves credited, buy a lamp, place it on the desk.
- [ ] **Step 5: Commit** `feat(room): focus setup/HUD/complete, shop and decorate UI`.

---

### Task 11: Remove the farm, Personal Map and old maps

**Files:**
- Delete: `src/systems/{farmLogic,farmActions,FarmSystem,shopActions,inventoryActions,InventorySystem,inventoryLogic}.js` and their tests, `src/stores/{useFarmStore,useFarmDataStore,useInventoryStore}.js` and tests, `src/lib/farmDataSync.js` (+test), `src/components/{FarmActionButton,SeedPicker,ShopUI,StorageUI,ItemSprite,Hotbar,MapPalette}.jsx`, `src/components/admin/{FarmDataSection,FarmPlantsTab,FarmItemsTab,FarmShopsTab}.jsx`, `src/data/{PlantData,ItemData,ShopData}.js`, `src/constants/mapItems.js`, `scripts/resetFarmData.mjs`, `public/maps/test3.json`, `public/maps/indoor.json` only if nothing else loads it (grep first)
- Modify: `src/components/GameCanvas.jsx`, `src/game/worldScenes.js` (crops, farm-tile events, decorations), `src/utils/tiledMapMeta.js` (+test: drop `farmTiles`), `src/lib/syncManager.js` (inventory/farm/visit-farm syncs), `src/services/sessionBootstrap.js`, `src/lib/db.js` (+test: farm refs/cols), `src/utils/mapConfig.js` (`test3`/`test2` defaults), `src/game/assetManifest.js` (`test3`, `crops` and farm-only assets), `src/constants/admin.js` (+`admin.test.js`, `adminRulesSync.test.js`: drop the `farm` section), `src/pages/AdminPage.jsx`, `firestore.rules` (remove `farmPlants|farmItems|farmShops`; `maps/{ownerUid}` becomes read-only for signed-in, write false), `src/lib/schoolRoom.js`/`services/schoolWorld.js` + `scripts/buildSchoolHub.mjs` (hub exit portal target `test3` → `room`), `src/theme/contrastUsage.test.js` (drop the SeedPicker rule)
- Create: `scripts/purgeLegacyWorld.mjs`, `scripts/purgeLegacyWorld.test.js`

**Interfaces:**
- `scripts/purgeLegacyWorld.mjs`: dry run by default (prints counts of `farmPlants`, `farmItems`, `farmShops`, `maps/*`, and users with `farmGold`/`inventory`/`hotbar`/`storage`/`gold`); `--apply` deletes those collections and unsets the user fields in batches of ≤ 400 with the admin SDK; **never touches** `coins`, `focusXp`, `leaves`, `roomInventory`, `rooms/*`, `focusSessions`. Exports `planPurge({ counts })` pure helper for the test; the script is run by the owner after the release ships.

- [ ] **Step 1: Write the failing tests:** a guard test `legacyWorld.test.js` that fails while any of the removed symbols is imported anywhere under `src/` (`useFarmStore`, `useInventoryStore`, `useFarmDataStore`, `farmLogic`, `farmActions`, `FarmActionButton`, `MapPalette`, `mapItems`, `'test3'`, `'test2'` as a map key in `src/` non-test code) and fails if `firestore.rules` still contains `farmPlants`; `purgeLegacyWorld.test.js` — `planPurge` lists exactly the legacy collections/fields and none of the protected ones; `mapConfig` test: `DEFAULT_MAP_CONFIGS` has `room` and `school_hub` only; `tiledMapMeta.test.js` no longer expects `farmTiles`; the hub's exit portal targets `room`.
- [ ] **Step 2: Run** `npx vitest run src/legacyWorld.test.js scripts/purgeLegacyWorld.test.js src/utils` — Expected: FAIL.
- [ ] **Step 3: Remove** in this order, running `npx vitest run` after each group until green: (a) stores/systems/sync + their tests, (b) components and `GameCanvas`/`HomePage` references, (c) `worldScenes`/`tiledMapMeta`/`mapConfig`/manifest, (d) admin section, (e) rules + `db.js`, (f) hub portal target and regenerate `public/maps/school_hub.json` (`node scripts/buildSchoolHub.mjs`), (g) the purge script. Use `grep -rn` for each deleted symbol before moving on; leave `lib/presence.js` and RTDB `/worlds/...` untouched.
- [ ] **Step 4: Run** `npx vitest run`, `npm run build`, `npx eslint` on the changed files, and `npm run test:rules:emu` — Expected: all pass (record any pre-existing lint noise only). Boot `npm run dev` with an account that has legacy farm fields: it lands in the room.
- [ ] **Step 5: Commit** `refactor: remove the farm, Personal Map and legacy maps`.

---

### Task 12: Admin catalog prices

**Files:**
- Create: `src/components/admin/RoomCatalogSection.jsx`, `RoomCatalogSection.test.jsx`
- Modify: `src/pages/AdminPage.jsx`, `src/constants/admin.js` (+tests): new `rooms` admin section, super-admin only

**Interfaces:** the section lists `roomCatalog` rows (name, kind, price) and edits `price` (integer ≥ 0) per row with `setDoc(refs.roomCatalog(id), { price }, { merge: true })`; rows can be toggled `hidden: true` (the shop skips hidden rows). Other fields are read-only (art/ids are code-owned). Rules already allow super-admin writes (Task 3).

- [ ] **Step 1: Write the failing tests:** only the super-admin gets the `rooms` section (`getAdminSections`); a negative or fractional price is rejected inline; a valid edit calls `setDoc` merge with just `{ price }`; hidden rows disappear from `ShopSheet` (extend its test).
- [ ] **Step 2: Run** `npx vitest run src/components/admin src/constants src/components/room` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): room catalog prices`.

---

### Task 13: Docs and operations

**Files:**
- Create: `docs/adr/0023-study-room-replaces-farm.md`, `docs/study-room-ops.md`
- Modify: `CONTEXT.md` (vocabulary: Leaves, Study room, Room layout, Focus mode, Tree, Welcome pack; remove **Personal Map**, **Decoration object**, **Farm plot** and the farm/Personal-Map mentions in the Routing/Data sections), `design.md` only if it names the farm, `docs/OWNER-TODO.md` (owner steps)

**Interfaces:** ADR records: Leaves are Functions-owned and unbuyable; layout saved via callable (the rules cannot count copies); room = `MapScene` + `cfg.room` (no second scene); supersedes the farm/Personal Map; consequences (deploy order, purge, part 2 scope). `study-room-ops.md`: deploy **rules → functions → hosting**; seed the catalog (`node scripts/seedRoomCatalog.mjs --apply`) **before** hosting goes live; upload new map/art (`node scripts/uploadAssets.mjs`); after release run `node scripts/purgeLegacyWorld.mjs` (dry run) then `--apply`; price tuning in Admin → Rooms; rollback notes (old clients cannot read `rooms`).

- [ ] **Step 1: Write the docs** with exact commands and the deploy order.
- [ ] **Step 2: Commit** `docs: ADR-0023 study room and ops notes`.

---

### Task 14: Whole-feature verification

**Files:** none new (fix-ups only, each with a test).

- [ ] **Step 1: Run** `npx vitest run`, `npm run test:rules:emu`, `npm run build`, `npx eslint` on every file changed by the branch — Expected: pass; no new lint errors.
- [ ] **Step 2: End-to-end on the emulators** (`firebase emulators:start --only auth,firestore,functions,storage,database --project demo-rcdtd` + `npm run dev` against them, seeded with `scripts/seedRoomCatalog.mjs --apply`): new account → welcome pack (100 Leaves, starter furniture, default layout) → 10-minute flexible focus using the emulator clock hook used by the focus tests → Leaves credited → buy a lamp → decorate → reload → layout persisted. Record the result (or why a step could not run) in the PR.
- [ ] **Step 3: Strict check:** start strict, hide the tab > 10 s → tree withers, 0 Leaves, explanation shown.
- [ ] **Step 4: Commit** any fixes as `fix(room): …`.

---

## Spec coverage

| Spec item | Task |
|---|---|
| Farm, Personal Map (`test3`) and Farm (`test2`) maps, farm data and admin removed; purge script | 11 |
| Welcome pack (100 Leaves + starter set, idempotent) | 4, 9 |
| Room scene, starter tier 0, theme `minimal`, furniture, desk slots | 7, 8 |
| Decorate mode (8 px grid, collision, pick up, no rotation) | 5, 10 |
| Catalog in Firestore, tunable prices, admin edit | 3, 12 |
| Focus modes Strict/Flexible, planned duration 10–120, wither rules | 1, 2, 6, 10 |
| Leaves formula, strict wither = 0, trees by duration, in-room feedback (pot, HUD tree) | 1, 2, 8, 10 |
| Economy guardrails: callable purchases, Functions-owned fields, layout ⊆ inventory | 2, 4, 5 |
| Offline/failed purchase messages, missing catalog item tolerated | 8, 10 |
| Tiers 1–3, extra themes, pets, wardrobe/avatar, studygram card, trophy history, friend visits, Guide practice focus | **second plan** (fields kept: `rooms.tier/theme/petId`, catalog kinds) |
