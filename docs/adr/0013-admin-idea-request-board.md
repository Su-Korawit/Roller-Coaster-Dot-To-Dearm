# 0013 — Admin Idea-Request board as a shared roadmapSheets sheet

- **Status:** accepted
- **Date:** 2026-07-11

## Context

Admins need a shared visual board ("IR Board") to collect feature ideas as groups of
connected blocks (text + image), and CLI tooling (ADR 0014) needs to report work
progress back onto the same board. The app already has a full React Flow roadmap
system: `roadmapSheets` collection with `collaboratorUids`, `useRoadmapStore`,
debounced sync via `syncManager`, and a shared node-type registry
(`src/components/roadmap/nodeTypes.js`). The original request also asked to modify
the Start block so it could attach to other blocks.

## Decision

1. **Storage — reuse `roadmapSheets`.** The IR Board is one fixed sheet doc,
   `roadmapSheets/admin-idea-board`. No new collection; sync, rendering, and
   collaboration come for free.
2. **Idea identity — new `ideaRoot` node type.** One Idea = one Idea Root Block plus
   every block attached under it. The root carries `title` and `status`
   (`idea` → `planned` → `in-progress` → `done`). Ideas are enumerable and
   addressable by the root node's id.
3. **Start block unchanged.** The Idea Root Block supersedes requirement 1.1;
   `StartNode` keeps its no-target-handle design and stays user-roadmap-only.
4. **Two report node types — `update` and `success`.** Both store a summary
   (what was done / what is blocked) and a timestamp. They are registered in
   `nodeTypes.js` like every other type but offered only in the IR Board palette.
5. **UI — new AdminPage tab embedding the canvas.** An "Idea-Request" tab in
   `AdminPage` renders the React Flow canvas pointed at the fixed sheet. The tab is
   visible to **every** email in `ADMIN_ROLES`, regardless of section scope — no new
   section key per admin.
6. **Rules.** `firestore.rules` gets a clause allowing read/write of the
   `admin-idea-board` doc for any admin token email (mirroring `ADMIN_ROLES`, as the
   existing section-admin clauses do). Text/image content reuses the existing
   `process` and `image` node types.

## Considered options

- **New `adminIdeaBoard` collection** — cleaner rules, but duplicates store/sync/
  rendering or forces a refactor. Rejected.
- **Idea = connected component (no root block)** — no extra node type, but ideas have
  no title/status, can't be enumerated by the CLI, and merge silently when two groups
  touch. Rejected.
- **Modify Start block to accept incoming edges** — changes long-standing user-facing
  behavior for an admin-only need. Rejected in favor of the Idea Root Block.

## Consequences

- Three new node types (`ideaRoot`, `update`, `success`) enter the shared registry;
  user roadmaps never offer them in the palette but can technically render them.
- The fixed doc id becomes an API contract for the CLI scripts (ADR 0014).
- Adding a future admin email to `ADMIN_ROLES` grants IR access automatically;
  `firestore.rules` must be updated in the same change (existing convention).
