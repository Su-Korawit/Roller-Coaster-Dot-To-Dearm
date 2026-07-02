# Selection Page Commit Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the "set a Profile field, then push it to Firestore" ritual that is copy-pasted across all five `/select/*` onboarding pages into one tested hook, so the identical five-line pattern lives in exactly one place.

**Architecture:** A single non-stateful hook, `useSelectionCommit(setter)`, wraps a `useSelectStore` setter so calling the returned `commit(value)` function both updates local state and calls `syncSelectToFirestore(uid)` with the signed-in user's uid. Each of the five selection pages (`MbtiPage`, `CareerPage`, `MasteryPage`, `UniversityPage`, `ProgramPage`) replaces its inline two-line block with one call to this hook.

**Scope correction from the original roadmap sketch:** the roadmap phase this implements originally proposed a broader `useSelectionStep` hook that would also own query/filter state. Reading the five pages' actual code shows their filtering, data sources, and layouts are genuinely different — `MbtiPage` is an index-based carousel with no search box at all, `ProgramPage` is a two-tier faculty→program picker with local `selectedFaculty` state, `UniversityPage` renders a custom logo-fallback grid, and only `CareerPage`/`MasteryPage` share the `StepScreen` + `SelectCard` + simple `useMemo` filter shape. Forcing all five into one generic component would be a premature abstraction that fights real structural differences. The one line of logic that is byte-for-byte identical across all five pages is the setter-then-sync pair — that is the only thing this plan extracts.

**Tech Stack:** React 19 (plain JS/JSX, no TypeScript), Zustand (`useSelectStore`, `useAuthStore`), Vitest + `@testing-library/react` (jsdom), existing `syncSelectToFirestore` util (unchanged).

## Global Constraints

- No TypeScript — plain `.js`/`.jsx` only, no type annotations (CLAUDE.md).
- Firestore writes stay debounced/wrapped via existing utilities — this plan does not add any new write path; it only relocates calls to the existing `syncSelectToFirestore(uid)` (CLAUDE.md: "Firestore writes — always debounced via `syncManager`. Never synchronous direct writes." — `syncSelectToFirestore` is the CONTEXT.md-documented, sanctioned exception: manual, no subscription, called on demand from the five selection pages. This plan does not change that contract, only which line calls it).
- Firebase paths only via `src/lib/db.js` factories — untouched by this plan (`syncSelectToFirestore` already uses `refs.user`/`shapes.profileFields`).
- Hook files: `camelCase.js` under `src/hooks/` (CONTEXT.md naming convention). Page files stay `PascalCase.jsx`.
- Tests: colocated `name.test.js` / `name.test.jsx`, `// @vitest-environment jsdom` header for anything using `@testing-library/react` (matches `src/pages/AuthPage.test.jsx`).
- Run all tests with `npx vitest run <path>` (project script: `npm test` = `vitest run`, `globals: true` per `vitest.config.js` so `describe/it/expect` are ambient, but the existing test files still import them explicitly from `vitest` — follow that same explicit-import style for consistency).

---

## File Structure

- **Create** `src/hooks/useSelectionCommit.js` — the extracted hook. Depends on `src/stores/useAuthStore.js` (reads `useAuthStore.getState().user?.uid`) and `src/utils/syncSelectToFirestore.js` (unchanged).
- **Create** `src/hooks/useSelectionCommit.test.js` — unit tests for the hook in isolation (mocks both dependencies).
- **Modify** `src/pages/MasteryPage.jsx` — replace inline commit block with the hook.
- **Modify** `src/pages/CareerPage.jsx` — same.
- **Modify** `src/pages/UniversityPage.jsx` — same.
- **Modify** `src/pages/ProgramPage.jsx` — same.
- **Modify** `src/pages/MbtiPage.jsx` — same (this page also calls `navigate(...)` in the same handler; only the setter+sync half is replaced, navigation stays inline in the page).
- **Create** one colocated `*.test.jsx` per modified page (`MasteryPage.test.jsx`, `CareerPage.test.jsx`, `UniversityPage.test.jsx`, `ProgramPage.test.jsx`, `MbtiPage.test.jsx`) — these are the first tests any of the five pages have ever had, proving the migrated behavior (calling the hook, not the old inline block) via user-facing interaction, not implementation detail.

