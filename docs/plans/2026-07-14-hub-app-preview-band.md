# Hub × app.ilovetcas Preview Band Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Idea:** `node-9-1783986444319` — "เอาหน้า Homepage 14/07/2026ของ Ilovetcas รวมกับ
app.ilovetcas" on the IR Board.

**Requirement (from the Idea's Process note, translated):** After the Hub introduces the
four Feature tools, it should show a video of the app's game. Keywords to use: "รวมทุก
Feature" and "Create your vibe space".

**Scope (verified against the code):** Per ADR-0012 the Hub (`ilovetcas.com`) and the full
app (`app.ilovetcas.com`) are already deliberately *split* — the Hub is marketing/SEO only,
the full app (WelcomePage + game) lives on its own subdomain. "รวมกับ app.ilovetcas" here
does not mean re-merging the routing/subdomain split (that would relitigate an accepted
ADR); it means the Hub's existing "app band" — the dark `bg-ink` section at the bottom of
`src/pages/HubPage.jsx` (currently static text: pixel headline "PLAY YOUR PATH" + one
paragraph + a single CTA to `app.ilovetcas.com`, see `HubPage.jsx:114-133`) — should show
real footage of the app/game, using the two supplied keyword lines as its new copy. This
section is already flagged as a "premium slot" in `design.md:277-278` (§13), i.e. built for
exactly this kind of upgrade.

A real gameplay video already exists and is live in production: `app.ilovetcas.com`'s
`WelcomePage` → `HeroSection` plays it as a full-screen background video, sourced from the
Firestore doc `welcomeConfig/gamePreview` (`{ mediaUrl, mediaType }`), admin-uploadable via
`src/components/admin/WelcomeSection.jsx`. Confirmed via a live read: the doc holds a real
Storage-hosted `.mp4` (not a placeholder). `welcomeConfig/{document=**}` is world-readable in
`firestore.rules:113`, so it's safe to read from an unauthenticated page. Reusing this
exact asset is the literal "merge with app.ilovetcas" — the Hub shows the same real preview
the app already uses, no new video shoot, no new admin tooling, single source of truth (if
the owner re-uploads the clip via the existing admin panel, both pages pick up the change).

**Goal:** The Hub's app band shows the real `welcomeConfig/gamePreview` clip (video or
image, whichever is currently set) next to updated copy — pixel headline "CREATE YOUR VIBE
SPACE" (replaces "PLAY YOUR PATH") and a Thai line built around "รวมทุก Feature" — while
keeping today's single CTA, dark-band styling, and graceful fallback to the current
text-only look when no media is configured.

