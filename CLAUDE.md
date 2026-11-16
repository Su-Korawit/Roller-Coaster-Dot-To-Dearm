# CLAUDE.md — I LOVE TCAS

Read `CONTEXT.md` first. It is the authoritative project glossary and architecture reference. Never contradict it.

---

## Collaboration Model

| Tool | Role |
|------|------|
| **Claude Code (terminal)** | Planning, ADRs, scripts, tests, Firestore migrations, Firebase rules, features, bug fixing |
| **Cursor IDE** | Optional: React components, JSX, Tailwind styling, UI wiring |

**Workflow (lv skills — see ADR 0028; no admin/IR Board involvement):**

| Command | What it does |
|---------|--------------|
| `/lv-create` | Plan + build a new feature on a `feat/*` branch, commit locally |
| `/lv-edit` | Tweak existing code, or diagnose-and-fix a bug, commit locally |
| `/lv-preview` | Start the Vite dev server in the browser pane and check the change |
| `/lv-push` | Run tests, push the current branch (never force) |
| `/lv-merge` | Open the PR and merge into `main` after the user's explicit yes |
| `/lv-colab` | Invite a friend as a GitHub collaborator |
| `/unlock-bkb` | Run queued Firebase/Vercel deploys from `.lv/pending-deploys.json` |

Typical flow: `/lv-create` → `/lv-preview` → `/lv-push` → `/lv-merge`. Bugs: `/lv-edit` → `/lv-push`.

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
├── os/                 THE PRODUCT — OsShell, apps.js registry (add apps here), Home, Store, passcode, windows; apps in os/apps/
├── components/admin/   Admin dashboard sections (AssetsManagerSection, UpdateAssetsSection…)
├── game/               Phaser scene, assetManifest.js
├── lib/                db.js (Firestore refs), syncManager.js, firestoreListener.js
├── services/           sessionBootstrap, aiTasks, shopAi, aiJourney
├── stores/             Zustand stores (useXStore.js)
└── pages/              One file per route
scripts/                Node one-off scripts (uploadAssets.mjs, pushToFirebase.mjs)
docs/adr/               Architecture decision records
```

---

## โปรเจกต์นี้ (สรุปสำหรับงาน voice-secretary / ai-handoff)

- **แอปคืออะไร:** I LOVE TCAS คือ OS บนเว็บสำหรับคนเตรียมสอบ TCAS (Login Google → PIN → Home → แอปในหน้าต่าง) ที่ `ilovetcas.com`; แอปรุ่นก่อน OS ยังอยู่ในโค้ดแต่ไม่ใช่หน้าแรก (Reading เปิด `/home` ในหน้าต่าง, Open House เปิด `/openhouse`) ดู README.md และ ADR 0029
- **Stack:** React 19 + Vite 8 (JS/JSX เท่านั้น) · Tailwind v4 (tokens ใน `src/index.css`) · Zustand · Firebase (Auth/Firestore/Functions) · Vercel `/api/*` · Phaser 3
- **คำสั่ง:** `npm run dev` (http://localhost:5173) · `npm run build` · `npm test` (Vitest) · `npm run test:rules` · `npm run lint`
- **Assets:** `public/assets/`, `public/brand/`, `assets/` (build pipeline) และ Firebase Storage (`sprites/ ui/ audio/ rc/ maps/`)
- **สไตล์:** `design.md` (Soft Pixel) และ `ai-handoff/STYLE.md` (ร่าง) สำหรับงานภาพ/น้ำเสียง
- **ฟีเจอร์เลขา AI พี่ใจดี (Retell):** ดู `docs/voice-secretary.md`; ตัวแปรลับอยู่ใน `.env` ฝั่งเซิร์ฟเวอร์เท่านั้น
- **ChatGPT handoff:** `ai-handoff/` (to-chatgpt, from-chatgpt, STATUS.md, STYLE.md, DECISIONS.md)
