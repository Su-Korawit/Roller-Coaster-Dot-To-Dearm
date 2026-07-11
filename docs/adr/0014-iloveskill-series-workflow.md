# 0014 — iloveskill series: plan → implement → report workflow

- **Status:** accepted
- **Date:** 2026-07-11

## Context

The project runs a two-tool workflow (CLAUDE.md): Claude Code plans and verifies,
Cursor implements. Work items now live on the admin IR Board (ADR 0013), so the
workflow needs commands that pick an idea, hand a plan to Cursor, and report results
back onto the board from the terminal. Deploying Firebase rules/functions mid-task is
disruptive and permission-heavy, so those must be deferrable.

## Decision

Four commands, checked into the repo (project-level, since they are coupled to this
repo's board and scripts):

| Command       | Lives in                        | Runs in     |
| ------------- | ------------------------------- | ----------- |
| `/iloveplan`  | `.claude/skills/iloveplan/`     | Claude Code |
| `/ilovetask`  | `.cursor/commands/ilovetask.md` | Cursor      |
| `/ilovework`  | `.claude/skills/ilovework/`     | Claude Code |
| `/unlock-bkb` | `.claude/skills/unlock-bkb/`    | Claude Code |

**CLI ↔ board bridge:** `scripts/irReport.mjs`, a Node script following the existing
`scripts/` pattern (`GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json`). It
lists Idea Root Blocks, reads an idea's child blocks, appends Update/Success Blocks,
and updates idea status. The service account bypasses rules, so no rules change is
needed for the CLI path.

**Shared state (gitignored `.iloveskill/`):**

- `current.json` — `{ ideaId, ideaTitle, planPath }`; written by `/iloveplan`,
  read by `/ilovetask` and `/ilovework`, cleared when an idea reaches `done`.
- `pending-deploys.json` — queued commands; survives idea completion, cleared only
  by `/unlock-bkb`.

**Flows:**

- `/iloveplan` — list ideas with status ≠ `done` via `irReport.mjs` → user picks one
  → read the idea's text/image blocks as requirements → write
  `docs/plans/YYYY-MM-DD-<slug>.md` (a plan for Cursor) → write `current.json` →
  set idea status `planned`.
- `/ilovetask` — Cursor command: read `current.json` → read the plan file →
  implement it.
- `/ilovework` — run `npm test` (plus `npm run test:rules` when rules changed).
  All green → commit, push to `main`, append a **Success Block** (summary +
  timestamp), set status `done`, clear `current.json`. Tests fail or work blocked →
  no push; append an **Update Block** describing progress and the blocker, set
  status `in-progress`.
- `/unlock-bkb` — print the queue, run every queued command in one batch, clear the
  queue. **Standing rule for the whole series:** no skill ever runs
  permission-heavy / production-affecting commands directly (firebase rules,
  functions, indexes deploy, `vercel --prod`, and anything requiring elevated
  permission); they append to `pending-deploys.json` instead.

## Considered options

- **Vercel API endpoint for board writes** — works without a local service account
  key but adds auth surface; the key already exists locally for other scripts. Rejected.
- **Local JSON handoff synced by the Admin page** — avoids CLI Firestore writes but
  requires opening the Admin page to sync; reports would lag reality. Rejected.
- **`/ilovetask` as a paste-prompt instead of a Cursor command** — extra manual step
  every cycle. Rejected; Cursor commands can read the state file directly.
- **`/unlock-bkb` as a persistent lock/unlock toggle** — an unlocked marker left
  behind silently authorizes future deploys. Rejected for the explicit
  run-the-queue-once model.
- **Personal `~/.claude/skills` placement** — the series is useless outside this
  repo. Rejected.

## Consequences

- `serviceAccountKey.json` must be present locally for `/iloveplan` and `/ilovework`
  (already the pattern for `scripts/`; still gitignored, never read into context).
- `/ilovework` pushes directly to `main` when tests pass — no PR step by design.
- `.iloveskill/` joins `.gitignore`; Cursor and Claude Code share it on the same
  machine only.
- Deploys batch up: rules edited mid-task are not live until `/unlock-bkb`, so
  manual testing against production rules must wait for the unlock.