**Architecture:**
- **New hook, not a reuse of `useWelcomeContent`:** `useWelcomeContent` (used by
  `WelcomePage`) fetches five documents/collections in parallel (gamePreview, stats, news,
  faq, testimonials). Hub only needs the one media doc — pulling in the whole hook would
  add four unnecessary Firestore reads to the highest-traffic public page. Add a small
  dedicated hook `src/hooks/useGamePreviewMedia.js`: one `getDoc(refs.welcomeGamePreview())`
  call, returns `{ mediaUrl, mediaType, loading }` (mirrors the relevant slice of
  `useWelcomeContent`'s internals). Do not touch `useWelcomeContent.js` or `WelcomePage.jsx`
  — out of scope, no behavior change there.
- **Rendering:** in `HubPage.jsx`'s existing app-band `<section className="bg-ink">`, add a
  media block using the same conditional already established in
  `src/components/welcome/HeroSection.jsx` (`mediaType === 'video'` → `<video autoPlay loop
  muted playsInline>`, else `<img>`), wrapped in a `neo-card` (2px ink border, `shadow-hard`,
  per `design.md` §4). Do **not** reuse `src/components/welcome/GamePreview.jsx` wholesale —
  it renders its own light-background `<section>` with a "GAME PREVIEW" pixel heading, which
  would conflict with the dark band; only its video/img JSX pattern is the reference.
- **Fallback:** when `mediaUrl` is falsy (doc missing, still loading, or fetch failed), the
  band renders exactly as it does today (text + CTA, no video slot, no skeleton/spinner) —
  this section is below the fold and non-critical, unlike the full-viewport hero on
  WelcomePage that needs a skeleton.
- **Layout:** keep `bg-ink` (the one dark moment on the page, `design.md` §15), keep
  `max-w-6xl`, keep exactly one `bg-brand-strong` CTA in this viewport ("เข้าแอป + เกม" →
  `siteHref('app')`, unchanged) — do not add a second CTA under the video. Stack video above
  text on mobile, side-by-side on desktop (exact Tailwind arrangement is a Cursor UI call
  within these constraints).
- **Copy** (hardcoded in `HubPage.jsx` today, not sourced from `SITES` — keep that pattern,
  this band's copy is not any tool's on-page `h1`/`intro`):
  - Pixel headline: `"PLAY YOUR PATH"` → `"CREATE YOUR VIBE SPACE"` (Latin, uppercase, stays
    `pixel-title-dark`, ≥10px per `design.md` §5).
  - Thai paragraph: keep the existing farm/coins/tasks/friends detail, prefix or weave in
    the literal phrase "รวมทุก Feature" as the hook line, e.g.: "รวมทุก Feature ที่ใช้เตรียม
    สอบ ไว้ในโลกเกมเดียว เลี้ยงฟาร์ม เก็บเหรียญ ทำภารกิจรายวัน และหาเพื่อนเป้าหมายเดียวกัน"
    (`thai-font`, mixed Thai/English word is fine in Noto Sans Thai — only the *pixel* font
    is Latin-only per `design.md` §5).
- **Accessibility:** video is decorative/ambient (muted loop, no captions needed) — same
  treatment as `HeroSection.jsx`'s background video (`aria-hidden="true"`).
- **SEO:** no impact — `scripts/prerender.mjs` builds the crawler-facing `#root` snapshot
  from `SITES` copy directly (see header comment, `prerender.mjs:9-12`), not by rendering
  `HubPage.jsx`; this band's copy already isn't sourced from `SITES`, so nothing there needs
  to change.
- Standing rules: no deploys (this ships via the normal `/ilovework` → push-to-main → Vercel
  auto-deploy flow, not a manual deploy command); no `StartNode` / user-Roadmap changes
  (none touched here).

**Tech Stack:** React 19 JSX (no TS), Tailwind v4 tokens from `src/index.css`, Firebase
Firestore (`getDoc`, existing `refs.welcomeGamePreview()`), Vitest + Testing Library. No new
dependencies.

---

## Task 1 — `useGamePreviewMedia` hook

**Files:** Create `src/hooks/useGamePreviewMedia.js`, `src/hooks/useGamePreviewMedia.test.js`

- [x] One-time `getDoc(refs.welcomeGamePreview())` in a `useEffect`, returns
      `{ mediaUrl: string|null, mediaType: 'video'|'gif'|null, loading: boolean }`. On fetch
      error, resolve to `{ mediaUrl: null, mediaType: null, loading: false }` (same
      fail-safe pattern as `useWelcomeContent.js:31`).
- [x] Test: mocks `refs.welcomeGamePreview` (same mocking style as
      `useWelcomeContent.test.jsx`) — asserts loading → resolved shape, and the empty-doc /
      rejected-promise fallback.

## Task 2 — Wire the media block into `HubPage.jsx`'s app band

**Files:** Modify `src/pages/HubPage.jsx`

- [x] Import and call `useGamePreviewMedia()`; destructure `mediaUrl`/`mediaType`.
- [x] Inside the existing `<section className="bg-ink">` (`HubPage.jsx:115-133`), add a
      `neo-card` media block rendered only when `mediaUrl` is truthy: `<video>` (`autoPlay
      loop muted playsInline aria-hidden="true"`) when `mediaType === 'video'`, else `<img
      alt="">`. Reuse existing `object-cover`/`rounded-xl` conventions already used for the
      tool-card screenshots (`HubPage.jsx:46-53`) for visual consistency.
- [x] Replace the pixel headline text `"PLAY YOUR PATH"` → `"CREATE YOUR VIBE SPACE"`.
- [x] Update the Thai paragraph to lead with "รวมทุก Feature" (see Architecture for the
      suggested line; keep it under ~2 lines to match the band's existing rhythm).
- [x] Keep the single "เข้าแอป + เกม" CTA unchanged (href, icon, styling).
- [x] Adjust the flex layout (`flex-col md:flex-row` currently) so the media block, text,
      and CTA all fit without a second CTA and without horizontal scroll at 375px width.

## Task 3 — Tests

**Files:** Create `src/pages/HubPage.test.jsx` (none exists today)

- [x] Mock `useGamePreviewMedia` (or mock `refs.welcomeGamePreview` + `getDoc` directly,
      matching the existing hook-mocking convention in the codebase).
- [x] Case: `mediaUrl` set + `mediaType: 'video'` → a `<video>` element renders with that
      `src`.
- [x] Case: `mediaUrl: null` → no video/img element renders, band still shows the new
      headline/copy/CTA (fallback path).
- [x] Assert the new headline text "CREATE YOUR VIBE SPACE" and the "รวมทุก Feature" phrase
      are present; assert exactly one element with the CTA href (`app.ilovetcas.com`).

## Task 4 — Verify

- [x] `npm test` — full suite green (includes the two new test files).
- [ ] `npm run dev`, visit `http://localhost:5173/?site=hub` — confirm the real gameplay
      clip plays (looping, muted) in the app band, new copy is visible, single CTA remains,
      no horizontal scroll at 375px width.
- [ ] Confirm the fallback: temporarily point `?site=hub` at a fresh browser profile with no
      cached doc, or stub the doc to empty, and confirm the band still looks complete
      text-only (no broken media icon, no layout jump).
- [x] No deploy step required — this is a content/UI change that ships through the existing
      `/ilovework` → push → Vercel auto-deploy path.
