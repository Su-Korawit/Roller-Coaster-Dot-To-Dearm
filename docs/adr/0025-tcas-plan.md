# 0025 — TCAS Plan: an automatic application plan

**Status:** accepted
**Date:** 2026-10-23

## Context

Students planned with a hand-built React Flow Roadmap. What they actually need is: which programs am
I aiming at, in which round, what does each require, what is the next thing I must do and when, and
what must I study. The Open House campus will let them pick programs; this ADR is the part that
turns picks into a plan. Design: `docs/superpowers/specs/2026-10-16-tcas-plan-design.md`; plan:
`docs/superpowers/plans/2026-10-23-tcas-plan.md`.

## Decision

- **Extend the existing plans, do not fork them.** Entries in `usePlansStore` / `users/{uid}.profile.plans`
  gain `{ v: 2, programId, universityId, universityName, programName, buildingId, round, rank,
  projectName, scores, minGpax, checklist }`. Old entries (`{ id, university, program }`) and the
  synthetic `legacy` entry are upgraded on load (`migrateEntry`) and keep working in onboarding and
  the profile; v1 entries are still written in the old four-field shape. The slot cap
  (`FREE_PLAN_SLOTS` + entitlements) is unchanged.
- **The chosen project's `scores` and `minGpax` are copied into the entry.** The spec's model had no
  scores, but the checklist, the score chips and the subject totals all need them, and the Open
  House index is one file per building that must not be fetched for every plan row.
- **All derivation is pure** (`src/utils/planDerive.js`): the automatic checklist (GPAX, one item per
  exam subject, portfolio, interview), merging regenerated items without losing ticks or the
  student's own items, subject aggregation (a program counts once even when in two rounds), default
  goal hours `20 + round5(60 × maxWeight/100)`, round status (closed only when the calendar says the
  results are out; otherwise open: no invented dates), round-3 ranks 1–10 without gaps or
  duplicates, and the "what next" milestone. The sheet is thin UI over it.
- **Dates come only from the calendar**: admin `tcasEvents` or the built-in TCAS70 rows, which are
  now tagged with `round`, `kind` and `examKeys`; the admin form gained optional round, kind and
  exam-key fields (invalid values are dropped, never stored). No match means no date.
- **Subject hours are server-owned.** `startFocus({ subjectKey })` validates the key
  (`functions/subjectKeys.js`, same fixture-tested regex as the client), stores it on the active
  session, and `endFocus` adds the session's verified time to `users/{uid}.focusBySubject.{key}`
  (also for a withered session: the minutes were real; never for a practice session). The field is
  on the rules' deny-list for client writes and creates, like `leaves`.
- **Goals are the student's own** (`goalHours`, validated, synced in `profile.goalHours`); อ่าน opens
  the focus sheet pre-filled with the subject (`useRoomUiStore.open('focus', { subjectKey })`).
- **Guests** use the same store (persisted locally); a new `plans` tool in the guest-merge flow
  marks the work dirty, captures program entries and merges them additively through
  `addFromProgram` (cap, duplicate and rank rules hold), silently into an empty account or via the
  existing dialog otherwise.
- **Entry point is a store call**: `usePlanUiStore.openAdd(program)` shows `RoundPickerSheet`
  (round status, next free rank, project choice, result with "ดูแผน"); the Open House popup calls it.

## Considered options

- **A separate plan collection.** Would duplicate the slot cap, the guest persistence and the profile
  sync, and strand onboarding/profile readers. Rejected.
- **Re-fetch scores from the Open House index at render.** One request per building per open; fails
  offline and when the index is mid-refresh. Rejected for the snapshot.
- **Counting subject hours on the client.** Trivially inflated. Rejected for the Functions-owned field.
- **Deriving "closed" from an assumed deadline.** Universities set their own windows; we only know
  the central results dates. Rejected: closed only on a past announcement for that round.

## Consequences

- Deploy order: Firestore rules, then the four focus functions, then hosting. Old clients send no
  `subjectKey` and are unaffected.
- The plan slot of the hotbar is ready; the guide's Plan step stays unavailable until the Open
  House popup (the only caller of `openAdd`) exists.
- A student who changes a program's round re-derives the checklist from the stored project data; the
  stored snapshot can be older than the index (a later project edit is not reflected until re-added).
