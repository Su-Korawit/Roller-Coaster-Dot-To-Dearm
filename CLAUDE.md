# CLAUDE.md — I LOVE TCAS

Read `CONTEXT.md` first. It is the authoritative project glossary and architecture reference. Never contradict it.

---

## Collaboration Model

| Tool | Role |
|------|------|
| **Claude Code (terminal)** | Planning, ADRs, scripts, tests, Firestore migrations, Firebase rules |
| **Cursor IDE** | React components, JSX, Tailwind styling, UI wiring |

**Workflow:**
1. Claude Code reads relevant files, writes a plan or ADR
2. Cursor implements the plan in the IDE
3. Claude Code runs tests and verifies the result

---

## Key Commands

```bash
npm run dev                   # Vite dev server → http://localhost:5173
npm test                      # Vitest unit tests (jsdom)
npm run test:rules             # Firestore security rules tests

# Upload Sprout Lands assets to Firebase Storage
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/uploadAssets.mjs

# Upload Sprout Lands assets from the Assets repo (see d:\Ikkyusan\Downloads\Assets)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/pushToFirebase.mjs

# Refresh the /api/mytcas fallback snapshot (run when MyTCAS data is healthy)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run refresh-tcas-snapshot
```

---

## ADR Numbering

Next ADR: the next integer after the highest-numbered file in `docs/adr/`. Path: `docs/adr/NNNN-<kebab-name>.md`.
Template: status (`proposed` → `accepted`), context, decision, considered options, consequences.

---

## Critical Constraints

- **No TypeScript** — plain JS + JSX only. No `.ts`, no type annotations, no tsconfig.
- **Tailwind v4** — tokens in `src/index.css` `@theme`. No `tailwind.config.js`, no `postcss.config.js`.
- **Firestore writes** — always debounced via `syncManager`. Never synchronous direct writes.
- **Firebase paths** — only use `src/lib/db.js` refs/shapes. Never inline `doc(db, 'collection', id)`.
- **Dual backends** — external data → Vercel `/api/*`; payments/business logic → Firebase Functions.
- **`serviceAccountKey.json`** — gitignored. Never read, commit, or log it.
- **React Flow handles** — rotate only the inner element, not the root `<div>` (breaks handle offset math).

---

## Asset Architecture

Firebase Storage bucket: `rollercoasterdottodream.firebasestorage.app`

| Prefix | Contents | Source | Writable by |
|--------|----------|--------|-------------|
| `sprites/`, `ui/`, `audio/` | Sprout Lands (Cup Nooble) | Assets repo push script | Owner only |
| `rc/` | Roller Coaster custom (MBTI sprites, maps, tilesets) | Admin Dashboard upload | Artist |
| `maps/` | Tiled JSON map files | `scripts/uploadAssets.mjs` | Owner only |

**Related repo:** `d:\Ikkyusan\Downloads\Assets` — private GitHub repo `rcd2d-assets-x-sprout-lands-assets`
Contains `meta/catalog.json`, frame grid definitions, and `scripts/pushToFirebase.mjs`.

---

## Project Layout (quick reference)

```
src/
├── components/admin/   Admin dashboard sections (AssetsManagerSection, UpdateAssetsSection…)
├── game/               Phaser scene, assetManifest.js
├── lib/                db.js (Firestore refs), syncManager.js, firestoreListener.js
├── services/           sessionBootstrap, aiTasks, shopAi, aiJourney
├── stores/             Zustand stores (useXStore.js)
└── pages/              One file per route
scripts/                Node one-off scripts (uploadAssets.mjs, pushToFirebase.mjs)
docs/adr/               Architecture decision records
```