---

### Task 1: `useSelectionCommit` hook

**Files:**
- Create: `src/hooks/useSelectionCommit.js`
- Test: `src/hooks/useSelectionCommit.test.js`

**Interfaces:**
- Consumes: `useAuthStore.getState()` → `{ user: { uid } | null }` (from `src/stores/useAuthStore.js:24`); `syncSelectToFirestore(uid)` (from `src/utils/syncSelectToFirestore.js:10`, no-ops on falsy `uid`).
- Produces: `useSelectionCommit(setter: (value) => void) => (value) => void` — every later task imports this exact named export from `../hooks/useSelectionCommit`.

- [ ] **Step 1: Write the failing test**

```js
// src/hooks/useSelectionCommit.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: { getState: () => authState },
}))

const syncSelectToFirestore = vi.fn()
vi.mock('../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => syncSelectToFirestore(...args),
}))

const { useSelectionCommit } = await import('./useSelectionCommit')

describe('useSelectionCommit', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    syncSelectToFirestore.mockClear()
  })

  it('calls the setter with the selected value', () => {
    const setter = vi.fn()
    const commit = useSelectionCommit(setter)
    commit('infj')
    expect(setter).toHaveBeenCalledWith('infj')
  })

  it('syncs the signed-in uid to Firestore after setting', () => {
    const setter = vi.fn()
    const commit = useSelectionCommit(setter)
    commit('infj')
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })

  it('sets before syncing (sync should see the just-set value if it re-read the store)', () => {
    const order = []
    const setter = vi.fn(() => order.push('set'))
    syncSelectToFirestore.mockImplementation(() => order.push('sync'))
    const commit = useSelectionCommit(setter)
    commit('infj')
    expect(order).toEqual(['set', 'sync'])
  })

  it('still calls sync with undefined uid when signed out', () => {
    authState = { user: null }
    const setter = vi.fn()
    const commit = useSelectionCommit(setter)
    commit('infj')
    expect(syncSelectToFirestore).toHaveBeenCalledWith(undefined)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useSelectionCommit.test.js`
Expected: FAIL — `Failed to resolve import "./useSelectionCommit"` (or `useSelectionCommit is not a function` if the module resolves to nothing).

- [ ] **Step 3: Write minimal implementation**

```js
// src/hooks/useSelectionCommit.js
import { useAuthStore } from '../stores/useAuthStore'
import { syncSelectToFirestore } from '../utils/syncSelectToFirestore'

// Every /select/* page pairs a useSelectStore setter with a push to
// Firestore under the signed-in user's profile — this wraps that pairing
// once instead of five times. Not a React hook internally (no useState/
// useEffect); named useX to match where it's called from and what it stands
// in for at each call site.
export function useSelectionCommit(setter) {
  return (value) => {
    setter(value)
    syncSelectToFirestore(useAuthStore.getState().user?.uid)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useSelectionCommit.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSelectionCommit.js src/hooks/useSelectionCommit.test.js
git commit -m "feat(hooks): extract useSelectionCommit for the select+sync ritual"
```

---

### Task 2: Migrate `MasteryPage`

**Files:**
- Modify: `src/pages/MasteryPage.jsx`
- Test: `src/pages/MasteryPage.test.jsx`

**Interfaces:**
- Consumes: `useSelectionCommit` (Task 1).
- Produces: nothing new consumed by later tasks — each page migration is independent.

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/MasteryPage.test.jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let selectState
vi.mock('../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: { getState: () => authState },
}))

const syncSelectToFirestore = vi.fn()
vi.mock('../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => syncSelectToFirestore(...args),
}))

const { default: MasteryPage } = await import('./MasteryPage')

