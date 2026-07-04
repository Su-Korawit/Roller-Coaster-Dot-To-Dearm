# Architecture Improvement — Plan 4: Close db.js Ref Seam in JSX

> **For agentic workers (Cursor Composer):** Execute tasks in order, one commit per task. Steps use checkbox (`- [ ]`) syntax for tracking. All 13 tasks are independent of each other (different files) and can be done in any order, but keep one file per commit for easy review.

**Goal:** Repoint the remaining ~25 inline `doc(db,'...')`/`collection(db,'...')` call sites in JSX components onto `src/lib/db.js`'s documented seam (`refs`/`cols`/`queries`), so Firebase paths live in exactly one place.

**Architecture:** No new modules — `src/lib/db.js` already has everything needed (`refs.user`, `refs.chat`, `refs.product`, `refs.mapConfig`, `refs.farmItem/farmPlant/farmShop/appUpdate`, `cols.users/chats/shopProducts/purchases/farmItems/farmPlants/farmShops/appUpdates`, `cols.chatMessages(chatId)`, `queries.appUpdatesByDate`). This plan is pure call-site repointing: replace `doc(db, 'collection', id)` with `refs.x(id)`, replace `collection(db, 'collection')` with `cols.x`, and trim the now-unused `doc`/`collection`/`db` imports per file.

**Tech Stack:** React 19, Firebase JS SDK 12 (Firestore), Vitest (jsdom).

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- **Firebase paths** — only via `src/lib/db.js` refs/cols/queries/shapes. Never inline `doc(db, 'collection', id)` or `collection(db, 'collection')` after this plan.
- **Firestore writes** — always debounced via `syncManager` where applicable; this plan does not add any new writes, only repoints existing ones — don't change write timing/debouncing.
- Only touch the Firestore call sites named below. Don't refactor surrounding logic, rename functions, or fix unrelated bugs you notice (see Task 12's note).
- Verify with `npm test` after each file; `npm run build` once at the end.

---

### Task 1: `src/components/PublicProfileSheet.jsx`

**Files:** Modify `src/components/PublicProfileSheet.jsx`

- [ ] **Step 1:** Change the import line `import { shapes } from '../lib/db'` to:
```js
import { refs, shapes } from '../lib/db'
```

- [ ] **Step 2:** In the `useEffect` (currently lines 104–119), replace:
```js
    Promise.all([
      getDoc(doc(db, 'users', userId)),
      currentUser?.uid ? getDoc(doc(db, 'users', currentUser.uid)) : Promise.resolve(null),
    ])
```
with:
```js
    Promise.all([
      getDoc(refs.user(userId)),
      currentUser?.uid ? getDoc(refs.user(currentUser.uid)) : Promise.resolve(null),
    ])
```

- [ ] **Step 3:** Update the `firebase/firestore` import — this file's only Firestore call is `getDoc`, so `import { doc, getDoc } from 'firebase/firestore'` becomes:
```js
import { getDoc } from 'firebase/firestore'
```
Remove the `import { db } from '../firebase'` line (now unused) — confirm no other use of `db` remains in the file first.

- [ ] **Step 4:** `npm test` → PASS. Manual sanity: open a public profile sheet in dev, confirm it still loads.

- [ ] **Step 5: Commit** — `git commit -m "refactor(seam): repoint PublicProfileSheet Firestore reads through refs.user"`

---

### Task 2: `src/components/UserProfileSheet.jsx`

**Files:** Modify `src/components/UserProfileSheet.jsx`

- [ ] **Step 1:** Change `import { shapes } from '../lib/db'` to `import { refs, shapes } from '../lib/db'`.

- [ ] **Step 2:** In the `useEffect` (currently lines 95–110), replace:
```js
    Promise.all([
      getDoc(doc(db, 'users', userId)),
      currentUser?.uid ? getDoc(doc(db, 'users', currentUser.uid)) : Promise.resolve(null),
    ])
```
with:
```js
    Promise.all([
      getDoc(refs.user(userId)),
      currentUser?.uid ? getDoc(refs.user(currentUser.uid)) : Promise.resolve(null),
    ])
```

- [ ] **Step 3:** `import { doc, getDoc } from 'firebase/firestore'` → `import { getDoc } from 'firebase/firestore'`. Remove the now-unused `import { db } from '../firebase'` (confirm no other `db` use remains).

