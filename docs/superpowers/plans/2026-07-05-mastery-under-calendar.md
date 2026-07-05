# Mastery Feature v2 (Round-Grouped Skills → Milestones/Resources/Community) Implementation Plan

> **⏸ PAUSED (2026-07-05).** This feature is presented in a popup, and popup work is on hold ("พัก Popup ก่อน"). Defer until the user resumes popup work — OR, if built sooner, render the Mastery entry as a **full-screen** overlay instead of `<Popup>` (same pattern as `2026-07-05-onboarding-redesign.md` Task 10b). Confirm with the user first.

> **For agentic workers (Cursor):** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Commit after each task. **Use the `frontend-design` skill.** **Depends on:** `2026-07-05-popup-template.md` (`<Popup>`), `2026-07-05-single-popup-manager.md`.

**Goal:** Turn the Mastery entry (icon under the Calendar icon on the home HUD — already wired) into a full feature: opening it shows **skills grouped by round (Portfolio / Admission) as small tappable cards**; tapping a card opens the track detail matching `D:\Ikkyusan\Desktop\redesign_mbti_univer_program_mastery\Program Compare List-4.png` — **Milestones** checklist, **Loot & Resources** (recommended courses/books/podcasts), and **Community Q&A**.

**KEEP pixel-font** for headings/labels (`pixel-font`), Thai body in `thai-font`. Adopt the reference layout, not its sans font.

**Architecture:** A `useMasteryStore` holds `tracks[]`, each `{ id, title, round, milestones[], resources[] }`. `MasteryPopup` is a two-view popup: an **entry** view (round sections of `MasteryTrackCard`s) and a **detail** view (`MasteryTrackDetail`) navigated by an active-track id. Detail composes `MilestoneChecklist`, `LootResources`, and `CommunityQA`. Community Q&A is backed by Firestore (heaviest piece — see Task 7, can be phased).

**Tech Stack:** React 19, Zustand 5 (persist), Firebase Firestore, Tailwind v4, lucide-react, Vitest + jsdom.

## Global Constraints

- Plain JS/JSX only. KEEP `pixel-font`.
- Mastery data in `useMasteryStore` (persist `rc-mastery-store`). Community posts via `src/lib/db.js` refs only — never inline `doc(db, …)`.
- Rounds are exactly two: `'portfolio'` and `'admission'`.
- Popup uses the shared `<Popup variant="sheet">` and the single-popup store (`id='mastery'`).

---

### Task 1: Mastery data model + store

**Files:**
- Create: `src/stores/useMasteryStore.js`
- Test: `src/stores/useMasteryStore.test.js`

**Interfaces:**
- Track: `{ id, title, round: 'portfolio'|'admission', milestones: [{ id, title, desc, done }], resources: [{ id, type: 'reading'|'podcast'|'course'|'book', title, url }] }`.
- Store state `{ tracks: [], activeTrackId: null }`; actions `setActiveTrack(id)`, `toggleMilestone(trackId, milestoneId)`, `addTrack(track)`, `resetMastery()`. Selector helper `trackProgress(track)` → `{ done, total }`.
- Persist key `rc-mastery-store`.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { useMasteryStore, trackProgress } from './useMasteryStore'

describe('useMasteryStore', () => {
  beforeEach(() => useMasteryStore.getState().resetMastery())
  it('toggles a milestone done', () => {
    useMasteryStore.getState().addTrack({ id: 't1', title: 'Hackathon', round: 'portfolio',
      milestones: [{ id: 'm1', title: 'Form a Squad', desc: '', done: false }], resources: [] })
    useMasteryStore.getState().toggleMilestone('t1', 'm1')
    expect(useMasteryStore.getState().tracks[0].milestones[0].done).toBe(true)
  })
  it('computes progress', () => {
    const track = { milestones: [{ done: true }, { done: false }, { done: true }] }
    expect(trackProgress(track)).toEqual({ done: 2, total: 3 })
  })
})
```

- [ ] **Step 2:** `npm test -- useMasteryStore` → FAIL.
- [ ] **Step 3: Implement** the store (persist) + `trackProgress` helper. Seed `tracks: []` (seeding real tracks can come from onboarding/AI later; empty is fine to start).
- [ ] **Step 4:** `npm test -- useMasteryStore` → PASS.
- [ ] **Step 5:** `git commit -m "feat(mastery): add useMasteryStore (tracks by round + milestones)"`

---

### Task 2: MilestoneChecklist component

**Files:**
- Create: `src/components/mastery/MilestoneChecklist.jsx`
- Test: `src/components/mastery/MilestoneChecklist.test.jsx`

**Interfaces:** `MilestoneChecklist({ trackId })` — reads the track from `useMasteryStore`, renders "Milestones" heading (`pixel-font`) + "N/N DONE" (from `trackProgress`), and a checkbox row per milestone (title + desc). Toggling calls `toggleMilestone`. Reference: `Program Compare List-4.png` milestones block.

- [ ] **Step 1: Failing test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import MilestoneChecklist from './MilestoneChecklist'
import { useMasteryStore } from '../../stores/useMasteryStore'

describe('MilestoneChecklist', () => {
  beforeEach(() => {
    useMasteryStore.getState().resetMastery()
    useMasteryStore.getState().addTrack({ id: 't1', title: 'Hackathon', round: 'portfolio',
      milestones: [{ id: 'm1', title: 'Form a Squad', desc: 'Find teammates', done: false }], resources: [] })
  })
  it('renders milestones + DONE count and toggles', () => {
    render(<MilestoneChecklist trackId="t1" />)
    expect(screen.getByText('Form a Squad')).toBeInTheDocument()
    expect(screen.getByText(/0\/1/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(useMasteryStore.getState().tracks[0].milestones[0].done).toBe(true)
  })
})
```

