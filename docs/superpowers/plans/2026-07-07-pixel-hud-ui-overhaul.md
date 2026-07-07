# Pixel HUD UI Overhaul — Implementation Plan

> **For agentic workers (Cursor):** Read `design.md` at the repo root FIRST — it is the
> binding spec this plan implements. Execute tasks in order, step by step. Steps use
> checkbox (`- [ ]`) syntax for tracking. Claude Code will verify with `npm test` +
> visual review after each task lands.

**Goal:** Replace the generic "AI-template" chrome (white glass pills, purple gradients,
soft shadows, emoji icons, 7–9px pixel text) with the game-native "cartridge HUD"
language (`neo-*` system) across every user-facing surface.

**Architecture:** Pure presentational refactor. No store, routing, Firestore, or Phaser
changes. All new styles live as tokens/utilities in `src/index.css` `@theme`; components
consume them via Tailwind classes. Shared primitives first (tokens → Button → Popup →
nav), then screens, then a mechanical sweep.

**Tech Stack:** React 19 + Tailwind v4 (`@theme` in `src/index.css`, NO config file),
lucide-react, plain JS/JSX (NO TypeScript).

## Global Constraints

- **No TypeScript.** No `.ts`, no type annotations.
- **Tailwind v4:** all tokens in `src/index.css` `@theme`. Never create `tailwind.config.js`.
- **React Flow invariant:** never rotate or re-position a node's root `<div>`; borders/shadows only (see `CONTEXT.md`).
- **Scope:** user-facing app only. `src/components/admin/**` and `AdminPage.jsx` are OUT of scope.
- **Fonts:** Press Start 2P = Latin/digits only, ≥10px. All Thai text = Noto Sans Thai (`.thai-font`).
- **Colors:** only `@theme` tokens. No `gray-*`/`blue-*`/`red-*` default-palette classes, no raw hex in JSX (gradient scene backdrops in HomePage/App loading/Auth sky are the only exception).
- **Tests:** after each task run `npm test`. If a test asserts an OLD class/style (e.g. `title-gradient`), update the assertion to the NEW spec — never revert the style to satisfy a test. Behavior assertions (labels, aria, callbacks) must keep passing unchanged.
- **Commits:** one commit per task, message given in the task.

---

### Task 1: Foundation — tokens + `neo-*` utilities in `src/index.css`

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces token classes: `bg-paper`, `bg-hud`, `text-ink-soft`, `text-good`, `text-warn`,
  `text-danger`, `bg-danger`, `shadow-hard`, `shadow-hard-sm`
- Produces utility classes: `.neo-slab`, `.neo-sheet`, `.neo-pressed`, `.neo-input`,
  `.pixel-title`, `.pixel-title-dark`, `.animate-sheet-up`, `.animate-block-fill`
- All later tasks consume these. Do NOT delete `.title-gradient` / `.title-soft-gradient`
  yet (still referenced — removed in Task 10).

- [ ] **Step 1: Extend the `@theme` block**

Replace the current `@theme { ... }` in `src/index.css` with:

```css
@theme {
  --color-brand:        #a78bda;
  --color-brand-strong: #7c3aed;
  --color-brand-soft:   #f0eeff;
  --color-accent-pink:  #d93d8c;
  --color-ink:          #1a1035;
  --color-surface:      #ffffff;
  --color-paper:        #fdf6ec;
  --color-hud:          #fffdf8;
  --color-ink-soft:     #6b6284;
  --color-good:         #3f9e58;
  --color-warn:         #e0a53c;
  --color-danger:       #d9534f;
  --shadow-hard:        4px 4px 0 0 #1a1035;
  --shadow-hard-sm:     3px 3px 0 0 #1a1035;
}
```

- [ ] **Step 2: Add the new utilities directly below the existing `.neo-btn` rules**

