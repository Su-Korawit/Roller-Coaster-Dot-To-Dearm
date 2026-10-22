# 0023 — Study Room replaces the farm and the Personal Map

**Status:** accepted
**Date:** 2026-10-22

## Context

The app opened on a farm game and a "Personal Map" students decorated. It rewarded time
spent in the game, not studying. The product loop is now explore faculties → plan → study →
earn → decorate (`docs/superpowers/specs/2026-10-16-ilovetcas-v2-overview.md`). Studying
needs its own, verifiable currency and a place students want to come back to.
Design: `docs/superpowers/specs/2026-10-16-study-room-design.md`; plan:
`docs/superpowers/plans/2026-10-22-study-room.md`.

## Decision

- **Leaves** are the study currency. They are credited **once, at the end of a verified focus
  session**, by Cloud Functions (`endFocus` / `abandonFocus`), from server time
  (`functions/leavesMath.js`, same fixtures as `src/room/focusRules.js`). Strict mode (×1.5)
  withers on leaving the page for more than 10 s or on a lapsed check-in and then earns 0;
  Flexible (×1) tolerates 2 min away. `users/{uid}.leaves`, `.roomInventory` and
  `.welcomePack` are Functions-owned: the rules deny client writes, as for `coins` and
  `focusXp`. Coins never convert to Leaves.
- **Purchases** go through `buyRoomItem` (a transaction that reads the user and the catalog
  row, checks price/tier/ownership, writes both balance and inventory), so parallel calls
  cannot double-spend. `claimWelcomePack` grants 100 Leaves and the starter furniture once.
- **The room layout is saved by a callable, not by the client.** Firestore rules cannot
  count copies per item in a list, so `saveRoomLayout` validates the layout against the
  owner's inventory and the catalog with the same placement rules the editor uses
  (`functions/placement.js` = `src/room/placement.js`, shared fixtures); `rooms/{uid}` is
  client-read-only. Cost: one callable per debounced save.
- **The room is the generic `MapScene`**, not a second scene class: a generated 11×9 Tiled
  map (`scripts/buildRoom.mjs`) plus furniture sprites drawn from the saved layout
  (`src/game/roomRender.js`) for maps whose config has `room: true`. The player controller,
  camera, collision and presence are reused.
- **The catalog lives in Firestore** (`roomCatalog`, public read, admin write) so prices can
  be tuned without a deploy; `src/data/roomCatalogSeed.js` + `scripts/seedRoomCatalog.mjs`
  hold the initial rows and art stays code-owned (`scripts/art/families/room*.mjs`).
- **The farm, the Personal Map and the maps `test3` / `test2` are removed**: stores, systems,
  components, admin section, rules, sync code, the farm hotbar and the Personal Map visit
  button. `maps/{uid}` becomes read-only until `scripts/purgeLegacyWorld.mjs` deletes the
  legacy data (it never touches coins, focus XP, Leaves or rooms). `school_hub` stays and its
  exit now leads to the room. Map JSON is loaded from the manifest's (versioned) storage path.
- **Scope:** this ADR covers the core loop. Room tiers 1–3, extra themes, pets, character
  accessories, the studygram card, trophy history, friend visits of rooms and the Guide's
  practice focus are a second plan; the `rooms.tier/theme/petId` fields and the catalog
  `kind` values already exist for them.

## Considered options

- **Keep the farm beside the room** — two reward loops, farm gold would compete with Leaves,
  and the farm code (≈30 files) keeps shaping every map change. Rejected.
- **Client-written room layout under rules** — cannot enforce "at most N copies owned".
  Rejected for the callable above.
- **Credit Leaves at every check-in** — a strict session could pay out and then wither.
  Rejected: one credit at the end, decided from the final state.
- **A dedicated `RoomScene` class** — duplicates ~1000 lines of movement, collision and
  presence for one extra layer of sprites. Rejected.
- **Purge farm data on deploy** — irreversible before anyone verified the release. Rejected:
  rules make the data read-only and the owner runs the purge afterwards.

## Consequences

- Deploy order matters (`docs/study-room-ops.md`): rules → functions → seed the catalog →
  hosting. Old clients cannot read `rooms` and will not show Leaves.
- Existing accounts lose their farm and Personal Map; they get the welcome pack on next
  sign-in. Coins, focus XP and the school leaderboard are unchanged.
- The Hotbar sub-project replaces the two temporary room buttons (focus, shop).
- Guests (ADR-0012) see the starter room from a local default; focus and shop need an
  account.