- [ ] **Step 2:** `npm test -- MilestoneChecklist` → FAIL.
- [ ] **Step 3: Implement** — heading + `N/N DONE` (pixel-font, brand-strong), checkbox rows (title `pixel-font`, desc `thai-font text-gray-400`), toggle via store.
- [ ] **Step 4:** `npm test -- MilestoneChecklist` → PASS.
- [ ] **Step 5:** `git commit -m "feat(mastery): MilestoneChecklist"`

---

### Task 3: LootResources (recommended courses/books/podcasts)

**Files:**
- Create: `src/components/mastery/LootResources.jsx`
- Test: `src/components/mastery/LootResources.test.jsx`

**Interfaces:** `LootResources({ trackId })` — reads the track's `resources[]`, renders a "Loot & Resources" heading + a row of colored cards per resource. Card shows the `type` label (READING/PODCAST/COURSE/BOOK), title, and a CTA ("EXPLORE →" / "LISTEN ▶") linking `url`. Reference: `Program Compare List-4.png` Loot & Resources.

- [ ] **Step 1: Failing test** — renders each resource title + type label.
- [ ] **Step 2:** `npm test -- LootResources` → FAIL.
- [ ] **Step 3: Implement** — map resources to cards; color by type (reading=green, podcast=orange, course=purple, book=blue); external link opens `url`. Empty state: a subtle "ยังไม่มีแหล่งเรียนรู้".
- [ ] **Step 4:** `npm test -- LootResources` → PASS.
- [ ] **Step 5:** `git commit -m "feat(mastery): LootResources cards"`

---

### Task 4: MasteryTrackCard + round sections (entry view)

**Files:**
- Create: `src/components/mastery/MasteryTrackCard.jsx`
- Create: `src/components/mastery/MasteryRoundSection.jsx`
- Test: `src/components/mastery/MasteryRoundSection.test.jsx`

**Interfaces:**
- `MasteryTrackCard({ track, onOpen })` — a **small** tappable card: track title (`pixel-font`) + a mini progress (`trackProgress`) + round tag; `onClick` → `onOpen(track.id)`.
- `MasteryRoundSection({ round, label, onOpen })` — reads `useMasteryStore.tracks` filtered by `round`, renders the `label` heading (e.g. "Portfolio" / "Admission") + a horizontal row / grid of `MasteryTrackCard`s.

- [ ] **Step 1: Failing test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MasteryRoundSection from './MasteryRoundSection'
import { useMasteryStore } from '../../stores/useMasteryStore'