```css
/* ── Cartridge HUD surface system (see design.md §4) ───────────────────────── */
.neo-slab {
  border: 2px solid var(--color-ink);
  border-radius: 0.75rem;
  background: var(--color-hud);
  box-shadow: 3px 3px 0 0 var(--color-ink);
}
.neo-sheet {
  border: 2px solid var(--color-ink);
  border-bottom: none;
  border-radius: 1rem 1rem 0 0;
  background: var(--color-paper);
}
.neo-pressed {
  transform: translate(2px, 2px);
  box-shadow: none;
  background: var(--color-brand-soft);
}
.neo-input {
  border: 2px solid var(--color-ink);
  border-radius: 0.5rem;
  background: var(--color-surface);
}
.neo-input:focus {
  outline: none;
  box-shadow: 3px 3px 0 0 var(--color-brand);
}

/* ── Headline treatment — replaces gradient-clipped text (design.md §5) ────── */
.pixel-title      { color: var(--color-ink); text-shadow: 3px 3px 0 var(--color-accent-pink); }
.pixel-title-dark { color: #ffffff;          text-shadow: 3px 3px 0 var(--color-brand-strong); }

/* ── Stepped motion (design.md §7) ─────────────────────────────────────────── */
@keyframes sheetUp {
  from { transform: translateY(24px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.animate-sheet-up { animation: sheetUp 220ms steps(4); }

@keyframes blockFill {
  0%, 100% { opacity: 0.15; }
  50%      { opacity: 1; }
}
.animate-block-fill { animation: blockFill 1.1s steps(2) infinite; }

@keyframes scrollHint {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(6px); }
}
.animate-scroll-hint { animation: scrollHint 1.2s steps(2) infinite; }

@media (prefers-reduced-motion: reduce) {
  .animate-sheet-up   { animation: none; }
  .animate-block-fill { animation: none; opacity: 1; }
  .animate-scroll-hint { animation: none; }
}
```

- [ ] **Step 3: Verify**

Run: `npm test` → expected: all pass (CSS-only change).
Run: `npm run dev` → app renders unchanged (nothing consumes the new classes yet).

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(design): add cartridge-HUD tokens and neo-* utilities"
```

---

### Task 2: Button — kill the purple gradient

**Files:**
- Modify: `src/components/ui/Button.jsx`

**Interfaces:**
- Props unchanged: `variant ('primary'|'secondary'|'ghost')`, `size ('md'|'lg')`,
  `disabled`, `onClick`, `type`, `aria-label`. No caller changes needed.

- [ ] **Step 1: Replace the class/style logic**

Replace the `base`, `variants` constants and delete `primaryStyle` (and its usage on
`style=`) so the component body becomes:

```jsx
  const base =
    'inline-flex items-center justify-center gap-2 w-full rounded-xl font-bold ' +
    'disabled:opacity-50 disabled:pointer-events-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand '

  const sizes = {
    md: 'h-11 px-5 text-sm',
    lg: 'h-14 px-6 text-base',
  }

  const variants = {
    primary: 'neo-btn bg-brand-strong text-white',
    secondary: 'neo-btn bg-surface text-ink',
    ghost: 'text-brand-strong',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.primary} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
```

Note: `active:scale-95`, `transition-all`, `shadow-lg`, the gradient `style` and
`rounded-2xl` are all gone — `.neo-btn` supplies border, hard shadow, and the stepped
press mechanic.

- [ ] **Step 2: Verify**

Run: `npm test` → expected pass. Visual: auth/onboarding CTAs now flat purple with ink
border + hard shadow; press physically sinks the button.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.jsx
git commit -m "feat(design): Button uses neo press mechanic, drops gradient"
```

---

### Task 3: Popup shell, DragHandle, PanelHeader → game dialog boxes

**Files:**
- Modify: `src/components/ui/Popup.jsx`
- Modify: `src/components/ui/DragHandle.jsx`
- Modify: `src/components/ui/PanelHeader.jsx`

**Interfaces:**
- All props unchanged. Every sheet/modal/panel in the app inherits this look for free.

- [ ] **Step 1: DragHandle — chunky ink bar**

Full new file body:

```jsx
export default function DragHandle() {
  return (
    <div className="flex justify-center pt-2.5 pb-1.5" aria-hidden="true">
      <div className="w-12 h-1.5 bg-ink rounded-full" />
    </div>
  )
}
```

- [ ] **Step 2: Popup — neo-sheet / neo-card shells**

In `Popup.jsx`, replace the inner container `className` (the `div` currently using
`bg-white ... rounded-t-3xl / rounded-3xl`) with:

```jsx
      <div
        className={`relative flex flex-col overflow-hidden w-full ${maxW} md:mx-auto ${maxHeight} ${
          isSheet ? 'neo-sheet animate-sheet-up' : 'neo-card'
        }`}
        style={clearNav ? { paddingBottom: NAV_SAFE_PB } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
```

