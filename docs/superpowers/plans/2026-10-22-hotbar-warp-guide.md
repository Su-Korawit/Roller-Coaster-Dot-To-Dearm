# Hotbar, Warp, Resume & Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `BottomNavBar` and the top-left ≡ menu with a 7-slot game hotbar plus a Bag, let the player warp between places, always resume where they left off, and teach the loop with a hands-on guide.

**Architecture:** A pure item registry (`hotbarItems.js`) says what each slot opens; a store keeps the 7 ids (Firestore for accounts, `localStorage` for guests) and normalises anything corrupt. `HomePage` keeps owning the existing panels and sheets; the hotbar only calls an `open(ctx)` supplied by `HomePage`. Warp reuses the existing map-change path (`useSchoolWorldStore.requestMapChange` → `GameCanvas` `mapChangeRequested`); resume points are sampled from `MapScene` and written through `createFirestoreSync`. The guide is a step machine fed by events that existing stores already produce. The one server change is a one-time *practice focus* that grants 10 Leaves.

**Tech Stack:** React 19, Zustand, Phaser 3, Firebase Functions v2 + Firestore rules/emulator, the Part A art pipeline (`scripts/art`), Vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-16-hotbar-warp-guide-design.md`. Overview: `2026-10-16-ilovetcas-v2-overview.md`. Study Room: `docs/adr/0023-study-room-replaces-farm.md`. Mockup/art: `docs/superpowers/specs/assets/2026-10-16-ilovetcas-v2/` (`hotbar-icons.png`, `mockups/hotbar-guide-warp.html`).

## Scope rulings (this plan)

The spec names features whose owners do not exist yet. Each ruling keeps the registries data-driven so the later projects only add a row.

- **Plan slot (3) and the Guide's Plan step:** the TCAS Plan sub-project is not built. The `plan` item is `ready: false`; the default hotbar puts `calendar` (the existing TCAS calendar popup) in slot 3 until `plan` is ready. The Guide skips steps whose `available()` is false.
- **Campus Open House destination and the Guide's Warp step:** Open House is not built. `campus` is a warp place only when a `campus` map exists in `DEFAULT_MAP_CONFIGS`. Until then the Warp step is completed by warping to *any* other place (School Hub needs a school; otherwise the step is skipped).
- **Friend's room destination:** needs room visits (Study Room plan 2). Not in this plan.
- **Letter slot:** the spec's single "Friends sheet with tabs" would embed two full-screen panels (`SocialPanel`, `ChatPanel`) that carry their own headers. Ruling: the Letter slot opens `ChatPanel`; the Bag item **เพื่อน** opens `SocialPanel`. Merging them into one tabbed sheet is deferred.
- **Unread chat badge:** there is no unread-message data model today. Badges in this plan: due-today tasks on slot 4 only; the registry supports a `badge(state)` function so chat/plan can be added.
- **Wardrobe slot (7):** opens the existing `ProfilePanel`; accessories/outfit hue belong to Study Room plan 2.
- **Shop slot (6):** opens `ShopSheet` (Leaves). The spec's **พรีเมียม** tab (existing Coins shop = `ShopChatView` inside `ChatPanel`) is added as a second tab that opens that view's panel; no payment logic changes.

## Global Constraints

- Plain JS/JSX; Tailwind v4 Soft Pixel tokens only (`paper`, `mist`, `line`, `hairline`, `ink`, `brand`, `leaf`, `lime`…); no legacy classes (the `legacyPurge` ratchet fails the build otherwise); text ≥ 12 px.
- Firestore paths only via `src/lib/db.js`; client Firestore writes debounced through `createFirestoreSync` (`src/lib/syncManager.js`).
- Hotbar: exactly 7 slots; ids unique; `warp` must be on the bar (it may move), `bag` is a separate fixed button after slot 7 and not part of the 7. Keys `1`–`7` use slots, `B` opens the Bag, `Esc` closes the top sheet. Every slot has `aria-label` (Thai label); selected slot lifts 4 px (`ItemSlot` already does).
- Warp transition 400 ms; with `prefers-reduced-motion` it is a static fade (no iris).
- Resume point shape `users/{uid}.resume = { last: mapKey, points: { [mapKey]: { x, y, facing, label, at } } }` (`at` = epoch ms). Local copy `rc-resume`; the newer `at` wins; an invalid or non-walkable point falls back to the map spawn.
- Practice focus: one-time, exactly **10 Leaves**, flexible, planned 1 minute, never writes `focusDaily` or `focusXp` (so never touches the leaderboard). The flag `users/{uid}.practiceRewarded` is Functions-owned (rules deny client writes, like `leaves`).
- Guests (ADR-0012): hotbar from `rc-hotbar`, guide from `rc-guide`, resume from `rc-resume`; focus/shop steps need sign-in and are skipped for guests.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Resume/warp stranding:** a stored resume `last` that is a retired map (`test3`), a map without a config, `school_hub` for a student with no school, or a point inside a wall/outside the map must boot at the room (or the map's spawn), never a blank canvas or a loop. Pinned in Tasks 5–6.
2. **Corrupt hotbar data:** a stored array with the wrong length, duplicates, unknown or not-ready ids, or without `warp` must normalise to a valid 7-slot bar; a swap must never drop `warp`. Pinned in Tasks 1–2.
3. **Practice-focus farming:** a second practice session, tampered `plannedMin`/`mode` alongside `practice: true`, ending twice, two tabs ending at once, practice while a normal session is active — never more than 10 Leaves in total, never XP/leaderboard. Pinned in Task 7.
4. **Guide stranding:** a step whose prerequisite cannot be met (guest, not enough Leaves for the cheapest item because the welcome pack was spent, item already owned, no school) must complete-by-condition or be skipped; the overlay must never block input when its target element is missing. Pinned in Task 8.
5. **Navigation regressions from removing `BottomNavBar` and the ≡ menu:** every former destination (Task, Social, Chat, Profile, Calendar, Mastery, Roadmap, School, News, Music) is reachable from the hotbar or the Bag; `Esc` closes the top sheet only; the hotbar does not cover the MiniPlayer, contact FAB, `Popup` sheets or the focus HUD at 375 px width. Pinned in Tasks 3–4.

---

### Task 1: Item registry and hotbar normalisation (pure)

**Files:**
- Create: `src/constants/hotbarItems.js`, `src/constants/hotbarItems.test.js`, `src/lib/hotbarRules.js`, `src/lib/hotbarRules.test.js`
- Modify: `scripts/art/families/icons.mjs` (add sprite `bag`, row 9), regenerate `public/assets/rc/icons.{png,json}` with `node scripts/art/build.mjs icons`

**Interfaces:**
- Produces `HOTBAR_ITEMS: Record<id, Item>` and `BAG_ONLY_ITEMS: Record<id, Item>` with `Item = { id, labelTh, icon: string /* sprite name in icons.json */, ready: boolean, view?: string /* APP_VIEWS value */, sheet?: string, popup?: string, badge?: (state) => number }`. Hotbar ids: `focus`, `warp`, `plan` (`ready: false`), `tasks`, `letter`, `shop`, `wardrobe`. Bag-only ids: `calendar`, `mastery`, `roadmap`, `school`, `news`, `music`, `friends`, `settings`, `guide`, `adminChat`. Icons come only from the sheet (`focus`, `warp`, `plan`, `tasks`, `friends` for `letter`/`friends`, `shop`, `wardrobe`, `guide`, new `bag`); bag-only items reuse them: `calendar`/`roadmap` → `plan`, `school` → `tasks`, `mastery`/`news` → `guide`, `music`/`adminChat` → `friends`, `settings` → `bag`. No Lucide icons in the hotbar or Bag.
- Produces `src/lib/hotbarRules.js`: `SLOTS = 7`; `defaultHotbar(isReady = (id) => HOTBAR_ITEMS[id]?.ready) -> string[7]` = `['focus','warp', plan-or-calendar,'tasks','letter','shop','wardrobe']`; `normalizeHotbar(ids, isReady) -> string[7]` (drops unknown, not-ready, duplicate ids; refills missing slots from the default order; guarantees `warp` is present); `swapSlots(ids, from, to) -> string[7]` (indices 0–6, same-index no-op, never removes `warp`); `placeFromBag(ids, itemId, slot, isReady) -> string[7]` (puts a hotbar-eligible `itemId` into `slot`, the displaced id goes to the item's old slot if it was on the bar, else is dropped; refuses `warp` displacement: if the displaced id is `warp` and the item was not on the bar, returns `ids` unchanged).

- [ ] **Step 1: Write the failing tests.** Registry: every id has `labelTh` (non-empty), an `icon` that exists in `public/assets/rc/icons.json` (including the new `bag`), exactly one of `view`/`sheet`/`popup`; hotbar ids are exactly the seven above; `plan.ready === false`. Rules: `defaultHotbar()` has 7 unique ids with `calendar` in slot 3 while `plan` is not ready and `plan` there once ready; `normalizeHotbar` cases — `undefined`/`null`/`'x'`/`[]`, 9 entries, duplicates `['focus','focus',…]`, unknown id, a not-ready `plan`, missing `warp` (inserted, replacing the last non-focus slot) — all return valid 7 unique ids containing `warp`; `swapSlots(['focus','warp',…], 1, 4)` moves warp but keeps it; `placeFromBag` bag-only item `calendar` into slot 0 when `calendar` is not on the bar drops `focus` (old occupant) and when into the `warp` slot returns the input unchanged.
- [ ] **Step 2: Run** `npx vitest run src/constants/hotbarItems.test.js src/lib/hotbarRules.test.js` — Expected: FAIL (modules not found).
- [ ] **Step 3: Implement** both modules; draw the `bag` backpack icon in `icons.mjs` with the existing helpers (20×20, palette only, same outline weight as the other icons) and rebuild with `node scripts/art/build.mjs icons` (the palette lint must pass).
- [ ] **Step 4: Run** the same command plus `npx vitest run scripts/art` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(hotbar): item registry, normalisation rules and bag icon`.

