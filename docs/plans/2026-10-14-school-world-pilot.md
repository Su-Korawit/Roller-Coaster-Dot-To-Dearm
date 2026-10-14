# School World — pilot runbook (Task 9)

Companion to [ADR 0018](../adr/0018-school-community-world.md) and the
[MVP plan](2026-10-14-school-world-mvp.md). Everything in code is done and tested;
this is what the **owner** must do to put it in front of 1–3 schools, in order.

## 0. What is and is not verified

Verified by automated tests (1,110 unit/component tests, 125 emulator tests): the
Focus time/XP math, the weekly rollup, room selection, membership-gated RTDB rules,
teacher claims and board rules, perks and levels, the generated map (every zone
reachable on foot from spawn), and all UI components in jsdom.

**Not verified — nobody has watched these run:**

| Gap | Why | How to close it |
|---|---|---|
| The game inside a signed-in session (enter hub, walk, sit at a seat, bubbles over avatars, 📷 capture) | no test account in the build environment | smoke test below, on staging |
| Firestore composite index for `schoolWeeks` | the emulator does not enforce indexes | deploy, open the leaderboard once |
| Real RTDB bandwidth per idle user | arithmetic only (see `afk-cost-notes.md`) | two clients on staging, read the console |
| Map look in Phaser (tile art/labels) | previewed as a Python render of the tile layers only | open `school_hub` on staging |

## 1. Gate — do not invite students before this

PDPA, because the users are minors:

- [x] Privacy Policy + Terms pages (`/privacy`, `/terms` on every site, linked from sign-in, settings and the footer). **Drafted from the code, not reviewed by a lawyer** — have it reviewed (minors/guardian wording, retention periods, cross-border transfer). Confirm `CONTROLLER_NAME` and `CONTACT_EMAIL` in `src/constants/legal.js`.
- [x] Consent at sign-up (terms + "20+ or guardian agreed" boxes) recorded on `users/{uid}.consent`; existing users are blocked by `ConsentGate` until they accept the current `CONSENT_VERSION`. Still open: a guardian path the school accepts (today it is a self-declared tick-box).
- [x] Delete my account (Settings > General > ลบบัญชี): re-authentication, typed confirmation, `deleteMyAccount` Function erasing Firestore, Storage (incl. payment slips), RTDB and Auth; ledger rows kept de-identified. Verified end to end on the Auth+Firestore+RTDB+Storage emulators (see `test/rules/accountDeletion.test.js`). Deploy with `firebase deploy --only functions:deleteMyAccount,firestore:rules,firestore:indexes`.
- [ ] **BLOCKER found while writing the policy:** `firestore.rules` lets any signed-in user read any `users/{uid}` document, and that document contains the sign-up **email** (plus school, MBTI…). Anyone can create an account, so anyone can harvest students' emails. Fix before the pilot: move `email` (and ideally school coordinates) to `users/{uid}/private/*` or a Functions-owned mirror, then delete the email mention in `src/data/legalContent.js` (marked OWNER).
- [ ] Firebase on **Blaze** with a budget alert; Spark caps RTDB at 100 simultaneous connections.
- [ ] Secrets off the client: `VITE_GEMINI_API_KEY` and the SlipOK/PromptPay values are still shipped to browsers (see the first strategy note). Not required for the School World itself, but do not open to the public with them as is.
- [ ] Decide moderation owner: someone must read reports. There is **no report/block UI yet** — rooms are emote-only by design (no free text), so the exposure is names/avatars and teacher announcements.

## 2. Deploy order

Queued in `.iloveskill/pending-deploys.json` (run `/unlock-bkb` or paste):

