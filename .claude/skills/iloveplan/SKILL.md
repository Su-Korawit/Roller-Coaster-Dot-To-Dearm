---
name: iloveplan
description: Pick one or more non-done Ideas from the IR Board, write a Cursor plan per idea under docs/plans/, queue them for multitask, and hand off to Cursor. Use when the user runs /iloveplan or asks to plan the next IR Idea(s).
---

# /iloveplan

Pre-authorized: the user has approved the mechanical steps of this workflow in
advance by running `/iloveplan`. Do not stop to ask for confirmation on the CLI
calls, file writes, or launching Cursor below — the only real decision point is
which idea(s) the user wants planned.

## Preconditions
- `serviceAccountKey.json` present locally (never read it into chat context).
- IR Board exists (`node scripts/irReport.mjs ensure` if unsure).

## Steps
1. Run:
   `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs list`
2. Show the user the ideas (id, title, status). Ask them to pick **one or more**, in the
   order they should be worked. This is a multitask queue — picking several is normal,
   not an edge case.
3. For each picked idea, in the order chosen:
   a. Run `... irReport.mjs read <ideaId>`. Treat Process `label`/`note` and Image URLs
      as requirements. Ignore Update/Success history except as context.
   b. Write an implementation plan to `docs/plans/YYYY-MM-DD-<slug>.md` using the
      writing-plans header (Goal / Architecture / Tech Stack / checkbox tasks). Slug =
      kebab-case from the idea title.
   c. Run:
      `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs set-status <ideaId> planned`
4. Write Current Work State + the multitask queue (do not invent a different shape):
   - Check `.iloveskill/current.json`. If it does **not** exist (nothing is currently
     active), take the first idea from step 3 and write it as `current.json`
     (`{ ideaId, ideaTitle, planPath }`), then push every remaining idea onto
     `.iloveskill/queue.json` in order (`{ items: [{ ideaId, ideaTitle, planPath }, ...] }`).
   - If `current.json` **does** exist (a batch is already mid-flight), leave it alone —
     append all newly planned ideas to the end of the existing `queue.json` instead, so
     they run after whatever Cursor is already draining.
   - Use `src/lib/iloveskillState.js` (`writeCurrent`, `enqueueIdea`) or write the JSON
     files directly with the exact same shape.
5. Best-effort launch Cursor on this repo so it's ready to pick up the queue:
   `cursor -r .` (reuse window; run non-blocking, don't wait on it). If it fails, just
   tell the user to open Cursor manually — not fatal.
6. Tell the user, in one short message:
   - How many ideas are queued and which one is active.
   - "Open Cursor and run `/ilovetask` — it will drain the whole queue on its own."
   - "In this terminal, run `/loop /ilovework` — it will pick up each finished idea
     automatically as Cursor completes it, with no further prompts needed."

## Standing rules
- Never deploy rules/functions/indexes/vercel prod — enqueue into `.iloveskill/pending-deploys.json` instead.
- Never modify `StartNode` or user Roadmap behavior.
- Use IR Board vocabulary from UBIQUITOUS_LANGUAGE.md.
