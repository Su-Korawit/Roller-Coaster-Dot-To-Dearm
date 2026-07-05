# Popup Template Unification Implementation Plan

> **⏸ PAUSED (2026-07-05).** On hold by user request ("พัก Popup ก่อน"). Onboarding moved to full screen (`2026-07-05-onboarding-redesign.md`), so this popup-standardization work is deferred. Do NOT implement until the user resumes it.

> **For agentic workers (Cursor):** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Commit after each task.

**Goal:** Replace ~25 hand-rolled popup shells with one shared `<Popup>` component so every popup has consistent width/height, correct z-index (from tokens), and never overlaps the floating bottom nav.

**Architecture:** Introduce `src/components/ui/Popup.jsx` with two variants (`sheet` = bottom sheet, `center` = centered modal). It absorbs the current `BottomSheet.jsx` behavior and adds a `center` variant, standardized `size`, nav-safe bottom padding, and z-index from `src/constants/zIndex.js`. `BottomSheet.jsx` becomes a thin alias so existing imports keep working. Then migrate every popup, replacing hardcoded `z-*` classes with tokens.

**Tech Stack:** React 19, Vite, Tailwind v4 (no config; tokens in `src/index.css @theme`), Vitest + jsdom, `@testing-library/react`.

## Global Constraints

- Plain JS/JSX only — no TypeScript, no type annotations.
- Tailwind v4: any new token goes in `src/index.css @theme`. No `tailwind.config.js`.
- z-index values come from `src/constants/zIndex.js` (import + inline `style={{ zIndex }}`), NOT hardcoded `z-*` classes.
- Full slide-up panels (`ProfilePanel`, `TaskPanel`, `ChatPanel`, `NewsPanel`, `SocialPanel`, `SkillPanel` root) are OUT OF SCOPE — they are route-like views. Only align their root `z-` class to `Z_PANEL` if trivially adjacent; do not restructure them.

---

### Task 1: Add missing z-index tokens

**Files:**
- Modify: `src/constants/zIndex.js`

**Interfaces:**
- Produces: `Z_MODAL_ABOVE` (=90), `Z_CELEBRATION` (=9999) exported constants, alongside existing `Z_HUD/Z_NAV/Z_PANEL/Z_FAB/Z_SHEET/Z_MODAL/Z_TOAST`.

- [ ] **Step 1: Add the two constants** (append after `Z_TOAST`)

```js
export const Z_MODAL_ABOVE = 90   // modals that must sit above toasts (DailyLogin band)
export const Z_CELEBRATION = 9999 // full-screen celebration overlays (KawaiiMatch)
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/zIndex.js
git commit -m "feat(ui): add Z_MODAL_ABOVE and Z_CELEBRATION z-index tokens"
```

---

### Task 2: Create the shared Popup component

**Files:**
- Create: `src/components/ui/Popup.jsx`
- Test: `src/components/ui/Popup.test.jsx`

**Interfaces:**
- Consumes: `DragHandle` from `./DragHandle`; `Z_SHEET`, `Z_MODAL` from `../../constants/zIndex`.
- Produces: default export `Popup({ variant, size, maxHeight, backdrop, navSafe, zIndex, onClose, children })`.
  - `variant`: `"sheet"` (default) | `"center"`.
  - `size`: `"sm"|"md"|"lg"` → `max-w-sm|max-w-lg|max-w-2xl` (default `"md"`).
  - `maxHeight`: Tailwind class, default `"max-h-[90vh]"`.
  - `backdrop`: boolean, default `true`.
  - `navSafe`: boolean; default `true` for sheets, `false` for center. Adds bottom padding clearing the floating nav.
  - `zIndex`: number override; default `Z_SHEET` for sheet, `Z_MODAL` for center.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Popup from './Popup'

