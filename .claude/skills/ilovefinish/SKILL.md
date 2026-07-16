---
name: ilovefinish
description: Use when the user runs /ilovefinish (or the deprecated /ilovework), on a /loop after /iloveplan, or when /ilovetask or /ihatefix finishes a segment. Part of the korawit skills — verifies the finished segment, pushes main, reports to the IR Board, and hands the queue to the next executor.
---

# /ilovefinish

Renamed from `/ilovework` — treat a `/ilovework` request as `/ilovefinish`.
This is the single verify-push-report gate for **both** series: `/ilovetask`
segments (either executor) and `/ihatefix` fixes all land here.

## Preconditions
- `serviceAccountKey.json` available for irReport (never paste into chat).

## Steps
0. Check state first — this makes the skill safe to re-run on a timer via `/loop`:
   - Neither `.iloveskill/current.json` nor `.iloveskill/task-done.json` exists:
     report "no active korawit-skills work" and stop. Exit cleanly, not an error.
   - `current.json` exists but `task-done.json` does **not** — the active segment
     isn't finished. Look at `current.json`'s `executor`:
     - `"cursor"` or missing → report "waiting on Cursor (/ilovetask) — active idea:
       `<ideaTitle>`" and stop. Do not run tests.
     - `"claude"` → a Claude-owned segment is pending or was interrupted mid-run.
       Report "Claude segment `<ideaTitle>` not finished — run `/ilovetask` here to
       (re)start it" and stop. Do **not** auto-restart it from a loop tick: a
       half-implemented plan needs a human-visible resume, not a blind re-run.
   - `task-done.json` exists: continue to step 1.
1. Read `.iloveskill/task-done.json` → `{ completed: [{ ideaId, ideaTitle, summary }, ...], finishedAt }`.
   This may cover one idea or a whole multitask batch — treat `completed` as an
   ordered list either way. Entries from `/ihatefix` may have `ideaId: null`
   (a fix with no IR Board Idea) — keep them in the list; they just skip the
   irReport calls below.
2. Run `npm test`. If `firestore.rules` / `storage.rules` / indexes changed in this worktree vs `main`, also run `npm run test:rules` (or `test:rules:emu`).
   Evidence before assertions (superpowers:verification-before-completion): never
   report green without having run the command in this session, and quote the actual
   failing output when reporting a blocker.
3. **If any test fails or work is blocked:**
   - Do **not** push.
   - Build a short summary: what landed locally + what is blocked.
   - For each idea in `completed` that has a non-null `ideaId`, run:
     `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs append-update <ideaId> <summary>`
     (this also sets status `in-progress`)
   - Stop. Leave `current.json`, `queue.json`, and `task-done.json` in place so the
     next `/loop` tick (or a human fix) can retry from the same state.
4. **If all green:**
   - Commit any remaining uncommitted work in logical chunks, with clear messages covering each idea title.
   - `git push origin main` (ADR: direct to main — no PR).
   - For each idea in `completed` with a non-null `ideaId`, in order, run:
     `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs append-success <ideaId> <summary>`
   - Delete `.iloveskill/task-done.json`, then decide what happens to the queue.
     If `current.json` doesn't exist (a pure `/ihatefix` run with no batch), there is
     no queue to manage — continue straight to the deploy bullet below.
     **Promote or clear only if `current.json`'s `ideaId` appears in `completed`.**
     If it does not (e.g. `/ihatefix` landed while a planned segment was still
     waiting to start), the active idea was never implemented — leave `current.json`
     and `queue.json` untouched, skip the deploy bullet below, and hand off by
     `current.json`'s `executor` (claude → `/ilovetask` here; cursor → tell the user
     to run `/ilovetask` in Cursor). Otherwise, look at `.iloveskill/queue.json`:
     - **Queue has items** — the batch has another segment. Pop the first item into
       `current.json` (rewrite `queue.json` without it) and hand off by its `executor`:
       - `"claude"` → invoke `/ilovetask` (the Claude Code skill) in this same session,
         so the batch continues without switching windows.
       - `"cursor"` (or missing) → best-effort `cursor -r .`, tell the user to run
         `/ilovetask` in Cursor, and let `/loop /ilovefinish` keep ticking.
       Either way, **skip the deploy bullet below** — deploys wait for the end of the
       whole batch, not a segment boundary.
     - **Queue empty or missing** — the whole batch is done. Delete `current.json` and
       `queue.json` (if present), then continue to the deploy bullet below.
   - If `pending-deploys.json` has commands, immediately invoke `/unlock-bkb` — no confirmation prompt, this queue is already pre-authorized as part of this workflow.
5. If run inside a `/loop`: report the outcome in one short line and let the loop
   reschedule (poll interval ~2-5 min is reasonable). If nothing changed since the
   last tick, say so briefly rather than repeating the full report.

## Standing rules
- Never run deploy commands here — only enqueue.
- Never force-push.
- Never read serviceAccountKey contents into the transcript.
