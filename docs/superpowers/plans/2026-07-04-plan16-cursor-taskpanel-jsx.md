# Architecture Improvement — Plan 16: TaskPanel JSX Rewire (Cursor)

> **Prerequisite:** Plan 15 (`2026-07-04-plan15-claude-taskpanel-store.md`) must be done first — it adds `sendTaskShare` to `src/stores/useChatStore.js`. Also depends on Plan 11 (`useChatStore`'s `participants`/`resolveParticipants` cache) — confirm both exist before starting.

**Goal:** Slim `src/components/TaskPanel.jsx`'s `TaskShareSheet` — replace its inline chat-send Firestore call with `useChatStore.sendTaskShare`, and dedupe its participant-resolution effect (a third copy of the same pattern already fixed once in `ChatPanel.jsx` via Plan 12) onto the shared `useChatStore` cache. No visual change; `onClose`/`initialView` remain `TaskPanel`'s entire external contract (single caller: `HomePage.jsx:292`).

**Architecture:** Pure call-site swap in `TaskShareSheet` only — plain task CRUD (`TaskListView`, `TrashView`, `handleToggle`, etc.) is untouched, since research confirmed it has no inline Firestore logic to extract (already fully seamed via `useTaskStore`/`syncManager`).

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- Do not touch any JSX markup/layout.
- **Do not touch task CRUD, AI-task orchestration, drag-and-drop, or skill-assignment logic** — none of that is in scope for this plan (it's not Firestore-inline logic; see the plan's Goal section for why).
- The `getSharedRefs`/`addSharedRef`/`syncSharedTaskStatus` localStorage-bookkeeping functions stay in this file exactly as-is — only `TaskShareSheet.handleSend`'s chat-write and its participant-resolution effect change.
- Verify with `npm test` after each task; manual dev verification at the end.

---

### Task 1: `TaskShareSheet.handleSend` → `useChatStore.sendTaskShare`

**Files:** Modify `src/components/TaskPanel.jsx`

- [ ] **Step 1 — replace `handleSend`** (currently lines 65-101):
```jsx
  async function handleSend(chat) {
    const uid = user?.uid
    if (!uid || sending) return
    setSending(chat.id)
    try {
      const msgRef = await addDoc(cols.chatMessages(chat.id), {
        senderId: uid,
        text: `📋 ${task.title}`,
        type: 'shared_task',
        taskSnapshot: {
          title: task.title,
          estimatedProgress: task.estimatedProgress ?? null,
          linkedJourneyKey: task.linkedJourneyKey ?? null,
          linkedJourneyId: task.linkedJourneyId ?? null,
          taskId: task.id,
          ownerUid: uid,
          ownerName: user.displayName ?? '',
          status: task.completed ? 'completed' : 'in_progress',
        },
        giftItem: null,
        newsItem: null,
        createdAt: serverTimestamp(),
      })
      await updateDoc(refs.chat(chat.id), {
        lastMessage: `📋 ${task.title}`,
        lastMessageAt: serverTimestamp(),
        fireStacks: increment(1),
      })
      useUserStore.getState().incrementStacks()
      addSharedRef(task.id, chat.id, msgRef.id)
      onClose()
    } catch (e) {
      console.error('[TaskShare] send failed:', e)
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
      const msgId = await useChatStore.getState().sendTaskShare(chat.id, uid, task, user.displayName)
      addSharedRef(task.id, chat.id, msgId)
      onClose()
    } catch (e) {
      console.error('[TaskShare] send failed:', e)
    } finally {
      setSending(null)
    }
  }
```

- [ ] **Step 2:** `npm test` → PASS. Manual: open a task's "Share" action, send it to a chat — confirm the chat receives the `shared_task` message and `lastMessage` updates.

- [ ] **Step 3: Commit** — `git commit -m "refactor: rewire TaskPanel.TaskShareSheet through useChatStore.sendTaskShare"`

---

### Task 2: `TaskShareSheet` participant-resolution → shared `useChatStore` cache

**Files:** Modify `src/components/TaskPanel.jsx`

- [ ] **Step 1:** Remove the local `participants` state and its resolution effect. Currently (lines 40-63):
```jsx
function TaskShareSheet({ task, onClose }) {
  const user = useAuthStore((s) => s.user)
  const chats = useChatStore((s) => s.chats)
  const loadChats = useChatStore((s) => s.loadChats)
  const [participants, setParticipants] = useState({})
  const [sending, setSending] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    const unsub = loadChats(user.uid)
    return () => unsub?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    const needed = [
      ...new Set(chats.flatMap((c) => c.members?.filter((uid) => uid !== user.uid) ?? [])),
    ].filter((uid) => !participants[uid])
    needed.forEach(async (uid) => {
      const snap = await getDoc(refs.user(uid))
      if (snap.exists()) setParticipants((p) => ({ ...p, [uid]: snap.data() }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, user?.uid])
```
with:
```jsx
function TaskShareSheet({ task, onClose }) {
  const user = useAuthStore((s) => s.user)
  const chats = useChatStore((s) => s.chats)
  const loadChats = useChatStore((s) => s.loadChats)
  const participants = useChatStore((s) => s.participants)
  const [sending, setSending] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    const unsub = loadChats(user.uid)
    return () => unsub?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    const needed = [
      ...new Set(chats.flatMap((c) => c.members?.filter((uid) => uid !== user.uid) ?? [])),
    ]
    useChatStore.getState().resolveParticipants(needed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, user?.uid])
```

- [ ] **Step 2:** Update the `firebase/firestore` import (currently `import { addDoc, getDoc, increment, serverTimestamp, updateDoc } from 'firebase/firestore'`) — after Task 1 + this task, `addDoc`/`getDoc`/`increment`/`serverTimestamp`/`updateDoc` should have no remaining direct use in `TaskShareSheet` (they're now only used inside `syncSharedTaskStatus`'s `updateDoc(refs.chatMessage(...), ...)` call, which stays). Check `syncSharedTaskStatus` (lines 25-36) still needs `updateDoc` — keep it; the rest (`addDoc`, `getDoc`, `increment`, `serverTimestamp`) should be fully removable if `TaskShareSheet` was their only user in this file — confirm before trimming.

- [ ] **Step 3:** `npm test` → PASS. Manual: open the task-share sheet for two different tasks in the same session — confirm the second sheet's chat-member names appear instantly (served from the now-shared cache) rather than re-fetching.

- [ ] **Step 4: Commit** — `git commit -m "refactor: repoint TaskShareSheet participant resolution onto the shared useChatStore cache"`

---

## Final check

- [ ] Grep `src/components/TaskPanel.jsx` for `addDoc(` / `getDoc(` outside a `useChatStore.getState()...` call — expect zero hits (the `updateDoc` inside `syncSharedTaskStatus` is expected and correct, not a violation).
- [ ] `npm test` → full suite green.
- [ ] `npm run build` → succeeds.
