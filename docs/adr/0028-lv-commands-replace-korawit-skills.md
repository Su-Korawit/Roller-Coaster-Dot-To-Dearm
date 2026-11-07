# 0028 — lv-* commands replace the korawit skills

- **Status:** accepted
- **Date:** 2026-11-05

## Context

ADR 0014/0015/0017 built `/iloveplan` → `/ilovetask` → `/ilovefinish` (+ `/ihatefix`)
around the admin IR Board: ideas lived in Firestore, were queued in `.iloveskill/`,
handed between Claude Code and Cursor, and reported back to the board. The project
no longer wants the admin page in the loop, and wants friends to be able to join.

## Decision

Replace the series with six independent commands, plus the existing `/unlock-bkb`:
`/lv-create`, `/lv-edit`, `/lv-preview`, `/lv-push`, `/lv-merge`, `/lv-colab`.

- No IR Board reads/writes, no executor queue, no `current.json`/`task-done.json`.
- Work happens on `feat/*` branches; `/lv-push` pushes the branch, `/lv-merge` lands
  it in `main` through a PR after an explicit yes (replaces ADR 0017's direct-to-main push).
- Deploy queue moves from `.iloveskill/pending-deploys.json` to `.lv/pending-deploys.json`.
- `/lv-colab` invites collaborators with `gh api`.
- Removed: `/iloveplan`, `/ilovetask` (Claude + Cursor), `/ilovefinish`, `/ihatefix`.

## Consequences

- Admin IR Board code (`scripts/irReport.mjs`, `src/lib/iloveskillState.js`,
  `src/services/irBoardSession.js`) is now unused by the workflow but left in place;
  removing it is a separate cleanup.
- `UBIQUITOUS_LANGUAGE.md` still documents the old terms; they are historical.
- ADRs 0014, 0015, 0017 are superseded for workflow purposes.
