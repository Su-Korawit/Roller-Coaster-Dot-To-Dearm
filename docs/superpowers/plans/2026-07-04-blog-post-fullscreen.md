# Blog/News Post Full-Screen Page Implementation Plan

> **For Cursor:** This plan is implementation-ready — apply it task by task in the IDE (React components, JSX, Tailwind, routing). Claude Code wrote this plan and will run `npm test` / review the diff afterward per the project's Claude Code ↔ Cursor workflow; it will not implement this itself. Steps use checkbox (`- [ ]`) syntax — check them off as you go.

**Goal:** Replace the News/Blog card's popup (a `BottomSheet` slid up over the Welcome page) with a dedicated full-screen page at `/news/:id`, with a Back button, so a post is readable full-screen and shareable via a direct link — fixing the current "card opens as a popup instead of full screen" bug.

**Architecture:** Add one Firestore doc-ref factory (`refs.welcomeNewsPost`) to the existing `src/lib/db.js` seam, a new public top-level page `NewsPostPage.jsx` that fetches a single post by `id` and renders it full-screen (same tier as `WelcomePage`/`AuthPage` — outside `MobileLayout`/`RequireAuth`, per `src/App.jsx:90`), and a new route `/news/:id`. `NewsSection.jsx` swaps its local popup state for `navigate()`.

**Tech Stack:** React 19, React Router DOM 7 (`useParams`, `useNavigate`), Firebase Firestore (`getDoc`), Tailwind v4 (existing tokens only, no config file), Vitest + `@testing-library/react`.

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- **Never inline `doc(db, 'collection', id)`** — add the new ref through `src/lib/db.js`'s `refs` factory (CLAUDE.md constraint).
- **Tailwind v4 tokens only** — reuse existing classes/tokens: `bg-[#F4F7FC]`, `neo-card`, `pixel-font`, `thai-font`, `text-ink`, `text-brand-strong` — do not invent new colors or add a config file.
- `NewsPostPage` must render **outside** `MobileLayout`/`RequireAuth` (public, unauthenticated, full-width, scrollable) — same as `WelcomePage` and `AuthPage`.
- Don't touch `BottomSheet.jsx` — it's still used elsewhere (shop/profile panels); this plan only removes `NewsSection`'s usage of it.
- Verify with `npm test` after each task.

---

### Task 1: Add `refs.welcomeNewsPost` to the Firestore seam

**Files:**
- Modify: `src/lib/db.js`
- Modify: `src/lib/db.test.js`

**Interfaces:**
- Produces: `refs.welcomeNewsPost(id): DocumentRef` → `welcomeConfig/news/items/{id}` (a single doc inside the existing `cols.welcomeNews` subcollection).

- [ ] **Step 1: Write the failing test** — add to the existing `describe('welcome refs/cols', ...)` block in `src/lib/db.test.js` (after the `refs.welcomeStats()` assertion, around line 21):

```js
  it('builds a welcomeConfig/news/items/{id} document ref for a single post', () => {
    expect(refs.welcomeNewsPost('n1')).toEqual({ _path: 'welcomeConfig/news/items/n1' })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/db.test.js`
Expected: FAIL — `refs.welcomeNewsPost is not a function`

- [ ] **Step 3: Implement** — in `src/lib/db.js`, add to the `refs` object (after `welcomeStats`, line 29):

```js
  welcomeNewsPost:    (id)     => doc(db, 'welcomeConfig', 'news', 'items', id),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/db.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.js src/lib/db.test.js
git commit -m "feat(db): add refs.welcomeNewsPost for single news/blog post reads"
```

---

### Task 2: Create `NewsPostPage.jsx` — full-screen post view with Back button

**Files:**
- Create: `src/pages/NewsPostPage.jsx`
- Create: `src/pages/NewsPostPage.test.jsx`

**Interfaces:**
- Consumes: `refs.welcomeNewsPost(id)` (Task 1), `getDoc` from `firebase/firestore`, `useParams`/`useNavigate` from `react-router-dom`.
- Produces: `NewsPostPage` default export — a route-level page rendered at `/news/:id`, no props.

