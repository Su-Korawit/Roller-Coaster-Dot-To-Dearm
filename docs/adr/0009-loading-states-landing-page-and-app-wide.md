---
status: proposed
---

# Wire loading feedback into the landing page and remaining app gaps, using the existing skeleton convention

The landing page (`src/pages/WelcomePage.jsx`, route `/`) is already fully built — Hero, Features,
Stats, HowItWorks, News, Testimonials, FAQ, Donate, Footer. It is **not** being rebuilt by this ADR.
Its only real defect: `useWelcomeContent()` already computes a `loading` boolean
(`src/hooks/useWelcomeContent.js:5,29`) but `WelcomePage.jsx:14` never reads it, so Stats/News/
Testimonials/FAQ/Hero's `gamePreview` render empty until the five Firestore reads resolve.

Separately, an app-wide audit (triggered by the same request) found a handful of other places that
fetch async data with zero loading feedback — see Decision B–D. Most of the app already handles
this correctly: route-level `Suspense` (`src/App.jsx:23-44`), `RequireAuth`'s `LoadingScreen` during
session bootstrap, and a skeleton-card pattern already in production use
(`src/components/NewsPanel.jsx:420-436`, also in `SocialPanel`, several admin sections):
`animate-pulse` divs shaped like the real content, gated by a `loading` flag, no spinner modals, no
toasts. This ADR extends that *same* pattern to the confirmed gaps — it does not invent a new
loading primitive, and it deliberately does not touch places that already work or where a loading
affordance would be more distracting than the pop-in it prevents (see E).

## Decision

### A. Landing page — consume the already-computed `loading` flag

1. `src/pages/WelcomePage.jsx` — destructure `loading` from `useWelcomeContent()` and pass it down
   to each data-fed section as a prop.
2. `src/components/welcome/StatsSection.jsx`, `NewsSection.jsx`, `Testimonials.jsx`,
   `FaqSection.jsx` — accept a `loading` prop; while true, render 3 `animate-pulse` placeholder
   cards shaped like that section's real card (same convention as `NewsPanel.jsx:420-436`) instead
   of the empty/undefined state.
3. `src/components/welcome/HeroSection.jsx` — accept `loading`; while true and `gamePreview` is
   null, render an `animate-pulse` block in place of the preview media instead of nothing.
4. Do not touch `FeatureHighlights`, `HowItWorks`, `DonateSection`, `WelcomeNav`, `WelcomeFooter` —
   static content, no fetch, no gap.

### B. Core panels

5. `src/components/ProfilePanel.jsx` — add a loading flag around `fetchFirestoreProfile()`
   (`:23-32`); while true, render a skeleton header (avatar circle + two text bars) instead of the
   auth-fallback name/photo, so it doesn't visibly swap right after paint.
6. `src/components/ChatPanel.jsx` (`ChatListView`) — add a loading flag around
   `loadChats`/`loadMyProfile`/`resolveParticipants` (`:738-758`); while true, render 2–3 skeleton
   rows instead of the empty-state copy ("ยังไม่มีเพื่อนที่ติดตามกัน" / "ยังไม่มีข้อความจากผู้ใช้",
   `:596-599,663-673`) so a genuinely-empty state and a still-loading state stop looking identical.

### C. Admin

7. `src/components/admin/WelcomeSection.jsx` — add a loading flag around `reload()` (`:14-36`);
   skeleton placeholders per editor block (Game Preview / Stats / News / FAQ / Testimonials) while
   loading, matching the block shapes already in that file.
8. `src/components/admin/AssetsManagerSection.jsx` (`FolderSidebar`) — add a loading flag around
   `loadFolders()` (`:455-467`); skeleton rows in the sidebar list while loading. `FileGrid`/
   `TrashView` in the same file already show "โหลด..." — match whichever of the two conventions
   (skeleton rows vs. text) reads better in the sidebar's narrow width; Cursor's call, note the
   choice in the PR.

### D. Game canvas