describe('Popup', () => {
  it('renders children', () => {
    render(<Popup onClose={() => {}}><p>hello</p></Popup>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<Popup onClose={onClose}><p>x</p></Popup>)
    fireEvent.click(container.querySelector('[aria-hidden="true"]'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when the card body is clicked', () => {
    const onClose = vi.fn()
    render(<Popup onClose={onClose}><p>body</p></Popup>)
    fireEvent.click(screen.getByText('body'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('applies the size max-width class', () => {
    render(<Popup size="lg" onClose={() => {}}><p>x</p></Popup>)
    expect(document.querySelector('.max-w-2xl')).toBeTruthy()
  })

  it('sheet variant adds nav-safe bottom padding by default', () => {
    render(<Popup variant="sheet" onClose={() => {}}><p>x</p></Popup>)
    expect(document.querySelector('.rounded-t-3xl')).toBeTruthy()
    expect(document.body.innerHTML).toContain('safe-area-inset-bottom')
  })
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- Popup`
Expected: FAIL (Popup not found).

- [ ] **Step 3: Implement `src/components/ui/Popup.jsx`**

```jsx
import DragHandle from './DragHandle'
import { Z_SHEET, Z_MODAL } from '../../constants/zIndex'

const SIZE_MAXW = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
const NAV_SAFE_PB = 'calc(env(safe-area-inset-bottom) + 96px)'

// Unified popup shell.
//   variant="sheet"  → bottom sheet (rounded top + drag handle), default
//   variant="center" → centered modal card
// size → standardized max-width. navSafe → bottom padding clearing the
// floating BottomNavBar. z-index comes from the semantic tokens.
export default function Popup({
  variant = 'sheet',
  size = 'md',
  maxHeight = 'max-h-[90vh]',
  backdrop = true,
  navSafe,
  zIndex,
  onClose,
  children,
}) {
  const isSheet = variant === 'sheet'
  const z = zIndex ?? (isSheet ? Z_SHEET : Z_MODAL)
  const clearNav = navSafe ?? isSheet
  const maxW = SIZE_MAXW[size] ?? SIZE_MAXW.md

  return (
    <div
      className={`absolute inset-0 flex flex-col ${
        isSheet ? 'justify-end' : 'items-center justify-center p-4'
      }`}
      style={{ zIndex: z }}
    >
      {backdrop && (
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`relative bg-white flex flex-col overflow-hidden w-full ${maxW} md:mx-auto ${maxHeight} ${
          isSheet ? 'rounded-t-3xl' : 'rounded-3xl'
        }`}
        style={clearNav ? { paddingBottom: NAV_SAFE_PB } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {isSheet && <DragHandle />}
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- Popup`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Popup.jsx src/components/ui/Popup.test.jsx
git commit -m "feat(ui): add shared Popup component (sheet + center variants)"
```

---

### Task 3: Make BottomSheet a thin alias over Popup

**Files:**
- Modify: `src/components/ui/BottomSheet.jsx`

**Interfaces:**
- Consumes: `Popup` from `./Popup`.
- Produces: same `BottomSheet({ onClose, maxHeight, backdrop, children })` signature as before (so existing callers are untouched).

- [ ] **Step 1: Replace the body with a Popup passthrough**

```jsx
import Popup from './Popup'

// Backward-compatible alias — existing callers keep working while new code
// uses <Popup variant="sheet"> directly.
export default function BottomSheet({ onClose, maxHeight = 'max-h-[85vh]', backdrop = true, children }) {
  return (
    <Popup variant="sheet" maxHeight={maxHeight} backdrop={backdrop} onClose={onClose}>
      {children}
    </Popup>
  )
}
```

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS (existing BottomSheet consumers unaffected).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/BottomSheet.jsx
git commit -m "refactor(ui): BottomSheet aliases shared Popup"
```

---

### Task 4: Migrate the sheet-style popups

Migrate each of these from its hand-rolled backdrop/container to `<Popup variant="sheet" size=… onClose=…>`. Pattern is identical per file: delete the outer `fixed/absolute inset-0` wrapper + backdrop `div` + inner `bg-white rounded-t-* max-h-*` container + hardcoded `z-*`, and wrap the existing inner content in `<Popup>`.

**Files (one commit each):**
- Modify: `src/components/CalendarPopup.jsx` (was `z-70`, `92vh` → `size="md"`)
- Modify: `src/components/SkillExecutionPopup.jsx` (was `z-80` → pass `zIndex={Z_TOAST}` only if it must stay above toasts; else default)
- Modify: `src/components/DailyLoginModal.jsx` (was `z-90` → `zIndex={Z_MODAL_ABOVE}`)
- Modify: `src/components/SettingsSheet.jsx` (was `z-[70]`, keep its slide-in; wrap content in `<Popup>`)
- Modify: `src/components/profile/JourneySheet.jsx`
- Modify: `src/components/UserProfileSheet.jsx`
- Modify: `src/components/PublicProfileSheet.jsx`
- Modify: `src/components/TaskPanel.jsx` (inner confirm sheets at lines ~78/141 only — NOT the panel root)
- Modify: `src/components/SkillPanel.jsx` (inline `rounded-t-4xl` sheet at ~499 only — NOT the panel root)
- Modify: `src/pages/HomePage.jsx` (tracklist popup ~347 — keep its `bottom-28` position by passing `backdrop={false}` and its own wrapper if the floating position matters; otherwise leave as-is and just swap the `z-30` to `Z_NAV`)

- [ ] **Step 1: Migrate `CalendarPopup.jsx`**

Replace its outer wrapper (`src/components/CalendarPopup.jsx:69-76`) and closing tags with:

```jsx
import Popup from './ui/Popup'
// …
return (
  <Popup variant="sheet" size="md" onClose={onClose}>
    {/* existing header + scroll body unchanged */}
  </Popup>
)
```

Remove the now-unused `DragHandle` import if the file imported it directly (Popup renders it). Remove any `paddingBottom:'80px'` on the scroll body (Popup's navSafe handles it).

- [ ] **Step 2: Run its tests + dev-check**

Run: `npm test -- Calendar`
Then `npm run dev` → open Calendar, confirm it renders, closes on backdrop, and content clears the bottom nav.

- [ ] **Step 3: Commit**

```bash
git add src/components/CalendarPopup.jsx
git commit -m "refactor(ui): migrate CalendarPopup to shared Popup"
```

- [ ] **Step 4: Repeat Steps 1-3 for each remaining sheet-style file above**

For each: import `Popup` (and any needed z-token), replace wrapper, drop the hardcoded `z-*`, run that file's tests, dev-check, commit individually (`refactor(ui): migrate <name> to shared Popup`).

---

### Task 5: Migrate the centered-modal popups

Same pattern with `<Popup variant="center" size=…>`.

**Files (one commit each):**
- Modify: `src/components/profile/InlineModal.jsx` (was `z-60`, `max-w-xs` → `size="sm"`)
- Modify: `src/components/roadmap/ImagePickerModal.jsx` (portal to body — keep the portal, replace inner overlay markup with `<Popup variant="center" size="sm">`)
- Modify: `src/components/welcome/DonateSection.jsx` (`z-50` modal)
- Modify: `src/components/admin/FolderPickerModal.jsx`
- Modify: `src/components/admin/StorageBrowser.jsx`
- Modify: `src/components/admin/MapDocsPanel.jsx`
- Modify: `src/components/admin/MapInfoScreen.jsx`
- Modify: `src/components/admin/MapConfigEditor.jsx`
- Modify: `src/components/admin/AssetsManagerSection.jsx` (two modals at ~300 and ~625)

- [ ] **Step 1:** For each file, import `Popup`, wrap the modal content in `<Popup variant="center" size=…>`, delete the hand-rolled `fixed inset-0 z-* flex items-center justify-center` + backdrop.
- [ ] **Step 2:** `npm test` for any co-located test; `npm run dev` (or admin route) to visually confirm.
- [ ] **Step 3:** Commit each individually (`refactor(ui): migrate <name> to shared Popup`).

---

### Task 6: Route the celebration overlay through the token

**Files:**
- Modify: `src/components/KawaiiMatchOverlay.jsx`

- [ ] **Step 1:** Replace `z-[9999]` / inline `zIndex:9998` with the token.

```jsx
import { Z_CELEBRATION } from '../constants/zIndex'
// on the root overlay:
style={{ zIndex: Z_CELEBRATION }}
```

(Keep its bespoke full-screen layout — do NOT force it into `<Popup>`; it is a celebration animation, not a dismissible modal.)

- [ ] **Step 2: Commit**

```bash
git add src/components/KawaiiMatchOverlay.jsx
git commit -m "refactor(ui): route KawaiiMatchOverlay through Z_CELEBRATION token"
```

---

### Task 7: Final verification sweep

- [ ] **Step 1:** `npm test` — full suite green.
- [ ] **Step 2:** `npm run dev` — open every migrated popup (Calendar, DailyLogin, Settings, Skill exec, profile sheets, admin modals). Confirm: consistent widths per size, none overlaps the floating nav, backdrop tap closes.
- [ ] **Step 3:** Grep for stragglers: `grep -rn "z-\[9999\]\|z-90\|z-80\|z-70\|z-60" src/components src/pages` — only the excluded full panels should remain; migrate any popup leftovers.
- [ ] **Step 4: Commit** any cleanup.

---

### Task 8: Normalize SettingsSheet to the standard popup size

`SettingsSheet.jsx` currently overrides the shell height (`<Popup variant="sheet" size="md" maxHeight="max-h-[92vh]">`), so it is taller than every other popup. Make it use the standard size.

**Files:**
- Modify: `src/components/SettingsSheet.jsx:160`

- [ ] **Step 1:** Drop the non-standard `maxHeight` override so it falls back to the shared default (`max-h-[90vh]`) and keep the standard `size="md"`:

```jsx
// before
<Popup variant="sheet" size="md" maxHeight="max-h-[92vh]" onClose={onClose}>
// after
<Popup variant="sheet" size="md" onClose={onClose}>
```

Also check the inner wrapper (`className="flex flex-col h-full …"` at ~line 162) still lays out correctly under the standard height — the sticky `SegmentedTabs` header + scroll body should be unaffected.

- [ ] **Step 2:** Run `npm test -- SettingsSheet` → PASS. `npm run dev` → open Settings; its width/height now matches Calendar/Mastery/other sheets exactly.

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsSheet.jsx
git commit -m "fix(ui): normalize SettingsSheet to standard popup size"
```

---

## Self-Review Checklist (run before handoff)

- Every popup in §0 of the master plan has a task above.
- SettingsSheet uses the standard `size="md"` + default height — no bespoke `maxHeight`.
- No `z-*` hardcoded class remains on a migrated popup (tokens instead).
- `BottomSheet` still exports the same signature (no caller broke).
- Nav-safe padding present on sheets; center modals unaffected.