1. `firebase deploy --only functions:syncUserSchool,functions:startFocus,functions:checkInFocus,functions:endFocus,functions:rollupSchoolWeek,functions:grantTeacherBadge`
2. Backfill existing users, **after** step 1:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json FIREBASE_DATABASE_URL=<rtdb url> node scripts/backfillSchools.mjs --dry-run
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json FIREBASE_DATABASE_URL=<rtdb url> node scripts/backfillSchools.mjs
   ```
3. `firebase deploy --only firestore:rules,firestore:indexes` then `firebase deploy --only database`
4. Ship the web build (the map loads from `/maps/school_hub.json`; optionally upload to Storage `maps/school_hub.json` with `scripts/uploadAssets.mjs` so the artist can replace it).
5. Wait for the index to finish building (Firebase console → Firestore → Indexes) before testing the leaderboard.

## 3. Smoke test on staging (30 minutes, two accounts in different browsers)

Both accounts need a `schoolId` (pick the same school) — and the school needs 30 members for a school room, otherwise they meet in **ห้องรวม** (commons), which is also a valid test.

1. Home → **เข้าโรงเรียน**: hub loads, avatar appears at the south avenue, no console errors.
2. Account B enters: both see each other; moving is smooth; labels show names.
3. Walk into the library, stand beside a chair: **โต๊ะอ่านหนังสือ** opens. Start → wait ~11 s → "ฉันยังอยู่" → the sheet shows verified time and XP.
4. Leave the tab idle 60 s: avatar flags idle (writes stop), FPS drops (check the Network/RTDB tab: no writes per second).
5. 😀 send an emote from A: bubble over A on both screens, gone after ~4 s.
6. 🌧 ambience on: tint + rain, no jank; reduced-motion OS setting → no rain animation.
7. 📷 share: PNG downloads/shares, **no player names visible**, only the watermark.
8. Plaza board → **อันดับโรงเรียน** shows "ยังไม่มีข้อมูลสัปดาห์นี้" until the first hourly rollup, then the school row (unranked until 10 distinct students).
9. Canteen door → news board shows TCAS events; contest door → camps list; guidance door → `/roadmap`; hall door → Profile tab.
10. Exit portal (south end) returns to the normal world with the avatar in the right map; presence shows only in that map.
11. Grant a teacher badge in Admin → Users (🎓), teacher re-logs in: composer appears on the canteen board, 🎓 shows on the avatar; a non-teacher sees no composer; a student of another school cannot read the announcements.
12. Profile shows level, bar and the temperament perk.
13. Sound (turn the volume up, click once first): clicks blip, sheets open/close with a blip, a check-in gives `+N XP` (and `LEVEL UP!` on a boundary), an unconfirmed check-in chimes and puts a bell in the tab title, 🌧 plays rain; Settings > General > Sound Effects mutes everything. Tune levels in `src/lib/sfx.js` (the `/dev/ui` Sound Board plays each effect).

Anything that fails here is a real bug; send the console output.

## 4. Pick the schools and recruit (owner)

- Choose **1–3** schools where you already have a person with reach (a teacher, a student council member, a tutor). Density beats breadth: a school room needs **30** registered members to open; below that its students share the commons room.
- Per school: 2–3 **student ambassadors** and 1 **guidance teacher**.
  - Ambassador goal: bring the school to 30 registered members (this is also what unlocks the school room).
  - Teacher: verified by you out of band (school email / ID / a call to the school), *then* granted the 🎓 badge. Never grant from a screenshot or a DM claim.
- Seed life while a school is under 30: the commons room mixes schools; ask ambassadors to keep a seat taken during the first week so the room is never empty.

## 5. What to tell students (ready to paste)

> เปิดเว็บทิ้งไว้ได้ทั้งวัน นั่งอ่านหนังสือที่ห้องสมุดในเกมกับเพื่อนโรงเรียนเดียวกัน กดยืนยันว่ายังอยู่ทุก 25 นาที เวลาที่ยืนยันแล้วจะนับเป็นคะแนนโรงเรียนในตารางอันดับประจำสัปดาห์ แค่เปิดหน้าเว็บทิ้งไว้ไม่นับเวลา · วันละไม่เกิน 8 ชั่วโมง

## 6. Weekly routine during the pilot

- Monday: screenshot the leaderboard (school-level, no personal data) for the ambassadors' stories — the viral loop.
- Read the budget/alerts dashboard; compare RTDB download per concurrent user against the **< 1 KB/s idle** target.
- Check `schools/{id}.memberCount` against reality; re-run `backfillSchools.mjs` if the `syncUserSchool` function was ever down.
- Review the school names appearing on the public leaderboard (they come from the first joiner's self-declared `schoolName`).

## 7. Metrics

| Metric | Source | Target (first 4 weeks) |
|---|---|---|
| D7 retention of pilot users | auth/Firestore | tracked, no target yet |
| Verified Focus hours / user / week | `focusDaily` | tracked |
| % of a school's members who joined via ambassador/teacher | manual | majority |
| Idle download per connected user | RTDB console | < 1 KB/s |
| 📷 taps per active user | add an analytics event | virality proxy (not instrumented yet) |

## 8. Known gaps carried out of the MVP

- `schoolId` is self-declared, so school membership is claimable; the 10-contributor minimum and teacher verification are the only guards.
- Public leaderboard shows self-declared school names (no moderation hook).
- No App Check on the callables.
- No report/block; rooms are emote-only.
- No account-deletion callable (gate item above).
- Rollup cost is one read per user-day per hour; switch to incremental aggregation if usage grows.
- Idle remote avatars still animate; 16 per-MBTI abilities, library file sharing, university map, profile decoration and Roadmap timeline mode are deliberately out of the MVP.
