---
name: unlock-bkb
description: Run every queued permission-heavy deploy command from .lv/pending-deploys.json in one batch, then clear the queue. Use only when the user runs /unlock-bkb (/lv-push and /lv-merge just remind about it).
---

# /unlock-bkb

The user running `/unlock-bkb` is the approval. Do not ask a second yes/no.

1. Read `.lv/pending-deploys.json`. If missing or `commands` is empty, say so and stop.
2. Print the full queue, then run each command **sequentially** from the repo root. After each success, immediately rewrite the file with that command removed, so a later failure never replays an executed deploy. Stop on the first non-zero exit; the failed command and the rest stay queued.
3. On full success write `{ "commands": [] }` and report what ran.
4. This is the **only** skill allowed to run firebase/vercel production deploys.
