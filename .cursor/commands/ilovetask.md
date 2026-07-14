---
description: Implement the current IR Idea plan from .iloveskill/current.json, then drain the rest of the multitask queue in the same session
---

# /ilovetask

You are implementing a batch of Ideas from the IR Board.

Pre-authorized: the user approved this whole queue in advance when they ran
`/iloveplan` and picked these ideas. Do not stop to ask for confirmation between
ideas — draining the queue automatically is the point of this command.

1. Read `.iloveskill/current.json`. If missing, stop and tell the user to run
   `/iloveplan` in Claude Code first.
2. Start an empty `completed` list (in this session's memory, not a file yet).
3. Loop:
   a. Read the file at `planPath` from `current.json`.
   b. Follow that plan task-by-task (prefer superpowers:subagent-driven-development
      or executing-plans). Commit locally in logical chunks as you go — do **not**
      push (`git push` is Claude Code's job in `/ilovework`).
   c. Do **not** deploy Firebase rules, functions, indexes, or `vercel --prod`. If a
      task needs a deploy, append the exact shell command as a new string in
      `.iloveskill/pending-deploys.json` under `commands` (create `{ "commands": [] }`
      if missing) and continue with code-only work.
   d. Write a 1-2 sentence summary of what shipped for this idea. Append
      `{ ideaId, ideaTitle, summary }` to the `completed` list.
   e. Read `.iloveskill/queue.json`. If it has items: pop the first one, overwrite
      `.iloveskill/current.json` with it, rewrite `queue.json` without that item, and
      go back to step 3a with the new idea — do not ask the user, this was
      pre-authorized as part of the batch.
   f. If `queue.json` is empty or missing: stop the loop.
4. Write `.iloveskill/task-done.json` with exactly `{ "completed": [...], "finishedAt": "<ISO-8601 now>" }`
   covering every idea processed this session, in order. This is the signal Claude
   Code's `/ilovework` (running in a `/loop`) watches for — do not skip it even if
   the batch was just one idea.
5. Tell the user: "Batch of N idea(s) implemented. Claude Code will pick this up
   automatically via `/loop /ilovework` — no need to switch windows."
