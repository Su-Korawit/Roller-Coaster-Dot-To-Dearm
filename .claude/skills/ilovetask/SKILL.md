---
name: ilovetask
description: Use when the user runs /ilovetask in Claude Code, or when /iloveplan or /ilovefinish hands over a batch whose current idea has executor "claude". Part of the korawit skills (iloveskill series) — implements the Claude-owned segment of the multitask queue.
---

# /ilovetask (Claude Code executor)

Implements Ideas whose `executor` is `"claude"`, mirroring Cursor's
`.cursor/commands/ilovetask.md` for its side of the queue. The user picked this
batch and its executors in `/iloveplan`; work through the Claude-owned segment
idea by idea and report at natural boundaries rather than pausing between ideas.

## Guards (check in order, stop at the first that applies)
1. `.iloveskill/current.json` missing → tell the user to run `/iloveplan` first. Stop.
2. `.iloveskill/task-done.json` already exists → a finished segment is waiting for
   verification. Invoke `/ilovefinish` first; only come back here if it promotes a
   `claude`-owned idea.
3. `current.json` has `executor: "cursor"` (or no `executor` field — legacy files mean
   Cursor) → this segment belongs to Cursor. Best-effort `cursor -r .`, tell the user to
   run `/ilovetask` inside Cursor, and stop. Never implement a Cursor-owned idea here.

## Steps
1. Start an empty `completed` list (in this session's memory, not a file yet).
2. Loop:
   a. Read the file at `planPath` from `current.json`.
   b. Follow that plan task-by-task. Prefer superpowers:subagent-driven-development or
      superpowers:executing-plans for multi-task plans; use
      superpowers:test-driven-development wherever a test seam exists. Keep changes
      surgical — implement what the plan says, no drive-by refactors (karpathy-guidelines).
   c. Commit locally in logical chunks as you go — do **not** push
      (`git push` happens in `/ilovefinish`, after verification).
   d. Do **not** deploy Firebase rules, functions, indexes, or `vercel --prod`. If a
      task needs a deploy, append the exact shell command as a new string in
      `.iloveskill/pending-deploys.json` under `commands` (create `{ "commands": [] }`
      if missing) and continue with code-only work.
   e. Write a 1-2 sentence summary of what shipped for this idea. Append
      `{ ideaId, ideaTitle, summary }` to the `completed` list.
   f. Read `.iloveskill/queue.json` and look at the **first** item:
      - Executor `"claude"` → pop it: overwrite `current.json` with it, rewrite
        `queue.json` without it, and go back to step 2a.
      - Executor `"cursor"` (or missing) → **leave it in the queue** and exit the loop.
        `/ilovefinish` promotes it after verifying this segment.
      - Queue empty or file missing → exit the loop.
3. Write `.iloveskill/task-done.json` with exactly
   `{ "completed": [...], "finishedAt": "<ISO-8601 now>" }` covering every idea processed
   this session, in order — even if the segment was just one idea. This is the same
   hand-back signal Cursor writes, so `/ilovefinish` treats both executors identically.
4. Invoke `/ilovefinish` in this same session to verify, push, and report the segment.

## Standing rules
- Never push, never force-push — that is `/ilovefinish`'s job after tests pass.
- Never run deploy commands — only enqueue into `pending-deploys.json`.
- Never modify `StartNode` or user Roadmap behavior.
- Never read `serviceAccountKey.json` contents into the transcript.
