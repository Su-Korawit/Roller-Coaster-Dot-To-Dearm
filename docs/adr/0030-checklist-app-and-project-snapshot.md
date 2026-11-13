# 0030 — Checklist app and the TCAS project snapshot

- Status: accepted
- Date: 2026-11-13

## Context
Students need a checklist of what to study (TGAT / A-Level) and what to prepare for TCAS round 1 (Portfolio)
and round 2 (Quota). There is no API for checklists. Round 1/2 conditions differ per university and per
project, and MyTCAS already publishes, for every programme, its round 1/2 projects (name, seats, accepted
applicant types, minimum GPAX / score, required exam scores, conditions, interview, announcement link).
Goal already stores the student's programmes with their MyTCAS `programId`.

## Decision
1. Static, hand-verified lists in `src/data/checklists/*.json` (exam blueprints from mytcas.com/blueprint, and
   university process lists read from official announcements). Index is bundled, each list is lazy-loaded.
2. A generated project snapshot: `scripts/buildChecklistProjects.mjs` reads MyTCAS's own published files (the ones the
   public site reads: `courses.json`, `rounds/<programId>.json`, `universities.json` on S3) and writes
   `public/data/checklist/projects/<universityId>.json` (+ `manifest.json`), sharded per university and fetched on
   demand (static files, cached by Vercel headers). Covers rounds 1-4 of the year in the script (`YEAR`), every
   labelled criterion (`src/data/checklists/criteria-labels.json`, copied from MyTCAS), majors, and the TCAS FOLIO
   settings of round 1 projects (page limit, deadlines, scoring criteria, questions). Rerun to refresh; commit the output.
   Audit: the same rows were diffed against MyTCAS's preview API for all 4,252 programmes (4,220 identical; the 32
   differing only in null vs "0" placeholders, S3 being newer and carrying the `folio` field).
3. `src/os/checklistProjects.js` turns one project into a checklist document of the same shape as (1), with stable
   item ids derived from the data (`e-gpax`, `e-sc-tgat`, ...) so ticks survive data refreshes.
4. Ticks live in `useChecklistStore` (localStorage, per device), keyed by list id or `programId:round:projectId`.
5. Goal link: Checklist's first tab lists each goal's projects (by `programId`); Goal has a shortcut to Checklist.

## Considered options
- Live `/api/mytcas` per programme: no build step, but every open costs requests and offline use breaks.
- Parsing every announcement PDF into items: too fragile; free-text `condition` is shown verbatim instead and the
  official announcement link is always on the checklist.
- Firestore sync of ticks: deferred (rules, migration); ticks stay on the device for now.

## Consequences
- ~17 MB of static JSON in the repo (largest shard ~1.4 MB raw). Rebuild changes many lines; refresh only when
  MyTCAS data changes meaningfully.
- Round 4 has no projects yet (MyTCAS has not published them); the round 4 template is ready and the next run fills it.
- 15 universities of the Store list have no TCAS70 programmes in MyTCAS; the app lists them with a link to their own site
  (`manifest.withoutProjects`).
- Many MyTCAS projects carry no name (3,195 of 17,685 round 1-2 projects) or no link (2,602): the title falls back to the
  round name and the link to the university's site.
- Per-project documents are the round template plus MyTCAS data (criteria, conditions, FOLIO questions), not a reading of
  each announcement PDF; the official link is on every checklist. Hand-verified lists cover a dozen universities.
