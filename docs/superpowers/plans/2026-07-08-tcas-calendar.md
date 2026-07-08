# TCAS Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin-curated TCAS70 events calendar students can browse as a timeline (passed/upcoming) inside the News panel, with an "Add to Calendar" button that copies an event into their School System day view — shipped before TCAS70 registration opens (~15 July 2026).

**Architecture:** A new `tcasEvents` Firestore collection, curated **in-panel** by the admin exactly like the existing RollerCoaster updates tab (`useNewsStore` pattern: real-time listener + `addDoc`/`deleteDoc`, admin gated by `ADMIN_UID`) — no new AdminPage section. A new third tab in `NewsPanel` renders the timeline via a pure split helper. "Add to Calendar" reuses `useSchoolStore.addAppointment` with `subjectId: null` and a new `kind: 'tcas'`, so events surface in the SchoolPanel day view with zero new merge logic.

**Tech Stack:** Zustand, Firestore (`addDoc`/`deleteDoc` + `createFirestoreListener`), Vitest + jsdom, React, Tailwind v4 tokens, lucide-react.

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- **Firebase paths only via `src/lib/db.js`** — add `refs.tcasEvent`, `cols.tcasEvents`, `queries.tcasEventsByDate` there; never inline `doc(db, ...)`.
- **Mirror `useNewsStore`** (`src/stores/useNewsStore.js`) for the events store: `createFirestoreListener` slot, `subscribe*` returning the unsubscribe, async `add*`/`delete*`. Note its stable-reference caching comment — the same getSnapshot-loop class of bug just hit `SubjectDetailPanel` (fixed in `e1d67fe`): **selectors must select raw store fields; derive views during render.**
- **Firestore rules**: `tcasEvents` = read for signed-in users, write super-admin only. Also add the missing `appUpdates` block (same access shape) — the repo rules file currently has NO match for `appUpdates`, drifted from the live console rules.
- **Student-facing copy is Thai**; `thai-font`/`pixel-font`/`neo-*` classes; no new tokens.
- **No student-writable state in the calendar itself** — "Add to Calendar" writes only into the student's own School System appointments.
- Current cycle label: **TCAS70** (Buddhist year 2570).

**Background:** PRD issue #36 Epic D (stories 23–27). Wireframe: "TCAS70 Calendar" timeline list with per-event Readmore + detail screen with "Add to Calendar". Time-sensitive: TCAS70 registration opens ~15 Jul 2026.

**Data model:**

```js
// tcasEvents/{id}: { title, description, date: 'YYYY-MM-DD', link: string|null, createdAt: serverTimestamp }
// Copied appointment: addAppointment(null, { title, kind: 'tcas', dueDate: date })
```

---

### Task 1: db.js paths + Firestore rules + rules tests

**Files:**
- Modify: `src/lib/db.js`
- Modify: `firestore.rules`
- Modify: `test/rules/firestore.rules.test.js`

**Interfaces:**
- Produces: `refs.tcasEvent(id)` → DocumentRef; `cols.tcasEvents` → CollectionRef; `queries.tcasEventsByDate()` → Query ordered by `date` asc.

- [ ] **Step 1: Add the paths to `src/lib/db.js`**

In `refs`, after `appUpdate:   (id)             => doc(db, 'appUpdates', id),`:

```js
  tcasEvent:   (id)             => doc(db, 'tcasEvents', id),
```

In `cols`, after `appUpdates:   collection(db, 'appUpdates'),`:

```js
  tcasEvents:   collection(db, 'tcasEvents'),
```

In `queries`, after `appUpdatesByDate: ...`:

```js
  tcasEventsByDate: () => query(cols.tcasEvents, orderBy('date', 'asc')),
```

- [ ] **Step 2: Add rules blocks**

In `firestore.rules`, after the `/farmShops/` block (before the closing braces):

```
    // Admin-curated content feeds: app updates (News tab) and TCAS calendar
    // events. Signed-in users read; only the super-admin writes (in-panel
    // forms gate on ADMIN_UID client-side; these rules are the real gate).
    match /appUpdates/{updateId} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin();
    }
    match /tcasEvents/{eventId} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin();
    }
```