---

### Task 2: Hotbar and guide persistence (store + db shapes)

**Files:**
- Create: `src/stores/useHotbarStore.js`, `src/stores/useHotbarStore.test.js`
- Modify: `src/lib/db.js` (`shapes.hotbar`), `src/lib/db.test.js`, `src/lib/syncManager.js` (a `hotbarSync` built with `createFirestoreSync`, exported `hydrateHotbarFromFirestore`, `setHotbarSyncUser`), `src/services/sessionBootstrap.js` (hydrate after login, disarm + reset in `teardownSession`), its test

**Interfaces:**
- Consumes: `normalizeHotbar`, `swapSlots`, `placeFromBag`, `defaultHotbar` (Task 1).
- Produces `useHotbarStore`: state `{ slots: string[7] }`; actions `swap(from, to)`, `assign(itemId, slot)` (from the Bag), `reset()`. Every change calls the sync push. `shapes.hotbar(doc) -> string[7]` = `normalizeHotbar(doc?.hotbar)`. Guests: reads/writes `localStorage['rc-hotbar']` (JSON, wrapped in try/catch; unreadable → default). On login the cloud copy wins if present; if the cloud has none and a local one exists, the local one is uploaded.

- [ ] **Step 1: Write the failing tests:** initial state is `defaultHotbar()`; `swap(0, 4)` swaps and persists to `rc-hotbar` for a guest; `assign('calendar', 2)` follows `placeFromBag`; corrupt `localStorage` (`'not json'`, `'[1,2]'`) yields the default; `shapes.hotbar({ hotbar: ['x'] })` normalises; sync: a change pushes `{ hotbar: [...] }` through the debounced writer (mock `setDoc`, fake timers) exactly once for three quick swaps; `teardownSession` resets the store and disarms sync.
- [ ] **Step 2: Run** `npx vitest run src/stores/useHotbarStore.test.js src/lib/db.test.js src/services/sessionBootstrap.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** the store and the sync (copy the `portfolioSync` pattern: `toDoc`, `fromDoc`, `changed`, `needsSeed: () => false`).
- [ ] **Step 4: Run** the same command and `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(hotbar): persisted slot order for accounts and guests`.

---

### Task 3: Hotbar component, keyboard and mounting

**Files:**
- Create: `src/components/hotbar/Hotbar.jsx`, `src/components/ui/AtlasIcon.jsx` (renders sprite `name` from `icons.png` at an integer scale, decorative), `src/components/hotbar/Hotbar.test.jsx`, `src/hooks/useHotbarKeys.js` (+ test)
- Modify: `src/components/ui/ItemSlot.jsx` (accept `iconName` rendered with `AtlasIcon`; keep the `icon` src prop working), `src/pages/HomePage.jsx` (mount `<Hotbar ctx={…}>` where `BottomNavBar` was, gated by `uiVisibility.hotbar`; remove `BottomNavBar`, `shouldShowNav`, `activeTab` tab-bar wiring), `src/constants/appViews.js` (drop `shouldShowNav` and its test), `src/components/ui/Popup.jsx` (`NAV_SAFE_PB` → hotbar height constant `HOTBAR_H` exported from `src/constants/hotbarLayout.js`), `src/components/music/MiniPlayer.jsx` (offset from `HOTBAR_H`), `src/constants/zIndex.js` (`Z_NAV` doc comment), `src/components/room/RoomLayer.jsx` (remove the two temporary buttons; the slot opens the sheets), `src/components/hud` contact FAB offset in `HomePage`
- Delete: `src/components/BottomNavBar.jsx`

**Interfaces:**
- Consumes: registry + `useHotbarStore`; `ctx` from `HomePage` = `{ openView(viewId), openPopup(id), openSheet(name) }` where `openSheet` is `useRoomUiStore.open` for `'focus' | 'shop'` plus new names `'warp' | 'bag'` (extend `useRoomUiStore` doc comment; add `'warp'`, `'bag'`).
- Produces `Hotbar({ ctx })`: renders the 7 `ItemSlot`s (hotkey numbers shown), then the fixed Bag button (`B`); tapping a slot calls the registry item (`view` → `ctx.openView`, `popup` → `ctx.openPopup`, `sheet` → `ctx.openSheet`). Slot `focus`: if `useFocusStore.status === 'running'`, it scrolls/pulses the `FocusHud` instead of opening the setup sheet (`FocusHud` gets `id="focus-hud"`; the slot calls `document.getElementById('focus-hud')?.focus()`). Badge: `tasks` shows the number of tasks due today (existing `useTaskStore` shape; read the field the TaskPanel uses for due dates). Hidden when `uiVisibility.hotbar === false` (this also makes the Settings toggle real).

- [ ] **Step 1: Write the failing tests** (jsdom): renders 7 slots + bag with Thai `aria-label`s; clicking `tasks` calls `ctx.openView('task')`; `shop` calls `ctx.openSheet('shop')`; keys `1`…`7` trigger the matching slot, `b` the bag, none while typing in an `input`/`textarea` or while a modifier is held; `Esc` closes the top sheet (`useRoomUiStore.close()` when a sheet is open, else `usePopupStore.close()`); the `tasks` badge shows the due count and is absent at 0; `uiVisibility.hotbar=false` renders nothing; at 375 px width the bar's computed height equals `HOTBAR_H` (assert the exported constant is used by `Popup`/`MiniPlayer` via their style strings). Legacy ratchet: `npx vitest run src/legacyPurge.test.js`.
- [ ] **Step 2: Run** `npx vitest run src/components/hotbar src/hooks/useHotbarKeys.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** the components and wiring; delete `BottomNavBar.jsx` and fix every import; `HomePage` keeps its `activeTab` state for the full-screen panels but no longer shows a tab bar. Keep `APP_VIEWS` values unchanged.
- [ ] **Step 4: Run** `npx vitest run` and `npm run build` — Expected: PASS, build ok.
- [ ] **Step 5: Commit** `feat(hotbar): seven-slot hotbar replaces the bottom nav`.

