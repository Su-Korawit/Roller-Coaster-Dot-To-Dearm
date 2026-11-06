# 0029 — ilovetcas.com opens the OS shell

- **Status:** accepted
- **Date:** 2026-11-06

## Context

ADR 0012 made `ilovetcas.com` the **Hub**: a marketing/SEO homepage rendered on request by
`api/content.js` (`route=home`), with no auth state. The product is being redesigned as a
device-like OS (login with Google → device passcode → Home with apps, Store). The owner wants
the apex domain itself to show that OS.

## Decision

- `ilovetcas.com` and `www.ilovetcas.com` serve the **OS shell** at `/` (`src/os/OsShell.jsx`),
  via the normal SPA shell. The two `/` → `/api/content?route=home` rewrites are removed from
  `vercel.json`; `/` now falls through to the SPA catch-all.
- The hub route tree keeps everything else: `/blog/:slug`, `/category/:cat`, `/search`,
  `/openhouse`, sitemap, robots. The old hub home (article list) moves to `/articles` and is
  client-rendered.
- `app.ilovetcas.com` also serves the OS at `/` (the old landing moved to `/welcome`).

## Considered options

1. Keep the hub home and put the OS only on `app.` — rejected, the owner wants the apex to be the OS.
2. Redirect `ilovetcas.com` → `app.ilovetcas.com` — rejected: two origins, and the apex would stop being the product.
3. **OS at the apex (chosen).**

## Consequences

- Firebase Auth runs on the apex origin: `ilovetcas.com` (and `www`) **must be in Firebase
  Authentication → Authorized domains**, or Google sign-in shows "domain not authorized".
- Auth session, passcode (`rc-os-pass-*`), wallpaper and avatar live per origin, so a user signed in
  on `app.` is not signed in on the apex until they log in there too.
- SEO: the homepage no longer has server-rendered copy; it is the SPA shell's `<title>`/description.
  Article pages, category pages, sitemap and robots are unaffected. Revisit with a prerendered
  landing paragraph if search traffic to `/` matters.
- Nothing links to `/articles` yet; add an OS app or Store entry for the content site later.
- Tests: `api/vercelConfig.test.js` now asserts the apex has no `/` rewrite and the SPA catch-all stays last.
