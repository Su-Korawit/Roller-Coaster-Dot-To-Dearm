# Welcome Page — Feature Detail + How to Play Implementation Plan

> **For Cursor:** This plan is implementation-ready — apply it task by task in the IDE (React components, JSX, Tailwind, copy). Claude Code wrote this plan and will run `npm test` / review the diff afterward per the project's Claude Code ↔ Cursor workflow; it will not implement this itself. Steps use checkbox (`- [ ]`) syntax — check them off as you go. Where a step says "manual visual check," that's your call to make — Vitest/jsdom can't judge whether something looks good.

**Goal:** Fix the Welcome page's two thinnest sections — `FeatureHighlights` (3 cards, one vague sentence each) and the missing "how do I actually play this" content — by (1) giving Features real depth grounded in the app's actual mechanics, and (2) adding a new "How to Play" section that doesn't exist yet. Both get a visual treatment distinct from the page's repeated 3-equal-column grid pattern, so the page reads as designed rather than templated.

**Architecture:** `FeatureHighlights.jsx` is rewritten in place (same file, richer data + layout). A new `HowToPlay.jsx` component is added to `src/components/welcome/`, wired into `WelcomePage.jsx` between Features and Stats, and linked from `WelcomeNav.jsx`. No data layer changes — both sections are fully static (no Firestore content), same as the existing `HowItWorks.jsx`.

**Tech Stack:** React 19, Tailwind v4 (existing tokens only, no config file), Vitest + `@testing-library/react`.

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- **Tailwind v4 tokens only** — reuse existing design tokens/classes: `neo-card`, `pixel-font`, `thai-font`, `text-ink`, `text-brand-strong`, `var(--color-brand)`, `var(--color-accent-pink)` (see `src/index.css` `@theme`). Don't add a config file or new color tokens.
- **Avoid the repeated 3-equal-column grid look** — `FeatureHighlights`, `HowItWorks`, and `Testimonials` all already use `grid gap-5 sm:grid-cols-3`; the two sections in this plan must look visually distinct from that pattern and from each other (this is the "make it feel designed, not AI-templated" ask).
- Content is grounded in real product mechanics from `CONTEXT.md`'s Domain Vocabulary (Roadmap, Match score, Personal Map, Coins, Streak, AI daily tasks) — not generic marketing copy.
- Verify with `npm test` after each task; do a manual visual pass (`npm run dev`) at the end of each task, checking mobile width (~375px) through desktop.

---

### Task 1: Rewrite `FeatureHighlights.jsx` with real detail per feature

**Files:**
- Modify: `src/components/welcome/FeatureHighlights.jsx`
- Create: `src/components/welcome/FeatureHighlights.test.jsx`

**Interfaces:**
- Produces: `FeatureHighlights` default export, no props (unchanged signature) — only its internal content/markup changes.

- [ ] **Step 1: Rewrite the component** — replace the full contents of `src/components/welcome/FeatureHighlights.jsx`:

```jsx
const FEATURES = [
  {
    icon: '🧭',
    en: 'AI ROADMAP',
    th: 'วางแผนเส้นทางอนาคตด้วย AI',
    points: [
      'AI สร้างเส้นทางสายอาชีพและสายมหาวิทยาลัยให้อัตโนมัติ',
      'ปรับแต่งเส้นทางเองได้บนผังโหนดแบบลากวาง',
      'รับภารกิจรายวันจาก AI เพื่อเดินตามแผนทีละก้าว',
    ],
  },
  {
    icon: '🤝',
    en: 'SOCIAL MATCH',
    th: 'จับคู่เพื่อนที่เข้ากับคุณ',
    points: [
      'คำนวณ Match Score จากคณะ MBTI และมหาวิทยาลัยที่เลือก',
      'แชทและสะสม Stack ทุกวันเพื่อจัดอันดับเพื่อนสนิท',
      'ไปเยี่ยม Personal Map ของเพื่อนแบบเรียลไทม์',
    ],
  },
  {
    icon: '🎮',
    en: 'GAME WORLD',
    th: 'โลกเกมของคุณเอง',
    points: [
      'ปลูกผักและตกแต่ง Personal Map ในสไตล์ pixel',
      'เก็บ Coins และสร้าง Streak จากการเล่นทุกวัน',
      'สำรวจแมพเพื่อนและร้านค้าในโลกเกม',
    ],
  },
]

export default function FeatureHighlights() {
  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-3">FEATURES</h2>
      <p className="thai-font text-center text-sm text-ink/60 mb-10">
        ทุกฟีเจอร์ที่ช่วยให้คุณวางแผนอนาคตไปพร้อมกับความสนุก
      </p>
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div key={f.en} className={`neo-card p-6 ${i === 1 ? 'sm:mt-6' : ''}`}>
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-accent-pink))' }}
              aria-hidden="true"
            >
              {f.icon}
            </div>
            <h3 className="pixel-font text-[10px] text-brand-strong mb-1">{f.en}</h3>
            <p className="thai-font font-bold text-ink mb-3">{f.th}</p>
            <ul className="thai-font space-y-1.5 text-sm text-ink/70">
              {f.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-brand-strong" aria-hidden="true">▸</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
```

