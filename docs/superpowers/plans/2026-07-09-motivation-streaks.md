# Motivation Streaks ("N Day") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the daily check-in feed a real consecutive-day streak, and turn the check-in success screen into the wireframe's "N Day" motivation moment — streak circle, 5-dot cycle, an encouraging Thai message (gentle on broken streaks), and a Save button that writes a reflection into the Notebook.

**Architecture:** Pure streak math in `src/utils/streakCycle.js` (consecutive-day rule, 5-day cycle position, deterministic message pick — no `Math.random`). `useUserStore.addDailyFeel` (the existing once-per-day check-in anchor) becomes the single place the streak advances and now returns the result so the UI can celebrate. Streak fields ride the existing `portfolioSync` writer to `users/{uid}` — no new sync. `DailyLoginModal`'s success screen becomes the Motivation screen; the reflection saves through `useSchoolStore.upsertNote` (appending, never overwriting the day's note).

**Tech Stack:** Zustand, existing `portfolioSync` (`src/lib/syncManager.js`), Vitest + jsdom, React, `Popup` shell, Tailwind v4 tokens.

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- **Current state of `streak`:** the field exists in `useUserStore` but nothing ever calls `setStreak` — it is dead state (always 0; `SkillPanel.jsx:462` reads it). This epic gives it real semantics; do not build a parallel counter.
- **No new sync writer** — streak fields (`streak`, `lastStreakDate`, `bestStreak`) are added to the existing `portfolioSync` `toDoc`/`fromDoc`/`changed` in `src/lib/syncManager.js`.
- **Deterministic, testable time** — every date-dependent action takes an optional `todayStr` parameter defaulting to the real today (same pattern as `SchoolPanel`'s `today` prop). No `Math.random` anywhere; message pick is a pure function of the streak number.
- **Gentle restart, never guilt** (PRD story 31): a broken streak gets "เริ่มใหม่วันนี้ก็ยังทัน 🔥"-tone copy, not a loss message.
- **Zustand selectors select raw store fields only** (getSnapshot loop, commit `e1d67fe`).
- **Student-facing copy is Thai**; `thai-font`/`pixel-font`/`neo-*` classes; no new tokens.

**Background:** PRD issue #36 Epic E (stories 28–31); master roadmap item 2. Wireframe: circle + "3 Day / Motivation Telling" + dots 1–5 + Save. The check-in modal exists (`DailyLoginModal`) but its HomePage trigger is commented out — this epic also re-wires it.

**Data model (additions to `useUserStore` state, persisted via localStorage + portfolioSync):**

```js
// streak: number            — consecutive check-in days (exists today, dead)
// lastStreakDate: 'YYYY-MM-DD' | null — last day that counted
// bestStreak: number        — all-time max
// addDailyFeel(level, todayStr?) now RETURNS { streak, changed, broken }
```

---

### Task 1: Pure streak math + messages

**Files:**
- Create: `src/utils/streakCycle.js`
- Test: `src/utils/streakCycle.test.js`

**Interfaces:**
- Produces (used by Tasks 2/3):
  - `nextStreak(lastStreakDate, todayStr, currentStreak)` → `{ streak, changed, broken }` — same day: `{ streak: currentStreak, changed: false, broken: false }`; yesterday: `streak + 1`; first ever (`lastStreakDate == null`): 1; gap: 1 with `broken: currentStreak > 1`.
  - `cyclePosition(streak)` → 0 for `streak <= 0`, else `((streak - 1) % 5) + 1`.
  - `motivationMessage(streak, broken)` → Thai string; `broken` → the gentle-restart line; otherwise a rotating pick indexed by `streak % MESSAGES.length`.
  - `MESSAGES` — exported array (for test determinism).

- [ ] **Step 1: Write the failing tests**

Create `src/utils/streakCycle.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { nextStreak, cyclePosition, motivationMessage, MESSAGES } from './streakCycle'

describe('nextStreak', () => {
  it('starts at 1 on the first ever check-in', () => {
    expect(nextStreak(null, '2026-07-09', 0)).toEqual({ streak: 1, changed: true, broken: false })
  })

  it('increments when the last counted day was yesterday', () => {
    expect(nextStreak('2026-07-08', '2026-07-09', 3)).toEqual({ streak: 4, changed: true, broken: false })
  })

  it('handles month boundaries (July 31 → Aug 1)', () => {
    expect(nextStreak('2026-07-31', '2026-08-01', 9)).toEqual({ streak: 10, changed: true, broken: false })
  })

  it('does not change on a same-day repeat', () => {
    expect(nextStreak('2026-07-09', '2026-07-09', 4)).toEqual({ streak: 4, changed: false, broken: false })
  })

  it('resets to 1 after a gap, flagging broken when a real streak was lost', () => {
    expect(nextStreak('2026-07-05', '2026-07-09', 6)).toEqual({ streak: 1, changed: true, broken: true })
  })

  it('a gap from streak 1 is a reset but not "broken"', () => {
    expect(nextStreak('2026-07-05', '2026-07-09', 1)).toEqual({ streak: 1, changed: true, broken: false })
  })
})

describe('cyclePosition', () => {
  it('maps streaks onto the 5-dot cycle', () => {
    expect(cyclePosition(1)).toBe(1)
    expect(cyclePosition(3)).toBe(3)
    expect(cyclePosition(5)).toBe(5)
    expect(cyclePosition(6)).toBe(1)
    expect(cyclePosition(10)).toBe(5)
  })
  it('is 0 for a zero streak', () => {
    expect(cyclePosition(0)).toBe(0)
  })
})

describe('motivationMessage', () => {
  it('returns the gentle-restart line for a broken streak', () => {
    expect(motivationMessage(1, true)).toContain('เริ่มใหม่')
  })
  it('rotates deterministically through MESSAGES by streak number', () => {
    expect(motivationMessage(3, false)).toBe(MESSAGES[3 % MESSAGES.length])
    expect(motivationMessage(3 + MESSAGES.length, false)).toBe(MESSAGES[3 % MESSAGES.length])
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/utils/streakCycle.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/utils/streakCycle.js`:

```js
// Pure streak math + motivation copy — no imports, no I/O, no randomness
// (message pick is a function of the streak number so tests are exact).

export const MESSAGES = [
  'ความสม่ำเสมอชนะพรสวรรค์เสมอ 🔥',
  'วันนี้ก็มาแล้ว! ตัวเธอในอนาคตขอบคุณอยู่นะ',
  'ทีละวัน ทีละก้าว — เก่งขึ้นกว่าเมื่อวานแล้ว',
  'สตรีคยังไม่ขาด ความพยายามก็เหมือนกัน 💪',
  'คนที่ไปถึงฝัน คือคนที่มาทุกวันแบบเธอนี่แหละ',
]

const RESTART_MESSAGE = 'ไม่เป็นไรเลย เริ่มใหม่วันนี้ก็ยังทัน 🔥'

function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
}

export function nextStreak(lastStreakDate, todayStr, currentStreak) {
  if (lastStreakDate === todayStr) {
    return { streak: currentStreak, changed: false, broken: false }
  }
  if (lastStreakDate === shiftDate(todayStr, -1)) {
    return { streak: currentStreak + 1, changed: true, broken: false }
  }
  return { streak: 1, changed: true, broken: lastStreakDate != null && currentStreak > 1 }
}

export function cyclePosition(streak) {
  if (streak <= 0) return 0
  return ((streak - 1) % 5) + 1
}

export function motivationMessage(streak, broken) {
  if (broken) return RESTART_MESSAGE
  return MESSAGES[streak % MESSAGES.length]
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/utils/streakCycle.test.js` → PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/streakCycle.js src/utils/streakCycle.test.js
git commit -m "feat(motivation): pure streak math, 5-dot cycle, deterministic Thai messages"
```

---

### Task 2: `useUserStore` — streak advances on daily check-in

**Files:**
- Modify: `src/stores/useUserStore.js`
- Modify: `src/stores/useUserStore.test.js`

**Interfaces:**
- Produces: state gains `lastStreakDate: null`, `bestStreak: 0` (and `streak` gets real semantics). `addDailyFeel(level, todayStr?)` now returns `{ streak, changed, broken }`; a same-day repeat returns `changed: false` and mutates nothing (existing guard preserved). `resetUser` resets the new fields.

- [ ] **Step 1: Write the failing tests**

Append to `src/stores/useUserStore.test.js` (inside its top-level describe; reset relevant state in the tests themselves as shown):

```js
describe('daily streak via addDailyFeel', () => {
  beforeEach(() => {
    useUserStore.setState({
      streak: 0, lastStreakDate: null, bestStreak: 0,
      lastLoginDate: null, feelingNotes: [], totalStacks: 0,
    })
  })

  it('first ever check-in starts the streak at 1', () => {
    const result = useUserStore.getState().addDailyFeel(4, '2026-07-09')
    expect(result).toEqual({ streak: 1, changed: true, broken: false })
    const s = useUserStore.getState()
    expect(s.streak).toBe(1)
    expect(s.lastStreakDate).toBe('2026-07-09')
    expect(s.bestStreak).toBe(1)
    expect(s.lastLoginDate).toBe('2026-07-09')
    expect(s.totalStacks).toBe(1)
    expect(s.feelingNotes).toEqual([{ date: '2026-07-09', feel: 4 }])
  })

  it('consecutive-day check-in increments streak and bestStreak', () => {
    useUserStore.getState().addDailyFeel(3, '2026-07-08')
    const result = useUserStore.getState().addDailyFeel(5, '2026-07-09')
    expect(result).toEqual({ streak: 2, changed: true, broken: false })
    expect(useUserStore.getState().bestStreak).toBe(2)
  })

  it('same-day repeat changes nothing and reports changed: false', () => {
    useUserStore.getState().addDailyFeel(3, '2026-07-09')
    const result = useUserStore.getState().addDailyFeel(5, '2026-07-09')
    expect(result).toEqual({ streak: 1, changed: false, broken: false })
    expect(useUserStore.getState().feelingNotes).toHaveLength(1)
    expect(useUserStore.getState().totalStacks).toBe(1)
  })

  it('a gap resets the streak to 1 but keeps bestStreak', () => {
    useUserStore.setState({ streak: 6, lastStreakDate: '2026-07-01', bestStreak: 6 })
    const result = useUserStore.getState().addDailyFeel(2, '2026-07-09')
    expect(result).toEqual({ streak: 1, changed: true, broken: true })
    expect(useUserStore.getState().streak).toBe(1)
    expect(useUserStore.getState().bestStreak).toBe(6)
  })
})
```

(If `useUserStore.test.js` does not already import `beforeEach`, add it to the vitest import.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/stores/useUserStore.test.js` → new cases FAIL (return value undefined / fields missing); pre-existing cases PASS.

- [ ] **Step 3: Implement**

In `src/stores/useUserStore.js`:
- Add the import: `import { nextStreak } from '../utils/streakCycle'`.
- Change the creator signature from `(set) => ({` to `(set, get) => ({`.
- Add to initial state after `streak: 0,`:

```js
      lastStreakDate: null, // 'YYYY-MM-DD' of the last day that counted toward the streak
      bestStreak: 0,
```

- Replace the whole `addDailyFeel` action with:

```js
      // Daily feel check-in (max once per day). Increments stacks and advances
      // the consecutive-day streak. Returns { streak, changed, broken } so the
      // check-in UI can show the Motivation screen. todayStr is injectable for
      // tests (same pattern as SchoolPanel's `today` prop).
      addDailyFeel: (level, todayStr) => {
        const today = todayStr ?? new Date().toISOString().slice(0, 10)
        const state = get()
        if (state.lastLoginDate === today) {
          return { streak: state.streak, changed: false, broken: false }
        }
        const result = nextStreak(state.lastStreakDate, today, state.streak)
        set({
          lastLoginDate: today,
          totalStacks: state.totalStacks + 1,
          feelingNotes: [...state.feelingNotes, { date: today, feel: level }],
          streak: result.streak,
          lastStreakDate: today,
          bestStreak: Math.max(state.bestStreak ?? 0, result.streak),
        })
        return result
      },
```

- In `resetUser`, add `lastStreakDate: null,` and `bestStreak: 0,` alongside `streak: 0,`.

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/stores/useUserStore.test.js` → PASS (4 new + all existing).

- [ ] **Step 5: Commit**

```bash
git add src/stores/useUserStore.js src/stores/useUserStore.test.js
git commit -m "feat(motivation): consecutive-day streak advances on daily check-in"
```

---

### Task 3: Streak fields ride `portfolioSync`

**Files:**
- Modify: `src/lib/syncManager.js`

- [ ] **Step 1: Extend the portfolio writer**

In `src/lib/syncManager.js`, replace the `portfolioSync` block's `toDoc`, `fromDoc`, and `changed` with:

```js
  toDoc: ({ portfolioData, journeys, streak, lastStreakDate, bestStreak }) => ({
    portfolioData,
    journeys,
    streak,
    lastStreakDate,
    bestStreak,
    portfolioUpdatedAt: serverTimestamp(),
  }),
  fromDoc: (data) => {
    const updates = {}
    if (data.portfolioData) updates.portfolioData = data.portfolioData
    if (data.journeys) updates.journeys = data.journeys
    if (data.photoURL) updates.profilePhotoURL = data.photoURL
    if (typeof data.streak === 'number') updates.streak = data.streak
    if (typeof data.lastStreakDate === 'string') updates.lastStreakDate = data.lastStreakDate
    if (typeof data.bestStreak === 'number') updates.bestStreak = data.bestStreak
    return updates
  },
  changed: (s, p) =>
    s.portfolioData !== p.portfolioData || s.journeys !== p.journeys
    || s.streak !== p.streak || s.lastStreakDate !== p.lastStreakDate || s.bestStreak !== p.bestStreak,
```

(Everything else in the block — `store`, `logName`, `needsSeed` — stays as-is. The `users/{uid}` owner-write rule already covers these fields; no rules change.)

- [ ] **Step 2: Verify no regressions**

Run: `npx vitest run src/stores/useUserStore.test.js src/services/sessionBootstrap.test.js`
Expected: PASS — `sessionBootstrap.test.js` mocks `syncManager` wholesale, so it only proves the wiring names are unchanged (they are).

- [ ] **Step 3: Commit**

```bash
git add src/lib/syncManager.js
git commit -m "feat(motivation): persist streak fields through the portfolio sync writer"
```

---

### Task 4: `DailyLoginModal` success screen → Motivation screen

**Files:**
- Modify: `src/components/DailyLoginModal.jsx`
- Create: `src/components/DailyLoginModal.test.jsx`

**Interfaces:**
- Consumes: `addDailyFeel` return value (Task 2), `cyclePosition`/`motivationMessage` (Task 1), `useSchoolStore.notes`/`upsertNote` + `noteFor` (Notebook epic).
- Produces: after check-in the success screen shows the streak circle ("N Day"), the 5-dot cycle with `cyclePosition(streak)` dots lit, `motivationMessage(streak, broken)`, a reflection textarea + Save that **appends** to today's general Notebook note (`🔥 Day N: <text>` on a new line if a note exists), then the existing heatmap + close. `onClose` behavior and the pre-save mood screen are unchanged.

- [ ] **Step 1: Write the failing tests**

Create `src/components/DailyLoginModal.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const addDailyFeel = vi.fn()
let userState
vi.mock('../stores/useUserStore', () => ({
  useUserStore: (sel) => sel(userState),
}))

const upsertNote = vi.fn()
let schoolState
vi.mock('../stores/useSchoolStore', () => ({
  useSchoolStore: (sel) => sel(schoolState),
}))

vi.mock('./MoodHeatmap', () => ({ default: () => <div data-testid="heatmap" /> }))
vi.mock('./ui/Popup', () => ({ default: ({ children }) => <div>{children}</div> }))

const { default: DailyLoginModal } = await import('./DailyLoginModal')

describe('DailyLoginModal motivation screen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addDailyFeel.mockReturnValue({ streak: 3, changed: true, broken: false })
    userState = { addDailyFeel, feelingNotes: [], totalStacks: 5 }
    schoolState = { notes: [], upsertNote }
  })

  function checkIn() {
    render(<DailyLoginModal onClose={vi.fn()} today="2026-07-09" />)
    fireEvent.click(screen.getByText('Good'))
    fireEvent.click(screen.getByText(/Check In as/))
  }

  it('shows the N Day streak after checking in', () => {
    checkIn()
    expect(screen.getByText('3 Day')).toBeTruthy()
  })

  it('lights cyclePosition dots in the 5-dot cycle', () => {
    checkIn()
    const dots = screen.getAllByTestId('streak-dot')
    expect(dots).toHaveLength(5)
    expect(dots.filter((d) => d.dataset.lit === 'true')).toHaveLength(3)
  })

  it('shows the gentle-restart message when the streak broke', () => {
    addDailyFeel.mockReturnValue({ streak: 1, changed: true, broken: true })
    checkIn()
    expect(screen.getByText(/เริ่มใหม่/)).toBeTruthy()
  })

  it('saving a reflection appends it to today’s Notebook note', () => {
    schoolState.notes = [
      { id: 'n1', date: '2026-07-09', subjectId: null, text: 'เรียนอนุกรม', createdAt: 1, updatedAt: 1 },
    ]
    checkIn()
    fireEvent.change(screen.getByLabelText('บันทึกความรู้สึก'), { target: { value: 'วันนี้สู้มาก' } })
    fireEvent.click(screen.getByText('Save'))
    expect(upsertNote).toHaveBeenCalledWith({
      date: '2026-07-09', subjectId: null, text: 'เรียนอนุกรม\n🔥 Day 3: วันนี้สู้มาก',
    })
  })

  it('saving with no existing note writes just the reflection line', () => {
    checkIn()
    fireEvent.change(screen.getByLabelText('บันทึกความรู้สึก'), { target: { value: 'เหนื่อยแต่ไหว' } })
    fireEvent.click(screen.getByText('Save'))
    expect(upsertNote).toHaveBeenCalledWith({
      date: '2026-07-09', subjectId: null, text: '🔥 Day 3: เหนื่อยแต่ไหว',
    })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/components/DailyLoginModal.test.jsx` → FAIL (no "3 Day" text etc.).

- [ ] **Step 3: Implement**

In `src/components/DailyLoginModal.jsx`:

- Add imports:

```js
import { useSchoolStore } from '../stores/useSchoolStore'
import { noteFor } from '../utils/schoolDayView'
import { cyclePosition, motivationMessage } from '../utils/streakCycle'
```

- Change the signature to `export default function DailyLoginModal({ onClose, today })` and add inside the component:

```js
  const todayStr = today ?? new Date().toISOString().slice(0, 10)
  const notes = useSchoolStore((s) => s.notes)
  const upsertNote = useSchoolStore((s) => s.upsertNote)
  const [streakResult, setStreakResult] = useState(null)
  const [reflection, setReflection] = useState('')
  const [reflectionSaved, setReflectionSaved] = useState(false)
```

- Change `handleConfirm` to capture the result:

```js
  function handleConfirm() {
    if (!selected || saved) return
    setStreakResult(addDailyFeel(selected, todayStr))
    setSaved(true)
  }
```

- Add the save handler:

```js
  function handleSaveReflection() {
    if (!reflection.trim() || reflectionSaved) return
    const line = `🔥 Day ${streakResult.streak}: ${reflection.trim()}`
    const existing = noteFor(notes, todayStr, null)
    upsertNote({
      date: todayStr,
      subjectId: null,
      text: existing?.text ? `${existing.text}\n${line}` : line,
    })
    setReflectionSaved(true)
  }
```

- In the saved (`:` else) branch, replace the existing "Success header" block with the Motivation screen (keep the heatmap + close button below it):

```jsx
            {/* Motivation screen */}
            <div className="text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-warn border-4 border-ink flex items-center justify-center mb-2">
                <span className="text-3xl" aria-hidden="true">🔥</span>
              </div>
              <p className="pixel-font text-[16px] text-ink mb-1">{streakResult?.streak ?? 0} Day</p>
              <p className="thai-font text-sm text-ink-soft mb-3">{motivationMessage(streakResult?.streak ?? 0, streakResult?.broken ?? false)}</p>
              <div className="flex justify-center gap-2 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    data-testid="streak-dot"
                    data-lit={i <= cyclePosition(streakResult?.streak ?? 0) ? 'true' : 'false'}
                    className={`w-6 h-6 rounded-full border-2 border-ink flex items-center justify-center pixel-font text-[8px] ${
                      i <= cyclePosition(streakResult?.streak ?? 0) ? 'bg-warn text-ink' : 'bg-surface text-ink-soft'
                    }`}
                  >
                    {i}
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-soft">
                Stack +1! Total: <span className="font-bold text-accent-pink">{totalStacks}</span>
              </p>
            </div>

            {/* Reflection → Notebook */}
            <div>
              {reflectionSaved ? (
                <p className="thai-font text-center text-sm text-brand-strong">บันทึกลง Notebook แล้ว ✓</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    aria-label="บันทึกความรู้สึก"
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="วันนี้เป็นยังไงบ้าง..."
                    className="neo-input thai-font flex-1 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleSaveReflection}
                    className="neo-btn rounded-lg bg-brand-strong px-4 py-2 pixel-font text-[10px] text-white"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/components/DailyLoginModal.test.jsx` → PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/DailyLoginModal.jsx src/components/DailyLoginModal.test.jsx
git commit -m "feat(motivation): N Day streak screen with 5-dot cycle and save-to-Notebook reflection"
```

---

### Task 5: Re-wire the HomePage trigger

**Files:**
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Wire the check-in trigger**

`HomePage.jsx` imports `DailyLoginModal` but its trigger `useEffect` is commented out (search for `showDailyModal`). First `grep -n "DailyLoginModal" src/pages/HomePage.jsx` to see whether a render exists anywhere in the JSX:

- If it renders nowhere: delete the commented-out block (lines starting `// Show daily check-in modal on first mount...`), then add via the popup store (`usePopupStore` is already imported):

```js
  // Daily check-in — once per day, on entering Home.
  useEffect(() => {
    if (useUserStore.getState().needsDailyCheckIn()) openPopup('dailyLogin')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

and render alongside the other popups (near the `{activePopup === 'calendar' && ...}` block):

```jsx
      {activePopup === 'dailyLogin' && (
        <DailyLoginModal onClose={closePopup} today={new Date().toISOString().slice(0, 10)} />
      )}
```

- If it already renders somewhere: keep that render, just pass the new `today` prop and make sure the trigger uses `needsDailyCheckIn()`.

- [ ] **Step 2: Manual verify**

`npm run dev` → sign in with a fresh day (or clear `rc-user-store` in localStorage) → check-in modal appears → pick a mood → confirm → the "N Day" screen shows with lit dots → type a reflection → Save → open School panel → today's Notebook contains the `🔥 Day N:` line appended. Reload → no second check-in prompt. Also confirm the streak survives reload (localStorage) and appears in the user doc (`streak`/`lastStreakDate`/`bestStreak` fields) after the debounce.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.jsx
git commit -m "feat(motivation): re-wire the daily check-in trigger on HomePage"
```

---

### Task 6: Verification + docs

- [ ] **Step 1:** `npm test` → all suites pass (re-run unrelated flaky files in isolation before judging).
- [ ] **Step 2:** `npm run lint` → zero errors in touched files.
- [ ] **Step 3:** In `CONTEXT.md` Domain Vocabulary, replace the existing **Streak** row with:

```
| **Streak** | Consecutive daily check-in counter with real semantics: advances via `useUserStore.addDailyFeel` (pure math in `src/utils/streakCycle.js` — same-day no-op, yesterday +1, gap resets to 1 flagging `broken`). `lastStreakDate`/`bestStreak` persist through `portfolioSync`. The check-in success screen is the "N Day" Motivation screen (5-dot cycle, deterministic Thai message, reflection saved into the Notebook) |
```

- [ ] **Step 4:**

```bash
git add CONTEXT.md
git commit -m "docs(context): Streak gains real consecutive-day semantics"
```

---

## Out of Scope (deliberate simplifications)

- **AI-generated motivation messages** — templated copy only; Gemini generation is a later enhancement behind the existing AI services.
- **Streak from task/homework completion** — the daily check-in is the single streak anchor for now; multiple anchors need same-day dedup rules that add complexity without changing the habit loop.
- **Streak-based coin bonuses / rewards shop** — belongs to Epic G (Premium packaging) where reward economics are decided server-side.
- **Push/local notifications for streak reminders** — no notification infrastructure exists yet.

---

## Cursor Prompt (single conversation, all tasks pre-authorized)

> Read `docs/superpowers/plans/2026-07-09-motivation-streaks.md` and execute **ALL tasks (1–6) in order**, exactly as written, step by step, TDD: write the failing test first, run it, implement, run again, commit after each task with the exact commit messages given. The owner has pre-authorized every command this plan requires — run them directly; only stop if a command errors. CRITICAL: Zustand selectors must select raw store fields only — never derive arrays inside a selector (see commit `e1d67fe`). In Task 5, follow the grep-first instruction before editing HomePage. Do the manual walkthrough in Task 5 Step 2 and report what you saw. When everything is done, run the full `npm test` suite and report the final pass/fail counts verbatim.
