# Soft Pixel Part B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every legacy screen onto the Soft Pixel system (canonical tokens, `px-*` surfaces, no hard-coded legacy colours, no sub-12px text) and redraw the School Hub map with generated Soft Pixel art, with behaviour unchanged.

**Architecture:** Part A re-pointed the old token names, so screens already *look* close. Part B finishes the job screen group by screen group: a pure `migrateSource` codemod rewrites the mechanical part (legacy utility names, `neo-*`, arbitrary-value hex, tiny text), a ratchet test (`legacyPurge`) fails for any file outside an allowlist that still has legacy styling, and each group task shrinks the allowlist (RED) then fixes the files (GREEN). A last task deletes the legacy aliases. The School Hub gets a code-generated tileset (the Part A art pipeline) and `buildSchoolHub.mjs` is re-pointed from Sprout Lands gids to that tileset.

**Tech Stack:** React 19, Tailwind v4 (`@theme` in `src/index.css`), Vitest 4 (jsdom per file), Node ESM scripts, `sharp` via `scripts/art/px.mjs`, Phaser 3 (map only).

**Spec:** `docs/superpowers/specs/2026-10-16-soft-pixel-redesign-design.md` (Part B). Part A plan: `docs/superpowers/plans/2026-10-16-soft-pixel-part-a.md`. Overview: `docs/superpowers/specs/2026-10-16-ilovetcas-v2-overview.md`.

## Global Constraints

- Plain JS/JSX only; Tailwind v4 tokens only in `src/index.css` `@theme`; Firestore paths only via `src/lib/db.js` (no data changes in this plan at all).
- **Behaviour and component APIs unchanged.** Every existing test must still pass (`npx vitest run`). A diff that touches logic in a restyle task is a defect — keep restyle diffs to `className`/`style`/colour props.
- Canonical token names after this plan: surfaces `paper`/`mist`/`hairline`, outlines `line`/`line-soft`, text `ink`/`ink-soft`, brand `brand`/`brand-strong`/`brand-soft`, states `leaf`/`good`/`warn`/`danger` (+ `*-strong` for text), zone colours `zone-*`. Retired names: `surface`, `hud`, `edge`, `wood`, `wood-light`, `wood-dark`, `wood-edge`, and the `neo-*` classes.
- Never pure black; primary outline `#5c4e92`, object outline `#6f63a6`; hard shadow only (`3px 3px 0 0 #5c4e92` / `2px 2px 0 0`).
- Readable text is never smaller than 12px (`text-xs`); sentence case, no all-caps labels; Press Start 2P only for Latin wordmarks (`.wordmark-font`).
- Text tokens meet WCAG AA on their background; white text never sits on `bg-warn|good|lime|leaf` (guarded by `src/theme/contrastUsage.test.js`).
- Out of scope and untouched: `BottomNavBar` (replaced by the Hotbar sub-project), farm/Personal-Map screens that the Study Room sub-project deletes (`ShopUI`, `StorageUI`, `SeedPicker`, `FarmActionButton`, `MapPalette`) — they only get the mechanical codemod in Task 15 if they still exist then; React Flow handle/rotation mechanics in `components/roadmap/*` (colours and borders only); RTDB/Firestore rules and School World mechanics.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Codemod rewrites text that is not a class name** (a variable called `edge`, `hud`, a comment, a Thai string, `border-edge` inside a template literal with interpolation) or mangles opacity suffixes (`border-edge/40`). Pinned by the `migrateSource` unit tests in Task 1.
2. **Raising sub-12px text overflows or truncates on a 375 px phone** (ChatPanel has 38 such spots, SkillPanel 25, SocialPanel 23). Pinned by the per-group 375 px screenshot check in the group procedure; the codemod never touches `truncate`/`line-clamp` classes.
3. **Hex → token mapping changes meaning** (e.g. a warning amber turned into `text-warn` on white, which fails AA; a brand-third-party colour such as the Google "G" recoloured). Pinned by `HEX_MAP` only mapping to AA-safe roles, the `contrastUsage` test, and `THIRD_PARTY_HEX` kept verbatim (Task 1).
4. **School Hub redraw breaks the world**: a zone becomes unreachable, a collision tile loses its gid, the spawn or an interaction object disappears, or a gid points outside the new tileset. Pinned by the existing `buildSchoolHub.test.js` reachability/layer tests (kept, re-pointed) plus the gid-range test in Task 12.
5. **Legacy aliases removed while something still uses them** (a runtime class string built by concatenation, a Tailwind class only in a `.css` file or in `index.html`). Pinned by Task 15 greping `src`, `index.html`, `public/**/*.html` and `index.css` before deleting, and by the production build.