- [ ] **Step 4:** `npm test` → PASS. Manual: open a user profile sheet from chat/social, confirm it loads.

- [ ] **Step 5: Commit** — `git commit -m "refactor(seam): repoint UserProfileSheet Firestore reads through refs.user"`

---

### Task 3: `src/components/ProfilePanel.jsx`

**Files:** Modify `src/components/ProfilePanel.jsx`

- [ ] **Step 1:** Add an import: `import { refs } from '../lib/db'` (place near the other store/lib imports).

- [ ] **Step 2:** In `fetchFirestoreProfile` (currently lines 23–28), replace:
```js
  function fetchFirestoreProfile() {
    if (!authUser?.uid) return
    getDoc(doc(db, 'users', authUser.uid)).then((snap) => {
      if (snap.exists()) setFirestoreProfile(snap.data())
    })
  }
```
with:
```js
  function fetchFirestoreProfile() {
    if (!authUser?.uid) return
    getDoc(refs.user(authUser.uid)).then((snap) => {
      if (snap.exists()) setFirestoreProfile(snap.data())
    })
  }
```

- [ ] **Step 3:** `import { doc, getDoc } from 'firebase/firestore'` → `import { getDoc } from 'firebase/firestore'`. Remove `import { db } from '../firebase'` (this was the only Firestore call site in the file — confirm before removing).

- [ ] **Step 4:** `npm test` → PASS. Manual: open the Profile panel, confirm displayName/bio/photo still show.

- [ ] **Step 5: Commit** — `git commit -m "refactor(seam): repoint ProfilePanel Firestore read through refs.user"`

---

### Task 4: `src/components/SocialPanel.jsx`

**Files:** Modify `src/components/SocialPanel.jsx`

- [ ] **Step 1:** Change `import { shapes } from '../lib/db'` to `import { refs, shapes } from '../lib/db'`.

- [ ] **Step 2 — school write (currently around line 98)**, inside `SchoolPicker`'s `place_changed` listener, replace:
```js
        await updateDoc(doc(db, 'users', uid), schoolData)
```
with:
```js
        await updateDoc(refs.user(uid), schoolData)
```

- [ ] **Step 3 — pending-requests resolution (currently around line 453)**, inside `RequestsTab`'s effect, replace:
```js
        const snap = await getDoc(doc(db, 'users', uid))
```
with:
```js
        const snap = await getDoc(refs.user(uid))
```

- [ ] **Step 4 — own-profile init (currently around line 615)**, inside the main component's init effect, replace:
```js
        const snap = await getDoc(doc(db, 'users', user.uid))
```
with:
```js
        const snap = await getDoc(refs.user(user.uid))
```

- [ ] **Step 5:** `import { doc, getDoc, updateDoc } from 'firebase/firestore'` → `import { updateDoc } from 'firebase/firestore'` (both `doc` and `getDoc` are now fully replaced by `refs.user(...)` across all 3 sites — confirm no other `doc(`/`getDoc(` call remains in the file before trimming). Remove `import { db } from '../firebase'` (confirm unused after the repoint).

- [ ] **Step 6:** `npm test` → PASS. Manual: open Social panel — nearby/matched/requests tabs load; accept a follow request; the school picker still saves a school.