describe('MasteryPage', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { career: null, mastery: null, setMastery: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting a mastery card sets it and syncs to Firestore', () => {
    render(<MemoryRouter><MasteryPage /></MemoryRouter>)
    const [firstCard] = screen.getAllByRole('option')
    fireEvent.click(firstCard)
    expect(selectState.setMastery).toHaveBeenCalled()
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/MasteryPage.test.jsx`
Expected: FAIL if `MasteryPage.jsx` still imports `useAuthStore`/`syncSelectToFirestore` directly instead of going through the mocked hook — actually since the page currently already calls both mocked modules directly, this test may PASS before the migration. That's expected and fine: this test asserts *behavior*, not implementation, so it must stay green through the refactor. Confirm it passes now (before Step 3) as a baseline, then re-run after Step 3 to confirm it *still* passes — the refactor must not change what the test observes.

- [ ] **Step 3: Refactor `MasteryPage.jsx` to use the hook**

Replace the imports and handler in `src/pages/MasteryPage.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepScreen from '../components/ui/StepScreen'
import SelectCard from '../components/ui/SelectCard'
import { masteries } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'
import { useSelectionCommit } from '../hooks/useSelectionCommit'

function MasteryPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const career = useSelectStore((state) => state.career)
  const selected = useSelectStore((state) => state.mastery)
  const setMastery = useSelectStore((state) => state.setMastery)
  const commitMastery = useSelectionCommit(setMastery)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const base = q ? masteries : masteries.filter((item) => !career || item.careers.includes(career))
    return base.filter((item) => item.name.toLowerCase().includes(q))
  }, [career, query])

  return (
    <StepScreen
      step={1}
      title="Mastery"
      subtitle={
        <h2 className="pixel-font text-sm font-bold text-gray-700">Recommend</h2>
      }
      searchValue={query}
      onSearchChange={(e) => setQuery(e.target.value)}
      searchLabel="ค้นหาทักษะ"
      onNext={() => navigate('/select/university')}
      nextDisabled={!selected}
    >
      <div className="mx-auto max-w-4xl mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((mastery) => (
          <SelectCard
            key={mastery.id}
            name={mastery.name}
            detail={mastery.detail}
            selected={selected === mastery.id}
            onClick={() => commitMastery(mastery.id)}
          />
        ))}
      </div>
    </StepScreen>
  )
}

export default MasteryPage
```

- [ ] **Step 4: Run test to verify it still passes**

Run: `npx vitest run src/pages/MasteryPage.test.jsx`
Expected: PASS (1 test) — same assertions, now exercised through `useSelectionCommit`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MasteryPage.jsx src/pages/MasteryPage.test.jsx
git commit -m "refactor(pages): migrate MasteryPage to useSelectionCommit"
```

---

### Task 3: Migrate `CareerPage`

**Files:**
- Modify: `src/pages/CareerPage.jsx`
- Test: `src/pages/CareerPage.test.jsx`

**Interfaces:**
- Consumes: `useSelectionCommit` (Task 1).

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/CareerPage.test.jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let selectState
vi.mock('../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: { getState: () => authState },
}))

const syncSelectToFirestore = vi.fn()
vi.mock('../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => syncSelectToFirestore(...args),
}))

const { default: CareerPage } = await import('./CareerPage')