---

### Task 4: Bag sheet and removal of the ≡ menu

**Files:**
- Create: `src/components/hotbar/BagSheet.jsx`, `src/components/hotbar/BagSheet.test.jsx`
- Modify: `src/pages/HomePage.jsx` (remove the ≡ menu block and its state; its entries become Bag items), `src/components/SettingsSheet.jsx` (remove the `shortcuts` visibility row; keep `hotbar`, `newsButton`, `musicPill`, `contactFab`), `src/stores/useUserStore.js` (drop `shortcuts` from `uiVisibility` defaults at both places), tests that referenced it

**Interfaces:**
- Consumes: `HOTBAR_ITEMS`, `BAG_ONLY_ITEMS`, `useHotbarStore.assign`, `ctx` (Task 3), `useLongPressDrag` (`src/hooks/useLongPressDrag.js`, read its API first).
- Produces `BagSheet({ onClose, ctx })`: a `Popup` sheet listing every item (hotbar-eligible items show a small "บนแถบ ช่อง n" marker); tap = use it (closes the sheet first, then `ctx` action); dragging a hotbar-eligible item onto a hotbar slot preview calls `assign(itemId, slot)`; a "ใส่ในช่อง" keyboard alternative (select item → press `1`–`7`) so reordering works without a pointer. Items `news` and `music` respect `uiVisibility.newsButton` / `musicPill`; `adminChat` (ติดต่อผู้พัฒนา) shows only for non-admin signed-in users and reuses `HomePage.openAdminChat`.

