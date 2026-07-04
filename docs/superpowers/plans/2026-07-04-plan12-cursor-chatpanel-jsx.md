# Architecture Improvement — Plan 12: ChatPanel JSX Rewire (Cursor)

> **Prerequisite:** Plan 11 (`2026-07-04-plan11-claude-chatpanel-store.md`) must be done first — it adds `participants`/`resolveParticipants`/`getOrFetchParticipant`/`sendGift`/`giveCredit` to `src/stores/useChatStore.js`. Confirm these exist before starting.

**Goal:** Slim `src/components/ChatPanel.jsx` — replace its inline Firestore reads/writes with calls into the new `useChatStore` actions. No visual or behavioral change; `onClose`/`initialView`/`onAdminContacted` remain the entire external contract (single caller: `HomePage.jsx:298-302`).

**Architecture:** Pure call-site swap in one file across 3 tasks (GiftModal, CreditModal, main ChatPanel component) — no JSX layout changes.

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- Do not touch any JSX markup/layout — only data-fetching logic (imports, state, effects, handler bodies).
- Do not touch `ChatWindowView`/`ChatListView`/`RequestCard`-equivalent presentational code, or `fmtTime`/`GIFTS` — out of scope.
- Do not fix the pre-existing `getCreditedTasks`/`markTaskCredited` localStorage helpers — they stay in this file exactly as-is.
- Verify with `npm test` after each task; manual dev verification at the end (gift-sending, credit-giving, and friend-select all touch live social/economy features).

---

### Task 1: `GiftModal` → `useChatStore.sendGift`

**Files:** Modify `src/components/ChatPanel.jsx`

- [ ] **Step 1:** Add `useChatStore` import if not already present at top (it is — `import { useChatStore } from '../stores/useChatStore'` already exists at line 5). No new import needed for this task.

- [ ] **Step 2 — `GiftModal.handleGift`** (currently lines 37-62), replace:
```jsx
  async function handleGift(gift) {
    if (coins < gift.coins || busy) return
    setBusy(gift.name)
    // Optimistic deduct — roll back on error
    addCoins(-gift.coins)
    try {
      await addDoc(cols.chatMessages(chatId), {
        senderId: myUid,
        text: `${gift.emoji} ${gift.name}`,
        type: 'gift',
        giftItem: { name: gift.name, emoji: gift.emoji, coins: gift.coins },
        createdAt: serverTimestamp(),
      })
      await updateDoc(refs.chat(chatId), {
        lastMessage: `${gift.emoji} ส่งของขวัญ`,
        lastMessageAt: serverTimestamp(),
        fireStacks: increment(1),
      })
      useUserStore.getState().incrementStacks()
      onClose()
    } catch {
      addCoins(gift.coins) // rollback
    } finally {
      setBusy(null)
    }
  }
```
with:
```jsx
  async function handleGift(gift) {
    if (coins < gift.coins || busy) return
    setBusy(gift.name)
    // Optimistic deduct — roll back on error
    addCoins(-gift.coins)
    try {
      await useChatStore.getState().sendGift(chatId, myUid, gift)
      onClose()
    } catch {
      addCoins(gift.coins) // rollback
    } finally {
      setBusy(null)
    }
  }
```

- [ ] **Step 3:** `npm test` → PASS. Manual: open a chat, open the Gift modal, send a gift with sufficient coins (confirm coin deduction sticks, chat message appears, fireStacks increments); attempt with insufficient coins (button should already be disabled per `canAfford`).

- [ ] **Step 4: Commit** — `git commit -m "refactor: rewire ChatPanel.GiftModal through useChatStore.sendGift"`

---

### Task 2: `CreditModal` → `useChatStore.giveCredit`

**Files:** Modify `src/components/ChatPanel.jsx`

