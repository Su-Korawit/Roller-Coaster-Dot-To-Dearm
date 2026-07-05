# Onboarding Redesign v4 (Full Screen, New Flow, Nav Removed) Implementation Plan

> **For agentic workers (Cursor):** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Commit after each task. **Use the `frontend-design` skill.** **Depends on:** `2026-07-05-journey-path-multi-plan.md` (data/store/flow) only.
>
> **⏸ Popup work is PAUSED.** The onboarding is now **FULL SCREEN**, not a popup. Do NOT depend on or wait for `2026-07-05-popup-template.md` / `2026-07-05-single-popup-manager.md` / `2026-07-05-onboarding-popup-template-adopt.md` — those are on hold. This plan is self-contained.

**Goal:** Rebuild the onboarding as a **full-screen** flow with a new design (discard the original visuals), following the mockups in `D:\Ikkyusan\Desktop\redesign_mbti_univer_program_mastery`. **New flow: MBTI → Plan List (ranked) → University → Program detail.** Career and Mastery are removed from onboarding (Mastery lives under the Calendar icon — see `2026-07-05-mastery-under-calendar.md`).

**FULL SCREEN (v4 change):** The onboarding renders as a full-viewport overlay — `fixed inset-0` filling the whole screen — NOT a `<Popup>` / bottom-sheet / centered card. Each step's content fills the screen; the sticky Back/Next footer sits at the bottom of the viewport.

**NAV REMOVED:** The onboarding must have **no nav chrome**:
- **No header nav** — remove the pink "Roller Coaster" bar + kebab (3-dot) menu on top.
- **No WizardStepper** — remove the step-dots / path indicator (Career→Mastery→University→Program dots + the "4/5" step-progress ring).
- **Keep** the new flow path and a simple **back button** ("ย้อนกลับ") + "ถัดไป" (next).
- The left-hand icon column is **out of scope** — do not touch it.

**KEEP pixel-font.** The retro/pixel identity stays — adopt the reference *layout/structure/components* (rounded cards, progress ring, purple CTAs, searchable lists) but render headings/labels in the existing `pixel-font` class and Thai body copy in `thai-font`. Do NOT switch to a plain sans font.

**Architecture:** Two shared primitives (`ProgressRing`, `SelectableRow`) + a simplified `StepScreen` (title + search + Back/Next only, **no stepper**) drive every screen. Screens: `OnboardingIntro` (short welcome), `MbtiStep` (card grid), `PlanList` (ranked, drag-reorder, add/delete), `UniversityStep` (restyled logo grid), `ProgramDetail` (admission rounds). The data/store/flow wiring lives in the journey-path plan; this plan is the visual/interaction layer.

**Note on `ProgressRing`:** it is used ONLY for the Plan List's **plan-count** indicator (e.g. "4/14 — เพิ่มได้อีก N โปรแกรม"), NOT as a step-progress ring. The per-step stepper/ring is removed (see Task 3).

**Tech Stack:** React 19, Tailwind v4 (`@theme` in `src/index.css`), `@hello-pangea/dnd` (already used for drag), lucide-react, Vitest + jsdom, `@testing-library/react`.

## Global Constraints

- Plain JS/JSX only. Tailwind v4 — new tokens in `src/index.css @theme`, no config file.
- KEEP `pixel-font` for headings/labels and `thai-font` for Thai body. Purple CTA = `bg-brand-strong`.
- Brand tokens exist: `--color-brand:#a78bda`, `--color-brand-strong:#7c3aed`, `--color-brand-soft:#f0eeff`, `--color-ink:#1a1035`.
- Reference mockups (authoritative for layout):
  - `Study Stream Selector.png` → searchable radio-row select list.
  - `Program Compare List.png` → Plan List: search + progress ring ("เพิ่มได้อีก N โปรแกรม" + "4/14") + plan cards (uni logo + faculty + Portfolio/Quota round tags + trash) + "+" FAB.
  - `Screenshot 2026-07-04 175736.jpg` → Program detail: breadcrumb + "ADMISSION ROUNDS" (Round card: SELECTED / locked / criteria + weighted % bars) + "✓ เลือกแล้ว".
- Do NOT change any store/sync/Firestore shape here — the journey-path plan owns that. This plan renders against those interfaces.

