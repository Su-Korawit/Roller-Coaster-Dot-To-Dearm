# Architecture Improvement — Plan 13: SocialPanel Data Layer (Claude Code)

**Goal:** Extend `src/stores/useSocialStore.js` to eliminate a real duplicate-read bug and two inline Firestore concerns in `src/components/SocialPanel.jsx` (765 lines, third god-panel): (1) `SocialPanel`'s init effect does its own `getDoc(refs.user(user.uid))` for a full profile AND separately calls the store's `loadMyProfile()` (which only extracts social arrays) — two reads of the same doc, every panel open; (2) `SchoolPicker` writes school data directly; (3) `RequestsTab` hydrates pending-request uids to full user docs with its own local `getDoc` loop. This is step 1; Plan 14 rewires the JSX — Cursor's job.

**Architecture:** Extend `loadMyProfile()` to also capture the full document (not just the 4 social arrays) into a new `myProfile` state field — this removes the need for `SocialPanel`'s separate duplicate read entirely, it's not just a relocation. Add `saveSchool`/`hydrateRequestUsers` as new actions on the same store.

**Tech Stack:** Zustand 5, Firebase Firestore, Vitest.

## Global Constraints

- **No TypeScript** — plain JS only.
- **Firebase paths** — only via `src/lib/db.js` (`refs.user` — already used throughout this store).
- Do not change `SocialPanel.jsx` in this plan — that's Plan 14, Cursor's job.
- Do not touch the pre-existing `MatchedTab` bug (`m.shapes.readProfile(user)` at `SocialPanel.jsx:544-545`, throws at runtime for any match with an `mbti` value) — flagged for a separate fix, out of scope here.
- Preserve exact current behavior for the school-write and request-hydration logic — this is extraction, not redesign.

---

### Task 1: Extend `loadMyProfile` to capture full profile, add `myProfile` state

**Files:**
- Modify: `src/stores/useSocialStore.js`
- Modify: `src/stores/useSocialStore.test.js`

**Interfaces:**
- Produces: `myProfile: null` initial state; `loadMyProfile()` now also sets `myProfile: data` (full raw Firestore doc) alongside the existing 4 social-array fields. No signature change — same zero-argument call.

- [ ] **Step 1: Write the failing test** — add to `src/stores/useSocialStore.test.js`:

```js
describe('loadMyProfile', () => {
  it('populates myProfile with the full doc, plus the social arrays', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        schoolId: 'school-1', schoolName: 'Test School', photoURL: 'https://x',
        following: ['a'], followers: ['b'], followRequests: ['c'], sentRequests: ['d'],
      }),
    })
    await useSocialStore.getState().loadMyProfile()
    const state = useSocialStore.getState()
    expect(state.myProfile).toMatchObject({ schoolId: 'school-1', schoolName: 'Test School', photoURL: 'https://x' })
    expect(state.following).toEqual(['a'])
    expect(state.followers).toEqual(['b'])
    expect(state.pendingRequests).toEqual(['c'])
    expect(state.sentRequests).toEqual(['d'])
  })

  it('does nothing when the doc does not exist', async () => {
    useSocialStore.setState({ myProfile: null })
    getDoc.mockResolvedValueOnce({ exists: () => false })
    await useSocialStore.getState().loadMyProfile()
    expect(useSocialStore.getState().myProfile).toBeNull()
  })
})
```
(Match this test's mock setup — `auth.currentUser`, `getDoc` mocking — to whatever `myUid()`-dependent tests in this file already do; check `checkAndAnimateMatch`'s existing tests, if any, or the file's top-level `vi.mock('../firebase', ...)` block for the established `auth.currentUser` shape.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useSocialStore.test.js`
Expected: FAIL — `state.myProfile` is `undefined`, not matching

- [ ] **Step 3: Implement.** Add `myProfile: null,` to the store's initial state (alongside `nearbyUsers`/`following`/etc.). Update `loadMyProfile`:
```js
  // Fetches the current user's Firestore doc, syncs all social arrays into
  // the store, AND captures the full doc as myProfile — the single source
  // SocialPanel needs (schoolId/schoolName/photoURL/etc.), removing the need
  // for a separate duplicate read.
  loadMyProfile: async () => {
    const uid = myUid()
    const snap = await getDoc(refs.user(uid))
    if (!snap.exists()) return
    const data = snap.data()
    set({
      myProfile: data,
      following: data.following ?? [],
      followers: data.followers ?? [],
      pendingRequests: data.followRequests ?? [],
      sentRequests: data.sentRequests ?? [],
    })
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/useSocialStore.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/useSocialStore.js src/stores/useSocialStore.test.js
git commit -m "feat: capture full myProfile in useSocialStore.loadMyProfile, eliminating SocialPanel's duplicate read"
```

---

### Task 2: Add `saveSchool` action

**Files:**
- Modify: `src/stores/useSocialStore.js`
- Modify: `src/stores/useSocialStore.test.js`

**Interfaces:**
- Produces: `saveSchool(uid, schoolData): Promise<void>` — writes `schoolData` to `refs.user(uid)` and merges it into `myProfile` state, extracted verbatim from `SocialPanel.jsx`'s current `SchoolPicker` write (`src/components/SocialPanel.jsx:98`) plus the local-state merge previously done by `handleSchoolSaved` (`src/components/SocialPanel.jsx:637-640`).
- Consumes: add `updateDoc` to the existing `firebase/firestore` import (`getDoc, getDocs, serverTimestamp, setDoc, writeBatch, arrayRemove, arrayUnion` — add `updateDoc`).

- [ ] **Step 1: Write the failing test** — add to `src/stores/useSocialStore.test.js`:

```js
describe('saveSchool', () => {
  it('writes schoolData to refs.user(uid) and merges it into myProfile', async () => {
    useSocialStore.setState({ myProfile: { displayName: 'Me', schoolId: null } })
    const schoolData = { schoolId: 'school-2', schoolName: 'New School', schoolLat: 1, schoolLng: 2 }
    await useSocialStore.getState().saveSchool('uid-1', schoolData)
    expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ _path: 'users/uid-1' }), schoolData)
    expect(useSocialStore.getState().myProfile).toEqual({ displayName: 'Me', schoolId: 'school-2', schoolName: 'New School', schoolLat: 1, schoolLng: 2 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useSocialStore.test.js`
Expected: FAIL — `saveSchool is not a function`

- [ ] **Step 3: Implement** — update the `firebase/firestore` import to add `updateDoc`, then add after `unfollowUser` (or wherever fits):

```js
  // Writes school selection (from SchoolPicker's Google Places result) and
  // merges it into the cached myProfile so the component doesn't need its
  // own local copy of the just-saved fields.
  saveSchool: async (uid, schoolData) => {
    await updateDoc(refs.user(uid), schoolData)
    set((s) => ({ myProfile: s.myProfile ? { ...s.myProfile, ...schoolData } : s.myProfile }))
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/useSocialStore.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/useSocialStore.js src/stores/useSocialStore.test.js
git commit -m "feat: add useSocialStore.saveSchool - extracted from SocialPanel.SchoolPicker"
```

---

### Task 3: Add `requestUsers` cache + `hydrateRequestUsers`

**Files:**
- Modify: `src/stores/useSocialStore.js`
- Modify: `src/stores/useSocialStore.test.js`

**Interfaces:**
- Produces: `requestUsers: {}` state field; `hydrateRequestUsers(uids): Promise<void>` — resolves each uid to its full user doc and merges into `requestUsers`, extracted verbatim from `SocialPanel.jsx`'s current `RequestsTab` effect (`src/components/SocialPanel.jsx:450-457`).

- [ ] **Step 1: Write the failing test** — add to `src/stores/useSocialStore.test.js`:

```js
describe('hydrateRequestUsers', () => {
  it('resolves each uid to its user doc and merges into requestUsers', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ uid: 'uid-1', displayName: 'Alice' }) })
      .mockResolvedValueOnce({ exists: () => false })
    await useSocialStore.getState().hydrateRequestUsers(['uid-1', 'uid-2'])
    expect(useSocialStore.getState().requestUsers).toEqual({
      'uid-1': { uid: 'uid-1', displayName: 'Alice' },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useSocialStore.test.js`
Expected: FAIL — `hydrateRequestUsers is not a function`

- [ ] **Step 3: Implement.** Add `requestUsers: {},` to initial state, then add the action after `saveSchool`:

```js
  // Resolves each pending-request uid to its full user doc. Extracted
  // verbatim from SocialPanel.jsx's RequestsTab hydration effect.
  hydrateRequestUsers: async (uids) => {
    const entries = await Promise.all(
      uids.map(async (uid) => {
        const snap = await getDoc(refs.user(uid))
        return snap.exists() ? [uid, snap.data()] : null
      }),
    )
    set((s) => ({ requestUsers: { ...s.requestUsers, ...Object.fromEntries(entries.filter(Boolean)) } }))
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/useSocialStore.test.js`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: all green, output pristine

- [ ] **Step 6: Commit**

```bash
git add src/stores/useSocialStore.js src/stores/useSocialStore.test.js
git commit -m "feat: add useSocialStore.hydrateRequestUsers - extracted from SocialPanel.RequestsTab"
```

---

## Handoff

Once all 3 tasks are committed, Plan 14 (`docs/superpowers/plans/2026-07-04-plan14-cursor-socialpanel-jsx.md`) rewires `SocialPanel.jsx` to use these — hand that to Cursor.
