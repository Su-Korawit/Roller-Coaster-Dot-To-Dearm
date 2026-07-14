# Responsive Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Idea:** `node-1-1784029805517` — "Responsive All Admin Deshboard" on the IR Board.

**Requirement (from the Idea's Process note, translated):** Fix the whole Admin Dashboard
to be responsive for mobile/iPad. Emphasize the Roadmap (admin) section — make its UX/UI
beautiful and as user-friendly as possible, and improve its workflow.

**Scope (verified against the code):** `/admin` (`src/App.jsx:104-106`, `RequireAdmin`
guard) is deliberately rendered **outside** `MobileLayout` — the comment at `App.jsx:102`
says "full-width desktop, outside mobile frame." This plan does **not** move Admin inside
`MobileLayout` (that would touch routing/guards and the mobile safe-area/`MiniPlayer`
stack, well beyond "make it responsive," and risks regressing the main app shell). Instead
`src/pages/AdminPage.jsx` and its 21 `src/components/admin/*` children get responsive
Tailwind treatment directly, the same way any of this app's other desktop-capable surfaces
would — breakpoint classes, not a shell swap.

There is no admin section literally named "Roadmap." The Idea's "เน้นที่ Roadmap" (emphasize
Roadmap) maps to `IdeaRequestSection.jsx` — the **IR Board**, which is architecturally a
second instance of the same React Flow builder as the student-facing `RoadmapPage.jsx`
(shares `useRoadmapStore`, node types, `TrashZone`, `findProximityConnection`,
`useLongPressDrag`). `RoadmapPage.jsx` already solved mobile/touch for this exact canvas
stack (bottom toolbar, horizontally-scrollable palette, long-press drag, mobile
select-mode, `SelectionActionBar`); `IdeaRequestSection.jsx` never got any of that. The
straightest, lowest-risk path to "beautiful and user-friendly" here is porting
`RoadmapPage.jsx`'s already-shipped, already-touch-tested pattern into the IR Board rather
than inventing a new one — and extracting the ~150 lines of near-duplicate toolbar JSX
into one shared component both pages import, so the fix doesn't just get copy-pasted twice.

**Goal:** Every admin section is usable without horizontal scroll or clipped content at
375px (phone) and 768–1024px (iPad); the IR Board gets RoadmapPage's mobile toolbar/select
UX; admin visually adopts the app's `neo-*` design-system surfaces instead of plain
`rounded-xl`/`shadow-sm`, matching "ทำ UX/UI ให้สวยงาม."

**Architecture:**
- **Tab-strip overflow (`AdminPage.jsx:61-77`)** is the highest-severity bug — up to 11
  tabs in an unwrapped `flex gap-1`, no `overflow-x-auto`, no scroll affordance. Fix: wrap
  in `overflow-x-auto no-scrollbar` (the `.no-scrollbar` utility already exists,
  `index.css:44-50`, unused anywhere in admin today) with `whitespace-nowrap` tabs and a
  `flex-shrink-0` per tab, so it becomes a horizontally swipeable chip row on phone,
  identical in spirit to the pattern the main app already uses for chip rows elsewhere.
  Same fix for `FarmDataSection.jsx:21`'s sub-tabs.
