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
| MBTI selection (16 types, pixel-art characters) | ✅ | Step 1 of 5 |
| Career selection (30 careers, MBTI-filtered) | ✅ | Step 2 of 5 |
| Mastery track selection (18 tracks, career-filtered) | ✅ | Step 3 of 5 |
| University selection (30+ Thai institutions) | ✅ | Step 4 of 5 |
| Program / major selection | ✅ | Step 5 of 5 — also stores TCAS round |

### Home Screen
| Feature | Status | Notes |
|---|---|---|
| MBTI-specific animated background (image + video) | ✅ | Falls back to generic if no MBTI asset |
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
| Avatar upload (Firebase Storage) | ✅ | Also supports "restore Google photo" |
| Display name & bio editing | ✅ | 100-char bio cap |
| Privacy toggles (public / followers) per field | ✅ | Fires Firestore update on every toggle |
| AI Output Language toggle (Thai / English) | ✅ | Stored in `useUserStore.aiLanguage` |
| Portfolio circles (Mastery / Career / University) | ✅ | Short-press switches journey category; long-press opens edit modal |
| Journey blocks (drag-drop, pin, progress) | ✅ | Per portfolio category; credited friend avatar stack |
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
| News panel UI | ✅ | Share-to-chat button per item |
| Live news feed | 🚧 | Feed is currently hardcoded (2 CAMPHUB items); no live API integration yet |

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

After `onAuthStateChanged` fires with a user:
1. `ensureUserDoc` — creates `users/{uid}` in Firestore if it does not yet exist (sets flat top-level fields from localStorage)
2. `syncSelectToFirestore(uid)` — pushes all non-null local selections to `users/{uid}.profile` using `setDoc merge:true`
3. `hydrateSelectStoreFromFirestore(uid)` — reads `users/{uid}.profile` back into localStorage **only for empty fields** (new-device fallback, never overwrites newer local data)

---

## Firestore Data Model

### `users/{uid}`

```
uid, displayName, email, photoURL     ← from Firebase Auth / SettingsSheet
mbti, program, university, mastery    ← flat top-level (legacy, set by ensureUserDoc)
schoolId, schoolName, schoolLat, schoolLng
followRequests[], followers[], following[], sentRequests[]
matchScore, fireStacks
createdAt

profile: {                            ← written by syncSelectToFirestore
  mbti, career, masteryTrack, university, program, updatedAt
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

MBTI-specific `.png` + `.mp4` pair loaded from `assets/.../home/Background/{MBTI}.{ext}`. The static image renders immediately; the video fades in once `canPlayThrough` fires. Falls back to a generic background if no MBTI-specific asset exists.

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
| **NewsPanel** | ✅ | News feed UI (static content — live feed 🚧) |
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
7. The UI frame is capped at `max-w-md` (448px) so it acts as a phone shell on desktop while filling the screen on mobile.

---

## Getting Started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in all Firebase and API keys before running.
