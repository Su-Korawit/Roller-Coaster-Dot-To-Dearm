# I LOVE TCAS — Subdomain Restructure (Hub + 4 Feature Sites + Guest Mode)

> **Authority:** ADR-0012 (`docs/adr/0012-feature-subdomains-and-guest-mode.md`).
> Read it first — every decision below (subdomains vs paths, guest model, merge
> policy, SEO phasing) is recorded and closed there. Do not relitigate.

**Goal:** Restructure the app ILOVEPDF-style: `ilovetcas.com` becomes a static-feeling
Hub that lists the tools; `roadmap.` / `tcas.` / `news.` / `school.` each serve a
prerendered SEO landing plus a guest-usable tool; the full existing app (WelcomePage,
login, game) moves unchanged to `app.ilovetcas.com`. One repo, one build, one Vercel
project with a wildcard domain; the SPA picks its route tree from the hostname.

**Who does what (per CLAUDE.md):** Tasks are tagged **[Cursor]** (JSX/UI/wiring),
**[Claude Code]** (scripts, tests, rules, prerender), or **[Owner]** (console/DNS).
Cursor: skip Claude Code tasks; where a Cursor task depends on one, the seam
(function signature / file) is specified so you can build against it.

## Global Constraints

- **No TypeScript.** Plain JS + JSX.
- **Tailwind v4** — new tokens go in `src/index.css` `@theme` only.
- **Keep the pixel-font identity** on the Hub and landings (`.pixel-font` headings,
  `.thai-font` body) — do not import a generic sans look from ILOVEPDF; copy its
  *layout*, not its typography.
- **Firestore access only through `src/lib/db.js`**; writes only via `syncManager`.
- **ADR-0011 freeze holds:** do not rename `rc-*` localStorage keys, `rc/` storage
  prefix, Firebase project id, `package.json` name.
- Feature-site pages must render with `user == null` — never assume a session.
- Wordmark is `I LOVE TCAS` everywhere (ADR-0011).
- `npm test` green after every phase; `npm run test:rules` after Phase 3.

---

## Phase 0 — Console + DNS **[Owner — manual, do first]**

- [ ] Vercel project → Domains: add `ilovetcas.com`, `www.ilovetcas.com`, and the
      wildcard `*.ilovetcas.com` (covers app/roadmap/tcas/news/school). Add the DNS
      records Vercel prints at the registrar (apex A + wildcard CNAME).
- [ ] Firebase Console → Authentication → Settings → Authorized domains: add
      `ilovetcas.com`, `www.ilovetcas.com`, `app.ilovetcas.com`,
      `roadmap.ilovetcas.com`, `tcas.ilovetcas.com`, `news.ilovetcas.com`,
      `school.ilovetcas.com`. (Google sign-in fails on any host missing here.)
- [ ] Vercel → Domains: set `www.ilovetcas.com` to redirect to `ilovetcas.com`.

## Phase 1 — Site resolution + route trees

### Task 1.1: Site registry + resolver **[Claude Code]** — seam for everything below

**Files:** Create `src/constants/sites.js`, `src/lib/site.js`, `src/lib/site.test.js`

- `src/constants/sites.js` — `export const SITES` keyed by site key
  (`hub | roadmap | tcas | news | school | app`), each `{ key, subdomain, title,
  description, path: 'https://<host>' }` with Thai SEO title/description strings.
- `src/lib/site.js` — `export function resolveSite(hostname, search)`:
  1. `?site=<key>` override (also honour `import.meta.env.VITE_SITE`) — dev only.
  2. `<sub>.ilovetcas.com` → matching site key.
  3. `ilovetcas.com` / `www.ilovetcas.com` → `'hub'`.
  4. Anything else (`*.vercel.app`, `localhost`, previews) → `'app'` — existing
     users' origin must behave exactly like today.
  Also `export const currentSite = …` resolved once at module load.
- Vitest cases for all four branches.

### Task 1.2: Per-site route trees in `App.jsx` **[Cursor]**

**Files:** Modify `src/App.jsx`

- [ ] Import `currentSite` from `src/lib/site.js`; switch on it around `<Routes>`:
  - **`app`** — the current tree, byte-for-byte: `/` WelcomePage, `/news/:id`,
    `/auth`, `/admin`, MobileLayout + RequireAuth block. No behaviour change.
  - **`hub`** — `/` → `HubPage` (Task 2.1). Legacy-path redirects for people with
    old apex bookmarks: `/home`, `/roadmap`, `/auth`, `/admin` →
    `window.location.replace('https://app.ilovetcas.com' + path)`; `/news/:id` →
    `https://news.ilovetcas.com/:id`. Small `<ExternalRedirect to={...} />`
    helper component (renders null, redirects in an effect).
  - **`roadmap`** — `/` → `RoadmapLanding`, `/editor` → existing `RoadmapPage`
    wrapped in `FeatureLayout` (Task 3.1), **no RequireAuth**.
  - **`tcas`** — `/` → `TcasExplorerPage` (landing and tool are the same page —
    search is the content).
  - **`news`** — `/` → `NewsHomePage` (feed + TCAS calendar timeline),
    `/:id` → existing `NewsPostPage`.
  - **`school`** — `/` → `SchoolLanding`, `/app` → school tool page.
  - Every site keeps `path="*"` → its own `/`.
- [ ] Keep route-level lazy imports so feature sites don't pull the Phaser bundle.

## Phase 2 — Hub + landings **[Cursor]**

### Task 2.1: `HubPage` — ILOVEPDF-style grid