- [ ] **Step 3: PanelHeader — pixel title + square X tile**

Full new file body (adds a lucide import):

```jsx
import { X } from 'lucide-react'

// Shared chrome header for all full-screen panels.
export default function PanelHeader({ title, leftIcon, rightActions, onClose }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-ink bg-paper shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
        <h2 className="pixel-font text-[12px] uppercase text-ink truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {rightActions}
        <button
          onClick={onClose}
          aria-label="ปิด"
          className="neo-btn w-9 h-9 flex items-center justify-center rounded-lg bg-surface text-ink
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <X size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
```

⚠️ `PanelHeader` titles are rendered in `pixel-font` — callers passing a Thai `title`
must be switched to a Latin title (e.g. `TASKS`, `CHAT`) with any Thai subtitle rendered
by the caller in `thai-font`. Grep call sites: `grep -rn "PanelHeader" src/` and fix
titles that contain Thai characters.

- [ ] **Step 4: Verify + commit**

Run: `npm test` → pass (update any test asserting the old `✕` text to lucide `X` / aria-label "ปิด").

```bash
git add src/components/ui/Popup.jsx src/components/ui/DragHandle.jsx src/components/ui/PanelHeader.jsx
git commit -m "feat(design): sheets and panel headers become game dialog boxes"
```

---

### Task 4: SegmentedTabs — ink baseline, square indicator

**Files:**
- Modify: `src/components/ui/SegmentedTabs.jsx`

- [ ] **Step 1: Restyle (props/roles/aria unchanged)**

```jsx
export default function SegmentedTabs({ tabs, activeId, onChange }) {
  return (
    <div className="flex border-b-2 border-ink bg-paper shrink-0" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-1 py-3 text-[13px] font-semibold
              transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset
              ${isActive ? 'text-ink font-bold' : 'text-ink-soft hover:text-ink'}`}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            <span className="thai-font">{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] flex items-center justify-center leading-none">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute -bottom-0.5 left-2 right-2 h-1 bg-brand-strong" />
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify + commit**

```bash
git add src/components/ui/SegmentedTabs.jsx
git commit -m "feat(design): SegmentedTabs ink baseline + square indicator"
```

---

### Task 5: BottomNavBar — HUD dock with pressed active tab

**Files:**
- Modify: `src/components/BottomNavBar.jsx`

- [ ] **Step 1: Replace the dock container and tab classes**

Keep the `tabs` array (icons stay). Replace the returned JSX with:

```jsx
  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-30"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="neo-slab px-2 py-2 md:px-3 md:py-2.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg
                transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                ${isActive
                  ? 'neo-pressed text-brand-strong border-2 border-ink'
                  : 'text-ink-soft hover:text-ink border-2 border-transparent'
                }`}
            >
              {tab.icon}
              <span
                className={`pixel-font text-[10px] leading-tight ${isActive ? 'text-brand-strong' : 'text-ink-soft'}`}
                aria-hidden="true"
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
```

- [ ] **Step 2: Verify + commit**

Visual: dock is a warm slab with ink border + hard shadow; the current tab looks
physically pressed in.

```bash
git add src/components/BottomNavBar.jsx
git commit -m "feat(design): bottom nav becomes HUD dock with pressed active tab"
```

---

### Task 6: HomePage — consolidate into TOP HUD + QUICK RAIL (design.md §8)

**Files:**
- Modify: `src/pages/HomePage.jsx`

**Interfaces:**
- Consumes: `neo-slab`, `neo-btn`, token colors from Task 1.
- All handlers/state unchanged. The separate News button block is REMOVED; News becomes
  the 4th tile of the quick rail (same `handleTabChange(APP_VIEWS.NEWS)` handler,
  same `uiVisibility.newsButton` flag, badge preserved).

- [ ] **Step 1: Update lucide imports**

```jsx
import { Calendar, MessageCircle, Map, Newspaper, Trophy, Flame, Play, Pause, Music, Gamepad2 } from 'lucide-react'
```

- [ ] **Step 2: Avatar button** — replace its className with:

```jsx
className="pointer-events-auto neo-btn w-10 h-10 md:w-12 md:h-12 rounded-full bg-hud flex items-center justify-center shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
```

and replace the `🎮` fallback span with `<Gamepad2 size={18} strokeWidth={2.5} className="text-ink" />`.

- [ ] **Step 3: Music pill → neo-slab** — replace its className with:

```jsx
className="pointer-events-auto neo-btn neo-slab flex items-center gap-1.5 h-10 px-3 overflow-hidden min-w-0 flex-1 max-w-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
```

Replace the `🎵/🎶` span with `<Music size={14} strokeWidth={2.5} className="shrink-0 text-brand-strong" />`
and change the title span classes `text-[8px] text-blue-700` → `text-[10px] text-brand-strong`.

- [ ] **Step 4: Stat pill → HUD statboard** — replace the whole streak/coins/gold block with:

```jsx
        <div className="pointer-events-auto neo-slab flex items-center gap-3 px-4 py-1.5">
          <span className="pixel-font text-[11px] text-ink flex items-center gap-1">
            <Flame size={14} strokeWidth={2.5} className="text-danger" aria-hidden="true" />
            {totalStacks}
          </span>
          <span className="pixel-font text-[11px] text-ink flex items-center gap-1">
            <CoinIcon size={14} />
            {coins}
          </span>
          <span className="pixel-font text-[11px] text-ink flex items-center gap-1">
            <GoldIcon size={14} />
            {gold}g
          </span>
        </div>
