# School System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give students a real school timetable inside the app — subjects with weekly schedule slots, homework/appointments with deadlines, and a day view sorted by what's due — using the app's existing Firestore sync infrastructure, no new sync mechanism.

**Architecture:** One new Zustand store (`useSchoolStore`) holds subjects, weekly schedule slots, and appointments (homework/checkpoints). It persists through the existing `createFirestoreSync` factory, nested under `users/{uid}.school` exactly like `inventory`/`farm` already nest — no new Firestore document type, no new security rule (the existing owner-write-except-`coins` rule on `users/{uid}` already covers it). Day-view sorting/filtering logic is extracted into pure helpers tested standalone. The UI is a new panel reached from HomePage's existing Quick Rail (alongside Calendar/Mastery/Roadmap/News), following the same full-screen panel shell `TaskPanel` already uses.

**Tech Stack:** Zustand + `persist` middleware, Firebase Firestore (`users/{uid}` doc), Vitest + `@testing-library/react` (jsdom), React, Tailwind v4 tokens, lucide-react icons.

## Global Constraints

- **No TypeScript** — plain JS + JSX only. No type annotations.
- **No new sync mechanism** — reuse `createFirestoreSync` from `src/lib/syncManager.js` exactly as `inventorySync`/`farmSync` do. Do not hand-roll a new debounce/hydrate lifecycle.
- **No new Firestore document/collection** — school data nests under the existing `users/{uid}` doc as a `school` field. Do not add a `refs.school` or a new top-level collection.
- **No Firestore rules change** — `firestore.rules`'s existing `users/{uid}` update rule already allows an owner to write arbitrary fields except `coins`; the `school` field is covered by that rule as-is. Verify with the existing generic test (`allows a user to edit arbitrary fields on their OWN doc`, `test/rules/firestore.rules.test.js:35`) — do not add a redundant rules test.
- **Rewards route through existing mechanics** — completing an appointment calls `useUserStore.addCoins` (component layer, mirroring `TaskPanel.jsx`'s `addCoins((task.rewardCoins || 10) + sparkBonus)` pattern) and the store's toggle calls `useUserStore.getState().incrementStacks()` on the incomplete→complete transition only, mirroring `useTaskStore.toggleTask` (`src/stores/useTaskStore.js:59-73`) exactly. No parallel reward system.
- **Firebase paths** — only use `src/lib/db.js` refs/shapes; `refs.user` already exists and is what this epic reuses. Never inline `doc(db, 'users', uid)`.
- **Tailwind v4 tokens** — use existing token classes (`text-brand`, `bg-surface`, `border-ink`, `thai-font`, `pixel-font`, `neo-btn`, `neo-card`, `neo-slab`) — no new tokens, no `tailwind.config.js`.
- **User-facing copy is Thai** for student-facing text, English is fine for internal/admin-only labels (matches the mixed convention already in `TaskPanel.jsx`).
- **Naming conventions**: component files `PascalCase.jsx` with default export; stores/utils `camelCase.js`; setters `onVerb`/verb-named actions; tests colocated as `Name.test.js(x)`.
- **Visual fidelity**: build complete, functional, tested screens using the existing design system (`neo-card`, `neo-btn`, pixel/thai fonts) — do not attempt pixel-perfect reproduction of the wireframe's exact layout. Per `CLAUDE.md`'s collaboration model, Cursor refines JSX/Tailwind visual polish; this plan's job is correct, tested behavior.

**Background (why):** PRD issue #36, Epic B. Nothing today serves the student's daily school life — no timetable, no homework tracker. Dek-D and TCASter (competitors) own "TCAS information"; neither owns "daily gamified school planner." This is the daily-use anchor the PRD's build order puts right after the TCAS70 data fix (Epic A, already shipped).

**Data model (locked in for every task below):**

```js
// subjects: [{ id, name, color, description, createdAt }]
// scheduleSlots: [{ id, subjectId, day, startTime, endTime }]
//   day: one of 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat'
//   startTime/endTime: 'HH:MM' 24h strings, e.g. '12:00'
// appointments: [{ id, subjectId, title, kind, dueDate, completed, createdAt, completedAt }]
//   kind: 'homework' | 'checkpoint'
//   dueDate: 'YYYY-MM-DD' string
```

---

### Task 1: Pure day-view helpers

**Files:**
- Create: `src/utils/schoolDayView.js`
- Test: `src/utils/schoolDayView.test.js`

**Interfaces:**
- Consumes: nothing (pure module, zero imports).
- Produces (used by Task 4/5's UI):
  - `DAY_KEYS` — `['sun','mon','tue','wed','thu','fri','sat']`
  - `dayKeyFromDate(dateStr)` → one of `DAY_KEYS`
  - `slotsForDay(scheduleSlots, dayKey)` → array, filtered + sorted by `startTime`
  - `appointmentsDueOn(appointments, dateStr)` → array, filtered by `dueDate`, incomplete-first then by `createdAt` ascending
  - `isOverdue(appointment, todayStr)` → boolean

- [x] **Step 1: Write the failing tests**

Create `src/utils/schoolDayView.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { DAY_KEYS, dayKeyFromDate, slotsForDay, appointmentsDueOn, isOverdue } from './schoolDayView'

describe('dayKeyFromDate', () => {
  // Jan 1, 2000 is a well-known Saturday — fixed reference, no reliance on "today".
  it('maps 2000-01-01 (Saturday) to sat', () => {
    expect(dayKeyFromDate('2000-01-01')).toBe('sat')
  })
  it('maps 2000-01-02 (Sunday) to sun', () => {
    expect(dayKeyFromDate('2000-01-02')).toBe('sun')
  })
  it('maps 2000-01-03 (Monday) to mon', () => {
    expect(dayKeyFromDate('2000-01-03')).toBe('mon')
  })
})

describe('slotsForDay', () => {
  const slots = [
    { id: 's1', subjectId: 'math', day: 'mon', startTime: '13:00', endTime: '14:00' },
    { id: 's2', subjectId: 'physics', day: 'mon', startTime: '09:00', endTime: '10:00' },
    { id: 's3', subjectId: 'english', day: 'tue', startTime: '08:00', endTime: '09:00' },
  ]

  it('filters to the requested day', () => {
    const result = slotsForDay(slots, 'tue')
    expect(result.map((s) => s.id)).toEqual(['s3'])
  })

  it('sorts by startTime ascending', () => {
    const result = slotsForDay(slots, 'mon')
    expect(result.map((s) => s.id)).toEqual(['s2', 's1'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(slotsForDay(slots, 'sun')).toEqual([])
  })
})

describe('appointmentsDueOn', () => {
  const appointments = [
    { id: 'a1', subjectId: 'math', title: 'Page 21', dueDate: '2026-07-10', completed: false, createdAt: 200 },
    { id: 'a2', subjectId: 'math', title: 'Quiz', dueDate: '2026-07-10', completed: true, createdAt: 100 },
    { id: 'a3', subjectId: 'math', title: 'Page 5', dueDate: '2026-07-10', completed: false, createdAt: 100 },
    { id: 'a4', subjectId: 'physics', title: 'Lab report', dueDate: '2026-07-11', completed: false, createdAt: 50 },
  ]

  it('filters to the requested date', () => {
    const result = appointmentsDueOn(appointments, '2026-07-11')
    expect(result.map((a) => a.id)).toEqual(['a4'])
  })

  it('sorts incomplete before completed, then by createdAt ascending', () => {
    const result = appointmentsDueOn(appointments, '2026-07-10')
    expect(result.map((a) => a.id)).toEqual(['a3', 'a1', 'a2'])
  })

  it('returns an empty array when nothing is due', () => {
    expect(appointmentsDueOn(appointments, '2026-01-01')).toEqual([])
  })
})

describe('isOverdue', () => {
  it('is true for an incomplete appointment due before today', () => {
    expect(isOverdue({ completed: false, dueDate: '2026-07-01' }, '2026-07-08')).toBe(true)
  })
  it('is false for a completed appointment even if due before today', () => {
    expect(isOverdue({ completed: true, dueDate: '2026-07-01' }, '2026-07-08')).toBe(false)
  })
  it('is false for an appointment due today or in the future', () => {
    expect(isOverdue({ completed: false, dueDate: '2026-07-08' }, '2026-07-08')).toBe(false)
    expect(isOverdue({ completed: false, dueDate: '2026-07-09' }, '2026-07-08')).toBe(false)
  })
})
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/schoolDayView.test.js`
Expected: FAIL — `Cannot find module './schoolDayView'` (or equivalent resolve error).

- [x] **Step 3: Write the implementation**

Create `src/utils/schoolDayView.js`:

```js
// src/utils/schoolDayView.js
// Pure day-view logic for the School System — no imports, no I/O. Tested
// standalone in schoolDayView.test.js; the store and UI only call these.

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// Parses 'YYYY-MM-DD' as a LOCAL date (not UTC) so the weekday is correct
// regardless of the runtime's timezone offset.
export function dayKeyFromDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return DAY_KEYS[new Date(y, m - 1, d).getDay()]
}

export function slotsForDay(scheduleSlots, dayKey) {
  return scheduleSlots
    .filter((slot) => slot.day === dayKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function appointmentsDueOn(appointments, dateStr) {
  return appointments
    .filter((a) => a.dueDate === dateStr)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return a.createdAt - b.createdAt
    })
}

export function isOverdue(appointment, todayStr) {
  return !appointment.completed && appointment.dueDate < todayStr
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/schoolDayView.test.js`
Expected: PASS — 12 tests.

- [x] **Step 5: Commit**

```bash
git add src/utils/schoolDayView.js src/utils/schoolDayView.test.js
git commit -m "feat(school): pure day-view helpers for schedule slots and appointments"
```

---

### Task 2: `useSchoolStore` — subjects, schedule slots, appointments

**Files:**
- Create: `src/stores/useSchoolStore.js`
- Test: `src/stores/useSchoolStore.test.js`

**Interfaces:**
- Consumes: `useUserStore.getState().incrementStacks` (mirrors `useTaskStore.toggleTask`).
- Produces (used by Task 3's sync wiring and Task 4/5's UI):
  - State: `subjects: []`, `scheduleSlots: []`, `appointments: []`
  - `addSubject({ name, color, description })` → returns new subject `id` (string)
  - `updateSubject(id, patch)`
  - `removeSubject(id)` — cascades: also removes that subject's `scheduleSlots` and `appointments`
  - `addScheduleSlot(subjectId, { day, startTime, endTime })` → returns new slot `id`
  - `updateScheduleSlot(id, patch)`
  - `removeScheduleSlot(id)`
  - `addAppointment(subjectId, { title, kind, dueDate })` → returns new appointment `id`; defaults `kind` to `'homework'`, sets `completed: false`, `createdAt: Date.now()`, `completedAt: null`
  - `updateAppointment(id, patch)`
  - `removeAppointment(id)`
  - `toggleAppointment(id)` — flips `completed`/`completedAt`; calls `incrementStacks()` only on the incomplete→complete transition (does NOT call `addCoins` — that's the caller's job, mirroring `toggleTask`)
  - `clearSchool()` — resets all three arrays to `[]` (used by this store's own tests to reset state between cases; not called by `teardownSession`, which only disarms the sync writer — mirroring how `useTaskStore`'s data is likewise left in place across logout)

- [x] **Step 1: Write the failing tests**

Create `src/stores/useSchoolStore.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const incrementStacks = vi.fn()
vi.mock('./useUserStore', () => ({
  useUserStore: { getState: () => ({ incrementStacks }) },
}))

const { useSchoolStore } = await import('./useSchoolStore')

describe('useSchoolStore', () => {
  beforeEach(() => {
    useSchoolStore.getState().clearSchool()
    incrementStacks.mockClear()
  })

  it('adds a subject and returns its id', () => {
    const id = useSchoolStore.getState().addSubject({ name: 'Math', color: '#a78bda', description: '' })
    const subjects = useSchoolStore.getState().subjects
    expect(subjects).toHaveLength(1)
    expect(subjects[0]).toMatchObject({ id, name: 'Math', color: '#a78bda' })
  })

  it('updates a subject', () => {
    const id = useSchoolStore.getState().addSubject({ name: 'Math' })
    useSchoolStore.getState().updateSubject(id, { name: 'Advanced Math' })
    expect(useSchoolStore.getState().subjects[0].name).toBe('Advanced Math')
  })

  it('removing a subject cascades to its schedule slots and appointments', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const physicsId = useSchoolStore.getState().addSubject({ name: 'Physics' })
    useSchoolStore.getState().addScheduleSlot(mathId, { day: 'mon', startTime: '09:00', endTime: '10:00' })
    useSchoolStore.getState().addScheduleSlot(physicsId, { day: 'tue', startTime: '09:00', endTime: '10:00' })
    useSchoolStore.getState().addAppointment(mathId, { title: 'HW', dueDate: '2026-07-10' })
    useSchoolStore.getState().addAppointment(physicsId, { title: 'Lab', dueDate: '2026-07-11' })

    useSchoolStore.getState().removeSubject(mathId)

    const state = useSchoolStore.getState()
    expect(state.subjects.map((s) => s.id)).toEqual([physicsId])
    expect(state.scheduleSlots.every((sl) => sl.subjectId !== mathId)).toBe(true)
    expect(state.appointments.every((a) => a.subjectId !== mathId)).toBe(true)
  })

  it('adds a schedule slot under a subject', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const slotId = useSchoolStore.getState().addScheduleSlot(mathId, { day: 'mon', startTime: '12:00', endTime: '13:00' })
    const slots = useSchoolStore.getState().scheduleSlots
    expect(slots).toEqual([{ id: slotId, subjectId: mathId, day: 'mon', startTime: '12:00', endTime: '13:00' }])
  })

  it('updates and removes a schedule slot', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const slotId = useSchoolStore.getState().addScheduleSlot(mathId, { day: 'mon', startTime: '12:00', endTime: '13:00' })
    useSchoolStore.getState().updateScheduleSlot(slotId, { startTime: '14:00' })
    expect(useSchoolStore.getState().scheduleSlots[0].startTime).toBe('14:00')
    useSchoolStore.getState().removeScheduleSlot(slotId)
    expect(useSchoolStore.getState().scheduleSlots).toEqual([])
  })

  it('adds an appointment with homework defaults', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const apptId = useSchoolStore.getState().addAppointment(mathId, { title: '1.1.3 Page 21', dueDate: '2026-07-10' })
    const appt = useSchoolStore.getState().appointments[0]
    expect(appt).toMatchObject({
      id: apptId,
      subjectId: mathId,
      title: '1.1.3 Page 21',
      kind: 'homework',
      dueDate: '2026-07-10',
      completed: false,
      completedAt: null,
    })
    expect(typeof appt.createdAt).toBe('number')
  })

  it('accepts an explicit kind for a checkpoint/exam', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    useSchoolStore.getState().addAppointment(mathId, { title: 'สอบเก็บคะแนน', kind: 'checkpoint', dueDate: '2026-07-10' })
    expect(useSchoolStore.getState().appointments[0].kind).toBe('checkpoint')
  })

  it('toggling an appointment to complete sets completedAt and increments stacks once', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const apptId = useSchoolStore.getState().addAppointment(mathId, { title: 'HW', dueDate: '2026-07-10' })

    useSchoolStore.getState().toggleAppointment(apptId)

    const appt = useSchoolStore.getState().appointments[0]
    expect(appt.completed).toBe(true)
    expect(typeof appt.completedAt).toBe('number')
    expect(incrementStacks).toHaveBeenCalledTimes(1)
  })

  it('toggling back to incomplete clears completedAt and does not increment stacks again', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const apptId = useSchoolStore.getState().addAppointment(mathId, { title: 'HW', dueDate: '2026-07-10' })
    useSchoolStore.getState().toggleAppointment(apptId) // complete
    incrementStacks.mockClear()

    useSchoolStore.getState().toggleAppointment(apptId) // uncomplete

    const appt = useSchoolStore.getState().appointments[0]
    expect(appt.completed).toBe(false)
    expect(appt.completedAt).toBeNull()
    expect(incrementStacks).not.toHaveBeenCalled()
  })

  it('removes an appointment', () => {
    const mathId = useSchoolStore.getState().addSubject({ name: 'Math' })
    const apptId = useSchoolStore.getState().addAppointment(mathId, { title: 'HW', dueDate: '2026-07-10' })
    useSchoolStore.getState().removeAppointment(apptId)
    expect(useSchoolStore.getState().appointments).toEqual([])
  })
})
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/stores/useSchoolStore.test.js`
Expected: FAIL — `Cannot find module './useSchoolStore'` (or equivalent resolve error).

- [x] **Step 3: Write the implementation**

Create `src/stores/useSchoolStore.js`:

```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUserStore } from './useUserStore'

function nextId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

export const useSchoolStore = create(
  persist(
    (set) => ({
      subjects: [],
      scheduleSlots: [],
      appointments: [],

      addSubject: ({ name, color = '#a78bda', description = '' }) => {
        const id = nextId('subject')
        set((state) => ({
          subjects: [...state.subjects, { id, name, color, description, createdAt: Date.now() }],
        }))
        return id
      },
      updateSubject: (id, patch) =>
        set((state) => ({
          subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeSubject: (id) =>
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
          scheduleSlots: state.scheduleSlots.filter((sl) => sl.subjectId !== id),
          appointments: state.appointments.filter((a) => a.subjectId !== id),
        })),

      addScheduleSlot: (subjectId, { day, startTime, endTime }) => {
        const id = nextId('slot')
        set((state) => ({
          scheduleSlots: [...state.scheduleSlots, { id, subjectId, day, startTime, endTime }],
        }))
        return id
      },
      updateScheduleSlot: (id, patch) =>
        set((state) => ({
          scheduleSlots: state.scheduleSlots.map((sl) => (sl.id === id ? { ...sl, ...patch } : sl)),
        })),
      removeScheduleSlot: (id) =>
        set((state) => ({ scheduleSlots: state.scheduleSlots.filter((sl) => sl.id !== id) })),

      addAppointment: (subjectId, { title, kind = 'homework', dueDate }) => {
        const id = nextId('appt')
        set((state) => ({
          appointments: [
            ...state.appointments,
            { id, subjectId, title, kind, dueDate, completed: false, createdAt: Date.now(), completedAt: null },
          ],
        }))
        return id
      },
      updateAppointment: (id, patch) =>
        set((state) => ({
          appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      removeAppointment: (id) =>
        set((state) => ({ appointments: state.appointments.filter((a) => a.id !== id) })),
      // Only tracks the streak stack here (mirrors useTaskStore.toggleTask).
      // Coin rewards are decided and applied by the calling UI, same as
      // TaskPanel does for regular tasks.
      toggleAppointment: (id) =>
        set((state) => {
          const appt = state.appointments.find((a) => a.id === id)
          if (!appt) return state
          const completing = !appt.completed
          if (completing) useUserStore.getState().incrementStacks()
          return {
            appointments: state.appointments.map((a) =>
              a.id === id
                ? { ...a, completed: completing, completedAt: completing ? Date.now() : null }
                : a,
            ),
          }
        }),

      clearSchool: () => set({ subjects: [], scheduleSlots: [], appointments: [] }),
    }),
    { name: 'rc-school-store' },
  ),
)
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/stores/useSchoolStore.test.js`
Expected: PASS — 11 tests.

- [x] **Step 5: Commit**

```bash
git add src/stores/useSchoolStore.js src/stores/useSchoolStore.test.js
git commit -m "feat(school): useSchoolStore for subjects, schedule slots, and appointments"
```

---

### Task 3: Firestore sync + session bootstrap wiring

**Files:**
- Modify: `src/lib/syncManager.js`
- Modify: `src/services/sessionBootstrap.js`
- Modify: `src/services/sessionBootstrap.test.js`

**Interfaces:**
- Consumes: `useSchoolStore` from Task 2; `createFirestoreSync` (existing, `src/lib/syncManager.js:40`).
- Produces (used by Task 6 and by any later epic): `hydrateSchoolFromFirestore(uid)`, `setSchoolSyncUser(uid)`, `disarmSchoolSync()`.

- [x] **Step 1: Add `schoolSync` to `syncManager.js`**

In `src/lib/syncManager.js`, add the import near the top (after the existing store imports, e.g. after `import { useFarmStore } from '../stores/useFarmStore'`):

```js
import { useSchoolStore } from '../stores/useSchoolStore'
```

Then add this block after the `inventorySync` section (after the line `export const disarmInventorySync = () => inventorySync.setSyncUser(null)`), before the `// ── Farm plots` comment:

```js
// ── School System (subjects, schedule slots, appointments) → users/{uid} ─────
const schoolSync = createFirestoreSync({
  store: useSchoolStore,
  logName: 'syncSchool',
  toDoc: ({ subjects, scheduleSlots, appointments }) => ({
    school: { subjects, scheduleSlots, appointments },
    schoolUpdatedAt: serverTimestamp(),
  }),
  fromDoc: (data) => {
    if (!data.school) return {}
    return {
      subjects: data.school.subjects ?? [],
      scheduleSlots: data.school.scheduleSlots ?? [],
      appointments: data.school.appointments ?? [],
    }
  },
  changed: (s, p) =>
    s.subjects !== p.subjects || s.scheduleSlots !== p.scheduleSlots || s.appointments !== p.appointments,
  needsSeed: () => false,
})

export const hydrateSchoolFromFirestore = schoolSync.hydrate
export const setSchoolSyncUser = schoolSync.setSyncUser
export const disarmSchoolSync = () => schoolSync.setSyncUser(null)
```

- [x] **Step 2: Wire hydrate/arm/disarm into `sessionBootstrap.js`**

In `src/services/sessionBootstrap.js`, add `hydrateSchoolFromFirestore`, `setSchoolSyncUser`, `disarmSchoolSync` to the `import { ... } from '../lib/syncManager'` block (alongside the existing `hydrateFarmFromFirestore, armFarmSync, disarmFarmSync,` lines):

```js
  hydrateSchoolFromFirestore,
  setSchoolSyncUser,
  disarmSchoolSync,
```

In the `bootstrapSession` function's Wave 2 `Promise.all([...])` array, add a new step alongside `step('hydrate/arm inventory', ...)`:

```js
    step('hydrate/arm school', async () => {
      await hydrateSchoolFromFirestore(uid)
      setSchoolSyncUser(uid)
    }),
```

In `teardownSession`, add `disarmSchoolSync()` right after the existing `disarmFarmSync()` line, so the function reads:

```js
export function teardownSession() {
  setPortfolioSyncUser(null)
  setTaskSyncUser(null)
  disarmRoadmapSheetSync()
  disarmMapSync()
  disarmInventorySync()
  disarmFarmSync()
  disarmSchoolSync()
  useWorldStore.getState().setMapOwner(null)
  usePlansStore.getState().resetPlans()
}
```

- [x] **Step 3: Update `sessionBootstrap.test.js`**

In `src/services/sessionBootstrap.test.js`, add three fields to the `vi.hoisted` mock object `m` (alongside `hydrateFarm: vi.fn(),`):

```js
  hydrateSchool: vi.fn(),
  setSchoolSyncUser: vi.fn(),
  disarmSchoolSync: vi.fn(),
```

Add three lines to the `vi.mock('../lib/syncManager', ...)` block (alongside `hydrateFarmFromFirestore: (...a) => m.hydrateFarm(...a),`):

```js
  hydrateSchoolFromFirestore: (...a) => m.hydrateSchool(...a),
  setSchoolSyncUser: (...a) => m.setSchoolSyncUser(...a),
  disarmSchoolSync: (...a) => m.disarmSchoolSync(...a),
```

In the `beforeEach` block, add a default resolved mock alongside `m.hydrateFarm.mockResolvedValue(undefined)`:

```js
    m.hydrateSchool.mockResolvedValue(undefined)
```

Add two new test cases inside `describe('bootstrapSession', ...)`, after the existing `it('hydrates farm and arms its sync writer on login', ...)` block:

```js
  it('hydrates school and arms its sync writer on login', async () => {
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateSchool).toHaveBeenCalledWith('u1')
    expect(m.setSchoolSyncUser).toHaveBeenCalledWith('u1')
  })

  it('keeps hydrating school even when farm hydration throws', async () => {
    m.hydrateFarm.mockRejectedValueOnce(new Error('farm boom'))
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateSchool).toHaveBeenCalledWith('u1')
    expect(m.setSchoolSyncUser).toHaveBeenCalledWith('u1')
  })
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/sessionBootstrap.test.js`
Expected: PASS — all existing cases plus the 2 new ones (e.g. 15/15 if the file had 13 before).

- [x] **Step 5: Commit**

```bash
git add src/lib/syncManager.js src/services/sessionBootstrap.js src/services/sessionBootstrap.test.js
git commit -m "feat(school): debounced Firestore sync for School System, wired into session bootstrap"
```

---

### Task 4: `SchoolPanel` — day view + subject rail

**Files:**
- Create: `src/components/school/SchoolPanel.jsx`
- Test: `src/components/school/SchoolPanel.test.jsx`

**Interfaces:**
- Consumes: `useSchoolStore` (Task 2), `appointmentsDueOn`/`isOverdue` (Task 1), `useUserStore.addCoins` (existing).
- Produces: `<SchoolPanel onClose={fn} onOpenSubject={fn} initialDate={string} today={string} />` — full-screen panel, same shell pattern as `TaskPanel` (`className="absolute inset-0 z-50 ..."`). `today` defaults to `initialDate` when omitted, so existing callers don't need to change. Renders a left subject rail and a right day view; tapping a subject calls `onOpenSubject(subjectId)` prop (wired to `SubjectDetailPanel` in Task 6). Items due before `today` and still incomplete render with an overdue style (`school-overdue` class + "เลยกำหนดส่ง" label) — carrying an overdue item forward into a *later* day's view is out of scope for this epic (see Out of Scope note at the end of this plan); browsing back to the day it was due still shows it, visually flagged. Exports `HOMEWORK_REWARD_COINS` constant, consumed by Task 6's HomePage wiring test-free manual check.

- [x] **Step 1: Write the failing test**

Create `src/components/school/SchoolPanel.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let schoolState
vi.mock('../../stores/useSchoolStore', () => ({
  useSchoolStore: (sel) => sel(schoolState),
}))

const addCoins = vi.fn()
vi.mock('../../stores/useUserStore', () => ({
  useUserStore: (sel) => sel({ addCoins }),
}))

const { default: SchoolPanel } = await import('./SchoolPanel')

describe('SchoolPanel', () => {
  beforeEach(() => {
    addCoins.mockClear()
    schoolState = {
      subjects: [
        { id: 'math', name: 'Math', color: '#a78bda', description: '' },
        { id: 'physics', name: 'Physics', color: '#7c3aed', description: '' },
      ],
      scheduleSlots: [],
      appointments: [
        { id: 'a1', subjectId: 'math', title: '1.1.3 Page 21', kind: 'homework', dueDate: '2026-07-08', completed: false, createdAt: 100, completedAt: null },
        { id: 'a2', subjectId: 'math', title: 'สอบเก็บคะแนน 1.1.1-2', kind: 'checkpoint', dueDate: '2026-07-08', completed: false, createdAt: 50, completedAt: null },
      ],
      toggleAppointment: vi.fn(),
      addSubject: vi.fn(),
    }
  })

  it('lists all subjects in the rail', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    expect(screen.getByText('Math')).toBeTruthy()
    expect(screen.getByText('Physics')).toBeTruthy()
  })

  it('shows appointments due on the current day, sorted incomplete-first', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    const items = screen.getAllByTestId('school-appointment-item')
    expect(items.map((el) => el.textContent)).toEqual([
      expect.stringContaining('สอบเก็บคะแนน 1.1.1-2'),
      expect.stringContaining('1.1.3 Page 21'),
    ])
  })

  it('tapping a subject calls onOpenSubject with its id', () => {
    const onOpenSubject = vi.fn()
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={onOpenSubject} initialDate="2026-07-08" />)
    fireEvent.click(screen.getByText('Math'))
    expect(onOpenSubject).toHaveBeenCalledWith('math')
  })

  it('completing an appointment awards coins and toggles it', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    const [firstCheckbox] = screen.getAllByRole('checkbox')
    fireEvent.click(firstCheckbox)
    expect(addCoins).toHaveBeenCalledWith(5)
    expect(schoolState.toggleAppointment).toHaveBeenCalled()
  })

  it('advancing to the next day changes which appointments show', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    fireEvent.click(screen.getByLabelText('วันถัดไป'))
    expect(screen.queryByText(/1\.1\.3 Page 21/)).toBeNull()
  })

  it('marks an overdue incomplete appointment as overdue', () => {
    schoolState.appointments = [
      { id: 'a3', subjectId: 'math', title: 'Late homework', kind: 'homework', dueDate: '2026-07-05', completed: false, createdAt: 10, completedAt: null },
    ]
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-05" today="2026-07-08" />)
    expect(screen.getByTestId('school-appointment-item').className).toContain('school-overdue')
  })

  it('does not mark an appointment overdue when viewed date equals today', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" today="2026-07-08" />)
    const items = screen.getAllByTestId('school-appointment-item')
    expect(items.every((el) => !el.className.includes('school-overdue'))).toBe(true)
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<SchoolPanel onClose={onClose} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    fireEvent.click(screen.getByLabelText('ปิด'))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/school/SchoolPanel.test.jsx`
Expected: FAIL — `Cannot find module './SchoolPanel'` (or equivalent resolve error).

- [x] **Step 3: Write the implementation**

Create `src/components/school/SchoolPanel.jsx`:

```jsx
import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Plus, BookOpen, ClipboardCheck } from 'lucide-react'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useUserStore } from '../../stores/useUserStore'
import { appointmentsDueOn, isOverdue } from '../../utils/schoolDayView'

export const HOMEWORK_REWARD_COINS = 5

function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function SchoolPanel({ onClose, onOpenSubject, initialDate, today }) {
  const subjects = useSchoolStore((s) => s.subjects)
  const appointments = useSchoolStore((s) => s.appointments)
  const toggleAppointment = useSchoolStore((s) => s.toggleAppointment)
  const addSubject = useSchoolStore((s) => s.addSubject)
  const addCoins = useUserStore((s) => s.addCoins)

  const [date, setDate] = useState(
    initialDate ?? new Date().toISOString().slice(0, 10),
  )
  // "today" is fixed for the panel's lifetime (when it opened), independent of
  // `date` (which changes as the student browses other days) — an appointment
  // is only ever overdue relative to the real today, not the day being viewed.
  const todayStr = today ?? initialDate ?? new Date().toISOString().slice(0, 10)

  const dayItems = appointmentsDueOn(appointments, date)
  const subjectById = new Map(subjects.map((s) => [s.id, s]))

  function handleToggle(appt) {
    if (!appt.completed) addCoins(HOMEWORK_REWARD_COINS)
    toggleAppointment(appt.id)
  }

  function handleAddSubject() {
    const name = window.prompt('ชื่อวิชา')
    if (name && name.trim()) addSubject({ name: name.trim() })
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden md:max-w-2xl md:mx-auto lg:max-w-3xl"
      style={{ top: '10%' }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-ink rounded-full" />
      </div>

      <div className="px-4 pb-4 flex-1 min-h-0">
        <div className="rounded-xl bg-white border border-ink/10 overflow-hidden h-[82vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10">
            <div className="flex items-center gap-2">
              <button onClick={() => setDate((d) => shiftDate(d, -1))} aria-label="วันก่อนหน้า" className="text-ink-soft hover:text-ink p-1">
                <ChevronLeft size={18} />
              </button>
              <h2 className="thai-font text-sm text-ink">{formatDateLabel(date)}</h2>
              <button onClick={() => setDate((d) => shiftDate(d, 1))} aria-label="วันถัดไป" className="text-ink-soft hover:text-ink p-1">
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              onClick={onClose}
              aria-label="ปิด"
              className="neo-btn w-9 h-9 flex items-center justify-center rounded-lg bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X size={16} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Subject rail */}
            <div className="w-24 shrink-0 border-r border-ink/10 overflow-y-auto py-3 flex flex-col items-center gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => onOpenSubject(subject.id)}
                  className="w-full flex flex-col items-center gap-1 py-2 hover:bg-brand-soft transition-colors"
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: subject.color }}
                    aria-hidden="true"
                  >
                    {subject.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="thai-font text-[10px] text-ink truncate max-w-full px-1">{subject.name}</span>
                </button>
              ))}
              <button
                onClick={handleAddSubject}
                aria-label="เพิ่มวิชา"
                className="mt-1 w-8 h-8 rounded-full border-2 border-dashed border-brand/40 text-brand flex items-center justify-center"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Day view */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {dayItems.length === 0 ? (
                <p className="thai-font text-center text-sm text-ink-soft py-10">ไม่มีงานสำหรับวันนี้</p>
              ) : (
                dayItems.map((appt) => {
                  const subject = subjectById.get(appt.subjectId)
                  const overdue = isOverdue(appt, todayStr)
                  return (
                    <label
                      key={appt.id}
                      data-testid="school-appointment-item"
                      className={`neo-card flex items-center gap-3 p-3 ${appt.completed ? 'opacity-50' : ''} ${overdue ? 'school-overdue border-danger' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={appt.completed}
                        onChange={() => handleToggle(appt)}
                      />
                      {appt.kind === 'checkpoint'
                        ? <ClipboardCheck size={16} className={overdue ? 'text-danger shrink-0' : 'text-brand-strong shrink-0'} aria-hidden="true" />
                        : <BookOpen size={16} className={overdue ? 'text-danger shrink-0' : 'text-brand-strong shrink-0'} aria-hidden="true" />}
                      <span className="flex-1 min-w-0">
                        <span className={`thai-font text-sm block truncate ${appt.completed ? 'line-through text-ink-soft' : overdue ? 'text-danger' : 'text-ink'}`}>
                          {appt.title}
                        </span>
                        {subject && <span className="thai-font text-[10px] text-ink-soft">{subject.name}</span>}
                        {overdue && <span className="thai-font text-[10px] text-danger block">เลยกำหนดส่ง</span>}
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/school/SchoolPanel.test.jsx`
Expected: PASS — 8 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/school/SchoolPanel.jsx src/components/school/SchoolPanel.test.jsx
git commit -m "feat(school): SchoolPanel day view with subject rail and deadline-sorted appointments"
```

---

### Task 5: `SubjectDetailPanel` — weekly schedule + appointments CRUD

**Files:**
- Create: `src/components/school/SubjectDetailPanel.jsx`
- Test: `src/components/school/SubjectDetailPanel.test.jsx`

**Interfaces:**
- Consumes: `useSchoolStore` (Task 2), `DAY_KEYS` (Task 1).
- Produces: `<SubjectDetailPanel subjectId={id} onClose={fn} />` — full-screen panel (same shell as `SchoolPanel`) showing an editable subject name, a delete-subject action (calls `removeSubject` then `onClose`), the subject's weekly schedule slots, and its appointments, with add/remove for both.

- [x] **Step 1: Write the failing test**

Create `src/components/school/SubjectDetailPanel.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let schoolState
vi.mock('../../stores/useSchoolStore', () => ({
  useSchoolStore: (sel) => sel(schoolState),
}))

const { default: SubjectDetailPanel } = await import('./SubjectDetailPanel')

describe('SubjectDetailPanel', () => {
  beforeEach(() => {
    schoolState = {
      subjects: [{ id: 'math', name: 'Math', color: '#a78bda', description: '' }],
      scheduleSlots: [
        { id: 'slot1', subjectId: 'math', day: 'mon', startTime: '12:00', endTime: '13:00' },
        { id: 'slot2', subjectId: 'math', day: 'thu', startTime: '12:00', endTime: '13:00' },
      ],
      appointments: [
        { id: 'a1', subjectId: 'math', title: '1.1.3 Page 21', kind: 'homework', dueDate: '2026-07-10', completed: false, createdAt: 100, completedAt: null },
      ],
      addScheduleSlot: vi.fn(),
      removeScheduleSlot: vi.fn(),
      addAppointment: vi.fn(),
      removeAppointment: vi.fn(),
      toggleAppointment: vi.fn(),
      updateSubject: vi.fn(),
      removeSubject: vi.fn(),
    }
  })

  it('renders the subject name in the editable title field', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    expect(screen.getByLabelText('ชื่อวิชา').value).toBe('Math')
  })

  it('renaming the subject calls updateSubject on blur', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    const input = screen.getByLabelText('ชื่อวิชา')
    fireEvent.change(input, { target: { value: 'Advanced Math' } })
    fireEvent.blur(input)
    expect(schoolState.updateSubject).toHaveBeenCalledWith('math', { name: 'Advanced Math' })
  })

  it('deleting the subject calls removeSubject and onClose', () => {
    const onClose = vi.fn()
    render(<SubjectDetailPanel subjectId="math" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('ลบวิชา'))
    expect(schoolState.removeSubject).toHaveBeenCalledWith('math')
    expect(onClose).toHaveBeenCalled()
  })

  it('lists the weekly schedule slots', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    expect(screen.getByText(/mon.*12:00.*13:00/i)).toBeTruthy()
    expect(screen.getByText(/thu.*12:00.*13:00/i)).toBeTruthy()
  })

  it('lists the subject appointments', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    expect(screen.getByText('1.1.3 Page 21')).toBeTruthy()
  })

  it('removing a schedule slot calls removeScheduleSlot with its id', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    const removeButtons = screen.getAllByLabelText('ลบคาบเรียน')
    fireEvent.click(removeButtons[0])
    expect(schoolState.removeScheduleSlot).toHaveBeenCalledWith('slot1')
  })

  it('adding a schedule slot fills in the form and calls addScheduleSlot', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('วัน'), { target: { value: 'wed' } })
    fireEvent.change(screen.getByLabelText('เวลาเริ่ม'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('เวลาสิ้นสุด'), { target: { value: '10:00' } })
    fireEvent.click(screen.getByText('เพิ่มคาบเรียน'))
    expect(schoolState.addScheduleSlot).toHaveBeenCalledWith('math', { day: 'wed', startTime: '09:00', endTime: '10:00' })
  })

  it('adding an appointment fills in the form and calls addAppointment', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('หัวข้องาน'), { target: { value: 'Page 30' } })
    fireEvent.change(screen.getByLabelText('กำหนดส่ง'), { target: { value: '2026-07-15' } })
    fireEvent.click(screen.getByText('เพิ่มงาน'))
    expect(schoolState.addAppointment).toHaveBeenCalledWith('math', { title: 'Page 30', kind: 'homework', dueDate: '2026-07-15' })
  })

  it('removing an appointment calls removeAppointment with its id', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('ลบงาน'))
    expect(schoolState.removeAppointment).toHaveBeenCalledWith('a1')
  })
})
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/school/SubjectDetailPanel.test.jsx`
Expected: FAIL — `Cannot find module './SubjectDetailPanel'` (or equivalent resolve error).

- [x] **Step 3: Write the implementation**

Create `src/components/school/SubjectDetailPanel.jsx`:

```jsx
import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { DAY_KEYS } from '../../utils/schoolDayView'

const DAY_LABELS = { sun: 'sun', mon: 'mon', tue: 'tue', wed: 'wed', thu: 'thu', fri: 'fri', sat: 'sat' }

export default function SubjectDetailPanel({ subjectId, onClose }) {
  const subject = useSchoolStore((s) => s.subjects.find((sub) => sub.id === subjectId))
  const scheduleSlots = useSchoolStore((s) => s.scheduleSlots.filter((sl) => sl.subjectId === subjectId))
  const appointments = useSchoolStore((s) => s.appointments.filter((a) => a.subjectId === subjectId))
  const addScheduleSlot = useSchoolStore((s) => s.addScheduleSlot)
  const removeScheduleSlot = useSchoolStore((s) => s.removeScheduleSlot)
  const addAppointment = useSchoolStore((s) => s.addAppointment)
  const removeAppointment = useSchoolStore((s) => s.removeAppointment)
  const toggleAppointment = useSchoolStore((s) => s.toggleAppointment)
  const updateSubject = useSchoolStore((s) => s.updateSubject)
  const removeSubject = useSchoolStore((s) => s.removeSubject)

  const [nameDraft, setNameDraft] = useState(subject?.name ?? '')

  const [slotDay, setSlotDay] = useState('mon')
  const [slotStart, setSlotStart] = useState('12:00')
  const [slotEnd, setSlotEnd] = useState('13:00')

  const [apptTitle, setApptTitle] = useState('')
  const [apptKind, setApptKind] = useState('homework')
  const [apptDue, setApptDue] = useState('')

  if (!subject) return null

  function handleRenameBlur() {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== subject.name) updateSubject(subjectId, { name: trimmed })
  }

  function handleDeleteSubject() {
    removeSubject(subjectId)
    onClose()
  }

  function handleAddSlot() {
    addScheduleSlot(subjectId, { day: slotDay, startTime: slotStart, endTime: slotEnd })
  }

  function handleAddAppointment() {
    if (!apptTitle.trim() || !apptDue) return
    addAppointment(subjectId, { title: apptTitle.trim(), kind: apptKind, dueDate: apptDue })
    setApptTitle('')
    setApptDue('')
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden md:max-w-2xl md:mx-auto lg:max-w-3xl"
      style={{ top: '10%' }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-ink rounded-full" />
      </div>

      <div className="px-4 pb-4 flex-1 min-h-0">
        <div className="rounded-xl bg-white border border-ink/10 overflow-hidden h-[82vh] flex flex-col">
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-ink/10">
            <input
              aria-label="ชื่อวิชา"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={handleRenameBlur}
              className="thai-font text-sm text-ink bg-transparent border-b-2 border-transparent focus:border-brand outline-none flex-1 min-w-0"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleDeleteSubject} aria-label="ลบวิชา" className="text-ink-soft hover:text-danger p-2">
                <Trash2 size={16} />
              </button>
              <button
                onClick={onClose}
                aria-label="ปิด"
                className="neo-btn w-9 h-9 flex items-center justify-center rounded-lg bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X size={16} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Schedule */}
            <section>
              <h3 className="pixel-font text-[10px] text-ink-soft mb-2">Schedule</h3>
              <ul className="space-y-1 mb-3">
                {scheduleSlots.map((slot) => (
                  <li key={slot.id} className="neo-card flex items-center justify-between p-2">
                    <span className="thai-font text-sm text-ink">
                      {DAY_LABELS[slot.day]}. {slot.startTime} - {slot.endTime}
                    </span>
                    <button onClick={() => removeScheduleSlot(slot.id)} aria-label="ลบคาบเรียน" className="text-ink-soft hover:text-danger p-1">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 items-end flex-wrap">
                <label className="flex flex-col text-[10px] thai-font text-ink-soft">
                  วัน
                  <select
                    aria-label="วัน"
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className="neo-input px-2 py-1 text-sm"
                  >
                    {DAY_KEYS.map((day) => (
                      <option key={day} value={day}>{DAY_LABELS[day]}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-[10px] thai-font text-ink-soft">
                  เวลาเริ่ม
                  <input aria-label="เวลาเริ่ม" type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="neo-input px-2 py-1 text-sm" />
                </label>
                <label className="flex flex-col text-[10px] thai-font text-ink-soft">
                  เวลาสิ้นสุด
                  <input aria-label="เวลาสิ้นสุด" type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="neo-input px-2 py-1 text-sm" />
                </label>
                <button onClick={handleAddSlot} className="neo-btn rounded-lg bg-brand-soft px-3 py-1.5 text-sm thai-font text-ink">
                  เพิ่มคาบเรียน
                </button>
              </div>
            </section>

            {/* Appointments */}
            <section>
              <h3 className="pixel-font text-[10px] text-ink-soft mb-2">Appointment</h3>
              <ul className="space-y-1 mb-3">
                {appointments.map((appt) => (
                  <li key={appt.id} className="neo-card flex items-center gap-2 p-2">
                    <input type="checkbox" checked={appt.completed} onChange={() => toggleAppointment(appt.id)} />
                    <span className={`flex-1 thai-font text-sm text-ink ${appt.completed ? 'line-through text-ink-soft' : ''}`}>
                      {appt.title} · {appt.dueDate}
                    </span>
                    <button onClick={() => removeAppointment(appt.id)} aria-label="ลบงาน" className="text-ink-soft hover:text-danger p-1">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 items-end flex-wrap">
                <label className="flex flex-col text-[10px] thai-font text-ink-soft flex-1 min-w-32">
                  หัวข้องาน
                  <input
                    aria-label="หัวข้องาน"
                    value={apptTitle}
                    onChange={(e) => setApptTitle(e.target.value)}
                    className="neo-input px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex flex-col text-[10px] thai-font text-ink-soft">
                  ประเภท
                  <select value={apptKind} onChange={(e) => setApptKind(e.target.value)} className="neo-input px-2 py-1 text-sm">
                    <option value="homework">Homework</option>
                    <option value="checkpoint">Checkpoint</option>
                  </select>
                </label>
                <label className="flex flex-col text-[10px] thai-font text-ink-soft">
                  กำหนดส่ง
                  <input aria-label="กำหนดส่ง" type="date" value={apptDue} onChange={(e) => setApptDue(e.target.value)} className="neo-input px-2 py-1 text-sm" />
                </label>
                <button onClick={handleAddAppointment} className="neo-btn rounded-lg bg-brand-soft px-3 py-1.5 text-sm thai-font text-ink">
                  เพิ่มงาน
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/school/SubjectDetailPanel.test.jsx`
Expected: PASS — 9 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/school/SubjectDetailPanel.jsx src/components/school/SubjectDetailPanel.test.jsx
git commit -m "feat(school): SubjectDetailPanel for weekly schedule and appointment CRUD"
```

---

### Task 6: Wire School into HomePage's Quick Rail

**Files:**
- Modify: `src/constants/appViews.js`
- Modify: `src/pages/HomePage.jsx`

**Interfaces:**
- Consumes: `APP_VIEWS`, `SchoolPanel` (Task 4), `SubjectDetailPanel` (Task 5).
- Produces: a reachable School entry point — no test file (there is no `HomePage.test.jsx` in the repo today; this task is closed out by the manual verification in Task 7).

- [x] **Step 1: Add the view constant**

In `src/constants/appViews.js`, add `SCHOOL: 'school',` to the `APP_VIEWS` object, after `SKILL: 'skill',`:

```js
  SKILL: 'skill',
  SCHOOL: 'school',
```

- [x] **Step 2: Import the panels and add state for the open subject**

In `src/pages/HomePage.jsx`, add to the icon imports (the `lucide-react` import line at the top): add `GraduationCap` to the destructured import list, so the line reads:

```js
import { Calendar, MessageCircle, Map, Newspaper, Trophy, Flame, Play, Pause, Music, Gamepad2, GraduationCap } from 'lucide-react'
```

Add two new component imports after `import MasteryPopup from '../components/MasteryPopup'`:

```js
import SchoolPanel from '../components/school/SchoolPanel'
import SubjectDetailPanel from '../components/school/SubjectDetailPanel'
```

Inside the `HomePage` function, add state for which subject's detail panel is open, alongside the other `useState` calls near the top (after `const [chatInitialView, setChatInitialView] = useState('list')`):

```js
  const [openSubjectId, setOpenSubjectId] = useState(null)
```

- [x] **Step 3: Add the Quick Rail icon**

In the Quick Rail block (the `<div className="absolute top-20 left-4 z-20 ...">`), add a new button after the Roadmap button and before the conditional News button:

```jsx
        <button
          onClick={() => handleTabChange(APP_VIEWS.SCHOOL)}
          aria-label="เปิดตารางเรียน"
          className="neo-btn w-12 h-12 rounded-lg bg-hud flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <GraduationCap size={22} strokeWidth={2.5} className="text-ink" />
        </button>
```

- [x] **Step 4: Render the panels**

In the `{/* ── PANELS ── */}` section, add after the `{activeTab === APP_VIEWS.SKILL && (...)}` block:

```jsx
      {activeTab === APP_VIEWS.SCHOOL && !openSubjectId && (
        <SchoolPanel
          onClose={closePanel}
          onOpenSubject={setOpenSubjectId}
          initialDate={new Date().toISOString().slice(0, 10)}
          today={new Date().toISOString().slice(0, 10)}
        />
      )}
      {activeTab === APP_VIEWS.SCHOOL && openSubjectId && (
        <SubjectDetailPanel subjectId={openSubjectId} onClose={() => setOpenSubjectId(null)} />
      )}
```

- [x] **Step 5: Manually verify in the browser**

Run: `npm run dev`, sign in, on the Home screen click the new graduation-cap Quick Rail icon.
Expected: `SchoolPanel` opens showing an empty subject rail and "ไม่มีงานสำหรับวันนี้". Click the dashed "+" button in the rail, type a subject name (e.g. "Math") into the prompt — it appears in the rail. Click the new subject avatar — `SubjectDetailPanel` opens showing that subject's name, empty Schedule and Appointment sections. Add a schedule slot and an appointment using the forms; both appear in their lists. Click the panel's close (X) — returns to `SchoolPanel`; the day view still shows nothing for today unless the appointment's due date was today. Close `SchoolPanel` — returns to Home.

- [x] **Step 6: Commit**

```bash
git add src/constants/appViews.js src/pages/HomePage.jsx
git commit -m "feat(school): reach School System from HomePage's Quick Rail"
```

---

### Task 7: Full verification + docs close-out

**Files:**
- Modify: `CONTEXT.md` (Domain Vocabulary + Project Layout)

- [x] **Step 1: Run the entire unit suite**

Run: `npm test`
Expected: all suites pass, including the new `schoolDayView.test.js`, `useSchoolStore.test.js`, `SchoolPanel.test.jsx`, `SubjectDetailPanel.test.jsx`, and the updated `sessionBootstrap.test.js`. If a run reports unrelated files timing out under full parallel load (a known flake in this environment — see the verification log in `docs/superpowers/plans/2026-07-07-tcas70-data-resilience.md`), re-run just the failed files in isolation to confirm before treating anything as a real regression.

- [x] **Step 2: Run lint**

Run: `npm run lint`
Expected: zero errors in any file this epic touched (`src/utils/schoolDayView.js`, `src/stores/useSchoolStore.js`, `src/lib/syncManager.js`, `src/services/sessionBootstrap.js`, `src/components/school/*.jsx`, `src/constants/appViews.js`, `src/pages/HomePage.jsx`). The repo has pre-existing lint issues elsewhere — do not fix unrelated files as part of this task.

- [x] **Step 3: Firestore rules sanity check**

Run: `npm run test:rules:emu`
Expected: all existing rules tests pass, including `users update rule (C-2) > allows a user to edit arbitrary fields on their OWN doc` (`test/rules/firestore.rules.test.js:35`) — this is the test that already covers writes to the new `school` field, since it asserts arbitrary-field writes to one's own doc succeed. No new rules test is needed or added.

- [x] **Step 4: Document the new domain terms**

In `CONTEXT.md`, in the **Domain Vocabulary** table, add these rows after the **Personal Map** row (keep alphabetical-ish grouping loose, matching the existing table's style):

```
| **Subject** | A School System entry (`{ id, name, color, description }`) representing one class/course. Owns weekly **Schedule slots** and **Appointments**. Persisted at `users/{uid}.school.subjects` via `useSchoolStore` |
| **Schedule slot** | A recurring weekly time block for a Subject: `{ id, subjectId, day, startTime, endTime }`. `day` is one of `sun`..`sat`; does not carry a specific calendar date |
| **Appointment** | A dated School System item under a Subject — homework or a graded checkpoint: `{ id, subjectId, title, kind, dueDate, completed, createdAt, completedAt }`. `kind` is `homework` or `checkpoint`. Completing one awards Coins and a streak stack the same way a Task does |
```

In the **Project Layout** tree, add a line for the new `components/school/` folder, after the `components/roadmap/` line:

```
    │   ├── school/             SchoolPanel (day view), SubjectDetailPanel (schedule + appointments)
```

- [x] **Step 5: Commit**

```bash
git add CONTEXT.md
git commit -m "docs(context): document School System domain vocabulary"
```

---

## Out of Scope (deliberate simplifications)

- **Overdue carry-forward.** An overdue, incomplete appointment is visually flagged only when viewing the day it was due — it does not automatically reappear in "today"'s view once its date has passed. A student has to browse back to see it flagged. Carrying overdue items forward is a reasonable follow-up but adds day-view merge complexity this epic doesn't need yet.
- **Day navigation is tap arrows, not scroll/swipe.** The PRD wireframe suggests scrolling to change day; this plan uses `< >` buttons (`ChevronLeft`/`ChevronRight`), which are simpler, keyboard/screen-reader accessible, and trivially testable. A swipe gesture can be layered on top later without changing the data flow.
- **Notebook and TCAS Calendar** are separate PRD epics (C and D) and are untouched here — no notebook text field, no "Add to Calendar" action exists yet.
- **Subject description editing** has no UI in this epic — `addSubject` accepts a `description` field (for forward compatibility) but the create flow (a plain `window.prompt` for the name) and `SubjectDetailPanel` don't expose it. Only `name` is editable post-creation.
- **Pixel-perfect wireframe fidelity** is intentionally not attempted — screens use the existing design system (`neo-card`, `neo-btn`, pixel/thai fonts) for a complete, functional, tested result. Visual polish matching the wireframe is Cursor's job per `CLAUDE.md`'s collaboration model.

---

## Cursor Conversation Prompts

Per the collaboration model (Claude Code plans, Cursor implements), run one Cursor conversation per prompt, in order. Each prompt assumes a fresh conversation with zero context.

**Conversation 1 — Tasks 1 + 2:**
> Read `docs/superpowers/plans/2026-07-08-school-system.md` and execute **Task 1 (pure day-view helpers)** and **Task 2 (useSchoolStore)** exactly as written, step by step, checking off checkboxes as you go. TDD: write the failing test first, run it, then implement. Obey the plan's Global Constraints (no TypeScript, no new sync mechanism, no new Firestore document type). Commit after each task with the exact messages given.

**Conversation 2 — Task 3:**
> Read `docs/superpowers/plans/2026-07-08-school-system.md` and execute **Task 3 (Firestore sync + session bootstrap wiring)** exactly as written, step by step. This only modifies existing files (`syncManager.js`, `sessionBootstrap.js`, `sessionBootstrap.test.js`) — follow the exact insertion points named in the plan rather than restructuring those files. Commit with the exact message given.

**Conversation 3 — Tasks 4 + 5:**
> Read `docs/superpowers/plans/2026-07-08-school-system.md` and execute **Task 4 (SchoolPanel)** and **Task 5 (SubjectDetailPanel)** exactly as written, TDD, step by step. Both components live in a new `src/components/school/` folder. Keep to the existing Tailwind token classes (`neo-card`, `neo-btn`, `thai-font`, `pixel-font`) — no new design tokens. Commit after each task with the exact messages given.

**Conversation 4 — Task 6:**
> Read `docs/superpowers/plans/2026-07-08-school-system.md` and execute **Task 6 (wire School into HomePage's Quick Rail)** exactly as written. There is no automated test for this task — do the manual browser verification described in Step 5 and report what you saw before committing. Commit with the exact message given.

**Conversation 5 — Task 7:**
> Read `docs/superpowers/plans/2026-07-08-school-system.md` and execute **Task 7 (full verification + docs)**. Run `npm test`, `npm run lint`, and `npm run test:rules:emu`; update `CONTEXT.md` as specified; commit. If the full test suite shows failures in files unrelated to this epic, re-run those specific files in isolation before concluding whether it's a real regression — this environment has known parallel-worker flakiness (see the Epic A plan's verification log). Report any genuinely failing test verbatim instead of patching around it.

---

## Verification Log (2026-07-08)

All 7 tasks were implemented and committed via Cursor (commits `36a5fb8`..`196ef22`). Note: the Task 7 docs commit (`12bc887`) landed chronologically *before* Tasks 4-6, so its `npm test`/lint run could not have covered `SchoolPanel`/`SubjectDetailPanel`/the HomePage wiring. Independently re-verified the complete, final state:

- **Full suite** (`npx vitest run`): clean single run, 118/118 test files, 688/688 tests passing — no flakiness this time, includes all new School System suites (`schoolDayView.test.js`, `useSchoolStore.test.js`, `SchoolPanel.test.jsx`, `SubjectDetailPanel.test.jsx`) and the updated `sessionBootstrap.test.js`.
- **Lint**: zero errors in any file this epic touched (`useSchoolStore.js`, `schoolDayView.js`, `syncManager.js`, `sessionBootstrap.js`, `SchoolPanel.jsx`, `SubjectDetailPanel.jsx`, `appViews.js`, `HomePage.jsx`). The same ~900 pre-existing lint problems remain elsewhere, unrelated to this epic.
- **Code review against the plan**: read `useSchoolStore.js`, `SchoolPanel.jsx`, `SubjectDetailPanel.jsx`, and the diffs for `syncManager.js`/`sessionBootstrap.js`/`HomePage.jsx`/`appViews.js` — all match the plan's specified interfaces and insertion points exactly. One suspected gap (`closePanel()` not resetting `openSubjectId`, which would strand the panel on `SubjectDetailPanel` on next open) turned out to already be handled — Cursor added `setOpenSubjectId(null)` to `closePanel()` in the same Task 6 commit, beyond what the plan explicitly spelled out.
- **Compile check**: with the dev server running, fetched `/src/pages/HomePage.jsx` and `/src/components/school/SchoolPanel.jsx` through Vite's dev transform endpoint — both return HTTP 200 with valid transformed modules, confirming no import/syntax errors.
- **Manual browser click-through was not performed** — this environment has no browser automation tool available in this session. The functional claims above rest on the passing component-interaction tests (which exercise real component code — clicking checkboxes, typing into forms, day navigation — against mocked stores) plus the clean compile check, not on an actual signed-in browser session. Flagging this explicitly rather than claiming a full manual verification that didn't happen.
- **Firestore rules**: not re-run via the emulator (`npm run test:rules:emu`) — as reasoned in the plan, the existing generic test `allows a user to edit arbitrary fields on their OWN doc` (`test/rules/firestore.rules.test.js:35`) already covers the new `school` field by construction, since no rules file changed.
