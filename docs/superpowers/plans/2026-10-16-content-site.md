# Content Site + Creator Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `ilovetcas.com` into a content site (full-screen banner to the app, article rows, search, LINE OpenChat band) and give a hired creator a Studio at `app.ilovetcas.com/studio` to write, preview and publish articles alone.

**Architecture:** Drafts (`articleDrafts/{draftId}`) are separate from live articles (`articles/{slug}`); only Cloud Functions write `articles`. Article bodies are stored as TipTap JSON **text** and rendered by a whitelist renderer (no raw HTML anywhere). A Vercel function `api/content.js` renders hub pages on request (cached) into the SPA shell for crawlers; the SPA mounts the same routes client-side from Firestore.

**Tech Stack:** React 19, Vite, Tailwind v4 (Soft Pixel tokens, PR #37), Firebase (Firestore, Storage, Functions v2 `onCall`), Vercel functions (`api/`), TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link|image|table*`), Vitest (+ jsdom per file), Firebase emulators for rules/functions tests.

**Spec:** `docs/superpowers/specs/2026-10-16-content-site-design.md` (mockup: `docs/superpowers/specs/assets/2026-10-16-content-site/home-mockup.html`). Branch is stacked on `feat/soft-pixel-part-a`.

## Global Constraints

- Plain JS/JSX only; Tailwind v4 tokens only (no `tailwind.config.js`); Firestore paths only through `src/lib/db.js`; Firestore writes from the editor are **debounced (2000 ms)**; never inline `doc(db, …)`.
- Categories (exact ids / Thai labels): `news` ข่าว TCAS · `camps` ค่ายและกิจกรรม · `guide` แนะแนวเลือกคณะ · `compare` เทียบโครงการ · `motivation` ให้กำลังใจ.
- Limits: title ≤ 120 chars, excerpt ≤ 160, tags ≤ 8, image ≤ 5 MB (`image/*`), resized to ≤ 1600 px wide; slug `^[A-Za-z0-9][A-Za-z0-9_-]{2,79}$`.
- Link schemes allowed: `https`, `http`, `mailto`. External links get `rel="noopener noreferrer nofollow"`. Images only from `https:` URLs. Unknown node/mark types are dropped.
- Public routes on hub hosts (`ilovetcas.com`, `www.ilovetcas.com`): `/`, `/blog/:slug`, `/category/:cat`, `/search`, `/sitemap.xml`. Function cache header: `Cache-Control: public, s-maxage=60, stale-while-revalidate=86400`; error responses `Cache-Control: no-store`.
- App/OpenChat links carry `utm_source=hub&utm_medium=<banner|article|band>&utm_campaign=<slug|home>`.
- `articles/*` is never written by a client. Creator role = custom claim `creator: true` (callable `grantCreatorRole`, super-admin only). Super-admin uid is `IaltEhO0mPVfK3ng8npr4CdqnEE3`.
- Body is stored as a **JSON string** in field `body` (avoids Firestore nesting/undefined limits); max 700 KB.
- Thai UI copy in sentence case; no all-caps labels. Soft Pixel components (`px-card`, `px-btn`, `ItemSlot`…) from PR #37.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Stored XSS through creator content** (script text, `javascript:` links, `data:` images, unknown nodes). Pinned in Task 2.
2. **Slug hijack / collision**: a second creator publishing an existing slug, or republishing someone else's article. Pinned in Tasks 3–5.
3. **Half-edited content going live**: autosave touching `articles`, or any client write to it. Pinned in Task 5.
4. **Crawler gets an empty or cached-error page** when Firestore or the shell fetch fails. Pinned in Task 6.
5. **Thai-only titles → empty slug; oversize bodies; running the migration twice.** Pinned in Tasks 1, 3, 9.

---

### Task 1: Content schema and slug helpers

**Files:**
- Create: `src/content/schema.js`
- Test: `src/content/schema.test.js`

**Interfaces:**
- Produces: `CATEGORIES: Array<{ id, labelTh }>` (exact list above), `CATEGORY_IDS: string[]`, `categoryLabel(id) -> string` (unknown → `''`), `LIMITS = { titleMax: 120, excerptMax: 160, tagsMax: 8, imageMaxBytes: 5242880, imageMaxWidth: 1600, bodyMaxBytes: 716800 }`, `isValidSlug(s) -> boolean`, `slugify(title) -> string` (lower-cases, keeps `a-z0-9`, turns runs of anything else into `-`, trims `-`, max 80; Thai-only → `''`), `suggestSlug(title, fallbackId) -> string` (`slugify(title)` if ≥ 3 chars else `a-` + first 8 chars of `fallbackId` lower-cased).

- [ ] **Step 1: Write the failing tests** — `slugify('Medicine KU 2570!')` → `medicine-ku-2570`; `slugify('คณะแพทย์')` → `''`; `suggestSlug('คณะแพทย์', 'AbCdEfGh123')` → `a-abcdefgh`; `isValidSlug('ab')` false, `isValidSlug('a-b_c')` true, `isValidSlug('-ab')` false, 81-char string false; `CATEGORY_IDS` equals `['news','camps','guide','compare','motivation']`; `categoryLabel('guide')` = `แนะแนวเลือกคณะ`.
- [ ] **Step 2: Run** `npx vitest run src/content/schema.test.js` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the exports in `src/content/schema.js` (ESM, no imports).
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): schema constants and slug helpers`.

---

### Task 2: Body renderer (JSON → safe HTML) and plain text

**Files:**
- Create: `src/content/renderBody.js`
- Test: `src/content/renderBody.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseBody(text) -> object | null` (`JSON.parse`, returns `null` on error or non-`doc` root); `renderBodyToHtml(doc) -> string`; `plainText(doc) -> string` (text of all text nodes, blocks separated by a space); `readingMinutes(doc) -> number` (`max(1, ceil(chars / 600))`); `EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }`. Supported nodes: `doc, paragraph, heading(2|3), text, hardBreak, bulletList, orderedList, listItem, blockquote, horizontalRule, image, table, tableRow, tableHeader, tableCell`; marks: `bold, italic, link`. Output uses plain elements (`p h2 h3 ul ol li blockquote hr img table tr th td strong em a br`) and class `article-body` is added by callers, not here.

- [ ] **Step 1: Write the failing tests** (`describe('renderBodyToHtml')`):
  - paragraph with `bold` text → `<p><strong>…</strong></p>`; heading level 1 or 4 is clamped to `h2` / `h3`.
  - text `<script>alert(1)</script>` is escaped (`&lt;script&gt;`), output contains no `<script`.
  - link mark with `href: 'javascript:alert(1)'` → text kept, **no `<a`, no `javascript:`**; `https://x.org/a?b=1&c=2` → `<a href="https://x.org/a?b=1&amp;c=2" rel="noopener noreferrer nofollow">`; `mailto:` allowed; `//evil.com` and `data:text/html,…` rejected.
  - image with `src: 'data:image/png;base64,AAA'` or `javascript:` dropped; `https://…` image renders `<img src alt loading="lazy">` with `alt` escaped (`"` → `&quot;`).
  - unknown node `{ type: 'iframe' }` and node with `type: 'script'` produce nothing; an unknown node **with children** is dropped entirely.
  - a table (`table > tableRow > tableHeader|tableCell > paragraph`) renders `<table>` with `<th>`/`<td>`; `colspan` attr passes through only as an integer 1–10.
  - attribute injection: `attrs: { href: 'https://a.com" onclick="x' }` yields no `onclick` in output.
  - `parseBody('not json')` → `null`; `parseBody('{"type":"x"}')` → `null`; `readingMinutes` of 1,201 chars = 3; `plainText` joins paragraphs with a space.
  - `renderBodyToHtml(null)` → `''`.