- [ ] **Step 7 (do NOT fix, just confirm untouched):** Around line 543–547 in `MatchedTab` there is a pre-existing bug unrelated to this task (`m.shapes.readProfile(user)` — `m.shapes` and bare `user` don't exist in that scope). Leave it exactly as-is; it is out of scope for this plan. If you want it fixed, flag it separately — don't fix it as part of this commit.

- [ ] **Step 8: Commit** — `git commit -m "refactor(seam): repoint SocialPanel Firestore calls through refs.user"`

---

### Task 5: `src/components/admin/UserManagementSection.jsx`

**Files:** Modify `src/components/admin/UserManagementSection.jsx`

- [ ] **Step 1:** Change `import { shapes } from '../../lib/db'` to `import { cols, refs, shapes } from '../../lib/db'`.

- [ ] **Step 2 — `getUsers()` (currently lines 14–17)**, replace:
```js
async function getUsers() {
  const snap = await getDocs(query(collection(db, 'users'), limit(LIST_LIMIT)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
```
with:
```js
async function getUsers() {
  const snap = await getDocs(query(cols.users, limit(LIST_LIMIT)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
```

- [ ] **Step 3 — `handleDelete` (currently around line 50)**, replace:
```js
      await deleteDoc(doc(db, 'users', u.id))
```
with:
```js
      await deleteDoc(refs.user(u.id))
```

- [ ] **Step 4:** `import { collection, getDocs, limit, query, doc, deleteDoc } from 'firebase/firestore'` → `import { getDocs, limit, query } from 'firebase/firestore'` (confirm `collection`, `doc`, `deleteDoc` have no other use in the file before trimming).

- [ ] **Step 5:** `npm test` → PASS. Manual: open Admin → Users tab, confirm the list loads; test-delete a throwaway test user if one exists, or just confirm the list renders without error.

- [ ] **Step 6: Commit** — `git commit -m "refactor(seam): repoint UserManagementSection through cols.users/refs.user"`

---

### Task 6: `src/components/admin/AnalyticsSection.jsx`

**Files:** Modify `src/components/admin/AnalyticsSection.jsx`

- [ ] **Step 1:** Change `import { shapes } from '../../lib/db'` to `import { cols, shapes } from '../../lib/db'`.

- [ ] **Step 2 — `getAggregate()` (currently lines 13–14)**, replace:
```js
async function getAggregate() {
  const snap = await getDocs(query(collection(db, 'users'), limit(AGG_LIMIT)))
```
with:
```js
async function getAggregate() {
  const snap = await getDocs(query(cols.users, limit(AGG_LIMIT)))
```

- [ ] **Step 3:** `import { collection, getDocs, limit, query } from 'firebase/firestore'` → `import { getDocs, limit, query } from 'firebase/firestore'` (this was the only Firestore call site in the file — confirm before trimming `collection`).

- [ ] **Step 4:** `npm test` → PASS. Manual: open Admin → Analytics tab, confirm aggregate numbers still render.

- [ ] **Step 5: Commit** — `git commit -m "refactor(seam): repoint AnalyticsSection through cols.users"`

---

### Task 7: `src/components/admin/ShopSection.jsx`

**Files:** Modify `src/components/admin/ShopSection.jsx`

This file currently has zero `../../lib/db` usage — full repoint.

- [ ] **Step 1:** Add `import { cols, refs } from '../../lib/db'` near the top imports.

- [ ] **Step 2 — `load()` (currently around line 31)**, replace:
```js
      const snap = await getDocs(query(collection(db, 'shopProducts'), orderBy('order', 'asc')))
```
with:
```js
      const snap = await getDocs(query(cols.shopProducts, orderBy('order', 'asc')))
```

- [ ] **Step 3 — `handleSave` (currently around lines 67–72)**, replace:
```js
      if (editing === 'new') {
        await addDoc(collection(db, 'shopProducts'), { ...payload, createdAt: serverTimestamp() })
        toast?.success('เพิ่มสินค้าแล้ว')
      } else {
        await updateDoc(doc(db, 'shopProducts', editing), payload)
        toast?.success('บันทึกแล้ว')
      }
```
with:
```js
      if (editing === 'new') {
        await addDoc(cols.shopProducts, { ...payload, createdAt: serverTimestamp() })
        toast?.success('เพิ่มสินค้าแล้ว')
      } else {
        await updateDoc(refs.product(editing), payload)
        toast?.success('บันทึกแล้ว')
      }
```

- [ ] **Step 4 — `handleDelete` (currently around line 87)**, replace:
```js
      await deleteDoc(doc(db, 'shopProducts', id))
```
with:
```js
      await deleteDoc(refs.product(id))
```

- [ ] **Step 5 — `handleToggleActive` (currently around line 97)**, replace:
```js
      await updateDoc(doc(db, 'shopProducts', product.id), { active: !product.active, updatedAt: serverTimestamp() })
```
with:
```js
      await updateDoc(refs.product(product.id), { active: !product.active, updatedAt: serverTimestamp() })
```

- [ ] **Step 6:** Update the `firebase/firestore` import block — remove `collection` and `doc`, keep the rest:
```js
import {
  addDoc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
```

- [ ] **Step 7:** `npm test` → PASS. Manual: open Admin → Shop tab — product list loads (ordered correctly), create a test product, edit it, toggle its active flag, delete it. Confirm each action still works end-to-end.

- [ ] **Step 8: Commit** — `git commit -m "refactor(seam): repoint ShopSection through cols.shopProducts/refs.product"`

---

### Task 8: `src/components/admin/FinanceSection.jsx`

**Files:** Modify `src/components/admin/FinanceSection.jsx`

This file currently has zero `../../lib/db` usage — full repoint. Note: this query filters by `status`, which has no matching `queries.*` builder — use `cols.purchases` directly with the same inline `where`/`limit`, matching the pattern `db.js`'s own `queries` entries already use internally.

- [ ] **Step 1:** Add `import { cols } from '../../lib/db'`.

- [ ] **Step 2 — `getFinanceData()` (currently lines 7–10)**, replace:
```js
async function getFinanceData() {
  const snap = await getDocs(
    query(collection(db, 'purchases'), where('status', '==', 'SUCCESS'), limit(PURCHASE_LIMIT)),
  )
```
with:
```js
async function getFinanceData() {
  const snap = await getDocs(
    query(cols.purchases, where('status', '==', 'SUCCESS'), limit(PURCHASE_LIMIT)),
  )
```

- [ ] **Step 3:** `import { collection, getDocs, limit, query, where } from 'firebase/firestore'` → `import { getDocs, limit, query, where } from 'firebase/firestore'` (this was the only Firestore call site in the file — confirm before trimming `collection`).

- [ ] **Step 4:** `npm test` → PASS. Manual: open Admin → Finance tab, confirm totals still render.

- [ ] **Step 5: Commit** — `git commit -m "refactor(seam): repoint FinanceSection through cols.purchases"`

---

### Task 9: `src/components/admin/FarmItemsTab.jsx`

**Files:** Modify `src/components/admin/FarmItemsTab.jsx`

- [ ] **Step 1:** Add `import { refs } from '../../lib/db'`.

- [ ] **Step 2 — `handleSave` (currently around line 87)**, replace:
```js
      await setDoc(doc(db, 'farmItems', id), payload)
```
with:
```js
      await setDoc(refs.farmItem(id), payload)
```

- [ ] **Step 3 — `handleDelete` (currently around line 101)**, replace:
```js
      await deleteDoc(doc(db, 'farmItems', itemId))
```
with:
```js
      await deleteDoc(refs.farmItem(itemId))
```

- [ ] **Step 4:** `import { doc, setDoc, deleteDoc } from 'firebase/firestore'` → `import { setDoc, deleteDoc } from 'firebase/firestore'` (confirm `doc` has no other use in the file before trimming).

- [ ] **Step 5:** `npm test` → PASS. Manual: open Admin → Farm Data → Items tab, save an item, delete an item.

- [ ] **Step 6: Commit** — `git commit -m "refactor(seam): repoint FarmItemsTab through refs.farmItem"`

---

### Task 10: `src/components/admin/FarmShopsTab.jsx`

**Files:** Modify `src/components/admin/FarmShopsTab.jsx`

- [ ] **Step 1:** Add `import { refs } from '../../lib/db'`.

- [ ] **Step 2 — `handleSave` (currently around line 45)**, replace:
```js
      await setDoc(doc(collection(db, 'farmShops'), id), payload)
```
with:
```js
      await setDoc(refs.farmShop(id), payload)
```

- [ ] **Step 3 — `handleDelete` (currently around line 59)**, replace:
```js
      await deleteDoc(doc(db, 'farmShops', shopId))
```
with:
```js
      await deleteDoc(refs.farmShop(shopId))
```

- [ ] **Step 4:** `import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore'` → `import { setDoc, deleteDoc } from 'firebase/firestore'` (both `collection` and `doc` are now fully replaced by `refs.farmShop(...)` — confirm no other use before trimming).

- [ ] **Step 5:** `npm test` → PASS. Manual: open Admin → Farm Data → Shops tab, save a shop, delete a shop.

- [ ] **Step 6: Commit** — `git commit -m "refactor(seam): repoint FarmShopsTab through refs.farmShop"`

---

### Task 11: `src/components/admin/FarmPlantsTab.jsx`

**Files:** Modify `src/components/admin/FarmPlantsTab.jsx`

- [ ] **Step 1:** Add `import { refs } from '../../lib/db'`.

- [ ] **Step 2 — `handleSave` (currently around line 113)**, replace:
```js
      await setDoc(doc(db, 'farmPlants', id), payload)
```
with:
```js
      await setDoc(refs.farmPlant(id), payload)
```

- [ ] **Step 3 — `handleDelete` (currently around line 127)**, replace:
```js
      await deleteDoc(doc(db, 'farmPlants', plantId))
```
with:
```js
      await deleteDoc(refs.farmPlant(plantId))
```

- [ ] **Step 4:** `import { doc, setDoc, deleteDoc } from 'firebase/firestore'` → `import { setDoc, deleteDoc } from 'firebase/firestore'` (confirm `doc` has no other use before trimming).

- [ ] **Step 5:** `npm test` → PASS. Manual: open Admin → Farm Data → Plants tab, save a plant, delete a plant.

- [ ] **Step 6: Commit** — `git commit -m "refactor(seam): repoint FarmPlantsTab through refs.farmPlant"`

---

### Task 12: `src/components/admin/MapDashboard.jsx`

**Files:** Modify `src/components/admin/MapDashboard.jsx`

- [ ] **Step 1:** Add `import { refs } from '../../lib/db'`.

- [ ] **Step 2 — `handleDeleteConfirm` (currently around lines 345–348)**, replace:
```js
      await Promise.all([
        deleteObject(ref(storage, `maps/${deleteKey}.json`)).catch(() => {}), // ok if not in storage
        deleteDoc(doc(db, 'mapConfigs', deleteKey)),
      ])
```
with:
```js
      await Promise.all([
        deleteObject(ref(storage, `maps/${deleteKey}.json`)).catch(() => {}), // ok if not in storage
        deleteDoc(refs.mapConfig(deleteKey)),
      ])
```
Note: `ref` here is Firebase **Storage**'s `ref` (unrelated to Firestore's `doc`/`refs`) — leave the `deleteObject`/`ref(storage, ...)` line untouched, only change the `deleteDoc` line.

