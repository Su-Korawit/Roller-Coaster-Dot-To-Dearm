# Welcome / Landing Page + Admin CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public, responsive Welcome/landing page at `/` that explains the product, showcases features (incl. a real game preview), and offers Register / Login / Play — plus an Admin CMS to manage its dynamic content.

**Architecture:** Welcome is a top-level public route (outside `MobileLayout`, like `AdminPage`) composing one component per section. Dynamic content (Game Preview, Stats, News, FAQ, Testimonials) is read once from Firestore `welcomeConfig/*` via a `useWelcomeContent` hook; the super-admin edits it through a new `welcome` tab in the Admin Dashboard. Donate is QR-only (client-side PromptPay, no login, no verification). The page follows the published design guideline's neo-brutalist "pixel kawaii" language (hard borders, solid offset shadows, step motion) while reusing the app's existing purple tokens and pixel-font.

**Tech Stack:** React 19 + Vite, React Router v7, Tailwind v4 (`@theme` tokens), Zustand, Firebase (Firestore + Storage), Vitest + @testing-library/react, @firebase/rules-unit-testing.

## Global Constraints

- No TypeScript — JavaScript + JSX only.
- No `tailwind.config.js` — design tokens live in `@theme` in `src/index.css`. Do NOT add the guideline's bright-pink palette; reuse existing tokens (`--color-brand #a78bda`, `--color-accent-pink #d93d8c`, `--color-ink #1a1035`).
- Fonts: English headlines use `.pixel-font` (Press Start 2P); Thai body uses `'Noto Sans Thai'` (`.thai-font`). Bilingual: EN headings, Thai body copy.
- Touch targets ≥ 44px; `rounded-2xl` buttons; respect `prefers-reduced-motion`.
- Firestore public-read pattern mirrors `mapConfigs`/`musicConfig` (`allow read: if true`). Writes are super-admin only.
- Unit tests: `npm test` (vitest, excludes `test/rules/**`). Rules tests: `npm run test:rules` (needs Firestore emulator). Component/hook tests start with `// @vitest-environment jsdom`, import from `'vitest'`, use `@testing-library/react`.
- Commit after each task.

## File Structure

**New files:**
- `src/pages/WelcomePage.jsx` — public scroll container; composes sections; calls `useWelcomeContent`.
- `src/hooks/useWelcomeContent.js` — one-time read of dynamic content.
- `src/components/welcome/HeroSection.jsx` — headline + Register/Login/Play.
- `src/components/welcome/FeatureHighlights.jsx` — static feature cards.
- `src/components/welcome/HowItWorks.jsx` — 3 audience groups (static).
- `src/components/welcome/GamePreview.jsx` — CMS media (GIF/video).
- `src/components/welcome/StatsSection.jsx` — CMS stats.
- `src/components/welcome/NewsSection.jsx` — CMS news cards + BottomSheet detail.
- `src/components/welcome/Testimonials.jsx` — CMS testimonials.
- `src/components/welcome/FaqSection.jsx` — CMS FAQ accordion.
- `src/components/welcome/DonateSection.jsx` — PromptPay QR modal (no login).
- `src/components/welcome/WelcomeFooter.jsx` — links/contact (static).
- `src/components/admin/WelcomeSection.jsx` — admin CMS editors for the 5 dynamic areas.

**Modified files:**
- `src/App.jsx` — routing restructure (`/` → Welcome, `/auth` → AuthPage, `/start` → RootRedirect).
- `src/pages/AuthPage.jsx` — read `?mode=`, navigate to `/start` on auth.
- `src/pages/WhyPage.jsx` — repoint `navigate('/')` → `navigate('/start')`.
- `src/lib/db.js` — welcome `refs`/`cols`.
- `src/constants/admin.js` — add `'welcome'` section.
- `src/pages/AdminPage.jsx` — add Welcome tab.
- `src/index.css` — minimal neo-brutalist utilities.
- `firestore.rules` + `storage.rules` — public read / admin write for welcome content + media.

**New tests:** `src/lib/db.test.js` (extend), `src/hooks/useWelcomeContent.test.jsx`, `src/pages/AuthPage.test.jsx`, `src/components/welcome/HeroSection.test.jsx`, `src/constants/admin.test.js` (extend), `test/rules/firestore.rules.test.js` (extend).

---

## Task 1: Welcome Firestore refs/cols in db.js

**Files:**
- Modify: `src/lib/db.js`
- Test: `src/lib/db.test.js` (extend)

**Interfaces:**
- Produces: `refs.welcomeGamePreview()`, `refs.welcomeStats()` (DocumentReference); `cols.welcomeNews`, `cols.welcomeFaq`, `cols.welcomeTestimonials` (CollectionReference at `welcomeConfig/{section}/items`).

- [ ] **Step 1: Write the failing test** — append to `src/lib/db.test.js`:

```js
describe('welcome refs/cols', () => {
  it('points doc refs at welcomeConfig singletons', () => {
    expect(refs.welcomeGamePreview()).toEqual({ _path: 'welcomeConfig/gamePreview' })
    expect(refs.welcomeStats()).toEqual({ _path: 'welcomeConfig/stats' })
  })

  it('points list cols at welcomeConfig/<section>/items subcollections', () => {
    expect(cols.welcomeNews).toEqual({ _col: 'welcomeConfig/news/items' })
    expect(cols.welcomeFaq).toEqual({ _col: 'welcomeConfig/faq/items' })
    expect(cols.welcomeTestimonials).toEqual({ _col: 'welcomeConfig/testimonials/items' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/db.test.js`
Expected: FAIL — `refs.welcomeGamePreview is not a function`.

- [ ] **Step 3: Add the refs/cols** — in `src/lib/db.js`, add to the `refs` object:

```js
  welcomeGamePreview: () => doc(db, 'welcomeConfig', 'gamePreview'),
  welcomeStats:       () => doc(db, 'welcomeConfig', 'stats'),
```

and to the `cols` object:

```js
  welcomeNews:         collection(db, 'welcomeConfig', 'news', 'items'),
  welcomeFaq:          collection(db, 'welcomeConfig', 'faq', 'items'),
  welcomeTestimonials: collection(db, 'welcomeConfig', 'testimonials', 'items'),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/db.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.js src/lib/db.test.js
git commit -m "feat(welcome): add welcomeConfig firestore refs/cols"
```

---

## Task 2: useWelcomeContent hook

**Files:**
- Create: `src/hooks/useWelcomeContent.js`
- Test: `src/hooks/useWelcomeContent.test.jsx`

**Interfaces:**
- Consumes: `refs.welcomeGamePreview`, `refs.welcomeStats`, `cols.welcomeNews`, `cols.welcomeFaq`, `cols.welcomeTestimonials` (Task 1).
- Produces: `useWelcomeContent()` → `{ gamePreview: {mediaUrl,mediaType}|null, stats: Array<{label,value}>, news: Array<{id,titleTh,bodyTh,coverUrl,createdAt}>, faq: Array<{id,q,a,order}>, testimonials: Array<{id,name,role,quote,avatarUrl}>, loading: boolean }`.

