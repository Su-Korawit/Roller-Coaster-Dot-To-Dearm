---
name: ilovework
description: Signal-driven, multitask-aware — waits for Cursor's /ilovetask batch to finish (.iloveskill/task-done.json), then verifies tests, pushes main, and reports Update/Success Blocks per idea onto the IR Board. Safe to run repeatedly via /loop. Use when the user runs /ilovework, or on a /loop after /iloveplan.
---

# /ilovework

## Preconditions
- `serviceAccountKey.json` available for irReport (never paste into chat).

## Steps
0. Check state first — this makes the skill safe to re-run on a timer via `/loop`:
   - Neither `.iloveskill/current.json` nor `.iloveskill/task-done.json` exists:
     report "no active iloveskill work" and stop. Exit cleanly, not an error.
   - `current.json` exists but `task-done.json` does **not**: Cursor hasn't finished
     the batch yet. Report "waiting on Cursor (/ilovetask) — active idea:
     `<ideaTitle>`" and stop. Do not run tests.
   - `task-done.json` exists: continue to step 1.
1. Read `.iloveskill/task-done.json` → `{ completed: [{ ideaId, ideaTitle, summary }, ...], finishedAt }`.
   This may cover one idea or a whole multitask batch — treat `completed` as an
   ordered list either way.
2. Run `npm test`. If `firestore.rules` / `storage.rules` / indexes changed in this worktree vs `main`, also run `npm run test:rules` (or `test:rules:emu`).
3. **If any test fails or work is blocked:**
   - Do **not** push.
   - Build a short summary: what landed locally + what is blocked.
   - For each idea in `completed`, run:
     `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs append-update <ideaId> <summary>`
     (this also sets status `in-progress`)
   - Stop. Leave `current.json`, `queue.json`, and `task-done.json` in place so the
     next `/loop` tick (or a human fix) can retry from the same state.
4. **If all green:**
   - Commit any remaining uncommitted work in logical chunks, with clear messages covering each idea title.
   - `git push origin main` (ADR: direct to main — no PR).
   - For each idea in `completed`, in order, run:
     `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs append-success <ideaId> <summary>`
   - Delete `.iloveskill/current.json`, `.iloveskill/queue.json` (if present), and `.iloveskill/task-done.json`.
   - If `pending-deploys.json` has commands, immediately invoke `/unlock-bkb` — no confirmation prompt, this queue is already pre-authorized as part of this workflow.
5. If run inside a `/loop`: report the outcome in one short line and let the loop
   reschedule (poll interval ~2-5 min is reasonable). If nothing changed since the
   last tick, say so briefly rather than repeating the full report.

## Standing rules
- Never run deploy commands here — only enqueue.
- Never force-push.
- Never read serviceAccountKey contents into the transcript.
