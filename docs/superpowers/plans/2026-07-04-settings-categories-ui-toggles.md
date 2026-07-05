# Settings Categories + UI Visibility Toggles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Settings sheet into tabbed categories (Profile / Privacy / Interface / General) and add a new Interface tab where the player can show/hide individual game-HUD elements (Hotbar, shortcut FABs, News button, Music pill, Contact-developer FAB).

**Architecture:** Reuse the existing `SegmentedTabs` component (already used by `SocialPanel`) to gate the three existing `SettingsSheet` sections behind tab state, and add a fourth "Interface" section built from the same `Toggle` component the Privacy section already uses. Visibility state lives in `useUserStore` (Zustand, `persist` middleware → localStorage) next to the existing `aiLanguage`/`controlMode` device prefs — no Firestore involved, this is a local display preference, not profile data. `GameCanvas` and `HomePage` read the new `uiVisibility` map to conditionally render each HUD piece.

**Tech Stack:** React 19 (plain JS/JSX, no TypeScript), Zustand 5 (`persist` middleware), Tailwind v4, Vitest + @testing-library/react + jsdom.

## Global Constraints

- No TypeScript — plain JS + JSX only (CLAUDE.md).
- Tailwind v4 tokens only, no new config files (CLAUDE.md).
- These are local device display prefs, not profile data — do **not** route them through Firestore or `syncManager` (that rule only applies to persisted user/profile writes).
- **Hard exclusion:** the avatar/stats pill (`HomePage.jsx` top header) and `BottomNavBar` must NEVER become hideable. The avatar pill is the only path to Settings (`HomePage` → avatar → `ProfilePanel` gear icon → `SettingsSheet`); hiding it would lock the player out with no way back in.
- Match existing code style exactly: Thai UI copy, `pixel-font`/`thai-font` class conventions, existing `Toggle`/`SegmentedTabs` component APIs — do not modify those two shared components.

---

### Task 1: `uiVisibility` state in `useUserStore`

**Files:**
- Modify: `src/stores/useUserStore.js`
- Test: `src/stores/useUserStore.test.js`

**Interfaces:**
- Consumes: nothing new (existing `create`/`persist` from `zustand`/`zustand/middleware`)
- Produces: `useUserStore.getState().uiVisibility` → `{ hotbar: boolean, shortcuts: boolean, newsButton: boolean, musicPill: boolean, contactFab: boolean }` (all default `true`); `useUserStore.getState().setUiVisibility(key, value)` → `(string, boolean) => void`, merges one key into `uiVisibility`. Tasks 2–4 read/write through these two names.

- [ ] **Step 1: Write the failing tests**

Append to `src/stores/useUserStore.test.js`:

```js
describe('useUserStore uiVisibility', () => {
  beforeEach(() => {
    useUserStore.setState({
      uiVisibility: { hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true },
    })
  })

  it('defaults every HUD element to visible', () => {
    expect(useUserStore.getState().uiVisibility).toEqual({
      hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true,
    })
  })

  it('setUiVisibility flips a single key without touching the others', () => {
    useUserStore.getState().setUiVisibility('hotbar', false)
    const { uiVisibility } = useUserStore.getState()
    expect(uiVisibility.hotbar).toBe(false)
    expect(uiVisibility.shortcuts).toBe(true)
  })

  it('resetUser restores all uiVisibility keys to true', () => {
    useUserStore.getState().setUiVisibility('hotbar', false)
    useUserStore.getState().setUiVisibility('newsButton', false)
    useUserStore.getState().resetUser()
    expect(useUserStore.getState().uiVisibility).toEqual({
      hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true,
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- useUserStore`
Expected: FAIL — `uiVisibility` is `undefined`, `setUiVisibility` is not a function.

- [ ] **Step 3: Implement `uiVisibility` in the store**

In `src/stores/useUserStore.js`, add the default state next to the other device prefs (after `controlMode: 'joystick',` on line 31):

```js
      aiLanguage: 'Thai',
      controlMode: 'joystick',
      uiVisibility: { hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true },
      profilePhotoURL: null,
```

Add the setter next to `setControlMode` (after line 39):

```js
      setAiLanguage: (lang) => set({ aiLanguage: lang }),
      setControlMode: (mode) => set({ controlMode: mode }),
      setUiVisibility: (key, value) =>
        set((state) => ({ uiVisibility: { ...state.uiVisibility, [key]: value } })),
```

Add the reset default inside `resetUser` (after `controlMode: 'joystick',` in the `resetUser` object, currently line 147):

```js
          aiLanguage: 'Thai',
          controlMode: 'joystick',
          uiVisibility: { hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true },
          profilePhotoURL: null,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- useUserStore`
Expected: PASS (all `useUserStore` describe blocks green, including the pre-existing `controlMode` block).