- [ ] **Step 1: Write the failing test** — create `src/hooks/useWelcomeContent.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../lib/db', () => ({
  refs: { welcomeGamePreview: () => 'gp', welcomeStats: () => 'st' },
  cols: { welcomeNews: 'news', welcomeFaq: 'faq', welcomeTestimonials: 'tst' },
}))
vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((c) => c),
  orderBy: vi.fn(),
}))

const { getDoc, getDocs } = await import('firebase/firestore')
const { useWelcomeContent } = await import('./useWelcomeContent')

const snapDoc = (data) => ({ exists: () => data != null, data: () => data })
const snapList = (rows) => ({ docs: rows.map((r) => ({ id: r.id, data: () => r })) })

describe('useWelcomeContent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads and shapes all five content areas', async () => {
    getDoc
      .mockResolvedValueOnce(snapDoc({ mediaUrl: 'g.gif', mediaType: 'gif' }))   // gamePreview
      .mockResolvedValueOnce(snapDoc({ items: [{ label: 'Users', value: '1.2k+' }] })) // stats
    getDocs
      .mockResolvedValueOnce(snapList([{ id: 'n1', titleTh: 'ข่าว', bodyTh: 'เนื้อหา' }]))
      .mockResolvedValueOnce(snapList([{ id: 'f1', q: 'ถาม', a: 'ตอบ', order: 0 }]))
      .mockResolvedValueOnce(snapList([{ id: 't1', name: 'A', role: 'ม.6', quote: 'ดีมาก' }]))

    const { result } = renderHook(() => useWelcomeContent())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.gamePreview).toEqual({ mediaUrl: 'g.gif', mediaType: 'gif' })
    expect(result.current.stats).toEqual([{ label: 'Users', value: '1.2k+' }])
    expect(result.current.news).toEqual([{ id: 'n1', titleTh: 'ข่าว', bodyTh: 'เนื้อหา' }])
    expect(result.current.faq[0].q).toBe('ถาม')
    expect(result.current.testimonials[0].name).toBe('A')
  })

  it('degrades to empty defaults on read error', async () => {
    getDoc.mockRejectedValue(new Error('offline'))
    getDocs.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useWelcomeContent())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.gamePreview).toBeNull()
    expect(result.current.stats).toEqual([])
    expect(result.current.news).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useWelcomeContent.test.jsx`
Expected: FAIL — cannot resolve `./useWelcomeContent`.

- [ ] **Step 3: Create the hook** — `src/hooks/useWelcomeContent.js`:

```js
import { useEffect, useState } from 'react'
import { getDoc, getDocs, query, orderBy } from 'firebase/firestore'
import { refs, cols } from '../lib/db'

const EMPTY = { gamePreview: null, stats: [], news: [], faq: [], testimonials: [], loading: true }

// One-time read of the public Welcome content. No realtime listeners — the
// landing page is public and re-reads on reload.
export function useWelcomeContent() {
  const [content, setContent] = useState(EMPTY)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [gp, st, news, faq, tst] = await Promise.all([
        getDoc(refs.welcomeGamePreview()),
        getDoc(refs.welcomeStats()),
        getDocs(query(cols.welcomeNews, orderBy('createdAt', 'desc'))),
        getDocs(query(cols.welcomeFaq, orderBy('order', 'asc'))),
        getDocs(query(cols.welcomeTestimonials, orderBy('order', 'asc'))),
      ])
      if (!alive) return
      setContent({
        gamePreview: gp.exists() ? gp.data() : null,
        stats: st.exists() ? (st.data().items ?? []) : [],
        news: news.docs.map((d) => ({ id: d.id, ...d.data() })),
        faq: faq.docs.map((d) => ({ id: d.id, ...d.data() })),
        testimonials: tst.docs.map((d) => ({ id: d.id, ...d.data() })),
        loading: false,
      })
    })().catch(() => { if (alive) setContent({ ...EMPTY, loading: false }) })
    return () => { alive = false }
  }, [])

  return content
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useWelcomeContent.test.jsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWelcomeContent.js src/hooks/useWelcomeContent.test.jsx
git commit -m "feat(welcome): add useWelcomeContent read hook"
```

---

## Task 3: AuthPage deep-link mode + post-auth navigation

**Files:**
- Modify: `src/pages/AuthPage.jsx`
- Test: `src/pages/AuthPage.test.jsx`

**Interfaces:**
- Consumes: `useAuthStore` `user`/`signIn`; URL `?mode=register|login`.
- Produces: AuthPage opens in the requested tab; on an authenticated `user` it navigates to `/start`.

- [ ] **Step 1: Write the failing test** — create `src/pages/AuthPage.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

const { default: AuthPage } = await import('./AuthPage')

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/start" element={<div>START</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthPage', () => {
  beforeEach(() => { authState = { user: null, signIn: vi.fn(), loading: false } })

  it('opens in register mode from ?mode=register', () => {
    renderAt('/auth?mode=register')
    // The "create account" submit label only appears in register mode.
    expect(screen.getByRole('button', { name: 'สร้างบัญชี' })).toBeTruthy()
  })

  it('opens in login mode by default', () => {
    renderAt('/auth')
    expect(screen.getByRole('tab', { name: 'เข้าสู่ระบบ', selected: true })).toBeTruthy()
  })

  it('redirects to /start when already authenticated', () => {
    authState = { user: { uid: 'u1' }, signIn: vi.fn(), loading: false }
    renderAt('/auth')
    expect(screen.getByText('START')).toBeTruthy()
  })
})
```

> Note: `@testing-library/jest-dom` is not installed; assert with truthy DOM nodes (as above), not `.toBeInTheDocument()`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/AuthPage.test.jsx`
Expected: FAIL — default login render lacks `selected` tab wiring / no redirect on auth.

- [ ] **Step 3: Apply the edits** — in `src/pages/AuthPage.jsx`:

Update imports (add router hooks + effect):

```js
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
```

Inside the component, replace the `mode` init and add the redirect effect:

```js
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login')

  // signIn triggers onAuthStateChanged → user populates → leave the auth screen.
  useEffect(() => {
    if (user) navigate('/start', { replace: true })
  }, [user, navigate])
```

Leave `handleGoogle`/`handleEmail` as-is (the effect handles navigation for both).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/AuthPage.test.jsx`
Expected: PASS (all three).

- [ ] **Step 5: Commit**

```bash
git add src/pages/AuthPage.jsx src/pages/AuthPage.test.jsx
git commit -m "feat(welcome): AuthPage deep-link ?mode + post-auth redirect to /start"
```

---

