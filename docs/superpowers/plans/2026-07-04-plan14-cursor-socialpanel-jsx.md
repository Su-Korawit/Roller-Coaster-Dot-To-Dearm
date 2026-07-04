# Architecture Improvement — Plan 14: SocialPanel JSX Rewire (Cursor)

> **Prerequisite:** Plan 13 (`2026-07-04-plan13-claude-socialpanel-store.md`) must be done first — it adds `myProfile`/`requestUsers` state and `saveSchool`/`hydrateRequestUsers` actions (plus an extended `loadMyProfile`) to `src/stores/useSocialStore.js`. Confirm these exist before starting.

**Goal:** Slim `src/components/SocialPanel.jsx` — remove its duplicate profile read, and repoint `SchoolPicker`/`RequestsTab` through the new store actions. No visual change; `onClose`/`onOpenChat` remain the entire external contract (single caller: `HomePage.jsx:295`).

**Architecture:** Pure call-site swap across 3 tasks. The main win is Task 2 (removing the duplicate `getDoc` in the init effect) — do not skip it even though it touches the most code, since it's the one genuine bug this decomposition fixes.

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- Do not touch any JSX markup/layout.
- **Do not fix the `MatchedTab` bug** (`m.shapes.readProfile(user)` — throws for matches with an `mbti` value) — explicitly out of scope, flagged separately.
- Verify with `npm test` after each task; manual dev verification at the end (school-picking, follow requests, and match-checking are all live social features).

---

### Task 1: `SchoolPicker` → `useSocialStore.saveSchool`

**Files:** Modify `src/components/SocialPanel.jsx`

- [ ] **Step 1 — inside the `place_changed` listener** (currently around lines 91-99), replace:
```jsx
      try {
        const schoolData = {
          schoolId: place.place_id,
          schoolName: place.name,
          schoolLat: place.geometry.location.lat(),
          schoolLng: place.geometry.location.lng(),
        }
        await updateDoc(refs.user(uid), schoolData)
        onSavedRef.current(schoolData)
      } catch {
```
with:
```jsx
      try {
        const schoolData = {
          schoolId: place.place_id,
          schoolName: place.name,
          schoolLat: place.geometry.location.lat(),
          schoolLng: place.geometry.location.lng(),
        }
        await useSocialStore.getState().saveSchool(uid, schoolData)
        onSavedRef.current(schoolData)
      } catch {
```

- [ ] **Step 2:** `npm test` → PASS. Manual: as a new user (or one without a school), pick a school via the Places autocomplete — confirm it saves and the map view unlocks.

- [ ] **Step 3: Commit** — `git commit -m "refactor: rewire SocialPanel.SchoolPicker through useSocialStore.saveSchool"`

---

### Task 2: Main `SocialPanel` — remove duplicate profile read

**Files:** Modify `src/components/SocialPanel.jsx`

- [ ] **Step 1:** Replace local `myProfile` state with a store selector. Currently (line 604):
```jsx
  const [myProfile, setMyProfile] = useState(null)
```
Delete this line entirely, and add a selector near the other `useSocialStore` selectors (around line 587-601):
```jsx
  const myProfile = useSocialStore((s) => s.myProfile)
```

- [ ] **Step 2 — init effect** (currently lines 608-635), replace:
```jsx
  useEffect(() => {
    if (!user?.uid) return
    let active = true

    async function init() {
      try {
        const snap = await getDoc(refs.user(user.uid))
        if (!active) return
        if (snap.exists()) {
          const data = snap.data()
          setMyProfile(data)
          if (data.schoolId) {
            await loadNearbyUsers(data.schoolId)
            const nearby = useSocialStore.getState().nearbyUsers
            computeAndSaveMatchScores(data, nearby)
          }
        }
        await loadMyProfile()
      } finally {
        if (active) setLoading(false)
      }
    }

    init()
    const unsub = subscribeToRequests(user.uid)
    return () => { active = false; unsub() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])
```
with:
```jsx
  useEffect(() => {
    if (!user?.uid) return
    let active = true

    async function init() {
      try {
        await loadMyProfile()
        if (!active) return
        const data = useSocialStore.getState().myProfile
        if (data?.schoolId) {
          await loadNearbyUsers(data.schoolId)
          const nearby = useSocialStore.getState().nearbyUsers
          computeAndSaveMatchScores(data, nearby)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    init()
    const unsub = subscribeToRequests(user.uid)
    return () => { active = false; unsub() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])
```

