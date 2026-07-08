# Master Roadmap — remaining epics after TCAS Calendar

Scope decisions locked here; each section expands into a full TDD implementation plan (same format as Epics A–D) when its turn comes — say "continue" in a Claude Code session. Order below is the recommended build order.

**Shipped so far:** A TCAS70 data resilience ✅ · B School System ✅ · C Notebook ✅ · D TCAS Calendar (plan ready: `2026-07-08-tcas-calendar.md`)

---

## 1) Timetable Templates (user item 5) — โหลดตารางเรียนสำเร็จรูปของแต่ละโรงเรียน/ชั้น

**Problem:** typing a whole timetable subject-by-subject is the School System's biggest onboarding friction. Students at the same school + class level share ~the same timetable.

**Decisions:**
- New Firestore collection `timetableTemplates`: `{ name, schoolName, classLevel ('ม.4'|'ม.5'|'ม.6'|...), subjects: [{ name, color, slots: [{ day, startTime, endTime }] }], createdBy, createdAt, downloads }`.
- **Community-sourced, not admin-only:** any signed-in user can *publish* their current timetable as a template ("แชร์ตารางเรียนของฉัน") and anyone can browse/import — this is how coverage across thousands of Thai schools actually happens. Rules: read signed-in; create signed-in with `createdBy == auth.uid`; delete own or super-admin.
- Import path reuses the store: template → loop `addSubject` + `addScheduleSlot` into `useSchoolStore` (merge, never wipe). Export path: serialize current subjects+slots (a versioned schema module `timetableTemplate.js`, mirroring `notebookExport.js`).
- Browse UI: a "โหลดตารางเรียน" button in SchoolPanel's empty state + subject rail; search by school name (Firestore prefix query, same pattern as `queries.searchUsersBySchool`), filter by class level.
- Seed: admin publishes a few common templates so the feature isn't empty on day one.

**Task outline:** schema module + tests → rules + rules tests → `useTimetableTemplatesStore` (browse/publish/delete, mirrors `useTcasEventsStore`) → TemplatePickerSheet UI + import flow + tests → publish flow + tests → wiring + verify.

---

## 2) Epic E — Motivation streaks ("N Day" screen)

