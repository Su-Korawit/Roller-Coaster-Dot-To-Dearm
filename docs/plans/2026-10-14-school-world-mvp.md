# School World MVP — Implementation Plan

> Companion to [ADR 0018](../adr/0018-school-community-world.md). Executors follow ADR 0017
> (`claude` = scripts/Functions/rules/tests/map JSON; `cursor` = React UI/Tailwind/wiring).

**Goal:** a visibly different product: open it, sit in a cozy pixel school library with
classmates, run a verified Focus session, and see your school rank against others.
Leave it open all day (AFK) without burning battery or money.

**Out of scope (deferred, do not build):** Library shelf / exam & sheet sharing, University map,
MBTI perks beyond the 4-temperament passive stub, profile hanging/decor, Roadmap timeline mode,
school-affairs system, free-text chat, seasonal decor shop, per-school custom maps.

## Definition of Done (MVP)

1. `school_hub` map loads; Library, Canteen, Guidance room, Contest board are walkable doors.
2. A user with `schoolId` joins their school room (or regional room under threshold), sees others.
3. Sit at a Library seat -> start Focus; check-ins every 25 min; XP awarded server-side; 8h/day cap.
4. Weekly leaderboard (avg verified hours per member, min 10 contributors) visible in-game.
5. AFK mode: measured RTDB/FPS cost per idle user documented; room cap 50 enforced.
6. Teacher badge can post to the Canteen board. Preset-emote-only interaction.
7. Pilot checklist met for 1–3 schools (PDPA gate, ambassadors).

## Gate (before pilot, not before dev)

PDPA minimum: Privacy Policy + ToS pages, consent at register, account/data deletion callable.
Tracked as its own Idea; the MVP must not ship publicly without it.

## Tasks

### Task 1 — Cost spike: AFK mode  `[claude]`
Files: `src/lib/presence.js`, `src/game/worldScenes.js`, `src/components/GameCanvas.jsx`, tests.
- [x] Add idle state: change-only writes + one `idle: true` write after 60s unchanged (no heartbeat needed).
- [x] Phaser: reduce target FPS (e.g. 10) on `visibilitychange` hidden or idle; restore on input.
- [ ] Remote players with `idle: true` render as static sitting sprite, no tween. (deferred: see afk-cost-notes item 5)
- [x] Write `docs/plans/afk-cost-notes.md` (write counts measured in test; bandwidth estimated). **Open: real-RTDB measurement before pilot.**
- [x] Tests extend `presence.test.js` (idle throttle).

### Task 2 — Rooms, threshold, sharding  `[claude]`
Files: `src/lib/presence.js`, new `src/lib/schoolRoom.js`(+test), `database.rules.json`, `test/rules/`.
- [x] `resolveRoomBase` / `chooseRoom` in `src/lib/schoolRoom.js` -> `{ ownerUid: 'school:{id}:{shard}' | 'commons:{shard}', mapKey:'school_hub' }`; constant `SCHOOL_ROOM_MIN_MEMBERS = 30`, `ROOM_CAP = 50`.
- [x] Shard selection by reading player count under the room before joining; join next shard if full.
- [x] RTDB rules: authed users write only own `players/{uid}`; validate shape and size; reads limited to authed.
- [x] Member count source: Functions-maintained `schools/{schoolId}.memberCount` (via `db.js` refs).
- [x] Rules tests for the new paths (`npm run test:rules:emu`).
- [x] `scripts/backfillSchools.mjs` seeds counts + `userSchool` for existing users (run after deploying `syncUserSchool`).
- [ ] Wire `chooseRoom` into GameCanvas join (blocked on Task 5 `school_hub` map; no school_hub exists yet).
- Deviation: regional rooms -> single `commons` room; cap is soft. Deploys queued in `.iloveskill/pending-deploys.json`.

### Task 3 — Focus sessions, server-authoritative  `[claude]`
Files: `functions/index.js`, `src/lib/db.js`, `firestore.rules`, `firestore.indexes.json`, `src/services/focus.js`(+test).
- [x] Callables `startFocus`, `checkInFocus`, `endFocus`. Data: `focusActive/{uid}` (the running session), `focusDaily/{uid}_{day}` (verified ms per Bangkok day; the Task 4 leaderboard source), `focusSessions/{id}` (history). Deviation from the first draft: one active doc per user instead of a session doc with a status field.
- [x] Verify: a check-in counts only if `now - lastCheckInAt <= 35min`; verified time accrues only between valid check-ins; per-day cap 8h; one active session per uid.
- [x] Award `users/{uid}.focusXp` (Functions-owned, like Coins; never from client).
- [x] Reuse Capsule timer semantics where it fits; check `SkillPanel`/`useSkillStore` before duplicating.
- [x] Unit tests for the verification math (pure function, no Firebase).
- [x] Rules: clients read own sessions only; no client writes.
- [x] Real handlers are exercised against the Firestore emulator (`test/rules/focus.functions.test.js`, fake clock), not just the pure math.
- Known gap: `users/{uid}.schoolId` is self-declared (client-writable), so a student can claim any school; leaderboard integrity relies on the 10-contributor minimum until school verification exists (Task 7 teacher badge is the path).
- Known gap: no App Check on the callables yet.

