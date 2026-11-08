# CONTEXT.md — I LOVE TCAS

A web **OS for Thai TCAS students**, at `ilovetcas.com` and `app.ilovetcas.com`: sign in with Google → device passcode → Home (app icons, wallpaper, clock) → apps open in windows. Apps: Goal, Habit, Reading, Community, Chat, Mood, Block, Secretary (AI), Calendar, Open House, Report, plus a Store of installable apps and websites (ADR-0029). Firebase is the backend; Vercel hosts the frontend and light serverless functions.

> **Two generations live in this repo.** The **OS** (`src/os/`) is the product users see. The **pre-OS app** (MBTI onboarding, tasks, skills, social match, the Phaser home) is still routed (`/home`, `/roadmap`, …) but is no longer the front door. Parts of it run *inside* OS apps: Reading frames `/home` (the study room), Open House frames `/openhouse`, Block reuses the Roadmap. Sections below marked **(pre-OS)** describe that older layer; the glossary tags each term.

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
    ├── os/                     THE PRODUCT: OsShell, apps.js registry, Home, Store, passcode, windows; apps in os/apps/
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

Defined in `src/App.jsx`; it picks a route tree from the **Site key** (hostname, `src/lib/site.js`). Vercel `vercel.json` rewrites all paths → `index.html` (SPA).

```
app site (app.ilovetcas.com, localhost, *.vercel.app)
  /                OsShell (login → consent → passcode → Home)      ← the product
  /welcome         old landing page
  /home            HomePage (Phaser study room) — framed by the Reading app
  /roadmap         RoadmapPage (RequireAuth)
  /openhouse       Open House campus (guest-usable) — framed by the Open House app
  /admin           RequireAdmin
  /studio/*        RequireCreator (article editor)
  /auth /privacy /terms /news/:id /dev/ui (dev only)
hub site (ilovetcas.com, www)
  /                OsShell (ADR-0029 apex-homepage)
  /articles /blog/:slug /category/:cat /search   content site
  /openhouse /privacy /terms
  /home /roadmap /auth /admin  → redirect to app.ilovetcas.com
roadmap. / tcas. / news. / school.  feature sites (ADR-0012)
```

`ilovetcas.com` and `www` must be in Firebase Authentication → Authorized domains. Auth session, passcode and Home layout are per origin (ADR-0029).

**(pre-OS)** The `/select/*`, `/why`, `/skills`, `/tasks` onboarding routes from the first app no longer exist in the route tree.

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

The OS terms come first, down to **Guide** (OS). Every term after that belongs to the **pre-OS** app or to the study-room / Open House games that the Reading and Open House apps frame; they stay valid for that code.

