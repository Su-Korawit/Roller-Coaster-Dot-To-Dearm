---
name: iloveplan
description: Use when the user runs /iloveplan or asks to plan the next IR Idea(s). Part of the korawit skills (iloveskill series) — picks non-done Ideas from the IR Board, writes a plan per idea, and queues each one for an executor (Claude or Cursor).
---

# /iloveplan

Pre-authorized: the user has approved the mechanical steps of this workflow in
advance by running `/iloveplan`. Do not stop to ask for confirmation on the CLI
calls, file writes, or launching Cursor below — the real decision points are
**which idea(s)** the user wants planned and **which executor** runs each one.

## Preconditions
- `serviceAccountKey.json` present locally (never read it into chat context).
- IR Board exists (`node scripts/irReport.mjs ensure` if unsure).

## Steps
1. Run:
   `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs list`
2. Show the user the ideas (id, title, status). Ask them to pick **one or more**, in the
   order they should be worked. This is a multitask queue — picking several is normal,
   not an edge case. In the same question, ask which **executor** implements each idea —
   `claude` (this terminal) or `cursor` (the IDE). Recommend one per idea and let the
   user override:
   - UI-heavy work (React components, JSX, Tailwind styling, visual wiring) → `cursor`
   - Logic-heavy work (scripts, tests, Firestore rules/migrations, services, stores,
     Functions) → `claude`
3. For each picked idea, in the order chosen:
   a. Run `... irReport.mjs read <ideaId>`. Treat Process `label`/`note` and Image URLs
      as requirements. Ignore Update/Success history except as context.
   b. Before writing the plan, surface assumptions: if the idea's blocks leave a real
      design decision open (data shape, UX behavior, scope), ask the user now — a plan
      built on a guessed requirement wastes a whole executor run.
   c. Write an implementation plan to `docs/plans/YYYY-MM-DD-<slug>.md` using the
      writing-plans header (Goal / Architecture / Tech Stack / checkbox tasks). Slug =
      kebab-case from the idea title. State the executor in the header.
   d. Run:
      `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs set-status <ideaId> planned`
4. Write Current Work State + the multitask queue (do not invent a different shape).
   Every item now carries `executor` — `"claude"` or `"cursor"`:
   - Check `.iloveskill/current.json`. If it does **not** exist (nothing is currently
     active), take the first idea from step 3 and write it as `current.json`
     (`{ ideaId, ideaTitle, planPath, executor }`), then push every remaining idea onto
     `.iloveskill/queue.json` in order
     (`{ items: [{ ideaId, ideaTitle, planPath, executor }, ...] }`).
   - If `current.json` **does** exist (a batch is already mid-flight), leave it alone —
     append all newly planned ideas to the end of the existing `queue.json` instead, so
     they run after whatever is already draining.
   - Use `src/lib/iloveskillState.js` (`writeCurrent`, `enqueueIdea`) or write the JSON
     files directly with the exact same shape.
5. Hand off based on the executor of `current.json` (skip if step 4 only appended to an
   existing batch — the running batch already owns the hand-off):
   - **`claude`** → invoke `/ilovetask` (the Claude Code skill) in this same session.
     It drains the Claude-owned segment and chains into `/ilovefinish` on its own.
   - **`cursor`** → best-effort launch Cursor on this repo: `cursor -r .` (reuse window;
     run non-blocking, don't wait on it). If it fails, just tell the user to open Cursor
     manually — not fatal. Then tell the user, in one short message:
     - How many ideas are queued, which one is active, and each idea's executor.
     - "Open Cursor and run `/ilovetask` — it drains the Cursor-owned segment on its own."
     - "In this terminal, run `/loop /ilovefinish` — it picks up each finished segment
       automatically as Cursor completes it."

## Standing rules
- Never deploy rules/functions/indexes/vercel prod — enqueue into `.iloveskill/pending-deploys.json` instead.
- Never modify `StartNode` or user Roadmap behavior.
- Use IR Board vocabulary from UBIQUITOUS_LANGUAGE.md.
