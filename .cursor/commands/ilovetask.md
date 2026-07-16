---
description: Implement the Cursor-owned segment of the IR Idea queue from .iloveskill/current.json — drain consecutive executor:"cursor" ideas in the same session, stopping at Claude-owned ones
---

# /ilovetask

You are implementing a batch of Ideas from the IR Board.

Pre-authorized: the user approved this whole queue in advance when they ran
`/iloveplan` and picked these ideas. Do not stop to ask for confirmation between
ideas — draining the queue automatically is the point of this command.

1. Read `.iloveskill/current.json`. If missing, stop and tell the user to run
   `/iloveplan` in Claude Code first. If its `executor` is `"claude"`, stop and tell
   the user this segment runs in Claude Code (`/ilovetask` there) — only ideas with
   `executor: "cursor"` (or no `executor` field, in legacy files) belong to Cursor.
2. Start an empty `completed` list (in this session's memory, not a file yet).
3. Loop:
   a. Read the file at `planPath` from `current.json`.
   b. Follow that plan task-by-task (prefer superpowers:subagent-driven-development
      or executing-plans). Commit locally in logical chunks as you go — do **not**
      push (`git push` is Claude Code's job in `/ilovefinish`).
   c. Do **not** deploy Firebase rules, functions, indexes, or `vercel --prod`. If a
      task needs a deploy, append the exact shell command as a new string in
      `.iloveskill/pending-deploys.json` under `commands` (create `{ "commands": [] }`
      if missing) and continue with code-only work.
   d. Write a 1-2 sentence summary of what shipped for this idea. Append
      `{ ideaId, ideaTitle, summary }` to the `completed` list.
   e. Read `.iloveskill/queue.json` and look at the **first** item:
      - `executor` is `"cursor"` or missing → pop it: overwrite
        `.iloveskill/current.json` with it, rewrite `queue.json` without that item,
        and go back to step 3a with the new idea — the whole batch was picked up
        front in `/iloveplan`.
      - `executor` is `"claude"` → **leave it in the queue** and stop the loop; that
        segment runs in Claude Code (`/ilovefinish` promotes it after verifying this
        one).
   f. If `queue.json` is empty or missing: stop the loop.
4. Write `.iloveskill/task-done.json` with exactly `{ "completed": [...], "finishedAt": "<ISO-8601 now>" }`
   covering every idea processed this session, in order. This is the signal Claude
   Code's `/ilovefinish` (running in a `/loop`) watches for — do not skip it even if
   the batch was just one idea.
5. Tell the user: "Cursor segment of N idea(s) implemented. Claude Code will pick this
   up automatically via `/loop /ilovefinish` — no need to switch windows." If the loop
   stopped at a Claude-owned idea, add that the batch continues in Claude Code after
   verification.
