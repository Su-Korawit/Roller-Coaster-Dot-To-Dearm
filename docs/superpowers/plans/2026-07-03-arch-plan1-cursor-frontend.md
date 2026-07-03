# Architecture Improvement — Plan 1: Cursor Frontend Tasks

> **For agentic workers (Cursor Composer):** Execute tasks in order, one commit per task. Steps use checkbox (`- [ ]`) syntax for tracking. Tasks 2–5 are independent of each other; Task 1 must land before Claude Code's Plan 2 Task 4 (both touch `src/utils/assetFolders.js`).

**Goal:** Cut the 3.37 MB entry bundle via route-level code splitting, drop the ~6 MB bundled MP3, fix whole-store Zustand subscriptions that cause jank, and finish the ADR-0007 `sprites/` → `rc/` upload repoint.

**Architecture:** All changes are JSX/UI wiring within existing modules — no new modules. Code splitting uses `React.lazy` + `Suspense` at the route level plus two component-level splits (Phaser's `GameCanvas`, React Flow's `RoadmapPage`). The upload repoint changes hardcoded Storage path strings only.

**Tech Stack:** React 19, Vite 8, Zustand 5, Firebase Storage, Vitest (jsdom).

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- **Tailwind v4** — tokens in `src/index.css` `@theme`; no config files.
- **Firebase paths** — use `src/lib/db.js` refs/shapes; never inline `doc(db, ...)`.
- **Firestore writes** — always debounced via `syncManager`.
- **React Flow** — rotate only inner elements, never the node root `<div>`.
- Verify with `npm test` (Vitest) and `npm run build` after each task.

---

### Task 1: Repoint artist uploads `sprites/` → `rc/` (finishes ADR-0007 phase 2)

Full context in `docs/superpowers/plans/2026-07-03-rc-assets-jsx-followup.md`. The game runtime already reads `rc/` (`src/utils/mapConfig.js` `DEFAULT_MAP_CONFIGS`, `src/game/assetManifest.js`); these components still upload/list/browse `sprites/`, so every new artist upload lands in the folder the Sprout Lands sync treats as its own.

**Files:**
- Modify: `src/components/admin/AssetsSection.jsx`
- Modify: `src/components/admin/MapConfigEditor.jsx`
- Modify: `src/components/admin/MapInfoScreen.jsx`
- Modify: `src/utils/assetFolders.js`
- Modify: `src/components/admin/FarmItemsTab.jsx`, `src/components/admin/FarmPlantsTab.jsx`, `src/components/ItemSprite.jsx`
- Test: `src/utils/assetFolders.test.js` (update path expectations)

- [ ] **Step 1: `src/utils/assetFolders.js`** — change `SYSTEM_FOLDERS` (lines 4–7):

```js
const SYSTEM_FOLDERS = [
  { path: 'rc/tilesets', displayName: 'Tilesets', isSystem: true, order: 0 },
  { path: 'rc/objects',  displayName: 'Objects',  isSystem: true, order: 1 },
]
```

and in `createFolder` (line 43): `const path = `rc/${slug}``

- [ ] **Step 2: Update `src/utils/assetFolders.test.js`** — replace every `sprites/tilesets` / `sprites/objects` / `sprites/<slug>` expectation with the `rc/` equivalent. Run: `npx vitest run src/utils/assetFolders.test.js` → PASS.

- [ ] **Step 3: `src/components/admin/MapConfigEditor.jsx`** — line 9: `const TILESET_FOLDERS = ['rc/tilesets', 'rc/objects']`; line ~110 upload destination: `` `rc/tilesets/${sanitize(name)}.png` ``

- [ ] **Step 4: `src/components/admin/MapInfoScreen.jsx`** — same pattern: `TILESET_FOLDERS` (line 12), `listAll` folder refs (lines ~132–133, ~210–211), upload destination (line ~180), display path strings (lines ~397, ~406). All `sprites/tilesets`→`rc/tilesets`, `sprites/objects`→`rc/objects`.

- [ ] **Step 5: `src/components/admin/AssetsSection.jsx`** — every `sprites/characters/...` (lines ~116, 133, 141, 160, 205, 224) → `rc/characters/...`

- [ ] **Step 6: Repoint the crops spritesheet reads** — in `FarmItemsTab.jsx` (~line 61), `FarmPlantsTab.jsx` (~line 66), `ItemSprite.jsx` (~line 17): `'sprites/objects/Basic_Plants.png'` → `'rc/objects/Basic_Plants.png'`. Keep each existing local fallback unchanged.

