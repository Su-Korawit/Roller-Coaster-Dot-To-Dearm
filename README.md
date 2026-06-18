# 🎢 Roller Coaster

A mobile-first **productivity RPG** for Thai high school and early university students. Real-life growth — choosing a career path, building mastery, studying for TCAS, and maintaining social relationships — is framed as a game with pixel-art aesthetics, AI-powered guidance, and a live social layer.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v4 (`pixel-font` custom class throughout) |
| Routing | React Router v6 |
| State | Zustand (persisted localStorage + in-memory) |
| Backend | Firebase — Auth, Firestore, Storage, Realtime DB |
| AI | Google Gemini (`gemini-2.5-flash`, `gemini-3-flash-preview`) |
| Maps | Leaflet.js + Google Maps Places API |
| Drag & Drop | `@hello-pangea/dnd` |

---

## Environment Variables

```env
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_DATABASE_URL
VITE_GEMINI_API_KEY
VITE_GOOGLE_MAPS_KEY
```

---

## Feature Status

Status key:
- ✅ **Available** — Fully implemented and active.
- 🚧 **Under Development** — Exists in the codebase but not yet visible to users, or the implementation is incomplete.
- ❌ **Deprecated** — Removed from active use.

### Authentication & Onboarding
| Feature | Status | Notes |
|---|---|---|
| Google OAuth sign-in | ✅ | Firebase popup flow |
| Email / password sign-in & registration | ✅ | Firebase Auth |
| Two-way Firestore ↔ localStorage sync | ✅ | On every selection + on login |
| MBTI selection (16 types, pixel-art characters) | ✅ | Step 1 of 5; live animated sprite preview per type; rich Thai descriptions (strengths, weaknesses, learning style) |
| Career selection (946 careers — 23 curated MBTI-filtered + 923 O*NET via search) | ✅ | Step 2 of 5 |
| Mastery track selection (18 tracks, career-filtered) | ✅ | Step 3 of 5 |
| University selection (30+ Thai institutions) | ✅ | Step 4 of 5 |
| Program / major selection | ✅ | Step 5 of 5 — also stores TCAS round |

### Home Screen
| Feature | Status | Notes |
|---|---|---|
| Phaser 3 pixel-art game (live interactive background) | ✅ | Fullscreen Phaser 3.88.0 game in RESIZE mode; tracks viewport on all devices via ResizeObserver; player sprite locked to selected MBTI type; collision with trees, fences, and walls on outdoor map |
| Background music player (4 spliced tracks) | ✅ | Marquee track name, play/pause, track list |
| Streak (🔥 totalStacks) + coin display | ✅ | |
| Calendar FAB (left-side shortcut) | ✅ | Single button; always shows Planner / Calendar |
| Multi-slot passive skill FABs (3 slots) | 🚧 | Logic exists in `useSkillStore`; home screen now shows one hardcoded Calendar button only |
| Daily mood check-in modal | 🚧 | `DailyLoginModal` is implemented but the trigger is currently disabled — modal will not appear on login |
| Mood heatmap (past-year grid) | 🚧 | `MoodHeatmap` component exists inside `DailyLoginModal`; hidden while modal is disabled |
| Contact Developer FAB | ✅ | Opens admin chat; hidden for the admin account itself |

### Task System
| Feature | Status | Notes |
|---|---|---|
| Task CRUD (create, edit, delete, complete) | ✅ | All persisted to localStorage |
| Drag-and-drop task reordering | ✅ | `@hello-pangea/dnd` |
| Task scheduling (assign to calendar date) | ✅ | `scheduledDate` field, shown in CalendarPopup |
| Active skill assignment per task | ✅ | Skill execution popup (Ignite, Capsule, etc.) |
| Task sharing to chat | ✅ | Share sheet in TaskPanel |
| AI-generated daily micro-task | ✅ | Requires a pinned mastery block; Gemini builds prompt from block + past notes |
| AI reflection & progress evaluation | ✅ | On AI task completion; summary appended to journey block, `progress` incremented |
| Coins awarded on task completion | ✅ | `rewardCoins` from task metadata |

### Skill System
| Feature | Status | Notes |
|---|---|---|
| Skill purchase with coins | ✅ | `useSkillStore.buySkill()` |
| Active skill equipping (4 slots) | ✅ | Any owned active skill can be assigned |
| Passive skill equipping (slot system) | ✅ | `useSkillStore` supports 3 slots; slot-unlock thresholds at stacks ≥ [1, 3, 7] |
| **Planner 📅** — Calendar FAB shortcut | ✅ | Tapping the FAB opens CalendarPopup directly |
| **Ignite 🚀** — 5-second countdown before task start | ✅ | Active skill |
| **Capsule ⏳** — 30-min lock timer, +50% coins if on time | ✅ | Active skill |
| **Draw 🎴** — randomly selects a pending task | ✅ | Active skill |
| **Revive 🛡️** — restore a broken streak (once/month) | ✅ | Active skill |
| **Spark ✨** — +2 bonus coins on every task completion | 🚧 | Purchasable; effect not yet applied at task completion |
| **Flow 🔗** — ×1.1–1.3 coins for back-to-back tasks | 🚧 | Purchasable; multiplier logic not yet applied |
| **Depth 🏆** — ×1.5 coins for tasks > 60 min | 🚧 | Purchasable; multiplier logic not yet applied |
| **Grace 💖** — skip 1 streak penalty per week | 🚧 | Purchasable; streak-penalty logic not yet applied |