**Decisions:**
- Extends the existing Streak/`totalStacks`/`feelingNotes` mechanics in `useUserStore` — no new store. The daily check-in modal (`DailyLoginModal`) already exists; the "N Day Motivation Telling" screen (wireframe) becomes the milestone celebration shown when the streak crosses each step of a 5-day cycle.
- Pure helper `streakCycle.js`: `cyclePosition(streak)` → `{ day: 1-5, cycle }`; milestone message selection is templated Thai copy first (AI-generated via existing Gemini services is a later enhancement, feature-flagged off).
- "Save" on the milestone screen writes a reflection into the **Notebook** (`upsertNote({ date: today, subjectId: null, text })` — appending to any existing note, not overwriting: read `noteFor` first, concatenate).
- Streak increment source of truth: completing anything rewarding (task toggle, homework toggle, daily check-in) already increments `totalStacks`; the *streak* counter needs a daily-consecutive rule — `updateStreakOnActivity(lastActiveDate, todayStr, streak)` pure helper: same day → unchanged; yesterday → +1; gap → reset to 1. Persisted on the user doc alongside `coins` sync (portfolio writer already touches the user doc — ride `portfolioSync`'s `toDoc` or a small dedicated field write; decide at plan time by reading how `streak` currently syncs).
- Gentle-restart copy for a broken streak (story 31): "เริ่มใหม่วันนี้ก็ยังทัน 🔥" — never guilt.

**Task outline:** pure `streakCycle.js` helpers + tests → streak update wiring in `useUserStore` + tests → `MotivationPopup` component (uses `usePopupStore`, matches wireframe: big streak circle, 5-dot cycle, message, Save-to-Notebook) + tests → trigger wiring in HomePage after check-in/task completion → verify.

---

## 3) Music + Spotify unified, full-function (user item 6)

**Current state:** two disconnected systems — (1) the legacy background-music pill on HomePage (admin-curated audio file with track chapters via `musicConfig`), and (2) Spotify Connect (MiniPlayer + PlayerSheet, ADR-0010: refresh token in `users/{uid}/private/spotify`, remote-controls the user's own Spotify device, Premium required).

**Decisions:**
- **One Music surface, two tabs**: opening Music from the top pill shows a single panel with tabs **"Background"** (legacy chapter list, unchanged behavior) and **"Spotify"** (the full PlayerSheet feature set promoted into the tab: now-playing, transport, seek, volume/device picker, **search** tracks/albums/artists/playlists, user playlists, play-in-context). MiniPlayer stays as-is at the bottom.
- Full-function Spotify additions beyond today's PlayerSheet: search with debounced query (Spotify `/v1/search`), browse own playlists + playlist tracks, queue a track (`/v1/me/player/queue`), shuffle/repeat toggles. All via the existing `spotifyApi.js` service seam — new functions there, tested like `spotifyApi.test.js` prior art.
- Not-connected / not-Premium / no-active-device states all get explicit Thai copy + deep-link to open Spotify (existing `NO_ACTIVE_DEVICE` handling pattern).
- **Requires reading before planning:** `src/components/music/` (MiniPlayer, PlayerSheet), `src/services/spotifyApi.js`, `useMusicStore`, ADR-0010. The full plan must map exactly which pieces move vs. wrap.

**Task outline:** spotifyApi additions (search/playlists/queue/shuffle) + tests → `MusicPanel` shell with Background/Spotify tabs (Background = extracted current trackList popup content) → Spotify tab composition from PlayerSheet parts + search UI + tests → HomePage pill + `APP_VIEWS.MUSIC` rewiring → verify on a real Premium account (HITL — agent cannot).

---

## 4) Epic F — Roadmap showcase (Text / Line / Sticker + stage timeline)

**Decisions:**
- Text tool → `StageLabelNode` already exists; expose it in the add-palette as "Text" with free placement.
- Sticker tool → `ImageNode` with a curated sticker catalog (university logos via `tcasLogoUrl(id)` + a small set of motivational stickers from Storage `rc/stickers/`); picker sheet reuses the ImagePickerModal pattern.
- Line tool → free annotation edges: allow edge creation without snapping (a new edge type `annotation` rendered dashed; must respect the ConditionNode rotation invariant and the export schema — **new node/edge types get schema entries and round-trip tests in `roadmapExport.test.js`**, per ADR-0001).
- School → University stage timeline: `TimelineRuler` already zoom-syncs; add configurable stage bands (labels + month ticks) stored per sheet (`sheet.timeline: { stages: [{ label, startMonth, endMonth }] }` — additive to the sheet doc, additive to export schema v1 → **bump to v2 with v1-import fallback**).
- WelcomePage showcase section (story 35) is separate and small: a marketing block with screenshots — plan it as the last task, content-only.

**Task outline:** export schema v2 (+ fallback) + tests → sticker catalog + picker + tests → annotation edge type + tests → timeline stage bands + tests → palette/toolbar wiring per wireframe (Text/Line/Sticker/+) → WelcomePage showcase → verify.

---

## 5) Epic G — Premium packaging (monetization)

**Decisions (per PRD):**
- Entitlements are **server-authoritative**: a Firebase Cloud Function `purchaseEntitlement({ itemId })` atomically checks the catalog price, decrements `coins` (Functions already own `coins` writes — rules block client writes), and sets `users/{uid}.entitlements.{itemId} = { purchasedAt, ... }` in one transaction. Client never touches coins for purchases.
- Catalog: Firestore `entitlementCatalog` collection `{ id, name, description, priceCoins, kind: 'sticker-pack'|'ai-quota'|'plan-slots', payload, active }` — admin-editable without deploy (Farm Data Catalog pattern, ADR-0005).
- First sellable items (needs F + existing features): premium Roadmap sticker packs, +N AI journey generations (quota field checked by `aiJourney`), extra university Plan slots (usePlansStore cap check).
- Client: entitlements hydrated in `sessionBootstrap` from the user doc; a `useEntitlementsStore` exposes `has(itemId)` / quota counters; shop UI gains an "Unlock" section beside coin top-ups.
- **Requires reading before planning:** `functions/` (existing coin-credit function structure), `useShopStore`, `shopCredit.js`, PromptPay flow.

**Task outline:** catalog collection + rules → Cloud Function transaction + emulator tests (`functions/` has its own test setup — verify) → sessionBootstrap hydration + `useEntitlementsStore` + tests → gate checks in aiJourney/usePlansStore/sticker picker + tests → shop UI Unlock section + tests → end-to-end manual purchase on emulator → verify.

---

## Build order & rationale

| # | Epic | Why this position |
|---|------|-------------------|
| 1 | **D — TCAS Calendar** (plan ready) | TCAS70 registration opens ~15 Jul — ship this week |
| 2 | **Timetable Templates** | kills School System onboarding friction while school features are hot; small |
| 3 | **E — Motivation** | small, closes the daily loop (check-in → streak → notebook) |
| 4 | **Music + Spotify** | big UX win, independent of monetization chain |
| 5 | **F — Roadmap showcase** | produces the sticker/theme assets G sells |
| 6 | **G — Premium packaging** | last: needs F's stickers + everything polished enough to charge for |
