# CONTEXT.md — Roller Coaster Dot To Dearm

Mobile-first React web app for Thai students: gamified career planning, MBTI profiling, university/program selection, AI-generated daily tasks, a node-based roadmap builder, social matching, and a PromptPay-backed shop. Firebase is the backend; Vercel hosts the frontend and light serverless functions.

---

## Tech Stack

| Layer | Library / Tool | Version |
|---|---|---|
| UI framework | React + Vite (`@vitejs/plugin-react`) | 19.2 / 8.0 |
| Language | JavaScript + JSX — **no TypeScript, no tsconfig** | — |
| Styling | Tailwind CSS via `@tailwindcss/vite` — **no tailwind.config or postcss files** | 4.2 |
| State | Zustand | 5.0 |
| Routing | React Router DOM | 7.14 |
| Graph editor | `@xyflow/react` (React Flow) | 12.11 |
| Game engine | Phaser 3 (embedded background game) | 3.88 |
| Maps | Leaflet + react-leaflet | 1.9 / 5.0 |
| Drag-and-drop | `@hello-pangea/dnd` | 18.0 |
| Icons | lucide-react | 1.8 |
| AI | Google Generative AI (Gemini 2.5 Flash) | 0.24 |
| Backend | Firebase (Auth, Firestore, Storage, RTDB, Functions) | 12.13 |
| Payments | PromptPay QR (`promptpay-qr`) + SlipOK API verification | — |
| Serverless | Vercel `/api/*` (external data) + Firebase Cloud Functions (payments) | — |
| Testing | Vitest + Playwright; separate Firestore-rules suite | 4.1 / 1.60 |

---

## Folder Structure

```
/
├── api/              Vercel serverless functions (camphub.js, mytcas.js)
├── assets/           Static assets for build pipeline
├── functions/        Firebase Cloud Functions (Node 22)
├── public/           Vite public dir (maps, assets)
├── scripts/          One-off scripts (uploadAssets.mjs)
├── test/rules/       Firestore security-rules tests (vitest.rules.config.js)
└── src/
    ├── App.jsx                 Route definitions + layout guards
    ├── main.jsx                React root entry
    ├── firebase.js             Firebase init + env validation
    ├── index.css               Tailwind import + @theme tokens + global animations
    ├── pages/                  One file per route (PascalCase)
    ├── components/
    │   ├── ui/                 Atomic UI primitives (Button, BottomSheet, Toggle…)
    │   ├── roadmap/            Node-based flow editor nodes + ruler
    │   ├── admin/              Admin dashboard sections
    │   └── shop/               Shop + payment UI
    ├── stores/                 Zustand stores (useXStore.js)
    ├── hooks/                  Custom React hooks (useXxx.js)
    ├── services/               Business logic + AI calls (Gemini, shop credit)
    ├── utils/                  Pure helpers + Firestore sync utilities
    ├── lib/                    Low-level wrappers: db.js, promptpay.js
    ├── constants/              App-wide constants (SCREAMING_SNAKE exports)
    ├── data/                   Static JSON / JS data files
    └── game/                   Phaser asset manifest
```

---

## State Management (Zustand)

One store per concern. All stores live in `src/stores/`.

**Selector pattern:**
```js
const user = useUserStore((s) => s.user)
```

**Setter naming:** verbs — `setUser`, `addTask`, `updateNodeData`, `toggleTask`.

**Persistence** — `persist` middleware writes to localStorage with `rc-*` keys:
```js
create(persist((set) => ({ ... }), { name: 'rc-select-store' }))
```

**Firestore sync** — hydrate on auth, then debounce-push on subscribe:
```js
// In useAuthStore.js onAuthStateChanged
await hydrateRoadmapFromFirestore(uid)
setRoadmapSyncUser(uid)   // attaches a subscribe → debounced write (~1 s)
```

**Real-time listeners** held in module-level refs (not in Zustand state):
```js
let _chatsUnsub = null
// cleared and re-attached in loadChats(uid)
```

**Sync utilities:** `src/utils/syncRoadmapToFirestore.js`, `syncTasksToFirestore.js`, `syncSelectToFirestore.js`, `syncPortfolioToFirestore.js`.

---

## Data Layer

### Firebase (`src/lib/db.js`)

Central hub for all Firestore paths. Do **not** inline `doc(db, 'collection', id)` calls — use the factories here:

```js
refs.user(uid)                         // DocumentRef
refs.chat(chatId)
cols.users                             // CollectionRef
cols.chatMessages(chatId)
queries.chatsByMember(uid)             // Query
queries.messagesByChat(chatId)
shapes.initialUser(firebaseUser, opts) // Document-shape factory
```

### API Backends

| What | Where | How |
|---|---|---|
| External data (camphub, MyTCAS) | Vercel `/api/*` | `fetch('/api/camphub')` |
| Payments, business logic | Firebase Cloud Functions | Called via Firebase SDK |
| Dev mocks | Vite middleware in `vite.config.js` | Auto; matches prod routes |

