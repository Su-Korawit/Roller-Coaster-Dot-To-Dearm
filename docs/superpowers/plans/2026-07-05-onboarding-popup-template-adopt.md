# Onboarding Popup — Adopt Shared Template Implementation Plan

> **⛔ OBSOLETE / PAUSED (2026-07-05).** Superseded — onboarding is now FULL SCREEN, not a popup (`2026-07-05-onboarding-redesign.md` v4). Do NOT implement this plan.

> **For agentic workers (Cursor):** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Commit after each task. **Depends on:** `2026-07-05-popup-template.md` (the `<Popup>` component must exist first).

**Goal:** Make the already-existing onboarding modal obey the shared popup template instead of its bare `fixed inset-0 z-50` wrapper.

**Architecture:** Onboarding is already a popup (`src/components/onboarding/OnboardingModal.jsx`, 6 steps, self-gated on `!program`). This plan only re-homes its outer wrapper onto `<Popup>` for consistency. No flow/visual redesign — that belongs to the Journey-Path plan (`2026-07-05-journey-path-multi-plan.md`).

**Tech Stack:** React 19, Vite, Tailwind v4, Vitest + jsdom.

## Global Constraints

- Plain JS/JSX only.
- z-index from `src/constants/zIndex.js`.
- Do NOT reset `useSelectStore` on re-entry (current behavior: "Edit your path" shows existing selections, not blanks).

---

### Task 1: Wrap OnboardingModal body in Popup

**Files:**
- Modify: `src/components/onboarding/OnboardingModal.jsx`
- Test: `src/components/onboarding/OnboardingModal.test.jsx` (create if absent)

**Interfaces:**
- Consumes: `Popup` from `../ui/Popup`.
- Behavior unchanged: `visible = forceOpen || (!!user && !program)`; renders `STEP_COMPONENTS[step]` with `onNext`/`onBack`.

**Design note:** Onboarding is a full-viewport wizard, not a small card. Use `<Popup variant="center" size="lg" maxHeight="max-h-[100vh]" backdrop={false} navSafe={false}>` so the step components keep owning their own full-height layout, while still centralizing z-index and container conventions. The individual `StepScreen`/`OnboardingIntro` layouts remain unchanged.

- [ ] **Step 1: Write/adjust the test** — modal still gates correctly

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import OnboardingModal from './OnboardingModal'
import { useAuthStore } from '../../stores/useAuthStore'
import { useSelectStore } from '../../stores/useSelectStore'

describe('OnboardingModal gating', () => {
  beforeEach(() => {
    useSelectStore.setState({ program: null })
    useAuthStore.setState({ user: { uid: 'u1' } })
  })

  it('is visible for a signed-in user with no program', () => {
    render(<OnboardingModal />)
    // Intro step marketing copy renders
    expect(screen.getByText(/Ready to use|Why/i)).toBeInTheDocument()
  })

  it('is hidden once a program exists and not forced open', () => {
    useSelectStore.setState({ program: 'prog-1' })
    const { container } = render(<OnboardingModal />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run it against the current code, verify it passes** (gating already works)

Run: `npm test -- OnboardingModal`
Expected: PASS (this locks current behavior before refactor).

- [ ] **Step 3: Swap the wrapper**

Change the return in `src/components/onboarding/OnboardingModal.jsx:53-57` from:

```jsx
return (
  <div className="fixed inset-0 z-50">
    <StepComponent onNext={handleNext} onBack={handleBack} />
  </div>
)
```

to:

```jsx
import Popup from '../ui/Popup'
// …
return (
  <Popup variant="center" size="lg" maxHeight="max-h-[100vh]" backdrop={false} navSafe={false} onClose={close}>
    <StepComponent onNext={handleNext} onBack={handleBack} />
  </Popup>
)
```

- [ ] **Step 4: Run tests, verify still green**

Run: `npm test -- OnboardingModal onboarding`
Expected: PASS (gating + step tests unchanged).

- [ ] **Step 5: Dev-check**

Run: `npm run dev` → sign in as a user with no program → onboarding fills the screen as before → "Edit your path" (ProfilePanel) reopens it with existing selections intact.

- [ ] **Step 6: Commit**

```bash
git add src/components/onboarding/OnboardingModal.jsx src/components/onboarding/OnboardingModal.test.jsx
git commit -m "refactor(onboarding): mount OnboardingModal on shared Popup"
```

## Self-Review Checklist

- Gating (`forceOpen || (!!user && !program)`) unchanged.
- Selections NOT reset on re-entry.
- No visual/flow change to any step component.