- [ ] **Step 3 — `handleSchoolSaved`** (currently lines 637-640), replace:
```jsx
  function handleSchoolSaved(schoolData) {
    setMyProfile((prev) => ({ ...prev, ...schoolData }))
    loadNearbyUsers(schoolData.schoolId)
  }
```
with:
```jsx
  function handleSchoolSaved(schoolData) {
    loadNearbyUsers(schoolData.schoolId)
  }
```
(`myProfile` is already updated by `saveSchool` itself — Task 1's change — so this handler no longer needs to touch it.)

- [ ] **Step 4:** Update the `firebase/firestore` import (currently `import { getDoc, updateDoc } from 'firebase/firestore'`) — `getDoc` is no longer called directly in this file after this task (confirm: `RequestsTab`'s `getDoc` call is handled in Task 3 below — do both before trimming imports, or trim once after all 3 tasks land). `updateDoc` was only used by `SchoolPicker` (removed in Task 1) — same trim-at-the-end approach.

- [ ] **Step 5:** `npm test` → PASS. Manual: open Social panel — confirm the map/school view and Discover/Requests/Matched tabs still load correctly, nearby users and match scores compute as before.

- [ ] **Step 6: Commit** — `git commit -m "refactor: remove SocialPanel's duplicate profile read, use store's myProfile"`

---

### Task 3: `RequestsTab` → `useSocialStore.hydrateRequestUsers`

**Files:** Modify `src/components/SocialPanel.jsx`

- [ ] **Step 1 — replace the whole `RequestsTab` function body** (currently lines 440-458):
```jsx
function RequestsTab({ pendingRequests, acceptFollowRequest, rejectFollowRequest }) {
  const [requestUsers, setRequestUsers] = useState([])
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (pendingRequests.length === 0) {
      setRequestUsers([])
      return
    }
    setResolving(true)
    Promise.all(
      pendingRequests.map(async (uid) => {
        const snap = await getDoc(refs.user(uid))
        return snap.exists() ? snap.data() : null
      })
    )
      .then((users) => setRequestUsers(users.filter(Boolean)))
      .finally(() => setResolving(false))
  }, [pendingRequests])
```
with:
```jsx
function RequestsTab({ pendingRequests, acceptFollowRequest, rejectFollowRequest }) {
  const requestUsersMap = useSocialStore((s) => s.requestUsers)
  const hydrateRequestUsers = useSocialStore((s) => s.hydrateRequestUsers)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (pendingRequests.length === 0) return
    setResolving(true)
    hydrateRequestUsers(pendingRequests).finally(() => setResolving(false))
  }, [pendingRequests, hydrateRequestUsers])

  const requestUsers = pendingRequests.map((uid) => requestUsersMap[uid]).filter(Boolean)
```
(The rest of the function — the `return (...)` JSX block — is unchanged; `requestUsers` is now a derived `const` instead of state, but the JSX below reads it identically either way.)

- [ ] **Step 2:** Now that all 3 tasks are done, check whether `getDoc`/`updateDoc` from `firebase/firestore` (line 6) and `refs` from `../lib/db` (line 12) have any remaining use in the file. `refs.user` was used by `SchoolPicker` (Task 1, now via the store), the init effect (Task 2, now via the store), and `RequestsTab` (this task, now via the store) — if none of these three were the only uses, keep `refs`; otherwise trim it. `shapes` (also from `../lib/db`, used by `makeUserIcon`'s `shapes.readProfile(user).mbti`) must stay regardless — only trim `refs`/`getDoc`/`updateDoc` if genuinely unused now.

- [ ] **Step 3:** `npm test` → PASS. Manual: send a follow request from one test account to another, open Social panel → Requests tab on the receiving account, confirm the request shows the requester's name/photo, accept one and decline another.

- [ ] **Step 4: Commit** — `git commit -m "refactor: rewire SocialPanel.RequestsTab through useSocialStore.hydrateRequestUsers"`

---

## Final check

- [ ] Grep `src/components/SocialPanel.jsx` for `getDoc(` / `updateDoc(` outside a `useSocialStore.getState()...` call — expect zero hits.
- [ ] `npm test` → full suite green.
- [ ] `npm run build` → succeeds.