- [ ] **Step 2: Run** `npx vitest run src/content/renderBody.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** the module: a node-type → renderer map, `escapeHtml`, `safeHref(url)` (parse with `new URL(url)` in a try; accept only the three schemes), recursion with a depth cap of 20 (deeper nodes dropped).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): safe body renderer`.

---

### Task 3: Publish logic (functions) and its client mirror

**Files:**
- Create: `functions/articleLogic.js` (CommonJS), `src/content/validatePublish.js`, `src/content/publishFixtures.json`
- Test: `functions/articleLogic.test.js`, `src/content/validatePublish.test.js`

**Interfaces:**
- Consumes: Task 1 limits/categories (copied as constants in `articleLogic.js`; the parity test keeps them in step).
- Produces (identical behaviour in both files):
  - `validateDraftForPublish(draft) -> { ok: boolean, errors: Array<{ field: string, code: string }> }`. Checks: `title` required and ≤ 120 (`required`/`too_long`); `slug` matches the slug regex (`invalid_slug`); `category` in the five ids (`invalid_category`); `excerpt` required and ≤ 160; `coverUrl` required (https); `coverAlt` required; `body` parses to a doc with ≥ 1 text node (`empty_body`), byte length ≤ 716800 (`body_too_large`); every image node has non-empty `attrs.alt` (`image_alt_missing`, field `body`); `tags` ≤ 8 (`too_many`).
  - `functions/articleLogic.js` also exports: `planPublish({ draft, draftId, uid, isSuperAdmin, existingLive, now }) -> { liveDoc, draftPatch }` and `planUnpublish({ live, uid, isSuperAdmin }) -> void`. Typed failures: `Error` with `.code` ∈ `'permission-denied' | 'failed-precondition' | 'already-exists' | 'invalid-argument'` and, for validation, `.errors` (the array above).
  - `planPublish` rules: only the draft's `authorUid` (or super-admin) may publish; `slug` = `draft.publishedSlug` if set, else `draft.slug`; if `existingLive` exists and `existingLive.draftId !== draftId` → `already-exists`; if `draft.publishedSlug` is set and `draft.slug !== draft.publishedSlug` the slug stays `publishedSlug`; `liveDoc` = title, excerpt, category, tags, coverUrl, coverAlt, body, `authorUid`, `authorName`, `draftId`, `seo`, `readingMinutes`, `publishedAt` = `existingLive?.publishedAt ?? now`, `updatedAt` = `now`; `draftPatch` = `{ publishedSlug: slug, publishedAt: liveDoc.publishedAt, updatedAt: now }`.
  - `planUnpublish`: author or super-admin only, else `permission-denied`.