- [ ] **Step 3: Write rules tests**

Append to `test/rules/firestore.rules.test.js` (inside the file's top-level scope, after the existing describes; reuse the existing `testEnv` + `SUPER_UID`):

```js
describe('tcasEvents rules', () => {
  it('allows a signed-in user to read events', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'tcasEvents/e1'), { title: 'สมัคร TCAS70', date: '2026-07-15' })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'tcasEvents/e1')))
  })

  it('BLOCKS a non-admin write', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'tcasEvents/e2'), { title: 'hack', date: '2026-01-01' }))
  })

  it('allows the super-admin to write', async () => {
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(setDoc(doc(admin, 'tcasEvents/e3'), { title: 'ประกาศผล', date: '2026-12-01' }))
  })
})
```

- [ ] **Step 4: Run the rules suite**

Run: `npm run test:rules:emu`
Expected: PASS — all existing cases plus the 3 new ones. (Requires the Firebase emulators; if the CLI isn't available, flag to the human and continue.)

- [ ] **Step 5: Deploy rules**

Run: `firebase deploy --only firestore:rules`
Expected: `Deploy complete!` (Diff against console first per the rules file's header note; the new `appUpdates` block must match what's live or be strictly compatible.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.js firestore.rules test/rules/firestore.rules.test.js
git commit -m "feat(tcas-calendar): tcasEvents collection paths + rules (and missing appUpdates rules block)"
```

---

### Task 2: Pure timeline-split helper

**Files:**
- Create: `src/utils/tcasCalendar.js`
- Test: `src/utils/tcasCalendar.test.js`

**Interfaces:**
- Produces: `splitTcasEvents(events, todayStr)` → `{ passed, upcoming }` — `passed`: `date < todayStr` sorted asc; `upcoming`: `date >= todayStr` sorted asc.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/tcasCalendar.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { splitTcasEvents } from './tcasCalendar'

const EVENTS = [
  { id: 'e3', title: 'สอบ TGAT', date: '2026-12-13' },
  { id: 'e1', title: 'ลงทะเบียน myTCAS', date: '2026-07-15' },
  { id: 'e0', title: 'ประกาศ Blueprint', date: '2026-06-01' },
  { id: 'e2', title: 'สมัครสอบ', date: '2026-10-28' },
]

describe('splitTcasEvents', () => {
  it('splits passed (date < today) from upcoming (date >= today)', () => {
    const { passed, upcoming } = splitTcasEvents(EVENTS, '2026-07-15')
    expect(passed.map((e) => e.id)).toEqual(['e0'])
    expect(upcoming.map((e) => e.id)).toEqual(['e1', 'e2', 'e3'])
  })

  it('counts an event dated exactly today as upcoming', () => {
    const { upcoming } = splitTcasEvents(EVENTS, '2026-07-15')
    expect(upcoming[0].id).toBe('e1')
  })

  it('sorts both halves by date ascending', () => {
    const { passed } = splitTcasEvents(EVENTS, '2027-01-01')
    expect(passed.map((e) => e.date)).toEqual(['2026-06-01', '2026-07-15', '2026-10-28', '2026-12-13'])
  })

  it('handles an empty list', () => {
    expect(splitTcasEvents([], '2026-07-15')).toEqual({ passed: [], upcoming: [] })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/utils/tcasCalendar.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/utils/tcasCalendar.js`:

```js
// Pure timeline logic for the TCAS Calendar — no imports, no I/O.

export function splitTcasEvents(events, todayStr) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))
  return {
    passed: sorted.filter((e) => e.date < todayStr),
    upcoming: sorted.filter((e) => e.date >= todayStr),
  }
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/utils/tcasCalendar.test.js` → PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/tcasCalendar.js src/utils/tcasCalendar.test.js
git commit -m "feat(tcas-calendar): pure passed/upcoming timeline split helper"
```

---

### Task 3: `useTcasEventsStore`

**Files:**
- Create: `src/stores/useTcasEventsStore.js`
- Test: `src/stores/useTcasEventsStore.test.js`

**Interfaces:**
- Consumes: `cols.tcasEvents`, `refs.tcasEvent`, `queries.tcasEventsByDate` (Task 1); `createFirestoreListener` (existing).
- Produces: `events: []`, `subscribeEvents()` → unsubscribe, `addEvent({ title, description, date, link })` → Promise, `deleteEvent(id)` → Promise.

- [ ] **Step 1: Write the failing tests**

Create `src/stores/useTcasEventsStore.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  attach: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  addDoc: (...a) => m.addDoc(...a),
  deleteDoc: (...a) => m.deleteDoc(...a),
  serverTimestamp: () => 'server-ts',
}))
vi.mock('../lib/db', () => ({
  cols: { tcasEvents: { _col: 'tcasEvents' } },
  refs: { tcasEvent: (id) => ({ _path: `tcasEvents/${id}` }) },
  queries: { tcasEventsByDate: () => ({ _query: 'byDate' }) },
}))
vi.mock('../lib/firestoreListener', () => ({
  createFirestoreListener: () => ({ attach: (...a) => m.attach(...a) }),
}))