```

- [ ] **Step 5: Quick rail — square tiles + News joins the rail**

Replace the shortcuts block AND delete the standalone News button block. New rail:

```jsx
      {/* ── QUICK RAIL (Calendar · Mastery · Roadmap · News) ── */}
      {uiVisibility.shortcuts && (
      <div className="absolute top-20 left-4 z-20 flex flex-col gap-2">
        <button
          onClick={handlePlannerTransition}
          aria-label="เปิดปฏิทิน"
          className="neo-btn w-12 h-12 rounded-lg bg-hud flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Calendar size={22} strokeWidth={2.5} className="text-ink" />
        </button>
        <button
          onClick={() => openPopup('mastery')}
          aria-label="เปิด Mastery"
          className="neo-btn w-12 h-12 rounded-lg bg-hud flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Trophy size={22} strokeWidth={2.5} className="text-ink" />
        </button>
        <button
          onClick={() => openPopup('roadmap')}
          aria-label="เปิด Roadmap"
          className="neo-btn w-12 h-12 rounded-lg bg-hud flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Map size={22} strokeWidth={2.5} className="text-ink" />
        </button>
        {uiVisibility.newsButton && (
          <button
            onClick={() => handleTabChange(APP_VIEWS.NEWS)}
            aria-label="ข่าวสาร"
            className="relative neo-btn w-12 h-12 rounded-lg bg-hud flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Newspaper size={22} strokeWidth={2.5} className="text-ink" />
            {!newsRead && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger border-2 border-ink text-white text-[10px] font-bold flex items-center justify-center" aria-hidden="true">
                1
              </span>
            )}
          </button>
        )}
      </div>
      )}
```

- [ ] **Step 6: Tracklist panel — de-blue, neo-card**

Container div: `bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl` → `neo-card`.
Header: `border-b border-gray-100` → `border-b-2 border-ink`; title
`pixel-font text-[10px] font-bold text-gray-800` → `pixel-font text-[10px] text-ink`
and drop the `🎵 ` prefix (title text: `BACKGROUND MUSIC`). Now-playing line
`pixel-font text-[9px] text-blue-600` → `thai-font text-xs text-brand-strong` and
replace the `▶ ` prefix with nothing. Play/pause button:
`bg-blue-100 ... rounded-full` → `neo-btn w-9 h-9 rounded-lg bg-brand-soft`, its glyph
`{isPlaying ? '⏸' : '▶'}` → `{isPlaying ? <Pause size={14} strokeWidth={2.5}/> : <Play size={14} strokeWidth={2.5}/>}`.
Track rows: `border-gray-50 hover:bg-blue-50` → `border-ink/10 hover:bg-brand-soft`,
active row `bg-blue-50` → `bg-brand-soft`; row text
`pixel-font text-[9px] ... text-blue-700/text-gray-700` →
`thai-font text-xs font-semibold ... text-brand-strong / text-ink` (track titles can be Thai);
the `♪` indicator span → `<Music size={12} className="shrink-0 text-brand-strong" />`.

- [ ] **Step 7: Contact-developer FAB — flat neo tile**

Replace the button's `className`/`style` with:

```jsx
            className="relative neo-btn w-12 h-12 rounded-lg bg-brand-strong flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