- `publishFixtures.json`: array of `{ name, draft, expectedErrors: Array<{field,code}> }` shared by both tests (valid draft, each failure above, image without alt, Thai title with valid slug, 700 KB+1 body).

- [ ] **Step 1: Write the failing tests:** both test files iterate `publishFixtures.json` and assert identical `expectedErrors` (order-insensitive); `articleLogic.test.js` adds: `planPublish` by a non-author non-admin → `permission-denied`; same slug owned by another `draftId` → `already-exists`; republish keeps `publishedAt` and the original slug even if `draft.slug` changed; a draft failing validation throws `failed-precondition` with `.errors`; `planUnpublish` by stranger → `permission-denied`.
- [ ] **Step 2: Run** `npx vitest run functions/articleLogic.test.js src/content/validatePublish.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** both modules (body parsing/alt check is a small recursive walk; do not import `src/` from `functions/`).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): publish validation and plans (functions + client mirror)`.

---

### Task 4: Creator role and article callables

**Files:**
- Create: `functions/creatorClaims.js`
- Modify: `functions/index.js` (add three exports next to `grantTeacherBadge`)
- Test: `functions/creatorClaims.test.js`, `test/rules/articles.functions.test.js` (emulator)

**Interfaces:**
- Consumes: `planPublish`, `planUnpublish` (Task 3).
- Produces: `nextCreatorClaims(existing, { revoke }) -> object` (sets/deletes `creator`, preserves other claims). Callables: `grantCreatorRole({ email?, uid?, revoke? }) -> { ok, uid, creator }` (super-admin only; resolves email via `admin.auth().getUserByEmail`; unknown user → `not-found`); `publishArticle({ draftId }) -> { ok, slug }` (caller needs `token.creator === true` or super-admin; runs `planPublish` inside a Firestore transaction reading `articleDrafts/{draftId}` and `articles/{slug}`; maps typed errors to `HttpsError` keeping `details: { errors }` for validation); `unpublishArticle({ slug }) -> { ok }` (deletes `articles/{slug}`; the draft keeps `publishedSlug`).