---

### Task 1: ProgressRing primitive

**Files:**
- Create: `src/components/ui/ProgressRing.jsx`
- Test: `src/components/ui/ProgressRing.test.jsx`

**Interfaces:** `ProgressRing({ value, total, size = 56, stroke = 6, label })` — SVG ring filling `value/total`, centered `pixel-font` label (default `${value}/${total}`).

- [ ] **Step 1: Failing test**

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ProgressRing from './ProgressRing'

describe('ProgressRing', () => {
  it('renders value/total label', () => {
    render(<ProgressRing value={4} total={14} />)
    expect(screen.getByText('4/14')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2:** `npm test -- ProgressRing` → FAIL.
- [ ] **Step 3: Implement**

```jsx
export default function ProgressRing({ value, total, size = 56, stroke = 6, label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(value / total, 1) : 0
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece9fb" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#7c3aed" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <span className="absolute pixel-font text-[9px] text-brand-strong">{label ?? `${value}/${total}`}</span>
    </div>
  )
}
```

- [ ] **Step 4:** `npm test -- ProgressRing` → PASS.
- [ ] **Step 5:** `git commit -m "feat(ui): add ProgressRing primitive"`

---

### Task 2: SelectableRow primitive

**Files:**
- Create: `src/components/ui/SelectableRow.jsx`
- Test: `src/components/ui/SelectableRow.test.jsx`

**Interfaces:** `SelectableRow({ title, subtitle, leading, tags, selected, onClick, trailing })` — tappable row: `leading` node (logo/icon) + title (pixel-font) + subtitle (thai-font) + optional `tags` (round badges) + radio/`trailing`. Reference: `Study Stream Selector.png`.

- [ ] **Step 1: Failing test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SelectableRow from './SelectableRow'

describe('SelectableRow', () => {
  it('renders title and fires onClick', () => {
    const onClick = vi.fn()
    render(<SelectableRow title="สายสามัญ" onClick={onClick} />)
    fireEvent.click(screen.getByText('สายสามัญ'))
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('marks radio checked when selected', () => {
    render(<SelectableRow title="x" selected onClick={() => {}} />)
    expect(screen.getByRole('radio')).toHaveAttribute('aria-checked', 'true')
  })
})
```

- [ ] **Step 2:** `npm test -- SelectableRow` → FAIL.
- [ ] **Step 3: Implement** — full-width `<button>`, `border-brand-strong bg-brand-soft` when selected, right-side radio dot (`role="radio" aria-checked`). Title `pixel-font text-[11px] text-ink`, subtitle `thai-font text-xs text-gray-400`. `trailing` overrides the radio when provided (used for trash).
- [ ] **Step 4:** `npm test -- SelectableRow` → PASS.
- [ ] **Step 5:** `git commit -m "feat(ui): add SelectableRow primitive"`

---

### Task 3: Simplify StepScreen — REMOVE the WizardStepper (dots + step ring), keep Back/Next

**Files:**
- Modify: `src/components/ui/StepScreen.jsx`
- Modify: `src/components/ui/WizardStepper.jsx` (remove usage; delete the file if nothing else imports it — grep first)
- Test: `src/components/ui/StepScreen.test.jsx` (update)

**Interfaces:** keep existing props; ADD `onBack`. **Remove** the `WizardStepper` dots and any per-step progress ring from the header (the Career→Mastery→University→Program path + "4/5" ring). Header = just the title (`pixel-font`) + optional search pill. Sticky footer: "ย้อนกลับ" (ghost, calls `onBack`) + "ถัดไป" (`bg-brand-strong text-white rounded-2xl`, calls `onNext`, `disabled={nextDisabled}`).

- [ ] **Step 1:** Remove `WizardStepper` from `StepScreen` and drop the `step`/`progress` props it fed. Keep title + search + the two-button sticky footer.
- [ ] **Step 2:** Update `StepScreen.test.jsx` — assert NO stepper dots render, Back calls `onBack`, Next calls `onNext`.
- [ ] **Step 3:** `npm test -- StepScreen` → PASS. Dev-check: steps show no dots/step-ring, only Back/Next.
- [ ] **Step 4:** `git commit -m "feat(onboarding): remove WizardStepper (dots/step-ring), keep Back/Next"`

---

### Task 4: Redesign OnboardingIntro (short welcome)

**Files:**
- Modify: `src/components/onboarding/OnboardingIntro.jsx`
- Test: update its test.

**Interfaces:** `OnboardingIntro({ onNext })`. Remove the WhyPage marketing (damage-stats grid, `eachPageAssets/why/*`). New: one clean welcome screen — logo/illustration + `pixel-font` heading + short thai subtext + `bg-brand-strong` CTA "เริ่มเลย" → `onNext`.

- [ ] **Step 1:** Rewrite body. **Step 2:** Update test (CTA calls `onNext`; old copy assertions removed). **Step 3:** `npm test -- OnboardingIntro` → PASS. **Step 4:** `git commit -m "feat(onboarding): redesign intro as short welcome"`

---

### Task 5: Redesign MbtiStep as a card grid

**Files:**
- Modify: `src/components/onboarding/MbtiStep.jsx`
- Test: update.

**Interfaces:** unchanged commit logic. Replace Prev/Select/Next carousel with a responsive **grid** of `mbtiCharacters` (2 cols mobile / 3–4 md). Card = `CharacterSprite` + code (`pixel-font`) + name; selected card → brand ring; selected `mbtiDescriptions` shown below; keep personality.co link. Advance via StepScreen "ถัดไป" (`nextDisabled={!mbti}`).

- [ ] **Step 1:** Rewrite render as grid (reuse `MBTIBadge`/`CharacterSprite`). **Step 2:** Update test (grid renders all; tap selects; next enabled after select). **Step 3:** `npm test -- MbtiStep` → PASS. **Step 4:** `git commit -m "feat(onboarding): redesign MBTI step as card grid"`

---

### Task 6: Build the Plan List screen (ranked, drag-reorder)

**Files:**
- Create/Modify: `src/components/onboarding/PlanList.jsx` (replaces the old `PlansHub`; if `PlansHub.jsx` exists from the journey-path plan, rename/rebuild it as `PlanList`)
- Test: `src/components/onboarding/PlanList.test.jsx`

**Interfaces:**
- Consumes: `usePlansStore` (`plans` in rank order, `addPlan`, `removePlan`, `setActivePlan`, `reorderPlans(fromIndex, toIndex)` — added in the journey-path plan); `universities`/`programs` from `../../data/onboardingData` for names; `tcasLogoUrl` for logos; `ProgramRoundBadge` for round tags.
- Props: `onEditPlan(planId)`, `onNext`, `onBack`.
- Layout (reference `Program Compare List.png`): header "เลือกสายการเรียน" (`pixel-font`) + search pill; a purple progress card (`ProgressRing value={plans.length} total={MAX_PLANS}` + "เพิ่มได้อีก {MAX_PLANS - plans.length} โปรแกรม"); a **drag-reorderable** list of plan cards (rank = list order) via `@hello-pangea/dnd`; each card = uni logo + faculty/program name + round tags + trash; a bottom-right "+" FAB (`bg-brand-strong rounded-full w-14 h-14`) that `addPlan()` then `onEditPlan(id)`.

- [ ] **Step 1: Failing test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlanList from './PlanList'
import { usePlansStore } from '../../stores/usePlansStore'

describe('PlanList', () => {
  beforeEach(() => usePlansStore.getState().resetPlans())

  it('shows progress ring and add FAB', () => {
    render(<PlanList onEditPlan={() => {}} onNext={() => {}} onBack={() => {}} />)
    expect(screen.getByRole('button', { name: /add|เพิ่ม|\+/i })).toBeInTheDocument()
  })
  it('adds a plan and opens its editor', () => {
    const onEditPlan = vi.fn()
    render(<PlanList onEditPlan={onEditPlan} onNext={() => {}} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /add|เพิ่ม|\+/i }))
    expect(usePlansStore.getState().plans).toHaveLength(1)
    expect(onEditPlan).toHaveBeenCalledWith(usePlansStore.getState().plans[0].id)
  })
  it('deletes a plan', () => {
    usePlansStore.getState().addPlan()
    render(<PlanList onEditPlan={() => {}} onNext={() => {}} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /delete|ลบ|remove/i }))
    expect(usePlansStore.getState().plans).toHaveLength(0)
  })
})
```

- [ ] **Step 2:** `npm test -- PlanList` → FAIL.
- [ ] **Step 3: Implement `PlanList.jsx`** — wrap the list in `DragDropContext`/`Droppable`/`Draggable` (pattern already used in `JourneyManager`); `onDragEnd` → `reorderPlans(source.index, destination.index)`. Progress card + FAB + trash as specified. `pixel-font` headings, `thai-font` Thai copy.
- [ ] **Step 4:** `npm test -- PlanList` → PASS. Dev-check: add plans, drag to reorder, delete.
- [ ] **Step 5:** `git commit -m "feat(onboarding): Plan List with ranked drag-reorder + add/delete"`

---

### Task 7: Restyle UniversityStep

**Files:**
- Modify: `src/components/onboarding/UniversityStep.jsx`

**Interfaces:** unchanged data (`useTcasUniversities`) + per-plan commit (journey-path plan). Restyle the logo grid to rounded selected-ring cards; keep the 4-stage logo fallback chain and search. Header `pixel-font`.

- [ ] **Step 1:** Restyle. **Step 2:** `npm test -- UniversityStep` → PASS. Dev-check. **Step 3:** `git commit -m "feat(onboarding): restyle University step"`

---

### Task 8: Build ProgramDetail (admission rounds)

**Files:**
- Create: `src/components/onboarding/ProgramDetail.jsx`
- Test: `src/components/onboarding/ProgramDetail.test.jsx`

**Interfaces:**
- Consumes: `useTcasRounds` (existing) for the plan's program; `ProgramRoundBadge`.
- Props: `programId`, `onBack`, `onConfirm`.
- Layout (reference `Screenshot 2026-07-04 175736.jpg`): breadcrumb (uni › program, `pixel-font` small), program title, "ADMISSION ROUNDS" heading, one card per round:
  - Open round → header ("Round 1: Portfolio") + optional SELECTED badge + stat row (รับจำนวน / เกรดขั้นต่ำ / คะแนนสอบ).
  - Locked round → dimmed + lock icon + "ยังไม่เปิดรับสมัคร".
  - Round with weighted criteria → labeled rows with a horizontal % bar each (TGAT 20%, TPAT3 30%, …).
  - Sticky footer: "ย้อนกลับ" + "✓ เลือกแล้ว" (`bg-brand-strong`).

- [ ] **Step 1: Failing test**

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProgramDetail from './ProgramDetail'

vi.mock('../../hooks/useMytcas', () => ({
  useTcasRounds: () => ({ data: [{ id: 'r1', name: 'Portfolio', quota: 40, minGpa: 3.5, locked: false }], loading: false }),
  tcasLogoUrl: () => '',
}))

describe('ProgramDetail', () => {
  it('renders ADMISSION ROUNDS and a round', () => {
    render(<ProgramDetail programId="p1" onBack={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(/ADMISSION ROUNDS/i)).toBeInTheDocument()
    expect(screen.getByText(/Portfolio/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2:** `npm test -- ProgramDetail` → FAIL.
- [ ] **Step 3: Implement** the rounds UI (open/locked/criteria-bar variants) + sticky footer; `onConfirm` commits the program to the active plan (via the commit path from the journey-path plan).
- [ ] **Step 4:** Wire into the per-plan sub-flow: University → **ProgramDetail** → confirm → back to Plan List.
- [ ] **Step 5:** `npm test -- ProgramDetail` → PASS. Dev-check.
- [ ] **Step 6:** `git commit -m "feat(onboarding): Program detail admission-rounds screen"`

---

### Task 9: Remove the "Roller Coaster" header nav + kebab from the onboarding popup

**Files:**
- Modify: the header component that renders the pink "Roller Coaster" bar + kebab (3-dot) menu on top of the onboarding/journey popup. Locate it — likely `src/components/ProfilePanel.jsx` / `src/components/profile/*` (the portfolio/roadmap card header) or `src/components/ui/PanelHeader.jsx`. Grep for the roadmap title / kebab menu that appears above the onboarding step content.

**Interfaces:** removal only. The onboarding popup should render just the step content (plus the popup's own close affordance from `<Popup>`), with NO "Roller Coaster" header bar and NO kebab menu on top.

- [ ] **Step 1:** Grep to find the header: `grep -rn "Roller Coaster\|MoreVertical\|kebab\|EllipsisVertical" src/components`. Identify which component draws the pink bar + 3-dot menu shown above the onboarding steps.
- [ ] **Step 2:** Remove that header bar from the onboarding popup surface (do NOT render it when the popup shows an onboarding step). If the same header is legitimately used elsewhere (e.g. a real roadmap card), leave those usages intact — only remove it from the onboarding path.
- [ ] **Step 3:** `npm test` → PASS. Dev-check: onboarding popup opens with step content at the top, no "Roller Coaster" bar, no kebab.
- [ ] **Step 4:** `git commit -m "feat(onboarding): remove Roller Coaster header nav + kebab from onboarding popup"`

---

### Task 10: Remove Career + Mastery from the onboarding flow

**Files:**
- Modify: `src/components/onboarding/OnboardingModal.jsx`
- Delete (or leave unused, see note): `src/components/onboarding/CareerStep.jsx`, `src/components/onboarding/MasteryStep.jsx`

**Interfaces:** new step machine (wired in the journey-path plan): Intro → MBTI → Plan List → (per plan: University → ProgramDetail). No Career, no Mastery step.

- [ ] **Step 1:** Remove `CareerStep`/`MasteryStep` from the step sequence in `OnboardingModal.jsx`. **Note:** the `profile.career`/`masteryTrack` fields stay in `db.js` for back-compat (downstream readers), they are simply no longer collected here. Mastery is now its own feature (see `2026-07-05-mastery-under-calendar.md`).
- [ ] **Step 2:** Remove the now-dead imports; delete `CareerStep.jsx`/`MasteryStep.jsx` + their tests if nothing else imports them (grep first).
- [ ] **Step 3:** `npm test` → PASS. Dev-check the flow has exactly MBTI → Plan List → University → Program.
- [ ] **Step 4:** `git commit -m "feat(onboarding): remove Career + Mastery steps from flow"`

---

### Task 10b: Full-screen shell for OnboardingModal (NOT a popup)

**Files:**
- Modify: `src/components/onboarding/OnboardingModal.jsx`

**Interfaces:** the modal wrapper is a full-viewport overlay, not `<Popup>`.

- [ ] **Step 1:** Wrap the active step in a full-screen overlay:

```jsx
return (
  <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
    {/* active step fills the screen; step owns its own scroll + sticky Back/Next footer */}
    {renderStep()}
  </div>
)
```

Do NOT import or render `<Popup>` here. Remove any `<Popup>`/bottom-sheet wrapper the onboarding previously used. The step machine (MBTI → Plan List → University → Program) from `2026-07-05-journey-path-multi-plan.md` Task 5 stays; only the outer shell changes to full screen.

- [ ] **Step 2:** `npm test -- OnboardingModal` → PASS. Dev-check: onboarding fills the entire screen (no card, no backdrop gap, no bottom-sheet).
- [ ] **Step 3:** `git commit -m "feat(onboarding): full-screen shell (drop popup wrapper)"`

---

### Task 11: Full-flow verification

- [ ] **Step 1:** `npm test` — green (old carousel/SelectCard/marketing assertions removed).
- [ ] **Step 2:** `npm run dev` — walk: Intro → MBTI grid → Plan List (add 2 plans, drag to reorder, delete) → University → Program detail rounds → back to list → finish. Confirm pixel-font retained, each screen matches its reference mockup, and no original-design remnant remains.
- [ ] **Step 3:** Grep dead code: `grep -rn "SelectCard\|eachPageAssets/why\|CareerStep\|MasteryStep" src/components/onboarding` — remove leftovers.

## Self-Review Checklist

- Flow is exactly MBTI → Plan List → University → Program (no Career/Mastery step).
- NAV REMOVED: no WizardStepper dots/step-ring, no "Roller Coaster" header + kebab on the onboarding popup. Back/Next buttons kept.
- `pixel-font` kept on headings/labels; layout matches reference.
- Plans are ranked + drag-reorderable (Task 6 uses `reorderPlans`).
- `ProgressRing` used only for Plan List plan-count; `SelectableRow` reused (DRY).
- Left icon column untouched; no store/Firestore shape changed here.
