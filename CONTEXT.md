# CONTEXT.md — I LOVE TCAS

Mobile-first React web app for Thai students: gamified career planning, MBTI profiling, university/program selection, AI-generated daily tasks, a node-based roadmap builder, social matching, and a PromptPay-backed shop. Firebase is the backend; Vercel hosts the frontend and light serverless functions.

## Brand

- **Wordmark:** `I LOVE TCAS` — all caps, three words. This is the only way to write the brand name (see ADR 0011). Domain: [ilovetcas.com](https://ilovetcas.com).
- **Legacy name:** "Roller Coaster" survives only in internal identifiers that must never be renamed: `rc-*` localStorage keys, `rc/` Storage prefix, Firebase project id / bucket (`rollercoasterdottodream*`), repo / folder / package name.

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
| Testing | Vitest + Playwright; jsdom + @testing-library/react for hook/component tests; separate Firestore-rules suite | 4.1 / 1.60 |

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
    │   ├── school/             SchoolPanel (day view), SubjectDetailPanel (schedule + appointments)
    │   ├── admin/              Admin dashboard sections
    │   ├── profile/            ProfilePanel parts (JourneyManager + presentational)
    │   └── shop/               Shop + payment UI
    ├── stores/                 Zustand stores (useXStore.js)
    ├── hooks/                  Custom React hooks (useXxx.js, incl. useMytcasFetch)
    ├── services/               Business logic: sessionBootstrap, aiJourney, aiTasks, shop*
    ├── utils/                  Pure helpers + syncSelectToFirestore (manual select sync)
    ├── lib/                    Low-level wrappers: db.js, syncManager.js, firestoreListener.js, promptpay.js
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

**Firestore sync** — `useAuthStore.onAuthStateChanged` delegates the whole
post-login sequence to `services/sessionBootstrap.js` (`bootstrapSession` /
`teardownSession`), which hydrates each store then arms its debounced writer:
```js
// services/sessionBootstrap.js — each step isolated in its own try/catch
await hydrateRoadmapFromFirestore(uid)
setRoadmapSyncUser(uid)   // attaches a subscribe → debounced write (~1 s)
```

**SyncManager** (`src/lib/syncManager.js`) — one `createFirestoreSync` factory
backs the tasks/roadmap/portfolio writers (uid + debounce + suppress-on-hydrate
lifecycle held once). It re-exports the original
`hydrate*FromFirestore` / `set*SyncUser` names. `syncSelectToFirestore` stays
separate (manual, no subscription — called from the 5 selection pages).

**Real-time listeners** — `src/lib/firestoreListener.js` `createFirestoreListener()`
owns the onSnapshot detach-before-reattach lifecycle; chat/social/shop stores
hold `attach`/`detach` slots instead of bare module-level unsub refs.

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
shapes.profileFields(select)           // canonical Profile write shape → profile.*
shapes.readProfile(userDoc)            // canonical Profile read (profile.* + legacy fallback)
```

`shapes` is the single seam for the **Profile** (mbti/program/career/masteryTrack/
university). Writers go through `profileFields` (writes under `profile.*`, maps
`mastery → masteryTrack`); every reader goes through `readProfile` (reads
`profile.*`, falls back to legacy top-level fields). `schoolId` stays top-level
because Firestore queries filter on it. See [[Profile]] in Domain Vocabulary.

### API Backends

| What | Where | How |
|---|---|---|
| External data (camphub, MyTCAS) | Vercel `/api/*` | `fetch('/api/camphub')`; MyTCAS falls back to a Storage snapshot (`data/mytcas/`, refreshed via `npm run refresh-tcas-snapshot`) when the live dataset is mid-rebuild between TCAS cycles |
| Payments, business logic | Firebase Cloud Functions | Called via Firebase SDK |
| Dev mocks | Vite middleware in `vite.config.js` | Auto; matches prod routes |

### AI (`src/services/aiTasks.js`, `src/services/shopAi.js`, `src/services/aiJourney.js`)

Gemini via `@google/generative-ai`. Key: `VITE_GEMINI_API_KEY`.
`aiTasks` / `shopAi` use `gemini-2.5-flash`; `aiJourney.generateJourney` (the
dual-track roadmap generator, extracted out of ProfilePanel) uses
`gemini-3-flash-preview`.

---

## Styling

**Tailwind v4** — no config file. Tokens declared in `src/index.css` `@theme`:

```css
@theme {
  --color-brand:        #5c4e92;   /* sprite-outline purple */
  --color-brand-strong: #463c74;
  --color-brand-soft:   #EFEBFA;
  --color-ink:          #2B2550;
  --color-paper:        #FFFFFF;
  --color-leaf:         #5FB57A;   /* background-only: Leaves, fills */
  /* … faculty zone-* tokens, radii, shadow-px — full list in design.md §3 (Soft Pixel, ADR-0021) */
}
```

Use token names as Tailwind classes: `text-brand`, `bg-paper`, `border-line`, `shadow-px`.

**Inline `style`** only for dynamic values or gradients:
```js
style={{ background: 'linear-gradient(135deg, #a78bda, #7c3aed)' }}
```

**React Flow overrides** use `!`-important prefix:
```jsx
className="!w-3 !h-3 !bg-green-400 !border-white !border-2"
```

**Fonts (Soft Pixel):** `.pixel-font` / `font-display` = Chakra Petch (game UI labels + numbers, Thai-capable); `.thai-font` / body = Noto Sans Thai; `.wordmark-font` = Press Start 2P for Latin wordmarks only. Surfaces: `.px-card/-btn/-slab/-sheet/-pressed/-input` (`.neo-*` are aliases). Generated art: `npm run art:build` (ADR-0021).

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

**Restructure in progress (ADR-0012):** the app is being split across subdomains —
`ilovetcas.com` (Hub), `roadmap./tcas./news./school.ilovetcas.com` (Feature sites),
`app.ilovetcas.com` (this full tree). `App.jsx` switches route trees on the Site key
resolved from the hostname; unknown hosts (`*.vercel.app`, `localhost`) resolve to `app`.

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
| **Profile** | The bundle of onboarding selections (mbti, program, career, masteryTrack, university) attached to a User document under `profile.*`. Written via `shapes.profileFields` and read via `shapes.readProfile` (the single shape seam in `src/lib/db.js`); `schoolId` stays top-level because Firestore queries filter on it |
| **Roadmap** | The node-based visual plan a student builds for their career path |
| **Node / Edge** | React Flow graph elements (ProcessNode, ConditionNode, etc.) |
| **Selection** | The set of currently-selected roadmap blocks. Built on desktop via React Flow marquee / Shift-click, on mobile via a Select mode (tap-to-toggle, with Cancel). Duplicate, bulk-delete, and export-selected all act on it |
| **Trash zone** | A drop target shown at the bottom-centre of the canvas only while a block is being dragged; dropping a block on it deletes that block |
| **Setpoint** | The most recently added block; the canvas centres on it when the Roadmap opens (replaces `fitView`) |
| **Roadmap export schema** | Versioned JSON (`{ version, nodes, edges }`) that serialises a Roadmap, or a Selection subset, independently of React Flow's runtime node shape. The contract a future AI generator reads/writes — see ADR-0001; edges may carry an optional additive `type` (`annotation` = dashed free connector) |
| **Sticker** | A curated image node inserted from `STICKER_CATALOG` (university logos via MyTCAS CDN + emoji SVG data-URLs). Premium packs extend the catalog (Epic G) |
| **Journey** | A top-level goal category (e.g. `mastery`, `career`); a user has multiple |
| **Mastery block** | One milestone/step within the mastery journey |
| **Stack / fireStack** | Daily chat interaction credit; one per chat per day; used for social ranking |
| **Match score** | 0–100 compatibility score between two users (program 40 pts, MBTI 15, university 10…) |
| **Capsule** | Active skill timer — a skill the user has committed to for a time window |
| **Coins** | In-app currency earned through streaks, AI tasks, matches |
| **Streak** | Consecutive daily check-in counter with real semantics: advances via `useUserStore.addDailyFeel` (pure math in `src/utils/streakCycle.js` — same-day no-op, yesterday +1, gap resets to 1 flagging `broken`). `lastStreakDate`/`bestStreak` persist through `portfolioSync`. The check-in success screen is the "N Day" Motivation screen (5-dot cycle, deterministic Thai message, reflection saved into the Notebook) |
| **Personal Map** | A user's own instance of the base Phaser world (`test3` tilemap) plus the **Decoration objects** they have placed. Persisted at `maps/{ownerUid}` in Firestore. Distinct from **Roadmap** (the React Flow career plan) |
| **Subject** | A School System entry (`{ id, name, color, description }`) representing one class/course. Owns weekly **Schedule slots** and **Appointments**. Persisted at `users/{uid}.school.subjects` via `useSchoolStore` |
| **Schedule slot** | A recurring weekly time block for a Subject: `{ id, subjectId, day, startTime, endTime }`. `day` is one of `sun`..`sat`; does not carry a specific calendar date |
| **Appointment** | A dated School System item under a Subject — homework or a graded checkpoint: `{ id, subjectId, title, kind, dueDate, completed, createdAt, completedAt }`. `kind` is `homework` or `checkpoint`. Completing one awards Coins and a streak stack the same way a Task does |
| **Note** | A School System journal entry: `{ id, date, subjectId, text, createdAt, updatedAt }`. `subjectId: null` means a general daily note; otherwise it's tied to a Subject. At most one Note exists per `(date, subjectId)` pair — `useSchoolStore.upsertNote` enforces this. Export/import use a versioned schema (`src/utils/notebookExport.js`) mirroring ADR-0001's Roadmap export approach |
| **TCAS Event** | An admin-curated milestone in the `tcasEvents` collection: `{ title, description, date, link }`. Students browse them in NewsPanel's TCAS70 tab (timeline split passed/upcoming); "Add to Calendar" copies one into the student's own School System as a subject-less Appointment with `kind: 'tcas'` |
| **Timetable Template** | A community-published copy of a student's subjects + schedule slots (`timetableTemplates` collection, versioned id-less schema via `src/utils/timetableTemplate.js`). Immutable once published; delete own or super-admin. Importing merges through `useSchoolStore.importTimetable`, skipping same-name subjects |
| **Entitlement** | A purchased unlockable under `users/{uid}.entitlements.{itemId}` (Functions-owned, like Coins). Bought via the `purchaseEntitlement` callable from the `entitlementCatalog` collection; gates read `useEntitlementsStore` (plan slots, AI daily cap, premium stickers) |
| **Decoration object** | One item a user places on their Personal Map: `{ key, x, y }`. `key` is a stable item identifier from `src/constants/mapItems.js`; `spriteKey` is the Phaser texture key used to render it |
| **Visit** | Rendering another user's Personal Map and joining its live presence room. The viewer is the **visitor**; the map's `ownerUid` is the **owner** |
| **Map room / presence** | The set of users currently inside a given Personal Map, broadcast in real time via RTDB at `/worlds/{ownerUid}/players/{uid}` |
| **Farm plot** | One planted tile on a Personal Map: `{ plantId, plantedAt, tileX, tileY }` for the anchor tile; satellite tiles of a multi-tile plant store `{ anchorKey }`. Persisted under `maps/{ownerUid}.farm` in Firestore via `farmSync` |
| **Article** | A published page of the content site at `articles/{slug}` (`ilovetcas.com/blog/<slug>`). Written only by the `publishArticle` Cloud Function from a validated **Draft**; public read, no client writes. Body is TipTap JSON stored as a string and rendered through the whitelist renderer (`src/content/renderBody.js`). ADR-0022 |
| **Draft** | A creator's working copy at `articleDrafts/{draftId}` (random id). Creator/author-only. Server-owned fields `publishedSlug`, `publishedAt`, `isLive` record what is live; the slug is claimed at first publish and immutable after |
| **Studio** | The in-app article editor at `app.ilovetcas.com/studio` (list, TipTap editor with 2 s autosave, preview, publish checks). Lazy-loaded so TipTap stays out of the entry bundle |
| **Creator** | A user with the `creator: true` custom claim, granted by the super-admin (`grantCreatorRole`, Admin → Hub). Can write drafts and publish their own articles; the super-admin sees all drafts |
| **Hub config** | `siteConfig/hub`: LINE OpenChat link, rules and moderators, featured article slug, `openHouseEnabled`. Public read, super-admin write (Admin → Hub) |
| **Farm gold** | Sandbox currency earned by selling produce at in-game Shops. Stored in `useInventoryStore.gold` and persisted under `users/{uid}.farmGold`. Entirely separate from **Coins** (real PromptPay currency managed by Cloud Functions) — farm code must never write to `Coins` |
| **Farm persistence** | Auto-debounced Firestore writes via `farmSync` (plots → `maps/{uid}`) and `inventorySync` (hotbar / storage / farm gold → `users/{uid}`). There is no manual save, no localStorage, and no 30-second timer — `syncManager` handles all writes on store mutation |
| **Farm map (`test2`)** | The friend-authored farm map, registered in `mapConfigs` as key `test2` (displayName "test2") and uploaded to Storage `maps/test2.json`. It is the only map carrying the full documented layer set (`Ground`/`FarmGround`/`Plants`/`Objects`/`Collision` tile + `Spawns`/`Portals` object). Reached by a Portal from the main world `map`; its own exit Portal returns to `map`/`Main` |
| **FarmGround layer** | The Tiled **tile** layer named `FarmGround` (part of the documented Map Admin required-layers set). Any non-empty cell is a **plantable tile** — there is no `FarmZones` object layer. `parseMapMeta` derives `farmTiles: Set<"x_y">` from this layer; the scene checks the player's tile against that set each frame |
| **Plants layer** | The Tiled **tile** layer named `Plants` — static, friend-authored decorative plants (trees/bushes). Crops are NOT painted here: they render as dynamic Phaser sprites from `useFarmStore.plots` at a depth between `FarmGround` and the player (see [[0004-server-authoritative-game-state]]) |
| **Farm Action button** | A React overlay button that appears when the player stands on a plantable FarmGround tile. Player taps it to open SeedPicker (empty plot) or trigger harvest (ready plot). Does NOT auto-open on tile entry. Touch events on the button do not propagate to the Phaser canvas, so they cannot be misread as joystick or tap-to-move commands. Works with both joystick and tap-to-move control modes |
| **Visitor crop view** | A visitor hydrates the owner's farm via `hydrateFarmFromFirestore(ownerUid)` then computes crop growth deterministically from `plantedAt` + `PlantData.growTime`. No extra real-time sync is needed — growth is a pure function of time. `visitMap` is always called after GameCanvas boot (from `ChatPanel`), so `currentMapKey` is guaranteed set before hydration |
| **Interactions layer** | A Tiled **object** layer named `Interactions` holding in-map action zones (distinct from `Portals`, which change maps). Each object is a rectangle with an `action` property: `action: 'shop'` (+ `shopId`) or `action: 'chest'`. `parseMapMeta` classifies objects — `target` → portal, `action` → interaction zone |
| **Shop zone** | An `Interactions` object with `action: 'shop'`. Player entering the zone fires `'shopEntered'` (auto-opens `ShopUI`); exiting fires `'shopExited'`. Uses the same physics-overlap mechanism as Portals |
| **Chest zone** | An `Interactions` object with `action: 'chest'`. Player entering fires `'chestOpened'` (auto-opens `StorageUI`); exiting fires `'chestClosed'`. Uses the same physics-overlap mechanism as Portals |
| **Farm Data Catalog** | The three Firestore-backed collections that define all game content: `farmPlants` (plant definitions), `farmItems` (item/seed/produce definitions), `farmShops` (in-game shop definitions). Previously hardcoded in `PlantData.js`, `ItemData.js`, `ShopData.js`; those JS files now serve only as seed defaults written to Firestore on first hydration when the collections are empty |
| **Farm Data Store (`useFarmDataStore`)** | Zustand store holding the hydrated Farm Data Catalog: `{ plants: {}, items: {}, shops: {} }`. Populated by `hydrateFarmDataFromFirestore` during `sessionBootstrap`. All game code that previously imported `PLANTS`/`ITEMS`/`SHOPS` from static JS files now reads from this store |
| **Farm Shop sell list** | The array of `{ itemId, price }` pairs embedded in a `farmShops` document. Each shop sets its own `price` per item independently of the item's `buyPrice` in `farmItems` — different shops on different maps may sell the same item at different prices |
| **RC assets** | Roller Coaster custom-drawn assets (MBTI character sprites, Tiled maps, custom tilesets) stored under `rc/` in Firebase Storage. Never overwritten by the Sprout Lands asset sync. Uploaded directly via the Admin Dashboard file manager. |
| **Sprout Lands assets** | Pixel art assets by Cup Nooble stored under `sprites/`, `ui/`, `audio/` in Firebase Storage. Sourced from the private `rcd2d-assets-x-sprout-lands-assets` repo; pushed via `scripts/pushToFirebase.mjs`. |
| **Asset sync** | The process of downloading Sprout Lands assets from Firebase Storage `sprites/`, `ui/`, `audio/` to a local folder. Triggered by the Admin Dashboard "Update Assets" button; uses `window.showDirectoryPicker()` (Chrome/Edge only). Never touches `rc/`. |
| **Spotify connection** | A user's linked Spotify account. The OAuth **refresh token** + `spotifyUserId`, stored in the private subcollection `users/{uid}/private/spotify` (owner-only; kept out of the world-readable user doc). Managed via `refs.spotifyAuth(uid)` / `shapes.spotifyConnection`. See ADR-0010. Distinct from **musicConfig** (admin-authored background music for the game/welcome). |
| **Connect remote** | The app acting as a Spotify **Connect** controller: it sends Web API playback commands but plays no audio itself — sound comes from the user's own active Spotify **device**. Requires Spotify Premium. |
| **Active device** | A Spotify client (phone app, desktop app, speaker) currently reachable by the Connect API. Absence surfaces as `NO_ACTIVE_DEVICE` (404); the Music UI then prompts the user to open Spotify or pick a device via `transferPlayback`. |
| **MiniPlayer / PlayerSheet** | The persistent now-playing bar mounted in `MobileLayout` (**MiniPlayer**) and its expanded full-control bottom sheet (**PlayerSheet**: search, playlists, transport, device picker). PlayerSheet's body is the reusable **SpotifyControls**, also embedded in **MusicPanel** (the unified Background + Spotify panel the HomePage music pill opens). |
| **Hub** | The ILOVEPDF-style tool-grid homepage at `ilovetcas.com` — marketing + SEO only, no auth state, no game assets. Replaces WelcomePage at the apex; WelcomePage moves to `app.ilovetcas.com/`. See ADR-0012 |
| **Feature site** | One public tool on its own subdomain (`roadmap.` builder, `tcas.` คณะ/มหาลัย search, `news.` ข่าว+ปฏิทิน TCAS, `school.` ตารางเรียน+การบ้าน+to-do). Guest-usable, wrapped in `FeatureLayout` (slim header, login-in-place), never behind `RequireAuth`. MBTI is deliberately not one |
| **Site key** | `hub \| roadmap \| tcas \| news \| school \| app` — resolved from `window.location.hostname` by `src/lib/site.js` (`?site=` dev override); `App.jsx` picks its route tree from it. Unknown hosts (`*.vercel.app`, `localhost`) → `app` |
| **Guest mode** | Using a Feature site with no session: work survives refresh through the stores' own persist keys (`rc-roadmap-store`, `rc-school-store`); the `rc-guest-dirty` marker (written by `services/guestMerge.js` only when a store mutates while logged out) records that it is guest work. Manual tool use is free; AI actions are login-gated. No Firebase Anonymous Auth (ADR-0012) |
| **Guest merge** | At login, `sessionBootstrap` snapshots marked guest work **before** hydration overwrites the stores, then resolves after: cloud side empty → silent additive merge (roadmap via `importRoadmap` id-remap, school via `importTimetable` name-skip + id-guarded appointments/notes); cloud has data → **GuestMergeDialog** asks keep-or-discard. Never overwrites either side |