- [ ] **Step 3:** `import { doc, deleteDoc } from 'firebase/firestore'` → `import { deleteDoc } from 'firebase/firestore'` (this was the only Firestore call site in the file — confirm before trimming `doc`).

- [ ] **Step 4:** `npm test` → PASS. Manual: open Admin → Maps tab, delete a throwaway test map config, confirm both the Storage object and the Firestore doc are removed.

- [ ] **Step 5: Commit** — `git commit -m "refactor(seam): repoint MapDashboard through refs.mapConfig"`

---

### Task 13: `src/components/NewsPanel.jsx`

**Files:** Modify `src/components/NewsPanel.jsx`

This file has 2 sites that repoint cleanly (`users`, `chats`/`messages`) and 3 sites for `appUpdates`, which now has a seam too (`cols.appUpdates`, `refs.appUpdate`, `queries.appUpdatesByDate` — added in a prior commit). Repoint all 5.

- [ ] **Step 1:** Add `import { cols, refs, queries } from '../lib/db'` near the top imports.

- [ ] **Step 2 — `ShareSheet`'s participant-resolution effect (currently around line 40)**, replace:
```js
      const snap = await getDoc(doc(db, 'users', uid))
```
with:
```js
      const snap = await getDoc(refs.user(uid))
```

- [ ] **Step 3 — `ShareSheet.handleSend` (currently around lines 51–63)**, replace:
```js
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        senderId: uid,
        text: `📰 ${item.title}`,
        type: 'news',
        newsItem: { title: item.title, url: item.url, thumbnail: item.poster },
        giftItem: null,
        createdAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: `📰 ${item.title}`,
        lastMessageAt: serverTimestamp(),
        fireStacks: increment(1),
      })
```
with:
```js
      await addDoc(cols.chatMessages(chat.id), {
        senderId: uid,
        text: `📰 ${item.title}`,
        type: 'news',
        newsItem: { title: item.title, url: item.url, thumbnail: item.poster },
        giftItem: null,
        createdAt: serverTimestamp(),
      })
      await updateDoc(refs.chat(chat.id), {
        lastMessage: `📰 ${item.title}`,
        lastMessageAt: serverTimestamp(),
        fireStacks: increment(1),
      })
```