```

(delete the gradient/glow `style` prop). Replace the `animate-ping` badge block with a
static dot:

```jsx
            {!contactedAdmin && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-danger border-2 border-ink" />
            )}
```

- [ ] **Step 8: Verify + commit**

Run: `npm test` → pass. Visual checklist: exactly 2 HUD zones + rail + dock + MiniPlayer;
no white glass pills; no blue anywhere; no emoji in controls.

```bash
git add src/pages/HomePage.jsx
git commit -m "feat(design): home screen becomes 2-zone game HUD"
```

---

### Task 7: MiniPlayer — HUD slab

**Files:**
- Modify: `src/components/music/MiniPlayer.jsx`

- [ ] **Step 1: Restyle both states (logic untouched)**

Disconnected button className →
`"w-full neo-btn neo-slab px-4 py-2.5 flex items-center gap-2 pixel-font text-[10px] text-brand-strong"`.

Connected slab className → `"w-full neo-slab px-3 py-2 flex items-center gap-3"`.
Album art `rounded` → `rounded-lg border-2 border-ink`; placeholder div
`rounded bg-brand-soft` → `rounded-lg border-2 border-ink bg-brand-soft`.
Artist line `text-gray-400` → `text-ink-soft`. Play/pause button `text-brand` →
`text-ink` and add `aria-label` (already present) — keep as icon-only.

- [ ] **Step 2: Verify + commit**

```bash
git add src/components/music/MiniPlayer.jsx
git commit -m "feat(design): MiniPlayer as HUD slab"
```

---

### Task 8: Onboarding — paper dialog + step progress + SelectCard

**Files:**
- Modify: `src/components/onboarding/OnboardingModal.jsx`
- Modify: `src/components/ui/SelectCard.jsx`

- [ ] **Step 1: OnboardingModal — paper surface + STEP indicator**

Change the wrapper `bg-white` → `bg-paper`, and render a progress header above
`renderCurrentStep()`:

```jsx
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-paper">
      {step > 0 && subStep === null && (
        <div className="flex items-center justify-between px-5 pt-4 shrink-0">
          <span className="pixel-font text-[10px] text-ink">STEP {step}/{LAST_MAIN_STEP}</span>
          <div className="flex gap-1" aria-hidden="true">
            {[1, 2].map((s) => (
              <span
                key={s}
                className={`w-6 h-2 border-2 border-ink ${s <= step ? 'bg-brand-strong' : 'bg-surface'}`}
              />
            ))}
          </div>
        </div>
      )}
      {renderCurrentStep()}
    </div>
  )
```

- [ ] **Step 2: SelectCard — ink selection, Thai-safe fonts**

Full new file body:

```jsx
/**
 * SelectCard — selectable card used by Career and Mastery pages.
 * Ink border + pressed brand fill when selected (design.md §4).
 */
export default function SelectCard({ name, detail, selected, onClick }) {
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`
        flex w-full items-start overflow-hidden rounded-xl text-left border-2 transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
        ${selected
          ? 'border-ink bg-brand-soft shadow-hard-sm'
          : 'border-ink/25 bg-surface hover:border-ink/60'}
      `}
    >
      <div className="px-4 py-3">
        <p className="thai-font text-sm font-bold text-ink leading-snug">{name}</p>
        {detail && (
          <p className="thai-font mt-1 text-xs leading-snug text-ink-soft">{detail}</p>
        )}
      </div>
    </button>
  )
}
```

(Note: `name` values are Thai career/program names — the old `pixel-font` here was a
§5 violation.)

- [ ] **Step 3: Sweep the step components** (`OnboardingIntro.jsx`, `MbtiStep.jsx`,
`PlanList.jsx`, `UniversityStep.jsx`, `ProgramStep.jsx`) with the Task 12 replacement
table (they are part of this task's deliverable): white cards → `neo-card`/`bg-surface`,
grays → ink tokens, pixel-font Thai → thai-font, CTAs already use `Button` (now neo).

- [ ] **Step 4: Verify + commit**

Run: `npm test` → pass.

```bash
git add src/components/onboarding/ src/components/ui/SelectCard.jsx
git commit -m "feat(design): onboarding as paper game dialog with step progress"
```

---

### Task 9: AuthPage + LoadingScreen

**Files:**
- Modify: `src/pages/AuthPage.jsx`
- Modify: `src/App.jsx` (LoadingScreen only)

- [ ] **Step 1: AuthPage** — apply this exact mapping to the whole file
(the starfield/sky gradient backdrop STAYS — scene-backdrop exception):

| Old | New |
|---|---|
| form/card container `bg-white...rounded-3xl shadow-*` | `neo-card bg-paper` |
| `<input>` classes `border border-gray-* rounded-* bg-*` | `neo-input thai-font px-4 h-11 text-sm text-ink placeholder:text-ink-soft w-full` |
| headline with `title-gradient` or gradient text | `pixel-font pixel-title-dark text-xl` |
| `text-gray-400/500` | `text-ink-soft` |
| `text-gray-700/800/900` | `text-ink` |
| error text `text-red-*` | `thai-font text-xs text-danger` |
| any emoji in buttons | lucide icon equivalent |

CTAs already use `ui/Button` → inherit Task 2 automatically.

- [ ] **Step 2: LoadingScreen — segmented block progress**

In `src/App.jsx`, replace the `role="progressbar"` div (the sliding-gradient bar) with:

```jsx
      <div className="flex gap-1" role="progressbar" aria-label="กำลังโหลด" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-6 h-3 border-2 border-ink/60 bg-brand animate-block-fill"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
