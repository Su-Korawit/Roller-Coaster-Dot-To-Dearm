---
name: unlock-bkb
description: Run every queued permission-heavy deploy command from pending-deploys.json in one authorized batch, then clear the queue. Use when the user runs /unlock-bkb.
---

# /unlock-bkb

1. Read `.iloveskill/pending-deploys.json`. If missing or `commands` is empty, say so and stop.
2. Print the full queue to the user and ask for a single yes/no confirmation.
3. On yes: run each command **sequentially** in a shell from the repo root. Stop on first non-zero exit; leave remaining commands in the queue.
4. On full success: write `{ "commands": [] }` (or delete the file) and report what ran.
5. This is the **only** skill allowed to run firebase/vercel production deploys for the iloveskill series.
