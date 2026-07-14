# 0015 — iloveskill series: multitask queue + signal-file Cursor bridge

- **Status:** accepted
- **Date:** 2026-07-14

## Context

ADR 0014 shipped `/iloveplan` → `/ilovetask` → `/ilovework` + `/unlock-bkb` as a
one-idea-at-a-time workflow: `.iloveskill/current.json` held exactly one
`{ ideaId, ideaTitle, planPath }`, and the user manually switched between Claude
Code and Cursor at each handoff point.

Two follow-up asks: (1) support planning and working through several Ideas in one
pass ("multitask") instead of one at a time, and (2) automate the Claude ↔ Cursor
handoff so `/iloveplan` hands off to Cursor and, once Cursor finishes, control comes
back to Claude Code for `/ilovework` without the user manually retyping commands in
each app.

**Investigated: `cursor-agent` (Cursor's headless CLI).** The official installer
(`cursor.com/install`) only supports `linux`/`darwin` via `uname` detection; it
explicitly rejects Windows (`MINGW64_NT` on this machine). WSL is present but only
as Docker Desktop's internal distro, not a general-purpose Linux environment. An
unofficial `windows/x64` build exists on Cursor's CDN
(`downloads.cursor.com/.../windows/x64/agent-cli-package.zip`), but it's unsupported
by Cursor's own installer, unverified, and would require separate Cursor account
auth — rejected for now (see Considered options).

Without a headless agent CLI, Cursor cannot be driven start-to-finish from a
terminal: the first `/ilovetask` invocation inside Cursor still requires the user to
open Cursor and trigger it. What *can* be automated is everything else — queuing
multiple ideas, Cursor draining the whole queue unattended once started, and Claude
Code picking up completion without being told to.

## Decision

**Multitask = sequential queue, not parallel worktrees.** One Cursor window drains
one queue in order. Simpler, no worktree/merge-order/IR-Board-write-race concerns.

**New shared state files (gitignored `.iloveskill/`), alongside the existing
`current.json` and `pending-deploys.json`:**

- `queue.json` — `{ items: [{ ideaId, ideaTitle, planPath }, ...] }`. Ideas planned
  but not yet active.
- `task-done.json` — `{ completed: [{ ideaId, ideaTitle, summary }, ...], finishedAt }`.
  Written once by Cursor's `/ilovetask` after it has drained `current.json` **and**
  the entire `queue.json` in one session. This is the single hand-back signal for
  the whole batch — not one signal per idea, to avoid Cursor and Claude racing on
  the same working tree mid-batch.

Implemented in `src/lib/iloveskillState.js`: `readQueue`, `enqueueIdea`,
`dequeueNext`, `readSignal`, `writeSignal`, `clearSignal` (unit-tested alongside the
existing `current`/`pending` helpers).

**Flows (updated):**

- `/iloveplan` — lets the user pick **one or more** ideas per run. Writes a plan per
  idea. The first idea (if nothing is already active) becomes `current.json`; the
  rest go on `queue.json`. If a batch is already running, new picks just append to
  `queue.json`. Best-effort launches Cursor (`cursor -r .`, non-blocking) so the
  window is ready. Tells the user to run `/ilovetask` once in Cursor and
  `/loop /ilovework` once in Claude Code — no further manual handoff after that.
- `/ilovetask` (Cursor) — implements the plan in `current.json`, commits locally
  (no push), then checks `queue.json`: if non-empty, pops the next idea into
  `current.json` and keeps going in the same session, looping until the queue is
  empty. Only then writes `task-done.json` covering every idea processed.
- `/ilovework` — now signal-driven and idempotent, safe to run on a `/loop`:
  nothing active → no-op; `current.json` present but no `task-done.json` → report
  "waiting on Cursor", no-op; `task-done.json` present → run tests, push once, and
  append one Success or Update Block **per idea** in `completed`, then clear all
  three state files (or leave them on failure so the next tick retries).
- `/unlock-bkb` — unchanged; `pending-deploys.json` isn't idea-scoped, so the batch
  size doesn't affect it.

**Bypass wording is now consistent across the whole series.** `/ilovework` →
`/unlock-bkb` already ran without a confirmation prompt (prior chore commit); this
ADR extends the same "pre-authorized, don't stop to confirm the mechanical steps"
posture to `/iloveplan` and `/ilovetask`, since the batch itself was the user's one
real decision (picking the ideas) — everything downstream is plumbing.

## Considered options

- **Install `cursor-agent` via an unofficial Windows CDN build** — would give true
  headless Cursor invocation from Claude Code. Rejected for now: unsupported by
  Cursor's own installer, unverified on Windows, and needs separate Cursor account
  auth. Revisit if Cursor ships official Windows support.
- **Per-idea `task-done` signal instead of one per batch** — lets `/ilovework` push
  after every single idea instead of waiting for the whole queue. Rejected: Cursor
  would have to pause and poll for Claude's push+report to finish before touching
  the next idea's files, which risks Cursor and Claude editing/committing the same
  working tree concurrently. One signal at the end of the batch keeps the two tools
  strictly alternating.
- **Parallel git worktrees per idea** — real concurrency, but adds worktree
  lifecycle management, merge ordering, and concurrent-write risk on the same IR
  Board doc. Rejected in favor of the simpler sequential queue (user's explicit
  choice).
- **Cross-process polling loop inside `/ilovetask` itself** (Cursor sleeps and
  rechecks `current.json` after each idea instead of looping in one session) —
  ties up a live Cursor agent turn indefinitely and depends on Cursor supporting
  long blocking waits inside a single command invocation. Rejected in favor of
  draining the whole queue in one continuous session and using Claude Code's
  existing `/loop` skill (already built for exactly this "poll external state"
  pattern) for the Claude-side wait instead.

## Consequences

- The first `/ilovetask` per batch still requires the user to open Cursor and
  trigger it manually — full end-to-end automation is blocked on Cursor shipping
  supported Windows `cursor-agent`, not on anything in this repo.
- `/ilovework` must be run inside a `/loop` (or re-invoked manually) to pick up
  completion promptly; it does nothing harmful if run with no active batch, so
  polling it is safe.
- IR Board reporting granularity is per-idea even when a whole batch pushes in one
  commit/push — `completed` in `task-done.json` carries per-idea summaries so each
  idea still gets its own Update/Success Block.
- `.iloveskill/queue.json` and `.iloveskill/task-done.json` join the existing
  gitignored `.iloveskill/` state; no `.gitignore` change needed (the directory is
  already ignored wholesale).