- [ ] **Step 7: Verify no stragglers** — search `src/` for `sprites/characters`, `sprites/tilesets`, `sprites/objects`. Only legitimate remaining hits are Sprout Lands entries inside `src/game/assetManifest.js` and the Sprout-Lands-sync component `UpdateAssetsSection.jsx` (those folders really are Sprout Lands' — do NOT change them).

- [ ] **Step 8: Run full tests** — `npm test` → PASS.

- [ ] **Step 9: Commit** — `git commit -m "fix(admin): repoint artist uploads and crop-sheet reads from sprites/ to rc/ (ADR-0007)"`

---

### Task 2: Route-level code splitting in `App.jsx`

**Files:**
- Modify: `src/App.jsx` (complete replacement below)

**Interfaces:**
- Produces: `LoadingScreen` (module-private) — the existing RequireAuth spinner, reused as the Suspense fallback. No exports change; `App` remains the default export.

- [ ] **Step 1: Replace `src/App.jsx`** with:

```jsx
import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useSelectStore } from './stores/useSelectStore'
import { useAuthStore } from './stores/useAuthStore'
import { getAdminSections } from './constants/admin'

// Route-level code splitting: each page loads on first navigation, keeping the
// entry chunk free of Phaser (HomePage→GameCanvas), React Flow (RoadmapPage),
// Leaflet, and the admin dashboard.
const CareerPage = lazy(() => import('./pages/CareerPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const MasteryPage = lazy(() => import('./pages/MasteryPage'))
const MbtiPage = lazy(() => import('./pages/MbtiPage'))
const ProgramPage = lazy(() => import('./pages/ProgramPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const UniversityPage = lazy(() => import('./pages/UniversityPage'))
const WhyPage = lazy(() => import('./pages/WhyPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'))
const WelcomePage = lazy(() => import('./pages/WelcomePage'))

function LoadingScreen() {
  return (
    <div
      className="h-full flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #0f0824 0%, #1a1035 50%, #0d1f3c 100%)' }}
    >
      <span className="text-5xl mb-5" aria-hidden="true">🎢</span>
      <span className="pixel-font text-[10px] text-purple-300 mb-4">Loading...</span>
      <div
        className="w-48 h-1.5 rounded-full overflow-hidden bg-white/10"
        role="progressbar"
        aria-label="กำลังโหลด"
        aria-busy="true"
      >
        <div
          className="h-full w-1/3 rounded-full animate-loading-slide"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-brand), var(--color-accent-pink), transparent)' }}
        />
      </div>
    </div>
  )
}

function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  return <Outlet />
}

function RootRedirect() {
  const program = useSelectStore((s) => s.program)
  return program ? <Navigate to="/home" replace /> : <RegisterPage />
}

function MobileLayout() {
  return (
    // Full-viewport flex column — fills the screen on every device (phone → desktop).
    // Pages own their own max-width/centering; the game can now go truly fullscreen.
    <div className="h-dvh w-full bg-[#F4F7FC] relative overflow-x-hidden flex flex-col">
      {/* flex-1 so h-full pages get a definite height; overflow-hidden clips panels */}
      <main className="flex-1 relative overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}

function RequireAdmin() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return null
  if (!user || getAdminSections(user.email).length === 0) return <Navigate to="/" replace />
  return <Outlet />
}

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Admin — full-width desktop, outside mobile frame */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* Public — landing + auth, outside the mobile frame so the page can scroll */}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route element={<MobileLayout />}>
          <Route element={<RequireAuth />}>
            <Route path="/start" element={<RootRedirect />} />
            <Route path="/why" element={<WhyPage />} />
            <Route path="/select/mbti" element={<MbtiPage />} />
            <Route path="/select/career" element={<CareerPage />} />
            <Route path="/select/mastery" element={<MasteryPage />} />
            <Route path="/select/university" element={<UniversityPage />} />
            <Route path="/select/program" element={<ProgramPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
```

- [ ] **Step 2: Run tests** — `npm test`. If any test renders a lazy page synchronously and fails, switch its queries to `await screen.findBy...` (lazy components resolve async). Expected: PASS.

- [ ] **Step 3: Build and record chunk sizes** — `npm run build`, then list `dist/assets/*.js`. Expected: multiple chunks; entry `index-*.js` well under 1 MB (Phaser now lives in the HomePage/GameCanvas chunk).

- [ ] **Step 4: Commit** — `git commit -m "perf: route-level code splitting with React.lazy in App.jsx"`

---

### Task 3: Lazy-load `GameCanvas` (Phaser) and `RoadmapPage` (React Flow) inside HomePage

Even with Task 2, HomePage's own chunk would still pull Phaser + React Flow together. Splitting these two lets `/home` paint the header/nav instantly while Phaser streams in, and defers React Flow until the user opens the Roadmap overlay.

**Files:**
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Change imports** — line 1 becomes:

```jsx
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
```

Delete line 20 (`import GameCanvas from '../components/GameCanvas'`) and line 24 (`import RoadmapPage from './RoadmapPage'`). Add after the import block:

```jsx
const GameCanvas = lazy(() => import('../components/GameCanvas'))
const RoadmapPage = lazy(() => import('./RoadmapPage'))
```

- [ ] **Step 2: Wrap the game background** (lines ~186–189) in Suspense with a dark placeholder matching the app's loading gradient:

```jsx
{/* ── GAME BACKGROUND ── */}
<div className="absolute inset-0 z-0">
  <Suspense
    fallback={
      <div
        className="w-full h-full"
        style={{ background: 'linear-gradient(160deg, #0f0824 0%, #1a1035 50%, #0d1f3c 100%)' }}
      />
    }
  >
    <GameCanvas active={activeTab === APP_VIEWS.HOME && !showCalendar} />
  </Suspense>
</div>
```

- [ ] **Step 3: Wrap the roadmap overlay** (lines ~322–327):

```jsx
{/* ── ROADMAP OVERLAY (semi-transparent, game keeps running behind) ── */}
{showRoadmap && (
  <div className="absolute inset-0 z-40 bg-white/20 backdrop-blur-[2px]">
    <Suspense fallback={null}>
      <RoadmapPage onClose={() => setShowRoadmap(false)} />
    </Suspense>
  </div>
)}
```

- [ ] **Step 4: Verify** — `npm run build`: `phaser` must NOT appear in the entry chunk (check with a size report or search chunk contents). `npm run dev`: `/home` renders header immediately, game appears after; Roadmap FAB still opens the overlay.

- [ ] **Step 5: Commit** — `git commit -m "perf: lazy-load GameCanvas (Phaser) and RoadmapPage (React Flow) in HomePage"`

---

### Task 4: Drop the bundled ~6 MB background-music fallback

The code comment at `HomePage.jsx:28-30` already schedules this: *"Drop the bundled fallback to reclaim ~6MB from the build once cloud loading is confirmed."*

**Precondition (do first):** confirm the Storage object `media/audio/Background_Music_1.mp3` streams in dev — run `npm run dev`, open `/home`, press play on the music pill, and check the Network tab shows the audio served from `firebasestorage.googleapis.com` (not the bundled file). If it does not exist in Storage, STOP and report — do not remove the fallback.

**Files:**
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Delete lines 28–31** (the comment block and `const musicFallback = new URL(...)`).

- [ ] **Step 2: Line ~49** — `const musicSrc = useCloudAsset('media/audio/Background_Music_1.mp3', null)`

- [ ] **Step 3: Guard the audio element** (lines ~172–184) so a null URL renders no player:

```jsx
{musicSrc && (
  <audio
    ref={audioRef}
    src={musicSrc}
    onEnded={() => {
      // Loop back to first track seamlessly
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = tracks[0].start
      setCurrentTrackIdx(0)
      audio.play()
      setIsPlaying(true)
    }}
  />
)}
```

(All handlers already guard `if (!audio) return`, so no other change is needed.)

- [ ] **Step 4: Verify** — `npm run build`: no ~6 MB `.mp3` in `dist/assets`. Dev: music still plays. Note: the source file `assets/eachPageAssets/home/Background_Music_1.mp3` is deleted from git by Plan 2 Task 1 — do not delete it here.

- [ ] **Step 5: Commit** — `git commit -m "perf: drop bundled background-music fallback, stream from Storage only"`

---

### Task 5: Replace whole-store Zustand subscriptions with per-field selectors

Calling `useXStore()` with no selector subscribes the component to the entire store — any field change re-renders it. In the 600–850-line panels this is a primary jank source (e.g. every coin tick re-renders all of TaskPanel).

**The transformation** (apply at every site listed; adapt names to what the line actually destructures):

```jsx
// BEFORE — subscribes to the whole store
const { tasks, addTask, toggleTask } = useTaskStore()

// AFTER — one subscription per consumed field
const tasks = useTaskStore((s) => s.tasks)
const addTask = useTaskStore((s) => s.addTask)
const toggleTask = useTaskStore((s) => s.toggleTask)
```

Rules: never build a new object/array inside a selector (`useStore((s) => ({...}))` re-renders every time); setter functions are stable in Zustand so selecting them individually is safe.

**Files (all sites where a store hook is called with no selector):**
- Modify: `src/components/ChatPanel.jsx` (~lines 215, 741 — `useChatStore()`)
- Modify: `src/components/TaskPanel.jsx` (~lines 207 `useTaskStore()`, 209 `useUserStore()`)
- Modify: `src/components/SocialPanel.jsx` (~line 604 — `useSocialStore()`)
- Modify: `src/components/SkillPanel.jsx` (~lines 31, 34, 455)
- Modify: `src/components/CalendarPopup.jsx` (~line 33)
- Modify: `src/components/DailyLoginModal.jsx` (~line 38)
- Modify: `src/components/SettingsSheet.jsx` (~lines 33–34)
- Modify: `src/components/SkillExecutionPopup.jsx` (~lines 125–126)
- Modify: `src/components/profile/JourneyManager.jsx` (~lines 32, 34)
- Modify: `src/components/TaskForm.jsx` (~line 46)

- [ ] **Step 1:** Apply the transformation file by file. After each file: `npm test` → PASS.
- [ ] **Step 2:** Sweep check — search `src/components` for `Store()` (empty parens on a `use*Store` call); expect zero remaining hits in the files above.
- [ ] **Step 3:** Manual smoke in dev — open every panel (Task, News, Profile, Social, Chat, Skill, Calendar, Settings): all render and interact normally.
- [ ] **Step 4: Commit** — `git commit -m "perf: per-field Zustand selectors in panels — stop whole-store re-renders"`