- [ ] **Step 5: Commit**

```bash
git add src/stores/useUserStore.js src/stores/useUserStore.test.js
git commit -m "feat: add uiVisibility prefs to useUserStore"
```

---

### Task 2: Segmented-tab layout + Interface tab in `SettingsSheet`

**Files:**
- Modify: `src/components/SettingsSheet.jsx`
- Test: `src/components/SettingsSheet.test.jsx` (new)

**Interfaces:**
- Consumes: `useUserStore.getState().uiVisibility` / `setUiVisibility(key, value)` from Task 1; `SegmentedTabs` from `src/components/ui/SegmentedTabs.jsx` (`tabs: [{id, label}]`, `activeId`, `onChange`); `Toggle` from `src/components/ui/Toggle.jsx` (`checked`, `onChange`, `label`) — both unmodified, existing components.
- Produces: no new exports — `SettingsSheet` keeps its existing `{ onClose, onProfileUpdated }` prop signature.

- [ ] **Step 1: Write the failing test**

Create `src/components/SettingsSheet.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useUserStore } from '../stores/useUserStore'

let authState
vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'u1', displayName: 'Test User' } } }))
vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  updateDoc: vi.fn(() => Promise.resolve()),
}))
vi.mock('firebase/auth', () => ({ updateProfile: vi.fn(() => Promise.resolve()) }))
vi.mock('../lib/db', () => ({ refs: { user: vi.fn(() => ({})) } }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(authState) }))
vi.mock('../stores/useSelectStore', () => ({ useSelectStore: (sel) => sel({ resetSelection: vi.fn() }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const { default: SettingsSheet } = await import('./SettingsSheet')

describe('SettingsSheet', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1', displayName: 'Test User', photoURL: null }, signOut: vi.fn() }
    useUserStore.setState({
      uiVisibility: { hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true },
    })
  })

  it('shows the Profile fields on the Profile tab by default', () => {
    render(<SettingsSheet onClose={() => {}} />)
    expect(screen.getByPlaceholderText('ชื่อของคุณ')).toBeTruthy()
  })

  it('switching to the Interface tab hides Profile fields and shows HUD toggles', () => {
    render(<SettingsSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Interface' }))
    expect(screen.queryByPlaceholderText('ชื่อของคุณ')).toBeNull()
    expect(screen.getByText('แถบไอเทมด่วน (Hotbar)')).toBeTruthy()
  })

  it('switching to the Privacy tab hides the Interface toggles', () => {
    render(<SettingsSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Interface' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Privacy' }))
    expect(screen.queryByText('แถบไอเทมด่วน (Hotbar)')).toBeNull()
  })

  it('toggling the Hotbar switch flips uiVisibility.hotbar in the store, leaving others untouched', () => {
    render(<SettingsSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Interface' }))
    fireEvent.click(screen.getByRole('switch', { name: 'แถบไอเทมด่วน (Hotbar)' }))
    const { uiVisibility } = useUserStore.getState()
    expect(uiVisibility.hotbar).toBe(false)
    expect(uiVisibility.shortcuts).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- SettingsSheet`
Expected: FAIL — no `role="tab"` elements exist yet (no `SegmentedTabs` wired in), so `getByRole('tab', { name: 'Interface' })` throws.

- [ ] **Step 3: Add the tab state, imports, and `UI_VISIBILITY_ITEMS` list**

In `src/components/SettingsSheet.jsx`, change the import block (lines 1–12) to add `SegmentedTabs`:

```js
import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Camera } from 'lucide-react'
import { getDoc, updateDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { auth } from '../firebase'
import { refs } from '../lib/db'
import { compressImage } from '../utils/compressImage'
import { useAuthStore } from '../stores/useAuthStore'
import { useUserStore } from '../stores/useUserStore'
import { useSelectStore } from '../stores/useSelectStore'
import { useNavigate } from 'react-router-dom'
import Toggle from './ui/Toggle'
import SegmentedTabs from './ui/SegmentedTabs'
```

Add the new items list right after `PRIVACY_ITEMS` (after line 26):

```js
const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'interface', label: 'Interface' },
  { id: 'general', label: 'General' },
]

const UI_VISIBILITY_ITEMS = [
  { key: 'hotbar',     label: 'แถบไอเทมด่วน (Hotbar)' },
  { key: 'shortcuts',  label: 'ปุ่มลัด ปฏิทิน/Roadmap' },
  { key: 'newsButton', label: 'ปุ่มข่าวสาร' },
  { key: 'musicPill',  label: 'แถบเพลงด้านบน' },
  { key: 'contactFab', label: 'ปุ่มติดต่อผู้พัฒนา' },
]
```