- **Content padding/width**: `AdminPage.jsx:80`'s `max-w-5xl mx-auto px-6 py-8` → responsive
  padding (`px-3 sm:px-6`), and the IR-Board-only hardcoded `h-[calc(100vh-8rem)]` →
  replace with a flex-based `h-full` container (mirrors `RoadmapPage.jsx`'s `h-full w-full
  flex flex-col`, which already adapts to whatever height its parent gives it) so the
  canvas doesn't fight a magic-number height once the header/tab-strip heights change on
  phone.
- **Tables**: every admin data table needs the same `overflow-x-auto` wrapper
  `UserManagementSection.jsx:123-124` already uses correctly. Apply it to
  `ShopSection.jsx:214-215` (currently `overflow-hidden`, which clips instead of
  scrolling — a real bug, not just a gap), `FarmItemsTab.jsx:180`,
  `FarmPlantsTab.jsx:224`, `FarmShopsTab.jsx:172` (currently no wrapper at all).
- **Forms**: fixed `grid-cols-2`/`grid-cols-3` forms stack on phone via
  `grid-cols-1 sm:grid-cols-2` (`ShopSection.jsx:123`, `FarmItemsTab.jsx:120`,
  `FarmPlantsTab.jsx:146`, `FarmShopsTab.jsx` equivalent) and
  `grid-cols-1 sm:grid-cols-3` for `FinanceSection.jsx:114`'s KPI cards.
- **Already-responsive files** (`AnalyticsSection.jsx:166`, `AssetsSection.jsx:183`,
  `AssetsManagerSection.jsx:287`, `StorageBrowser.jsx:50`) — spot-check at 375px only,
  adjust column counts if anything still crowds; no structural change expected.
- **IR Board mobile UX** (the "เน้นที่ Roadmap" ask): extract
  `src/components/roadmap/RoadmapToolbar.jsx` (new file) from `RoadmapPage.jsx:356-514`'s
  bottom `Panel` toolbar + horizontally-scrollable block palette
  (`overflow-x-auto max-w-[calc(100vw-1rem)]`, `RoadmapPage.jsx:359`) + mobile
  select-mode button (`md:hidden`, `RoadmapPage.jsx:445`) + `SelectionActionBar` wiring,
  parameterized over the node-type palette (RoadmapPage's vs. IR Board's, if they differ)
  and the store/handlers each page already owns. Both `RoadmapPage.jsx` and
  `IdeaRequestSection.jsx` render the shared component instead of maintaining their own
  copies. `IdeaRequestSection.jsx` already has `useLongPressDrag` (`:148`) and `TrashZone`
  wired — it's missing the toolbar/palette/select-mode layer only, not the underlying touch
  primitives.
- **React Flow `<Controls />`** touch targets: bump to a larger tap size on both boards via
  a shared `!`-important class override (per CLAUDE.md's React-Flow-handle precaution —
  only style the inner elements, never rotate/resize the root node div).
- **Modals**: all admin modals already route through `Popup.jsx`, which is responsive
  (`Popup.jsx:53`, safe-area padding). Verify `Popup`'s `position: absolute inset-0`
  positioning (`Popup.jsx:39-44`) still resolves correctly once `AdminPage.jsx`'s outer
  wrapper gains new responsive classes — it needs a `position: relative` ancestor; confirm
  one still exists after the shell edits, add `relative` to `AdminPage.jsx`'s root div if
  not.
- **`UpdateAssetsSection.jsx`** depends on `window.showDirectoryPicker()` (File System
  Access API, Chrome/Edge desktop only per its own header comment) — inherently
  non-functional on iOS Safari / most mobile browsers. Feature-detect
  (`'showDirectoryPicker' in window`) and render a disabled state with an explanatory note
  instead of a broken button when unsupported, rather than reimplementing it (out of scope
  — this is an admin-only bulk-asset-sync tool, not a workflow a phone/iPad user needs).
- **Visual polish ("สวยงาม")**: swap admin's plain `rounded-xl border ... shadow-sm` card
  patterns for the app's existing `.neo-card`/`.neo-slab` classes (`index.css:130-181`),
  which are used app-wide but currently absent from every file in `components/admin/` —
  brings admin visually in line with the rest of the product instead of introducing new
  styling. Apply to card/panel containers only (tables, forms, section wrappers); don't
  touch functional layout logic while doing this pass.
- **Testing**: only `IdeaRequestSection.test.jsx` exists in admin today (20/21 files have
  zero coverage) — this plan does not attempt a full coverage sweep (out of scope creep for
  a responsiveness fix). Add/extend tests only where behavior actually changes: the new
  `RoadmapToolbar.jsx` component (mirrors `IdeaRequestSection.test.jsx`'s
  mock-heavy convention — stub `@xyflow/react`, sibling components), and a smoke test on
  `AdminPage.jsx`'s tab-strip scroll wrapper.
- Standing rules: no deploys (ships via normal `/ilovework` → push → Vercel flow); no
  `StartNode` / user-facing Roadmap (`RoadmapPage.jsx`) *behavior* changes — only the shared
  toolbar is extracted, its behavior for students must stay pixel-identical.

**Tech Stack:** React 19 JSX (no TS), Tailwind v4 tokens (`src/index.css`), `@xyflow/react`
(React Flow), Vitest + Testing Library. No new dependencies.

---

## Task 1 — `AdminPage.jsx` shell: scrollable tabs, responsive padding, `relative` root

**Files:** Modify `src/pages/AdminPage.jsx`

- [ ] Add `relative` to the root wrapper div (`AdminPage.jsx:50`) if not already
      establishing a positioning context for `Popup`.
- [ ] Wrap the tab strip (`AdminPage.jsx:61-77`) in `overflow-x-auto no-scrollbar`; each tab
      button gets `flex-shrink-0 whitespace-nowrap`.
- [ ] Change content container (`AdminPage.jsx:80`) padding to `px-3 sm:px-6 py-4 sm:py-8`.
- [ ] Replace the IR-Board-only `h-[calc(100vh-8rem)]` with a flex-based container
      (`flex-1 min-h-0 flex flex-col`) so `IdeaRequestSection` sizes to whatever space is
      left, matching `RoadmapPage.jsx`'s own container pattern.
- [ ] `FarmDataSection.jsx:21`'s sub-tab row gets the same `overflow-x-auto no-scrollbar`
      treatment.

## Task 2 — Fix table overflow across admin CRUD sections

**Files:** Modify `ShopSection.jsx`, `FarmItemsTab.jsx`, `FarmPlantsTab.jsx`,
`FarmShopsTab.jsx`

- [ ] `ShopSection.jsx:214-215` — change the table wrapper's `overflow-hidden` to
      `overflow-x-auto` (matches `UserManagementSection.jsx:123-124`'s working pattern).
- [ ] `FarmItemsTab.jsx:180`, `FarmPlantsTab.jsx:224`, `FarmShopsTab.jsx:172` — wrap each
      bare `<table>` in a `<div className="overflow-x-auto rounded-2xl border ...">`
      matching the same reference pattern.

## Task 3 — Stack fixed-column forms on mobile

**Files:** Modify `ShopSection.jsx`, `FarmItemsTab.jsx`, `FarmPlantsTab.jsx`,
`FarmShopsTab.jsx`, `FinanceSection.jsx`

- [ ] `ShopSection.jsx:123` — `grid grid-cols-2 gap-4` → `grid grid-cols-1 sm:grid-cols-2
      gap-4`.
- [ ] `FarmItemsTab.jsx:120`, `FarmPlantsTab.jsx:146`, and `FarmShopsTab.jsx`'s equivalent
      form grid — same `grid-cols-1 sm:grid-cols-2` change.
- [ ] `FinanceSection.jsx:114` — `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` for the KPI
      cards.

## Task 4 — Spot-check already-partially-responsive sections at 375px

**Files:** `AnalyticsSection.jsx`, `AssetsSection.jsx`, `AssetsManagerSection.jsx`,
`StorageBrowser.jsx`

- [ ] Verify each renders without overflow/clipping at 375px width in the browser (dev
      server, DevTools device toolbar). Adjust the smallest grid breakpoint only if
      something still crowds — no other changes expected here.

## Task 5 — Extract shared `RoadmapToolbar.jsx` from `RoadmapPage.jsx`

**Files:** Create `src/components/roadmap/RoadmapToolbar.jsx`,
`src/components/roadmap/RoadmapToolbar.test.jsx`; modify `src/pages/RoadmapPage.jsx`

- [ ] Extract the bottom `Panel` toolbar, horizontally-scrollable block palette
      (`RoadmapPage.jsx:356-514`), and mobile select-mode button (`md:hidden`,
      `RoadmapPage.jsx:445`) into `RoadmapToolbar.jsx`. Props: the node-type palette to
      render, current selection state, and the handler callbacks `RoadmapPage.jsx` already
      owns (add block, toggle select mode, duplicate/delete selection, etc.) — no new
      state lives in the extracted component beyond local UI state (e.g. palette scroll).
- [ ] `RoadmapPage.jsx` renders `<RoadmapToolbar />` in place of the extracted JSX.
      **No behavior change for students** — this is a pure extraction; verify visually
      that `/roadmap` looks and behaves identically before/after.
- [ ] Test: render `RoadmapToolbar` in isolation with mock props (same mocking convention
      as `IdeaRequestSection.test.jsx`), assert palette renders and select-mode toggle
      fires its callback.

## Task 6 — Wire `RoadmapToolbar` + mobile UX into `IdeaRequestSection.jsx`

**Files:** Modify `src/components/admin/IdeaRequestSection.jsx`,
`src/components/admin/IdeaRequestSection.test.jsx`

- [ ] Replace the fixed `absolute top-3 left-3 flex flex-wrap gap-2` palette
      (`IdeaRequestSection.jsx:155-170`) with `<RoadmapToolbar />`, passing the IR Board's
      own node-type palette and handlers (`useLongPressDrag`, `TrashZone` already wired at
      `:148` — reuse, don't duplicate).
- [ ] Wire mobile select-mode + `SelectionActionBar` the same way `RoadmapPage.jsx` does,
      backed by the IR Board's own selection state (do not share selection state between
      the two boards — they're independent React Flow instances).
- [ ] Update `IdeaRequestSection.test.jsx` for the new toolbar wiring (mock
      `RoadmapToolbar` the same way sibling components are already stubbed in that file).

## Task 7 — Enlarge React Flow `<Controls />` touch targets

**Files:** Modify `src/index.css` (or a shared class both boards apply)

- [ ] Add a `!`-important override class enlarging `.react-flow__controls-button` tap size
      for touch, applied to both `RoadmapPage.jsx:337` and `IdeaRequestSection.jsx:192`.
      Only style the inner button element — do not touch the Controls root positioning
      (per CLAUDE.md's React Flow handle precaution).

## Task 8 — `UpdateAssetsSection.jsx`: graceful degrade on unsupported browsers

**Files:** Modify `src/components/admin/UpdateAssetsSection.jsx`

- [ ] Feature-detect `'showDirectoryPicker' in window`; when false, render the
      section's button disabled with a short note ("Chrome/Edge desktop only") instead of
      a button that throws on tap.

## Task 9 — Visual pass: adopt `neo-*` surfaces admin-wide

**Files:** All 21 files under `src/components/admin/`, `src/pages/AdminPage.jsx`

- [ ] Replace plain `rounded-xl border ... shadow-sm` card/panel wrappers with
      `.neo-card`/`.neo-slab` (`index.css:130-181`) where they wrap a self-contained
      section/card — purely visual, no layout logic changes in this task.

## Task 10 — Verify

- [ ] `npm test` — full suite green (including new/updated `RoadmapToolbar.test.jsx` and
      `IdeaRequestSection.test.jsx`).
- [ ] `npm run dev`, visit `/admin` at 375px, 768px, 1024px, and desktop widths — confirm:
      tab strip scrolls instead of clipping, every table scrolls horizontally instead of
      overlapping, every form stacks on phone, no page-level horizontal scroll anywhere.
- [ ] Visit the IR-Board tab at the same widths — confirm the new toolbar/palette/select
      mode work with touch (or DevTools touch emulation), Controls buttons are easily
      tappable, canvas height fills available space with no dead zone.
- [ ] Visit `/roadmap` (student-facing) and confirm it is visually and behaviorally
      unchanged after the `RoadmapToolbar` extraction.
- [ ] No deploy step required — ships through the existing `/ilovework` → push → Vercel
      auto-deploy path.