describe('MasteryRoundSection', () => {
  beforeEach(() => {
    useMasteryStore.getState().resetMastery()
    useMasteryStore.getState().addTrack({ id: 't1', title: 'Hackathon', round: 'portfolio', milestones: [], resources: [] })
  })
  it('renders tracks for its round and opens one', () => {
    const onOpen = vi.fn()
    render(<MasteryRoundSection round="portfolio" label="Portfolio" onOpen={onOpen} />)
    fireEvent.click(screen.getByText('Hackathon'))
    expect(onOpen).toHaveBeenCalledWith('t1')
  })
})
```

- [ ] **Step 2:** `npm test -- MasteryRoundSection` → FAIL.
- [ ] **Step 3: Implement** both components. **Step 4:** `npm test -- MasteryRoundSection` → PASS. **Step 5:** `git commit -m "feat(mastery): round-grouped track cards (entry view)"`

---

### Task 5: MasteryTrackDetail (compose the List-4 screen)

**Files:**
- Create: `src/components/mastery/MasteryTrackDetail.jsx`
- Test: `src/components/mastery/MasteryTrackDetail.test.jsx`

**Interfaces:** `MasteryTrackDetail({ trackId, onBack })` — back arrow + track title (`pixel-font`, brand-strong), then `<MilestoneChecklist trackId>`, `<LootResources trackId>`, and `<CommunityQA trackId>` (Task 7; until then render a placeholder). Reference: `Program Compare List-4.png` full screen.

- [ ] **Step 1: Failing test** — renders track title + milestones heading; back arrow calls `onBack`.
- [ ] **Step 2:** `npm test -- MasteryTrackDetail` → FAIL.
- [ ] **Step 3: Implement** the composition (CommunityQA as a placeholder div initially). **Step 4:** PASS. **Step 5:** `git commit -m "feat(mastery): MasteryTrackDetail composition"`

---

### Task 6: Rebuild MasteryPopup (entry ⇄ detail)

**Files:**
- Modify: `src/components/MasteryPopup.jsx` (exists from the earlier plan — rebuild it)
- Modify/remove: `src/components/profile/MasteryTracks.jsx` if it duplicates this (the new components supersede it; keep Profile's mastery reading via `useMasteryStore` if Profile still shows mastery, else remove).
- Test: `src/components/MasteryPopup.test.jsx` (update)

**Interfaces:** `MasteryPopup({ onClose })` — `<Popup variant="sheet" size="md">` with a header "Mastery" (`pixel-font`). Local `view` state: entry (two `MasteryRoundSection`s: Portfolio + Admission) vs detail (`MasteryTrackDetail` when `activeTrackId` set). `onOpen(id)` → `setActiveTrack(id)` + show detail; detail `onBack` → clear + show entry.

- [ ] **Step 1:** Rebuild the component per the two-view model. **Step 2:** Update `MasteryPopup.test.jsx` (renders "Mastery" + both round sections; opening a card shows detail; back returns). **Step 3:** `npm test -- MasteryPopup` → PASS. Dev-check the full popup. **Step 4:** `git commit -m "feat(mastery): MasteryPopup entry (rounds) ⇄ track detail"`

---

### Task 7: Community Q&A (Firestore-backed) — HEAVIEST, can be phased

> **Note for the user/executor:** this task adds a real backend surface (Firestore collection + security rules). If you want to ship the rest first, implement `CommunityQA` as a read-only stub (Tasks 1–6 fully work without it) and do this task in a follow-up. Confirm scope before starting.

**Files:**
- Modify: `src/lib/db.js` (add refs: `masteryQuestions` collection + `masteryQuestion(id)` doc)
- Create: `src/components/mastery/CommunityQA.jsx`
- Modify: `firestore.rules` (allow authed read; create by author) + `test/rules` coverage
- Test: `src/components/mastery/CommunityQA.test.jsx`

**Interfaces:** `CommunityQA({ trackId })` — lists questions for the track (author, text, likes, reply count) + an "⊕ ASK A QUESTION" button that creates a question doc via the `db.js` ref. Reference: `Program Compare List-4.png` Community Q&A.

- [ ] **Step 1:** Add `db.js` refs (no inline `doc(db,…)` anywhere else). **Step 2:** Failing test for `CommunityQA` (renders list from a mocked hook; ASK button opens a composer). **Step 3:** Implement component + Firestore read/write via refs. **Step 4:** Add + test security rules (`npm run test:rules`). **Step 5:** Swap the placeholder in `MasteryTrackDetail` for `<CommunityQA trackId>`. **Step 6:** `npm test && npm run test:rules` → PASS. **Step 7:** `git commit -m "feat(mastery): Community Q&A backed by Firestore"`

---

### Task 8: Verify the Mastery entry point + full feature

**Files:**
- Verify: `src/pages/HomePage.jsx` — the Mastery icon under the Calendar icon opens `MasteryPopup` via the single-popup store (`id='mastery'`). (Already wired; confirm it matches `2026-07-05-single-popup-manager.md`.)

- [ ] **Step 1:** `npm test` (+ `npm run test:rules` if Task 7 done) → green.
- [ ] **Step 2:** `npm run dev` — Mastery icon under Calendar → popup opens (only one popup at a time) → Portfolio/Admission round sections → tap a track → Milestones toggle, Resources cards, Community (or stub) → back → close. Confirm pixel-font kept and layout matches `Program Compare List-4.png`.

## Self-Review Checklist

- Entry view groups tracks by exactly `portfolio` / `admission`; small cards navigate to detail.
- Detail matches List-4: Milestones (N/N DONE) + Loot & Resources + Community.
- `pixel-font` kept; single `useMasteryStore` source (no duplicated mastery state).
- Community Q&A uses `db.js` refs + rules only; clearly phaseable.
- Mastery icon opens via `usePopupStore` (`id='mastery'`), one popup at a time.
