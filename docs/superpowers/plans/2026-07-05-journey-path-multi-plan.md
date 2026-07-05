# Journey Path v2: MBTI → Ranked Plans → University → Program Implementation Plan

> **For agentic workers (Cursor):** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Commit after each task. **Depends on:** `2026-07-05-popup-template.md`. **Pairs with:** `2026-07-05-onboarding-redesign.md` (visuals).

**Goal:** New onboarding data/flow: **MBTI → Plan List → University → Program**, where a user builds **multiple ranked Plans** (drag to order by priority; each Plan = one `{ university, program }` target). **Career and Mastery are removed from the flow** (Mastery becomes its own feature — `2026-07-05-mastery-under-calendar.md`). Adding an **Edit** entry from Profile lets the user change MBTI and add/reorder plans later.

**Architecture:** `profile.plans[]` is an **ordered** array (index = rank, rank 1 = top choice) via `db.js` shapes (the single seam). `usePlansStore` owns the list + `reorderPlans`. Back-compat: singular `profile.program`/`profile.university` mirror the **rank-1** plan so the 16+ downstream readers stay untouched. MBTI stays in `useSelectStore`. Career/mastery fields remain in the schema but are no longer written by onboarding.

**Tech Stack:** React 19, Zustand 5 (persist), `@hello-pangea/dnd`, Firebase Firestore, Vitest + jsdom.

## Global Constraints

- Plain JS/JSX only.
- Firestore writes ONLY through `src/lib/db.js` `shapes` + `src/utils/syncSelectToFirestore.js`. Never inline `doc(db, …)`.
- **Back-compat mandatory:** `readProfile` still returns singular `program`/`university`/`career`/`masteryTrack`; downstream readers are NOT modified.
- Rank = array order. `plans[0]` = rank 1 (highest priority) and is the one mirrored to singular fields.

---

### Task 1: Extend db.js shapes with ordered plans[]

**Files:**
- Modify: `src/lib/db.js` (`shapes.profileFields`, `shapes.readProfile`)
- Test: `src/lib/db.test.js`