- [ ] **Step 1: Write the failing tests:** lists all registry items with labels; tapping `calendar` closes the sheet and calls `ctx.openPopup`/planner transition; keyboard assign (select `calendar`, press `3`) updates the store; hidden by flags (`newsButton:false` removes `news`); `adminChat` absent for guests and for the admin uid; every former ≡-menu destination (calendar, mastery, roadmap, school, news) is present.
- [ ] **Step 2: Run** `npx vitest run src/components/hotbar/BagSheet.test.jsx src/components/SettingsSheet.test.jsx src/stores/useUserStore.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement**, wire `sheet === 'bag'` in `RoomLayer` or `HomePage` (one place; follow where `ShopSheet` is rendered today).
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(hotbar): bag sheet replaces the menu button`.

---

### Task 5: Resume points (store, merge, sampling, boot)

**Files:**
- Create: `src/stores/useResumeStore.js`, `src/stores/useResumeStore.test.js`, `src/lib/resumeRules.js`, `src/lib/resumeRules.test.js`
- Modify: `src/lib/db.js` (`shapes.resume`), `src/lib/syncManager.js` (`resumeSync`, debounced ≈10 s), `src/services/sessionBootstrap.js`, `src/game/worldScenes.js` (position sampling + `spawnAt` init + `isWalkable`), `src/components/GameCanvas.jsx` (boot from resume, flush on `visibilitychange`/`pagehide`), `src/utils/mapConfig.js`, tests

