# Timetable Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a student load a ready-made timetable for their school + class level in one tap — and let any student publish their own timetable as a template — killing the School System's subject-by-subject onboarding friction.

**Architecture:** Community-sourced `timetableTemplates` Firestore collection (any signed-in user publishes; templates are immutable once published; delete own or super-admin). A pure versioned schema module (`timetableTemplate.js`, mirroring `notebookExport.js`) converts between the live `useSchoolStore` shape (with ids) and the id-less template shape. Import merges via a new `importTimetable` store action that skips same-name subjects, so re-importing never duplicates. Browse/search is one-shot `getDocs` (prefix query on `schoolName`, class-level filtered client-side to avoid a composite index), surfaced in a bottom sheet (`Popup variant="sheet"`) opened from the SchoolPanel subject rail.

**Tech Stack:** Zustand, Firestore (`getDocs`/`addDoc`/`deleteDoc`), Vitest + jsdom, React, `Popup` shell (`src/components/ui/Popup.jsx`), Tailwind v4 tokens, lucide-react.

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- **Firebase paths only via `src/lib/db.js`**; reuse the existing `prefixUpperBound` helper for the school-name prefix query (same pattern as `queries.searchUsersBySchool`).
- **Zustand selectors select raw store fields only** — never `.filter()`/`.map()` inside a selector (getSnapshot loop, see commit `e1d67fe`). Every new panel gets a real-store integration render test.
- **No new sync writer** — imported subjects/slots land in `useSchoolStore` through its existing actions, so the existing `schoolSync` persists them with zero new wiring.
- **Templates are immutable** — no update rule, no edit UI; republish to change (keeps rules and merge semantics trivial).
- **Firestore rules**: read signed-in; create only with `createdBy == request.auth.uid`; delete own or super-admin; update denied. Deploy needs owner authorization (flag, don't skip silently).
- **Student-facing copy is Thai**; `thai-font`/`pixel-font`/`neo-*` classes; no new tokens.

**Background:** Master roadmap item 1 (`2026-07-08-master-roadmap.md`), PRD #36 follow-on (user item 5). Typing a whole timetable is the biggest School System onboarding friction; classmates share ~the same timetable, so community templates scale across thousands of Thai schools where admin-curated ones can't.

**Data model:**

```js
// timetableTemplates/{id}:
// { version: 1, name, schoolName, classLevel: 'ม.1'..'ม.6',
//   subjects: [{ name, color, slots: [{ day, startTime, endTime }] }],
//   createdBy: uid, createdAt: serverTimestamp }
// (no ids inside subjects/slots — import regenerates them via useSchoolStore actions)
```

---

### Task 1: Pure template schema module

**Files:**
- Create: `src/utils/timetableTemplate.js`
- Test: `src/utils/timetableTemplate.test.js`
- Create: `src/constants/classLevels.js`

**Interfaces:**
- Produces (used by Tasks 4/5):
  - `toTimetableTemplate(subjects, scheduleSlots)` → `{ version: 1, subjects: [{ name, color, slots: [{ day, startTime, endTime }] }] }` — groups each subject's slots, strips all ids/timestamps/descriptions.
  - `fromTimetableTemplate(template)` → `[{ name, color, slots }]`; throws on missing/unsupported `version`.
  - `CLASS_LEVELS` (from `classLevels.js`) — `['ม.1','ม.2','ม.3','ม.4','ม.5','ม.6']`.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/timetableTemplate.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { toTimetableTemplate, fromTimetableTemplate } from './timetableTemplate'

const SUBJECTS = [
  { id: 's1', name: 'Math', color: '#a78bda', description: '', createdAt: 1 },
  { id: 's2', name: 'Physics', color: '#7c3aed', description: 'x', createdAt: 2 },
]
const SLOTS = [
  { id: 'sl1', subjectId: 's1', day: 'mon', startTime: '09:00', endTime: '10:00' },
  { id: 'sl2', subjectId: 's2', day: 'tue', startTime: '10:00', endTime: '11:00' },
  { id: 'sl3', subjectId: 's1', day: 'thu', startTime: '09:00', endTime: '10:00' },
]

describe('toTimetableTemplate', () => {
  it('produces a version-1 envelope grouping slots under their subject, ids stripped', () => {
    expect(toTimetableTemplate(SUBJECTS, SLOTS)).toEqual({
      version: 1,
      subjects: [
        { name: 'Math', color: '#a78bda', slots: [
          { day: 'mon', startTime: '09:00', endTime: '10:00' },
          { day: 'thu', startTime: '09:00', endTime: '10:00' },
        ] },
        { name: 'Physics', color: '#7c3aed', slots: [
          { day: 'tue', startTime: '10:00', endTime: '11:00' },
        ] },
      ],
    })
  })

  it('includes a subject even when it has no slots', () => {
    const { subjects } = toTimetableTemplate([SUBJECTS[0]], [])
    expect(subjects).toEqual([{ name: 'Math', color: '#a78bda', slots: [] }])
  })
})

describe('fromTimetableTemplate', () => {
  it('round-trips through a JSON serialisation', () => {
    const entries = fromTimetableTemplate(JSON.parse(JSON.stringify(toTimetableTemplate(SUBJECTS, SLOTS))))
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({
      name: 'Math', color: '#a78bda',
      slots: [
        { day: 'mon', startTime: '09:00', endTime: '10:00' },
        { day: 'thu', startTime: '09:00', endTime: '10:00' },
      ],
    })
  })

  it('rejects an unknown or missing version', () => {
    expect(() => fromTimetableTemplate({ version: 2, subjects: [] })).toThrow()
    expect(() => fromTimetableTemplate({ subjects: [] })).toThrow()
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/utils/timetableTemplate.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/constants/classLevels.js`:

```js
// Thai secondary-school class levels for timetable templates.
export const CLASS_LEVELS = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']
```

Create `src/utils/timetableTemplate.js`:

```js
// Timetable template schema — mirrors notebookExport.js / ADR-0001: a
// versioned, store-independent serialisation. Ids are NOT included — import
// regenerates them through useSchoolStore's normal add actions.

const SCHEMA_VERSION = 1

export function toTimetableTemplate(subjects, scheduleSlots) {
  return {
    version: SCHEMA_VERSION,
    subjects: subjects.map((s) => ({
      name: s.name,
      color: s.color,
      slots: scheduleSlots
        .filter((sl) => sl.subjectId === s.id)
        .map(({ day, startTime, endTime }) => ({ day, startTime, endTime })),
    })),
  }
}

export function fromTimetableTemplate(template) {
  if (!template || template.version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported timetable template version: ${template?.version}`)
  }
  return template.subjects.map((s) => ({
    name: s.name,
    color: s.color,
    slots: (s.slots ?? []).map(({ day, startTime, endTime }) => ({ day, startTime, endTime })),
  }))
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/utils/timetableTemplate.test.js` → PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/timetableTemplate.js src/utils/timetableTemplate.test.js src/constants/classLevels.js
git commit -m "feat(timetable-templates): versioned template schema module + class levels"
```

---

### Task 2: `useSchoolStore.importTimetable` — merge without duplicates

**Files:**
- Modify: `src/stores/useSchoolStore.js`
- Modify: `src/stores/useSchoolStore.test.js`

**Interfaces:**
- Produces: `importTimetable(entries)` — `entries: [{ name, color, slots: [{ day, startTime, endTime }] }]`. For each entry: if a subject with the same trimmed, case-insensitive name already exists, **skip it entirely** (subject and its slots); otherwise `addSubject` + `addScheduleSlot` per slot. Returns `{ added: number, skipped: number }`.

- [ ] **Step 1: Write the failing tests**

Append inside the main describe of `src/stores/useSchoolStore.test.js`:

```js
  it('importTimetable adds subjects with their slots', () => {
    const result = useSchoolStore.getState().importTimetable([
      { name: 'Math', color: '#a78bda', slots: [{ day: 'mon', startTime: '09:00', endTime: '10:00' }] },
      { name: 'Physics', color: '#7c3aed', slots: [] },
    ])
    const state = useSchoolStore.getState()
    expect(result).toEqual({ added: 2, skipped: 0 })
    expect(state.subjects.map((s) => s.name)).toEqual(['Math', 'Physics'])
    expect(state.scheduleSlots).toHaveLength(1)
    expect(state.scheduleSlots[0]).toMatchObject({ day: 'mon', startTime: '09:00', endTime: '10:00' })
    expect(state.scheduleSlots[0].subjectId).toBe(state.subjects[0].id)
  })

  it('importTimetable skips subjects whose name already exists (case-insensitive)', () => {
    useSchoolStore.getState().addSubject({ name: 'math' })
    const result = useSchoolStore.getState().importTimetable([
      { name: ' Math ', color: '#a78bda', slots: [{ day: 'mon', startTime: '09:00', endTime: '10:00' }] },
      { name: 'English', color: '#d93d8c', slots: [] },
    ])
    const state = useSchoolStore.getState()
    expect(result).toEqual({ added: 1, skipped: 1 })
    expect(state.subjects.map((s) => s.name.toLowerCase().trim())).toEqual(['math', 'english'])
    expect(state.scheduleSlots).toHaveLength(0) // skipped subject's slots not imported
  })
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/stores/useSchoolStore.test.js` → the 2 new cases FAIL (`importTimetable is not a function`); all pre-existing cases still PASS.

- [ ] **Step 3: Implement**

In `src/stores/useSchoolStore.js`, add after the `importNotes` action:

```js
      // Merge a timetable template (see src/utils/timetableTemplate.js) into
      // the store. Same-name subjects are skipped whole, so re-importing a
      // template never duplicates. Runs through addSubject/addScheduleSlot so
      // the existing schoolSync persists everything with no extra wiring.
      importTimetable: (entries) => {
        let added = 0
        let skipped = 0
        entries.forEach((entry) => {
          const name = entry.name.trim()
          const exists = get().subjects.some(
            (s) => s.name.trim().toLowerCase() === name.toLowerCase(),
          )
          if (exists) {
            skipped += 1
            return
          }
          const subjectId = get().addSubject({ name, color: entry.color })
          entry.slots.forEach((slot) => get().addScheduleSlot(subjectId, slot))
          added += 1
        })
        return { added, skipped }
      },
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/stores/useSchoolStore.test.js` → PASS (2 new + all existing).

- [ ] **Step 5: Commit**

```bash
git add src/stores/useSchoolStore.js src/stores/useSchoolStore.test.js
git commit -m "feat(timetable-templates): importTimetable merge action in useSchoolStore"
```

---

### Task 3: db.js paths + Firestore rules + rules tests

**Files:**
- Modify: `src/lib/db.js`
- Modify: `firestore.rules`
- Modify: `test/rules/firestore.rules.test.js`

**Interfaces:**
- Produces: `refs.timetableTemplate(id)`; `cols.timetableTemplates`; `queries.latestTemplates()` (createdAt desc, limit 20); `queries.templatesBySchool(term)` (schoolName prefix, limit 20 — class level is filtered client-side to avoid a composite index).

- [ ] **Step 1: Add the paths to `src/lib/db.js`**

In `refs`, after the `tcasEvent` line:

```js
  timetableTemplate: (id)       => doc(db, 'timetableTemplates', id),
```

In `cols`, after the `tcasEvents` line:

```js
  timetableTemplates: collection(db, 'timetableTemplates'),
```

In `queries`, after the `tcasEventsByDate` line:

```js
  latestTemplates: () => query(cols.timetableTemplates, orderBy('createdAt', 'desc'), limit(20)),
  templatesBySchool: (term) => query(
    cols.timetableTemplates,
    where('schoolName', '>=', term),
    where('schoolName', '<=', prefixUpperBound(term)),
    limit(20),
  ),
```

- [ ] **Step 2: Add the rules block**

In `firestore.rules`, after the `/tcasEvents/` block:

```
    // Community timetable templates: any student publishes their own timetable
    // (createdBy must be themselves); templates are immutable once published;
    // delete own or super-admin (moderation).
    match /timetableTemplates/{templateId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.createdBy == request.auth.uid;
      allow update: if false;
      allow delete: if isSignedIn() &&
        (resource.data.createdBy == request.auth.uid || isSuperAdmin());
    }
```

- [ ] **Step 3: Write rules tests**

Append to `test/rules/firestore.rules.test.js`:

```js
describe('timetableTemplates rules', () => {
  it('allows a signed-in user to create a template as themselves', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(alice, 'timetableTemplates/t1'), {
      version: 1, name: 'ม.5/1', schoolName: 'สวนกุหลาบ', classLevel: 'ม.5', subjects: [], createdBy: 'alice',
    }))
  })

  it('BLOCKS creating a template with a spoofed createdBy', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(alice, 'timetableTemplates/t2'), {
      version: 1, name: 'x', schoolName: 'x', classLevel: 'ม.4', subjects: [], createdBy: 'bob',
    }))
  })

  it('BLOCKS updating a published template', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'timetableTemplates/t3'), { createdBy: 'alice', name: 'old' })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'timetableTemplates/t3'), { name: 'new' }))
  })

  it('allows deleting your own template but not someone else\'s', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'timetableTemplates/mine'), { createdBy: 'alice' })
      await setDoc(doc(ctx.firestore(), 'timetableTemplates/theirs'), { createdBy: 'bob' })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(deleteDoc(doc(alice, 'timetableTemplates/mine')))
    await assertFails(deleteDoc(doc(alice, 'timetableTemplates/theirs')))
  })

  it('allows the super-admin to delete any template (moderation)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'timetableTemplates/spam'), { createdBy: 'bob' })
    })
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(deleteDoc(doc(admin, 'timetableTemplates/spam')))
  })
})
```

- [ ] **Step 4: Run the rules suite** — `npm run test:rules:emu` → PASS (all existing + 5 new). If emulators unavailable, flag and continue.

- [ ] **Step 5: Deploy rules** — `firebase deploy --only firestore:rules` requires the owner's authorization (auto-review blocks it). **Flag it and continue** — the owner deploys the same way as Epic D (diff was clean then; this change is again strictly additive).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.js firestore.rules test/rules/firestore.rules.test.js
git commit -m "feat(timetable-templates): collection paths + community publish/delete rules"
```