describe('CareerPage', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { mbti: null, career: null, setCareer: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting a career card sets it and syncs to Firestore', () => {
    render(<MemoryRouter><CareerPage /></MemoryRouter>)
    const [firstCard] = screen.getAllByRole('option')
    fireEvent.click(firstCard)
    expect(selectState.setCareer).toHaveBeenCalled()
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails or passes as baseline**

Run: `npx vitest run src/pages/CareerPage.test.jsx`
Expected: PASS before refactor too (behavioral test) — confirm baseline green.

- [ ] **Step 3: Refactor `CareerPage.jsx` to use the hook**

```jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepScreen from '../components/ui/StepScreen'
import SelectCard from '../components/ui/SelectCard'
import { careers } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'
import { useSelectionCommit } from '../hooks/useSelectionCommit'

function CareerPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const mbti = useSelectStore((state) => state.mbti)
  const selected = useSelectStore((state) => state.career)
  const setCareer = useSelectStore((state) => state.setCareer)
  const commitCareer = useSelectionCommit(setCareer)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const base = q ? careers : careers.filter((item) => !mbti || item.mbti.includes(mbti))
    return base.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q) ||
        (item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false),
    )
  }, [mbti, query])

  return (
    <StepScreen
      step={0}
      title="Career"
      subtitle={
        <h2 className="pixel-font text-sm font-bold text-gray-700">Recommend</h2>
      }
      searchValue={query}
      onSearchChange={(e) => setQuery(e.target.value)}
      searchLabel="ค้นหาอาชีพ"
      onNext={() => navigate('/select/mastery')}
      nextDisabled={!selected}
      attribution="Occupation data: O*NET Web Services · U.S. DOL/ETA · CC BY 4.0"
    >
      <div className="mx-auto max-w-4xl mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((career) => (
          <SelectCard
            key={career.id}
            name={career.name}
            detail={career.detail}
            selected={selected === career.id}
            onClick={() => commitCareer(career.id)}
          />
        ))}
      </div>
    </StepScreen>
  )
}

export default CareerPage
```

- [ ] **Step 4: Run test to verify it still passes**

Run: `npx vitest run src/pages/CareerPage.test.jsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/pages/CareerPage.jsx src/pages/CareerPage.test.jsx
git commit -m "refactor(pages): migrate CareerPage to useSelectionCommit"
```

---

### Task 4: Migrate `UniversityPage`

**Files:**
- Modify: `src/pages/UniversityPage.jsx`
- Test: `src/pages/UniversityPage.test.jsx`

**Interfaces:**
- Consumes: `useSelectionCommit` (Task 1); mocks `useTcasUniversities` from `../hooks/useMytcas` (signature: `() => { universities, total, loading, error, refetch }`, confirmed at `src/hooks/useMytcas.js:11-14`).

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/UniversityPage.test.jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let selectState
vi.mock('../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: { getState: () => authState },
}))

const syncSelectToFirestore = vi.fn()
vi.mock('../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => syncSelectToFirestore(...args),
}))

