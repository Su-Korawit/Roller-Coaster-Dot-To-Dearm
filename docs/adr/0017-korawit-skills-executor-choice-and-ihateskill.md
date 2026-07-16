# 0017 — korawit skills: per-idea executor choice + ihateskill series

- **Status:** accepted
- **Date:** 2026-07-16

## Context

ADR 0014/0015 shipped the iloveskill series (`/iloveplan` → `/ilovetask` →
`/ilovework` + `/unlock-bkb`) with a hard assumption baked in: Cursor is the only
implementer. Every queued idea was a Cursor idea, `/ilovework` could only mean
"waiting on Cursor", and bug fixing had no workflow at all — bugs were handled ad
hoc, outside the queue, the verification gate, and the IR Board reporting.

Three asks: (1) let `/iloveplan` choose **per idea** whether Claude Code or Cursor
implements it — logic-heavy work (scripts, tests, rules, services) fits Claude Code's
role in the collaboration model and shouldn't detour through Cursor; (2) rename
`/ilovework` to `/ilovefinish` — the skill verifies and finishes work, it doesn't do
the work; (3) add a bug-fixing counterpart to the feature pipeline.

The upgrade folds in techniques from the installed skill libraries (obra/superpowers
and Matt Pocock's `~/.agents/skills`): the `diagnose` skill's feedback-loop-first
debugging, superpowers' systematic-debugging and verification-before-completion, and
TDD regression tests.

## Decision

**Umbrella name: korawit skills** = the iloveskill series (features) + the
ihateskill series (bugs). Both converge on the same finish gate.

| Command | Series | Lives in | Runs in |
| --- | --- | --- | --- |
| `/iloveplan` | iloveskill | `.claude/skills/iloveplan/` | Claude Code |
| `/ilovetask` | iloveskill | `.claude/skills/ilovetask/` **(new)** | Claude Code |
| `/ilovetask` | iloveskill | `.cursor/commands/ilovetask.md` | Cursor |
| `/ilovefinish` | both | `.claude/skills/ilovefinish/` (renamed from `ilovework`) | Claude Code |
| `/ihatefix` | ihateskill | `.claude/skills/ihatefix/` **(new)** | Claude Code |
| `/unlock-bkb` | both | `.claude/skills/unlock-bkb/` | Claude Code |

**Per-idea executor.** Queue items and `current.json` gain an `executor` field
(`"claude"` | `"cursor"`; missing = `"cursor"` for legacy files, applied as a
write-time default in `src/lib/iloveskillState.js`). `/iloveplan` recommends an
executor per idea (UI-heavy → cursor, logic-heavy → claude) and the user overrides.

**Segments, not interleaving.** The queue stays one sequential list. Each executor
drains the **consecutive run of its own ideas** starting at `current.json`, then
writes the same `task-done.json` signal Cursor already used. When either
`/ilovetask` hits a queue head owned by the other executor, it leaves the item in
the queue and ends its segment. `/ilovefinish` verifies/pushes/reports the finished
segment, then promotes the queue head: a `claude` head chains straight into the
Claude `/ilovetask` in the same session; a `cursor` head launches Cursor and waits
on the existing `/loop` pattern. This preserves ADR 0015's core invariant — the two
tools never edit the working tree concurrently — while making all-Claude batches
fully automatic end to end.

**`/ilovework` → `/ilovefinish`.** Straight rename (`git mv`), no alias directory;
the skill text tells Claude to treat a `/ilovework` request as `/ilovefinish`.
Deploys via `/unlock-bkb` now run only when the **whole queue** is drained, not at
segment boundaries — a mid-batch deploy would change the environment under the
remaining ideas.

**ihateskill series: `/ihatefix`.** Bugs skip plan files and the queue: intake →
build a deterministic feedback loop → reproduce → 3–5 falsifiable hypotheses →
instrument (tagged `[DEBUG-...]` probes) → regression test at the correct seam
before the fix → cleanup → local commit. It then appends per-bug entries to the
same `task-done.json` (with `ideaId: null` when the bug has no IR Board Idea) and
invokes `/ilovefinish` — one verify-push-report gate for both series.
`/ilovefinish` skips irReport calls for `ideaId: null` entries. A guard stops
`/ihatefix` from racing a mid-flight Cursor segment on the same working tree.

## Considered options

- **Parallel executors (Claude and Cursor working different ideas at once)** —
  rejected; ADR 0015 already rejected concurrent edits on one working tree, and the
  executor field doesn't change that calculus.
- **Reordering the queue to group all claude ideas before cursor ideas** — fewer
  hand-offs, but silently changes the user's chosen work order. Rejected; the user's
  order wins, hand-offs are cheap.
- **Keeping `/ilovework` as a deprecated alias skill** — a second skill with the
  same body invites drift. Rejected in favor of a one-line redirect note inside
  `/ilovefinish`.
- **A separate finish gate for `/ihatefix`** — duplicate verify/push/report logic
  that would drift from `/ilovefinish`. Rejected; `ideaId: null` entries cost one
  conditional.
- **`/ihatefix` ideas as IR Board Ideas required up front** — bugs often arrive in
  chat, not on the board. Optional `ideaId` keeps board reporting when it exists
  without blocking quick fixes.

## Consequences

- All-Claude batches run end to end in one terminal with no window switching;
  mixed batches pause once per Cursor segment (unchanged from ADR 0015's Cursor
  limitation on Windows).
- Cursor's `/ilovetask` must be told about `executor` (done in this change);
  legacy `current.json`/`queue.json` files without the field still behave as
  before (Cursor-owned).
- `task-done.json` entries may now carry `ideaId: null`; anything else reading the
  signal must tolerate that.
- The old `/ilovework` name disappears from skills; ADR 0014/0015 text stays
  historical and is superseded on this point by this ADR.
- UBIQUITOUS_LANGUAGE.md gains the korawit-skills vocabulary (executor, segment,
  ihateskill series, `/ilovefinish`, `/ihatefix`).