### Profile
| Feature | Status | Notes |
|---|---|---|
| Avatar upload & compression | ✅ | Stores base64 in Firestore to prevent CORS issues; also supports "restore Google photo" |
| Display name & bio editing | ✅ | 100-char bio cap |
| Privacy toggles (public / followers) per field | ✅ | Fires Firestore update on every toggle |
| AI Output Language toggle (Thai / English) | ✅ | Stored in `useUserStore.aiLanguage` |
| Portfolio circles with image upload | ✅ | Mastery / Career / University circles now support custom images; synced to Firestore |
| Journey blocks (drag-drop, pin, progress) | ✅ | Per portfolio category; credited friend avatar stack; synced to Firestore |
| AI Roadmap Generator | ✅ | Gemini 5-step dual-track plan (skill mastery + TCAS Round 3) |
| Reset Onboarding | ✅ | Navigates to `/select/mbti` |
| Sign Out | ✅ | Clears all local state + Firebase `signOut()` |

### Social
| Feature | Status | Notes |
|---|---|---|
| School map (Leaflet, nearby users) | ✅ | Tap marker → PublicProfileSheet |
| School picker (Google Places Autocomplete) | ✅ | Thailand-restricted; prompted when no school is set |
| Discover tab (search + nearby users) | ✅ | Live Firestore query; cards sorted by match score |
| Follow / Unfollow | ✅ | Atomic Firestore `writeBatch` |
| Follow requests (accept / decline) | ✅ | Atomic batch updates both users |
| Match score calculation | ✅ | Client-side; persisted to `users/{uid}/matches/{targetUid}` |
| KawaiiMatchOverlay (score ≥ 60) | ✅ | Full-screen animated overlay with particles, score bar, profile card |
| No-match toast (score < 60) | ✅ | Slides down from top, auto-dismisses after 2 s |
| Matched tab (history of matches ≥ 60) | ✅ | Sorted by score; 💬 Chat button when mutually following |
| PublicProfileSheet (privacy-filtered) | ✅ | Portfolio + journey visible based on follow relationship |

### Chat
| Feature | Status | Notes |
|---|---|---|
| 1-to-1 real-time messaging | ✅ | Firestore `messages` subcollection |
| Fire stack (+1 per chat per calendar day) | ✅ | Earned through chatting only (see note below) |
| Gift sending (🌟 10 / 💎 30 / 🚀 50 coins) | ✅ | `GiftModal` in chat window |
| Task sharing to chat | ✅ | `CreditModal` — tags a friend on a completed task |
| Admin / developer chat | ✅ | Contact Developer FAB creates `chatId` with `ADMIN_UID` |
| Friends tab (mutual follows) | ✅ | Shows mutual-follow chat threads |
| School tab | 🚧 | Renders "Coming Soon" placeholder |
| World tab | 🚧 | Renders "Coming Soon" placeholder |

### News
| Feature | Status | Notes |
|---|---|---|
| News panel UI with 2 tabs | ✅ | Camphub tab + RollerCoaster (App Updates) tab; share-to-chat button per item |
| Camphub live feed | ✅ | Vercel serverless function (api/camphub.js) scrapes camphub.in.th/computer/ real-time via cheerio, caches 30 min |
| RollerCoaster (App Updates) | ✅ | Admin (`o.korawitt@gmail.com`) adds app announcements via bottom sheet; stored in Firestore `appUpdates` collection; real-time sync via onSnapshot |
| Update badges | ✅ | 3 types — ใหม่ (green) / อัปเดต (blue) / แก้บั๊ก (orange) |
| Admin update form | ✅ | Add title, description, badge type, optional image URL; form inside NewsPanel |
| Admin delete button | ✅ | Firestore updates only; delete icon visible to admin only |

### Calendar / Planner
| Feature | Status | Notes |
|---|---|---|
| Month-view calendar popup | ✅ | Shows tasks by `scheduledDate` |
| Task scheduling from calendar | ✅ | Tapping a day assigns `scheduledDate` |
| Calendar FAB on home screen | ✅ | Always available (no longer gated by equipping Planner) |

---

### Deprecated Features
| Feature | Status | Notes |
|---|---|---|
| Fire stacks from daily mood check-in | ❌ | Mood check-in modal is disabled; stacks are now earned **only through chatting** (+1 per chat per calendar day) |

