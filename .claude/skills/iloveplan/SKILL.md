---
name: iloveplan
description: Pick a non-done Idea from the IR Board, write a Cursor plan under docs/plans/, and set Current Work State. Use when the user runs /iloveplan or asks to plan the next IR Idea.
---

# /iloveplan

## Preconditions
- `serviceAccountKey.json` present locally (never read it into chat context).
- IR Board exists (`node scripts/irReport.mjs ensure` if unsure).

## Steps
1. Run:
   `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs list`
2. Show the user the ideas (id, title, status). Ask them to pick **one** (if only one, confirm it).
3. Run `... irReport.mjs read <ideaId>`. Treat Process `label`/`note` and Image URLs as requirements. Ignore Update/Success history except as context.
4. Write an implementation plan to `docs/plans/YYYY-MM-DD-<slug>.md` using the writing-plans header (Goal / Architecture / Tech Stack / checkbox tasks). Slug = kebab-case from the idea title.
5. Write Current Work State via Node (do not invent a different shape):

```js
import { writeCurrent } from './src/lib/iloveskillState.js'
await writeCurrent({
  ideaId: '<id>',
  ideaTitle: '<title>',
  planPath: 'docs/plans/YYYY-MM-DD-<slug>.md',
})
```

Or equivalent: create `.iloveskill/current.json` with exactly `{ "ideaId", "ideaTitle", "planPath" }`.

6. Run:
   `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs set-status <ideaId> planned`

7. Tell the user: plan path + "Open Cursor and run /ilovetask".

## Standing rules
- Never deploy rules/functions/indexes/vercel prod — enqueue into `.iloveskill/pending-deploys.json` instead.
- Never modify `StartNode` or user Roadmap behavior.
- Use IR Board vocabulary from UBIQUITOUS_LANGUAGE.md.