### AI (`src/services/aiTasks.js`, `src/services/shopAi.js`)

Gemini 2.5 Flash via `@google/generative-ai`. Key: `VITE_GEMINI_API_KEY`.

---

## Styling

**Tailwind v4** — no config file. Tokens declared in `src/index.css` `@theme`:

```css
@theme {
  --color-brand:        #a78bda;   /* primary purple */
  --color-brand-strong: #7c3aed;
  --color-brand-soft:   #f0eeff;
  --color-accent-pink:  #d93d8c;
  --color-ink:          #1a1035;
  --color-surface:      #ffffff;
}
```

Use token names as Tailwind classes: `text-brand`, `border-accent-pink`, `bg-surface`.

**Inline `style`** only for dynamic values or gradients:
```js
style={{ background: 'linear-gradient(135deg, #a78bda, #7c3aed)' }}
```

**React Flow overrides** use `!`-important prefix:
```jsx
className="!w-3 !h-3 !bg-green-400 !border-white !border-2"
```

**Fonts:** `.pixel-font` = Press Start 2P (retro); `.thai-font` / body = Noto Sans Thai.

---

## Routing

Defined in `src/App.jsx`. Guards wrap layout:

```
RequireAdmin  →  /admin
MobileLayout
  RequireAuth
    /why, /select/*, /home, /roadmap, /skills, /tasks
AuthPage, RegisterPage  (public)
```

Vercel `vercel.json` rewrites all paths → `index.html` (SPA).

---

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Component files | `PascalCase.jsx`, default-export fn | `ProcessNode.jsx` |
| Stores | `camelCase.js` | `useRoadmapStore.js` |
| Utils / services / lib / hooks / constants | `camelCase.js` | `computeSnapPosition.js` |
| Constants exports | `SCREAMING_SNAKE` | `APP_VIEWS`, `ADMIN_EMAILS` |
| Folders | lowercase | `components/roadmap/` |
| Tests | colocated `name.test.js` | `computeSnapPosition.test.js` |
| Props — handlers | `onVerb` | `onClose`, `onSelect` |
| Props — state | adjective/noun | `selected`, `isOpen`, `disabled` |

---

## Roadmap Feature

Central visual feature. Files:

- `src/pages/RoadmapPage.jsx` — ReactFlow canvas, toolbar
- `src/components/roadmap/ProcessNode.jsx` — rounded-rect task block
- `src/components/roadmap/ConditionNode.jsx` — diamond decision node
- `src/components/roadmap/StageLabelNode.jsx` — decorative stage label
- `src/components/roadmap/ImageNode.jsx` — attachable image block
- `src/components/roadmap/TimelineRuler.jsx` — zoom-synced timeline
- `src/stores/useRoadmapStore.js` — nodes + edges graph state
- `src/utils/computeSnapPosition.js` — alignment/snapping math
- `src/utils/findProximityConnection.js` — magnetic edge-connect detection

**Critical invariant — ConditionNode:** The root `<div>` must remain un-rotated. React Flow computes handle offsets from the root element's bounding box; rotating the root misaligns all handles. Rotation belongs on the inner diamond `<div>` only.

---

## Precautions

- **No TypeScript.** Don't add type annotations expecting compilation.
- **Tailwind v4 tokens** go in `@theme` in `index.css`, not a config file.
- **Firestore writes are debounced.** Don't force synchronous writes; use the `sync*ToFirestore` utilities.
- **Dual backends.** External data → Vercel `/api`. Business logic / payments → Firebase Functions. Don't mix them.
- **`serviceAccountKey.json`** is at repo root and gitignored. Never commit or expose it.
- **Secrets** are `VITE_*` env vars (`.env`, gitignored). Client-side exposure is intentional for Firebase/Gemini; payment secrets (`VITE_SLIPOK_API_KEY`, `VITE_PROMPTPAY_NUMBER`) are more sensitive — don't log them.
- **React Flow `!`-important** classes are required for handle/node style overrides; Tailwind's specificity loses to React Flow's inline styles without them.

---

## Domain Vocabulary

| Term | Meaning |
|---|---|
| **Roadmap** | The node-based visual plan a student builds for their career path |
| **Node / Edge** | React Flow graph elements (ProcessNode, ConditionNode, etc.) |
| **Journey** | A top-level goal category (e.g. `mastery`, `career`); a user has multiple |
| **Mastery block** | One milestone/step within the mastery journey |
| **Stack / fireStack** | Daily chat interaction credit; one per chat per day; used for social ranking |
| **Match score** | 0–100 compatibility score between two users (program 40 pts, MBTI 15, university 10…) |
| **Capsule** | Active skill timer — a skill the user has committed to for a time window |
| **Coins** | In-app currency earned through streaks, AI tasks, matches |
| **Streak** | Consecutive daily login / task-completion counter |