---

## Project Structure

```
src/
├── components/          # All panel/sheet components
├── pages/               # Route-level pages (onboarding + home)
├── stores/              # Zustand state (auth, user, tasks, social, chat, skills)
├── data/                # Static data (onboarding options, skill catalog)
├── utils/               # Firebase sync helpers
├── constants/           # APP_VIEWS enum
└── firebase.js          # Firebase app, auth, db, rtdb, storage exports
```

---

## Authentication & Routing

All routes are wrapped in `RequireAuth`. Firebase Auth state resolves first; a loading screen shows in the interim.

```
/                → RootRedirect
                   └─ program set? → /home
                   └─ not set?     → RegisterPage (onboarding start)
/why             → WhyPage
/select/mbti     → MbtiPage
/select/career   → CareerPage
/select/mastery  → MasteryPage
/select/university → UniversityPage
/select/program  → ProgramPage
/home            → HomePage (main app shell)
*                → redirect /
```

If unauthenticated, `AuthPage` renders inline instead of redirecting. Supports Google OAuth and email/password sign-in.

---

## Onboarding (5 Steps)

Each page writes to `useSelectStore` (persisted localStorage) **and** calls `syncSelectToFirestore(uid)` immediately after every selection.

| Step | Page | Selects | Firestore path |
|---|---|---|---|
| 1 | MbtiPage | MBTI type (16 options with pixel-art character illustrations) | `users/{uid}.profile.mbti` |
| 2 | CareerPage | Career aspiration (20 careers, MBTI-filtered) | `users/{uid}.profile.career` |
| 3 | MasteryPage | Mastery track (filtered by career) | `users/{uid}.profile.masteryTrack` |
| 4 | UniversityPage | Target university | `users/{uid}.profile.university` |
| 5 | ProgramPage | Academic program (shows TCAS round) | `users/{uid}.profile.program` |

**Career families** used in match scoring: Analysts (NT), Diplomats (NF), Sentinels (SJ), Explorers (SP).

### Two-way sync on login

`onAuthStateChanged` delegates the whole post-login sequence to
`services/sessionBootstrap.js` (`bootstrapSession`), each step isolated in its
own `try/catch`:
1. `ensureUserDoc` — creates `users/{uid}` via `shapes.initialUser` if missing (writes selections under `profile.*`)
2. `hydrateSelectStoreFromFirestore(uid)` — **Firestore-wins**: reads the doc through `shapes.readProfile` (resolves `profile.*` with a legacy top-level fallback) and overwrites local; if the doc has no `profile.*` yet, backfills it from local
3. each store hydrates then arms its debounced writer via SyncManager (`set*SyncUser`)

Selections made later are pushed by `syncSelectToFirestore(uid)` (called from the
5 selection pages) using `shapes.profileFields` → `setDoc(..., { merge: true })`.

---

## Firestore Data Model

### `users/{uid}`

```
uid, displayName, email, photoURL     ← from Firebase Auth / SettingsSheet
mbti, program, university, mastery    ← flat top-level: LEGACY, old docs only.
                                        Read via shapes.readProfile fallback;
                                        new docs no longer write these.
schoolId, schoolName, schoolLat, schoolLng
followRequests[], followers[], following[], sentRequests[]
matchScore, fireStacks
createdAt

profile: {                            ← CANONICAL. Written by shapes.initialUser
  mbti, career, masteryTrack,           + syncSelectToFirestore (shapes.profileFields);
  university, program, updatedAt        read everywhere via shapes.readProfile
}

bio                                   ← set via SettingsSheet
privacy: {                            ← set via SettingsSheet privacy toggles
  mastery:    { public: bool, followers: bool },
  career:     { public: bool, followers: bool },
  university: { public: bool, followers: bool },
  journey:    { public: bool, followers: bool },
}
```

Default privacy: `followers: true, public: false` for every field.

### `users/{uid}/matches/{targetUid}`

```
score: number           ← calculateMatchScore result (0–100)
checkedAt: Timestamp
```

### `chats/{chatId}`

Chat ID is always `uid1_uid2` sorted lexicographically so both parties derive the same key regardless of who initiates.

```
members: [uid1, uid2]   ← sorted
lastMessage, lastMessageAt
fireStacks: number      ← max +1 per calendar day (via chatting only)
lastStackDate: 'YYYY-MM-DD'
```

### `chats/{chatId}/messages/{msgId}`

```
senderId, text, type: 'text'|'gift'|..., giftItem, createdAt
```

---

## State Management

