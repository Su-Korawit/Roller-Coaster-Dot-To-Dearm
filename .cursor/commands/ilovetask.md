---
description: Implement the current IR Idea plan from .iloveskill/current.json
---

# /ilovetask

You are implementing one Idea from the IR Board.

1. Read `.iloveskill/current.json`. If missing, stop and tell the user to run `/iloveplan` in Claude Code first.
2. Read the file at `planPath`.
3. Follow that plan task-by-task (prefer superpowers:subagent-driven-development or executing-plans).
4. Do **not** deploy Firebase rules, functions, indexes, or `vercel --prod`. If a task needs a deploy, append the exact shell command as a new string in `.iloveskill/pending-deploys.json` under `commands` (create `{ "commands": [] }` if missing) and continue with code-only work.
5. Do not ask which idea to work on — trust Current Work State.
6. When the plan is fully implemented, stop and tell the user to run `/ilovework` in Claude Code.