const { useTcasEventsStore } = await import('./useTcasEventsStore')

describe('useTcasEventsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTcasEventsStore.setState({ events: [] })
  })

  it('subscribeEvents attaches a listener that maps docs into events', () => {
    m.attach.mockImplementation((query, cb) => {
      cb({ docs: [{ id: 'e1', data: () => ({ title: 'สมัคร TCAS70', date: '2026-07-15' }) }] })
      return () => {}
    })
    useTcasEventsStore.getState().subscribeEvents()
    expect(m.attach).toHaveBeenCalledWith({ _query: 'byDate' }, expect.any(Function))
    expect(useTcasEventsStore.getState().events).toEqual([
      { id: 'e1', title: 'สมัคร TCAS70', date: '2026-07-15' },
    ])
  })

  it('addEvent writes a trimmed doc with a server timestamp and null-able link', async () => {
    await useTcasEventsStore.getState().addEvent({
      title: '  ลงทะเบียน  ', description: ' คำอธิบาย ', date: '2026-07-15', link: '',
    })
    expect(m.addDoc).toHaveBeenCalledWith({ _col: 'tcasEvents' }, {
      title: 'ลงทะเบียน',
      description: 'คำอธิบาย',
      date: '2026-07-15',
      link: null,
      createdAt: 'server-ts',
    })
  })

  it('deleteEvent deletes by ref', async () => {
    await useTcasEventsStore.getState().deleteEvent('e9')
    expect(m.deleteDoc).toHaveBeenCalledWith({ _path: 'tcasEvents/e9' })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/stores/useTcasEventsStore.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/stores/useTcasEventsStore.js`:

```js
import { create } from 'zustand'
import { addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { cols, refs, queries } from '../lib/db'
import { createFirestoreListener } from '../lib/firestoreListener'

// Mirrors useNewsStore: shared listener slot, admin-gated add/delete.
const eventsListener = createFirestoreListener()

export const useTcasEventsStore = create((set) => ({
  events: [], // [{ id, title, description, date: 'YYYY-MM-DD', link }] ordered by date asc

  subscribeEvents: () =>
    eventsListener.attach(queries.tcasEventsByDate(), (snap) => {
      set({ events: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
    }),

  addEvent: async ({ title, description, date, link }) => {
    await addDoc(cols.tcasEvents, {
      title: title.trim(),
      description: description.trim(),
      date,
      link: link?.trim() || null,
      createdAt: serverTimestamp(),
    })
  },

  deleteEvent: async (id) => {
    await deleteDoc(refs.tcasEvent(id))
  },
}))
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/stores/useTcasEventsStore.test.js` → PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stores/useTcasEventsStore.js src/stores/useTcasEventsStore.test.js
git commit -m "feat(tcas-calendar): useTcasEventsStore mirroring the news updates pattern"
```

---

### Task 4: School System accepts subject-less TCAS appointments

**Files:**
- Modify: `src/stores/useSchoolStore.test.js` (test only — implementation already supports it)
- Modify: `src/components/school/SchoolPanel.jsx` + `src/components/school/SchoolPanel.test.jsx`

**Interfaces:**
- Locks in: `addAppointment(null, { title, kind: 'tcas', dueDate })` is a supported call; SchoolPanel renders `kind: 'tcas'` items with a calendar icon and no subject line.

- [ ] **Step 1: Write the failing/locking tests**

Append to `src/stores/useSchoolStore.test.js` (inside the main describe):

```js
  it('accepts a subject-less TCAS appointment (Add to Calendar path)', () => {
    const id = useSchoolStore.getState().addAppointment(null, {
      title: 'ลงทะเบียน myTCAS', kind: 'tcas', dueDate: '2026-07-15',
    })
    expect(useSchoolStore.getState().appointments[0]).toMatchObject({
      id, subjectId: null, kind: 'tcas', dueDate: '2026-07-15', completed: false,
    })
  })
```

Append to `src/components/school/SchoolPanel.test.jsx` (inside the main describe):

```js
  it('renders a TCAS appointment with the calendar icon and no subject line', () => {
    schoolState.appointments = [
      { id: 't1', subjectId: null, title: 'ลงทะเบียน myTCAS', kind: 'tcas', dueDate: '2026-07-08', completed: false, createdAt: 1, completedAt: null },
    ]
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    const item = screen.getByTestId('school-appointment-item')
    expect(item.textContent).toContain('ลงทะเบียน myTCAS')
    expect(item.querySelector('.lucide-calendar-days')).toBeTruthy()
  })
```

- [ ] **Step 2: Run to verify** — `npx vitest run src/stores/useSchoolStore.test.js src/components/school/SchoolPanel.test.jsx`
Expected: the store test PASSES already (locks the contract); the SchoolPanel icon test FAILS (no calendar icon yet).

- [ ] **Step 3: Implement the icon**

In `src/components/school/SchoolPanel.jsx`, add `CalendarDays` to the lucide import, then replace the two-way icon ternary in the day-view item:

```jsx
                      {appt.kind === 'tcas'
                        ? <CalendarDays size={16} className={overdue ? 'text-danger shrink-0' : 'text-brand-strong shrink-0'} aria-hidden="true" />
                        : appt.kind === 'checkpoint'
                        ? <ClipboardCheck size={16} className={overdue ? 'text-danger shrink-0' : 'text-brand-strong shrink-0'} aria-hidden="true" />
                        : <BookOpen size={16} className={overdue ? 'text-danger shrink-0' : 'text-brand-strong shrink-0'} aria-hidden="true" />}
```

- [ ] **Step 4: Run to verify pass** — same command → all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/useSchoolStore.test.js src/components/school/SchoolPanel.jsx src/components/school/SchoolPanel.test.jsx
git commit -m "feat(tcas-calendar): School System renders subject-less TCAS appointments"
```

---

### Task 5: `TcasCalendarTab` — timeline + detail + Add to Calendar + admin CRUD

**Files:**
- Create: `src/components/TcasCalendarTab.jsx`
- Test: `src/components/TcasCalendarTab.test.jsx`
- Create: `src/components/TcasCalendarTab.integration.test.jsx`

**Interfaces:**
- Consumes: `useTcasEventsStore` (Task 3), `splitTcasEvents` (Task 2), `useSchoolStore.addAppointment` (Task 4), `useAuthStore` + `ADMIN_UID` (existing).
- Produces: `<TcasCalendarTab today={string} />` — rendered by NewsPanel inside its scrollable body (Task 6). Subscribes on mount. **Selectors select raw fields only** (getSnapshot-loop rule).

- [ ] **Step 1: Write the failing tests**

Create `src/components/TcasCalendarTab.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let eventsState
const subscribeEvents = vi.fn(() => () => {})
vi.mock('../stores/useTcasEventsStore', () => ({
  useTcasEventsStore: Object.assign((sel) => sel(eventsState), {
    getState: () => eventsState,
  }),
}))

const addAppointment = vi.fn()
vi.mock('../stores/useSchoolStore', () => ({
  useSchoolStore: Object.assign((sel) => sel({ addAppointment }), {
    getState: () => ({ addAppointment }),
  }),
}))

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

const { default: TcasCalendarTab } = await import('./TcasCalendarTab')

const EVENTS = [
  { id: 'e0', title: 'ประกาศ Blueprint', description: 'รายละเอียด blueprint', date: '2026-06-01', link: null },
  { id: 'e1', title: 'ลงทะเบียน myTCAS', description: 'เปิดลงทะเบียน', date: '2026-07-15', link: 'https://mytcas.com' },
]

describe('TcasCalendarTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState = { user: { uid: 'student-1' } }
    eventsState = {
      events: EVENTS,
      subscribeEvents,
      addEvent: vi.fn(),
      deleteEvent: vi.fn(),
    }
  })

  it('subscribes to events on mount', () => {
    render(<TcasCalendarTab today="2026-07-08" />)
    expect(subscribeEvents).toHaveBeenCalled()
  })

  it('splits events into passed and upcoming sections', () => {
    render(<TcasCalendarTab today="2026-07-08" />)
    expect(screen.getByText('ประกาศ Blueprint').closest('[data-testid="tcas-passed"]')).toBeTruthy()
    expect(screen.getByText('ลงทะเบียน myTCAS').closest('[data-testid="tcas-upcoming"]')).toBeTruthy()
  })

  it('expanding an event shows its description and Add to Calendar', () => {
    render(<TcasCalendarTab today="2026-07-08" />)
    fireEvent.click(screen.getByText('ลงทะเบียน myTCAS'))
    expect(screen.getByText('เปิดลงทะเบียน')).toBeTruthy()
    expect(screen.getByText('Add to Calendar')).toBeTruthy()
  })

  it('Add to Calendar copies the event into School appointments as kind tcas', () => {
    render(<TcasCalendarTab today="2026-07-08" />)
    fireEvent.click(screen.getByText('ลงทะเบียน myTCAS'))
    fireEvent.click(screen.getByText('Add to Calendar'))
    expect(addAppointment).toHaveBeenCalledWith(null, {
      title: 'ลงทะเบียน myTCAS', kind: 'tcas', dueDate: '2026-07-15',
    })
    expect(screen.getByText('เพิ่มลงตารางแล้ว')).toBeTruthy()
  })

  it('hides admin controls from a regular user', () => {
    render(<TcasCalendarTab today="2026-07-08" />)
    expect(screen.queryByLabelText('เพิ่มกิจกรรม TCAS')).toBeNull()
    expect(screen.queryByLabelText('ลบกิจกรรม')).toBeNull()
  })

  it('lets the admin add an event through the form', () => {
    authState = { user: { uid: 'IaltEhO0mPVfK3ng8npr4CdqnEE3' } }
    render(<TcasCalendarTab today="2026-07-08" />)
    fireEvent.click(screen.getByLabelText('เพิ่มกิจกรรม TCAS'))
    fireEvent.change(screen.getByLabelText('ชื่อกิจกรรม'), { target: { value: 'สอบ TGAT' } })
    fireEvent.change(screen.getByLabelText('วันที่'), { target: { value: '2026-12-13' } })
    fireEvent.change(screen.getByLabelText('รายละเอียด'), { target: { value: 'สนามสอบทั่วประเทศ' } })
    fireEvent.click(screen.getByText('บันทึกกิจกรรม'))
    expect(eventsState.addEvent).toHaveBeenCalledWith({
      title: 'สอบ TGAT', description: 'สนามสอบทั่วประเทศ', date: '2026-12-13', link: '',
    })
  })

  it('lets the admin delete an event', () => {
    authState = { user: { uid: 'IaltEhO0mPVfK3ng8npr4CdqnEE3' } }
    render(<TcasCalendarTab today="2026-07-08" />)
    fireEvent.click(screen.getAllByLabelText('ลบกิจกรรม')[0])
    expect(eventsState.deleteEvent).toHaveBeenCalledWith('e0')
  })
})
```

Create `src/components/TcasCalendarTab.integration.test.jsx` (guards the getSnapshot-loop class — renders the REAL stores):

```jsx
// @vitest-environment jsdom
// Real-store render guard against unstable-selector infinite loops (see
// SubjectDetailPanel fix e1d67fe). Firestore listener attach is mocked away;
// the Zustand stores themselves are real.
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/firestoreListener', () => ({
  createFirestoreListener: () => ({ attach: () => () => {} }),
}))
vi.mock('../lib/db', () => ({
  cols: {}, refs: {}, queries: { tcasEventsByDate: () => ({}) },
}))
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(), deleteDoc: vi.fn(), serverTimestamp: () => null,
}))
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel({ user: { uid: 'student-1' } }),
}))

