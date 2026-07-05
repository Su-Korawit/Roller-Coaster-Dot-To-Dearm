# Single-Popup Manager (No Stacking) Implementation Plan

> **⏸ PAUSED (2026-07-05).** On hold by user request ("พัก Popup ก่อน"). Deferred along with the popup-template work. Do NOT implement until the user resumes it.

> **For agentic workers (Cursor):** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Commit after each task. **Depends on:** `2026-07-05-popup-template.md` (`<Popup>` exists).

**Goal:** Only ONE popup can be open at a time, app-wide. Opening any popup closes whatever popup was open — no stacking (the Settings-over-another-popup problem).

**Architecture:** Introduce `src/stores/usePopupStore.js` holding a single `activePopup` id (+ optional `payload`). All top-level app popups render gated on `activePopup === '<id>'`, and every trigger calls `open('<id>')` / `close()`. Because the store holds exactly one id, a second `open()` replaces the first — guaranteeing a single visible popup. Local `useState` booleans that currently drive popups (HomePage, ProfilePanel, SocialPanel) are replaced by the store.

**Tech Stack:** React 19, Zustand 5, Vitest + jsdom.

## Global Constraints

- Plain JS/JSX only.
- One source of truth: `usePopupStore.activePopup`. No component keeps its own boolean for a top-level popup after migration.
- Scope = **top-level app popups**: `calendar`, `mastery`, `roadmap`, `dailyLogin`, `trackList`, `settings`, `userProfile`, `publicProfile`. **Exempt:** modals that live *inside* a full-screen editor/route (RoadmapPage's `ImagePickerModal`/`VideoPickerModal`/`JourneyPickerModal`, in-panel confirm dialogs) — these are contextual sub-modals of an already-open surface, not competing home popups. Leave them local.
- OnboardingModal keeps its own first-visit gate (full-screen exclusive) — see Task 6 for the one hook it needs.

---

### Task 1: Create usePopupStore

**Files:**
- Create: `src/stores/usePopupStore.js`
- Test: `src/stores/usePopupStore.test.js`

**Interfaces:**
- Produces: `usePopupStore` with state `{ activePopup: null, payload: null }` and actions `open(id, payload = null)`, `close()`, `isOpen(id)` (selector helper).
- NOT persisted (popup state is ephemeral per session).

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { usePopupStore } from './usePopupStore'

describe('usePopupStore', () => {
  beforeEach(() => usePopupStore.getState().close())

  it('opens a popup by id', () => {
    usePopupStore.getState().open('calendar')
    expect(usePopupStore.getState().activePopup).toBe('calendar')
  })

  it('opening a second popup replaces the first (no stacking)', () => {
    usePopupStore.getState().open('calendar')
    usePopupStore.getState().open('mastery')
    expect(usePopupStore.getState().activePopup).toBe('mastery')
  })

  it('close() clears the active popup', () => {
    usePopupStore.getState().open('settings')
    usePopupStore.getState().close()
    expect(usePopupStore.getState().activePopup).toBeNull()
  })

  it('carries an optional payload', () => {
    usePopupStore.getState().open('userProfile', { uid: 'u9' })
    expect(usePopupStore.getState().payload).toEqual({ uid: 'u9' })
  })
})
```

- [ ] **Step 2: Run it, verify it fails** — `npm test -- usePopupStore` → FAIL.

- [ ] **Step 3: Implement `src/stores/usePopupStore.js`**

```js
import { create } from 'zustand'

// Single active popup, app-wide. Opening a new popup replaces the current one,
// so two popups can never stack. Ephemeral — not persisted.
export const usePopupStore = create((set) => ({
  activePopup: null,
  payload: null,
  open: (id, payload = null) => set({ activePopup: id, payload }),
  close: () => set({ activePopup: null, payload: null }),
}))
```

- [ ] **Step 4: Run tests, verify pass** — `npm test -- usePopupStore` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/usePopupStore.js src/stores/usePopupStore.test.js
git commit -m "feat(ui): add usePopupStore for single-active-popup policy"
```

---

### Task 2: Migrate HomePage popups to the store

**Files:**
- Modify: `src/pages/HomePage.jsx`

**Interfaces:**
- Removes local `showCalendar`, `showMastery`, `showRoadmap`, `showDailyModal`, `showTrackList` booleans. Uses `usePopupStore` instead.
- Popup ids: `'calendar'`, `'mastery'`, `'roadmap'`, `'dailyLogin'`, `'trackList'`.

- [ ] **Step 1:** Add the store + a derived helper near the top of `HomePage`:

```jsx
import { usePopupStore } from '../stores/usePopupStore'
// …
const activePopup = usePopupStore((s) => s.activePopup)
const openPopup = usePopupStore((s) => s.open)
const closePopup = usePopupStore((s) => s.close)
```

- [ ] **Step 2:** Replace each trigger + render. Examples:

Trigger (Calendar button, was `handlePlannerTransition` setting `setShowCalendar(true)`): keep the app-view transition but swap the boolean → `openPopup('calendar')`. Mastery button → `openPopup('mastery')`. Roadmap → `openPopup('roadmap')`. Tracklist toggle → `activePopup === 'trackList' ? closePopup() : openPopup('trackList')`.

Renders:

```jsx
{activePopup === 'calendar' && (
  <CalendarPopup onClose={() => { closePopup(); setActiveTab(APP_VIEWS.HOME) }} />
)}
{activePopup === 'mastery' && <MasteryPopup onClose={closePopup} />}
{activePopup === 'dailyLogin' && <DailyLoginModal onClose={closePopup} />}
{activePopup === 'roadmap' && (
  <div className="absolute inset-0 z-40 bg-white/20 backdrop-blur-[2px]">
    <Suspense fallback={null}><RoadmapPage onClose={closePopup} /></Suspense>
  </div>
)}
{activePopup === 'trackList' && ( /* existing tracklist markup, onClose→closePopup */ )}
```

Note: the daily mood check-in (auto-open on new day) now calls `openPopup('dailyLogin')` where it previously did `setShowDailyModal(true)`.

- [ ] **Step 3:** Grep to confirm no stray `setShow*` remains: `grep -n "setShowCalendar\|setShowMastery\|setShowRoadmap\|setShowDailyModal\|setShowTrackList" src/pages/HomePage.jsx` → no results.

- [ ] **Step 4:** `npm test` → PASS. `npm run dev` → open Calendar, then tap Mastery → Calendar closes, Mastery opens (no stack).

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.jsx
git commit -m "refactor(ui): HomePage popups use usePopupStore (single active)"
```

---

### Task 3: Migrate Settings + profile sheets to the store

**Files:**
- Modify: `src/components/ProfilePanel.jsx` (Settings trigger)
- Modify: `src/components/SocialPanel.jsx` (UserProfileSheet / PublicProfileSheet triggers)

**Interfaces:**
- Popup ids: `'settings'`, `'userProfile'` (payload `{ uid }`), `'publicProfile'` (payload `{ uid }`).

- [ ] **Step 1:** In `ProfilePanel.jsx`, remove `showSettingsSheet` local state (line 24). Replace trigger (line 63) with `openPopup('settings')` and render (line 134) with `activePopup === 'settings'`. Import `usePopupStore`.

```jsx
const activePopup = usePopupStore((s) => s.activePopup)
const openPopup = usePopupStore((s) => s.open)
const closePopup = usePopupStore((s) => s.close)
// trigger:
onClick={() => openPopup('settings')}
// render:
{activePopup === 'settings' && (
  <SettingsSheet onClose={closePopup} onProfileUpdated={/* unchanged */} />
)}
```

- [ ] **Step 2:** In `SocialPanel.jsx`, convert the user/public profile sheet toggles to `openPopup('userProfile', { uid })` / `openPopup('publicProfile', { uid })`, rendering gated on `activePopup === …` and reading `payload.uid` from the store.

- [ ] **Step 3:** `npm test` → PASS. Dev-check: open Settings from Profile, then trigger Calendar from elsewhere → Settings closes.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProfilePanel.jsx src/components/SocialPanel.jsx
git commit -m "refactor(ui): Settings + profile sheets use usePopupStore"
```

---

### Task 4: Enforce single-instance in the shared Popup (guard rail)

**Files:**
- Modify: `src/components/ui/Popup.jsx`
- Test: `src/components/ui/Popup.test.jsx`

**Interfaces:**
- Adds optional prop `id`. When provided, `<Popup>` registers itself as the active popup on mount and, if another popup was active, that owner's gate (store) already unmounted it — so this is a safety net + a single place to wire Esc-to-close later. Behavior with no `id` is unchanged.

- [ ] **Step 1: Add a test** — a Popup with `id` sets the store active on mount and clears on unmount:

```jsx
import { usePopupStore } from '../../stores/usePopupStore'
it('registers its id in usePopupStore while mounted', () => {
  const { unmount } = render(<Popup id="demo" onClose={() => {}}><p>x</p></Popup>)
  expect(usePopupStore.getState().activePopup).toBe('demo')
  unmount()
  expect(usePopupStore.getState().activePopup).toBeNull()
})
```

- [ ] **Step 2:** In `Popup.jsx`, add the effect (only when `id` given):

```jsx
import { useEffect } from 'react'
import { usePopupStore } from '../../stores/usePopupStore'
// inside component, before return:
useEffect(() => {
  if (!id) return
  usePopupStore.getState().open(id)
  return () => {
    if (usePopupStore.getState().activePopup === id) usePopupStore.getState().close()
  }
}, [id])
```

Pass `id` through the component signature. (Callers that already gate on the store may omit `id`; those that don't can pass it to opt into the guard.)

- [ ] **Step 3:** `npm test -- Popup` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Popup.jsx src/components/ui/Popup.test.jsx
git commit -m "feat(ui): Popup optional id registers single-active guard"
```

---

### Task 5: Verification sweep

- [ ] **Step 1:** `npm test` — full suite green.
- [ ] **Step 2:** `npm run dev` — matrix: from each popup, trigger every other popup; confirm the previous one always closes (never two visible). Check Settings↔Calendar↔Mastery↔Roadmap↔DailyLogin.
- [ ] **Step 3:** Confirm exempt sub-modals still work: open Roadmap → open its ImagePicker inside → picker shows over the roadmap editor (intended; not governed by the store).
- [ ] **Step 4:** Grep for leftover top-level popup booleans: `grep -rn "useState(false)" src/pages/HomePage.jsx src/components/ProfilePanel.jsx` — only non-popup toggles (e.g. `isPlaying`, `newsRead`) remain.

## Self-Review Checklist

- Exactly one `activePopup` governs every top-level popup; no two can render.
- Popup ids consistent everywhere: `calendar/mastery/roadmap/dailyLogin/trackList/settings/userProfile/publicProfile`.
- Exempt in-editor sub-modals untouched and still functional.
- No orphaned `setShow*` handlers remain.
