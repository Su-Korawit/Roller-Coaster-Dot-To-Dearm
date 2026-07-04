---
status: proposed
---

# Onboarding (MBTI/Career/Mastery/University/Program) becomes a first-visit popup, not five routed pages

Today onboarding is five full-page routes reached via `/why` → `/select/mbti` → `/select/career` →
`/select/mastery` → `/select/university` → `/select/program` → `/home`, gated by `RootRedirect`
checking `useSelectStore.program`. This ADR replaces that page chain with a single `OnboardingModal`
that overlays `/home` the first time a signed-in user has no `program` set, using the step UIs
already designed in `D:\Ikkyusan\Desktop\redesign_mbti_univer_program_mastery`.

The reference mockups in that folder (Study Stream Selector, Program Compare List, Mastery
milestones + community Q&A) render with the app's post-onboarding chrome (bottom nav, player
level) and model *multiple* tracked programs/mastery goals — that is a separate, larger "Task tab"
feature, not this popup. Confirmed with the requester: this round keeps onboarding as today's
single-value-per-field wizard, just moved into a modal; the compare/track UI is future work. Data
model below stays additive so that future work won't need a second migration.

## Decision

1. **Routing** — delete `/why` and all five `/select/*` routes plus `RootRedirect`/`/start`.
   `RequireAuth` sends everyone straight to `/home`. `OnboardingModal` mounts inside `MobileLayout`
   and self-gates on `!useSelectStore((s) => s.program)`.
2. **Wizard steps** — the five existing page bodies (`MbtiPage`, `CareerPage`, `MasteryPage`,
   `UniversityPage`, `ProgramPage`) are extracted into step components that take `onNext` /
   `onBack` callbacks instead of `useNavigate()`. `WhyPage`'s stat content becomes step 0 (intro)
   so that marketing copy isn't silently dropped.
3. **Data model** — `profile.program` / `profile.masteryTrack` (singular) keep being written
   exactly as today; nothing that reads them (matchScore, social matching, admin analytics,
   aiJourney) changes. Additively, `profile.programs[]` and `profile.masteryTracks[]` are
   introduced and seeded with one entry each from the same onboarding commit, so a future
   multi-select "Task tab" can build on real data without another migration.
4. **Re-entry** — `ProfilePanel`'s "Edit your path" and `SettingsSheet`'s reset-onboarding action
   currently `navigate('/select/mbti')`; both are repointed to open `OnboardingModal` in-place.

## Considered Options

- **Keep five routed pages, just style them like a modal** (rejected) — doesn't satisfy "popup on
  first entry"; still leaves stray URLs (`/select/program`) that deep-link past auth state.
- **Do the full array migration now, drop the singular fields** (rejected for this round) — 16
  files read `profile.program`/`masteryTrack` today (matchScore weighting, `SocialPanel`,
  `ChatPanel`, `UserProfileSheet`, admin sections, `aiJourney`). Rewriting all of them is the
  "Task tab" initiative's job, not an onboarding-UI change; additive fields get the schema ready
  without that blast radius.

---

## Implementation Plan (Cursor implements; Claude Code reviews + fixes)

### A. New onboarding modal shell

1. `src/components/onboarding/OnboardingModal.jsx` — fixed, full-viewport overlay
   (`fixed inset-0 z-50`), internal `step` state `0..5`:
   `0` intro (ex-WhyPage) → `1` MBTI → `2` Career → `3` Mastery → `4` University → `5` Program.
   Renders one step component at a time; owns `next()`/`back()`.
2. `src/components/onboarding/OnboardingIntro.jsx` — port `WhyPage.jsx`'s JSX (hero, stats grid,
   "ยังไม่รวมความเสียหายทางอ้อม" block) verbatim; swap its `Button` → `navigate('/start')` for
   `onNext()`.