## Task 4: Routing restructure + onboarding back-link + Welcome stub

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/WhyPage.jsx:79`
- Create: `src/pages/WelcomePage.jsx` (stub — fleshed out in later tasks)

**Interfaces:**
- Consumes: `WelcomePage` default export.
- Produces: `/` renders `WelcomePage`; `/auth` renders `AuthPage`; `/start` renders the onboarding dispatcher (`RootRedirect`).

- [ ] **Step 1: Create the Welcome stub** — `src/pages/WelcomePage.jsx`:

```jsx
export default function WelcomePage() {
  return <main data-testid="welcome-page" className="min-h-dvh" />
}
```

- [ ] **Step 2: Rewire routes** — in `src/App.jsx`, add the import and replace the `<Routes>` body so `/` is the public Welcome, add `/auth`, and move the dispatcher to `/start`:

```jsx
import WelcomePage from './pages/WelcomePage'
```

```jsx
    <Routes>
      {/* Admin — full-width desktop, outside mobile frame */}
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Public — landing + auth, outside the mobile frame so the page can scroll */}
      <Route path="/" element={<WelcomePage />} />
      <Route path="/auth" element={<AuthPage />} />

      <Route element={<MobileLayout />}>
        <Route element={<RequireAuth />}>
          <Route path="/start" element={<RootRedirect />} />
          <Route path="/why" element={<WhyPage />} />
          <Route path="/select/mbti" element={<MbtiPage />} />
          <Route path="/select/career" element={<CareerPage />} />
          <Route path="/select/mastery" element={<MasteryPage />} />
          <Route path="/select/university" element={<UniversityPage />} />
          <Route path="/select/program" element={<ProgramPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
```

(`RootRedirect`, `RequireAuth`, `MobileLayout`, `RequireAdmin` are unchanged.)

- [ ] **Step 3: Repoint the onboarding back-link** — in `src/pages/WhyPage.jsx`, line 79, change:

```jsx
          onClick={() => navigate('/')}
```
to:
```jsx
          onClick={() => navigate('/start')}
```

- [ ] **Step 4: Verify build + existing tests** 

Run: `npm run lint && npx vitest run`
Expected: lint clean; all existing tests pass (no regressions from the route change).

- [ ] **Step 5: Manual smoke**

Run: `npm run dev`, open `/` → blank Welcome stub renders (no auth redirect). Open `/home` while logged out → AuthPage shown; after login → lands on `/home` via `/start`.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/pages/WhyPage.jsx src/pages/WelcomePage.jsx
git commit -m "feat(welcome): public / + /auth routes, move onboarding dispatcher to /start"
```

---

## Task 5: Neo-brutalist style utilities

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: CSS classes `.neo-card`, `.neo-btn` for use by welcome sections.

- [ ] **Step 1: Add utilities** — append to `src/index.css` (uses existing `--color-ink` token; honours reduced-motion):

```css
/* ── Welcome page: neo-brutalist "pixel kawaii" surface language ───────────── */
.neo-card {
  border: 2px solid var(--color-ink);
  border-radius: 1rem;
  background: var(--color-surface);
  box-shadow: 4px 4px 0 0 var(--color-ink);
}
.neo-btn {
  border: 2px solid var(--color-ink);
  box-shadow: 4px 4px 0 0 var(--color-ink);
  transition: transform 120ms steps(2), box-shadow 120ms steps(2);
}
.neo-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 0 var(--color-ink);
}
.neo-btn:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 0 var(--color-ink);
}
@media (prefers-reduced-motion: reduce) {
  .neo-btn { transition: none; }
  .neo-btn:hover, .neo-btn:active { transform: none; }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run dev` and confirm no Tailwind/PostCSS error in the terminal.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(welcome): add neo-brutalist .neo-card/.neo-btn utilities"
```

---

## Task 6: HeroSection + wire into WelcomePage (Register/Login/Play)

**Files:**
- Create: `src/components/welcome/HeroSection.jsx`
- Modify: `src/pages/WelcomePage.jsx`
- Test: `src/components/welcome/HeroSection.test.jsx`

**Interfaces:**
- Consumes: `useAuthStore` `user`; `useNavigate`.
- Produces: three actions — Register → `/auth?mode=register`, Login → `/auth?mode=login`, Play → `/home` if `user` else `/auth?mode=login`.

- [ ] **Step 1: Write the failing test** — `src/components/welcome/HeroSection.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let authState
const navigate = vi.fn()
vi.mock('../../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(authState) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

const { default: HeroSection } = await import('./HeroSection')

describe('HeroSection', () => {
  beforeEach(() => { authState = { user: null }; navigate.mockClear() })

  it('Register and Login deep-link into the auth tabs', () => {
    render(<HeroSection />)
    fireEvent.click(screen.getByRole('button', { name: /register/i }))
    expect(navigate).toHaveBeenCalledWith('/auth?mode=register')
    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    expect(navigate).toHaveBeenCalledWith('/auth?mode=login')
  })

  it('Play goes to /auth when logged out', () => {
    render(<HeroSection />)
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(navigate).toHaveBeenCalledWith('/auth?mode=login')
  })

  it('Play goes straight to /home when a session exists', () => {
    authState = { user: { uid: 'u1' } }
    render(<HeroSection />)
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(navigate).toHaveBeenCalledWith('/home')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/welcome/HeroSection.test.jsx`
Expected: FAIL — cannot resolve `./HeroSection`.

- [ ] **Step 3: Create HeroSection** — `src/components/welcome/HeroSection.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

export default function HeroSection() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const onPlay = () => navigate(user ? '/home' : '/auth?mode=login')

  return (
    <section className="onboarding-bg px-6 py-16 md:py-24 flex flex-col items-center text-center">
      <span className="text-6xl md:text-7xl mb-5" aria-hidden="true">🎢</span>
      <h1 className="pixel-font title-gradient text-2xl md:text-4xl leading-relaxed">
        ROLLER COASTER
      </h1>
      <p className="thai-font mt-4 max-w-xl text-base md:text-lg text-ink/70">
        วางแผนเส้นทางอนาคตของคุณด้วย AI เชื่อมต่อกับเพื่อนที่ใช่ และเรียนรู้ผ่านโลกเกม
      </p>

      <div className="mt-8 flex w-full max-w-md flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => navigate('/auth?mode=register')}
          className="neo-btn pixel-font text-[10px] text-white rounded-2xl px-6 py-4 min-h-11 bg-accent-pink"
        >
          REGISTER
        </button>
        <button
          onClick={() => navigate('/auth?mode=login')}
          className="neo-btn pixel-font text-[10px] text-ink rounded-2xl px-6 py-4 min-h-11 bg-surface"
        >
          LOGIN
        </button>
        <button
          onClick={onPlay}
          className="neo-btn pixel-font text-[10px] text-white rounded-2xl px-6 py-4 min-h-11 bg-brand-strong"
        >
          ▶ PLAY
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/welcome/HeroSection.test.jsx`
Expected: PASS (all four assertions).

- [ ] **Step 5: Mount it in WelcomePage** — replace `src/pages/WelcomePage.jsx` body:

```jsx
import HeroSection from '../components/welcome/HeroSection'

export default function WelcomePage() {
  return (
    <main data-testid="welcome-page" className="min-h-dvh w-full bg-[#F4F7FC] overflow-x-hidden">
      <HeroSection />
    </main>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/welcome/HeroSection.jsx src/components/welcome/HeroSection.test.jsx src/pages/WelcomePage.jsx
git commit -m "feat(welcome): hero section with register/login/play actions"
```

---

## Task 7: Static sections — FeatureHighlights, HowItWorks, WelcomeFooter

**Files:**
- Create: `src/components/welcome/FeatureHighlights.jsx`
- Create: `src/components/welcome/HowItWorks.jsx`
- Create: `src/components/welcome/WelcomeFooter.jsx`
- Modify: `src/pages/WelcomePage.jsx`

**Interfaces:**
- Produces: three presentational sections (no props). HowItWorks shows the three audience groups: นักเรียน/นักศึกษา · คนทำงาน (Soon) · ชีวิตประจำวัน.

- [ ] **Step 1: Create FeatureHighlights** — `src/components/welcome/FeatureHighlights.jsx`:

```jsx
const FEATURES = [
  { icon: '🧭', en: 'AI ROADMAP', th: 'วางแผนเส้นทางอนาคตด้วย AI ตั้งแต่สายอาชีพถึงมหาวิทยาลัย' },
  { icon: '🤝', en: 'SOCIAL MATCH', th: 'เชื่อมต่อกับเพื่อนและคู่เรียนที่เข้ากับคุณ' },
  { icon: '🎮', en: 'GAME WORLD', th: 'เรียนรู้และทำภารกิจผ่านโลกเกมแบบ pixel' },
]

export default function FeatureHighlights() {
  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">FEATURES</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.en} className="neo-card p-6 text-center">
            <div className="text-4xl mb-3" aria-hidden="true">{f.icon}</div>
            <h3 className="pixel-font text-[10px] text-brand-strong mb-2">{f.en}</h3>
            <p className="thai-font text-sm text-ink/70 leading-relaxed">{f.th}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create HowItWorks** — `src/components/welcome/HowItWorks.jsx`:

```jsx
const GROUPS = [
  { icon: '🎓', en: 'STUDENTS', th: 'นักเรียน / นักศึกษา', desc: 'ค้นหาตัวเอง วางแผนเข้ามหาวิทยาลัย และสายอาชีพ' },
  { icon: '💼', en: 'WORKERS', th: 'คนทำงาน', desc: 'พัฒนาทักษะและวางแผนเติบโตในสายงาน', soon: true },
  { icon: '🌱', en: 'DAILY LIFE', th: 'ชีวิตประจำวัน', desc: 'ตั้งเป้าหมาย ทำภารกิจ และสร้างนิสัยที่ดีทุกวัน' },
]

export default function HowItWorks() {
  return (
    <section className="onboarding-bg px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">HOW IT WORKS</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.en} className="neo-card relative p-6 text-center">
            {g.soon && (
              <span className="pixel-font absolute right-3 top-3 text-[7px] text-white bg-brand px-2 py-1 rounded-full">
                SOON
              </span>
            )}
            <div className="text-4xl mb-3" aria-hidden="true">{g.icon}</div>
            <h3 className="pixel-font text-[10px] text-accent-pink mb-1">{g.en}</h3>
            <p className="thai-font font-bold text-ink mb-1">{g.th}</p>
            <p className="thai-font text-sm text-ink/70 leading-relaxed">{g.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create WelcomeFooter** — `src/components/welcome/WelcomeFooter.jsx`:

```jsx
export default function WelcomeFooter() {
  return (
    <footer className="border-t-2 border-ink bg-surface px-6 py-10 text-center">
      <p className="pixel-font text-[10px] title-gradient mb-2">ROLLER COASTER</p>
      <p className="thai-font text-sm text-ink/60">เส้นทางสู่ความสำเร็จของคุณ</p>
      <p className="thai-font mt-4 text-xs text-ink/40">
        ติดต่อ: o.korawitt@gmail.com · RollerCoaster v0.1
      </p>
    </footer>
  )
}
```

- [ ] **Step 4: Mount in WelcomePage** — update `src/pages/WelcomePage.jsx`:

```jsx
import HeroSection from '../components/welcome/HeroSection'
import FeatureHighlights from '../components/welcome/FeatureHighlights'
import HowItWorks from '../components/welcome/HowItWorks'
import WelcomeFooter from '../components/welcome/WelcomeFooter'

export default function WelcomePage() {
  return (
    <main data-testid="welcome-page" className="min-h-dvh w-full bg-[#F4F7FC] overflow-x-hidden">
      <HeroSection />
      <FeatureHighlights />
      <HowItWorks />
      <WelcomeFooter />
    </main>
  )
}
```

- [ ] **Step 5: Manual verify**

Run: `npm run dev`, open `/`, resize narrow↔wide → 3-up grids collapse to 1 column on mobile; SOON badge visible on WORKERS.

- [ ] **Step 6: Commit**

```bash
git add src/components/welcome/FeatureHighlights.jsx src/components/welcome/HowItWorks.jsx src/components/welcome/WelcomeFooter.jsx src/pages/WelcomePage.jsx
git commit -m "feat(welcome): static feature, how-it-works, footer sections"
```

---

## Task 8: GamePreview section (CMS media)

**Files:**
- Create: `src/components/welcome/GamePreview.jsx`
- Modify: `src/pages/WelcomePage.jsx`

**Interfaces:**
- Consumes: `gamePreview: { mediaUrl, mediaType }|null` (from `useWelcomeContent`).
- Produces: `<GamePreview gamePreview={...} />` — renders `<video>` for `mediaType==='video'`, otherwise `<img>` (GIF/screenshot). Renders nothing if no media.

- [ ] **Step 1: Create GamePreview** — `src/components/welcome/GamePreview.jsx`:

```jsx
export default function GamePreview({ gamePreview }) {
  if (!gamePreview?.mediaUrl) return null
  const { mediaUrl, mediaType } = gamePreview

  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">GAME PREVIEW</h2>
      <div className="mx-auto max-w-3xl neo-card overflow-hidden p-2">
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            className="w-full rounded-xl"
            autoPlay loop muted playsInline
          />
        ) : (
          <img src={mediaUrl} alt="ตัวอย่างเกมในแอป" className="w-full rounded-xl" />
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Wire content into WelcomePage** — update `src/pages/WelcomePage.jsx` to call the hook and pass data:

```jsx
import { useWelcomeContent } from '../hooks/useWelcomeContent'
import HeroSection from '../components/welcome/HeroSection'
import FeatureHighlights from '../components/welcome/FeatureHighlights'
import GamePreview from '../components/welcome/GamePreview'
import HowItWorks from '../components/welcome/HowItWorks'
import WelcomeFooter from '../components/welcome/WelcomeFooter'

export default function WelcomePage() {
  const { gamePreview } = useWelcomeContent()
  return (
    <main data-testid="welcome-page" className="min-h-dvh w-full bg-[#F4F7FC] overflow-x-hidden">
      <HeroSection />
      <FeatureHighlights />
      <GamePreview gamePreview={gamePreview} />
      <HowItWorks />
      <WelcomeFooter />
    </main>
  )
}
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`, open `/` → with no `welcomeConfig/gamePreview` doc yet, the section is absent (no broken image). (It appears after Task 14 + uploading media.)

- [ ] **Step 4: Commit**

```bash
git add src/components/welcome/GamePreview.jsx src/pages/WelcomePage.jsx
git commit -m "feat(welcome): game preview section (CMS media)"
```

---

## Task 9: StatsSection (CMS)

**Files:**
- Create: `src/components/welcome/StatsSection.jsx`
- Modify: `src/pages/WelcomePage.jsx`

**Interfaces:**
- Consumes: `stats: Array<{label, value}>`.
- Produces: `<StatsSection stats={...} />` — renders nothing if `stats` is empty.

- [ ] **Step 1: Create StatsSection** — `src/components/welcome/StatsSection.jsx`:

```jsx
export default function StatsSection({ stats }) {
  if (!stats?.length) return null
  return (
    <section className="px-6 py-12">
      <div className="mx-auto grid max-w-4xl gap-4 grid-cols-2 md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="neo-card p-5 text-center">
            <p className="pixel-font text-base md:text-xl text-accent-pink">{s.value}</p>
            <p className="thai-font mt-1 text-xs text-ink/60">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Mount in WelcomePage** — add the import and place `<StatsSection stats={stats} />` after `<FeatureHighlights />`; destructure `stats` from the hook:

```jsx
  const { gamePreview, stats } = useWelcomeContent()
```
```jsx
import StatsSection from '../components/welcome/StatsSection'
```
```jsx
      <FeatureHighlights />
      <StatsSection stats={stats} />
      <GamePreview gamePreview={gamePreview} />
```

- [ ] **Step 3: Manual verify** — `npm run dev`, `/` shows no stats yet (empty until CMS populated).

- [ ] **Step 4: Commit**

```bash
git add src/components/welcome/StatsSection.jsx src/pages/WelcomePage.jsx
git commit -m "feat(welcome): stats section (CMS)"
```

---

## Task 10: NewsSection + BottomSheet detail (CMS)

**Files:**
- Create: `src/components/welcome/NewsSection.jsx`
- Modify: `src/pages/WelcomePage.jsx`

**Interfaces:**
- Consumes: `news: Array<{id, titleTh, bodyTh, coverUrl, createdAt}>`; existing `BottomSheet` from `src/components/ui/BottomSheet.jsx`.
- Produces: `<NewsSection news={...} />` — cards open a `BottomSheet` with full body.

> Before implementing, open `src/components/ui/BottomSheet.jsx` and match its prop API (commonly `open`/`isOpen` + `onClose` + children). Use the exact prop names it exports.

- [ ] **Step 1: Create NewsSection** — `src/components/welcome/NewsSection.jsx` (adjust `BottomSheet` props to its real API):

```jsx
import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet'

export default function NewsSection({ news }) {
  const [active, setActive] = useState(null)
  if (!news?.length) return null

  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">NEWS &amp; UPDATES</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((n) => (
          <button
            key={n.id}
            onClick={() => setActive(n)}
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

      <BottomSheet open={!!active} onClose={() => setActive(null)}>
        {active && (
          <div className="p-5">
            {active.coverUrl && (
              <img src={active.coverUrl} alt="" className="mb-4 w-full rounded-xl object-cover" />
            )}
            <h3 className="thai-font text-lg font-bold text-ink">{active.titleTh}</h3>
            <p className="thai-font mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/80">
              {active.bodyTh}
            </p>
          </div>
        )}
      </BottomSheet>
    </section>
  )
}
```

- [ ] **Step 2: Mount in WelcomePage** — destructure `news`; add `import NewsSection` and place `<NewsSection news={news} />` after `<GamePreview />`.

- [ ] **Step 3: Manual verify** — `npm run dev`, `/` shows no news yet; once CMS adds an item (Task 14), tapping a card opens the sheet.

- [ ] **Step 4: Commit**

```bash
git add src/components/welcome/NewsSection.jsx src/pages/WelcomePage.jsx
git commit -m "feat(welcome): news cards + bottom-sheet detail (CMS)"
```

---

## Task 11: Testimonials (CMS)

**Files:**
- Create: `src/components/welcome/Testimonials.jsx`
- Modify: `src/pages/WelcomePage.jsx`

**Interfaces:**
- Consumes: `testimonials: Array<{id, name, role, quote, avatarUrl}>`.
- Produces: `<Testimonials testimonials={...} />`. Avatar falls back to the name's first initial when `avatarUrl` is absent.

- [ ] **Step 1: Create Testimonials** — `src/components/welcome/Testimonials.jsx`:

```jsx
export default function Testimonials({ testimonials }) {
  if (!testimonials?.length) return null
  return (
    <section className="onboarding-bg px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">TESTIMONIALS</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t) => (
          <figure key={t.id} className="neo-card p-6">
            <div className="flex items-center gap-3">
              {t.avatarUrl ? (
                <img src={t.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white font-bold">
                  {(t.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <figcaption className="thai-font">
                <p className="font-bold text-ink">{t.name}</p>
                <p className="text-xs text-ink/50">{t.role}</p>
              </figcaption>
            </div>
            <blockquote className="thai-font mt-3 text-sm leading-relaxed text-ink/75">
              “{t.quote}”
            </blockquote>
          </figure>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Mount in WelcomePage** — destructure `testimonials`; add import; place `<Testimonials testimonials={testimonials} />` after `<HowItWorks />`.

- [ ] **Step 3: Commit**

```bash
git add src/components/welcome/Testimonials.jsx src/pages/WelcomePage.jsx
git commit -m "feat(welcome): testimonials section (CMS)"
```

---

## Task 12: FaqSection (CMS accordion)

**Files:**
- Create: `src/components/welcome/FaqSection.jsx`
- Modify: `src/pages/WelcomePage.jsx`

**Interfaces:**
- Consumes: `faq: Array<{id, q, a, order}>`.
- Produces: `<FaqSection faq={...} />` — native `<details>` accordion (no extra deps).

- [ ] **Step 1: Create FaqSection** — `src/components/welcome/FaqSection.jsx`:

```jsx
export default function FaqSection({ faq }) {
  if (!faq?.length) return null
  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">FAQ</h2>
      <div className="mx-auto max-w-3xl space-y-3">
        {faq.map((item) => (
          <details key={item.id} className="neo-card p-4">
            <summary className="thai-font cursor-pointer font-bold text-ink">{item.q}</summary>
            <p className="thai-font mt-2 text-sm leading-relaxed text-ink/70">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Mount in WelcomePage** — destructure `faq`; add import; place `<FaqSection faq={faq} />` after `<Testimonials />` and before the footer.

- [ ] **Step 3: Commit**

```bash
git add src/components/welcome/FaqSection.jsx src/pages/WelcomePage.jsx
git commit -m "feat(welcome): FAQ accordion section (CMS)"
```

---

## Task 13: DonateSection (PromptPay QR, no login)

**Files:**
- Create: `src/components/welcome/DonateSection.jsx`
- Modify: `src/pages/WelcomePage.jsx`

**Interfaces:**
- Consumes: `buildPromptPayQR` from `src/lib/promptpay.js`; `shopConfig` from `src/constants/shopConfig.js`.
- Produces: `<DonateSection />` — a button opening a modal that renders a static PromptPay QR for a fixed/default amount. No login, no slip upload, no verification.

> Confirm `buildPromptPayQR(number, amount)` signature in `src/lib/promptpay.js` (it returns a data-URL Promise — same call `QRPaymentCard` uses). A `null`/`0` amount yields an "any amount" PromptPay QR; if `buildPromptPayQR` requires a positive amount, default to a suggested amount such as `100`.

- [ ] **Step 1: Create DonateSection** — `src/components/welcome/DonateSection.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { buildPromptPayQR } from '../../lib/promptpay'
import { shopConfig } from '../../constants/shopConfig'

const SUGGESTED = 100 // default amount; donor can overpay/underpay when scanning

export default function DonateSection() {
  const [open, setOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState(null)

  useEffect(() => {
    if (!open) return
    buildPromptPayQR(shopConfig.promptPayNumber, SUGGESTED)
      .then(setQrUrl)
      .catch(() => setQrUrl(null))
  }, [open])

  return (
    <section className="px-6 py-14 text-center">
      <h2 className="pixel-font text-sm md:text-lg text-ink mb-3">SUPPORT US</h2>
      <p className="thai-font mx-auto mb-6 max-w-md text-sm text-ink/70">
        ถ้าชอบโปรเจกต์นี้ สามารถสนับสนุนเราผ่าน PromptPay ได้เลย ขอบคุณมาก 💜
      </p>
      <button
        onClick={() => setOpen(true)}
        className="neo-btn pixel-font text-[10px] text-white rounded-2xl bg-accent-pink px-6 py-4 min-h-11"
      >
        ♥ DONATE
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="บริจาคผ่าน PromptPay"
        >
          <div className="neo-card max-w-xs w-full p-6" onClick={(e) => e.stopPropagation()}>
            <p className="pixel-font text-[10px] text-ink mb-4">PROMPTPAY</p>
            <div className="flex justify-center">
              {qrUrl ? (
                <img src={qrUrl} alt="PromptPay QR" className="h-52 w-52 rounded-lg border-2 border-brand p-2" />
              ) : (
                <div className="flex h-52 w-52 items-center justify-center text-3xl">⏳</div>
              )}
            </div>
            <div className="thai-font mt-4 text-sm text-ink/70">
              {shopConfig.merchantName} · {shopConfig.promptPayNumber}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="thai-font mt-5 w-full rounded-2xl border-2 border-ink py-3 text-sm font-bold text-ink"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Mount in WelcomePage** — add `import DonateSection`; place `<DonateSection />` after `<FaqSection faq={faq} />` and before `<WelcomeFooter />`.

- [ ] **Step 3: Manual verify**

Run: `npm run dev`, open `/` logged out → click DONATE → modal shows a scannable QR; no login prompt; clicking the backdrop or ปิด closes it.

- [ ] **Step 4: Commit**

```bash
git add src/components/welcome/DonateSection.jsx src/pages/WelcomePage.jsx
git commit -m "feat(welcome): donate section with PromptPay QR (no login)"
```

---

## Task 14: Admin CMS — Welcome section

**Files:**
- Modify: `src/constants/admin.js`
- Modify: `src/constants/admin.test.js` (extend)
- Modify: `src/pages/AdminPage.jsx`
- Create: `src/components/admin/WelcomeSection.jsx`

**Interfaces:**
- Consumes: `refs.welcomeGamePreview`, `refs.welcomeStats`, `cols.welcomeNews`, `cols.welcomeFaq`, `cols.welcomeTestimonials` (Task 1); `storage` from `src/firebase.js`; admin `ToastProvider`/`useToast` from `src/components/admin/Toast.jsx`.
- Produces: `'welcome'` admin section; a `<WelcomeSection />` editor with sub-editors for Game Preview, Stats, News, FAQ, Testimonials.

- [ ] **Step 1: Write the failing constants test** — append to `src/constants/admin.test.js`:

```js
describe('welcome section access', () => {
  it('includes welcome in ADMIN_SECTIONS', () => {
    expect(ADMIN_SECTIONS).toContain('welcome')
  })
  it('grants the super-admin the welcome section', () => {
    expect(getAdminSections('o.korawitt@gmail.com')).toContain('welcome')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/constants/admin.test.js`
Expected: FAIL — `welcome` not in sections.

- [ ] **Step 3: Add the section** — in `src/constants/admin.js`:

Add `'welcome'` to `ADMIN_SECTIONS`:
```js
export const ADMIN_SECTIONS = ['analytics', 'users', 'characters', 'maps', 'music', 'shop', 'finance', 'welcome']
```
Add `'welcome'` to the super-admin's role list:
```js
  'o.korawitt@gmail.com': ['analytics', 'users', 'characters', 'maps', 'music', 'shop', 'finance', 'welcome'],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/constants/admin.test.js`
Expected: PASS.

- [ ] **Step 5: Register the tab** — in `src/pages/AdminPage.jsx`, add the import, the tab, and the render branch:

```jsx
import WelcomeSection from '../components/admin/WelcomeSection'
```
Add to `ALL_TABS`:
```js
  { id: 'welcome',    label: 'Welcome' },
```
Add to the content area:
```jsx
          {tab === 'welcome'    && <WelcomeSection />}
```

- [ ] **Step 6: Create the WelcomeSection editor** — `src/components/admin/WelcomeSection.jsx`. It loads current content and provides CRUD. Uses Firestore writes + Storage uploads; surfaces results via the admin `useToast()`.

```jsx
import { useEffect, useState } from 'react'
import {
  getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase'
import { refs, cols } from '../../lib/db'
import { useToast } from './Toast'

async function uploadWelcomeMedia(file, kind) {
  const path = `welcome/${kind}/${file.name}`
  await uploadBytes(storageRef(storage, path), file, { contentType: file.type || 'image/png' })
  return getDownloadURL(storageRef(storage, path))
}

export default function WelcomeSection() {
  const toast = useToast()
  const [gamePreview, setGamePreview] = useState({ mediaUrl: '', mediaType: 'gif' })
  const [stats, setStats] = useState([])
  const [news, setNews] = useState([])
  const [faq, setFaq] = useState([])
  const [testimonials, setTestimonials] = useState([])

  async function reload() {
    const [gp, st, nw, fq, ts] = await Promise.all([
      getDoc(refs.welcomeGamePreview()),
      getDoc(refs.welcomeStats()),
      getDocs(query(cols.welcomeNews, orderBy('createdAt', 'desc'))),
      getDocs(query(cols.welcomeFaq, orderBy('order', 'asc'))),
      getDocs(query(cols.welcomeTestimonials, orderBy('order', 'asc'))),
    ])
    if (gp.exists()) setGamePreview({ mediaType: 'gif', mediaUrl: '', ...gp.data() })
    setStats(st.exists() ? (st.data().items ?? []) : [])
    setNews(nw.docs.map((d) => ({ id: d.id, ...d.data() })))
    setFaq(fq.docs.map((d) => ({ id: d.id, ...d.data() })))
    setTestimonials(ts.docs.map((d) => ({ id: d.id, ...d.data() })))
  }
  useEffect(() => { reload().catch((e) => toast.error?.(String(e))) }, [])

  // ── Game preview ──
  async function onUploadPreview(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const mediaUrl = await uploadWelcomeMedia(file, 'gamePreview')
    const mediaType = file.type.startsWith('video') ? 'video' : 'gif'
    await setDoc(refs.welcomeGamePreview(), { mediaUrl, mediaType })
    setGamePreview({ mediaUrl, mediaType })
    toast.success?.('อัปเดต Game Preview แล้ว')
  }

  // ── Stats (array on one doc) ──
  async function saveStats(next) {
    setStats(next)
    await setDoc(refs.welcomeStats(), { items: next })
    toast.success?.('บันทึก Stats แล้ว')
  }

  // ── Generic list CRUD ──
  async function addItem(col, payload, withCreatedAt) {
    await addDoc(col, withCreatedAt ? { ...payload, createdAt: serverTimestamp() } : payload)
    await reload()
  }
  async function removeItem(col, id) {
    await deleteDoc(doc(col, id))
    await reload()
  }
  async function patchItem(col, id, payload) {
    await updateDoc(doc(col, id), payload)
    await reload()
  }

  return (
    <div className="space-y-10">
      {/* GAME PREVIEW */}
      <section>
        <h2 className="text-lg font-bold text-ink mb-3">Game Preview</h2>
        {gamePreview.mediaUrl && (
          <p className="text-xs text-gray-500 mb-2 break-all">{gamePreview.mediaUrl}</p>
        )}
        <input type="file" accept="image/gif,image/png,image/jpeg,video/mp4" onChange={onUploadPreview} />
      </section>

      {/* STATS */}
      <section>
        <h2 className="text-lg font-bold text-ink mb-3">Stats</h2>
        {stats.map((s, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              className="border rounded px-2 py-1 text-sm" placeholder="value (1.2k+)"
              value={s.value}
              onChange={(e) => setStats(stats.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
            />
            <input
              className="border rounded px-2 py-1 text-sm" placeholder="label (นักเรียน)"
              value={s.label}
              onChange={(e) => setStats(stats.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
            />
            <button className="text-rose-600 text-sm" onClick={() => saveStats(stats.filter((_, j) => j !== i))}>ลบ</button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <button className="text-brand text-sm" onClick={() => setStats([...stats, { value: '', label: '' }])}>+ เพิ่มแถว</button>
          <button className="bg-brand text-white rounded px-3 py-1 text-sm" onClick={() => saveStats(stats)}>บันทึก Stats</button>
        </div>
      </section>

      {/* NEWS */}
      <ListEditor
        title="News / Blog"
        items={news}
        fields={[
          { key: 'titleTh', label: 'หัวข้อ' },
          { key: 'bodyTh', label: 'เนื้อหา', textarea: true },
          { key: 'coverUrl', label: 'รูปปก URL (optional)' },
        ]}
        onAdd={(payload) => addItem(cols.welcomeNews, payload, true)}
        onPatch={(id, payload) => patchItem(cols.welcomeNews, id, payload)}
        onRemove={(id) => removeItem(cols.welcomeNews, id)}
        upload={(file) => uploadWelcomeMedia(file, 'news')}
        uploadTarget="coverUrl"
      />

      {/* FAQ */}
      <ListEditor
        title="FAQ"
        items={faq}
        fields={[
          { key: 'q', label: 'คำถาม' },
          { key: 'a', label: 'คำตอบ', textarea: true },
          { key: 'order', label: 'ลำดับ', number: true },
        ]}
        onAdd={(payload) => addItem(cols.welcomeFaq, { order: 0, ...payload })}
        onPatch={(id, payload) => patchItem(cols.welcomeFaq, id, payload)}
        onRemove={(id) => removeItem(cols.welcomeFaq, id)}
      />

      {/* TESTIMONIALS */}
      <ListEditor
        title="Testimonials"
        items={testimonials}
        fields={[
          { key: 'name', label: 'ชื่อ' },
          { key: 'role', label: 'บทบาท (นักเรียน ม.6)' },
          { key: 'quote', label: 'ข้อความ', textarea: true },
          { key: 'order', label: 'ลำดับ', number: true },
          { key: 'avatarUrl', label: 'รูป URL (optional)' },
        ]}
        onAdd={(payload) => addItem(cols.welcomeTestimonials, { order: 0, ...payload })}
        onPatch={(id, payload) => patchItem(cols.welcomeTestimonials, id, payload)}
        onRemove={(id) => removeItem(cols.welcomeTestimonials, id)}
        upload={(file) => uploadWelcomeMedia(file, 'testimonials')}
        uploadTarget="avatarUrl"
      />
    </div>
  )
}

// Small reusable add/edit/delete editor for a list collection.
function ListEditor({ title, items, fields, onAdd, onPatch, onRemove, upload, uploadTarget }) {
  const blank = Object.fromEntries(fields.map((f) => [f.key, f.number ? 0 : '']))
  const [draft, setDraft] = useState(blank)

  function setField(obj, setObj, key, val, number) {
    setObj({ ...obj, [key]: number ? Number(val) : val })
  }

  async function handleUpload(e, apply) {
    const file = e.target.files?.[0]
    if (!file || !upload) return
    const url = await upload(file)
    apply(uploadTarget, url)
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-ink mb-3">{title}</h2>

      {/* Existing items */}
      <div className="space-y-3 mb-4">
        {items.map((it) => (
          <div key={it.id} className="border rounded-lg p-3">
            {fields.map((f) => (
              <div key={f.key} className="mb-2">
                <label className="block text-xs text-gray-500">{f.label}</label>
                {f.textarea ? (
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm" rows={3}
                    value={it[f.key] ?? ''}
                    onChange={(e) => onPatch(it.id, { [f.key]: e.target.value })}
                  />
                ) : (
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    type={f.number ? 'number' : 'text'}
                    value={it[f.key] ?? (f.number ? 0 : '')}
                    onChange={(e) => onPatch(it.id, { [f.key]: f.number ? Number(e.target.value) : e.target.value })}
                  />
                )}
              </div>
            ))}
            {upload && (
              <input type="file" className="text-xs" onChange={(e) => handleUpload(e, (k, url) => onPatch(it.id, { [k]: url }))} />
            )}
            <button className="text-rose-600 text-sm mt-2" onClick={() => onRemove(it.id)}>ลบ</button>
          </div>
        ))}
      </div>

      {/* New item draft */}
      <div className="border-2 border-dashed rounded-lg p-3">
        <p className="text-sm font-semibold mb-2">+ เพิ่มใหม่</p>
        {fields.map((f) => (
          <div key={f.key} className="mb-2">
            <label className="block text-xs text-gray-500">{f.label}</label>
            {f.textarea ? (
              <textarea
                className="w-full border rounded px-2 py-1 text-sm" rows={3}
                value={draft[f.key]}
                onChange={(e) => setField(draft, setDraft, f.key, e.target.value, false)}
              />
            ) : (
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                type={f.number ? 'number' : 'text'}
                value={draft[f.key]}
                onChange={(e) => setField(draft, setDraft, f.key, e.target.value, f.number)}
              />
            )}
          </div>
        ))}
        {upload && (
          <input type="file" className="text-xs mb-2" onChange={(e) => handleUpload(e, (k, url) => setDraft((d) => ({ ...d, [k]: url })))} />
        )}
        <button
          className="bg-brand text-white rounded px-3 py-1 text-sm"
          onClick={async () => { await onAdd(draft); setDraft(blank) }}
        >
          เพิ่ม
        </button>
      </div>
    </section>
  )
}
```

> Verify the toast API in `src/components/admin/Toast.jsx` and adjust `toast.success?.()`/`toast.error?.()` to its real method names. The optional-chaining keeps it safe if the names differ, but match them for real feedback.

- [ ] **Step 7: Manual verify**

Run: `npm run dev`, sign in as `o.korawitt@gmail.com`, open `/admin` → Welcome tab. Add a Stat, a News item, a FAQ, a Testimonial; upload a Game Preview. Reload `/` → all appear.

- [ ] **Step 8: Commit**

```bash
git add src/constants/admin.js src/constants/admin.test.js src/pages/AdminPage.jsx src/components/admin/WelcomeSection.jsx
git commit -m "feat(welcome): admin CMS for game preview, stats, news, faq, testimonials"
```

---

## Task 15: Security rules — Firestore + Storage

**Files:**
- Modify: `firestore.rules`
- Modify: `storage.rules`
- Test: `test/rules/firestore.rules.test.js` (extend)

**Interfaces:**
- Produces: public read + super-admin write for `welcomeConfig/**` (Firestore) and `welcome/**` (Storage).

- [ ] **Step 1: Write the failing rules test** — append a describe block to `test/rules/firestore.rules.test.js`:

```js
describe('welcomeConfig rules', () => {
  it('allows anyone (even unauthenticated) to read welcome content', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'welcomeConfig/stats')))
    await assertSucceeds(getDoc(doc(anon, 'welcomeConfig/news/items/n1')))
  })

  it('lets the super-admin write welcome content', async () => {
    const sa = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(setDoc(doc(sa, 'welcomeConfig/stats'), { items: [] }))
    await assertSucceeds(setDoc(doc(sa, 'welcomeConfig/news/items/n2'), { titleTh: 'x' }))
  })

  it('BLOCKS a non-admin signed-in user from writing welcome content', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'welcomeConfig/stats'), { items: [] }))
  })
})
```

- [ ] **Step 2: Add the Firestore rule** — in `firestore.rules`, inside `match /databases/{database}/documents`, add (mirrors `mapConfigs`):

```
    // Welcome / landing page content. World-readable (the landing page is public,
    // even for unauthenticated visitors); only the super-admin edits it via the
    // Admin Dashboard. Recursive so the news/faq/testimonials subcollections inherit.
    match /welcomeConfig/{document=**} {
      allow read:  if true;
      allow write: if isSuperAdmin();
    }
```

- [ ] **Step 3: Add the Storage rule** — in `storage.rules`, inside `match /b/{bucket}/o`, add:

```
    // Welcome page media — game preview, news covers, testimonial avatars.
    // Public read (download URLs are public tokens); super-admin writes via Dashboard.
    match /welcome/{allPaths=**} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
```

- [ ] **Step 4: Run the rules test** (requires emulator)

Run: `firebase emulators:exec --only firestore "npm run test:rules"`
Expected: PASS — anon reads succeed, super-admin writes succeed, non-admin write fails.

- [ ] **Step 5: Deploy rules** (when ready to go live)

Run: `firebase deploy --only firestore:rules,storage`
Expected: both rule sets deploy cleanly.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules storage.rules test/rules/firestore.rules.test.js
git commit -m "feat(welcome): public-read/admin-write rules for welcomeConfig + welcome storage"
```

---

## Task 16: Full-suite verification & end-to-end manual QA

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite + lint**

Run: `npm run lint && npx vitest run`
Expected: lint clean; all tests pass (including the new db, hook, AuthPage, Hero, admin-constants tests).

- [ ] **Step 2: End-to-end manual checklist** (`npm run dev`)

- [ ] `/` logged out → Welcome renders all populated sections; resize narrow↔wide → all grids look good on mobile and desktop.
- [ ] Hero: REGISTER → `/auth` opens on the สมัครสมาชิก tab; LOGIN → `/auth` on เข้าสู่ระบบ tab; PLAY (logged out) → `/auth` login.
- [ ] Register a new account on `/auth` → lands in onboarding via `/start` → RegisterPage → Start With Why → "Ready to use?" returns to `/start` → select flow → `/home`.
- [ ] With a live session, open `/` → click PLAY → goes straight to `/home`.
- [ ] Settings → Sign out → lands on `/` (Welcome).
- [ ] DONATE → modal shows a scannable PromptPay QR, no login required, closes on backdrop/ปิด.
- [ ] `/admin` (as super-admin) → Welcome tab → add/edit/delete Stats, News, FAQ, Testimonial; upload Game Preview → reload `/` reflects every change.
- [ ] News card tap → BottomSheet shows full article.

- [ ] **Step 3: Final commit (if any QA fixes were needed)**

```bash
git add -A
git commit -m "test(welcome): full-suite + manual QA pass"
```

---

## Self-Review Notes

- **Spec coverage:** Routing (`/`, `/auth`, `/start`) → Task 4; Play/Register/Login → Task 6; bilingual + responsive + neo-brutalist-with-existing-tokens → Tasks 5–7; all 10 sections → Tasks 6–13; Game Preview media → Task 8; Stats/News/FAQ/Testimonials CMS → Tasks 9–14; Donate QR no-login → Task 13; Admin CMS → Task 14; security rules → Task 15. All covered.
- **Type consistency:** `useWelcomeContent` returns `{gamePreview, stats, news, faq, testimonials, loading}` and every consumer destructures those exact keys; item field names (`titleTh/bodyTh/coverUrl`, `q/a/order`, `name/role/quote/avatarUrl`) are identical across the read hook, section components, and the admin editor.
- **Known confirmations to make during execution (flagged inline, not placeholders):** `BottomSheet` prop names (Task 10), `buildPromptPayQR` amount handling (Task 13), and the admin `Toast` method names (Task 14). Each task says to verify against the existing file and adjust.
