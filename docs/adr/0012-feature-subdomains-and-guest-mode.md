# 0012 — Feature Subdomains, Public Hub, and Local-First Guest Mode

**Status:** accepted
**Date:** 2026-07-09

## Context

After the rebrand to I LOVE TCAS (ADR-0011), the owner wants to restructure the
web application on the ILOVEPDF model: a marketing **Hub** homepage that lists
every tool, each major feature reachable directly at its own address with its
own SEO landing page, and tools usable immediately — without logging in and
without loading the Phaser game.

Today the app is the opposite shape: one SPA where `/` is `WelcomePage` (game
hero + login CTA), everything real lives behind `RequireAuth` at `/home`, and
no feature has a URL of its own. The app is also a pure client-side SPA, so
crawlers see an empty `<div id="root">` until JS runs — "Super Top Search"
ranking is impossible in that shape.

Decisions were made in an interview on 2026-07-09 (hand sketch: hub-and-spoke,
`core` centre, homepage + features 1–5, "SEO / standing out").

## Decision

### 1. True subdomains, one Vercel project

Each public feature gets a real subdomain. The owner explicitly chose
subdomains over ILOVEPDF-style sub-paths, accepting the known costs
(per-origin auth sessions, per-subdomain authorized-domain setup, split SEO
authority) in exchange for hard product separation.

| Host | Site key | Contents |
|---|---|---|
| `ilovetcas.com` (+ `www`) | `hub` | New ILOVEPDF-style tool grid. Marketing + SEO only, no login |
| `roadmap.ilovetcas.com` | `roadmap` | Landing + Roadmap builder (guest-capable) |
| `tcas.ilovetcas.com` | `tcas` | Landing + คณะ/มหาลัย search (MyTCAS data, public) |
| `news.ilovetcas.com` | `news` | ข่าว + ปฏิทิน TCAS timeline; `/:id` = news post |
| `school.ilovetcas.com` | `school` | ตารางเรียน + การบ้าน + to-do (School System, guest-capable) |
| `app.ilovetcas.com` | `app` | The full existing application — WelcomePage, login, game, everything |

- **One repo, one build, one Vercel project** with a wildcard domain
  (`*.ilovetcas.com`). The SPA resolves its **site key** from
  `window.location.hostname` at boot and renders that site's route tree.
- **Unknown hosts default to `app`** — `*.vercel.app`, `localhost`, and any
  future preview URL behave exactly like today, so existing users (whose auth
  session and `rc-*` localStorage live on the vercel.app origin) see no change.
- Dev override: `?site=<key>` query param / `VITE_SITE` env.
- **To-do is folded into `school`**, not its own subdomain — School System
  Appointments already are homework/to-do items; a fifth near-duplicate tool
  would split maintenance and confuse users. Net: 4 feature subdomains.
- MBTI deliberately **not** a public tool — it stays inside the app.

### 2. Local-first guest mode

- Feature sites render their tool with **no `RequireAuth` and no user doc**.
  Guest work persists in localStorage (Zustand `persist`, `rc-guest-*` keys).
  No Firebase Anonymous Auth — no junk user docs, no rules churn.
- **AI features are login-gated** (Gemini calls cost money per call); manual
  tool use is free and unlimited. Same split as ILOVEPDF free/premium.
- **Login is available on every subdomain** — each host is added to Firebase
  Auth authorized domains. A guest clicking "บันทึก" signs in in place and the
  local work merges up to Firestore. Sessions remain per-origin (a user
  crossing subdomains signs in once per subdomain per device — accepted).
- **Merge policy:** cloud empty → merge silently; cloud has existing data →
  dialog asking "เก็บงานใหม่เพิ่มเข้าไป" or "ทิ้งงาน guest". Never silently
  overwrite either side.

### 3. SEO: build-time prerender, programmatic pages later

- **Phase 1:** every site's `/` landing is prerendered to static HTML at build
  time (Thai keyword copy, meta/OG tags, JSON-LD) and served host-conditionally
  via `vercel.json` rewrites; plus per-host `sitemap.xml` and `robots.txt`.
  Deeper routes stay SPA. Stack remains Vite — no SSR framework migration.
- **Phase 2 (deferred):** programmatic SEO — generate static pages per
  university/program from the MyTCAS snapshot under `tcas.ilovetcas.com`
  (the admissionpremium play). Decided in principle; not in the first build.

### 4. Homepage split

The new Hub replaces WelcomePage at the apex. WelcomePage (hero + game entry)
moves unchanged to `app.ilovetcas.com/`. Legacy apex paths (`/home`,
`/news/:id`, `/auth`, …) redirect to their new hosts.

## Considered options

- **Sub-paths (`ilovetcas.com/roadmap`)** — recommended during the interview
  (single origin: shared auth session, pooled SEO authority, matches what
  ILOVEPDF actually does) — rejected by owner in favour of hard subdomain
  separation.
- **Separate Vercel project per subdomain** — rejected: duplicated
  config/stores/lib or a monorepo migration, for zero user value.
- **Firebase Anonymous Auth for guests** — rejected: junk user docs, rules and
  cleanup burden; localStorage already exists via Zustand persist.
- **Force login on `app.` only** — rejected: localStorage cannot cross
  origins, so guest work on a feature subdomain would be stranded at login.
- **Meta-tags-only SEO / full SSG framework migration** — rejected: the former
  doesn't rank, the latter forks the codebase and the Cursor workflow.

## Consequences

- `src/App.jsx` becomes a site-key switch over per-site route trees; feature
  pages must render without a user object.
- Firestore rules must allow unauthenticated **read** of the public content
  collections feature sites need (news feed, `tcasEvents`); everything else
  stays auth-gated. Needs a rules audit + `npm run test:rules` coverage.
- Owner console work: Vercel wildcard domain + DNS, six entries in Firebase
  Auth authorized domains.
- A guest-merge seam (`services/guestMerge.js`) joins sessionBootstrap as the
  second thing that runs at login.
- The build gains a prerender step (`scripts/prerender.mjs`) and
  `vercel.json` gains host-conditioned rewrites/redirects.
- ADR-0011's internal-identifier freeze still holds: `rc-*` keys, `rc/`
  storage prefix, Firebase project id are untouched.
- Implementation plan: `docs/superpowers/plans/2026-07-09-ilovetcas-subdomains-restructure.md`.
