# Onboarding First-Visit Popup — Implementation Plan

Source ADR: `docs/adr/0008-onboarding-first-visit-popup.md` (status: proposed)

## Global Constraints

- **Popup scope** — onboarding only (MBTI → Career → Mastery → University → Program, single value per field). Move from five full pages into one modal over `/home` when `program` is unset. Delete `/why`, all `/select/*`, `RootRedirect`, and `/start`.
- **Data model additive** — keep writing singular `profile.program` / `profile.masteryTrack` exactly as today. Also seed `profile.programs[]` / `profile.masteryTracks[]` from the same onboarding commit. Do **not** remove singular fields. Do **not** touch matchScore, social, admin, or aiJourney consumers.
- **Career** — move existing CareerPage logic into the modal as-is; no redesign.
- **Re-entry** — ProfilePanel ("Edit your path") and SettingsSheet (reset onboarding) currently navigate to `/select/mbti`; both must open the modal in-place instead. Do **not** reset `useSelectStore` fields on open — wizard shows current selections when re-entered.
- **WhyPage** — content becomes step 0 (intro) of the modal, not deleted without a home.
- **No TypeScript** — `.js` / `.jsx` only.
- **Firestore paths** — only via `src/lib/db.js` refs/shapes.
- **Store mutations auto-sync** — no manual `saveToFirestore()` / localStorage / useEffect save timers.

---

## Task 1: Additive profile data model

**Files:**
- Modify: `src/lib/db.js` (`shapes.profileFields`, `shapes.readProfile`)
- Create or modify: unit tests covering the new array fields (prefer colocated or existing db/shape tests if any)

**Steps:**

1. In `shapes.profileFields`, keep the existing singular mapping unchanged. Additively:
   ```js
   if (program)  profile.programs = [{ programId: program, addedAt: Date.now() }]
   if (mastery)  profile.masteryTracks = [{ masteryId: mastery, milestones: [], progressPct: 0, addedAt: Date.now() }]
   ```
   Sub-field names may be adjusted slightly, but the contract is: array of objects, one seeded per onboarding commit, additive to — not replacing — the singular field.

2. In `shapes.readProfile`, add:
   ```js
   programs: p.programs ?? (p.program ? [{ programId: p.program }] : []),
   masteryTracks: p.masteryTracks ?? (p.masteryTrack ?? userDoc.mastery
     ? [{ masteryId: p.masteryTrack ?? userDoc.mastery }]
     : []),
   ```
   so pre-migration docs don't read back empty arrays.

3. Do **not** touch `socialService.js`, `SocialPanel.jsx`, `ChatPanel.jsx`, `UserProfileSheet.jsx`, `PublicProfileSheet.jsx`, admin sections, or `aiJourney.js`.

4. Write/update unit tests for write + read shapes (singular still present; arrays seeded; legacy docs backfill).

5. Run `npm test` (focused + full suite before commit) and `npm run test:rules` — profile write rules validate `profile` as a map, so new array sub-fields likely need no rule changes, but confirm.

**Commit:** `feat(profile): seed programs[] and masteryTracks[] additively on onboarding commit`

---

## Task 2: Onboarding step components + modal shell