---

### Task 4: `useTimetableTemplatesStore`

**Files:**
- Create: `src/stores/useTimetableTemplatesStore.js`
- Test: `src/stores/useTimetableTemplatesStore.test.js`

**Interfaces:**
- Consumes: Task 1's `toTimetableTemplate`; Task 3's paths; `useSchoolStore` + `useAuthStore` state (via `getState()`).
- Produces: `templates: []`, `loading: false`, `loadLatest()`, `searchBySchool(term)` (empty/whitespace term → `loadLatest`), `publishTemplate({ name, schoolName, classLevel })`, `deleteTemplate(id)`.

- [ ] **Step 1: Write the failing tests**

Create `src/stores/useTimetableTemplatesStore.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getDocs: (...a) => m.getDocs(...a),
  addDoc: (...a) => m.addDoc(...a),
  deleteDoc: (...a) => m.deleteDoc(...a),
  serverTimestamp: () => 'server-ts',
}))
vi.mock('../lib/db', () => ({
  cols: { timetableTemplates: { _col: 'timetableTemplates' } },
  refs: { timetableTemplate: (id) => ({ _path: `timetableTemplates/${id}` }) },
  queries: {
    latestTemplates: () => ({ _query: 'latest' }),
    templatesBySchool: (term) => ({ _query: `school:${term}` }),
  },
}))
vi.mock('./useSchoolStore', () => ({
  useSchoolStore: {
    getState: () => ({
      subjects: [{ id: 's1', name: 'Math', color: '#a78bda' }],
      scheduleSlots: [{ id: 'sl1', subjectId: 's1', day: 'mon', startTime: '09:00', endTime: '10:00' }],
    }),
  },
}))
vi.mock('./useAuthStore', () => ({
  useAuthStore: { getState: () => ({ user: { uid: 'u1' } }) },
}))

const { useTimetableTemplatesStore } = await import('./useTimetableTemplatesStore')

const SNAP = {
  docs: [{ id: 't1', data: () => ({ name: 'ม.5/1', schoolName: 'สวนกุหลาบ', classLevel: 'ม.5', version: 1, subjects: [], createdBy: 'u9' }) }],
}

describe('useTimetableTemplatesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTimetableTemplatesStore.setState({ templates: [], loading: false })
  })

  it('loadLatest fetches the latest templates', async () => {
    m.getDocs.mockResolvedValue(SNAP)
    await useTimetableTemplatesStore.getState().loadLatest()
    expect(m.getDocs).toHaveBeenCalledWith({ _query: 'latest' })
    expect(useTimetableTemplatesStore.getState().templates).toEqual([
      { id: 't1', name: 'ม.5/1', schoolName: 'สวนกุหลาบ', classLevel: 'ม.5', version: 1, subjects: [], createdBy: 'u9' },
    ])
    expect(useTimetableTemplatesStore.getState().loading).toBe(false)
  })

  it('searchBySchool uses the prefix query for a non-empty term', async () => {
    m.getDocs.mockResolvedValue(SNAP)
    await useTimetableTemplatesStore.getState().searchBySchool('สวน')
    expect(m.getDocs).toHaveBeenCalledWith({ _query: 'school:สวน' })
  })

  it('searchBySchool with a blank term falls back to latest', async () => {
    m.getDocs.mockResolvedValue(SNAP)
    await useTimetableTemplatesStore.getState().searchBySchool('   ')
    expect(m.getDocs).toHaveBeenCalledWith({ _query: 'latest' })
  })

  it('publishTemplate serialises the current timetable with owner metadata', async () => {
    await useTimetableTemplatesStore.getState().publishTemplate({
      name: ' ห้อง 5/1 ', schoolName: ' สวนกุหลาบ ', classLevel: 'ม.5',
    })
    expect(m.addDoc).toHaveBeenCalledWith({ _col: 'timetableTemplates' }, {
      version: 1,
      subjects: [{ name: 'Math', color: '#a78bda', slots: [{ day: 'mon', startTime: '09:00', endTime: '10:00' }] }],
      name: 'ห้อง 5/1',
      schoolName: 'สวนกุหลาบ',
      classLevel: 'ม.5',
      createdBy: 'u1',
      createdAt: 'server-ts',
    })
  })

  it('deleteTemplate deletes by ref and removes it from state', async () => {
    useTimetableTemplatesStore.setState({ templates: [{ id: 't1' }, { id: 't2' }] })
    await useTimetableTemplatesStore.getState().deleteTemplate('t1')
    expect(m.deleteDoc).toHaveBeenCalledWith({ _path: 'timetableTemplates/t1' })
    expect(useTimetableTemplatesStore.getState().templates.map((t) => t.id)).toEqual(['t2'])
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/stores/useTimetableTemplatesStore.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/stores/useTimetableTemplatesStore.js`:

```js
import { create } from 'zustand'
import { getDocs, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { cols, refs, queries } from '../lib/db'
import { useSchoolStore } from './useSchoolStore'
import { useAuthStore } from './useAuthStore'
import { toTimetableTemplate } from '../utils/timetableTemplate'

// One-shot fetches (no listener) — templates are browse-on-demand content.
async function fetchInto(set, q) {
  set({ loading: true })
  try {
    const snap = await getDocs(q)
    set({ templates: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false })
  } catch (error) {
    console.error('[timetableTemplates] fetch failed:', error)
    set({ loading: false })
  }
}

export const useTimetableTemplatesStore = create((set) => ({
  templates: [],
  loading: false,

  loadLatest: () => fetchInto(set, queries.latestTemplates()),

  searchBySchool: (term) => {
    const trimmed = term.trim()
    if (!trimmed) return fetchInto(set, queries.latestTemplates())
    return fetchInto(set, queries.templatesBySchool(trimmed))
  },

  publishTemplate: async ({ name, schoolName, classLevel }) => {
    const uid = useAuthStore.getState().user?.uid
    if (!uid) throw new Error('not signed in')
    const { subjects, scheduleSlots } = useSchoolStore.getState()
    await addDoc(cols.timetableTemplates, {
      ...toTimetableTemplate(subjects, scheduleSlots),
      name: name.trim(),
      schoolName: schoolName.trim(),
      classLevel,
      createdBy: uid,
      createdAt: serverTimestamp(),
    })
  },

  deleteTemplate: async (id) => {
    await deleteDoc(refs.timetableTemplate(id))
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
  },
}))
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/stores/useTimetableTemplatesStore.test.js` → PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stores/useTimetableTemplatesStore.js src/stores/useTimetableTemplatesStore.test.js
git commit -m "feat(timetable-templates): browse/search/publish/delete store"
```

---

### Task 5: `TimetableTemplateSheet` UI

**Files:**
- Create: `src/components/school/TimetableTemplateSheet.jsx`
- Test: `src/components/school/TimetableTemplateSheet.test.jsx`
- Create: `src/components/school/TimetableTemplateSheet.integration.test.jsx`

**Interfaces:**
- Consumes: `useTimetableTemplatesStore` (Task 4), `useSchoolStore.importTimetable` (Task 2), `fromTimetableTemplate` + `CLASS_LEVELS` (Task 1), `useAuthStore`, `Popup` (`src/components/ui/Popup.jsx`, `variant="sheet"` — same usage as `TaskShareSheet` in `TaskPanel.jsx`).
- Produces: `<TimetableTemplateSheet onClose={fn} />` — browse mode (search box + class-level chips + template list with "ใช้ตารางนี้" and delete-own) and a publish form ("แชร์ตารางเรียนของฉัน"). Class-level filtering happens client-side over the loaded list.

- [ ] **Step 1: Write the failing tests**

Create `src/components/school/TimetableTemplateSheet.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let templatesState
vi.mock('../../stores/useTimetableTemplatesStore', () => ({
  useTimetableTemplatesStore: Object.assign((sel) => sel(templatesState), {
    getState: () => templatesState,
  }),
}))