| Store | Persistence | Responsibility |
|---|---|---|
| `useAuthStore` | None (Firebase listener) | Firebase user object, `signIn`, `signOut` |
| `useSelectStore` | localStorage `rc-select-store` | Onboarding selections — also synced to Firestore |
| `useUserStore` | localStorage `rc-user-store` | Coins, `totalStacks`, journeys, portfolioData, AI language, daily mood check-in data |
| `useTaskStore` | localStorage `rc-task-store` | Full task list with all metadata |
| `useSkillStore` | localStorage `rc-skill-store` | Owned and equipped skills |
| `useSocialStore` | None (Firestore real-time) | Following/followers, match results, discovery search, match history |
| `useChatStore` | None (Firestore real-time) | Chat list, active chat, messages |

---

## Home Screen (`HomePage`)

A layered composition — background renders first, then panels slide up from the bottom.

### Background

A live Phaser 3.88.0 pixel-art game (`GameCanvas`) fills the entire viewport as the home screen background. Implemented in `src/components/GameCanvas.jsx`:

- **Renderer:** `Phaser.AUTO` (WebGL → Canvas fallback), `pixelArt: true`
- **Scaling:** `Phaser.Scale.RESIZE` mode — canvas tracks container size via `ResizeObserver`; `game.scale.resize(w, h)` called on every size change
- **Init guard:** `new Phaser.Game()` is called from inside the ResizeObserver callback only when `width > 0 && height > 0`, preventing the WebGL framebuffer crash that occurs when Phaser boots with a 0×0 canvas
- **Input isolation:** `game.input.enabled` and `game.input.keyboard.enabled` are toggled via the `active` prop so WASD/arrow keys don't fire while any panel is open
- **Zoom HUD:** floating `×` indicator fades after 1.5 s of inactivity

### Top header

- **Left**: 40px avatar button (opens ProfilePanel) + music status pill (shows scrolling track name, opens track list popup)
- **Right**: 🔥 `totalStacks` + coin balance

### Calendar FAB (left side) ✅

A single button on the left side below the avatar. Always displays the Calendar icon and opens `CalendarPopup` directly when tapped. No skill equipping required.

> Previously, this area showed 3 passive skill slots unlocked at `totalStacks ≥ [1, 3, 7]`. That multi-slot system is under development and no longer active on the home screen.

### Music player ✅

`Background_Music_1.mp3` contains four tracks spliced together. Start timestamps are hardcoded; `timeupdate` events keep the display in sync.

| Track | Start |
|---|---|
| Miitopia — Catalog | 0s |
| Miitopia — Present | 67s |
| January 2014 — Nintendo eShop | 112s |
| Miitomo Summer Shop Music | 282s |

### Daily mood modal 🚧

`DailyLoginModal` prompts a mood level (1–5) and records to `feelingNotes[]`, sets `lastLoginDate`, and increments `totalStacks` by 1. **The trigger is currently disabled** — the modal will not appear on login. The component and all supporting data structures remain intact for future re-activation.

---

## Panel System

All panels are `absolute inset-0` overlays with a `top: X%` offset (slides up from bottom). A single `activeTab` string in `HomePage` controls which panel is visible.

| Panel | Status | Description |
|---|---|---|
| **ProfilePanel** | ✅ | Own profile: avatar, bio, portfolio circles, journey blocks, AI roadmap generator |
| **SettingsSheet** | ✅ | Edit profile, privacy toggles, AI language, sign out (slides over ProfilePanel) |
| **TaskPanel** | ✅ | Task list + create/edit form + active skill assignment |
| **NewsPanel** | ✅ | 2-tab news feed: **Camphub** (live via Vercel scraper) + **RollerCoaster** (app updates, admin-managed) |
| **SkillPanel** | ✅ | Skill shop, equip passive/active slots |
| **CalendarPopup** | ✅ | Month-view planner; accessible via Calendar FAB (no longer requires Planner skill) |
| **SocialPanel** | ✅ | Map, Discover, Requests, Matched — 4-tab social hub |
| **PublicProfileSheet** | ✅ | Another user's profile: follow, chat, match score, privacy-filtered portfolio |
| **ChatPanel** | ✅ | Chat list + conversation window with gifts and task sharing |
| **KawaiiMatchOverlay** | ✅ | Full-screen kawaii animation on match ≥ 60%, toast on no-match |
| **DailyLoginModal** | 🚧 | Mood check-in popup — implemented but currently not triggered |
| **MoodHeatmap** | 🚧 | Past-year mood grid inside DailyLoginModal — hidden while modal is disabled |

---

## ProfilePanel

### Avatar & Header

- 80px circular avatar: Firestore `photoURL` → Firebase Auth `photoURL` → initials circle
- Display name from Firestore `users/{uid}.displayName`
- Bio text shown below name; falls back to `MBTI: {type}` when no bio is set
- ⚙️ opens `SettingsSheet`; calls `onProfileUpdated` callback on save to re-fetch

### Portfolio Circles (3)

Mastery / Career / University. Short-press → switch active journey category below. Long-press (500ms) → edit modal (title, image URL, description).

### Journey Blocks