**Files:**
- Create: `src/components/onboarding/OnboardingModal.jsx`
- Create: `src/components/onboarding/OnboardingIntro.jsx`
- Create or modify: step components for MBTI / Career / Mastery / University / Program (live in `src/components/onboarding/` or convert pages in place — implementer's call; prefer `src/components/onboarding/` so pages can be deleted later)
- Modify: `StepScreen.jsx` if `h-dvh` double-viewport issues appear inside the modal (`h-full` instead)
- Modify: `WizardStepper` — either extend to intro+5 steps, or keep dots on the original 5 and treat intro as pre-stepper marketing (matching today's MBTI-not-in-stepper behavior). Note the choice in the commit message.
- Create: small UI store (e.g. `src/stores/useOnboardingUiStore.js`) with `forceOpen` / `open()` / `close()` so ProfilePanel and SettingsSheet can reopen the modal without resetting select fields.

**Steps:**

1. `OnboardingIntro.jsx` — port `WhyPage.jsx` JSX (hero, stats grid, "ยังไม่รวมความเสียหายทางอ้อม" block) verbatim; swap `Button` → `navigate('/start')` for `onNext()`.

2. Convert the five page bodies into step components accepting `{ onNext, onBack }`:
   - MBTI: `navigate('/select/career')` → `onNext()`
   - Career: `navigate('/select/mastery')` → `onNext()`
   - Mastery: `navigate('/select/university')` → `onNext()`
   - University: `navigate('/select/program')` → `onNext()`
   - Program: `navigate('/home')` → call that finishes onboarding (additive write already happens via existing `useSelectionCommit` / `syncSelectToFirestore` when program is set — verify) and signals modal close via `onNext()` / `onComplete()`. The "กรุณาเลือกมหาวิทยาลัยก่อน" fallback (`navigate('/select/university')`) becomes `onBack()` (or a direct step-jump to university).

3. `OnboardingModal.jsx` — `fixed inset-0 z-50` full-viewport overlay; internal `step` state `0..5`:
   `0` intro → `1` MBTI → `2` Career → `3` Mastery → `4` University → `5` Program.
   Renders one step at a time; owns `next()` / `back()`.
   Visible when `forceOpen` is true **or** (`user` exists and `!program`). On complete / when program becomes set and not force-open, unmount/hide and clear `forceOpen`.

4. Do not reset `useSelectStore` on open — pre-filled selections when re-entered.

**Commit:** `feat(onboarding): modal shell with intro + five step components`

---

## Task 3: Wire routes, auth redirects, and re-entry

**Files:**
- Modify: `src/App.jsx` — remove lazy imports + routes for WhyPage, MbtiPage, CareerPage, MasteryPage, UniversityPage, ProgramPage, RootRedirect, `/start`. Mount `<OnboardingModal />` inside `MobileLayout` (alongside `<Outlet />`) when user is signed in.
- Modify: `src/pages/AuthPage.jsx` — `navigate('/start', …)` → `navigate('/home', { replace: true })`
- Modify: `src/pages/RegisterPage.jsx` — `navigate('/select/mbti')` → `navigate('/home')`. For the "Start With Why?" button (line ~116): remove it (intro is now step 0 of the modal, shown automatically) — plan-flagged decision.
- Modify: `src/components/ProfilePanel.jsx` — "Edit your path" opens modal via UI store, not `navigate('/select/mbti')`
- Modify: `src/components/SettingsSheet.jsx` — reset-onboarding action opens modal via UI store, not `navigate('/select/mbti')`
- Modify: `src/pages/AuthPage.test.jsx` and any other tests that assert `/start` or `/select/*` redirects

**Steps:**

1. `RequireAuth` sends everyone straight to `/home` (no RootRedirect gate).
2. Modal self-gates on `!program` (plus force-open for re-entry).
3. Grep for remaining `'/why'`, `'/start'`, `/select/` in `src/` and fix any stragglers this task owns (wiring only — page file deletion is Task 4).

**Commit:** `feat(onboarding): mount modal on /home; remove select routes and re-entry navigations`

---

## Task 4: Cleanup pages and relocate tests

**Files:**
- Delete: `src/pages/WhyPage.jsx` (only after nothing imports it)
- Delete or relocate: the five select page files if fully replaced by onboarding step components
- Update/relocate: `src/pages/*.test.jsx` for Mbti/Career/Mastery/University/Program — render step components with mock `onNext`/`onBack` instead of `MemoryRouter` at `/select/*`
- Update: `AuthPage.test.jsx` if not fully done in Task 3
- Update: `useSelectionCommit.js` comment if it still references `/select/*` pages

**Steps:**

1. Confirm no imports of deleted pages.
2. Tests mount step components directly with mock callbacks.
3. Final grep: no remaining references to `/why` or `/select/` in app code (`grep -rn "'/why'\|/select/"`).
4. `npm test` and `npm run test:rules` both pass.

**Commit:** `chore(onboarding): remove legacy select pages and update tests`