- [ ] **Step 4 — `AddUpdateSheet.handleSubmit` (currently around line 153)**, replace:
```js
      await addDoc(collection(db, 'appUpdates'), {
```
with:
```js
      await addDoc(cols.appUpdates, {
```

- [ ] **Step 5 — realtime subscription (currently around lines 289–291)**, replace:
```js
  useEffect(() => {
    const q = query(collection(db, 'appUpdates'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
```
with:
```js
  useEffect(() => {
    const q = queries.appUpdatesByDate()
    const unsub = onSnapshot(q, (snap) => {
```

- [ ] **Step 6 — `handleDeleteUpdate` (currently around line 303)**, replace:
```js
  async function handleDeleteUpdate(id) {
    await deleteDoc(doc(db, 'appUpdates', id))
  }
```
with:
```js
  async function handleDeleteUpdate(id) {
    await deleteDoc(refs.appUpdate(id))
  }
```

- [ ] **Step 7:** Update the `firebase/firestore` import. All of `doc`, `collection`, and `query` become unused (query is now built via `queries.appUpdatesByDate()` — confirm `query`/`orderBy` have no other use in the file before trimming `orderBy` too). Resulting import:
```js
import { addDoc, deleteDoc, getDoc, increment, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
```
(Keep `getDoc`, `increment`, `onSnapshot`, `serverTimestamp` — all still used. Drop `addDoc`? No — `addDoc` is still used twice. Just drop `collection`, `doc`, `orderBy`, `query`.)

