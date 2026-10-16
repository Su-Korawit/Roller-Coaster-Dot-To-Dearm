# 0022 — Content site and Studio

**Status:** accepted
**Date:** 2026-10-16

## Context

`ilovetcas.com` was a static page that listed the product's tools. The product needs a
place that answers what students actually search for ("which admission rounds does
each faculty offer, and how do the projects differ") and that leads readers into the
web app (`app.ilovetcas.com`). Content creators who are not developers will write the
articles, so writing and publishing must happen inside our own app, and a half-edited
article must never reach readers. Search engines and chat apps must see real HTML.
Design: `docs/superpowers/specs/2026-10-16-content-site-design.md`.

## Decision

- **Draft and live are separate documents.** Creators edit `articleDrafts/{draftId}`
  (random id, creator-only rules). Readers see `articles/{slug}`, which clients can never
  write: only the callables `publishArticle` / `unpublishArticle` (Firebase Functions)
  copy a validated draft to it. The draft remembers the result in server-owned fields
  `publishedSlug`, `publishedAt` and `isLive`; the rules reject a client that tries to
  change them.
- **Slug claimed at publish, immutable after.** The function claims `articles/{slug}`
  inside a transaction; a slug owned by another draft is refused (`already-exists`).
  Unpublishing removes the live document but keeps the slug on the draft, so the same
  article republishes at the same address.
- **Role as a custom claim.** `creator: true` on the Firebase Auth token, granted by
  the super-admin through `grantCreatorRole` (Admin → Hub). The same check lives in the
  rules (`isCreator()`) and the functions (`requireCreator`). A new role shows up on the
  next token, so the Studio offers "refresh role".
- **Body is TipTap/ProseMirror JSON stored as a JSON string** (one text field, ≤ 716,800
  bytes, well under Firestore's 1 MiB document limit with the other fields), never HTML.
  `src/content/renderBody.js` renders it with a whitelist (known nodes and marks only,
  escaped text, `https`/`http`/`mailto` links, `https` images). The editor offers only
  what the renderer supports; `stripUnsupported` removes anything else on load.
- **Pages are rendered by a function.** `api/content.js` (Vercel) reads Firestore
  through the public REST endpoint, builds the head (title, description, canonical, Open
  Graph, `Article` JSON-LD) and the readable HTML, and injects both into the SPA shell
  (`/app.html`), which then hydrates. Success is cached
  `public, s-maxage=60, stale-while-revalidate=86400`; errors are `503` with `no-store`
  so a crawler never caches an empty page.
- **Client and server validate with the same rules.** `functions/articleLogic.js` (CJS)
  and `src/content/validatePublish.js` are kept identical by a shared fixture file
  (`src/content/publishFixtures.json`) that both test suites run.
- **Home is a content site, not a tool list.** Full-screen banner → app, search, rows
  per category, LINE OpenChat band, tools strip. Every outbound link to the app carries
  `utm_source=hub&utm_medium=<banner|article|band|nav>&utm_campaign=<slug|home>`.
- **Legacy news** (`welcomeConfig/news`) is migrated into articles by
  `scripts/migrateWelcomeNews.mjs` (old id kept as the slug); `/news/:id` redirects.

## Considered options

- **Headless CMS / WordPress** — fastest to start but a second system, second login and
  no link to our users and roles. Rejected.
- **Static prerender at build time** (what the hub used before) — cannot show an article
  published a minute ago without a deploy. Rejected.
- **One document with a `status` field** — a rules slip would expose drafts and a
  half-edited live article. The two-collection split makes "live" mean "validated by the
  server at the moment of publish". Rejected.
- **Store HTML** — XSS surface for any compromised creator account. Rejected.
- **Next.js / full SSR framework** — a rewrite of routing for four page types.
  Rejected; one function plus the existing shell is enough.

## Consequences

- Deploy order matters: **rules → functions → hosting** (see
  `docs/content-site-ops.md`). Publishing fails closed if the functions are missing.
- Vercel env: `FIREBASE_PROJECT_ID` (defaults to `rollercoasterdottodream`) and
  `FIREBASE_API_KEY` are both optional; the key is only needed if the project requires
  one on public REST reads.
- `npm run test:rules:emu` (Firestore + Auth + Storage emulators, Java required) covers
  the rules and the real function handlers; the default `npm test` does not need them.
- Article images live in Storage under `articles/{draftId}/…` (creator-only write,
  < 5 MB, `image/*`); they are resized to 1600 px before upload.
- The Studio chunk includes TipTap (~470 kB) and is lazy-loaded; the entry bundle is
  unchanged.
- Reader comments, scheduled publishing, revision history and multi-author editing are
  out of scope.