vi.mock('../hooks/useMytcas', () => ({
  useTcasUniversities: () => ({
    universities: [
      { university_id: 'CU', university_name_th: 'จุฬาลงกรณ์', university_name_en: 'Chulalongkorn', logo_url: null },
    ],
    total: 1,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock('../utils/cloudAsset', () => ({
  cloudAsset: vi.fn().mockResolvedValue(null),
}))

const { default: UniversityPage } = await import('./UniversityPage')

describe('UniversityPage', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { university: null, setUniversity: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting a university sets it and syncs to Firestore', () => {
    render(<MemoryRouter><UniversityPage /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText('จุฬาลงกรณ์'))
    expect(selectState.setUniversity).toHaveBeenCalledWith('CU')
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })
})
```

- [ ] **Step 2: Run test to verify baseline**

Run: `npx vitest run src/pages/UniversityPage.test.jsx`
Expected: PASS before refactor (behavioral baseline).

- [ ] **Step 3: Refactor `UniversityPage.jsx` to use the hook**

Change only the import and the selection handler (the `UniversityLogo` component and everything else stays as-is):

```jsx
import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StepScreen from '../components/ui/StepScreen'
import { universities as legacyUniversities } from '../data/onboardingData'
import { useTcasUniversities } from '../hooks/useMytcas'
import { useSelectStore } from '../stores/useSelectStore'
import { useSelectionCommit } from '../hooks/useSelectionCommit'
import { cloudAsset } from '../utils/cloudAsset'
```

```jsx
function UniversityPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { universities, loading, error } = useTcasUniversities()
  const selected = useSelectStore((state) => state.university)
  const setUniversity = useSelectStore((state) => state.setUniversity)
  const commitUniversity = useSelectionCommit(setUniversity)
```

```jsx
                onClick={() => commitUniversity(university.university_id)}
```

(Everything else in the file — `legacyByName`, `badgeText`, `UniversityLogo`, the `useMemo` filter, the `StepScreen` JSX — is unchanged.)

- [ ] **Step 4: Run test to verify it still passes**

Run: `npx vitest run src/pages/UniversityPage.test.jsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/pages/UniversityPage.jsx src/pages/UniversityPage.test.jsx
git commit -m "refactor(pages): migrate UniversityPage to useSelectionCommit"
```

---

### Task 5: Migrate `ProgramPage`

**Files:**
- Modify: `src/pages/ProgramPage.jsx`
- Test: `src/pages/ProgramPage.test.jsx`

**Interfaces:**
- Consumes: `useSelectionCommit` (Task 1); mocks `useTcasFaculties`, `useTcasPrograms`, `useTcasRounds` from `../hooks/useMytcas` (signatures confirmed at `src/hooks/useMytcas.js:17,27,47`, each returning `{ ..., loading, error }` plus the named data array).

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/ProgramPage.test.jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let selectState
vi.mock('../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: { getState: () => authState },
}))

const syncSelectToFirestore = vi.fn()
vi.mock('../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => syncSelectToFirestore(...args),
}))

vi.mock('../hooks/useMytcas', () => ({
  useTcasFaculties: () => ({
    faculties: [{ faculty_id: 'F1', faculty_name_th: 'วิศวกรรมศาสตร์', program_count: 1 }],
    loading: false,
    error: null,
  }),
  useTcasPrograms: () => ({
    programs: [
      { _id: 'P1', program_id: 'PROG1', program_name_th: 'วิศวกรรมคอมพิวเตอร์', field_name_th: '', program_type_name_th: 'ปกติ' },
    ],
    loading: false,
    error: null,
  }),
  useTcasRounds: () => ({ rounds: [] }),
}))

const { default: ProgramPage } = await import('./ProgramPage')

describe('ProgramPage', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { university: 'CU', program: null, setProgram: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting a faculty then a program sets it and syncs to Firestore', () => {
    render(<MemoryRouter><ProgramPage /></MemoryRouter>)
    fireEvent.click(screen.getByText('วิศวกรรมศาสตร์'))
    fireEvent.click(screen.getByText('วิศวกรรมคอมพิวเตอร์'))
    expect(selectState.setProgram).toHaveBeenCalledWith('PROG1')
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })
})
```

- [ ] **Step 2: Run test to verify baseline**

Run: `npx vitest run src/pages/ProgramPage.test.jsx`
Expected: PASS before refactor (behavioral baseline).

- [ ] **Step 3: Refactor `ProgramPage.jsx` to use the hook**

Change only the import and the selection handler:

```jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepScreen from '../components/ui/StepScreen'
import { useTcasFaculties, useTcasPrograms, useTcasRounds } from '../hooks/useMytcas'
import { useSelectStore } from '../stores/useSelectStore'
import { useSelectionCommit } from '../hooks/useSelectionCommit'
```

```jsx
  const university = useSelectStore((state) => state.university)
  const selected = useSelectStore((state) => state.program)
  const setProgram = useSelectStore((state) => state.setProgram)
  const commitProgram = useSelectionCommit(setProgram)
```

```jsx
                onClick={() => commitProgram(program.program_id)}
```

(`ProgramRoundBadge`, `filteredFaculties`/`filteredPrograms`, the faculty-picker view, and the rest of the JSX are unchanged.)

- [ ] **Step 4: Run test to verify it still passes**

Run: `npx vitest run src/pages/ProgramPage.test.jsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProgramPage.jsx src/pages/ProgramPage.test.jsx
git commit -m "refactor(pages): migrate ProgramPage to useSelectionCommit"
```

---

### Task 6: Migrate `MbtiPage`

**Files:**
- Modify: `src/pages/MbtiPage.jsx`
- Test: `src/pages/MbtiPage.test.jsx`

**Interfaces:**
- Consumes: `useSelectionCommit` (Task 1). This page also calls `navigate(...)` in the same click handler — the hook only replaces the setter+sync half; navigation stays as an explicit second statement in the page, since the hook must not own navigation timing (the other four pages don't navigate on select at all — only on the separate "Next" button).

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/MbtiPage.test.jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

let selectState
vi.mock('../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: { getState: () => authState },
}))

const syncSelectToFirestore = vi.fn()
vi.mock('../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => syncSelectToFirestore(...args),
}))