```

Keep the dark gradient backdrop and the `Loading...` pixel label (bump to `text-[10px]`
if smaller).

- [ ] **Step 3: Verify + commit**

Run: `npm test` → `AuthPage.test.jsx` behavior assertions (labels, error messages,
handlers) must pass unchanged; update class-based assertions if any.

```bash
git add src/pages/AuthPage.jsx src/App.jsx
git commit -m "feat(design): auth + loading screen join the cartridge language"
```

---

### Task 10: Welcome page — pixel-title, kill gradient text

**Files:**
- Modify: `src/components/welcome/HeroSection.jsx`
- Modify: any other file matched by the grep in Step 2
- Modify: `src/index.css` (delete dead classes)

- [ ] **Step 1: HeroSection**

`<h1 className="pixel-font title-gradient ...">` → `<h1 className="pixel-font pixel-title-dark text-2xl md:text-5xl leading-relaxed">`.
Scroll indicator: `animate-bounce` → `animate-scroll-hint`.

- [ ] **Step 2: Replace remaining gradient-text usages**

Run: `grep -rn "title-gradient\|title-soft-gradient" src/`
For each hit: on dark backgrounds → `pixel-title-dark`; on light → `pixel-title`.

- [ ] **Step 3: Delete `.title-gradient` and `.title-soft-gradient` from `src/index.css`**
(only after Step 2's grep returns zero JSX hits).

- [ ] **Step 4: Verify + commit**

Run: `npm test` → update `HeroSection.test.jsx` if it asserts the old class.

```bash
git add src/components/welcome/ src/index.css
git commit -m "feat(design): welcome hero uses pixel-title, gradient text removed"
```

---

### Task 11: Roadmap nodes — ink + hard shadow (handles untouched)

**Files:**
- Modify: `src/components/roadmap/ProcessNode.jsx`
- Modify: `src/components/roadmap/ConditionNode.jsx`, `ImageNode.jsx`, `VideoNode.jsx`,
  `StageLabelNode.jsx` (same mapping)

⚠️ **Invariant (CONTEXT.md):** do not rotate/re-position any node's root `<div>`; do not
touch `ConnectionDot`/Handle classes. Border, shadow, radius, and text colors only.

- [ ] **Step 1: ProcessNode root div**

```jsx
      className={`relative w-32 h-32 rounded-xl border-2 bg-surface p-2.5 flex flex-col gap-1 transition-all ${
        selected ? 'border-ink shadow-hard-sm' : 'border-ink/30 shadow-none'
      }`}