Add the tab state and store bindings inside the component, right after the existing `const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY)` (line 51):

```js
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY)
  const [activeTab, setActiveTab] = useState('profile')
  const uiVisibility = useUserStore((s) => s.uiVisibility)
  const setUiVisibility = useUserStore((s) => s.setUiVisibility)
```

- [ ] **Step 4: Wire `SegmentedTabs` and gate the three existing sections**

Replace the header block (original lines 153–161):

```jsx
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <p className="pixel-font text-[11px] text-gray-700">Settings</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-10 space-y-5">
```

with:

```jsx
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <p className="pixel-font text-[11px] text-gray-700">Settings</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <SegmentedTabs tabs={SETTINGS_TABS} activeId={activeTab} onChange={setActiveTab} />

        <div className="overflow-y-auto flex-1 px-5 pt-5 pb-10 space-y-5">
```

Wrap the Edit Profile section (original lines 163–241, from `{/* ── [1] Edit Profile ── */}` through its closing `</section>`) in a tab gate — change the opening:

```jsx
          {/* ── [1] Edit Profile ── */}
          <section className="space-y-3">
```

to:

```jsx
          {activeTab === 'profile' && (
          <section className="space-y-3">
```

and its closing `</section>` (line 241) to:

```jsx
          </section>
          )}
```

Remove the divider immediately after it (original line 243, `<div className="h-px bg-gray-100" />`) — delete that line entirely.

Wrap the Privacy Settings section (original lines 245–272) the same way — opening:

```jsx
          {/* ── [2] Privacy Settings ── */}
          <section className="space-y-4">
```

becomes:

```jsx
          {activeTab === 'privacy' && (
          <section className="space-y-4">
```

closing `</section>` (line 272) becomes:

```jsx
          </section>
          )}
```

Remove the second divider (original line 274) entirely.

Wrap the General Settings section (original lines 276–334) the same way — opening:

```jsx
          {/* ── [3] General Settings ── */}
          <section className="space-y-3">
```

becomes:

```jsx
          {activeTab === 'general' && (
          <section className="space-y-3">
```

closing `</section>` (line 334) becomes:

```jsx
          </section>
          )}
```

- [ ] **Step 5: Add the Interface section**

Insert this new section right after the General section's closing `)}` (i.e. immediately before the outer `</div>` that closes the scroll container):

```jsx
          {activeTab === 'interface' && (
          <section className="space-y-4">
            <p className="pixel-font text-[9px] text-purple-500 uppercase tracking-wide">Interface</p>

            {UI_VISIBILITY_ITEMS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">{label}</span>
                <Toggle
                  checked={uiVisibility?.[key] ?? true}
                  onChange={(v) => setUiVisibility(key, v)}
                  label={label}
                />
              </div>
            ))}
          </section>
          )}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- SettingsSheet`
Expected: PASS (all 4 tests green).

- [ ] **Step 7: Run the full test suite to check for regressions**

Run: `npm test`
Expected: PASS — no other suite imports `SettingsSheet` directly, so this should not affect anything else.

- [ ] **Step 8: Commit**

```bash
git add src/components/SettingsSheet.jsx src/components/SettingsSheet.test.jsx
git commit -m "feat: tabbed Settings layout with Interface visibility toggles"
```

---

### Task 3: Gate the Hotbar behind `uiVisibility.hotbar` in `GameCanvas`

**Files:**
- Modify: `src/components/GameCanvas.jsx`

**Interfaces:**
- Consumes: `useUserStore.getState().uiVisibility.hotbar` (Task 1). `useUserStore` is already imported in this file (line 6) and already used for `controlMode` (line 54).
- Produces: nothing new consumed by later tasks.

**Note on testing:** `GameCanvas.jsx` boots a real Phaser game instance on mount and has no existing test file — none of the other components that wrap it are tested either (`HomePage.jsx` has no test file). Adding Phaser/canvas test scaffolding is out of scope for this change; verify this task by running the dev server (Step 3) instead of an automated test, consistent with how this file is already (un)tested in this repo.

- [ ] **Step 1: Add the `uiVisibility` selector**

In `src/components/GameCanvas.jsx`, add the selector next to the existing `controlMode` one (line 54):

```js
  const remotePlayers      = useWorldStore((s) => s.remotePlayers)
  const controlMode        = useUserStore((s) => s.controlMode)
  const uiVisibility       = useUserStore((s) => s.uiVisibility)
```

- [ ] **Step 2: Gate the Hotbar render**

Change (original lines 362–364):

```jsx
      {active && (
        <Hotbar slots={hotbar} selectedIndex={selectedHotbarIndex} gold={gold} onSelectSlot={setSelectedHotbarIndex} />
      )}
```

to:

```jsx
      {active && uiVisibility.hotbar && (
        <Hotbar slots={hotbar} selectedIndex={selectedHotbarIndex} gold={gold} onSelectSlot={setSelectedHotbarIndex} />
      )}
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`, open the app, sign in, reach the home game screen.
Expected: Hotbar visible by default. Open Settings → Interface tab → turn off "แถบไอเทมด่วน (Hotbar)" → Hotbar disappears from the game screen immediately (no reload needed, since `uiVisibility` is reactive Zustand state). Turn it back on → Hotbar reappears.

- [ ] **Step 4: Run the full test suite to check for regressions**

Run: `npm test`
Expected: PASS — `GameCanvas.jsx` has no existing test file, so this change can't break an automated test; confirms nothing else broke.

- [ ] **Step 5: Commit**

```bash
git add src/components/GameCanvas.jsx
git commit -m "feat: hide Hotbar when uiVisibility.hotbar is off"
```

---

### Task 4: Gate FAB shortcuts / News button / Music pill / Contact FAB in `HomePage`

**Files:**
- Modify: `src/pages/HomePage.jsx`

**Interfaces:**
- Consumes: `useUserStore.getState().uiVisibility` (Task 1). `useUserStore` is already imported (line 3) and already used for `profilePhotoURL`/`coins`/`totalStacks` (lines 47–50).
- Produces: nothing new consumed by later tasks. This is the final task.

**Note on testing:** like Task 3, `HomePage.jsx` has no existing test file (it composes `GameCanvas`, which requires a real DOM/canvas Phaser boot) — verify this task with the dev server instead of an automated test.

- [ ] **Step 1: Add the `uiVisibility` selector**

In `src/pages/HomePage.jsx`, add the selector next to the existing ones (after line 50, `const gold = useInventoryStore((s) => s.gold)`):

```js
  const gold = useInventoryStore((s) => s.gold)
  const uiVisibility = useUserStore((s) => s.uiVisibility)
```

- [ ] **Step 2: Gate the Music pill**

The Music pill button is the second child of the left-side header div (original lines 221–237, starting `{/* Music status pill */}`). Change its wrapping from unconditional to gated — replace:

```jsx
          {/* Music status pill */}
          <button
            onClick={() => handleTabChange(APP_VIEWS.MUSIC)}
```

with:

```jsx
          {/* Music status pill */}
          {uiVisibility.musicPill && (
          <button
            onClick={() => handleTabChange(APP_VIEWS.MUSIC)}
```

and its closing `</button>` (line 237) with:

```jsx
          </button>
          )}
```

- [ ] **Step 3: Gate the Calendar + Roadmap shortcut FABs**

Change the wrapping div (original lines 256–272):

```jsx
      {/* ── PASSIVE SKILL FAB (Calendar shortcut) + Roadmap FAB ── */}
      <div className="absolute top-20 left-4 z-20 flex flex-col gap-2">
```

to:

```jsx
      {/* ── PASSIVE SKILL FAB (Calendar shortcut) + Roadmap FAB ── */}
      {uiVisibility.shortcuts && (
      <div className="absolute top-20 left-4 z-20 flex flex-col gap-2">
```

and its closing `</div>` (line 272) to:

```jsx
      </div>
      )}
```

- [ ] **Step 4: Gate the News button**

Change (original lines 274–289):

```jsx
      {/* ── NEWS BUTTON (top-right below coins) ── */}
      <div className="absolute top-20 right-4 z-20">
```

to:

```jsx
      {/* ── NEWS BUTTON (top-right below coins) ── */}
      {uiVisibility.newsButton && (
      <div className="absolute top-20 right-4 z-20">
```

and its closing `</div>` (line 289) to:

```jsx
      </div>
      )}
```

- [ ] **Step 5: Gate the Contact-developer FAB**

Change (original line 384):

```jsx
      {auth.currentUser && auth.currentUser.uid !== ADMIN_UID && (
```

to:

```jsx
      {uiVisibility.contactFab && auth.currentUser && auth.currentUser.uid !== ADMIN_UID && (
```

(the rest of that block, including its matching closing `)}` at line 410, is unchanged).

- [ ] **Step 6: Manually verify**

Run: `npm run dev`, open the app, reach the home game screen.
Expected: with all Interface toggles on (default), Music pill, Calendar/Roadmap FABs, News button, and Contact-developer FAB are all visible. Turn each off one at a time from Settings → Interface — each element disappears immediately without a reload. Confirm the avatar pill (top-left) and BottomNavBar (bottom) remain visible throughout, and Settings stays reachable via avatar → gear icon even with every toggle off.

- [ ] **Step 7: Run the full test suite to check for regressions**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/HomePage.jsx
git commit -m "feat: hide HUD shortcuts/news/music/contact FAB via uiVisibility"
```