- [ ] **Step 1: Write the failing tests** — create `src/pages/NewsPostPage.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

const navigate = vi.fn()
let paramsId
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ id: paramsId }),
}))

const getDoc = vi.fn()
vi.mock('firebase/firestore', () => ({ getDoc: (...args) => getDoc(...args) }))
vi.mock('../lib/db', () => ({ refs: { welcomeNewsPost: (id) => ({ _id: id }) } }))

const { default: NewsPostPage } = await import('./NewsPostPage')

const snapDoc = (id, data) => ({ id, exists: () => data != null, data: () => data })

describe('NewsPostPage', () => {
  beforeEach(() => { navigate.mockClear(); getDoc.mockClear(); paramsId = 'n1' })

  it('renders the post once loaded', async () => {
    getDoc.mockResolvedValueOnce(snapDoc('n1', { titleTh: 'อัปเดตใหม่', bodyTh: 'รายละเอียดข่าว' }))
    render(<NewsPostPage />)
    await waitFor(() => expect(screen.getByText('รายละเอียดข่าว')).toBeTruthy())
    expect(screen.getAllByText('อัปเดตใหม่').length).toBeGreaterThan(0)
  })

  it('shows a not-found message when the post does not exist', async () => {
    getDoc.mockResolvedValueOnce(snapDoc('n1', null))
    render(<NewsPostPage />)
    await waitFor(() => expect(screen.getByText('ไม่พบข่าวนี้ อาจถูกลบไปแล้ว')).toBeTruthy())
  })

  it('Back button navigates to the welcome page', async () => {
    getDoc.mockResolvedValueOnce(snapDoc('n1', { titleTh: 'ข่าว', bodyTh: 'เนื้อหา' }))
    render(<NewsPostPage />)
    await waitFor(() => expect(screen.getByText('เนื้อหา')).toBeTruthy())
    fireEvent.click(screen.getByLabelText('กลับ'))
    expect(navigate).toHaveBeenCalledWith('/')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/NewsPostPage.test.jsx`
Expected: FAIL — `Failed to resolve import "./NewsPostPage"`

- [ ] **Step 3: Implement** — create `src/pages/NewsPostPage.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDoc } from 'firebase/firestore'
import { refs } from '../lib/db'

export default function NewsPostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getDoc(refs.welcomeNewsPost(id))
      .then((snap) => { if (alive) setPost(snap.exists() ? { id: snap.id, ...snap.data() } : null) })
      .catch(() => { if (alive) setPost(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  return (
    <main data-testid="news-post-page" className="min-h-dvh w-full bg-[#F4F7FC]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/5 bg-white px-4 py-3">
        <button
          onClick={() => navigate('/')}
          aria-label="กลับ"
          className="rounded-lg p-1.5 text-ink/60 transition-colors hover:bg-gray-100 hover:text-ink"
        >
          <span aria-hidden="true">←</span>
        </button>
        <h1 className="thai-font truncate text-sm font-bold text-ink">
          {loading ? 'กำลังโหลด...' : post ? post.titleTh : 'ไม่พบข่าว'}
        </h1>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        {loading && <p className="thai-font text-sm text-ink/60">กำลังโหลด...</p>}
        {!loading && !post && (
          <p className="thai-font text-sm text-ink/60">ไม่พบข่าวนี้ อาจถูกลบไปแล้ว</p>
        )}
        {!loading && post && (
          <>
            {post.coverUrl && (
              <img src={post.coverUrl} alt="" className="mb-6 w-full rounded-2xl object-cover" />
            )}
            <h2 className="pixel-font mb-4 text-sm text-ink md:text-base">{post.titleTh}</h2>
            <p className="thai-font whitespace-pre-line text-sm leading-relaxed text-ink/80 md:text-base">
              {post.bodyTh}
            </p>
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/NewsPostPage.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/NewsPostPage.jsx src/pages/NewsPostPage.test.jsx
git commit -m "feat(news): add full-screen NewsPostPage with Back button"
```

---

### Task 3: Wire the `/news/:id` route into `App.jsx`

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `NewsPostPage` default export (Task 2).

- [ ] **Step 1:** Add the lazy import — in `src/App.jsx`, after line 21 (`const WelcomePage = lazy(() => import('./pages/WelcomePage'))`):

```js
const NewsPostPage = lazy(() => import('./pages/NewsPostPage'))
```

- [ ] **Step 2:** Add the route — in the "Public — landing + auth" block (around line 90-92), add the new route between `/` and `/auth`:

```jsx
        {/* Public — landing + auth, outside the mobile frame so the page can scroll */}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/news/:id" element={<NewsPostPage />} />
        <Route path="/auth" element={<AuthPage />} />
```

- [ ] **Step 3:** `npm test` → PASS (no existing App.jsx test; this is a routing-only change).

- [ ] **Step 4: Manual verification** (App.jsx routing has no automated test in this repo — this is the check that matters):
Run `npm run dev`, open `/`, click a News card, confirm the browser navigates to `/news/<id>` and the page renders full-screen (not as a popup). Reload directly at that URL to confirm it still works as a standalone deep link. Click Back, confirm it returns to `/`. Resize the window / use device toolbar to confirm the header and content column reflow sensibly from mobile to desktop width.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat(routing): wire /news/:id to NewsPostPage"
```

---

### Task 4: Repoint `NewsSection.jsx` from popup to full-screen navigation

**Files:**
- Modify: `src/components/welcome/NewsSection.jsx`
- Create: `src/components/welcome/NewsSection.test.jsx`

**Interfaces:**
- Consumes: `useNavigate` from `react-router-dom`, route `/news/:id` (Task 3).

- [ ] **Step 1: Write the failing tests** — create `src/components/welcome/NewsSection.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

const { default: NewsSection } = await import('./NewsSection')

describe('NewsSection', () => {
  beforeEach(() => navigate.mockClear())

  it('renders nothing when there is no news', () => {
    const { container } = render(<NewsSection news={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('clicking a card navigates to the full-screen post page instead of opening a popup', () => {
    render(<NewsSection news={[{ id: 'n1', titleTh: 'อัปเดต', bodyTh: 'รายละเอียดข่าว' }]} />)
    fireEvent.click(screen.getByText('อัปเดต'))
    expect(navigate).toHaveBeenCalledWith('/news/n1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/welcome/NewsSection.test.jsx`
Expected: FAIL — `useNavigate is not a function` (current `NewsSection` doesn't import it) / navigate not called

- [ ] **Step 3: Implement** — replace the full contents of `src/components/welcome/NewsSection.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'

export default function NewsSection({ news }) {
  const navigate = useNavigate()
  if (!news?.length) return null

  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">NEWS & UPDATES</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((n) => (
          <button
            key={n.id}
            onClick={() => navigate(`/news/${n.id}`)}
            className="neo-card overflow-hidden text-left"
          >
            {n.coverUrl && <img src={n.coverUrl} alt="" className="h-36 w-full object-cover" />}
            <div className="p-4">
              <h3 className="thai-font font-bold text-ink">{n.titleTh}</h3>
              <p className="thai-font mt-1 line-clamp-2 text-sm text-ink/60">{n.bodyTh}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
```

This removes the `useState`/`BottomSheet` popup entirely — `BottomSheet` is no longer imported here (it's untouched and still used by other panels).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/welcome/NewsSection.test.jsx`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: all green

- [ ] **Step 6: Commit**

```bash
git add src/components/welcome/NewsSection.jsx src/components/welcome/NewsSection.test.jsx
git commit -m "fix(news): open posts full-screen at /news/:id instead of a popup"
```

---

## Self-Review

- **Spec coverage:** "ไม่เอา popup แต่ full screen พร้อมปุ่ม Back แล้ว Responsive" → Task 2 replaces the popup with a full-screen page (Task 4 removes the popup trigger), has a Back button (Task 2, tested), and uses the same responsive `sm:`/`md:` idiom as the rest of the Welcome page (Task 2's `max-w-2xl px-5 py-8 sm:px-8` + `md:text-base`). Manual responsive check called out explicitly in Task 3 since Vitest/jsdom can't verify visual reflow.
- **Placeholder scan:** No TBD/"add error handling"/"similar to Task N" — every step has literal code.
- **Type consistency:** `post` shape (`{ id, titleTh, bodyTh, coverUrl }`) matches the existing `welcomeNews` doc shape already used by `NewsSection`/`useWelcomeContent.test.jsx`. `refs.welcomeNewsPost` signature (`(id) => DocumentRef`) matches how Task 2 calls it.

## Handoff

This plan is ready for Cursor to implement task-by-task (Tasks 1-4, in order — each depends on the previous). Once committed, Claude Code will run `npm test` and review the diff per the project's normal workflow.