const { default: TcasCalendarTab } = await import('./TcasCalendarTab')
const { useTcasEventsStore } = await import('../stores/useTcasEventsStore')

describe('TcasCalendarTab against the real events store', () => {
  it('renders events without an infinite getSnapshot loop', () => {
    useTcasEventsStore.setState({
      events: [
        { id: 'e1', title: 'ลงทะเบียน myTCAS', description: 'x', date: '2026-07-15', link: null },
      ],
    })
    render(<TcasCalendarTab today="2026-07-08" />)
    expect(screen.getByText('ลงทะเบียน myTCAS')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/components/TcasCalendarTab.test.jsx src/components/TcasCalendarTab.integration.test.jsx` → FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/components/TcasCalendarTab.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Plus, Trash2, CalendarDays, ExternalLink, Check } from 'lucide-react'
import { useTcasEventsStore } from '../stores/useTcasEventsStore'
import { useSchoolStore } from '../stores/useSchoolStore'
import { useAuthStore } from '../stores/useAuthStore'
import { ADMIN_UID } from '../constants/admin'
import { splitTcasEvents } from '../utils/tcasCalendar'

function EventRow({ event, passed, expanded, onToggle, onAdd, added, isAdmin, onDelete }) {
  return (
    <li className={`neo-card p-3 ${passed ? 'opacity-60' : ''}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 text-left">
        <span
          className={`w-3 h-3 rounded-full border-2 border-ink shrink-0 ${passed ? 'bg-success' : 'bg-accent-pink'}`}
          aria-hidden="true"
        />
        <span className="flex-1 min-w-0">
          <span className="thai-font text-sm text-ink block truncate">{event.title}</span>
          <span className="pixel-font text-[9px] text-ink-soft">{event.date}</span>
        </span>
        {isAdmin && (
          <span
            role="button"
            aria-label="ลบกิจกรรม"
            onClick={(e) => { e.stopPropagation(); onDelete(event.id) }}
            className="text-ink-soft hover:text-danger p-1"
          >
            <Trash2 size={14} />
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-2 pl-6 space-y-2">
          <p className="thai-font text-sm text-ink-soft whitespace-pre-line">{event.description}</p>
          {event.link && (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="thai-font text-xs text-brand-strong inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> เปิดลิงก์
            </a>
          )}
          <button
            onClick={onAdd}
            disabled={added}
            className={`neo-btn rounded-lg px-3 py-1.5 pixel-font text-[9px] flex items-center gap-1.5 ${
              added ? 'bg-brand-soft text-ink-soft' : 'bg-brand-strong text-white'
            }`}
          >
            {added ? (<><Check size={12} /> เพิ่มลงตารางแล้ว</>) : (<><CalendarDays size={12} /> Add to Calendar</>)}
          </button>
        </div>
      )}
    </li>
  )
}

export default function TcasCalendarTab({ today }) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.uid === ADMIN_UID
  const events = useTcasEventsStore((s) => s.events)
  const addEvent = useTcasEventsStore((s) => s.addEvent)
  const deleteEvent = useTcasEventsStore((s) => s.deleteEvent)
  const addAppointment = useSchoolStore((s) => s.addAppointment)

  const [expandedId, setExpandedId] = useState(null)
  const [addedIds, setAddedIds] = useState(() => new Set())
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')

  useEffect(() => {
    const unsub = useTcasEventsStore.getState().subscribeEvents()
    return () => unsub?.()
  }, [])

  const todayStr = today ?? new Date().toISOString().slice(0, 10)
  const { passed, upcoming } = splitTcasEvents(events, todayStr)

  function handleAddToCalendar(event) {
    addAppointment(null, { title: event.title, kind: 'tcas', dueDate: event.date })
    setAddedIds((prev) => new Set(prev).add(event.id))
  }

  async function handleSaveEvent() {
    if (!title.trim() || !date) return
    await addEvent({ title, description, date, link })
    setTitle(''); setDate(''); setDescription(''); setLink(''); setShowForm(false)
  }

  const renderRow = (event, isPassed) => (
    <EventRow
      key={event.id}
      event={event}
      passed={isPassed}
      expanded={expandedId === event.id}
      onToggle={() => setExpandedId((prev) => (prev === event.id ? null : event.id))}
      onAdd={() => handleAddToCalendar(event)}
      added={addedIds.has(event.id)}
      isAdmin={isAdmin}
      onDelete={deleteEvent}
    />
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="pixel-font text-[11px] text-ink">TCAS70 Calendar</h3>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            aria-label="เพิ่มกิจกรรม TCAS"
            className="neo-btn w-8 h-8 rounded-lg bg-brand-soft flex items-center justify-center text-brand-strong"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {showForm && (
        <div className="neo-card p-3 space-y-2">
          <label className="flex flex-col thai-font text-[10px] text-ink-soft">
            ชื่อกิจกรรม
            <input aria-label="ชื่อกิจกรรม" value={title} onChange={(e) => setTitle(e.target.value)} className="neo-input px-2 py-1 text-sm" />
          </label>
          <label className="flex flex-col thai-font text-[10px] text-ink-soft">
            วันที่
            <input aria-label="วันที่" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="neo-input px-2 py-1 text-sm" />
          </label>
          <label className="flex flex-col thai-font text-[10px] text-ink-soft">
            รายละเอียด
            <textarea aria-label="รายละเอียด" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="neo-input px-2 py-1 text-sm resize-none" />
          </label>
          <label className="flex flex-col thai-font text-[10px] text-ink-soft">
            ลิงก์ (ไม่บังคับ)
            <input aria-label="ลิงก์" value={link} onChange={(e) => setLink(e.target.value)} className="neo-input px-2 py-1 text-sm" />
          </label>
          <button onClick={handleSaveEvent} className="neo-btn w-full rounded-lg bg-brand-strong py-2 pixel-font text-[10px] text-white">
            บันทึกกิจกรรม
          </button>
        </div>
      )}

      {upcoming.length > 0 && (
        <ul data-testid="tcas-upcoming" className="space-y-2">
          {upcoming.map((e) => renderRow(e, false))}
        </ul>
      )}

      {passed.length > 0 && (
        <>
          <p className="pixel-font text-[9px] text-ink-soft pt-2">ผ่านไปแล้ว</p>
          <ul data-testid="tcas-passed" className="space-y-2">
            {passed.map((e) => renderRow(e, true))}
          </ul>
        </>
      )}

      {events.length === 0 && (
        <p className="thai-font text-center text-sm text-ink-soft py-10">ยังไม่มีกิจกรรมในปฏิทิน</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/components/TcasCalendarTab.test.jsx src/components/TcasCalendarTab.integration.test.jsx` → PASS, 8 tests.

Note: if `bg-success` doesn't exist as a token, use `bg-green-400` (check `src/index.css` `@theme` — use whatever the design system already has; do not add a token).

- [ ] **Step 5: Commit**

```bash
git add src/components/TcasCalendarTab.jsx src/components/TcasCalendarTab.test.jsx src/components/TcasCalendarTab.integration.test.jsx
git commit -m "feat(tcas-calendar): TcasCalendarTab timeline with Add to Calendar and admin CRUD"
```

---

### Task 6: Wire the tab into NewsPanel

**Files:**
- Modify: `src/components/NewsPanel.jsx`

- [ ] **Step 1: Add the tab**

In `src/components/NewsPanel.jsx`:
- Add `import TcasCalendarTab from './TcasCalendarTab'` with the other component imports.
- In the tab bar array, add a third entry after `{ key: 'rollercoaster', label: 'RollerCoaster' }`:

```js
  { key: 'tcas', label: 'TCAS70' },
```

- In the scrollable body, wherever the existing `{activeTab === 'rollercoaster' && (...)}` content renders, add as a sibling:

```jsx
  {activeTab === 'tcas' && <TcasCalendarTab />}
```

- [ ] **Step 2: Manual verify via dev transform**

Run: `npm run dev`, then `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5173/src/components/NewsPanel.jsx"`
Expected: `200`. Then in the browser: News panel → TCAS70 tab shows the timeline (empty state if no events yet); as the admin account, add one event, expand it, Add to Calendar, and confirm it appears in the School day view on that date with the calendar icon. Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/components/NewsPanel.jsx
git commit -m "feat(tcas-calendar): TCAS70 tab in NewsPanel"
```

---

### Task 7: Verification + docs + seed content

- [ ] **Step 1:** `npm test` → all suites pass (isolate-re-run any unrelated flaky files before judging — see Epic A plan's verification log).
- [ ] **Step 2:** `npm run lint` → zero errors in touched files.
- [ ] **Step 3:** As admin, seed the real TCAS70 milestones (registration opens ~15 Jul 2026; exam-blueprint, TGAT/TPAT registration ~28 Oct, TGAT/TPAT exams ~Dec 2026 — verify exact dates from mytcas.com before entering).
- [ ] **Step 4:** In `CONTEXT.md` Domain Vocabulary, add after the **Note** row:

```
| **TCAS Event** | An admin-curated milestone in the `tcasEvents` collection: `{ title, description, date, link }`. Students browse them in NewsPanel's TCAS70 tab (timeline split passed/upcoming); "Add to Calendar" copies one into the student's own School System as a subject-less Appointment with `kind: 'tcas'` |
```

- [ ] **Step 5:**

```bash
git add CONTEXT.md
git commit -m "docs(context): document TCAS Event domain vocabulary"
```

---

## Cursor Conversation Prompts

**Conversation 1 — Tasks 1 + 2 + 3:**
> Read `docs/superpowers/plans/2026-07-08-tcas-calendar.md` and execute **Task 1 (db paths + rules)**, **Task 2 (timeline split helper)**, and **Task 3 (useTcasEventsStore)** exactly as written, step by step, TDD. If `firebase deploy` or the emulator can't run, flag it and continue. Commit after each task with the exact messages given.

**Conversation 2 — Tasks 4 + 5:**
> Read `docs/superpowers/plans/2026-07-08-tcas-calendar.md` and execute **Task 4 (subject-less TCAS appointments)** and **Task 5 (TcasCalendarTab)** exactly as written, TDD. CRITICAL: Zustand selectors must select raw store fields only — never `.filter()`/`.map()` inside a selector (see commit e1d67fe for why); the integration test in Task 5 enforces this. Commit after each task with the exact messages given.

**Conversation 3 — Tasks 6 + 7:**
> Read `docs/superpowers/plans/2026-07-08-tcas-calendar.md` and execute **Task 6 (NewsPanel tab wiring)** and **Task 7 (verification + docs)**. Do the manual browser walkthrough in Task 6 Step 2 and report what you saw. Run `npm test` + `npm run lint`; re-run unrelated flaky files in isolation before judging. Commit with the exact messages given.