---

## Group procedure (used by Tasks 2–10 and 14)

Each group task lists its **files**, the **allowlist prefixes** to delete, group-specific notes, and the tests to run. The steps are always:

- [ ] **A. Dry run:** `node scripts/migrateTokens.mjs <group paths>` prints `file:line kind text` for every automatic change and every flagged item (hex that has no mapping, tiny text kept for review). Read it.
- [ ] **B. RED:** delete the group's prefixes from `src/theme/legacyAllowlist.js`; run `npx vitest run src/theme/legacyPurge.test.js` — Expected: FAIL listing the group's offending files (this proves the guard sees them).
- [ ] **C. Apply:** `node scripts/migrateTokens.mjs <group paths> --write`.
- [ ] **D. Hand-fix what the codemod flagged:** hex in `style=`/SVG attrs/props → `var(--color-<token>)` (JS colour values: import from `src/theme/colors.js`); a hex with no safe mapping → choose the token by role (surface → `paper`/`mist`, text → `ink`/`ink-soft`, border → `line`/`line-soft`/`hairline`, accent → the zone/brand token) and note it in the commit body; look at every `bg-warn`/`bg-good` for text contrast.
- [ ] **E. GREEN:** `npx vitest run src/theme` and the group's own tests (listed per task), then `npx vitest run` (whole suite) — Expected: all pass.
- [ ] **F. Look at it:** `npm run dev`, open the screens in guest mode (ADR-0012) in the built-in browser at **375×812** and **1280×800**; check nothing overflows, truncated labels still read, the pressed/hover states still show, and the text is still contrasty. Save PNGs as `docs/art-review/partb-<group>-{375,1280}.png` (gitignored) and mention what was checked in the commit body. A screen that cannot be reached in guest mode is checked by rendering its component test in the browser via `/dev/ui` only if listed there; otherwise record "not reachable in guest mode" in the ledger.
- [ ] **G. Commit:** `style(<group>): Soft Pixel pass`.

---

### Task 1: Migration tooling, colours module and ratchet guard

**Files:**
- Create: `src/theme/legacy.js`, `src/theme/legacy.test.js`, `src/theme/colors.js`, `src/theme/colors.test.js`, `src/theme/legacyAllowlist.js`, `src/theme/legacyPurge.test.js`, `scripts/migrateTokens.mjs`
- Branch: `git checkout -b feat/soft-pixel-part-b` (already created from `feat/content-site`; PR base is `feat/content-site` until it merges)