- [ ] **Step 8:** `npm test` → PASS. Manual: open News panel — feed loads and updates in realtime; share a news item to a chat (confirm the chat gets the message + `lastMessage` updates); as admin, add a news update and delete one.

- [ ] **Step 9: Commit** — `git commit -m "refactor(seam): repoint NewsPanel through refs.user/chat/appUpdate, cols.chatMessages/appUpdates, queries.appUpdatesByDate"`

---

### Task 14: `src/components/SettingsSheet.jsx`

**Added post-hoc:** the verification grep after Tasks 1–13 landed found this file was missed when Plan 4 was originally scoped — it has 3 inline `doc(db,'users',...)` sites, same pattern as Task 3/4.

**Files:** Modify `src/components/SettingsSheet.jsx`

- [ ] **Step 1:** Add `import { refs } from '../lib/db'` near the other store/lib imports (after line 5's `import { db, auth } from '../firebase'`, for example).

- [ ] **Step 2 — profile-load effect (currently lines 58–70)**, replace:
```js
  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, 'users', uid)).then((snap) => {
```
with:
```js
  useEffect(() => {
    if (!uid) return
    getDoc(refs.user(uid)).then((snap) => {
```

- [ ] **Step 3 — `handleSaveProfile` (currently line 94)**, replace:
```js
      await updateDoc(doc(db, 'users', uid), { displayName, bio, photoURL: finalPhotoURL })
```
with:
```js
      await updateDoc(refs.user(uid), { displayName, bio, photoURL: finalPhotoURL })
```

- [ ] **Step 4 — `updatePrivacy` (currently line 113)**, replace:
```js
      await updateDoc(doc(db, 'users', uid), { [`privacy.${item}.${type}`]: value })
```
with:
```js
      await updateDoc(refs.user(uid), { [`privacy.${item}.${type}`]: value })
```

- [ ] **Step 5:** `import { doc, getDoc, updateDoc } from 'firebase/firestore'` → `import { getDoc, updateDoc } from 'firebase/firestore'` (confirm `doc` has no other use in the file before trimming). `import { db, auth } from '../firebase'` → `import { auth } from '../firebase'` (`db` is now unused — `auth` is still used for `auth.currentUser`/`updateProfile`; confirm before trimming).

- [ ] **Step 6:** `npm test` → PASS. Manual: open Settings sheet, confirm displayName/bio/privacy load; save profile edits; toggle a privacy switch.

- [ ] **Step 7: Commit** — `git commit -m "refactor(seam): repoint SettingsSheet Firestore calls through refs.user"`

---

## Final check (after all 14 tasks)

- [ ] Grep the whole `src/components/` tree for any remaining `doc(db,` / `collection(db,` outside `src/lib/db.js` — expect zero hits.
- [ ] `npm test` → full suite green.
- [ ] `npm run build` → succeeds, no new warnings.