### Task 4 — Weekly rollup & leaderboard  `[claude]`
Files: `functions/index.js`, `src/lib/db.js`, rules, tests.
- [x] Scheduled `rollupSchoolWeek` (hourly, full recompute so it self-heals): aggregate verified ms per school for current ISO week (Asia/Bangkok) into `schoolWeeks/{schoolId}_{isoWeek}` = `{ schoolId, schoolName, contributors, totalMs, avgHoursPerMember }`.
- [x] Only schools with `contributors >= 10` are ranked. Query: top 20 by `avgHoursPerMember` (verified hours / REGISTERED members, floor = contributors; see leaderboardMath.js).
- [x] Public read of `schoolWeeks`, no client write. Pure rollup function with tests.
- [x] `leaderboardMeta/current` ({week, endsAtMs}) powers the UI countdown; client reader is `src/services/leaderboard.js` (`fetchLeaderboard`, `contributorsNeeded`).
- [x] Real rollup + the exact client query run against the Firestore emulator (`test/rules/leaderboard.functions.test.js`). The emulator does NOT enforce composite indexes, so the `schoolWeeks` index in `firestore.indexes.json` is unverified until deployed.
- Known gap: rollup cost is one read per user-day this week per run; revisit (incremental aggregation) past the pilot. School names come from the first joiner's self-declared `schoolName` (truncated to 80 chars), so a moderation hook is needed before a public leaderboard.
- Rules suite now runs files serially (shared emulator DB).

### Task 5 — `school_hub` map skeleton  `[claude]`  (art polish: artist/Cursor)
Files: `scripts/buildSchoolHub.mjs` (new), `public/maps/school_hub.json`, `src/utils/mapConfig.js`, `src/utils/tiledMapMeta.js`(+test).
- [x] Script generates Tiled JSON from a layout spec: courtyard, 4 buildings, paths; layers `Ground`, `Objects`, `Collision` + object layers `Spawns`, `Portals`, `Interactions`. Uses existing Sprout Lands tilesets only.
- [x] Extend `Interactions` actions: `focusSeat` (props: `seatId`), `board` (`boardId: 'news'|'contest'`), `tool` (`route`). Update `parseMapMeta` + tests; keep `shop`/`chest` working.
- [x] Add `DEFAULT_MAP_CONFIGS.school_hub` (tilesets, collision, `multiplayer: true`).
- [ ] Upload to Storage (`maps/school_hub.json`) — needs credentials, not done. Until then the game loads `/maps/school_hub.json` from `public/` (local fallback, same as test3). Artist then decorates in Tiled and re-uploads through Admin (`rc/`); re-running the generator overwrites the file, so use it only for layout changes.
- [x] Validate with an existing layer-check test pattern (`assetManifest.test.js` style).
- Built: 56x41 map; 5 buildings (library is walkable with 8 Focus seats; canteen/contest/guidance/hall are door buildings), plaza notice board, path network autotiled from rules derived from test3, border trees, flowers on a non-colliding `Decor` layer, Thai labels, exit portal to `test3`.
- Verified by `scripts/buildSchoolHub.test.js`: every layer is W*H with valid gids, tilesets match `DEFAULT_MAP_CONFIGS`, no unresolved path autotile cells, and BFS from spawn reaches every interaction zone, the portal, and a free tile beside every seat (collision computed exactly as the game configures it). Visual check was a Python render of the JSON (tile layers only); **not yet seen running inside Phaser** (needs a signed-in session).
- Gameplay events added in `worldScenes.js`: `focusSeatEntered/Exited {seatId}`, `boardEntered/Exited {boardId}`, `toolEntered {route}` — Task 6 consumes them.
- Deviation: labels use a dark fill (the scene strokes labels white, so white-on-white would be invisible).