Horizontal drag-and-drop list per portfolio category. Each block:
- 2-line title clamp
- 📌 pin button (mastery only) — sets `activeMasteryBlockId`, shown with pulsing pink conic-gradient ring
- ⠿ drag handle
- Credited friend avatar stack (stacked circles from `progressNotes[].creditedFriend`)
- Tap → detail modal (description, progress bar, full `progressNotes` history)

### AI Roadmap Generator (Mastery only) ✅

Builds a prompt using MBTI type, career aspiration, mastery level, university, and program. Instructs Gemini to produce a 5-step **dual-track roadmap** covering both skill mastery development and TCAS Round 3 exam preparation. Replaces current mastery journey list and pins block 0. Language follows `aiLanguage` setting.

---

## SettingsSheet

Bottom sheet (`z-[70]`) with slide-up transition.

### Edit Profile

- Avatar: tap to upload new file → stores at `avatars/{uid}` in Firebase Storage → updates Firestore + Firebase Auth profile. "Use Google Photo" button restores the original OAuth photo.
- `displayName` input, `bio` textarea (100-char cap with live counter)
- [บันทึก] → single `updateDoc({ displayName, bio, photoURL })`

### Privacy Settings (real-time, no save button)

Four items with two toggles each (public / followers). Each toggle fires immediately:

```
updateDoc(users/{uid}, { 'privacy.mastery.public': value })
```

### General

- AI Output Language: Thai / English (stored in `useUserStore.aiLanguage`)
- Reset Onboarding → navigates to `/select/mbti`
- Sign Out → `resetUser()` + `resetSelection()` + Firebase `signOut()`

---

## SocialPanel

### Map Tab ✅

Leaflet map centered on user's school. Own marker has a large purple glow ring; nearby users (same `schoolId`) show MBTI-colored markers at staggered radial positions to prevent overlap. Tap any marker → `PublicProfileSheet`. If no school is set, `SchoolPicker` (Google Places Autocomplete, Thailand-restricted) is shown first.

### Discover Tab ✅

Live search bar — queries Firestore `displayName` range when text is entered; shows nearby users when empty. Each `UserCard` displays:
- MBTI-colored avatar ring
- Name + ⚡ High Match (≥80%) or ✦ Match (≥60%) badge
- MBTI badge + program pill
- **[✦ Match]** button (see Match System)
- Follow button (→ Pending → ✓ icon)

Cards sorted by `calculateMatchScore` descending.

### Requests Tab ✅

Shows incoming follow requests. [รับ] accept or [ปฏิเสธ] decline — each is an atomic Firestore `writeBatch` that updates both users' documents in one round-trip.

### Matched ⚡ Tab ✅

Loaded lazily when the tab is first opened. Shows all users with stored match score ≥ 60, sorted descending. Each row shows:
- Avatar + name + MBTI badge
- Score pill coloured by tier: blue (60–70), purple (71–89), gold (90+)
- 💬 Chat button (visible only when mutually following)
- "✦ Match Again?" hint if score was last checked more than 7 days ago

---

## Match System

### Score Algorithm (`calculateMatchScore`)

Reads `profile.*` nested fields first, flat top-level fields as backwards-compatible fallback. Maximum 100 points:

| Criterion | Points |
|---|---|
| Exact same program | 40 |
| Same career family (Analysts / Diplomats / Sentinels / Explorers) | 20 |
| Same mastery track | 25 |
| Same MBTI type | 15 |
| Same target university | 10 |
| Same school (`schoolId`) | 10 |

### `checkAndAnimateMatch(targetUid)`

1. Fetches both users' full Firestore docs
2. Computes score
3. Saves `{ score, checkedAt }` to `users/{uid}/matches/{targetUid}`
4. Updates `checkedMatches[targetUid]` in store (`status: 'matched' | 'no-match'`)
5. Sets `matchResult` → triggers `KawaiiMatchOverlay`

### Match Button States

| State | Condition | Style |
|---|---|---|
| ✦ Match | Not yet checked (or cooldown expired) | Outlined accent |
| ～ checking | Async fetch in progress | Pulse animation |
| ⚡ Matched! | Score ≥ 60 | Filled gold, disabled |
| ✦ Try Again | Score < 60, within 24h cooldown | Muted grey, disabled |

---

## KawaiiMatchOverlay

### Full match (score ≥ 60) — `z-[9999]` fixed overlay ✅

All phases are CSS `animation-delay` driven with two React-state timeouts for score bar and profile card:

| Phase | Timing | Animation |
|---|---|---|
| Backdrop fade | 0s | `rc-fade-in` |
| Avatars fly in | 0.5s | `rc-slide-in-left` / `rc-slide-in-right`; MBTI glow rings pulse 3× (`rc-ring-pulse`) |
| MATCH! text explodes | 1.0s | `rc-match-boom` (scale 0 → 1.3 → 1); gold-purple-cyan gradient text with drop-shadow |
| 20-particle burst | 1.0–1.8s | CSS custom properties `--rot` (angle) + `--ty` (distance) on each span; `rc-particle` keyframe |
| Score bar fills | 1.5s | React state → CSS `transition-all 700ms`; gold shimmer (`rc-shimmer`) if score ≥ 90 |
| Profile card slides up | 2.5s | `rc-slide-up`; [💬 ส่งข้อความ] + [👤 ดูโปรไฟล์] |
| Floating hearts | continuous | 10 elements, `rc-float-up` with varied delay/duration |
| Twinkling stars | continuous | 20 elements, `rc-twinkle` |

Auto-closes after 6 seconds. Tapping the backdrop closes early. `prefers-reduced-motion: reduce` disables all animations and shows a static overlay.

### No-match (score < 60) ✅

Small toast slides down from top (`rc-toast-in`), displays score and 24h cooldown message, 3 sad grey stars drift down (`rc-star-sad`), auto-dismisses after 2 seconds.

---

## PublicProfileSheet ✅

Bottom sheet (`z-60`). Slide-up on mount.