**Files:** Create `src/pages/HubPage.jsx`

- [ ] Layout copied from ILOVEPDF's front page: wordmark header, one-line Thai
      value prop, responsive card grid — 4 tool cards (from `SITES`: icon, title,
      description, link to subdomain) + a 5th highlighted card "เข้าแอปเต็ม + เกม"
      → `app.ilovetcas.com`. Reuse `WelcomeFooter`. Pixel-font headings.
- [ ] No auth state, no stores, no game assets — this page must be near-static
      (it is the prerender target with the highest SEO weight).

### Task 2.2: Feature landings

**Files:** Create `src/pages/landing/RoadmapLanding.jsx`, `SchoolLanding.jsx`,
`NewsHomePage.jsx`, `TcasExplorerPage.jsx`

- [ ] Each landing: H1 with the Thai keyword phrase (from `SITES` description),
      2–3 benefit sections, screenshot placeholder, primary CTA into the tool
      (`/editor`, `/app`, or in-page), footer link back to the Hub.
- [ ] `TcasExplorerPage`: search box + results using the existing
      `useMytcasFetch` hook against `/api/mytcas` — works logged-out already;
      intro copy above the fold serves as the landing text.
- [ ] `NewsHomePage`: public feed + TCAS-events timeline (reuse NewsPanel's
      TCAS70 tab pieces); "Add to Calendar" button on an event → login CTA when
      `user == null`.

## Phase 3 — Guest mode

### Task 3.1: `FeatureLayout` + login-in-place **[Cursor]**

**Files:** Create `src/components/FeatureLayout.jsx`

- [ ] Slim header: site title (pixel font), "เครื่องมืออื่น ▾" link to Hub, and a
      login/avatar button using `useAuthStore` — sign-in works on the subdomain
      itself (Phase 0 authorized domains). No MobileLayout, no MiniPlayer, no
      coins/streak HUD.

### Task 3.2: Guest persistence + merge seam **[Claude Code]** — do before 3.3

**Files:** Create `src/services/guestMerge.js` + tests; modify roadmap/school
stores minimally

- Guest work saves under `rc-guest-roadmap` / `rc-guest-school` localStorage keys
  (Zustand `persist` active only while logged out — `sessionBootstrap` already
  arms Firestore sync only after login, so no double-write).
- `guestMerge.js`: `hasGuestWork()`, `mergeGuestWork(uid)` — called from
  `sessionBootstrap` after hydration: cloud side empty → merge silently and clear
  guest keys; cloud has data → surface a pending-conflict flag for the UI.
- Merge = additive (guest nodes/subjects appended), never overwrite (ADR-0012).

### Task 3.3: Conflict dialog + AI gates **[Cursor]**

**Files:** Create `src/components/GuestMergeDialog.jsx`; touch AI entry points

- [ ] Dialog (existing popup template pattern): "พบงานที่ทำไว้ก่อน login" →
      buttons "เก็บงานใหม่เพิ่มเข้าไป" / "ทิ้งงาน guest". Wire to the
      pending-conflict flag from Task 3.2.
- [ ] Every AI action reachable from a feature site (AI journey/roadmap generate,
      AI tasks) → when `user == null`, show login CTA instead of calling Gemini.
      Manual editing stays free and unlimited.

### Task 3.4: Public-read rules audit **[Claude Code]**

- News feed + `tcasEvents` collections must be world-readable (news site works
  logged-out); confirm nothing else opens up. Extend `test/rules/` and run
  `npm run test:rules`.

## Phase 4 — SEO prerender **[Claude Code]**

**Files:** Create `scripts/prerender.mjs`; modify `vercel.json`, `package.json`
(build → `vite build && node scripts/prerender.mjs`), `index.html`

- Prerender each site's `/` (hub + 4 landings) to `dist/sites/<key>/index.html`:
  real Thai `<title>`/meta description/OG tags, JSON-LD (`WebSite` + `ItemList`
  on hub, `WebApplication` per tool), landing content as static HTML that the SPA
  hydrates over.
- Per-host `sitemap.xml` + `robots.txt` under `dist/sites/<key>/`.
- `vercel.json`: host-conditioned rewrites — for each subdomain,
  `{ source: "/", has: [{ "type": "host", "value": "<host>" }], destination:
  "/sites/<key>/index.html" }` (plus sitemap/robots per host); everything else
  keeps the existing SPA catch-all. Legacy apex redirects (301) for
  `/home`, `/auth`, `/news/:id` to their new hosts.
- Runtime: tiny effect sets `document.title`/meta per site for SPA navigations.

## Phase 5 — Programmatic SEO **[deferred — do not build now]**

Per-university/คณะ static pages generated from the MyTCAS snapshot under
`tcas.ilovetcas.com` + sitemap index. Decided in ADR-0012 as Phase 2; plan it as
its own doc once Phases 0–4 are live and indexed.

---

## Verification

- [ ] `npm test` and `npm run test:rules` green.
- [ ] Dev: `npm run dev` then visit `localhost:5173/?site=hub|roadmap|tcas|news|school`
      — each renders its own tree; no `?site=` → today's app unchanged.
- [ ] Guest flow: incognito → `?site=roadmap` → build 3 nodes → refresh (work
      survives) → login → nodes appear in Firestore; second run with existing
      cloud data shows the conflict dialog.
- [ ] `*.vercel.app` production URL still behaves exactly as before the change.
- [ ] After deploy: `curl -H "Host: roadmap.ilovetcas.com" https://ilovetcas.com/`
      returns prerendered HTML containing the Thai H1 (view-source, no JS).