```

(`data.color` continues to override `borderColor` via the existing `style` prop.)
Textarea `text-gray-500` → `text-ink-soft`; placeholders `placeholder:text-gray-300` →
`placeholder:text-ink-soft/50`.

- [ ] **Step 2: Apply the same mapping to the other node files**
(`rounded-2xl→rounded-xl`, `shadow-md/lg→shadow-hard-sm` when selected / none otherwise,
`bg-white→bg-surface`, grays→ink tokens). Inner diamond rotation in ConditionNode stays
exactly as is.

- [ ] **Step 3: Verify + commit**

Run: `npm test` → `ProcessNode.test.jsx`, `ImageNode.test.jsx`, `VideoNode.test.jsx`
behavior tests pass. Visual: open Roadmap, drag nodes, confirm handles still align.

```bash
git add src/components/roadmap/
git commit -m "feat(design): roadmap nodes wear ink borders and hard shadows"
```

---

### Task 12: Global sweep — mechanical find→replace + copy pass

**Files:** every match under `src/components/` and `src/pages/` EXCEPT `admin/`.

- [ ] **Step 1: Run each grep, apply its rule** (work file-by-file, commit per logical group):

| Grep | Rule |
|---|---|
| `pixel-font text-\[[789]px\]` | Latin-only label → `text-[10px]`. Thai/dynamic text → `thai-font text-xs` |
| `fontFamily: "'Noto Sans Thai'` | delete inline style, add `thai-font` class |
| `text-gray-(900\|800\|700)` | `text-ink` |
| `text-gray-(600\|500\|400\|300)` | `text-ink-soft` (placeholders: `text-ink-soft/50`) |
| `bg-gray-(50\|100)` | hover/active fills → `bg-brand-soft` (hover: `hover:bg-brand-soft/60`); surfaces → `bg-paper` |
| `border-gray-\d+` | dividers → `border-ink/10`; strong borders → `border-ink` |
| `(text\|bg\|border)-blue-\d+` | `brand` / `brand-strong` / `brand-soft` equivalents |
| `(text\|bg)-red-\d+` | `danger` |
| `(text\|bg)-(amber\|orange\|yellow)-\d+` | `warn` |
| `(text\|bg)-(green\|emerald)-\d+` | `good` |
| `shadow-(sm\|md\|lg\|xl\|2xl)` (chrome, not scene) | `shadow-hard-sm` on slabs/cards, else remove |
| `rounded-full` (not avatar/badge) | `rounded-lg` (buttons) / `rounded-xl` (slabs) |
| `animate-(ping\|bounce)` | delete (static badge) or `animate-scroll-hint` |
| `animate-pulse` | keep ONLY on loading skeletons; delete elsewhere |
| emoji inside `<button>`/headers (`✕ ▶ ⏸ 🎵 🎶 💬 📋 🔥 🎮`) | lucide: `X, Play, Pause, Music, MessageCircle, ClipboardList, Flame, Gamepad2` at `strokeWidth={2.5}`. Emoji in chat content / empty-state illustrations STAY |

- [ ] **Step 2: Copy pass (design.md §9)** — while touching each file, fix microcopy:
active-voice Thai verbs on buttons; a button's name matches its toast
("แชร์" → "แชร์แล้ว"); vocabulary: ภารกิจ/แผนเส้นทาง/เพื่อน/แชท/โปรไฟล์; empty states =
one sentence + one action, no mood filler.

- [ ] **Step 3: Final verification**

Run: `npm test` → all pass.
Run: `grep -rn "text-gray-\|bg-blue-\|text-blue-\|title-gradient" src/ --include="*.jsx" | grep -v admin | grep -v test` → expected: zero hits.
Run: `npm run dev` → walk the litmus checklist in `design.md` §11 on: Welcome → Auth →
Onboarding → Home → Task sheet → Chat → Roadmap → MiniPlayer/PlayerSheet.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "refactor(design): global sweep — tokens, icons, motion, copy"
```

---

## Self-review notes

- Spec coverage: every banned tell from `design.md` §1 has a task (1–12 map to tells 1–10).
- Type consistency: class names used in Tasks 2–12 all exist after Task 1 (`neo-slab`,
  `neo-sheet`, `neo-pressed`, `neo-input`, `shadow-hard`, `shadow-hard-sm`, `pixel-title*`,
  `animate-*`); `neo-card`/`neo-btn`/`thai-font`/`pixel-font` pre-exist.
- Order matters: Task 1 must land first; Task 10 Step 3 (deleting gradient classes) must
  follow its grep; everything else is independent after Task 1.
- Out of scope (deliberate): AdminPage/admin components; PlayerSheet internals beyond the
  sweep table; merging the two music systems (background audio vs Spotify) — flow issue
  noted for a future ADR, not a styling task.
