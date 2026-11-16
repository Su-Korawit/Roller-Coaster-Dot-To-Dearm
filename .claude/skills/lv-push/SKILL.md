---
name: lv-push
description: Use when the user runs /lv-push or wants to verify and push current work to GitHub. Runs tests, pushes the current branch (never force), and lists queued deploys.
---

# /lv-push

The single verify-then-push gate for `/lv-create` and `/lv-edit`.

## Steps
1. `git status`. Commit any remaining work in logical chunks with clear messages.
2. Run `npm test`. If `firestore.rules`, `storage.rules` or indexes changed vs `main`, also run `npm run test:rules` (or `test:rules:emu`). Never report green without running it this session; quote real failing output.
3. **Any failure:** do not push. Report what failed and stop.
4. **All green:** `git push -u origin <current-branch>`. Push directly to `main` only if the user is already on `main` and says so. Never force-push.
5. If `.lv/pending-deploys.json` has commands, list them and tell the user to run `/unlock-bkb` to execute them (a separate, deliberate step).
6. Report in one short message: branch pushed, tests run, deploys waiting. Suggest `/lv-merge` when the branch is ready for `main`.

## Standing rules
- Never run deploy commands here; only list them.
- Never force-push. Never read `serviceAccountKey.json` contents.