const importTimetable = vi.fn(() => ({ added: 2, skipped: 0 }))
vi.mock('../../stores/useSchoolStore', () => ({
  useSchoolStore: Object.assign((sel) => sel({ importTimetable }), {
    getState: () => ({ importTimetable }),
  }),
}))

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

vi.mock('../ui/Popup', () => ({
  default: ({ children, onClose }) => <div data-testid="popup">{children}<button onClick={onClose}>__close__</button></div>,
}))

const { default: TimetableTemplateSheet } = await import('./TimetableTemplateSheet')

const TEMPLATES = [
  { id: 't1', version: 1, name: 'ม.5/1 สายวิทย์', schoolName: 'สวนกุหลาบวิทยาลัย', classLevel: 'ม.5', createdBy: 'u9',
    subjects: [{ name: 'Math', color: '#a78bda', slots: [] }] },
  { id: 't2', version: 1, name: 'ม.4/2', schoolName: 'เตรียมอุดม', classLevel: 'ม.4', createdBy: 'me',
    subjects: [] },
]

describe('TimetableTemplateSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState = { user: { uid: 'me' } }
    templatesState = {
      templates: TEMPLATES,
      loading: false,
      loadLatest: vi.fn(),
      searchBySchool: vi.fn(),
      publishTemplate: vi.fn().mockResolvedValue(undefined),
      deleteTemplate: vi.fn(),
    }
  })

  it('loads the latest templates on mount and lists them', () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    expect(templatesState.loadLatest).toHaveBeenCalled()
    expect(screen.getByText('ม.5/1 สายวิทย์')).toBeTruthy()
    expect(screen.getByText('ม.4/2')).toBeTruthy()
  })

  it('searching submits the school-name term', () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('ค้นหาโรงเรียน'), { target: { value: 'สวน' } })
    fireEvent.click(screen.getByLabelText('ค้นหา'))
    expect(templatesState.searchBySchool).toHaveBeenCalledWith('สวน')
  })

  it('a class-level chip filters the list client-side', () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('ม.5'))
    expect(screen.getByText('ม.5/1 สายวิทย์')).toBeTruthy()
    expect(screen.queryByText('ม.4/2')).toBeNull()
  })

  it('ใช้ตารางนี้ imports the template and reports the result', () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    fireEvent.click(screen.getAllByText('ใช้ตารางนี้')[0])
    expect(importTimetable).toHaveBeenCalledWith([{ name: 'Math', color: '#a78bda', slots: [] }])
    expect(screen.getByText(/เพิ่ม 2 วิชา/)).toBeTruthy()
  })

  it('shows delete only on my own template', () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    expect(screen.getAllByLabelText('ลบตาราง')).toHaveLength(1)
    fireEvent.click(screen.getByLabelText('ลบตาราง'))
    expect(templatesState.deleteTemplate).toHaveBeenCalledWith('t2')
  })

  it('publish form submits my timetable with metadata', async () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('แชร์ตารางเรียนของฉัน'))
    fireEvent.change(screen.getByLabelText('ชื่อตาราง'), { target: { value: 'ห้อง 6/3' } })
    fireEvent.change(screen.getByLabelText('ชื่อโรงเรียน'), { target: { value: 'หาดใหญ่วิทยาลัย' } })
    fireEvent.change(screen.getByLabelText('ระดับชั้น'), { target: { value: 'ม.6' } })
    fireEvent.click(screen.getByText('เผยแพร่'))
    expect(templatesState.publishTemplate).toHaveBeenCalledWith({
      name: 'ห้อง 6/3', schoolName: 'หาดใหญ่วิทยาลัย', classLevel: 'ม.6',
    })
  })
})
```

Create `src/components/school/TimetableTemplateSheet.integration.test.jsx`:

```jsx
// @vitest-environment jsdom
// Real-store render guard against unstable-selector infinite loops (e1d67fe).
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../lib/db', () => ({
  cols: {}, refs: {},
  queries: { latestTemplates: () => ({}), templatesBySchool: () => ({}) },
}))
vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  addDoc: vi.fn(), deleteDoc: vi.fn(), serverTimestamp: () => null,
}))
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: Object.assign((sel) => sel({ user: { uid: 'me' } }), {
    getState: () => ({ user: { uid: 'me' } }),
  }),
}))
vi.mock('../ui/Popup', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

const { default: TimetableTemplateSheet } = await import('./TimetableTemplateSheet')
const { useTimetableTemplatesStore } = await import('../../stores/useTimetableTemplatesStore')

describe('TimetableTemplateSheet against the real templates store', () => {
  it('renders templates without an infinite getSnapshot loop', () => {
    useTimetableTemplatesStore.setState({
      templates: [{ id: 't1', version: 1, name: 'ม.5/1', schoolName: 'ส.ก.', classLevel: 'ม.5', createdBy: 'x', subjects: [] }],
      loading: false,
    })
    render(<TimetableTemplateSheet onClose={() => {}} />)
    expect(screen.getByText('ม.5/1')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/components/school/TimetableTemplateSheet.test.jsx src/components/school/TimetableTemplateSheet.integration.test.jsx` → FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/components/school/TimetableTemplateSheet.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Search, Trash2, Share2, CheckCircle2 } from 'lucide-react'
import Popup from '../ui/Popup'
import { useTimetableTemplatesStore } from '../../stores/useTimetableTemplatesStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { fromTimetableTemplate } from '../../utils/timetableTemplate'
import { CLASS_LEVELS } from '../../constants/classLevels'

export default function TimetableTemplateSheet({ onClose }) {
  const user = useAuthStore((s) => s.user)
  const templates = useTimetableTemplatesStore((s) => s.templates)
  const loading = useTimetableTemplatesStore((s) => s.loading)
  const importTimetable = useSchoolStore((s) => s.importTimetable)

  const [term, setTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState(null)
  const [mode, setMode] = useState('browse') // 'browse' | 'publish'
  const [importResult, setImportResult] = useState(null)

  const [pubName, setPubName] = useState('')
  const [pubSchool, setPubSchool] = useState('')
  const [pubLevel, setPubLevel] = useState('ม.4')
  const [published, setPublished] = useState(false)

  useEffect(() => {
    useTimetableTemplatesStore.getState().loadLatest()
  }, [])

  const visible = levelFilter ? templates.filter((t) => t.classLevel === levelFilter) : templates

  function handleImport(template) {
    try {
      const result = importTimetable(fromTimetableTemplate(template))
      setImportResult({ id: template.id, ...result })
    } catch {
      window.alert('ตารางนี้ใช้ไม่ได้ (schema ไม่รองรับ)')
    }
  }

  async function handlePublish() {
    if (!pubName.trim() || !pubSchool.trim()) return
    await useTimetableTemplatesStore.getState().publishTemplate({
      name: pubName.trim(), schoolName: pubSchool.trim(), classLevel: pubLevel,
    })
    setPublished(true)
  }

  return (
    <Popup variant="sheet" size="md" maxHeight="max-h-[85vh]" onClose={onClose}>
      <div className="px-5 pb-6 overflow-y-auto">
        <p className="pixel-font text-[10px] text-center text-ink mb-3">โหลดตารางเรียน</p>

        {mode === 'browse' ? (
          <>
            {/* Search */}
            <div className="flex gap-2 mb-3">
              <input
                aria-label="ค้นหาโรงเรียน"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="ชื่อโรงเรียน..."
                className="neo-input thai-font flex-1 px-3 py-2 text-sm"
              />
              <button
                aria-label="ค้นหา"
                onClick={() => useTimetableTemplatesStore.getState().searchBySchool(term)}
                className="neo-btn w-10 rounded-lg bg-brand-soft flex items-center justify-center text-brand-strong"
              >
                <Search size={16} />
              </button>
            </div>

            {/* Class-level chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
              {CLASS_LEVELS.map((lv) => (
                <button
                  key={lv}
                  onClick={() => setLevelFilter((prev) => (prev === lv ? null : lv))}
                  className={`shrink-0 px-3 py-1 rounded-full thai-font text-xs border-2 ${
                    levelFilter === lv ? 'border-ink bg-brand-soft text-brand-strong' : 'border-ink/20 text-ink-soft'
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>

            {/* List */}
            {loading ? (
              <p className="thai-font text-center text-sm text-ink-soft py-8">กำลังโหลด...</p>
            ) : visible.length === 0 ? (
              <p className="thai-font text-center text-sm text-ink-soft py-8">ยังไม่มีตารางของโรงเรียนนี้ — เป็นคนแรกที่แชร์เลย!</p>
            ) : (
              <ul className="space-y-2">
                {visible.map((t) => (
                  <li key={t.id} className="neo-card p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 min-w-0">
                        <span className="thai-font text-sm text-ink block truncate">{t.name}</span>
                        <span className="thai-font text-[11px] text-ink-soft">{t.schoolName} · {t.classLevel} · {t.subjects.length} วิชา</span>
                      </span>
                      {t.createdBy === user?.uid && (
                        <button
                          aria-label="ลบตาราง"
                          onClick={() => useTimetableTemplatesStore.getState().deleteTemplate(t.id)}
                          className="text-ink-soft hover:text-danger p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {importResult?.id === t.id ? (
                        <span className="thai-font text-xs text-brand-strong flex items-center gap-1">
                          <CheckCircle2 size={14} /> เพิ่ม {importResult.added} วิชา{importResult.skipped > 0 ? ` (ข้าม ${importResult.skipped})` : ''}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImport(t)}
                          className="neo-btn rounded-lg bg-brand-strong px-3 py-1.5 thai-font text-xs text-white shrink-0"
                        >
                          ใช้ตารางนี้
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setMode('publish')}
              className="mt-4 w-full neo-btn rounded-xl border-2 border-dashed border-brand/40 py-2.5 thai-font text-sm text-brand-strong flex items-center justify-center gap-2"
            >
              <Share2 size={14} /> แชร์ตารางเรียนของฉัน
            </button>
          </>
        ) : published ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-brand-strong" />
            <p className="thai-font text-sm text-ink">เผยแพร่ตารางเรียนแล้ว ขอบคุณที่ช่วยเพื่อน ๆ!</p>
            <button onClick={() => { setPublished(false); setMode('browse'); useTimetableTemplatesStore.getState().loadLatest() }} className="thai-font text-xs text-brand-strong underline">
              กลับไปดูตารางทั้งหมด
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="flex flex-col thai-font text-[11px] text-ink-soft">
              ชื่อตาราง
              <input aria-label="ชื่อตาราง" value={pubName} onChange={(e) => setPubName(e.target.value)} placeholder="เช่น ม.5/1 สายวิทย์" className="neo-input px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col thai-font text-[11px] text-ink-soft">
              ชื่อโรงเรียน
              <input aria-label="ชื่อโรงเรียน" value={pubSchool} onChange={(e) => setPubSchool(e.target.value)} className="neo-input px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col thai-font text-[11px] text-ink-soft">
              ระดับชั้น
              <select aria-label="ระดับชั้น" value={pubLevel} onChange={(e) => setPubLevel(e.target.value)} className="neo-input px-3 py-2 text-sm">
                {CLASS_LEVELS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
              </select>
            </label>
            <p className="thai-font text-[11px] text-ink-soft">ตารางวิชา + คาบเรียนปัจจุบันของคุณจะถูกแชร์ (ไม่รวมการบ้านและโน้ต)</p>
            <button onClick={handlePublish} className="neo-btn w-full rounded-xl bg-brand-strong py-2.5 pixel-font text-[10px] text-white">
              เผยแพร่
            </button>
            <button onClick={() => setMode('browse')} className="w-full thai-font text-xs text-ink-soft py-1">
              ย้อนกลับ
            </button>
          </div>
        )}
      </div>
    </Popup>
  )
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/components/school/TimetableTemplateSheet.test.jsx src/components/school/TimetableTemplateSheet.integration.test.jsx` → PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/school/TimetableTemplateSheet.jsx src/components/school/TimetableTemplateSheet.test.jsx src/components/school/TimetableTemplateSheet.integration.test.jsx
git commit -m "feat(timetable-templates): browse/import/publish sheet"
```

---

### Task 6: Wire into SchoolPanel

**Files:**
- Modify: `src/components/school/SchoolPanel.jsx`
- Modify: `src/components/school/SchoolPanel.test.jsx`

- [ ] **Step 1: Write the failing test**

In `src/components/school/SchoolPanel.test.jsx`, add a mock for the sheet near the other `vi.mock` calls at the top of the file:

```js
vi.mock('./TimetableTemplateSheet', () => ({
  default: ({ onClose }) => <div data-testid="template-sheet"><button onClick={onClose}>close-sheet</button></div>,
}))
```

Add the test case:

```js
  it('opens the timetable template sheet from the rail button', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    expect(screen.queryByTestId('template-sheet')).toBeNull()
    fireEvent.click(screen.getByLabelText('โหลดตารางเรียน'))
    expect(screen.getByTestId('template-sheet')).toBeTruthy()
    fireEvent.click(screen.getByText('close-sheet'))
    expect(screen.queryByTestId('template-sheet')).toBeNull()
  })
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/components/school/SchoolPanel.test.jsx` → the new case FAILS (`Unable to find a label with the text of: โหลดตารางเรียน`); pre-existing cases PASS.

- [ ] **Step 3: Implement**

In `src/components/school/SchoolPanel.jsx`:
- Add `FolderDown` to the lucide import list.
- Add `import TimetableTemplateSheet from './TimetableTemplateSheet'` with the other imports.
- Add state near the other `useState` calls: `const [showTemplates, setShowTemplates] = useState(false)`.
- In the subject rail, directly after the existing "เพิ่มวิชา" `<button>` (the dashed `Plus` one), add:

```jsx
              <button
                onClick={() => setShowTemplates(true)}
                aria-label="โหลดตารางเรียน"
                className="w-8 h-8 rounded-full border-2 border-dashed border-brand/40 text-brand flex items-center justify-center"
              >
                <FolderDown size={14} />
              </button>
```

- At the end of the component's JSX, just before the final closing `</div>` of the root element, add:

```jsx
      {showTemplates && <TimetableTemplateSheet onClose={() => setShowTemplates(false)} />}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/components/school/SchoolPanel.test.jsx` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/school/SchoolPanel.jsx src/components/school/SchoolPanel.test.jsx
git commit -m "feat(timetable-templates): open template sheet from the subject rail"
```

---

### Task 7: Verification + docs

- [ ] **Step 1:** `npm test` → all suites pass (re-run unrelated flaky files in isolation before judging — known environment behavior).
- [ ] **Step 2:** `npm run lint` → zero errors in touched files.
- [ ] **Step 3:** Manual walkthrough (`npm run dev`): School panel → rail's new folder-down button → sheet opens with latest templates (empty state first run) → "แชร์ตารางเรียนของฉัน" publishes your current timetable → it appears in the list → on a second account (or after clearing the school store) "ใช้ตารางนี้" imports the subjects + slots and reports "เพิ่ม N วิชา" → re-importing reports skipped. **Requires the Task 3 rules to be deployed** — if not yet, flag it.
- [ ] **Step 3b (operator):** Seed 2–3 common templates from the admin account (e.g. ม.4/ม.5/ม.6 สายวิทย์-คณิต ตารางมาตรฐาน) so the browse list isn't empty on day one.
- [ ] **Step 4:** In `CONTEXT.md` Domain Vocabulary, after the **TCAS Event** row add:

```
| **Timetable Template** | A community-published copy of a student's subjects + schedule slots (`timetableTemplates` collection, versioned id-less schema via `src/utils/timetableTemplate.js`). Immutable once published; delete own or super-admin. Importing merges through `useSchoolStore.importTimetable`, skipping same-name subjects |
```

- [ ] **Step 5:**

```bash
git add CONTEXT.md
git commit -m "docs(context): document Timetable Template domain vocabulary"
```

---

## Out of Scope (deliberate simplifications)

- **No download counter / popularity ranking** — needs a rules-safe increment path; add later if template discovery becomes a problem.
- **No template preview before import** — the subject count in the list row is the preview; import is cheap to undo (delete subjects).
- **No moderation queue** — super-admin delete + immutability is the whole moderation story for now.
- **No school registry/autocomplete** — school name is free text; prefix search tolerates it. A canonical school list can come later with the B2B track.

---

## Cursor Conversation Prompts

Run in order; each assumes a fresh conversation.

**Conversation 1 — Tasks 1 + 2:**
> Read `docs/superpowers/plans/2026-07-08-timetable-templates.md` and execute **Task 1 (template schema module)** and **Task 2 (importTimetable)** exactly as written, step by step, TDD: failing test first, run it, implement, run again. Commit after each task with the exact messages given.

**Conversation 2 — Tasks 3 + 4:**
> Read `docs/superpowers/plans/2026-07-08-timetable-templates.md` and execute **Task 3 (db paths + rules)** and **Task 4 (useTimetableTemplatesStore)** exactly as written, TDD. `firebase deploy` will be blocked — flag it for the owner and continue. Commit after each task with the exact messages given.

**Conversation 3 — Tasks 5 + 6 + 7:**
> Read `docs/superpowers/plans/2026-07-08-timetable-templates.md` and execute **Task 5 (TimetableTemplateSheet)**, **Task 6 (SchoolPanel wiring)**, and **Task 7 (verification + docs)** exactly as written, TDD. CRITICAL: Zustand selectors must select raw store fields only — never derive arrays inside a selector (see commit e1d67fe); Task 5's integration test enforces this. Do the manual walkthrough in Task 7 Step 3 and report what you saw. Commit after each task with the exact messages given.