Note the `sm:mt-6` on the middle card (`i === 1`) — a small vertical offset that breaks the "3 identical boxes in a row" look without needing a different grid system.

- [ ] **Step 2: Write the test** — create `src/components/welcome/FeatureHighlights.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeatureHighlights from './FeatureHighlights'

describe('FeatureHighlights', () => {
  it('renders all three feature pillars with detail bullets, not just a headline', () => {
    render(<FeatureHighlights />)
    expect(screen.getByText('AI ROADMAP')).toBeTruthy()
    expect(screen.getByText('SOCIAL MATCH')).toBeTruthy()
    expect(screen.getByText('GAME WORLD')).toBeTruthy()
    expect(screen.getByText(/Match Score/)).toBeTruthy()
    // "Personal Map" appears in two different features' bullets — assert both are present.
    expect(screen.getAllByText(/Personal Map/).length).toBe(2)
  })
})
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/components/welcome/FeatureHighlights.test.jsx`
Expected: PASS

- [ ] **Step 4: Manual visual check** — `npm run dev`, scroll to Features on the Welcome page at both mobile (~375px) and desktop widths. Confirm: gradient icon badges render, bullet points are readable (not cramped), and the middle card's offset reads as intentional rather than broken on mobile (at `sm:` and below, `sm:mt-6` doesn't apply, so all three stack full-width — confirm that's still fine).

- [ ] **Step 5: Commit**

```bash
git add src/components/welcome/FeatureHighlights.jsx src/components/welcome/FeatureHighlights.test.jsx
git commit -m "feat(welcome): give FeatureHighlights real detail instead of one-line placeholders"
```

---

### Task 2: Add a new `HowToPlay.jsx` section

**Files:**
- Create: `src/components/welcome/HowToPlay.jsx`
- Create: `src/components/welcome/HowToPlay.test.jsx`

**Interfaces:**
- Produces: `HowToPlay` default export, no props.

- [ ] **Step 1: Write the failing test** — create `src/components/welcome/HowToPlay.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HowToPlay from './HowToPlay'

describe('HowToPlay', () => {
  it('renders all 5 steps in order with numbered badges', () => {
    render(<HowToPlay />)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText(/Roadmap ให้อัตโนมัติ/)).toBeTruthy()
    expect(screen.getByText(/Personal Map ของเพื่อน/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/welcome/HowToPlay.test.jsx`
Expected: FAIL — `Failed to resolve import "./HowToPlay"`

- [ ] **Step 3: Implement** — create `src/components/welcome/HowToPlay.jsx`:

```jsx
const STEPS = [
  { icon: '🧬', th: 'เลือก MBTI คณะ และมหาวิทยาลัยที่สนใจ', desc: 'ตอบคำถามสั้นๆ เพื่อสร้างโปรไฟล์ของคุณ' },
  { icon: '🧭', th: 'ให้ AI สร้าง Roadmap ให้อัตโนมัติ', desc: 'ปรับแต่งเส้นทางเองได้บนผังโหนดแบบลากวาง' },
  { icon: '✅', th: 'ทำภารกิจรายวันที่ AI สร้างให้', desc: 'เก็บ Coins และสร้าง Streak ทุกวันที่เข้าเล่น' },
  { icon: '🌱', th: 'ปลูกผักและตกแต่ง Personal Map', desc: 'สร้างโลกเกมในสไตล์ pixel เป็นของคุณเอง' },
  { icon: '🤝', th: 'แชทและจับคู่เพื่อนที่เข้ากับคุณ', desc: 'ไปเยี่ยม Personal Map ของเพื่อนแบบเรียลไทม์' },
]

export default function HowToPlay() {
  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-10">HOW TO PLAY</h2>
      <ol className="mx-auto max-w-2xl">
        {STEPS.map((s, i) => (
          <li key={s.th} className="relative flex gap-5 pb-10 last:pb-0">
            {i < STEPS.length - 1 && (
              <span className="absolute left-6 top-14 h-full w-0.5 bg-brand/30" aria-hidden="true" />
            )}
            <div className="pixel-font relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-strong text-sm text-white">
              {i + 1}
            </div>
            <div className="neo-card flex-1 p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">{s.icon}</span>
                <p className="thai-font font-bold text-ink">{s.th}</p>
              </div>
              <p className="thai-font text-sm text-ink/70">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

This is a numbered vertical timeline (connecting line + circular badges), deliberately different from the `grid sm:grid-cols-3` pattern used everywhere else on the page.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/welcome/HowToPlay.test.jsx`
Expected: PASS