| Term | Meaning |
|---|---|
| **OS / OS shell** | The product front door (`src/os/OsShell.jsx`, served at `/` on `ilovetcas.com` and `app.ilovetcas.com`). State machine: loading → login → consent (PDPA) → set/unlock passcode → Home. Remounted per uid so accounts never share unlocked state |
| **Device passcode** | 6-digit PIN per device, SHA-256 salted with the uid (`rc-os:<uid>:<pin>`), stored in localStorage `rc-os-pass-<uid>`. Never sent to Firestore. Unlock state is memory-only (refresh locks). Forgotten → sign in with Google again. `src/os/passcode.js` |
| **OS app** | One entry in `RAW_APPS` of `src/os/apps.js` (id, name, tagline, Icon, tone, category, features, `load`). Lazy-loaded component in `src/os/apps/XxxApp.jsx`, rendered in an **App window** with `{ onOpenApp }`. Adding a feature = adding an app |
| **Built-in app** | `builtIn: true` (Store, Settings): always on Home, cannot be removed |
| **Installable / defaultInstalled** | `installable` apps are listed in the Store and added or removed by the user; `defaultInstalled` ones are put on every device once (Goal, Habit, Reading, Community, Chat, Mood, Block, Secretary, Report, Calendar, Open House) |
| **Store** | The built-in app catalogue: search, category chips (`CATEGORIES`), banners, detail page with reviews. Install = simulated download (`installer.js`) then the app lands on Home. Holds OS apps, external **Link apps** (`storeLinks.js`) and **University apps** (one per myTCAS university, from `src/data/universityApps.js`) |
| **Link app / University app** | An app that only opens a website (`LinkApp`) inside the window via iframe; sites that forbid framing (`embed: false`, `NO_EMBED_IDS`) show an "open in new tab" card |
| **Home** | `HomeScreen`: paged grid of **tokens** (app id, `f:<folderId>`, `file:<fileId>`; pure logic in `homeLayout.js`), wallpaper, clock, drag to reorder, folders, dropped files (≤ 20, ≤ 5 MB, bytes in IndexedDB). Phones/tablets: status bar on top; desktop: taskbar at the bottom |
| **App window** | `AppWindow` + `windowsLogic.js`: desktop windows drag, maximize, minimize to taskbar chips; phone/tablet windows are full-screen. Minimized windows stay mounted |
| **Splash** | Launch screen of an app with art (`splash` in registry, `src/os/splash/AppSplash.jsx`): key art, name, progress bar, ~2 s. Websites open without one. Cutscenes were removed |
| **useOsStore** | Per-device OS preferences (`rc-os-store`): wallpaper, installed apps, Home order, folders, files, avatar choice, `guideSeen`. Not synced to Firestore |
| **useLifeStore** | The OS's synced data (`users/{uid}.os`, debounced via `createFirestoreSync`): goals, plan tasks, habits, books, reading log. `ownerUid` + `adoptUser()` clear the cache when another account signs in |
| **Goal (OS)** | Up to 5 target programmes (`goals`, `primaryGoalId`); primary drives `target`, scores, Habit, the Community room and Secretary. Source of programmes and score weights is MyTCAS (`/api/mytcas`); TCAS Starter (`/api/tcasin`) only when MyTCAS has no match |
| **Study plan** | Deterministic planner (`src/os/studyPlan.js`: weighted round-robin by score gap, 15-minute units, up to 200 days, each subject studied until its own exam day). The AI only adds a Thai strategy note and a tip per subject |
| **Secretary / พี่ใจดี** | AI secretary app: asks before acting, makes schedules, chat (Gemini) and voice call (Retell via `/api/voice`, consent + daily quota). See `docs/voice-secretary.md` |
| **OS room (Community/Chat)** | `osRooms/{roomId}/messages`; `roomId` = faculty + major (any university) or `general`, derived into `users/{uid}.osRoomId` for security rules |
| **App review / Report** | `osAppReviews/{appId}_{uid}` (one per user, 1–5 stars, ≤ 500 chars). Report app: `osRequests` + `osRequestVotes`, one vote per user, only a super-admin changes status |
| **Guide** (OS) | Welcome tour on first run (`guideContent.js`, `OsGuide`) and per-app "วิธีใช้" tips behind `?`. Not the same as the pre-OS **Guide** below |
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
| **Subject** | A School System entry (`{ id, name, color, description }`) representing one class/course. Owns weekly **Schedule slots** and **Appointments**. Persisted at `users/{uid}.school.subjects` via `useSchoolStore` |
| **Schedule slot** | A recurring weekly time block for a Subject: `{ id, subjectId, day, startTime, endTime }`. `day` is one of `sun`..`sat`; does not carry a specific calendar date |
| **Appointment** | A dated School System item under a Subject — homework or a graded checkpoint: `{ id, subjectId, title, kind, dueDate, completed, createdAt, completedAt }`. `kind` is `homework` or `checkpoint`. Completing one awards Coins and a streak stack the same way a Task does |
| **Note** | A School System journal entry: `{ id, date, subjectId, text, createdAt, updatedAt }`. `subjectId: null` means a general daily note; otherwise it's tied to a Subject. At most one Note exists per `(date, subjectId)` pair — `useSchoolStore.upsertNote` enforces this. Export/import use a versioned schema (`src/utils/notebookExport.js`) mirroring ADR-0001's Roadmap export approach |
| **TCAS Event** | An admin-curated milestone in the `tcasEvents` collection: `{ title, description, date, link }`. Students browse them in NewsPanel's TCAS70 tab (timeline split passed/upcoming); "Add to Calendar" copies one into the student's own School System as a subject-less Appointment with `kind: 'tcas'` |
| **Timetable Template** | A community-published copy of a student's subjects + schedule slots (`timetableTemplates` collection, versioned id-less schema via `src/utils/timetableTemplate.js`). Immutable once published; delete own or super-admin. Importing merges through `useSchoolStore.importTimetable`, skipping same-name subjects |
| **Entitlement** | A purchased unlockable under `users/{uid}.entitlements.{itemId}` (Functions-owned, like Coins). Bought via the `purchaseEntitlement` callable from the `entitlementCatalog` collection; gates read `useEntitlementsStore` (plan slots, AI daily cap, premium stickers) |
| **Leaves** | The study currency. Credited once, at the end of a verified focus session, by the `endFocus` / `abandonFocus` functions (`floor(verified minutes × rate × completion bonus)`; rate 1 Flexible / 1.5 Strict, ×1.1 when the planned time was reached; a withered Strict session earns 0). Stored at `users/{uid}.leaves`, Functions-owned like **Coins**; never purchasable with Coins. ADR-0023 |
| **Study room** | The student's own room, where the app opens: the generated `room` map (`MapScene` with `room: true`) plus furniture sprites drawn from their **Room layout**. Replaced the Personal Map and the farm |
| **Room layout** | `rooms/{uid}`: `{ tier, theme, placed: [{ itemId, x, y, slot? }], petId }`, positions in px on an 8 px grid. Written only by the `saveRoomLayout` function (validated against inventory and catalog); the client reads it and the editor checks the same rules (`src/room/placement.js`) |
| **Room catalog** | `roomCatalog/{itemId}`: `{ name, kind, price, footprint, spriteKey, frames, deskSlot?, tierMin, hidden? }`. Public read, super-admin write (Admin → Rooms); seeded from `src/data/roomCatalogSeed.js` |
| **Room inventory** | `users/{uid}.roomInventory.{itemId}`: copies owned. Functions-owned; the layout may place at most as many copies as are owned |
| **Welcome pack** | `claimWelcomePack`: 100 Leaves + the starter furniture, once per account (`users/{uid}.welcomePack = 'v2'`) |
| **Focus mode** | `strict` (Leaves ×1.5; hidden > 10 s or a lapsed check-in withers the tree) or `flexible` (×1; away > 2 min withers it, verified minutes still count). Chosen at `startFocus` with a planned 10–120 minutes; the tree species (sprout < 25, shrub 25–49, tree 50–89, blossom ≥ 90) follows the planned time |
| **Desk slot** | A spot on the desk (`left`, `centre`, `right`, `back`) for small items with `deskSlot: true`; such a placement carries the desk's x/y plus the slot name |
| **Hotbar** | The 7-slot item bar at the bottom of the home screen (replaced `BottomNavBar` and the ≡ menu). Defaults: focus, warp, calendar (plan once ready), tasks, chat, shop, profile. Order stored in `users/{uid}.hotbar` (guests `rc-hotbar`), repaired on read; `warp` may move but never leaves the bar |
| **Bag** | The fixed button after the hotbar: every item (hotbar items and bag-only tools: calendar, mastery, roadmap, school, news, music, friends, settings, guide, contact developer). Tap an item to use it; "ใส่ในช่อง" then a slot puts it on the bar |
| **Warp** | Moving between places from the Warp sheet: the room, the campus (when its map exists) and the School Hub. "ไปต่อ" resumes at the stored **Resume point**, "ไปจุดเริ่มต้น" uses the map's spawn |
| **Resume point** | `users/{uid}.resume = { last, points: { [mapKey]: { x, y, facing, label, at } } }`, unscaled map px, newest `at` wins on merge; used at boot only if the map is enterable and the point walkable (never the School Hub) |
| **Guide** | The hands-on first-run: practice focus → buy → decorate → warp (→ plan later). A step ends only when the student does it; impossible steps are skipped. Progress `users/{uid}.guide` (guests `rc-guide`); replay from Bag → คู่มือ |
| **Practice focus** | `startFocus({ practice: true })`: flexible, 1 minute, pays a one-time 10 Leaves (≥ 45 s verified) and sets `users/{uid}.practiceRewarded` (Functions-owned); writes no `focusDaily` or `focusXp` |
| **Plan entry** | A program in the student's TCAS plan (`users/{uid}.profile.plans[]`, v2): `{ programId, universityId, round 1–4 or null, rank 1–10 (round 3 only), projectName, scores, minGpax, checklist }`; old `{ id, university, program }` entries are upgraded on load. Capped by the plan slots |
| **Auto checklist** | The to-do list of a plan entry derived from its project: GPAX ≥ x, one item per exam subject, Portfolio (round 1), interview; the student ticks, adds and deletes their own items; regenerating keeps ticks |
| **Subject goal** | Focus hours for one exam subject across the whole plan (default `20 + round5(60 × maxWeight/100)` h, editable); hours studied are `users/{uid}.focusBySubject.{key}` (ms, Functions-owned), counted from focus sessions started with a valid `subjectKey` |
| **Tier** | A permanent room upgrade bought in order with Leaves (`tier_1` 14×10, `tier_2` + lake balcony, `tier_3` + second room). The layout's `tier` must be owned; footprints must fit inside one floor area (`TIER_AREAS`). The room map holds a shell per tier (layers `Floor/Wall/Decor`, `_t1`…`_t3`). ADR-0027 |
| **Theme** | A whole-room swap of floor, walls and window (`minimal` free; `library_wood`, `cafe`, `night_sky` 1,500 Leaves). Applied by remapping tiles at runtime; `layout.theme` is the part after `theme_` |
| **Pet** | One active pet per room (`layout.petId`: orange cat, black cat, shiba, bunny; 600 Leaves). Walks, grooms, sleeps (on a `pet_bed`), sits beside the player during focus, shows a heart when tapped; pure state machine `src/game/petBehaviour.js` |
| **Avatar / Wardrobe** | `users/{uid}.avatar = { accessories: { head, face, neck, back }, outfitHue }`, Functions-owned (written only by `saveAvatar`). Accessories are overlay sprites in the MBTI frame order; the outfit hue is a recoloured copy of the character sheet |
| **Studygram card** | The 4:5 (1080×1350) share image of a finished focus session: the student's room as it is now, the session's tree and time (big, bottom right) and a small `day N, ilovetcas.com` tag; goal faculty and streak are opt-in; never any name, school or e-mail. Save image or Web Share |
| **Visit** | Looking at a friend's study room read-only (`useVisitStore`): their layout and pet, presence in `worlds/{owner}/maps/room`; every editing path refuses until "กลับห้องของฉัน" or any warp |
| **Open House** | The guest-usable campus at `/openhouse` (hub and app sites, outside `RequireAuth`) and map key `campus` (reached by Warp): 18 faculty buildings, a hall with a directory board and a gate around twin quads and a lake. Entering a building shows every admission path into that faculty across universities. ADR-0026 |
| **Faculty building** | One of 18 sprites on the campus (`med dent pharm vet allied sci it eng arch law comm pol hum biz tour fine edu agri`), each in a zone (health, sci, soc, biz, arts, earth); `src/constants/openHouseBuildings.js`, positions in `src/game/campusLayout.js`. MyTCAS group 90 is split into law/comm/pol/hum by keyword rules |
| **Open House index** | Precomputed public files `data/mytcas/openhouse/index.json` and `{buildingId}.json` (universities → programs → rounds 1–4 → projects with seats, min GPAX, score weights, interview, link) written by `scripts/refreshOpenHouseIndex.mjs` (owner-run, dry run by default, refuses a smaller index). The popup never crawls MyTCAS |
| **Door zone** | A one-row strip under a faculty building (`Interactions` object `door_<id>`, `action: 'building'`): standing in it shows the "เข้าตึก" action; leaving it (debounced) closes the popup. The hall's directory zone (`action: 'directory'`) opens the directory board |
| **Auto-walk** | Tile pathfinding (`src/game/autoWalk.js`) that walks the avatar to a door from the minimap, the directory board or the Warp sheet's building list; any player input cancels it |
| **Article** | A published page of the content site at `articles/{slug}` (`ilovetcas.com/blog/<slug>`). Written only by the `publishArticle` Cloud Function from a validated **Draft**; public read, no client writes. Body is TipTap JSON stored as a string and rendered through the whitelist renderer (`src/content/renderBody.js`). ADR-0022 |
| **Draft** | A creator's working copy at `articleDrafts/{draftId}` (random id). Creator/author-only. Server-owned fields `publishedSlug`, `publishedAt`, `isLive` record what is live; the slug is claimed at first publish and immutable after |
| **Studio** | The in-app article editor at `app.ilovetcas.com/studio` (list, TipTap editor with 2 s autosave, preview, publish checks). Lazy-loaded so TipTap stays out of the entry bundle |
| **Creator** | A user with the `creator: true` custom claim, granted by the super-admin (`grantCreatorRole`, Admin → Hub). Can write drafts and publish their own articles; the super-admin sees all drafts |
| **Hub config** | `siteConfig/hub`: LINE OpenChat link, rules and moderators, featured article slug, `openHouseEnabled`. Public read, super-admin write (Admin → Hub) |
| **Interactions layer** | A Tiled **object** layer named `Interactions` holding in-map action zones (distinct from `Portals`, which change maps). Each object is a rectangle with an `action` property: `action: 'shop'` (+ `shopId`) or `action: 'chest'`. `parseMapMeta` classifies objects — `target` → portal, `action` → interaction zone |
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
