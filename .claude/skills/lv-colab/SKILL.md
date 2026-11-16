---
name: lv-colab
description: Use when the user runs /lv-colab or wants to add a friend/collaborator to this project's GitHub repo.
---

# /lv-colab

Invite a collaborator to the GitHub repo.

## Steps
1. Get owner/name from `git remote get-url origin`.
2. Ask for the friend's GitHub **username** (not email) and permission: `push` (default, can edit), `pull` (read only), `triage`, `maintain`, `admin`. Recommend `push`.
3. Confirm in chat: "Invite `<user>` to `<owner>/<repo>` with `<permission>`?" Sending an invite is outward-facing; wait for a clear yes.
4. Run `gh api -X PUT repos/<owner>/<repo>/collaborators/<user> -f permission=<permission>`.
5. Report the result. Tell the user the friend must accept the invite (GitHub notifications or email), then can `git clone` and use `/lv-create`.
6. Remind: `serviceAccountKey.json` and `.env*` are gitignored and must be shared out-of-band, never in chat or the repo.

List: `gh api repos/<owner>/<repo>/collaborators`. Remove: `gh api -X DELETE repos/<owner>/<repo>/collaborators/<user>` (needs an explicit yes).