**Interfaces:**
- Produces (`src/theme/legacy.js`, pure, no imports from React/Vite so Node can import it):
  - `NEO_MAP: Record<string,string>` — `neo-btn→px-btn`, `neo-card→px-card`, `neo-slab→px-slab`, `neo-input→px-input`, `neo-sheet→px-sheet`, `neo-pressed→px-pressed`.
  - `TOKEN_MAP: Record<string,string>` — `surface→paper`, `hud→paper`, `edge→line`, `wood-edge→line-soft`, `wood-light→mist`, `wood→mist`, `wood-dark→hairline`.
  - `HEX_MAP: Record<string,string>` — uppercase hex → token name, only roles that stay AA-safe: `#3D2B1F→ink`, `#FFFFFF→paper`, `#F3E5C2→mist`, `#F8EFD6→mist`, `#F0D9A0→mist`, `#C8A96E→line-soft`, `#8B6343→line-soft`, `#E2E8F0→hairline`, `#E5E7EB→hairline`, `#F4F7FC→mist`. Anything else is flagged, not guessed.
  - `THIRD_PARTY_HEX: string[]` — `#EA4335 #FBBC05 #34A853 #4285F4` (Google brand marks), never rewritten or flagged.
  - `migrateSource(source: string) -> { code: string, changes: Array<{ line, kind, from, to }>, flagged: Array<{ line, kind, text }> }`. Rewrites inside any string/template text: class tokens `neo-*` (whole-word), legacy utilities `<prefix>-<legacy>(/<opacity>)?` for prefixes `bg|text|border|ring|from|to|via|shadow|fill|stroke|outline|divide|decoration|border-t|border-b|border-l|border-r|border-x|border-y` (whole-word, token must be exactly a `TOKEN_MAP` key, longest key first so `wood-edge` beats `wood`), arbitrary-value colours `<prefix>-[#HEX]` when `HEX_MAP` has the hex, and `text-[Npx]` with N < 12 → `text-xs`. Flags (does not rewrite): any remaining `#RRGGBB`/`#RGB` not in `THIRD_PARTY_HEX`, kind `hex`. Never touches lines inside `//` comments, JSX `{/* */}` comments, or identifiers (`const edge = …` is not a class token because it is not preceded by a utility prefix).
- Produces (`src/theme/colors.js`): `export const colors = { paper, mist, hairline, line, lineSoft, ink, inkSoft, brand, brandStrong, brandSoft, leaf, good, warn, danger, … }` — hex strings for JS consumers (canvas, charts, Phaser), values identical to `@theme`.
- Produces (`src/theme/legacyAllowlist.js`): `export const LEGACY_ALLOWED: string[]` — path prefixes relative to `src/` (e.g. `'components/ChatPanel.jsx'`, `'components/roadmap/'`) of files not yet migrated. Task 1 fills it with every currently-offending file/dir; each later task deletes its entries.
- Produces (`legacyPurge.test.js`): for every non-test `.jsx` under `src/` not covered by `LEGACY_ALLOWED`, `migrateSource(code)` must report no `changes` and no `flagged`; and every `LEGACY_ALLOWED` entry must still match at least one offending file (so stale entries fail and the list can only shrink).

