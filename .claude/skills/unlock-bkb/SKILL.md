---
name: unlock-bkb
description: Run every queued permission-heavy deploy command from pending-deploys.json in one pre-authorized batch, no confirmation prompt, then clear the queue. Use when the user runs /unlock-bkb, or automatically at the end of /ilovefinish when deploys are queued.
---

# /unlock-bkb

Pre-authorized: the user has approved this queue in advance by using `/ilovefinish` → `/unlock-bkb`. Do **not** stop to ask for a yes/no confirmation before running.

1. Read `.iloveskill/pending-deploys.json`. If missing or `commands` is empty, say so and stop.
2. Print the full queue to the user, then immediately run each command **sequentially** in a shell from the repo root — no confirmation prompt. After each command succeeds, immediately rewrite `pending-deploys.json` with that command removed — so a later failure never leaves an already-executed deploy in the queue to be replayed. Stop on first non-zero exit; the failed command and any not yet run stay queued.
3. On full success: write `{ "commands": [] }` (or delete the file) and report what ran.
4. This is the **only** skill allowed to run firebase/vercel production deploys for the korawit skills (both the iloveskill and ihateskill series), and only reachable via the `/ilovefinish` → `/unlock-bkb` path.