- [ ] **Step 1 — `CreditModal.handleConfirm`** (currently lines 132-166), replace:
```jsx
  async function handleConfirm() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const today = new Date().toISOString().slice(0, 10)
      const creditNote = {
        date: today,
        note: `ทำร่วมกับ ${friendUser?.displayName ?? 'เพื่อน'}${note.trim() ? `: ${note.trim()}` : ''}`,
        creditedFriend: {
          uid: friendUser?.uid ?? '',
          displayName: friendUser?.displayName ?? '',
          photoURL: friendUser?.photoURL ?? null,
        },
        taskTitle: snap.title,
      }
      if (snap.linkedJourneyKey && snap.linkedJourneyId) {
        addCreditToJourney(snap.linkedJourneyKey, snap.linkedJourneyId, creditNote)
      }
      await addDoc(cols.userCredits(friendUser?.uid), {
        fromUid: user?.uid ?? '',
        fromName: user?.displayName ?? '',
        taskTitle: snap.title,
        journeyKey: snap.linkedJourneyKey ?? null,
        message: note.trim(),
        createdAt: serverTimestamp(),
      })
      markTaskCredited(snap.taskId)
      onDone(snap.taskId)
    } catch (e) {
      console.error('[Credit]', e)
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setBusy(false)
    }
  }
```
with:
```jsx
  async function handleConfirm() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const today = new Date().toISOString().slice(0, 10)
      const creditNote = {
        date: today,
        note: `ทำร่วมกับ ${friendUser?.displayName ?? 'เพื่อน'}${note.trim() ? `: ${note.trim()}` : ''}`,
        creditedFriend: {
          uid: friendUser?.uid ?? '',
          displayName: friendUser?.displayName ?? '',
          photoURL: friendUser?.photoURL ?? null,
        },
        taskTitle: snap.title,
      }
      if (snap.linkedJourneyKey && snap.linkedJourneyId) {
        addCreditToJourney(snap.linkedJourneyKey, snap.linkedJourneyId, creditNote)
      }
      await useChatStore.getState().giveCredit(friendUser?.uid, user, snap, note)
      markTaskCredited(snap.taskId)
      onDone(snap.taskId)
    } catch (e) {
      console.error('[Credit]', e)
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setBusy(false)
    }
  }
```
(`snap` here is `CreditModal`'s existing local `const snap = msg?.taskSnapshot ?? {}` — unchanged, just now passed as the `taskSnapshot` argument.)

- [ ] **Step 2:** `npm test` → PASS. Manual: from a `shared_task` message in a chat, give a friend credit — confirm the journey gets the credit note, the Firestore write succeeds, and the task shows as credited (button disabled/hidden per `getCreditedTasks()` check) on next view.

- [ ] **Step 3: Commit** — `git commit -m "refactor: rewire ChatPanel.CreditModal through useChatStore.giveCredit"`

---

### Task 3: Main `ChatPanel` component → `resolveParticipants`/`getOrFetchParticipant`

**Files:** Modify `src/components/ChatPanel.jsx`

- [ ] **Step 1:** Replace local `participants` state with a store selector. Currently (line 754):
```jsx
  const [participants, setParticipants] = useState({})
```
becomes:
```jsx
  const participants = useChatStore((s) => s.participants)
```

- [ ] **Step 2 — participant-resolution effect** (currently lines 768-782), replace:
```jsx
  useEffect(() => {
    if (!user?.uid) return
    const needed = [
      ...new Set([
        ...mutualUids,
        ...chats.flatMap((c) => c.members?.filter((uid) => uid !== user.uid) ?? []),
      ]),
    ].filter((uid) => !participants[uid])

    needed.forEach(async (uid) => {
      const snap = await getDoc(refs.user(uid))
      if (snap.exists()) setParticipants((p) => ({ ...p, [uid]: snap.data() }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, mutualUids.join(','), user?.uid])
```
with:
```jsx
  useEffect(() => {
    if (!user?.uid) return
    const needed = [
      ...new Set([
        ...mutualUids,
        ...chats.flatMap((c) => c.members?.filter((uid) => uid !== user.uid) ?? []),
      ]),
    ]
    useChatStore.getState().resolveParticipants(needed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, mutualUids.join(','), user?.uid])
```
(The `.filter((uid) => !participants[uid])` de-dup check moves inside `resolveParticipants` itself — the store already skips cached uids, so the effect no longer needs to pre-filter or depend on `participants` in its own logic.)

- [ ] **Step 3 — `handleSelectFriend`** (currently lines 787-796), replace:
```jsx
  async function handleSelectFriend(uid) {
    let other = participants[uid]
    if (!other) {
      const snap = await getDoc(refs.user(uid))
      other = snap.exists() ? snap.data() : { uid, displayName: 'Unknown', photoURL: null }
      setParticipants((p) => ({ ...p, [uid]: other }))
    }
    await openChat(buildChatId(user.uid, uid), other)
    setView('window')
  }
```
with:
```jsx
  async function handleSelectFriend(uid) {
    const other = await useChatStore.getState().getOrFetchParticipant(uid)
    await openChat(buildChatId(user.uid, uid), other)
    setView('window')
  }
```

- [ ] **Step 4:** Update the `firebase/firestore` import — `getDoc` is no longer called directly in this file (confirm: `addDoc`/`updateDoc`/`increment`/`serverTimestamp` were only used by `GiftModal`/`CreditModal`'s now-removed inline code — check if any of them have other uses left in the file before trimming; `getDoc` should have zero remaining uses after this task). Also check whether `cols`/`refs` from `'../lib/db'` (line 6) still have any use in the file — `refs.chat`/`refs.user`/`cols.chatMessages`/`cols.userCredits` were only used by the now-extracted code; `buildChatId` and `shapes` (if used elsewhere in this file, e.g. by `ChatWindowView`'s admin-detection or MBTI display) should stay.

- [ ] **Step 5:** `npm test` → PASS. Manual: open Chat panel, confirm the friends list still shows names/photos immediately (mutual follows + existing chat members resolve); tap a friend not yet in the list to open/create a chat with them.

- [ ] **Step 6: Commit** — `git commit -m "refactor: rewire ChatPanel participant resolution through useChatStore"`

---

## Final check

- [ ] Grep `src/components/ChatPanel.jsx` for `addDoc(` / `getDoc(` / `updateDoc(` outside a `useChatStore.getState()...` call — expect zero hits (only `ShopChatView` import, unrelated, may still reference Firestore internally — out of scope, don't touch it).
- [ ] `npm test` → full suite green.
- [ ] `npm run build` → succeeds.