**Interfaces:**
- `shapes.profileFields({ mbti, plans })` — writes `profile.plans = [{ id, university, program, addedAt }]` **in order**, and mirrors `plans[0]` into singular `profile.university`/`profile.program` (+ `profile.programs=[{programId, addedAt}]` for legacy). `career`/`mastery` still accepted but optional (onboarding won't pass them).
- `shapes.readProfile(userDoc)` — returns `plans` (ordered; synthesized from legacy `programs[]`/singular if absent) plus the existing singular fields.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest'
import { shapes } from './db'

describe('shapes plans (ordered)', () => {
  it('mirrors rank-1 (plans[0]) into singular fields', () => {
    const p = shapes.profileFields({ mbti: 'INTJ', plans: [
      { id: 'a', university: 'u1', program: 'p1', addedAt: 1 },
      { id: 'b', university: 'u2', program: 'p2', addedAt: 2 },
    ]})
    expect(p.plans.map((x) => x.id)).toEqual(['a', 'b'])   // order preserved
    expect(p.university).toBe('u1')  // rank-1 mirror
    expect(p.program).toBe('p1')
  })
  it('readProfile synthesizes one plan from legacy singular fields', () => {
    const r = shapes.readProfile({ profile: { program: 'p9', university: 'u9' } })
    expect(r.plans).toEqual([{ id: expect.any(String), university: 'u9', program: 'p9' }])
  })
})
```

- [ ] **Step 2:** `npm test -- db` → FAIL.
- [ ] **Step 3: Implement** in `src/lib/db.js`:

```js
profileFields: ({ mbti, career, mastery, plans } = {}) => {
  const profile = {}
  if (mbti)    profile.mbti = mbti
  if (career)  profile.career = career            // kept for back-compat; onboarding no longer sets it
  if (mastery) profile.masteryTrack = mastery     // kept for back-compat
  if (Array.isArray(plans) && plans.length) {
    profile.plans = plans.map((pl) => ({
      id: pl.id, university: pl.university ?? null, program: pl.program ?? null, addedAt: pl.addedAt ?? Date.now(),
    }))
    const top = profile.plans[0]                  // rank 1
    if (top.university) profile.university = top.university
    if (top.program) {
      profile.program = top.program
      profile.programs = [{ programId: top.program, addedAt: top.addedAt }]
    }
  }
  return profile
},

readProfile: (userDoc = {}) => {
  const p = userDoc.profile ?? {}
  const masteryTrack = p.masteryTrack ?? userDoc.mastery ?? null
  const singleUni = p.university ?? userDoc.university ?? null
  const singleProg = p.program ?? userDoc.program ?? null
  const plans = p.plans ?? ((singleProg || singleUni)
    ? [{ id: 'legacy', university: singleUni, program: singleProg }]
    : [])
  return {
    mbti: p.mbti ?? userDoc.mbti ?? null,
    program: singleProg,
    career: p.career ?? userDoc.career ?? null,
    masteryTrack,
    university: singleUni,
    plans,
    masteryTracks: p.masteryTracks ?? (masteryTrack ? [{ masteryId: masteryTrack }] : []),
  }
},
```

- [ ] **Step 4:** `npm test -- db` → PASS.
- [ ] **Step 5:** `git commit -m "feat(profile): ordered plans[] in db shapes with rank-1 mirror"`

---

### Task 2: usePlansStore with reorder

**Files:**
- Create: `src/stores/usePlansStore.js`
- Test: `src/stores/usePlansStore.test.js`

**Interfaces:** state `{ plans: [], activePlanId: null }`; actions `addPlan()` (returns id, appends to end), `removePlan(id)`, `updatePlan(id, patch)`, `setActivePlan(id)`, `reorderPlans(fromIndex, toIndex)`, `resetPlans()`. Persist key `rc-plans-store`.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { usePlansStore } from './usePlansStore'

describe('usePlansStore', () => {
  beforeEach(() => usePlansStore.getState().resetPlans())
  it('adds a plan (appended, made active)', () => {
    const id = usePlansStore.getState().addPlan()
    expect(usePlansStore.getState().activePlanId).toBe(id)
  })
  it('reorders by index (rank change)', () => {
    const a = usePlansStore.getState().addPlan()
    const b = usePlansStore.getState().addPlan()
    usePlansStore.getState().reorderPlans(1, 0)             // move b to rank 1
    expect(usePlansStore.getState().plans.map((p) => p.id)).toEqual([b, a])
  })
  it('updates and removes by id', () => {
    const a = usePlansStore.getState().addPlan()
    usePlansStore.getState().updatePlan(a, { university: 'u1' })
    expect(usePlansStore.getState().plans[0].university).toBe('u1')
    usePlansStore.getState().removePlan(a)
    expect(usePlansStore.getState().plans).toHaveLength(0)
  })
})
```

- [ ] **Step 2:** `npm test -- usePlansStore` → FAIL.
- [ ] **Step 3: Implement**

```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let seq = 0
const nextId = () => `plan-${++seq}-${Date.now()}`

export const usePlansStore = create(
  persist(
    (set) => ({
      plans: [],
      activePlanId: null,
      addPlan: () => {
        const plan = { id: nextId(), university: null, program: null, addedAt: Date.now() }
        set((s) => ({ plans: [...s.plans, plan], activePlanId: plan.id }))
        return plan.id
      },
      updatePlan: (id, patch) => set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePlan: (id) => set((s) => {
        const plans = s.plans.filter((p) => p.id !== id)
        const activePlanId = s.activePlanId === id ? (plans[0]?.id ?? null) : s.activePlanId
        return { plans, activePlanId }
      }),
      reorderPlans: (from, to) => set((s) => {
        const plans = [...s.plans]
        const [moved] = plans.splice(from, 1)
        plans.splice(to, 0, moved)
        return { plans }
      }),
      setActivePlan: (id) => set({ activePlanId: id }),
      resetPlans: () => set({ plans: [], activePlanId: null }),
    }),
    { name: 'rc-plans-store' },
  ),
)
```

- [ ] **Step 4:** `npm test -- usePlansStore` → PASS.
- [ ] **Step 5:** `git commit -m "feat(plans): usePlansStore with ranked reorder"`

---

### Task 3: Sync ordered plans[] to Firestore

**Files:**
- Modify: `src/utils/syncSelectToFirestore.js`
- Test: extend its test.

**Interfaces:** write path pulls `mbti` from `useSelectStore` + `plans` (in order) from `usePlansStore`, through `shapes.profileFields`. `hydrateSelectStoreFromFirestore` seeds `usePlansStore` from `readProfile().plans`.

- [ ] **Step 1:** Update write:

```js
import { usePlansStore } from '../stores/usePlansStore'
const { mbti } = useSelectStore.getState()
const { plans } = usePlansStore.getState()
const profile = shapes.profileFields({ mbti, plans })
await setDoc(refs.user(uid), { profile: { ...profile, updatedAt: serverTimestamp() } }, { merge: true })
```

- [ ] **Step 2:** In hydrate: `usePlansStore.setState({ plans: shapes.readProfile(snap.data()).plans })`.
- [ ] **Step 3:** `npm test -- syncSelect` → PASS.
- [ ] **Step 4:** `git commit -m "feat(plans): sync ordered plans[] + hydrate"`

---

### Task 4: University/Program commit into the active plan

**Files:**
- Modify: `src/components/onboarding/UniversityStep.jsx`
- Modify: `src/components/onboarding/ProgramDetail.jsx` (from the redesign plan)

**Interfaces:** University commits `updatePlan(activePlanId, { university })` + sync; ProgramDetail `onConfirm` commits `updatePlan(activePlanId, { program })` + sync. ProgramDetail reads the active plan's `university` to load rounds.

- [ ] **Step 1:** In `UniversityStep.jsx` replace `useSelectionCommit(setUniversity)` with:

```jsx
import { usePlansStore } from '../../stores/usePlansStore'
import { syncSelectToFirestore } from '../../utils/syncSelectToFirestore'
import { useAuthStore } from '../../stores/useAuthStore'
const activePlanId = usePlansStore((s) => s.activePlanId)
const updatePlan = usePlansStore((s) => s.updatePlan)
const uid = useAuthStore((s) => s.user?.uid)
const commitUniversity = (id) => { updatePlan(activePlanId, { university: id }); if (uid) syncSelectToFirestore(uid) }
```

- [ ] **Step 2:** In `ProgramDetail.jsx`, read `const plan = usePlansStore((s) => s.plans.find((p) => p.id === s.activePlanId))`; use `plan.university` for `useTcasRounds`; `onConfirm` → `updatePlan(activePlanId, { program })` + sync.
- [ ] **Step 3:** `npm test -- UniversityStep ProgramDetail` → PASS.
- [ ] **Step 4:** `git commit -m "feat(plans): University/ProgramDetail commit into active plan"`

---

### Task 5: Wire the new flow into OnboardingModal

**Files:**
- Modify: `src/components/onboarding/OnboardingModal.jsx`

**Interfaces:** step machine — `step`: `0 intro, 1 mbti, 2 planList`; `subStep`: `null | 'university' | 'program'`.
- PlanList `onEditPlan(id)` → `setActivePlan(id)`, `setSubStep('university')`.
- University `onNext` → `setSubStep('program')`; ProgramDetail `onConfirm` → `setSubStep(null)` (back to list).
- PlanList `onNext` (done) → `close()`.
- Gate: `const plans = usePlansStore((s) => s.plans); const hasCommittedPlan = plans.some((p) => p.program); const visible = forceOpen || (!!user && !hasCommittedPlan)`.

- [ ] **Step 1:** Replace the flat `STEP_COMPONENTS` with the explicit `step`/`subStep` machine (render Intro → MbtiStep → PlanList; render UniversityStep/ProgramDetail when `subStep` set). Update the visibility gate.
- [ ] **Step 2:** `npm test -- OnboardingModal` → update/PASS.
- [ ] **Step 3: Dev-check** — new user: Intro → MBTI → Plan List → add plan → University → Program detail → back to list → add 2nd → reorder → finish. Confirm `profile.plans` ordered + `profile.program` mirrors rank-1.
- [ ] **Step 4:** `git commit -m "feat(plans): MBTI → PlanList → University → Program flow"`

---

### Task 6: Edit entry from Profile (edit MBTI + plans)

**Files:**
- Modify: `src/components/ProfilePanel.jsx` (or the profile header actions where the current "Edit your path" lives)

**Interfaces:** the Profile "Edit" action calls `useOnboardingUiStore.open()` (forceOpen) → the onboarding editor opens **without blanking** existing MBTI/plans, so the user can change MBTI and add/reorder plans. This reuses the existing re-entry mechanism (`useOnboardingUiStore`), just repointed to the redesigned flow.

- [ ] **Step 1:** Ensure the Profile "Edit" button calls `openOnboarding()` and that `OnboardingModal` (Task 5) does NOT reset `useSelectStore`/`usePlansStore` on open (re-entry shows current values).
- [ ] **Step 2:** `npm test` → PASS. Dev-check: from Profile, Edit → change MBTI, add a plan, reorder → close → Profile reflects the new rank-1 plan.
- [ ] **Step 3:** `git commit -m "feat(plans): Profile Edit reopens flow to edit MBTI + plans"`

---

### Task 7: Point Profile journey view at rank-1 plan

**Files:**
- Modify: `src/components/profile/JourneyManager.jsx`

**Interfaces:** `selectedUniversity`/`selectedProgram` derive from `usePlansStore.plans[0]` (rank 1). Remove the Career/Mastery portfolio circles from this view if the redesign drops them (confirm against `2026-07-05-mastery-under-calendar.md`, which relocates Mastery). Keep `mbti` from `useSelectStore`.

- [ ] **Step 1:** Replace flat `useSelectStore.university/program` reads with `usePlansStore((s) => s.plans[0])`. **Step 2:** `npm test` → PASS. Dev-check. **Step 3:** `git commit -m "feat(plans): Profile journey reads rank-1 plan"`

---

### Task 8: End-to-end verification

- [ ] **Step 1:** `npm test` — full suite green.
- [ ] **Step 2:** `npm run dev` — onboard → 2 ranked plans → reorder → delete → Edit from Profile → confirm `profile.plans` order persists and singular `profile.program` mirrors rank-1; matchScore/Profile still read a valid program.
- [ ] **Step 3:** Legacy doc (singular `profile.program` only) hydrates into one plan; onboarding doesn't force-open.

## Self-Review Checklist

- `plans[]` is ordered; `plans[0]` mirrors singular fields; downstream readers untouched.
- `reorderPlans` used by the Plan List drag (onboarding-redesign Task 6).
- Career/Mastery no longer collected in onboarding; fields still readable for back-compat.
- No inline `doc(db, …)`.