- [ ] **Step 1: Write the failing tests.** `legacy.test.js`: `migrateSource('<div className="neo-card bg-surface border-edge/40">')` → code `px-card bg-paper border-line/40` with 3 changes; `bg-wood-edge` → `bg-line-soft` (not `bg-wood-edge` split at `wood`); `bg-[#3D2B1F]` → `bg-ink`; `text-[10px]` → `text-xs`, `text-[12px]` and `text-[13px]` untouched; `const edge = 1` and `// bg-surface` and `{/* neo-card */}` untouched; `#EA4335` untouched and unflagged; `'#9DB557'` flagged `hex`; `bg-hud` inside a template literal `` `${a} bg-hud` `` rewritten; `hud` as a bare word in Thai or English prose untouched; running `migrateSource` twice yields the same code. `colors.test.js`: every key in `colors` equals the matching `--color-*` value parsed with `readThemeTokens(readIndexCss())`. `legacyPurge.test.js` as described above.
- [ ] **Step 2: Run** `npx vitest run src/theme/legacy.test.js src/theme/colors.test.js src/theme/legacyPurge.test.js` — Expected: FAIL (modules not found).
- [ ] **Step 3: Implement** the three modules and `scripts/migrateTokens.mjs` (`node scripts/migrateTokens.mjs <file|dir>… [--write]`: walks `.jsx` files excluding `*.test.*`, prints `file:line kind from → to` per change and `file:line FLAG kind text` per flag, writes only with `--write`, exits 0). Generate the initial `LEGACY_ALLOWED` by running the scan over all of `src/` and listing every offending file (collapse a directory to its prefix only when *all* its non-test `.jsx` files offend or the directory belongs to one group task below).
- [ ] **Step 4: Run** the same command plus `npx vitest run src/theme` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(theme): legacy-style codemod, colours module and ratchet guard`.

---

### Task 2: Group — Shell

**Files (allowlist entries to delete):** `components/TopBar.jsx`, `components/NotificationContainer.jsx`, `components/DailyLoginModal.jsx`, `components/ConsentGate.jsx`, `components/GuestMergeDialog.jsx`, `components/ui/` (all primitives incl. `LoadingScene`, `GoldIcon`), `components/hud/`, `components/DayNightOverlay.jsx`. `MobileLayout` lives in `App.jsx` (check it has no legacy classes; edit if it does).

**Notes:** `ui/*` primitives were already restyled in Part A — this task only removes leftovers. `DevUiKit.jsx` stays last (Task 14) because it documents the old aliases. Tests: `npx vitest run src/components/ui src/components/hud src/components/ConsentGate.test.jsx src/components/DailyLoginModal.test.jsx src/theme`.

- [ ] Run the Group procedure A–G for this group; commit `style(shell): Soft Pixel pass`.

---

### Task 3: Group — Tasks

**Files:** `components/TaskPanel.jsx`, `components/TaskForm.jsx`, `components/SkillPanel.jsx`, `components/SkillExecutionPopup.jsx`, `components/MasteryPopup.jsx`, `components/CalendarPopup.jsx`, `components/MoodHeatmap.jsx`, `components/mastery/`.

**Notes:** `MoodHeatmap.jsx` has 8 literal colours: the heatmap intensity ramp is data-like — map the five steps to `mist → brand-soft → brand → brand-strong → ink` via `colors`, keeping the legend in sync (single source in the file). `SkillPanel`/`TaskPanel` have 25/19 sub-12px labels: check the 375 px view of both lists. Tests: `npx vitest run src/components/mastery src/components/MasteryPopup.test.jsx src/theme`.

- [ ] Run the Group procedure A–G; commit `style(tasks): Soft Pixel pass`.

---

### Task 4: Group — Friends & chat

**Files:** `components/SocialPanel.jsx`, `components/ChatPanel.jsx`, `components/KawaiiMatchOverlay.jsx`, `components/PublicProfileSheet.jsx`, `components/UserProfileSheet.jsx`.

**Notes:** `ChatPanel` has 38 sub-12px spots and `KawaiiMatchOverlay` 21 literals — the overlay is a celebratory screen: use `zone-arts`/`zone-arts-soft`/`accent-pink` for its pinks and keep its animation classes untouched. Bubble colours: own message `bg-brand text-white`, other `bg-mist text-ink` (both ≥ 4.5:1). Tests: `npx vitest run src/components/ChatPanel.test.jsx src/theme`.

- [ ] Run the Group procedure A–G; commit `style(social): Soft Pixel pass`.

---

### Task 5: Group — Profile & settings

**Files:** `components/ProfilePanel.jsx`, `components/profile/`, `components/SettingsSheet.jsx`, `components/DeleteAccountSheet.jsx`, `components/SoundSettings*` (the settings sound block inside `SettingsSheet`).

**Notes:** `TemperamentCard` uses MBTI temperament colours from `src/constants/temperaments.js` and `mbtiColors.js` — those constants are data, leave them; only the card chrome changes. Tests: `npx vitest run src/components/profile src/components/ProfilePanel.test.jsx src/components/SettingsSheet.test.jsx src/components/DeleteAccountSheet.test.jsx src/components/SoundSettings.test.jsx src/theme`.

- [ ] Run the Group procedure A–G; commit `style(profile): Soft Pixel pass`.

---

### Task 6: Group — Onboarding

**Files:** `components/onboarding/`, `pages/RegisterPage.jsx` (8 literals; it shares the onboarding look).

**Notes:** Step screens use `ui/StepScreen` already; check the selected/unselected card contrast. Tests: `npx vitest run src/components/onboarding src/pages/AuthPage.test.jsx src/theme`.

- [ ] Run the Group procedure A–G; commit `style(onboarding): Soft Pixel pass`.

---

### Task 7: Group — News, calendar, shop, music

**Files:** `components/NewsPanel.jsx`, `components/TcasCalendarTab.jsx`, `pages/NewsPostPage.jsx` (redirect only — verify nothing to change), `components/shop/`, `components/music/`, `components/welcome/NewsSection.jsx` (already clean; confirm).

**Notes:** `NewsPanel` has 19 sub-12px spots. `shop/QRPaymentCard` shows a PromptPay QR: the QR image area must stay white with a `line` border — never tinted. Music `MiniPlayer`/`PlayerSheet` keep their bottom offsets (the Hotbar sub-project changes them later). Tests: `npx vitest run src/components/shop src/components/music src/components/TcasCalendarTab.test.jsx src/components/TcasCalendarTab.integration.test.jsx src/theme`.

- [ ] Run the Group procedure A–G; commit `style(news-shop-music): Soft Pixel pass`.

---

### Task 8: Group — School tools

**Files:** `components/school/SchoolPanel.jsx`, `components/school/SubjectDetailPanel.jsx`, `components/school/TimetableTemplateSheet.jsx`, `pages/SchoolAppPage.jsx`, `pages/landing/SchoolLanding.jsx`.

**Notes:** Subject colours come from user data (`subject.color`) — keep applying them as inline `style` from the data, but make sure text drawn on a subject colour uses `ink` (not white). The two `*.test.jsx` files that contain hex literals are test fixtures: leave them. Tests: `npx vitest run src/components/school src/pages src/theme` (excluding `world/`, done in Task 13).

- [ ] Run the Group procedure A–G; commit `style(school): Soft Pixel pass`.

---

### Task 9: Group — Public sites

**Files:** `components/landing/`, `components/welcome/`, `components/FeatureLayout.jsx`, `components/hub/` (already clean — verify), `components/bag/`, `pages/WelcomePage.jsx`, `pages/AuthPage.jsx`, `pages/BagPage.jsx`, `pages/landing/`, `pages/legal/`, `pages/MusicCallback.jsx`.

**Notes:** `landing/SiteNav.jsx` exports a non-component constant (pre-existing `react-refresh` lint error) — move that constant to `components/landing/siteNavLinks.js` while here, no behaviour change. `AuthPage` keeps the Google button's brand colours (`THIRD_PARTY_HEX`). The static prerender (`scripts/prerender.mjs`) reads `src/constants/sites.js` only, so no change there. Tests: `npx vitest run src/components/landing src/components/welcome src/components/bag src/pages src/theme`.

- [ ] Run the Group procedure A–G; commit `style(public): Soft Pixel pass`.

---

### Task 10: Group — Roadmap (advanced mode)

**Files:** `components/roadmap/` (25 files), `pages/RoadmapPage.jsx`, `pages/RoadmapPublicView.jsx`, `pages/landing/RoadmapLanding.jsx`.

**Notes:** Colours and borders **only**. Do not change anything that sets `rotate`, `transform`, `Handle`, `position`, or the root `<div>` of a node (CLAUDE.md: rotate only the inner element — it breaks handle offsets). After step C run `git diff -U0 -- src/components/roadmap src/pages/Roadmap* | grep -E '^[+-].*(rotate|Handle|transform)'` — Expected: no output. Node-type colour pickers are user data (stored colours) — leave the stored values; only the picker chrome changes. Tests: `npx vitest run src/components/roadmap src/pages/RoadmapPublicView.test.jsx src/theme`.

- [ ] Run the Group procedure A–G (plus the `git diff` check above in step D); commit `style(roadmap): Soft Pixel pass`.

---

### Task 11: School Hub tileset art

**Files:**
- Modify: `scripts/art/build.mjs` (optional grid layout), `scripts/art/palette.mjs` (any new opaque colours, deliberately)
- Create: `scripts/art/families/schoolhub.mjs`, `scripts/art/families/schoolhub.test.js`
- Test: `scripts/art/build.test.js` (extend)

**Interfaces:**
- Consumes: `Canvas` (`scripts/art/px.mjs`), `lintPalette`/`SOFT_PIXEL_PALETTE` (`palette.mjs`), `buildFamily`/`writeFamily` (`build.mjs`).
- Produces: `buildFamily` accepts an optional `family.columns` (number): when set, sprite `i` is placed at column `i % columns`, row `floor(i / columns)` in a sheet of `columns*frameW × ceil(n/columns)*frameH` and the atlas gets `columns`; without it behaviour is unchanged (icons still build identically).
- Produces: `scripts/art/families/schoolhub.mjs` default export `{ name: 'school_hub_tiles', frameW: 16, frameH: 16, columns: 16, sprites }` and named export `TILE_NAMES: string[]` (order = local id; `gid = FIRSTGID + index`, `export const FIRSTGID = 1`). Tile names (all 16×16, one frame each): `grass`, `grass_tuft1..3`, `grass_patch1..4`, `grass_flower1..2`, `lawn_{tl,t,tr,l,c,r,bl,b,br}`, `path_{tl,t,tr,l,c,r,bl,b,br,c2,nw,ne,sw,se}`, `floor`, `wall_{tl,t,tr,l,r,bl,b,br}`, `wall_window`, `wall_door`, `roof_<colour>_{tl,t,tr,tl2,t2,tr2,ml,m,mr,bl2,b2,br2,bl,b,br}` for colours `sky blue red purple green` (75 tiles; `sky` is the default roof), `tree{1,2}_{tl,tr,bl,br}`, `flower1..5`, `mushroom1..4`, `bush1..2`, `rock1..4`, `stump1..2`, `log`, `sunflower_top`, `sunflower_stem`, `hedge_{l,m,r}`, `bookshelf`, `chair_front`, `chair_back`, `table`, `plant`, `fence_h`, `fence_v`.
- Art rules (spec "Soft Pixel"): white/mist architecture, pastel roofs, rounded 2–4 px corners, outlines `#5c4e92`/`#6f63a6`, grass `#9BCB8C`/`#B6DCA0` with `#7BC48C` tufts, paths `#E8D2B2`/`#DEC6A2`, no pure black, light from top-left (shadow tiles use translucent purple only).

- [ ] **Step 1: Write the failing tests:** `build.test.js` — a 3-sprite family with `columns: 2` yields a 32×32 sheet, atlas has `columns: 2` and sprite 2 at col 0, row 1; a family without `columns` is unchanged. `schoolhub.test.js` — `TILE_NAMES` has no duplicates and contains every name listed above (assert the full list); `buildFamily(family).sheet` passes `lintPalette`; the sheet is `256` px wide; no tile is fully transparent; `path_*` tiles are fully opaque (no see-through seams); the five `roof_*_t` tiles differ pairwise; `wall_door` and `wall_window` differ from `wall_t`.
- [ ] **Step 2: Run** `npx vitest run scripts/art` — Expected: FAIL.
- [ ] **Step 3: Implement** the `columns` option and the family (helper `tile(name, draw)` pushes to the ordered table; derive autotile edges from one shared drawing function per kind so the 3×3 sets line up at the seams; roofs draw the scalloped edge half transparent as the old Sprout roofs did, with colour from a small per-roof palette that is added to `palette.mjs`).
- [ ] **Step 4: Run** `npx vitest run scripts/art` and `node scripts/art/build.mjs schoolhub` — Expected: PASS and `public/assets/rc/school_hub_tiles.png` + `.json` written; open the ×4 contact sheet `docs/art-review/school_hub_tiles.png` and check every tile at 1× for stray pixels and silhouette read (record "contact sheet reviewed" in the commit body).
- [ ] **Step 5: Commit** `feat(art): School Hub Soft Pixel tileset` (include the generated PNG/JSON).

---

### Task 12: School Hub map and loader

**Files:**
- Modify: `scripts/buildSchoolHub.mjs`, `scripts/buildSchoolHub.test.js`, `src/utils/mapConfig.js` (`school_hub` entry), `src/game/assetManifest.js`, `src/game/assetManifest.test.js`, `src/game/worldScenes.js` (remove the hue-rotated roof derivation), `scripts/uploadAssets.mjs` only if it enumerates tilesets by hand (check; the manifest drives it)
- Regenerate: `public/maps/school_hub.json`

**Interfaces:**
- Consumes: `TILE_NAMES`, `FIRSTGID` (Task 11).
- Produces: in `buildSchoolHub.mjs` a `G` table `G.name → gid` built from `TILE_NAMES`; every former Sprout gid constant (`GRASS`, `WALL`, `PATH`, `TREES`, `ROOF`, `F`, …) is replaced by `G.<name>`. The map declares exactly one tileset `School Hub Tiles` (`firstgid: 1`, `image: 'school_hub_tiles.png'`, `columns: 16`, `tilecount: TILE_NAMES.length`). `ROOF_VARIANTS` stays exported as `{ blue, red, purple, green }` but now means "colour name → roof tile set", no longer a gid offset. Layer names, order, size (56×41), objects (spawn `entry`, interactions, zones, seats) and positions are unchanged.
- Produces: `DEFAULT_MAP_CONFIGS.school_hub.tilesets = { 'School Hub Tiles': 'rc/tilesets/school_hub_tiles.png' }`; manifest entry `{ key: 'School Hub Tiles', type: 'image', storagePath: 'rc/tilesets/school_hub_tiles.png', localPath: '/assets/rc/school_hub_tiles.png' }`. The Sprout tilesets stay in the manifest while `test3`/`indoor` still use them (the Study Room sub-project removes them).

- [ ] **Step 1: Write the failing tests** (edit `buildSchoolHub.test.js`): the tileset-declaration test now expects exactly `['School Hub Tiles']` for both `meta.tilesetNames` and `Object.keys(DEFAULT_MAP_CONFIGS.school_hub.tilesets)`; new test "every gid in every tile layer is within `1…TILE_NAMES.length`"; new test "no layer contains a Sprout gid above `TILE_NAMES.length`"; keep unchanged: well-formed layers, autotiled paths with `unresolvedPathCells === []`, default spawn `entry` walkable, interactions, every zone reachable from spawn, determinism (building twice gives identical JSON). `assetManifest.test.js`: manifest contains `School Hub Tiles` with the paths above.
- [ ] **Step 2: Run** `npx vitest run scripts/buildSchoolHub.test.js src/game/assetManifest.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** the gid re-pointing, the tileset declaration, the config and manifest entries; delete `ROOF_VARIANTS` hue logic and `makeRoofVariantTexture` from `worldScenes.js` (and the now unused `recolorImageData` import if nothing else uses it — keep `src/utils/recolor.js`, the character outfit feature uses it). Run `node scripts/buildSchoolHub.mjs` to regenerate `public/maps/school_hub.json`.
- [ ] **Step 4: Run** `npx vitest run scripts src/game src/utils` and `npx vitest run` — Expected: all pass. Then `npm run dev`, join the School Hub as a guest/test account (or open the map through the dev map viewer if guests cannot enter), walk to each building, and record screenshots at 375×812 and 1280×800 to `docs/art-review/partb-school-hub-*.png`; confirm trees draw above the player (canopy), roofs fade when entering, paths have no seams.
- [ ] **Step 5: Commit** `feat(school-hub): redraw map with Soft Pixel tileset`.

---

### Task 13: Group — School Hub world UI

**Files:** `components/school/world/` (all), `src/game/ambient/timeOfDay.js` consumers: `AmbientOverlay.jsx`.

**Notes:** Mechanics, RTDB paths and rules unchanged (`SchoolWorld.ui.test.jsx` is the contract). `FocusHud`/`FocusPanel` already follow the focus design from the Study Room spec only after that sub-project — here only restyle what exists. `AmbientOverlay` keeps its time-of-day tints; its one hex becomes `colors.*` or a documented `rgba` in `timeOfDay.js` (data). Tests: `npx vitest run src/components/school/world src/game src/services/schoolWorld.test.js src/theme`.

- [ ] Run the Group procedure A–G; commit `style(school-world): Soft Pixel pass`.

---

### Task 14: Group — Admin and dev kit

**Files:** `components/admin/` (17 files), `pages/AdminPage.jsx`, `pages/DevUiKit.jsx`, remaining `components/*.jsx` not claimed above (list them with `git ls-files src | grep -v test` against the allowlist).

**Notes:** Token restyle only, no layout changes; `MapPreview` (2 hex) draws map previews — if the hex are tile-grid colours, move them into `colors.js` rather than leaving literals. `DevUiKit` should showcase the canonical names only. Tests: `npx vitest run src/components/admin src/pages src/theme`.

- [ ] Run the Group procedure A–G (step F: admin is desktop-only, check 1280 only); commit `style(admin): Soft Pixel pass`.

---

### Task 15: Retire the legacy aliases and verify

**Files:**
- Modify: `src/index.css` (delete `--color-surface`, `--color-hud`, `--color-edge`, `--color-wood*`, the `.neo-*` selector aliases and any comment that mentions them), `src/theme/surfaces.test.js` (stop requiring the `neo-*` alias pairing; require that `neo-` no longer appears), `src/theme/legacyAllowlist.js` (must now be `[]`; delete the allowlist and make `legacyPurge.test.js` scan everything)
- Test: `src/theme/legacyPurge.test.js`, `src/theme/tokens.test.js`

**Interfaces:** after this task no file anywhere contains `neo-`, `bg|text|border-(surface|hud|edge|wood…)`, a non-allowed hex, or `text-[<12px]`.

- [ ] **Step 1: Check the farm leftovers.** If `ShopUI.jsx`, `StorageUI.jsx`, `SeedPicker.jsx`, `FarmActionButton.jsx`, `MapPalette.jsx` still exist (Study Room not merged), run `node scripts/migrateTokens.mjs <them> --write` and hand-fix the flagged hex with `colors`; if they were deleted, skip.
- [ ] **Step 2: Write the failing test change:** `legacyPurge.test.js` scans all of `src` plus `index.html` and `public/**/*.html` (no allowlist), `surfaces.test.js` asserts `index.css` has no `neo-` and no `--color-(surface|hud|edge|wood)` custom property. Run `npx vitest run src/theme` — Expected: FAIL while aliases exist.
- [ ] **Step 3: Delete the aliases** from `src/index.css` and the allowlist file; grep `src`, `index.html`, `public` for stragglers (`grep -rnE "neo-|(bg|text|border|ring)-(surface|hud|edge|wood)" src index.html public`) — Expected: no output.
- [ ] **Step 4: Run** `npx vitest run`, `npm run build`, `npx eslint` on every file changed on the branch (`git diff --name-only <base>..HEAD | grep -E '\.(jsx?|mjs)$'`) — Expected: tests and build pass; no new lint errors (pre-existing ones in `SkillPanel`, `SocialPanel` are fixed by Tasks 3–4 if they are in files this branch touched; record any that remain).
- [ ] **Step 5: Final visual pass:** `npm run dev`, walk the guest app (home, task panel, social, profile, settings, onboarding, news, music, school tools, roadmap, welcome, auth) at 375 and 1280; attach the PNG set to the PR.
- [ ] **Step 6: Commit** `style(theme): retire legacy colour aliases and neo-* classes`.

---

## Spec coverage

| Spec item (Part B) | Task |
|---|---|
| Shell, Tasks, Friends & chat, Profile, Onboarding, News & calendar, Coins shop, Music, School tools, Public sites, Roadmap, Admin groups | 2–10, 14 |
| School Hub map redraw (new art, same mechanics) | 11, 12 |
| School Hub world UI restyle | 13 |
| Rename legacy token names screen by screen (Part A "then renamed in Part B") | 1, 2–14, 15 |
| 10 px label sweep (ledger deferral) | 1 (codemod), every group (step F) |
| Hard-coded legacy hex left for Part B (ledger deferral) | 1 (`HEX_MAP`/flags), every group (step D) |
| Before/after screenshots at 375 and 1280 | group procedure F, Task 15 |
| BottomNavBar replaced by Hotbar | explicitly out of scope (Hotbar sub-project) |