9. `src/components/GameCanvas.jsx` — two distinct gaps, two distinct treatments (do not use the
   same full-screen treatment for both, or map-switching will feel like a full reload every time):
   - **Initial boot** (`:217-231`, before `bootGame()` runs): the container renders blank. Add an
     in-container overlay reusing `App.jsx`'s `LoadingScreen` look (rocket emoji + gradient progress
     bar, `src/App.jsx:23-44`) so first load reads as "loading the game," not "the app is broken."
   - **Map switch** (`mapChangeRequested` handler, `:187-207`): the canvas currently holds the old
     frame frozen during `loadSceneData`. Add a lightweight dim + small corner spinner over the
     existing frame — not the full `LoadingScreen` — so a map change reads as "loading," not
     "frozen," without the jarring full-screen flash on every portal transition.

### E. Explicitly out of scope (decided, not left for Cursor to guess)

- `src/pages/ProgramPage.jsx` `ProgramRoundBadge` — badge pops in after `useTcasRounds` resolves;
  gap is sub-second and cosmetic. Skip.
- `src/hooks/useSelectionCommit.js` — fire-and-forget `syncSelectToFirestore`; this is a background
  data-sync concern, not a loading-UX one. Skip (don't add a toast/spinner here).
- `src/pages/HomePage.jsx` background music (`useCloudAsset`) and the `getMusicConfig()` track list
  (`:61-65`) — silent swap is the right behavior for audio; no visual loading needed. Skip.

Reasoning for E: the request was to add loading feedback where its absence reads as broken or
confusing, not to instrument every async call — matching "don't make it annoying/naggy."

## Considered Options

- **New shared `<Skeleton>` component** (rejected) — the app already has a working, in-use
  convention (`animate-pulse` + gray blocks shaped like real content, e.g. `NewsPanel.jsx:420-436`).
  Introducing a second abstraction for the same visual result adds a dependency for no behavior
  change; every item above should copy that existing pattern inline, matching each section's own
  markup shape.
- **Full-screen `LoadingScreen` for every gap, including map switches** (rejected) — reusing the
  route-level treatment for in-place data refreshes (chat list, profile header, map switch) would
  be more disruptive than the pop-in it replaces; only genuinely blocking, full-context transitions
  (initial game boot) get that treatment.
- **Delay-before-show hook to suppress skeletons on sub-200ms loads** (rejected) — no existing
  loading state in the codebase does this (`NewsPanel`, admin sections all show immediately); adding
  it here would be a new pattern applied inconsistently. If flicker turns out to be a real problem
  after this ships, that's a follow-up ADR, not a speculative addition now.

---

## Implementation Plan (Cursor implements; Claude Code reviews + fixes)

Work through A → D in order; each item is independent within its section, so they can land as
separate small commits rather than one giant diff.

1. Section A (landing page) first — it's the concrete, named ask.
2. Section B and C — same pattern, different files, no shared code between them.
3. Section D (game canvas) last — needs a visual check in the running app since it's the only item
   touching the Phaser boot sequence, which is easy to get subtly wrong (e.g. overlay not unmounting
   cleanly, z-index over the canvas).

### Verification checklist (Claude Code reviews before calling this done)

- Throttle network in devtools, load `/` fresh: Stats/News/Testimonials/FAQ sections show skeleton
  cards (not blank/empty state) until Firestore resolves, then swap to real content.
- Log in as a low-activity account, open Profile panel and Chat tab: skeleton appears first; the
  "no chats yet" / empty-state copy only appears after loading is confirmed false and lists are
  confirmed empty.
- Admin → Welcome section and Admin → Assets Manager: skeleton on first load, no flash of "no data."
- Fresh login → `/home`: game canvas shows a loading overlay before the first Phaser frame, not a
  blank div.
- Trigger a map switch via a portal: transition shows the lightweight dim+spinner overlay, not a
  frozen frame with no feedback.
- `npm test` — check `src/components/welcome/HeroSection.test.jsx` and
  `src/hooks/useWelcomeContent.test.jsx` still pass; update any assertion that expected content to
  render synchronously before the fetch resolves.
- Manual pass in the running dev app (`npm run dev`) on the golden path (landing page load, login,
  chat, admin) — this ADR is UI-feedback-only, so a passing test suite alone doesn't confirm the
  skeletons look right.
