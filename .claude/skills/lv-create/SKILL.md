---
name: lv-create
description: Use when the user runs /lv-create or asks to build a new feature, page, component, script or system in this project. Plans the work, implements it on a feature branch, and commits locally (no push).
---

# /lv-create

Build something new. One command covers plan + implement. No admin board, no queue files.

## Steps
1. **Branch.** If on `main`, create `feat/<kebab-slug>` first. Otherwise stay on the current feature branch.
2. **Clarify.** Read `CONTEXT.md`. Ask the user only for real open decisions (data shape, UX behavior, scope). For anything non-trivial, use superpowers:brainstorming first.
3. **Plan.** Write `docs/plans/YYYY-MM-DD-<slug>.md` (Goal / Architecture / Tech Stack / checkbox tasks). Small changes may skip the file and plan in chat.
4. **Implement** task by task. Use superpowers:test-driven-development wherever a test seam exists. Keep changes surgical. Follow the Critical Constraints in `CLAUDE.md` (no TypeScript, Tailwind v4 tokens, debounced Firestore writes, `src/lib/db.js` refs only).
5. **Commit locally** in logical chunks. Do not push.
6. If a task needs a Firebase/Vercel production deploy, append the exact command to `commands` in `.lv/pending-deploys.json` (create `{ "commands": [] }` if missing). Never run it here.
7. Finish by telling the user: try it with `/lv-preview`, ship it with `/lv-push`.

## Standing rules
- Never push, never deploy, never force anything.
- Never read `serviceAccountKey.json` contents into the transcript.
- Never modify `StartNode` or user Roadmap behavior.