3. Convert the five page bodies into step components (can live alongside the existing files or in
   `src/components/onboarding/`, Cursor's call) that accept `{ onNext, onBack }`:
   - `MbtiPage.jsx` → replace `navigate('/select/career')` with `onNext()`.
   - `CareerPage.jsx` → replace `navigate('/select/mastery')` with `onNext()`.
   - `MasteryPage.jsx` → replace `navigate('/select/university')` with `onNext()`.
   - `UniversityPage.jsx` → replace `navigate('/select/program')` with `onNext()`; the
     "กรุณาเลือกมหาวิทยาลัยก่อน" fallback button in `ProgramPage.jsx` (`navigate('/select/university')`)
     becomes `onBack()` twice or a direct step-jump.
   - `ProgramPage.jsx` → replace `navigate('/home')` with a call that (a) triggers the additive
     Firestore write (see D.1) and (b) unmounts the modal.
   `StepScreen.jsx` keeps its layout (title, `WizardStepper`, search bar, sticky Next) — verify its
   `h-dvh` assumption still looks right nested inside the modal's fixed overlay; adjust to `h-full`
   if double-viewport-height issues appear.
4. `WizardStepper` — extend to reflect intro + 5 steps (or keep dots to the original 5 and treat
   intro as pre-stepper marketing, matching today's MBTI-not-in-stepper behavior) — Cursor's call,
   note the choice in the PR description.

### B. Wiring the trigger

5. `src/App.jsx` — remove lazy imports + routes for `WhyPage`, `MbtiPage`, `CareerPage`,
   `MasteryPage`, `UniversityPage`, `ProgramPage`, `RootRedirect`, and the `/start` route.
   `MobileLayout` (or a thin wrapper around it) renders `<OnboardingModal />` alongside `<Outlet />`
   when `useAuthStore.user` exists and `useSelectStore.program` is falsy.
6. `src/pages/AuthPage.jsx:53` — `navigate('/start', { replace: true })` → `navigate('/home', { replace: true })`.
7. `src/pages/RegisterPage.jsx:50` — `navigate('/select/mbti')` → `navigate('/home')` (modal takes
   over from there). Line 116's "Start With Why?" button: since `/why` is gone, either remove the
   button (intro is now step 0 of the modal, shown automatically) or keep it as a no-op label —
   flagging this as the one place the plan makes a call without a mock to check against; confirm
   the visual during review.
8. `src/components/ProfilePanel.jsx:94` and `src/components/SettingsSheet.jsx:129` — replace
   `navigate('/select/mbti')` with whatever toggle opens `OnboardingModal` on top of the current
   screen (e.g. a boolean in a small UI store, or lifting `OnboardingModal`'s open state up to
   `MobileLayout` and exposing a setter via context/store). Don't reset `useSelectStore` fields on
   open — the wizard should show current selections, not blank ones, when re-entered this way.

### C. Cleanup

9. Delete `src/pages/WhyPage.jsx` only after step A.2 confirms nothing else imports it.
10. Update/relocate the five `*.test.jsx` files under `src/pages/` — they currently mount pages via
    `MemoryRouter` at `/select/*` routes; once those routes are gone the tests need to render the
    extracted step components directly with mock `onNext`/`onBack` props instead of a router.

### D. Data layer (additive, non-breaking)

1. `src/lib/db.js` `shapes.profileFields` — keep the existing singular mapping unchanged. Add:
   ```js
   if (program)  profile.programs = [{ programId: program, addedAt: Date.now() }]
   if (mastery)  profile.masteryTracks = [{ masteryId: mastery, milestones: [], progressPct: 0, addedAt: Date.now() }]
   ```
   (shape open to Cursor's judgment on exact sub-fields — the contract that matters is: array of
   objects, one seeded per onboarding commit, additive to — not replacing — the singular field.)
2. `shapes.readProfile` — add `programs: p.programs ?? (p.program ? [{ programId: p.program }] : [])`
   and the equivalent for `masteryTracks`, so pre-migration docs don't read back empty.
3. Do **not** touch `src/services/socialService.js`'s matchScore weighting, `SocialPanel.jsx`,
   `ChatPanel.jsx`, `UserProfileSheet.jsx`, `PublicProfileSheet.jsx`, admin sections, or
   `aiJourney.js` in this round — they keep reading the singular fields. Consuming the new arrays
   is the future Task-tab initiative's job.
4. `npm run test:rules` after the `db.js` change — the profile write rules validate `profile` as a
   map, so the new array sub-fields likely need no rule changes, but confirm rather than assume.

### E. Verification checklist (Claude Code reviews before calling this done)

- Fresh account: register → lands on `/home` → modal shows intro → MBTI → Career → Mastery →
  University → Program → modal closes → Firestore doc has both `profile.program` (string) and
  `profile.programs[0]` (array) populated; same for mastery.
- Existing account with `profile.program` already set: no modal on load.
- `ProfilePanel` → "Edit your path" reopens the modal pre-filled with current selections, not blank.
- `npm test` and `npm run test:rules` both pass.
- No remaining references to `/why` or `/select/*` (`grep -rn "'/why'\|/select/"`).