- [ ] **Step 1: Write the failing tests:** unit — `nextCreatorClaims({ teacher: true }, {})` → `{ teacher: true, creator: true }`; revoke removes only `creator`. Emulator (`articles.functions.test.js`, pattern of `test/rules/teacher.test.js`): `grantCreatorRole` by a non-super-admin → `permission-denied`; by super-admin for a seeded user sets the claim; `publishArticle` by an uncredentialed user → `permission-denied`; by the author with a valid draft creates `articles/{slug}` and sets `publishedSlug` on the draft; a second creator publishing the same slug → `already-exists` and the first article unchanged; author B cannot publish author A's draft; `unpublishArticle` by a stranger → `permission-denied`, by the author deletes the doc.
- [ ] **Step 2: Run** `npx vitest run functions/creatorClaims.test.js` — Expected: FAIL; emulator tests run in Step 4.
- [ ] **Step 3: Implement** `creatorClaims.js` and the three `onCall` exports (reuse the file's `requireUid`, `db`, `admin`, `SUPER_ADMIN_UID`).
- [ ] **Step 4: Run** `npx vitest run functions/creatorClaims.test.js` then `npm run test:rules:emu -- test/rules/articles.functions.test.js` (see `package.json`) — Expected: PASS. If the emulator cannot start on this machine, record that in the ledger and keep the unit tests as the gate.
- [ ] **Step 5: Commit** `feat(functions): creator role and article publish callables`.

---

### Task 5: Firestore and Storage rules

**Files:**
- Modify: `firestore.rules` (new `match` blocks), `storage.rules`
- Test: `test/rules/articles.rules.test.js` (emulator; follow `firestore.rules.test.js` for setup)

**Interfaces:**
- Produces rules: `articles/{slug}`: `allow read: if true; allow write: if false;`. `articleDrafts/{id}`: `read` if signed in and (`resource.data.authorUid == request.auth.uid` and `request.auth.token.creator == true`) or super-admin; `create` if creator claim and `request.resource.data.authorUid == request.auth.uid` and `publishedSlug` absent; `update` if (author with creator claim, `authorUid` and `publishedSlug` unchanged) or super-admin; `delete` if (author and `resource.data.publishedSlug` absent/empty) or super-admin. `siteConfig/{doc}`: read true, write super-admin. Storage `articles/{draftId}/{file}`: read true; write if (`token.creator == true` or super-admin) and `request.resource.size < 5 * 1024 * 1024` and `request.resource.contentType.matches('image/.*')`.

- [ ] **Step 1: Write the failing tests:** anonymous reads an `articles/x` doc; **no signed-in user (including creator and super-admin) can write `articles`**; creator can create/update own draft, cannot create a draft with someone else's `authorUid`, cannot change `authorUid`/`publishedSlug`, cannot read another creator's draft, cannot delete a draft with `publishedSlug`; super-admin reads/edits any draft; a normal user without the claim cannot create a draft; `siteConfig/hub` public read, only super-admin writes; Storage: creator uploads a 1 MB `image/png` to `articles/d1/a.png`, a 6 MB file and a `text/html` file are rejected, anonymous cannot write, anyone can read.
- [ ] **Step 2: Run** `npm run test:rules:emu -- test/rules/articles.rules.test.js` — Expected: FAIL (rules missing).
- [ ] **Step 3: Implement** the rules in both files, matching the style (`isSuperAdmin()` helper already exists in both).
- [ ] **Step 4: Run** the same command plus the existing `npm run test:rules:emu` — Expected: PASS (no regression in other rules tests).
- [ ] **Step 5: Commit** `feat(rules): articles, drafts, siteConfig and article image storage`.

---

### Task 6: Server-rendered pages — `api/content.js`

**Files:**
- Create: `src/content/firestoreRest.js`, `src/content/htmlPages.js`, `api/content.js`
- Modify: `vercel.json`
- Test: `src/content/firestoreRest.test.js`, `src/content/htmlPages.test.js`, `api/content.test.js`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces:
  - `decodeDocument(restDoc) -> object` (Firestore REST typed values `stringValue|integerValue|doubleValue|booleanValue|timestampValue|nullValue|arrayValue|mapValue` → JS; timestamps → ISO strings; doc `name` tail → `id`).
  - `htmlPages.js`: `homeBody({ latestByCategory, config }) -> string`, `articleBody({ article, related, config }) -> string`, `categoryBody({ category, items }) -> string`, `sitemapXml({ origin, articles }) -> string`, `headFor({ route, title, description, canonical, image, jsonLd }) -> string`, `injectIntoShell(shellHtml, { head, body }) -> string` (replaces `<title>`, description/canonical/OG/Twitter/JSON-LD tags in `<head>`, puts `body` inside `<div id="root">…</div>`), `fallbackPage({ origin }) -> string` (minimal valid page linking to `https://app.ilovetcas.com`).
  - `api/content.js` default `handler(req, res, deps?)` where `deps = { fetchImpl, now }` (defaults to global `fetch`/`Date`): reads `req.query.route` (`home|article|category|search|sitemap`) plus `slug`/`cat`; loads data from `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID||'rollercoasterdottodream'}/databases/(default)/documents` (optional `?key=${FIREBASE_API_KEY}`), the shell from `https://${host}/app.html`; replies `200` HTML with the cache header; unknown slug → `404` HTML page (cached 60 s); any upstream failure → `fallbackPage` with `503` and `Cache-Control: no-store`.
  - `vercel.json`: replace the hub-host `/` → `/sites/hub/index.html` and `/sitemap.xml` rewrites (both `ilovetcas.com` and `www`) with `/api/content?route=home` and `/api/content?route=sitemap`; add rewrites `/blog/:slug` → `route=article&slug=:slug`, `/category/:cat` → `route=category&cat=:cat`, `/search` → `route=search`, all host-conditioned like the existing ones; keep `/robots.txt` static; change hub-host redirect `/news/:id` to `https://ilovetcas.com/blog/:id` (same host, permanent: false until Task 9 migrates data).

- [ ] **Step 1: Write the failing tests:**
  - `decodeDocument` for each typed value, nested map/array, and a missing `fields`.
  - `htmlPages`: `articleBody` contains the title in an `<h1>`, the rendered body, the author, a CTA link to `https://app.ilovetcas.com/?utm_source=hub&utm_medium=article&utm_campaign=<slug>`; titles/excerpts are HTML-escaped (`<img onerror>` in a title stays inert); `headFor` emits `<link rel="canonical" href>` and `og:title`; `sitemapXml` lists `/`, categories, and each article with `<lastmod>`; `injectIntoShell` keeps the shell's script/link tags and replaces an existing `<title>`.
  - `api/content`: with fake `fetchImpl` returning a published article → `200`, body contains the title text and the cache header `public, s-maxage=60, stale-while-revalidate=86400`; unknown slug → `404`; `fetchImpl` throwing → `503` with `no-store` and **not an empty body**; a `status: draft` or missing article never renders; `route=sitemap` → `application/xml`.
  - a `vercel.json` test (`api/vercelConfig.test.js`): for both hub hosts there are rewrites for `/`, `/sitemap.xml`, `/blog/:slug`, `/category/:cat`, `/search`; `/robots.txt` still rewrites to `/sites/hub/robots.txt`; no rewrite sends `app.ilovetcas.com` paths to the function.
- [ ] **Step 2: Run** `npx vitest run src/content/firestoreRest.test.js src/content/htmlPages.test.js api/content.test.js api/vercelConfig.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** the modules and edit `vercel.json`; the function reads articles with a structured query (`published articles ordered by publishedAt desc`, limit 60) via `:runQuery`, and `siteConfig/hub` via a document GET.
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): server-rendered hub pages and sitemap`.

---

### Task 7: Client data layer

**Files:**
- Modify: `src/lib/db.js` (new refs/cols/queries)
- Create: `src/content/listing.js`, `src/stores/useArticlesStore.js`
- Test: `src/content/listing.test.js`, `src/stores/useArticlesStore.test.js`, extend `src/lib/db.test.js`

**Interfaces:**
- Produces in `db.js`: `refs.article(slug)`, `refs.articleDraft(id)`, `refs.siteConfigHub()`, `cols.articles`, `cols.articleDrafts`, `queries.publishedArticles(n = 60)` (order `publishedAt` desc), `queries.draftsByAuthor(uid)` (order `updatedAt` desc), `queries.allDrafts()`.
- `listing.js`: `toSummary(article) -> { slug, title, excerpt, category, tags, coverUrl, coverAlt, authorName, publishedAt, readingMinutes }`, `groupByCategory(summaries, perCategory = 3) -> Record<categoryId, summary[]>`, `searchSummaries(summaries, query) -> summary[]` (case-insensitive; matches title, excerpt, tags; Thai-safe `includes`; empty query → `[]`), `relatedTo(summaries, article, n = 3)`.
- `useArticlesStore`: state `{ summaries, config, loading, error }`; actions `loadHome()` (reads `queries.publishedArticles()` + `refs.siteConfigHub()` once), `loadArticle(slug) -> article | null` (reads `refs.article`; returns only published). No realtime listener (public pages re-read on load).

- [ ] **Step 1: Write the failing tests:** `listing` — `groupByCategory` keeps newest-first order and caps at 3; `searchSummaries(list, 'แพทย์')` finds title/excerpt/tag matches, `''` → `[]`; `relatedTo` excludes the article itself and prefers the same category; store — with mocked `firebase/firestore` (`getDocs`, `getDoc`) `loadHome` fills `summaries`/`config`, a rejected `getDocs` sets `error` and leaves `loading: false`; `loadArticle('missing')` → `null`; `db.test.js` — the new refs resolve the expected paths.
- [ ] **Step 2: Run** `npx vitest run src/content/listing.test.js src/stores/useArticlesStore.test.js src/lib/db.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** them (follow how `useNewsStore` and `db.test.js` mock Firestore).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): articles data layer`.

---

### Task 8: Hub pages (home, article, category, search)

**Files:**
- Create: `src/pages/hub/HubHome.jsx`, `ArticlePage.jsx`, `CategoryPage.jsx`, `SearchPage.jsx`; `src/components/hub/HubNav.jsx`, `HubHero.jsx`, `ArticleCard.jsx`, `CategoryRow.jsx`, `OpenChatBand.jsx`, `ToolsStrip.jsx`, `ArticleBody.jsx`, `CtaBlock.jsx`; `public/assets/hub/campus-hero.svg` (copy of `docs/superpowers/specs/assets/2026-10-16-ilovetcas-v2/campus-layout.svg`)
- Modify: `src/App.jsx` (`HubSiteRoutes`), `src/constants/sites.js` (hub copy), delete `src/pages/HubPage.jsx` and replace `src/pages/HubPage.test.jsx`
- Test: `src/pages/hub/HubHome.test.jsx`, `ArticlePage.test.jsx`, `CategoryPage.test.jsx`, `SearchPage.test.jsx`

**Interfaces:**
- Consumes: Tasks 1, 2, 7. Routes added to `HubSiteRoutes`: `/` → `HubHome`, `/blog/:slug` → `ArticlePage`, `/category/:cat` → `CategoryPage`, `/search` → `SearchPage`; existing redirects/legal routes remain; `/news/:id` → `/blog/:id` (same-site `Navigate`).
- Component contracts: `ArticleBody({ body: string })` renders `renderBodyToHtml(parseBody(body))` with `dangerouslySetInnerHTML` inside `<div className="article-body">` (the only place that does; its input is always renderer output); `CtaBlock({ slug })` renders the app and OpenChat links with the UTM params from Global Constraints; `HubHero` is `height: calc(100vh - 60px)` (min 560 px), campus SVG background, left panel, search field submitting to `/search?q=`, quick chips linking to `/search?q=<name>`, primary button **เข้าสู่แอป**, secondary **เดินดูแคมปัส Open House** hidden unless `config.openHouseEnabled` is true (default false), scroll cue.

- [ ] **Step 1: Write the failing tests:** `HubHome` — shows the hero headline `วางแผนสอบติดมหาลัย`, an **เข้าสู่แอป** link whose `href` starts with `https://app.ilovetcas.com/` and contains `utm_medium=banner`; renders a row per category that has articles and hides empty categories; shows the OpenChat band only when `config.lineOpenChatUrl` is set (button `href` equals it, includes `utm_medium=band`); renders the four tool links. `ArticlePage` — shows title/author/reading time, renders body headings, shows the not-found message for a missing slug, includes the `CtaBlock`, **never renders an unpublished article**, sets `document.title`. `SearchPage` — typing filters results; empty query shows hint; no match shows "ไม่พบบทความ" and a link to `https://tcas.ilovetcas.com`. `CategoryPage` — unknown category redirects to `/`. Axe-style basics: images have `alt`, hero buttons are links with text.
- [ ] **Step 2: Run** `npx vitest run src/pages/hub` — Expected: FAIL.
- [ ] **Step 3: Implement** pages/components with Soft Pixel classes; start from the approved mockup markup/CSS (translate it to Tailwind classes); update the hub entry in `sites.js` (`h1: 'วางแผนสอบติดมหาลัย แบบเล่นเกม'`, `title`/`description` unchanged semantics — keep SEO fields, they are used by `htmlPages.headFor` fallback).
- [ ] **Step 4: Run** `npx vitest run src/pages src/components` — Expected: PASS (fix any test that imported the old `HubPage`).
- [ ] **Step 5: Commit** `feat(hub): content home, article, category and search pages`.

---

### Task 9: Prerender change and legacy-news migration

**Files:**
- Modify: `scripts/prerender.mjs` (hub no longer emits `index.html`/`sitemap.xml`; keeps `robots.txt` with the new sitemap URL), `src/pages/NewsPostPage.jsx`, `src/App.jsx` (HubNewsRedirect target), `vercel.json` (hub `/news/:id` → `/blog/:id` permanent)
- Create: `src/content/migrate.js`, `scripts/migrateWelcomeNews.mjs`
- Test: `src/content/migrate.test.js`, extend any prerender test

**Interfaces:**
- Produces: `welcomeNewsToArticle(oldDoc, id, { authorUid, authorName }) -> { article, draft }` where `article.slug = id`, `category: 'news'`, `title = titleTh`, `excerpt` = first 160 chars of `bodyTh` (collapsed whitespace), `coverUrl = coverUrl ?? ''`, `coverAlt = titleTh`, `body` = JSON string of a doc with one `paragraph` per non-empty line of `bodyTh`, `publishedAt = createdAt` (ISO), `draftId = 'legacy-' + id`; `draft` mirrors it plus `publishedSlug = id`. Script: dry-run by default, `--apply` writes `articles/{id}` and `articleDrafts/legacy-{id}` with `set(..., { merge: false })` **only if the article doesn't already exist** (idempotent), prints counts.

- [ ] **Step 1: Write the failing tests:** conversion — multi-line text → paragraphs, empty `bodyTh` → one empty-safe paragraph, long text → excerpt ≤ 160, missing cover → `''`, body ≤ 700 KB; running the planning function twice over the same input yields the same ids; dry-run mode of the script's `planMigration(existingIds, oldDocs)` returns `{ toCreate, skipped }` and skips existing ids; `NewsPostPage` redirects (renders a `Navigate` to `https://ilovetcas.com/blog/<id>`); prerender output for hub contains `robots.txt` pointing at `https://ilovetcas.com/sitemap.xml` and no `sites/hub/index.html`.
- [ ] **Step 2: Run** `npx vitest run src/content/migrate.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement**; the script uses `firebase-admin` like `scripts/uploadAssets.mjs` and never runs without credentials.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): retire static hub prerender, migrate welcome news`.

---

### Task 10: Auth claims, `RequireCreator`, Studio list

**Files:**
- Modify: `src/stores/useAuthStore.js` (expose `claims` from `getIdTokenResult()` after sign-in and on `refreshClaims()`), `src/App.jsx` (routes under the app tree: `/studio`, `/studio/new`, `/studio/:draftId`; `RequireCreator`)
- Create: `src/services/articles.js`, `src/pages/studio/StudioListPage.jsx`, `src/components/studio/StudioShell.jsx`
- Test: `src/stores/useAuthStore.test.js` (extend), `src/services/articles.test.js`, `src/pages/studio/StudioListPage.test.jsx`

**Interfaces:**
- Produces: `useAuthStore` gains `claims: { creator?: boolean } | null` and `refreshClaims() -> Promise<void>`; `RequireCreator` allows when `claims.creator === true` or `user.uid === ADMIN_UID`; otherwise renders a page "บัญชีนี้ยังไม่มีสิทธิ์เขียนบทความ" with a **ลองรีเฟรชสิทธิ์** button (`refreshClaims`) and a link home. `src/services/articles.js`: `createDraft(uid, authorName) -> draftId` (random id, `status`-less draft with `slug: ''`, `body: JSON.stringify(EMPTY_DOC)`), `saveDraft(draftId, patch)` (updates only provided fields + `updatedAt: serverTimestamp()`), `publishArticle(draftId) -> { slug }`, `unpublishArticle(slug)`, `deleteDraft(draftId)`; callables via `httpsCallable(getFunctions(), name)`; `publishArticle` maps `HttpsError` details `{ errors }` into a thrown `PublishError` with `.errors`.
- Studio list: author sees own drafts (`queries.draftsByAuthor`), super-admin sees all (`queries.allDrafts`) with an author filter; each row shows title (or "ไม่มีชื่อ"), status chip (**ฉบับร่าง** / **เผยแพร่แล้ว** / **เผยแพร่แล้ว มีการแก้ไขที่ยังไม่เผยแพร่** when `updatedAt > publishedAt`), last edited, and links to the editor and (if published) the live article.

- [ ] **Step 1: Write the failing tests:** auth store — after a mocked sign-in whose `getIdTokenResult` returns `{ claims: { creator: true } }`, `claims.creator` is true; `refreshClaims` forces a new token (`getIdToken(true)`) and updates claims; guard — creator passes, plain user sees the no-permission page, super-admin passes, signed-out is redirected to `/auth`; services — `saveDraft` never sends `authorUid`/`publishedSlug`, `publishArticle` throws `PublishError` carrying the server's `errors`; list — status chip logic for the three states, super-admin author filter, empty state "ยังไม่มีบทความ เริ่มเขียนบทความแรกได้เลย".
- [ ] **Step 2: Run** `npx vitest run src/stores/useAuthStore.test.js src/services/articles.test.js src/pages/studio` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command plus `npx vitest run src/App` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(studio): creator guard, article services, draft list`.

---

### Task 11: Studio editor (TipTap, images, autosave, publish)

**Files:**
- Modify: `package.json` (add `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-header`, `@tiptap/extension-table-cell` at the same major version)
- Create: `src/content/autosave.js`, `src/content/imageFit.js`, `src/pages/studio/StudioEditorPage.jsx`, `src/components/studio/ArticleEditor.jsx`, `EditorToolbar.jsx`, `ImageUploadButton.jsx`, `PublishChecklist.jsx`, `SaveStatus.jsx`, `src/services/articleImages.js`
- Test: `src/content/autosave.test.js`, `src/content/imageFit.test.js`, `src/components/studio/ArticleEditor.test.jsx`, `src/pages/studio/StudioEditorPage.test.jsx`

**Interfaces:**
- Produces: `createAutosaver({ save, delayMs = 2000, setTimeoutFn, clearTimeoutFn }) -> { push(patch), flush() -> Promise, cancel(), status }` (merges patches made within the window; `save(mergedPatch)` called once per window; `status` ∈ `'idle'|'pending'|'saving'|'saved'|'error'` via `onStatus` callback option; a failing save keeps the patch and retries on the next push/flush); `fitWithin(width, height, max = 1600) -> { width, height }` (never upscales, keeps ratio, integers); `uploadArticleImage(draftId, file) -> { url }` (rejects non-image or > 5 MB with `ImageError` codes `'not_image'|'too_large'`; resizes with a canvas using `fitWithin`; uploads to `articles/{draftId}/{timestamp}-{name}` and returns the download URL).
- `ArticleEditor({ initialBody: string, onChange(bodyString) })` configures TipTap with exactly the allowed nodes/marks of Task 2 (StarterKit minus code/codeBlock/strike/underline, Link with `openOnClick: false`, Image, Table family) and calls `onChange(JSON.stringify(editor.getJSON()))`; the toolbar exposes bold, italic, H2, H3, lists, quote, link, image, table (insert 3×3 with header row), rule.
- `StudioEditorPage`: loads the draft; fields title/slug (suggest via `suggestSlug` until `publishedSlug` exists; disabled after), category select, excerpt (counter / 160), cover (uses `ImageUploadButton`), tags; autosave through `createAutosaver` → `saveDraft`; **Preview** opens `/studio/preview/:draftId` rendering the draft with `ArticleBody`; **Publish / Update** runs `validateDraftForPublish` first, shows `PublishChecklist` (Thai messages per `{field, code}`), then calls `publishArticle`; **Unpublish** with confirm; leaving the page flushes pending saves; unsaved-error banner "บันทึกไม่สำเร็จ ลองใหม่".

- [ ] **Step 1: Write the failing tests:** autosave (fake timers) — three pushes inside 2 s call `save` once with merged fields; a push after the window triggers a second save; `flush()` saves immediately; a rejected save sets `status: 'error'` and the next `push` retries including the earlier patch; `fitWithin(3200, 1600)` → `{1600, 800}`, `fitWithin(800, 600)` unchanged; image service rejects a PDF and a 6 MB file; editor — typing produces JSON containing only allowed node types (feed a document with a `codeBlock`: it is not creatable from the toolbar), inserting a table creates a header row, `onChange` receives a string that `parseBody` accepts; page — publish with a missing excerpt does **not** call the service and lists "ใส่คำโปรยก่อนเผยแพร่"-style message for `excerpt`; slug input is disabled when `publishedSlug` is set; the editor never calls anything that writes `articles` (assert on the mocked services); autosave does not run before the draft has loaded.
- [ ] **Step 2: Run** `npx vitest run src/content/autosave.test.js src/content/imageFit.test.js src/components/studio src/pages/studio` — Expected: FAIL.
- [ ] **Step 3: Install and implement:** `npm install` the TipTap packages, then build the files. Thai checklist messages live in one map keyed by `${field}:${code}`.
- [ ] **Step 4: Run** the same command and `npm run build` — Expected: PASS and a successful build (bundle includes TipTap only in the Studio chunk — lazy-load `StudioEditorPage` with `React.lazy`).
- [ ] **Step 5: Commit** `feat(studio): article editor with autosave, images and publish`.

---

### Task 12: Admin "Hub" section, legacy news cleanup, Welcome news

**Files:**
- Create: `src/components/admin/HubSection.jsx`
- Modify: `src/constants/admin.js` (`ADMIN_SECTIONS` + super-admin role get `'hub'`), `src/pages/AdminPage.jsx`, `src/components/admin/WelcomeSection.jsx` (remove the news editor), `src/hooks/useWelcomeContent.js` (news = latest 3 published `news` summaries from `articles`), `src/components/welcome/NewsSection.jsx` (link to `https://ilovetcas.com/blog/<slug>`)
- Test: `src/components/admin/HubSection.test.jsx`, `src/constants/admin.test.js` (new or extend), `src/hooks/useWelcomeContent.test.js`

**Interfaces:**
- Produces: `HubSection` with (a) a form for `siteConfig/hub` fields `lineOpenChatUrl` (must be `https://line.me/…` or empty), `lineRules`, `lineModerators`, `featuredSlug`, `openHouseEnabled` (boolean), saved with `setDoc(refs.siteConfigHub(), …, { merge: true })`; (b) a "Creator access" panel: email input + **ให้สิทธิ์** / **เพิกถอน** calling `grantCreatorRole`, showing the result or a Thai error. Only the super-admin sees the `hub` section.

- [ ] **Step 1: Write the failing tests:** `getAdminSections('o.korawitt@gmail.com')` includes `hub` and no other admin email does; the form rejects `http://example.com` for the OpenChat URL and accepts empty or `https://line.me/ti/g2/abc`; grant/revoke call the callable with `{ email }` / `{ email, revoke: true }`; `useWelcomeContent` returns at most 3 news items from `articles` and survives a failed read; `WelcomeSection` no longer renders a news editor.
- [ ] **Step 2: Run** `npx vitest run src/components/admin src/constants src/hooks src/components/welcome` — Expected: FAIL.
- [ ] **Step 3: Implement.** Mirror the new section note in the comment above `ADMIN_ROLES` (rules gate by UID already).
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): Hub settings and creator access; retire legacy news editor`.

---

### Task 13: Docs, ADR and operations notes

**Files:**
- Create: `docs/adr/0022-content-site-and-studio.md`, `docs/content-site-ops.md`
- Modify: `CONTEXT.md` (vocabulary: Article, Draft, Studio, Creator, Hub config), `docs/superpowers/specs/2026-10-16-content-site-design.md` (body stored as a JSON string; one-line correction), `design.md` (§13 hub anatomy now content site)
- Test: none (docs); verified by the checks in Task 14.

**Interfaces:** `0022` records: drafts vs live articles; function-rendered pages; TipTap JSON-as-text; creator claim; consequences (functions and rules must be deployed; env `FIREBASE_PROJECT_ID` optional, `FIREBASE_API_KEY` optional on Vercel; `npm run test:rules:emu`). `content-site-ops.md`: deploy order (rules → functions → hosting), grant the first creator (Admin → Hub), set the OpenChat URL, run `node scripts/migrateWelcomeNews.mjs --apply`, checklists for launch (OpenChat moderators, image licensing).

- [ ] **Step 1: Write the docs** with exact commands and the deploy order above.
- [ ] **Step 2: Commit** `docs: ADR-0022 content site and ops notes`.

---

### Task 14: Whole-feature verification

**Files:** none new (fix-ups only, each with a test).

- [ ] **Step 1: Run** `npx vitest run` — Expected: all pass. **Run** `npm run test:rules:emu` — Expected: pass (or record why the emulator could not run). **Run** `npm run build` — Expected: success. **Run** `npx eslint` on every file touched by the branch — Expected: no new errors.
- [ ] **Step 2: Local end-to-end check** with `npm run dev` (hub: `/?site=hub`): home renders the full-screen banner and rows from seeded data (seed through the emulator or mock `useArticlesStore` in dev when Firestore returns nothing), `/blog/<slug>`, category, search, and Studio at `/studio` (`?site=app`); take screenshots at 375 and 1280 px and attach them to the PR.
- [ ] **Step 3: Server-render check:** run `api/content.js` handler against a local fake Firestore (script in `scripts/devContentCheck.mjs`) and confirm the HTML contains the article title, `<link rel="canonical">`, and JSON-LD.
- [ ] **Step 4: Commit** any fixes as `fix(content): …`.

---

## Spec coverage

| Spec item | Task |
|---|---|
| Home layout (full-screen banner, search, rows, OpenChat band, tools strip) | 8 |
| Article page, category, search, sitemap | 6, 8 |
| Server-rendered pages + cache + fallback | 6 |
| Studio list/editor, autosave, images, preview, publish checks | 10, 11 |
| Draft vs live separation, slug claim/immutability | 3, 4, 5 |
| `creator` claim + `grantCreatorRole`; super-admin sees all | 4, 10, 12 |
| Safe rendering (whitelist, link schemes) | 2 |
| `siteConfig/hub` + Admin "Hub" section, featured slug, OpenChat info | 5, 12 |
| Rules (articles, drafts, siteConfig, Storage) | 5 |
| Migration of `welcomeConfig/news`, redirects, Welcome page news | 9, 12 |
| `news.ilovetcas.com` keeps camps/updates/calendar (only article route moves) | 9 (no other change to that site) |
| UTM links and measurement | 6, 8 |
| ADR / ops notes / CONTEXT | 13 |
| `featured` article on home | 8 (`config.featuredSlug` picks the featured card; falls back to newest) |
