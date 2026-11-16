---
name: lv-merge
description: Use when the user runs /lv-merge or wants to land a finished feature branch into main. Opens (or finds) the PR, checks tests, and merges after the user's explicit yes.
---

# /lv-merge

Land the current branch into `main`.

## Steps
1. Refuse if on `main`. Run `git status`; if dirty or unpushed, run `/lv-push` first.
2. Merge `main` into the branch (`git fetch origin && git merge origin/main`), resolve conflicts, re-run `npm test`.
3. Find or create the PR: `gh pr view` / `gh pr create --base main` (title and body summarise the change; end the body with the attribution line from the harness).
4. Show the user: PR link, diff size, test result. **Ask for an explicit yes before merging.** Merging is outward-facing and hard to undo.
5. On yes: `gh pr merge --squash --delete-branch` (`--merge` if the user wants history kept). Then `git checkout main && git pull`.
6. If `.lv/pending-deploys.json` has commands, remind the user about `/unlock-bkb`.

## Standing rules
- Never merge without the user's yes for this PR. Never force-push. Never enable auto-merge unless asked.
