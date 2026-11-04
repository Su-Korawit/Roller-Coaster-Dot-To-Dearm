# Content site — new `ilovetcas.com` home, articles, and the creator Studio

**Date:** 2026-10-16 · **Status:** draft for review
**Mockup:** `assets/2026-10-16-content-site/home-mockup.html` (open in a browser; headlines and numbers in it are made up)
**Related:** [v2 overview](2026-10-16-ilovetcas-v2-overview.md) · Soft Pixel ([spec](2026-10-16-soft-pixel-redesign-design.md), PR #37) · ADR-0012 (subdomains) · ADR-0018 (minor safety)

This covers sub-projects **1 (public content site)** and **2 (Studio: writing and publishing)**. Sub-project 3 (live MyTCAS project tables inside articles) is a later spec; this one only leaves room for it.

## Intent

`ilovetcas.com` stops being a grid of tool links and becomes a **content site** like TCASter: students arrive from search or social, read useful articles, and are pulled toward the web app (`app.ilovetcas.com`) and a LINE OpenChat community. The owner will hire a **content creator** who writes and publishes alone, without a developer.

**Why.** The real value to students is clear help with the hard decision: for each faculty at each university there are several admission *projects* (โครงการ), many with identical or near-identical conditions. Articles that cover **every project of a faculty in one place and say which ones are the same** save students hours of reading MyTCAS page by page. Success is that articles are useful to students, not traffic for its own sake.

## Goals

1. A home page that works as a content front door: full-screen banner → app, search, article rows by category, LINE OpenChat invitation, a strip of the free tools.
2. Public article pages that Google can read, with good titles, descriptions, and sharing cards, **live seconds after publish**.
3. A Studio inside the app where a creator writes, saves drafts, uploads images, previews, and publishes. The creator sees only the Studio.
4. Readers can always reach the app and the community from any article.

## Non-goals (this spec)

- Live MyTCAS project tables or "duplicate project" detection inside articles (sub-project 3). Until then the creator types tables as ordinary text/table blocks.
- Comments, likes, view counters, newsletters, author profile pages, scheduled publishing, revision history, translations, ads, a shop, mock exams.
- Letting the creator edit the home banner copy, nav, the OpenChat info, or which article is featured (banner and nav are code; OpenChat info and the featured pick are `siteConfig/hub`, edited by the super-admin only).
- Rebuilding the feature sites (`roadmap.`, `tcas.`, `school.`, `news.`) or the app, beyond the changes listed under Migration.

## Anti-goals

- Copying TCASter's branding, colours, layout pixel-for-pixel, or any of its content. We borrow the *kind* of page only; the look is our Soft Pixel system.
- Clickbait or unverified claims presented as MyTCAS data. Any figure taken from MyTCAS shows its source and date.
- A page that is only readable with JavaScript on (crawlers must get real text).

## The public site

### Pages

| URL (on `ilovetcas.com`) | Content |
|---|---|
| `/` | Home (below) |
| `/blog/<slug>` | One article |
| `/category/<cat>` | Article list for one category, newest first, 12 per page with "load more" |
| `/search?q=` | Title/tag search over published articles (client-side over the latest 200 summaries) plus a link "search faculties" to `tcas.ilovetcas.com` |
| `/sitemap.xml`, `/robots.txt` | Generated from published articles |

**Categories** (fixed list, owner-edited in code): `news` ข่าว TCAS · `camps` ค่ายและกิจกรรม · `guide` แนะแนวเลือกคณะ · `compare` เทียบโครงการ · `motivation` ให้กำลังใจ.

### Home layout (see the mockup)

1. **Nav:** wordmark, categories, "เครื่องมือ" dropdown (the four tools), **เข้าสู่แอป** button.
2. **Full-screen banner** (full viewport width, height = viewport − nav): campus backdrop, headline "วางแผนสอบติดมหาลัยแบบเล่นเกม", search field with quick chips (faculty names), buttons **เข้าสู่แอป** (`https://app.ilovetcas.com/?utm_source=hub&utm_medium=banner`) and **เดินดูแคมปัส Open House** (`/openhouse`, only shown once that page exists). A "scroll for latest articles" cue sits at the bottom. On narrow screens the white panel behind the text becomes near-opaque so text stays readable.
3. **Featured article** (one article flagged `featured`).
4. **Category rows** (news, guide, compare, camps, motivation): three cards each, "ดูทั้งหมด" link.
5. **LINE OpenChat band** with a join button, the room rules in one line, and who moderates.
6. **Free tools strip** (four tools).
7. **Footer** with data-source note and legal links.

### Article page

Cover image, title, category tag, author name, published and updated dates, reading time, body, then at the bottom a **call-to-action block** (open the app / join OpenChat) and "related articles" (same category, newest 3). Every figure that came from MyTCAS carries "ข้อมูลจาก MyTCAS ณ <date>" written by the creator in the text for now.

### How pages reach Google (my call)

The hub today is a static prerendered file; articles change at any time, so pages are rendered **on request by a Vercel function and cached**:

- New `api/content.js` handles home, article, category, search shell and sitemap. It reads Firestore through the public REST endpoint (rules allow public read of published articles), renders a full HTML page (`<head>` title/description/canonical/Open Graph/`Article` JSON-LD, plus the body text), and sends `Cache-Control: s-maxage=60, stale-while-revalidate=86400`.
- `vercel.json` rewrites `/`, `/blog/*`, `/category/*`, `/search`, `/sitemap.xml` **for the `ilovetcas.com` and `www` hosts** to that function. The SPA still takes over in the browser for navigation (it mounts the same components with the same data).
- The injected HTML sits inside `#root` of the real SPA shell, exactly like `scripts/prerender.mjs` does today, so no duplicate layout code path for styling.
- `/news/:id` on the hub host keeps redirecting; legacy posts are migrated (see Migration).

## Studio (writing and publishing)

**Where:** `app.ilovetcas.com/studio` (not on the hub: ADR-0012 keeps the hub free of auth state). Route guard `RequireCreator` (creator claim or super-admin).

**Roles (my call).** A Firebase custom claim `creator: true`, granted by the super-admin through a new callable `grantCreatorRole({ uid | email, revoke })`, modelled on `grantTeacherBadge`. The creator signs in with Google, refreshes their token once, and is sent to `/studio` after sign-in. "Sees only Studio" means the account has **no admin powers**: no Admin Dashboard, no write access to anything except their own drafts and article images. They remain an ordinary app user otherwise (the normal app stays reachable; no extra route guards). The **super-admin sees every creator's drafts and articles** in the Studio list (filter by author) and can edit or unpublish any of them.

**Drafts and live content are separate (my call).** Editing never touches what readers see until the creator presses **Publish**:

- The creator's working copy lives in `articleDrafts/{draftId}` (random id; readable and writable only by its author and the super-admin). Autosave (2 s debounce) writes only here, for new and already-published articles alike.
- The live copy lives in `articles/{slug}` (public read). **Clients never write `articles`**; only Cloud Functions do.
- Callable `publishArticle({ draftId })` validates the required fields, then in one transaction claims the slug (fails with `already-exists` if another draft owns it), copies the draft into `articles/{slug}`, and sets `publishedAt` (first time) and `updatedAt`. Publishing again updates the same article; the slug cannot change after the first publish. Callable `unpublishArticle({ slug })` removes the live copy (the draft stays so it can be fixed and republished).
- The slug field in the editor is free to change while the article has never been published; the draft id (and so the image folder) never changes.

**Screens**
- **Article list:** the creator's own drafts and articles (drafts first) with status "ฉบับร่าง", "เผยแพร่แล้ว", or "เผยแพร่แล้ว มีการแก้ไขที่ยังไม่เผยแพร่", last edited, "new article".
- **Editor:** title, slug (auto-suggested), category, excerpt (cards and description, max 160 chars), cover image, tags, body. Shows "บันทึกแล้ว" after each autosave. Buttons: **Preview** (renders the *draft* with the public renderer), **Publish / Update**, **Unpublish**.
- **Body editor (my call):** TipTap (ProseMirror) restricted to: paragraph, headings 2–3, bold, italic, links, bullet and numbered lists, block quote, image, **table**, horizontal rule. Tables are first-class because comparison articles need them. The body is stored as TipTap JSON, **not HTML**.
- **Images:** uploaded to Storage `articles/{draftId}/{file}`, max 5 MB, `image/*` only, resized client-side to max 1600 px wide; alt text required before publishing.
- **Publish checks:** title, slug, category, excerpt, cover image, and alt text on every image must be present. Failures are listed in plain Thai next to the offending field.

**Safety by construction.** The public renderer converts the stored JSON to HTML with a whitelist of node types and attributes, escapes all text, allows link schemes `https`, `http`, `mailto` only, and only allows images from our Storage bucket or `https` hosts. No raw HTML is ever stored or injected, so a creator account cannot inject scripts. External links get `rel="noopener noreferrer nofollow"`.

## Data

`articleDrafts/{draftId}` — the working copy: all article fields below, plus `slug` (a *proposal* until published), `publishedSlug` (set by `publishArticle`; empty if never published), `authorUid`.

`articles/{slug}` — the live copy, document id = slug. Written only by `publishArticle` / `unpublishArticle`.

| Field | Notes |
|---|---|
| `title`, `excerpt`, `category`, `tags[]`, `coverUrl`, `coverAlt` | |
| `body` | TipTap JSON, stored as a JSON **string** (one text field, ≤ 716,800 bytes) |
| `authorUid`, `authorName`, `draftId` | `draftId` lets republish find the owner and prevents slug hijack |
| `createdAt`, `updatedAt`, `publishedAt` | server timestamps |
| `readingMinutes` | computed on publish |
| `seo` | optional `{ title, description }` overrides |

`siteConfig/hub` — `{ lineOpenChatUrl, lineRules, lineModerators, featuredSlug }`, public read, super-admin write. Edited in a new **"Hub"** section of the existing Admin Dashboard (`AdminPage`, super-admin only). The renderer reads it with one extra Firestore request per cache miss.

**Rules.**
- `articles`: public read; **no client writes**.
- `articleDrafts`: read, create, update by `authorUid == auth.uid` with the `creator` claim, or super-admin; `authorUid` and `publishedSlug` immutable from the client; delete by the author (only while `publishedSlug` is empty) or super-admin.
- Storage `articles/**`: public read; write only with the `creator` claim (or super-admin), size < 5 MB, `image/*`.
- `siteConfig`: public read, super-admin write.

## Migration

One script `scripts/migrateWelcomeNews.mjs` (dry-run default, then `--apply`): copies `welcomeConfig/news/items/*` into `articles` as published, category `news`, plain text converted to paragraph nodes, slug = the old id. Then:

- `vercel.json`: `/news/:id` on the hub host redirects to `/blog/:id` (instead of `news.ilovetcas.com/:id`).
- App: `NewsPostPage` and its `/news/:id` route redirect to the hub article; the Welcome page's news section (`useWelcomeContent`) reads the latest 3 published `news` articles from `articles`.
- Admin Dashboard: the news editor in `WelcomeSection` is removed; the old `welcomeConfig/news` collection is left in place, frozen and unread.
- `news.ilovetcas.com` (my call, **revised from what I first said**): it **keeps** its camps feed (`api/camphub.js`), updates tab and TCAS calendar, because tearing those out loses working features. Only its article route `/:id` is retired in favour of the hub article. The hub's `camps` and `news` categories are creator-written articles, separate from the CampHub feed.

## Look and feel

Soft Pixel tokens and components (PR #37). Article body typography: Noto Sans Thai 17–18 px, line-height 1.75, max 68 characters wide, headings in Chakra Petch. Art for the banner is the campus layout, redrawn to final quality in the campus sub-project; until then the mockup's placeholder is used.

## Operations and measurement

- Links to the app and OpenChat from the site carry `utm_source=hub&utm_medium=<banner|article|band>&utm_campaign=<slug>` so the owner can see which articles send students onward. Vercel Web Analytics for page views (my call).
- The OpenChat room is created and moderated in the LINE app by the owner (LINE offers no API for embedding it); the site only links to it. Minors will be in the room (ADR-0018): the band shows the rules and who the moderators are; confirm LINE's age requirements before launch.

## Decisions I made (please check)

1. Server-rendered pages through one Vercel function with CDN caching, not rebuilds.
2. `creator` custom claim + callable, instead of adding emails to the admin lists.
3. TipTap with JSON storage and whitelist rendering.
4. `news.ilovetcas.com` keeps its camps feed, updates and calendar; only its article route moves to the hub; old news is migrated into articles.
5. Drafts are separate from live articles; only Cloud Functions write `articles`; the slug is claimed at publish and immutable afterwards.
6. `featured` is a single `featuredSlug` in `siteConfig/hub`, set by the super-admin in the Admin Dashboard.
7. The creator is an ordinary app user with no admin power; the super-admin sees and can fix every draft.
8. Search is client-side over the newest 200 summaries (enough for the first months).

## Left to the builder

Component structure, exact Tailwind classes, Studio list UX details, empty/error states wording, Vercel function module split, TipTap extension choices beyond the list above, test fixtures.

## Needed from the owner before launch

LINE OpenChat URL and moderator names; first batch of articles from the creator; confirmation that images the creator uploads are licensed for use; creator's Google account email to grant the role.