const { default: MbtiPage } = await import('./MbtiPage')

describe('MbtiPage', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { mbti: null, setMbti: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting the current MBTI type sets it, syncs, and navigates to /select/career', () => {
    render(
      <MemoryRouter initialEntries={['/select/mbti']}>
        <Routes>
          <Route path="/select/mbti" element={<MbtiPage />} />
          <Route path="/select/career" element={<div>CAREER</div>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Select / }))
    expect(selectState.setMbti).toHaveBeenCalled()
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
    expect(screen.getByText('CAREER')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify baseline**

Run: `npx vitest run src/pages/MbtiPage.test.jsx`
Expected: PASS before refactor (behavioral baseline).

- [ ] **Step 3: Refactor `MbtiPage.jsx` to use the hook**

Change the import and the Select button's handler:

```jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import CharacterSprite from '../components/ui/CharacterSprite'
import { mbtiCharacters, mbtiDescriptions } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'
import { useSelectionCommit } from '../hooks/useSelectionCommit'
```

```jsx
  const selectedMbti = useSelectStore((state) => state.mbti)
  const setMbti = useSelectStore((state) => state.setMbti)
  const commitMbti = useSelectionCommit(setMbti)
```

```jsx
          <button
            onClick={() => {
              commitMbti(current.code)
              navigate('/select/career')
            }}
```

- [ ] **Step 4: Run test to verify it still passes**

Run: `npx vitest run src/pages/MbtiPage.test.jsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/pages/MbtiPage.jsx src/pages/MbtiPage.test.jsx
git commit -m "refactor(pages): migrate MbtiPage to useSelectionCommit"
```

---

### Task 7: Full suite + manual smoke of the onboarding flow

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass, including the 6 new/changed files from Tasks 1-6 and every pre-existing test (no regressions).

- [ ] **Step 2: Manual smoke test of the onboarding funnel**

Run: `npm run dev`, open the app, and walk `/select/mbti` → `/select/career` → `/select/mastery` → `/select/university` → `/select/program` end to end:
- Confirm each page still lets you pick a value, the pink "selected" ring still shows, and "Next" (or, on the MBTI page, "Select") still advances to the next step.
- Confirm no console errors from the removed direct `useAuthStore`/`syncSelectToFirestore` imports (they must now only be imported inside `useSelectionCommit.js`).

- [ ] **Step 3: Grep check — no page re-imports the old pair directly**

Run: `grep -rn "syncSelectToFirestore" src/pages/`
Expected: zero matches (only `src/hooks/useSelectionCommit.js` and `src/utils/syncSelectToFirestore.js` itself reference it now).

---

## Self-Review

**Spec coverage:** All 5 selection pages (`MbtiPage`, `CareerPage`, `MasteryPage`, `UniversityPage`, `ProgramPage`) migrated — Tasks 2-6. Hook created and unit-tested — Task 1. Full-suite and manual verification — Task 7. Deviation from the original roadmap sketch (narrower scope than a full generic `SelectionFlow`) is documented in the Architecture section with the concrete structural differences that ruled it out.

**Placeholder scan:** every step shows complete, real code (no "TBD"/"similar to Task N"/"add error handling"); each test asserts concrete DOM text/labels taken from the actual page source read during planning.

**Type consistency:** `useSelectionCommit(setter) => (value) => void` is the one signature used identically in all six call sites (Tasks 2-6) and in its own test (Task 1) — verified no drift in parameter name or return shape across tasks.