- 72px avatar with MBTI colour border + glow
- Name + bio (fallback to `MBTI: {type}`)
- **Follow** → Pending → **Following ✓** (outlined)
- **Chat** button: `max-width: 0 → 160px, opacity: 0 → 1` (300ms ease-out) once `isMutual` is true
- **Unfollow confirm**: inline card, calls `unfollowUser` (atomic batch removes uid from both users' `followers`/`following`)
- **Match Score bar**: gradient fill, colour tiers match KawaiiMatchOverlay (shown only when mutually following)
- **Portfolio circles** (3): blurred + 🔒 icon if privacy rules block access for the viewer
- **Journey of Mastery**: horizontal read-only scroll; credited friend avatar stacks shown under each block; 🔒 placeholder if journey is private

### Privacy check logic

```
viewer follows target → check privacy.{key}.followers
viewer doesn't follow → check privacy.{key}.public
default              → { public: false, followers: true }
```

---

## Chat System

### `useChatStore`

**`openChat(chatId, otherUser)`** — merges only `members` into Firestore. Never resets `fireStacks` or `lastMessage` on re-open.

**`sendMessage(chatId, text)`**

1. Writes message to `chats/{chatId}/messages`
2. Checks `chat.lastStackDate` (from in-memory real-time snapshot) against today's `YYYY-MM-DD`
3. If new day → writes `fireStacks: increment(1)` + `lastStackDate: today` + calls `useUserStore.incrementStacks()`
4. If same day → only updates `lastMessage` / `lastMessageAt`, no stack granted

**`incrementFireStacks(chatId)`** (gifts / appointments) — same 1-per-day check; early-returns without any Firestore write if the daily stack is already consumed.

### Fire Stack Rule

> **Maximum 1 fire stack per chat per calendar day, earned only through chatting.**
>
> Note: The daily mood check-in was previously a second source of fire stacks (+1/day). That feature is currently disabled; chatting is the only active source.

### Chat UI ✅

- **List view**: mutual friends only (Friends tab); School / World tabs show 🚧 "Coming Soon"
- **Window view**: auto-scroll messages, fire-stacks counter in header, input bar with 🎁 `GiftModal` (🌟10 / 💎30 / 🚀50 coins) and 📅 `CreditModal` (tag a friend on a completed task)

---

## Task System

Each task carries:

```
id, title, type, timeMinutes, rewardCoins, description, completed
scheduledDate          ← 'YYYY-MM-DD' for CalendarPopup
assignedSkill          ← active skill id
timerEnd               ← unix ms timestamp (Capsule skill)
isAIGenerated          ← boolean
linkedJourneyKey/Id    ← links back to portfolio journey block
estimatedProgress      ← % to add on completion
```

Completing a task calls `useUserStore.incrementStacks()` and awards `rewardCoins`.

### AI Daily Task ✅

When a mastery block is pinned (`activeMasteryBlockId`), Gemini generates today's specific next micro-step using the block's title and past `progressNotes`. Creates a task with `isAIGenerated: true`.

### AI Evaluation ✅

On completing an AI task the user writes a reflection. Gemini returns a one-sentence achievement summary + `progress_inc` percentage. The summary is appended to the journey block's `progressNotes` and the block's `progress` increments.

---

## Skill System

### Passive Skills

Slot-unlock thresholds: `totalStacks ≥ [1, 3, 7]` (logic stored in `useSkillStore`). The home screen currently shows a single hardcoded Calendar FAB regardless of equipped passive skills. The multi-slot equipping UI in `SkillPanel` remains functional for purchasing and equipping.

| Skill | Cost | Status | Effect |
|---|---|---|---|
| Planner 📅 | 159 | ✅ | Calendar FAB always visible on home screen |
| Spark ✨ | 99 | 🚧 | +2 bonus coins on every task completion — purchasable, effect not yet applied |
| Flow 🔗 | 149 | 🚧 | ×1.1–1.3 coins for back-to-back tasks (within 10 min) — purchasable, multiplier not yet applied |
| Depth 🏆 | 179 | 🚧 | ×1.5 coins for tasks longer than 60 min — purchasable, multiplier not yet applied |
| Grace 💖 | 129 | 🚧 | Skip 1 streak penalty per week — purchasable, streak-penalty logic not yet applied |

### Active Skills (assign to individual tasks)

| Skill | Cost | Status | Effect |
|---|---|---|---|
| Ignite 🚀 | 99 | ✅ | 5-second countdown before starting the task |
| Capsule ⏳ | 149 | ✅ | 30-min lock timer; +50% coins if finished on time |
| Draw 🎴 | 79 | ✅ | Randomly selects a pending task |
| Revive 🛡️ | 199 | ✅ | Restore a broken streak (once per month) |

Skills are purchased with coins. `useSkillStore` is persisted in `rc-skill-store`.

---

## Key Invariants

1. Fire stacks come from one active source: **chatting** (+1/chat/day). The mood check-in source is currently disabled.
2. `calculateMatchScore` reads `profile.*` nested fields first, flat top-level fields as fallback — fully backwards-compatible.
3. Privacy defaults: followers see everything, non-followers see nothing.
4. `openChat` never resets `fireStacks` or `lastMessage`; only `members` is in the merge payload.
5. Onboarding sync is two-way: local → Firestore on every selection, Firestore → local on login only when local field is empty.
6. Match scores are computed client-side and persisted to `users/{uid}/matches/{targetUid}` for the Matched tab history.
7. The app wrapper uses `h-dvh` (not `min-h-dvh`) so `flex-1 main` has a *definite* viewport height — required for `absolute inset-0` children (game, panels) to fill the screen on iPad and Desktop.

---

## Deployment & Infrastructure

### Vercel Serverless Functions

The app uses Vercel serverless functions for features that require server-side logic:

#### API Endpoint: `/api/camphub`

Scrapes `camphub.in.th/computer/` using cheerio and returns a JSON array of camp data. Runs on request (no build step required) and caches responses for 30 minutes at the Vercel CDN edge.

**Response format:**
```json
[
  {
    "title": "Camp Name",
    "link": "https://camphub.in.th/...",
    "small_description": "Short description",
    "poster_image": "https://camphub.in.th/image.jpg"
  }
]
```

**Development:** Vite dev middleware plugin runs the handler inline in `npm run dev` (see `vite.config.js` → `camphubApiPlugin`).

### Firestore Security Rules

Update the Firestore rules in Firebase Console to include:

```
match /appUpdates/{updateId} {
  // Any signed-in user can read updates
  allow read: if request.auth != null;
  
  // Only the admin account may create, edit, or delete updates
  allow write: if request.auth != null
               && request.auth.uid == 'IaltEhO0mPVfK3ng8npr4CdqnEE3';
}
```

This enables the Admin to post app announcements from within the RollerCoaster tab while preventing unauthorized writes.

### Environment Setup

Copy `.env.example` to `.env` and fill in all keys:

```env
# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_URL=...

# AI & Maps
VITE_GEMINI_API_KEY=...
VITE_GOOGLE_MAPS_KEY=...
```

---

## Data Sources & Attribution

| Data | Source | License |
|---|---|---|
| Occupation database (923 O*NET occupations) | [O*NET Web Services](https://services.onetcenter.org/), U.S. Department of Labor, Employment and Training Administration | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Thai translations of occupation titles | Generated with Google Gemini 2.5 Flash | Output owned by project author |

> This site incorporates information from O*NET Web Services by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license. O*NET® is a trademark of USDOL/ETA.

---

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server (includes Vite + API middleware)
npm run dev

# Build for production (Vercel will serve functions from /api)
npm run build

# Preview production build locally
npm run preview
```

---

## Recent Updates

| Date | Feature | Details |
|---|---|---|
| 2026-06-18 | **Internal Refactor + Test Suite** ✅ | Unified Firestore sync (`lib/syncManager.js`) + real-time listener lifecycle (`lib/firestoreListener.js`); extracted `services/sessionBootstrap.js` and `services/aiJourney.js`; ProfilePanel split into shell + `JourneyManager`; 78 automated tests (Vitest + jsdom + @testing-library/react) |
| 2026-06-18 | **Fix: Profile Data Consistency (stale MBTI/program)** ✅ | Single Profile shape seam in `lib/db.js` (`shapes.profileFields` / `shapes.readProfile`); all readers go through it; fixes top-level fields not updating after a post-signup selection change |
| 2026-06-18 | **Fix: Follow/Unfollow Crash** ✅ | `useSocialStore` called `writeBatch(db)` without importing `db` — follow / unfollow / accept threw `ReferenceError` |
| 2026-06-14 | **Fix: Google Login Error Visibility** ✅ | Real Firebase error codes now surface to UI with Thai messages; generic "unknown error" now appends raw code for debugging; `firebase.js` logs missing env keys on startup |
| 2026-06-14 | **Game: Collision Detection** ✅ | Player blocked by trees, fences, and walls on outdoor map; no more walking through obstacles |
| 2026-06-14 | **Game: New Outdoor Map + MBTI Characters** ✅ | Switched to `test3.json` map; all 12 MBTI character spritesheets updated; player sprite locked to selected MBTI type |
| 2026-06-14 | **MbtiPage Overhaul** ✅ | Live animated sprite preview per type; rich Thai descriptions (strengths, weaknesses, learning style); player in Phaser game now matches chosen MBTI |
| 2026-06-13 | **Design System Refresh — Phase 1** ✅ | Centralized `mbtiColors` + `zIndex` constants; shared UI primitives + design tokens; all 8 onboarding pages redesigned; panels and HUD tokenized; a11y + nav token fixes |
| 2026-06-13 | **Animated Loader on App Entry** ✅ | Running-line animation on loading screen; animated progress bar during Firebase auth check |
| 2026-06-12 | **Fix: White Screen on iPad/Desktop** ✅ | `min-h-dvh` → `h-dvh` on app wrapper so `flex-1 main` has a definite height; all `absolute inset-0` children now render correctly |
| 2026-06-12 | **Fix: Phaser WebGL Crash, Zoom HUD, Nav z-index** ✅ | ResizeObserver-first init prevents framebuffer error; zoom `×` encoding fixed; nav `z-30` |
| 2026-06-12 | **Responsive — Panels & Bottom Sheets** ✅ | NewsPanel, SocialPanel, TaskPanel, CalendarPopup — `md:grid-cols-2` grids, `md:max-w-lg` sheets |
| 2026-06-12 | **Responsive — Fullscreen Viewport** ✅ | Removed `max-w-md` phone frame; all pages fill viewport; breakpoint-aware padding |
| 2026-06-12 | **Phaser 3 Game as Home Background** ✅ | Interactive pixel-art game replaces static MBTI background; `GameCanvas` with ResizeObserver scaling |
| 2026-06-09 | **Task List UX Redesign** ✅ | Trash bin with undo-delete, 2-row layout, sticky footer |
| 2026-06-08 | **Fix: MBTI Background Sync** ✅ | Firestore-wins cross-device strategy; prevents local data clobbering Cloud |
| 2026-06-08 | **Tasks Sync to Firestore** ✅ | Cross-device task persistence via Firestore; auto-migration from localStorage |
| 2026-06-07 | **Career Expanded to 946 entries** ✅ | O*NET integration, Thai search, image boxes removed |
| 2026-06-05 | **TCAS API, Sticky UI & News** ✅ | Official university data from mytcas.com, bottom bar fix, update detail cards |
| 2026-06-04 | **App Updates Feed** ✅ | RollerCoaster tab in NewsPanel — admin-managed announcements with badge types (ใหม่/อัปเดต/แก้บั๊ก) |
| 2026-06-04 | **Portfolio & Journeys Sync** ✅ | Firestore integration for portfolio circles and journey blocks |
| 2026-06-04 | **Portfolio Image Upload** ✅ | Mastery & Career circles now support image uploads |
| 2026-06-04 | **Profile Photo Fix** ✅ | Compressed base64 storage to bypass CORS issues |
| 2026-06-04 | **Camphub Live Feed** ✅ | Real-time camp data via Vercel serverless scraper |
| 2026-06-01 | **Skill Lock Calendar Fix** ✅ | Corrected calendar and CFR logic |
| 2026-06-01 | **NavBar Fix** ✅ | Resolved blocking issues on Task page |
| 2026-05-30 | **Contact Developer** ✅ | Floating FAB opens admin chat |
| 2026-05-29 | **Fire Stack Limits** ✅ | Capped at 1 per chat per day |
| 2026-05-29 | **Match UI & Animation** ✅ | KawaiiMatchOverlay with particles and smooth transitions |
| 2026-05-29 | **Onboarding Sync** ✅ | Selections persisted to Firestore |
| 2026-05-29 | **Profile Overhaul** ✅ | Privacy settings, public profiles, portfolio redesign |
| 2026-05-29 | **Social Search** ✅ | Improved user discovery |
| 2026-05-29 | **Task Share to Chat** ✅ | Tag friends on task completion |
| 2026-05-28 | **News Share to Chat** ✅ | Share Camphub camps via messaging |
| 2026-05-28 | **Match Score Algorithm** ✅ | Automated compatibility scoring |
| 2026-05-28 | **Chat Panel** ✅ | 1-to-1 messaging with fire stacks & gift system |