- [ ] **Step 5: Manual visual check** — `npm run dev`, confirm the connecting line aligns through the center of each numbered badge (not offset), and the timeline reads cleanly on mobile width (~375px) without the line drifting from the badges.

- [ ] **Step 6: Commit**

```bash
git add src/components/welcome/HowToPlay.jsx src/components/welcome/HowToPlay.test.jsx
git commit -m "feat(welcome): add How to Play section (previously missing entirely)"
```

---

### Task 3: Wire `HowToPlay` into `WelcomePage.jsx` and `WelcomeNav.jsx`

**Files:**
- Modify: `src/pages/WelcomePage.jsx`
- Modify: `src/components/welcome/WelcomeNav.jsx`

**Interfaces:**
- Consumes: `HowToPlay` default export (Task 2).

- [ ] **Step 1:** In `src/pages/WelcomePage.jsx`, add the import (after line 4, `import FeatureHighlights from '../components/welcome/FeatureHighlights'`):

```js
import HowToPlay from '../components/welcome/HowToPlay'
```

Then insert the new section between Features and Stats (lines 19-20):

```jsx
      <div id="features"><FeatureHighlights /></div>
      <div id="how-to-play"><HowToPlay /></div>
      <div id="stats"><StatsSection stats={stats} /></div>
```

- [ ] **Step 2:** In `src/components/welcome/WelcomeNav.jsx`, add a nav link to the `NAV_LINKS` array (after `{ label: 'FEATURES', href: '#features' }`, line 6):

```js
  { label: 'HOW TO PLAY', href: '#how-to-play' },
```

- [ ] **Step 3:** `npm test` → PASS (no test asserts on `WelcomePage`'s section order or `WelcomeNav`'s link list today; this is a wiring-only change).

- [ ] **Step 4: Manual verification** — `npm run dev`, open `/`, open the hamburger menu, confirm "HOW TO PLAY" appears in the drawer between "FEATURES" and "HOW IT WORKS" and clicking it scrolls to the new section.

- [ ] **Step 5: Commit**

```bash
git add src/pages/WelcomePage.jsx src/components/welcome/WelcomeNav.jsx
git commit -m "feat(welcome): wire How to Play section into the page and nav"
```

---

## Self-Review

- **Spec coverage:**
  - "เพิ่มรายละเอียด Feature" → Task 1 (3 bullets per feature, grounded in real mechanics, up from 1 vague sentence).
  - "เพิ่ม guideline" → Task 2 (new How to Play section; confirmed with the user this means a gameplay how-to, not community rules).
  - "ทำให้ไม่ AI" (visual, per user's choice) / "แต่งให้สวย" → both tasks intentionally break from the page's repeated `grid sm:grid-cols-3` pattern (staggered cards in Task 1, a numbered timeline in Task 2) instead of adding a fourth identical grid section.
- **Placeholder scan:** No TBD/"add appropriate copy"/"similar to Task N" — all copy and code is final.
- **Type consistency:** Neither component takes or produces props consumed elsewhere, so there's no signature to drift. `WelcomePage.jsx`'s existing `<div id="...">` wrapper convention is matched exactly for the new `#how-to-play` anchor.

## Handoff

This plan is ready for Cursor to implement task-by-task (Tasks 1-3, in order). Once committed, Claude Code will run `npm test` and review the diff per the project's normal workflow. This plan intentionally does not touch `HowItWorks.jsx`, `NewsSection.jsx`, or the popup-to-full-screen bug — those are out of scope here; see `docs/superpowers/plans/2026-07-04-blog-post-fullscreen.md` for the Blog/News fix.
