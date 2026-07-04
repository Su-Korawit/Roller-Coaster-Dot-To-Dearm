# Architecture Improvement — Plan 6: NewsPanel JSX Rewire (Cursor)

> **Prerequisite:** Plan 5 (`2026-07-04-plan5-claude-newspanel-store.md`) must be done first — it creates `useNewsStore.js` and adds `useChatStore.sendNewsShare`. Confirm both exist before starting (`src/stores/useNewsStore.js` should exist).

**Goal:** Slim `src/components/NewsPanel.jsx` down to pure rendering — replace its inline Firestore reads/writes/listener with calls into `useNewsStore`/`useChatStore.sendNewsShare`. No visual or behavioral change; `onClose` is the entire external contract (single caller: `HomePage.jsx:293`, `<NewsPanel onClose={closePanel} />`).

**Architecture:** Pure call-site swap in one file. No new components, no JSX layout changes.

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- Do not touch any JSX markup/layout/className — only the data-fetching logic (imports, state, effects, handler bodies).
- Do not "fix" the fireStacks discrepancy noted in Plan 5 Task 2 — that's a known, deliberately-preserved behavior.
- Verify with `npm test` after the change; `npm run build` once at the end.

---

### Task 1: Rewire `src/components/NewsPanel.jsx`

**Files:** Modify `src/components/NewsPanel.jsx`

- [ ] **Step 1:** Replace the import block (currently lines 1-10):
```jsx
import { useEffect, useState } from 'react'
import { addDoc, deleteDoc, getDoc, increment, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { cols, refs, queries } from '../lib/db'
import { useAuthStore } from '../stores/useAuthStore'
import { useChatStore } from '../stores/useChatStore'
import { useUserStore } from '../stores/useUserStore'
import { ADMIN_UID } from '../constants/admin'
import { STATIC_UPDATES, UPDATE_TYPES } from '../data/appUpdates'
import { CAMP_GROUPS, DEFAULT_CATEGORY, groupKeyForCategory, labelForCategory } from '../data/campCategories'
```
with:
```jsx
import { useEffect, useState } from 'react'
import { getDoc } from 'firebase/firestore'
import { Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { refs } from '../lib/db'
import { useAuthStore } from '../stores/useAuthStore'
import { useChatStore } from '../stores/useChatStore'
import { useNewsStore } from '../stores/useNewsStore'
import { ADMIN_UID } from '../constants/admin'
import { UPDATE_TYPES } from '../data/appUpdates'
import { CAMP_GROUPS, DEFAULT_CATEGORY, groupKeyForCategory, labelForCategory } from '../data/campCategories'
```
(`getDoc`/`refs` stay — `ShareSheet`'s participant-resolution `getDoc(refs.user(uid))` at the current line 40 is unrelated to this refactor. `addDoc`/`deleteDoc`/`increment`/`onSnapshot`/`serverTimestamp`/`updateDoc`/`cols`/`queries`/`useUserStore`/`STATIC_UPDATES` are all now handled inside `useNewsStore`/`useChatStore` — drop them here.)

- [ ] **Step 2 — `ShareSheet.handleSend`** (currently lines 46-69), replace:
```jsx
  async function handleSend(chat) {
    const uid = user?.uid
    if (!uid || sending) return
    setSending(chat.id)
    try {
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
      useUserStore.getState().incrementStacks()
      onClose()
    } finally {
      setSending(null)
    }
  }
```
with:
```jsx
  async function handleSend(chat) {
    const uid = user?.uid
    if (!uid || sending) return
    setSending(chat.id)
    try {
      await useChatStore.getState().sendNewsShare(chat.id, item)
      onClose()
    } finally {
      setSending(null)
    }
  }
```

- [ ] **Step 3 — `AddUpdateSheet.handleSubmit`** (currently lines 149-164), replace:
```jsx
  async function handleSubmit() {
    if (!title.trim() || !description.trim() || saving) return
    setSaving(true)
    try {
      await addDoc(cols.appUpdates, {
        type,
        title: title.trim(),
        description: description.trim(),
        image: image.trim() || null,
        createdAt: serverTimestamp(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }
```
with:
```jsx
  async function handleSubmit() {
    if (!title.trim() || !description.trim() || saving) return
    setSaving(true)
    try {
      await useNewsStore.getState().addUpdate({ type, title, description, image })
      onClose()
    } finally {
      setSaving(false)
    }
  }
```

- [ ] **Step 4 — main `NewsPanel` state/effects** (currently lines 268-304). Remove `fsUpdates` from the `useState` list (currently line 279: `const [fsUpdates, setFsUpdates] = useState([])`), and replace the listener effect + `allUpdates` computation + `handleDeleteUpdate`. Currently:
```jsx
  const [sharingItem, setSharingItem] = useState(null)
  const [fsUpdates, setFsUpdates] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [detailUpdate, setDetailUpdate] = useState(null)

  useEffect(() => {
    fetchCamps(category)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  // Real-time subscription to admin-added updates
  useEffect(() => {
    const q = queries.appUpdatesByDate()
    const unsub = onSnapshot(q, (snap) => {
      setFsUpdates(snap.docs.map((d) => ({ id: d.id, _firestore: true, ...d.data() })))
    })
    return () => unsub()
  }, [])

  // Merge static + Firestore updates, sort by date desc
  const allUpdates = [...STATIC_UPDATES, ...fsUpdates]
    .map((u) => ({ ...u, _ts: u.createdAt?.toMillis?.() ?? new Date(u.date).getTime() }))
    .sort((a, b) => b._ts - a._ts)

  async function handleDeleteUpdate(id) {
    await deleteDoc(refs.appUpdate(id))
  }
```
becomes:
```jsx
  const [sharingItem, setSharingItem] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [detailUpdate, setDetailUpdate] = useState(null)

  const allUpdates = useNewsStore((s) => s.getAllUpdates())

  useEffect(() => {
    fetchCamps(category)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  // Real-time subscription to admin-added updates
  useEffect(() => {
    const unsub = useNewsStore.getState().subscribeUpdates()
    return () => unsub?.()
  }, [])

  async function handleDeleteUpdate(id) {
    await useNewsStore.getState().deleteUpdate(id)
  }
```

- [ ] **Step 5:** `npm test` → PASS (no test file exists for `NewsPanel.jsx` itself, so this is verifying nothing else broke — the store-level tests from Plan 5 cover the extracted logic).

- [ ] **Step 6:** Manual verification in dev (`npm run dev`):
  - Open News panel → RollerCoaster tab loads updates (static + any Firestore ones), same as before
  - As admin: add an update via the "+" button, confirm it appears live (realtime listener still works)
  - As admin: delete a Firestore-backed update, confirm it disappears
  - Share a Camphub item and a RollerCoaster update to a chat, confirm the chat receives the message and `lastMessage` updates
  - Camphub tab (category filter, camp cards) — untouched by this refactor, confirm it still works

- [ ] **Step 7: Commit**

```bash
git add src/components/NewsPanel.jsx
git commit -m "refactor: rewire NewsPanel through useNewsStore/useChatStore.sendNewsShare"
```

---

## Final check

- [ ] `npm run build` → succeeds.
- [ ] NewsPanel.jsx line count should have dropped meaningfully (removed ~15 lines of inline Firestore logic, only import/state/effect lines change — layout untouched).