**Interfaces:**
- Produces `src/lib/resumeRules.js`: `mergeResume(local, cloud) -> resume` (per map key the point with the greater `at` wins; `last` is the key of the newest point; either side may be `null`); `pickBootTarget({ resume, isAllowed, fallbackKey }) -> { mapKey, point|null }` — `last` must satisfy `isAllowed(mapKey)` (exists in the map registry, not retired, not `school_hub`, which needs the async room choice; `campus` allowed when its config exists), else `fallbackKey` with `point: null`; `nearestLabel(zones, x, y, fallback) -> string` (nearest named interaction/zone within 96 px, else the map's fallback label).
- Produces `useResumeStore`: `{ last, points }`, `record(mapKey, { x, y, facing, label })` (stamps `at = Date.now()`, writes `rc-resume` immediately, schedules the cloud push), `hydrate(cloud)`, `reset()`.
- `MapScene` gains: `init({ mapKey, spawn, spawnAt })` — when `spawnAt` is given and `isWalkable(x, y)` is true the player starts there, otherwise the named spawn; a 2 s throttled event `playerSampled { x, y, facing }` while the player moves; `isWalkable(x, y)` uses the scene's existing collision data (read the colliders/collision layers set up in `create()` first; it must treat out-of-map points as not walkable).

- [ ] **Step 1: Write the failing tests:** `mergeResume` newest-wins per key and `last` follows the newest `at`; `pickBootTarget` falls back for `test3`, an unknown key, `school_hub`, `null` resume, and returns the point for `room`; `nearestLabel` picks the nearest zone within range and the fallback beyond it; store: `record` writes `rc-resume` synchronously, three records inside 10 s produce one cloud push; guests: `hydrate` of a cloud copy is ignored when the local one is newer; `isWalkable` unit test with a stub collision grid (wall tile → false, floor → true, outside → false); GameCanvas boot test (existing mocks in `GameCanvas` tests, if none, test `bootEntry()` extracted as a pure helper that takes `{ maps, resume }` and returns `{ mapKey, spawnAt }`).
- [ ] **Step 2: Run** `npx vitest run src/lib/resumeRules.test.js src/stores/useResumeStore.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement.** Flush: on `visibilitychange: hidden` and `pagehide` call `flush()` (best effort) after the immediate local write. Sample the position only in maps with `room`/`campus` (skip `school_hub`: it is re-entered through `enterSchoolHub`; record only its `at`/label so Warp can show "ล่าสุด").
- [ ] **Step 4: Run** `npx vitest run` and `npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(resume): remember where the player stood on every map`.

---

### Task 6: Warp sheet and transition

**Files:**
- Create: `src/constants/warpPlaces.js` (+ test), `src/components/hotbar/WarpSheet.jsx`, `src/components/hotbar/WarpSheet.test.jsx`, `src/components/hotbar/WarpTransition.jsx` (+ test), `src/services/warp.js` (+ test)
- Modify: `src/components/GameCanvas.jsx` (render the transition over `isSwitchingMap`; pass `spawnAt` through `mapChangeRequested`), `src/stores/useSchoolWorldStore.js` (`requestMapChange(mapKey, opts)` carries `spawnAt`), `src/game/worldScenes.js` (forward `spawnAt`), `src/utils/mapConfig.js` (export `isWarpMapAvailable(key)`)

**Interfaces:**
- Produces `WARP_PLACES = [{ id: 'room', labelTh: 'ห้องของฉัน', mapKey: 'room', needs: null }, { id: 'campus', labelTh: 'งานเปิดบ้าน (Open House)', mapKey: 'campus', needs: 'map' }, { id: 'hub', labelTh: 'โรงเรียน (School Hub)', mapKey: 'school_hub', needs: 'school' }]`; `availablePlaces({ maps, hasSchool, signedIn }) -> Place[]` (campus only if its map config exists; hub only if `hasSchool` and `signedIn`).
- Produces `warpTo(placeId, { resume: boolean }) -> Promise<{ ok } | { ok:false, error }>` in `src/services/warp.js`: `room`/`campus` → `useWorldStore` owner flip via `returnHome(uid, mapKey)` then `requestMapChange(mapKey, { spawnAt })` where `spawnAt` comes from the resume point when `resume` is true; `hub` → `enterSchoolHub(uid)` (existing, handles room choice and errors). Records the departure point in `useResumeStore` first. Emits `guide` event `warped` (Task 8).
- `WarpSheet({ onClose })`: one row per available place — thumbnail (the map's preview image if the registry has one, else the place icon), "ที่นี่" marker for the current map, "ล่าสุด: {label}" from the resume store, a primary **ไปต่อ** button (`resume: true`) and a **ไปจุดเริ่มต้น** button (`resume: false`; the spec's long-press is not discoverable and not available to keyboard users). Errors from `enterSchoolHub` map to the existing Thai messages (`NO_SCHOOL`, `ROOM_FULL`, `FAILED`).
- `WarpTransition({ active })`: 400 ms iris via CSS clip-path; under `prefers-reduced-motion` a 150 ms opacity fade; `aria-hidden`; never blocks pointer events after `active` goes false.

- [ ] **Step 1: Write the failing tests:** `availablePlaces` filters by map/school/sign-in; `warpTo('room', { resume: true })` passes the stored point as `spawnAt` and `warpTo('room', { resume: false })` passes none; `warpTo('hub')` delegates to `enterSchoolHub` and surfaces its error code; the current place is marked "ที่นี่" and its **ไปต่อ** is disabled; reduced-motion renders the fade class; a failed map load (`mapLoadFailed`) removes the overlay (no stuck screen).
- [ ] **Step 2: Run** `npx vitest run src/constants/warpPlaces.test.js src/services/warp.test.js src/components/hotbar/WarpSheet.test.jsx src/components/hotbar/WarpTransition.test.jsx` — Expected: FAIL.
- [ ] **Step 3: Implement**; render `WarpSheet` for `sheet === 'warp'` next to the other sheets.
- [ ] **Step 4: Run** `npx vitest run` and `npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(warp): warp sheet, places registry and transition`.

---

### Task 7: Practice focus (Functions + client)

**Files:**
- Modify: `functions/index.js` (`startFocus`, `settleActive`), `functions/leavesMath.js` (+ `src/room/focusRules.js` mirror, fixtures) only if a shared constant `PRACTICE = { plannedMin: 1, leaves: 10 }` is added to both, `firestore.rules` (deny-list gains `practiceRewarded`), `src/services/focus.js` (`startFocus({ practice })`), `src/stores/useFocusStore.js` (carries `practice`), `src/components/room/FocusHud.jsx`, `src/components/room/FocusCompleteScreen.jsx` (practice copy), `src/room/messages.js`
- Test: `test/rules/focus.functions.test.js` (emulator), `test/rules/firestore.rules.test.js`, `src/stores/useRoomStores.test.js`

**Interfaces:**
- `startFocus({ practice: true })`: ignores `mode`/`plannedMin` from the request, stores `{ mode: 'flexible', plannedMin: 1, practice: true, withered: false }`; if `users/{uid}.practiceRewarded === true` → `failed-precondition` with message `PRACTICE_DONE`. A practice session cannot start while a normal one is active (the resume branch returns the existing session, whatever its kind).
- `endFocus` for a practice session: requires server-verified time ≥ 45 s (`verifiedMs` after settle; the HUD waits the full minute plus the 3 s grace) — otherwise it ends without reward (`leaves: 0`); on success `tx` sets `leaves += 10` and `practiceRewarded: true`, writes the `focusSessions` doc with `practice: true`, and writes **no** `focusDaily` and **no** `focusXp`. Idempotent: the active doc is deleted in the same transaction, so a second `endFocus` is `NO_ACTIVE_SESSION`. `abandonFocus` on a practice session rewards nothing. Result shape adds `practice: true`.

- [ ] **Step 1: Write the failing emulator tests:** practice start stores flexible/1/`practice`; request `{ practice:true, mode:'strict', plannedMin:50 }` still stores flexible/1; ended at 60 s → `leaves: 10`, user `leaves` +10, `practiceRewarded` true, no `focusDaily` doc, `focusXp` unchanged, session doc `practice:true`; ended at 20 s → 0 and `practiceRewarded` stays false (can retry); second practice start after a reward → `failed-precondition`; ending twice credits once; `Promise.all` of two `endFocus` credits once; practice start while a normal session is active returns that normal session (`practice` falsy) and a later `endFocus` pays normal Leaves only; rules: an owner update of `practiceRewarded` is denied and a user-doc `create` containing it is denied (extend the create guard from the study-room fix).
- [ ] **Step 2: Run** `bash <runEmu> auth,firestore "test/rules/focus.functions.test.js"` (the same emulator helper as the Study Room plan) — Expected: FAIL.
- [ ] **Step 3: Implement** in `functions/index.js` keeping reads before writes; client: `useFocusStore.start({ practice: true })` stores `practice`, the HUD shows "ลองโฟกัส 1 นาที" instead of the tree-species label, `FocusCompleteScreen` says "ได้รับของขวัญต้อนรับ +10 ใบไม้" for a rewarded practice and never shows the daily-cap text.
- [ ] **Step 4: Run** the emulator suite (`test/rules`) and `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(focus): one-time practice focus for the guide (10 Leaves)`.

---

### Task 8: Guide (step machine, bubble, spotlight)

**Files:**
- Create: `src/constants/guideSteps.js` (+ test), `src/stores/useGuideStore.js` (+ test), `src/components/hotbar/GuideOverlay.jsx` (+ test), `src/components/ui/SpeechBubble.jsx` (+ test)
- Modify: `src/lib/db.js` (`shapes.guide`), `src/lib/syncManager.js` (`guideSync`), `src/services/sessionBootstrap.js`, `src/components/hotbar/Hotbar.jsx` + `BagSheet.jsx` (add `data-guide` attributes), `src/stores/useRoomStore.js` (`place` success → `guide.notify('placed')`), `src/components/room/ShopSheet.jsx` (buy success → `notify('bought')`), `src/stores/useFocusStore.js` (rewarded practice end → `notify('practiced')`), `src/services/warp.js` (`notify('warped')`), `src/components/GameCanvas.jsx`/`HomePage.jsx` (mount overlay), Bag item **คู่มือ** (replay)

**Interfaces:**
- Produces `GUIDE_STEPS = [{ id: 'practice', target: '[data-guide="slot-focus"]', textTh, doneOn: 'practiced', available: ({ signedIn, practiceDone }) => signedIn && !practiceDone }, { id: 'buy', target: '[data-guide="slot-shop"]', doneOn: 'bought', available: ({ signedIn }) => signedIn }, { id: 'decorate', target: '[data-guide="decorate"]', doneOn: 'placed', available: ({ signedIn }) => signedIn }, { id: 'warp', target: '[data-guide="slot-warp"]', doneOn: 'warped', available: ({ places }) => places > 1 }, { id: 'plan', …, available: () => false }]` (plan step present for the later project, never available now).
- Produces `useGuideStore`: `{ step, done, skipped }`; `start()`, `notify(event)` (advances only if `event === current.doneOn`; then jumps to the next **available** step; after the last → `done: true`), `skip()`, `replay()`, `current()`; persisted to `users/{uid}.guide` / `rc-guide`.
- Prerequisite rules: the `buy` step is **completed by condition** when the player already owns any non-starter item or has fewer Leaves than the cheapest visible catalog item (they cannot buy) — it never traps; the `decorate` step likewise completes if the player already has an item in the room that is not in `STARTER_LAYOUT`.
- `GuideOverlay`: pet (default cat sprite from the existing icon sheet until pets ship) speech bubble + a spotlight cut-out around `document.querySelector(step.target)`; if the target is missing or hidden, the overlay renders the bubble only with **no dimming and `pointer-events: none`** and retries on the next animation frame for up to 2 s. The dim layer never captures clicks over the spotlight rectangle. Skip button always visible; `Esc` skips.
- Auto-start: first time a signed-in user lands in the room with `guide.step === 0` and not `done`/`skipped` (after the welcome pack). Guests are not auto-started.

- [ ] **Step 1: Write the failing tests:** step machine — `notify('bought')` on the practice step does nothing; the right event advances; unavailable steps are skipped (`warp` when only one place; `plan` always); finishing sets `done`; `skip` sets `skipped` and stops auto-start; `replay` resets; prerequisite rules (owns item → `buy` completes; Leaves < cheapest → `buy` completes; non-starter in room → `decorate` completes); persistence shape + guest `rc-guide`; overlay — missing target renders no dim and `pointer-events: none`, present target renders a spotlight rect, `Esc` skips; bubble is a `role="status"` region.
- [ ] **Step 2: Run** `npx vitest run src/constants/guideSteps.test.js src/stores/useGuideStore.test.js src/components/hotbar/GuideOverlay.test.jsx` — Expected: FAIL.
- [ ] **Step 3: Implement** and add the `notify` calls at the producers listed under Files (each is one line plus a test in that module's existing suite).
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(guide): hands-on guide with spotlight and step machine`.

---

### Task 9: Docs, ops and whole-feature verification

**Files:**
- Create: `docs/adr/0024-hotbar-warp-resume-guide.md` (status `accepted`: context, decision, considered options — merged Friends sheet / tabs rejected for now, resume in a Firestore field vs presence, guide-granted Leaves from the client rejected for the server-owned practice flag — consequences)
- Modify: `CONTEXT.md` (add **Hotbar**, **Bag**, **Warp**, **Resume point**, **Guide**, **Practice focus**; update Study Room rows that mention the temporary buttons), `docs/study-room-ops.md` (deploy order for the practice change: rules → functions; nothing to seed), `OWNER-TODO.md`, `src/data/appUpdates.js` (one news entry), `src/components/room/RoomLayer.jsx` comment

- [ ] **Step 1: Write** the ADR and glossary changes; add the owner section (deploy rules then `startFocus`/`endFocus`/`abandonFocus`/`checkInFocus` functions; visual checks at 375 and 1280 px: hotbar, bag, warp transition, guide spotlight, practice focus; confirm the Letter/Friends ruling).
- [ ] **Step 2: Run the whole verification:** `npx vitest run`, `bash <runEmu> auth,firestore,database,storage "test/rules"`, `npm run build`, `npx eslint` on touched `src` files — Expected: all green; record counts.
- [ ] **Step 3: Browser check** with the preview tools if the pane renders (hotbar visible at 375 px, `1`–`7` keys, warp room → hub error path for a user without a school, reload resumes at the stored point). If the pane cannot render, say so in the PR as unverified.
- [ ] **Step 4: Commit** `docs: ADR-0024 hotbar, warp, resume and guide`.
