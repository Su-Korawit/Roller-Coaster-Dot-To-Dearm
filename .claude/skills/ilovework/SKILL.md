---
name: ilovework
description: Verify tests, push main on success, and report Update/Success Blocks onto the IR Board. Use when the user runs /ilovework after /ilovetask.
---

# /ilovework

## Preconditions
- `.iloveskill/current.json` exists.
- `serviceAccountKey.json` available for irReport (never paste into chat).

## Steps
1. Read `.iloveskill/current.json` → `{ ideaId, ideaTitle, planPath }`.
2. Run `npm test`. If `firestore.rules` / `storage.rules` / indexes changed in this worktree vs `main`, also run `npm run test:rules` (or `test:rules:emu`).
3. **If any test fails or work is blocked:**
   - Do **not** push.
   - Build a short summary: what landed locally + what is blocked.
   - Run:
     `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs append-update <ideaId> <summary>`
     (this also sets status `in-progress`)
   - Stop. Leave `current.json` in place.
4. **If all green:**
   - Commit any remaining uncommitted work in logical chunks, with clear messages covering the idea title.
   - `git push origin main` (ADR: direct to main — no PR).
   - Run:
     `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs append-success <ideaId> <summary>`
   - Delete `.iloveskill/current.json` (or `clearCurrent()`).
   - If `pending-deploys.json` has commands, immediately invoke `/unlock-bkb` — no confirmation prompt, this queue is already pre-authorized as part of this workflow.

## Standing rules
- Never run deploy commands here — only enqueue.
- Never force-push.
- Never read serviceAccountKey contents into the transcript.