### Task 6 — In-game UI  `[cursor]`
Files: `src/components/school/world/` (`SchoolWorldLayer`, `FocusPanel`, `FocusHud`, `LeaderboardPanel`, `BoardPanel`, `EmoteWheel`, `AmbientOverlay`), `src/stores/useSchoolWorldStore.js`, `src/services/schoolWorld.js`, `GameCanvas.jsx` wiring, `src/index.css` tokens.
- [x] Interaction events -> panels: `focusSeat` opens Focus start; `board` opens Canteen/Contest board; `tool` navigates.
- [x] Focus HUD: timer, check-in prompt every 25 min (one tap), XP gained, daily cap state.
- [x] Leaderboard panel (top 20 schools + "your school" row, hours/member, week countdown).
- [x] Preset emote wheel (6–8 emotes) replacing free text in school rooms.
- [x] AFK toggle + "ambient" mode: night library, rain, lo-fi from existing Music panel.
- [x] Opt-in "Share my room" PNG: avatar + scene, no name/school by default.
- [x] Tailwind tokens only; mobile-first; reuse BottomSheet.
- Built by claude instead of cursor at the owner's request to finish the MVP end to end.
- Flow: "เข้าโรงเรียน" button -> `enterSchoolHub` (reads schoolId + school memberCount, `chooseRoom`, flips presence owner + map key atomically, asks GameCanvas to load school_hub through a store request) -> zone events from Phaser -> store -> panels. Leaving (button, exit portal, or unmounting Home) returns the player to their own world in one state update.
- Emotes: presence carries only a preset id (`emote`, validated `^[a-z]{1,12}$` in database.rules.json); the glyph is resolved locally; bubbles render over remote avatars and the local player.
- Share image: opt-in 📷 button; other players' name labels are hidden during capture and restored in a `finally`; watermark is the brand only.
- Ambience: CSS night tint + rain whose loop is seamless (translation along the stripe direction); static under prefers-reduced-motion.
- Verified: 17 component tests (jsdom), service/store tests, rules tests for emotes, `vite build` succeeds. **Not verified: the running game inside a signed-in session** (no test account in this environment) — entering the hub, the Phaser bubbles and the share capture are untested end to end. Smoke-test those before the pilot.
- Not done: seat-zone auto-close on leaving the zone (panels are dismissed manually); idle remote avatars still animate.

### Task 7 — Teacher badge & board  `[claude + cursor]`
- [x] `[claude]` Callable `grantTeacherBadge(uid, schoolId)` admin-only, sets custom claim; `schoolBoards/{schoolId}/posts` rules: read authed, write `teacher` claim for that school or admin.
- [x] `[cursor]` Teacher post composer in BoardPanel, badge on avatar label; Admin Dashboard section to grant.
- Built: `grantTeacherBadge` callable (super-admin only; sets `teacher` + `teacherSchoolId` custom claims, mirrors `users/{uid}.teacherSchoolId`, revoke supported); `schoolBoards/{schoolId}/posts` rules (members read; only a verified teacher of THAT school creates; author/super-admin delete; no edits; field/size/timestamp validated); presence `badge:'teacher'` accepted only with a real claim; 🎓 prefix on the avatar label; announcements section on the canteen board with a teacher-only composer; "ให้ badge" button in the admin Users table.
- Verified on the emulators (Auth + Firestore + RTDB): the real `grantTeacherBadge` handler, and claim-based rules including cross-school teachers, forged authors/timestamps, oversize text, and self-granted `teacherSchoolId`.
- Owner step: a student must be verified out of band before the admin presses "ให้ badge". The granted teacher needs a fresh ID token (re-login or wait up to an hour) before the composer appears.
- `firebase.json` now declares the Auth emulator (port 9099) and `test:rules:emu` starts it.

### Task 8 — MBTI temperament stub  `[claude + cursor]`
- [ ] `[claude]` `src/constants/temperaments.js`: NT/NF/SJ/SP -> one passive each (e.g. +10% Focus XP in matching Library seat theme). Server applies multiplier in `endFocus`.
- [ ] `[cursor]` Show perk on profile; level from `focusXp` thresholds.

### Task 9 — Pilot  `[owner]`
- [ ] PDPA gate done. Pick 1–3 schools. 2–3 ambassadors each. Seed with NPC readers if under threshold.
- [ ] Teacher outreach (guidance teacher verification path). Weekly leaderboard screenshot post.

## Order & dependencies

1 (spike, go/no-go) -> 2 -> 3 -> 4 in parallel with 5 -> 6 -> 7 -> 8 -> 9.
Tasks 3–5 are independent once Task 1 passes; Cursor can start Task 6 UI against stubbed stores after Task 5 defines interaction event shapes.

## Deploy notes
Rules, indexes, and Functions are not deployed from implementer sessions; queue each via
`.iloveskill/pending-deploys.json` (`enqueuePending`) per repo convention.

## Success metrics (first 4 weeks of pilot)
- D7 retention of pilot users; median verified Focus hours/user/week.
- % of pilot-school members who joined via ambassador/teacher.
- Cost per concurrent idle user (from Task 1) stays under budget.
- Share-image taps per active user (virality proxy).
