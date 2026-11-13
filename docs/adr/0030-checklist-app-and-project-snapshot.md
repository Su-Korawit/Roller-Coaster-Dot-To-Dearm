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
2. A generated project snapshot: `scripts/buildChecklistProjects.mjs` crawls MyTCAS and writes
   `public/data/checklist/projects/<universityId>.json` (+ `manifest.json`), sharded per university and fetched on
   demand (static files, cached by Vercel headers). Rerun the script to refresh; commit the output.
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
- Snapshot only covers programmes MyTCAS lists with round 1/2 projects for the year in the script (`YEAR`).
- Hand-verified process lists cover a few universities; everything else relies on the generated checklist.
