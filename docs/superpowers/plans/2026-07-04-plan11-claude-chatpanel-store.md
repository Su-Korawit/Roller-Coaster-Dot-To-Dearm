# Architecture Improvement — Plan 11: ChatPanel Data Layer (Claude Code)

**Goal:** Extend `src/stores/useChatStore.js` with the Firestore-touching concerns currently inline in `src/components/ChatPanel.jsx` — gift-sending, giving a friend "credit," and participant-profile resolution/caching. This is step 1 of decomposing ChatPanel (858 lines, second god-panel after NewsPanel); step 2 (Plan 12) rewires the JSX — Cursor's job.

**Architecture:** All additions land in the existing `useChatStore.js` (no new store file — this is chat-domain data, same home as the already-shipped `sendNewsShare`). `participants`/`resolveParticipants`/`getOrFetchParticipant` give the store a shared profile cache so `ChatPanel`'s two separate `getDoc(refs.user(uid))` call sites (a batch-resolve effect and a single-uid resolve in `handleSelectFriend`) become one cache both can share.

**Tech Stack:** Zustand 5, Firebase Firestore, Vitest.

## Global Constraints

- **No TypeScript** — plain JS only.
- **Firebase paths** — only via `src/lib/db.js` (`cols.chatMessages`, `refs.chat`, `cols.userCredits`, `refs.user`) — all already exist.
- Do not change `ChatPanel.jsx` in this plan — that's Plan 12, Cursor's job.
- Preserve exact current behavior: `sendGift`'s optimistic coin-deduct/rollback stays in the component (`GiftModal`) — only the Firestore write moves. `giveCredit`'s `addCreditToJourney` (local journey update) and `markTaskCredited` (localStorage dedup) also stay in the component — only the `addDoc` write moves.

---

### Task 1: Add `participants` cache + `resolveParticipants`/`getOrFetchParticipant` to `useChatStore.js`

**Files:**
- Modify: `src/stores/useChatStore.js`
- Modify: `src/stores/useChatStore.test.js`

**Interfaces:**
- Produces: `participants: {}` state field; `resolveParticipants(uids): Promise<void>` (batch-fetches only the not-yet-cached uids, merges into `participants`); `getOrFetchParticipant(uid): Promise<object>` (returns cached value immediately if present, else fetches, caches, and returns it — with a `{ uid, displayName: 'Unknown', photoURL: null }` fallback for a missing doc, matching `ChatPanel.jsx`'s current `handleSelectFriend` behavior exactly).
- Consumes: `getDoc` from `firebase/firestore` (already imported: `addDoc, increment, serverTimestamp, setDoc, updateDoc` — add `getDoc`); `refs.user` (existing).

- [ ] **Step 1: Write the failing tests** — add to `src/stores/useChatStore.test.js`:

```js
describe('resolveParticipants', () => {
  it('fetches only uncached uids and merges them into participants', async () => {
    useChatStore.setState({ participants: { 'already-cached': { displayName: 'Cached' } } })
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ displayName: 'Alice' }) })
    await useChatStore.getState().resolveParticipants(['already-cached', 'uid-2'])
    expect(getDoc).toHaveBeenCalledTimes(1)
    expect(useChatStore.getState().participants).toEqual({
      'already-cached': { displayName: 'Cached' },
      'uid-2': { displayName: 'Alice' },
    })
  })

  it('skips a uid whose doc does not exist', async () => {
    useChatStore.setState({ participants: {} })
    getDoc.mockResolvedValueOnce({ exists: () => false })
    await useChatStore.getState().resolveParticipants(['missing-uid'])
    expect(useChatStore.getState().participants).toEqual({})
  })
})

describe('getOrFetchParticipant', () => {
  it('returns the cached value without fetching', async () => {
    useChatStore.setState({ participants: { 'uid-1': { displayName: 'Cached' } } })
    const result = await useChatStore.getState().getOrFetchParticipant('uid-1')
    expect(getDoc).not.toHaveBeenCalled()
    expect(result).toEqual({ displayName: 'Cached' })
  })

  it('fetches, caches, and returns a fresh value', async () => {
    useChatStore.setState({ participants: {} })
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ displayName: 'Bob' }) })
    const result = await useChatStore.getState().getOrFetchParticipant('uid-2')
    expect(result).toEqual({ displayName: 'Bob' })
    expect(useChatStore.getState().participants['uid-2']).toEqual({ displayName: 'Bob' })
  })

  it('returns an Unknown-user fallback for a missing doc', async () => {
    useChatStore.setState({ participants: {} })
    getDoc.mockResolvedValueOnce({ exists: () => false })
    const result = await useChatStore.getState().getOrFetchParticipant('uid-3')
    expect(result).toEqual({ uid: 'uid-3', displayName: 'Unknown', photoURL: null })
  })
})
```

Add `getDoc: vi.fn()` to the existing `vi.mock('firebase/firestore', ...)` block in this test file, and import it: `const { addDoc, getDoc, updateDoc } = await import('firebase/firestore')` (extend whatever's already destructured there).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useChatStore.test.js`
Expected: FAIL — `resolveParticipants is not a function` / `getOrFetchParticipant is not a function`

- [ ] **Step 3: Implement.** Update the `firebase/firestore` import to add `getDoc`:
```js
import {
  addDoc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
```
Add `participants: {},` to the store's initial state (alongside `chats`/`activeChat`/`messages`). Add these two actions (placed after `incrementFireStacks`, or wherever fits the file's existing ordering):

```js
  // Fetches every not-yet-cached uid in `uids` and merges the results into
  // `participants`. Fire-and-forget style — callers don't need the return
  // value, just the updated cache.
  resolveParticipants: async (uids) => {
    const cache = useChatStore.getState().participants
    const needed = uids.filter((uid) => !cache[uid])
    if (needed.length === 0) return
    const entries = await Promise.all(
      needed.map(async (uid) => {
        const snap = await getDoc(refs.user(uid))
        return snap.exists() ? [uid, snap.data()] : null
      }),
    )
    const fresh = Object.fromEntries(entries.filter(Boolean))
    if (Object.keys(fresh).length === 0) return
    set((s) => ({ participants: { ...s.participants, ...fresh } }))
  },

  // Returns a single participant's profile, from cache if present, otherwise
  // fetches and caches it. Falls back to a placeholder for a missing doc so
  // callers always get a renderable user object.
  getOrFetchParticipant: async (uid) => {
    const cached = useChatStore.getState().participants[uid]
    if (cached) return cached
    const snap = await getDoc(refs.user(uid))
    const data = snap.exists() ? snap.data() : { uid, displayName: 'Unknown', photoURL: null }
    set((s) => ({ participants: { ...s.participants, [uid]: data } }))
    return data
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/useChatStore.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/useChatStore.js src/stores/useChatStore.test.js
git commit -m "feat: add participants cache (resolveParticipants/getOrFetchParticipant) to useChatStore"
```

---

### Task 2: Add `sendGift` to `useChatStore.js`

**Files:**
- Modify: `src/stores/useChatStore.js`
- Modify: `src/stores/useChatStore.test.js`

**Interfaces:**
- Produces: `sendGift(chatId, myUid, gift): Promise<void>` — writes a `type: 'gift'` message + updates chat metadata + increments stacks, extracted verbatim from `ChatPanel.jsx`'s current `GiftModal.handleGift` (`src/components/ChatPanel.jsx:43-55`). Does NOT touch coins — the caller (`GiftModal`) keeps its own optimistic `addCoins(-gift.coins)`/rollback.

- [ ] **Step 1: Write the failing test** — add to `src/stores/useChatStore.test.js`:

```js
describe('sendGift', () => {
  it('writes a gift message and always grants a fireStack', async () => {
    await useChatStore.getState().sendGift('chat-1', 'me', { emoji: '🌟', name: 'Star', coins: 10 })

    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _col: 'chats/chat-1/messages' }),
      expect.objectContaining({
        senderId: 'me',
        type: 'gift',
        giftItem: { name: 'Star', emoji: '🌟', coins: 10 },
      }),
    )
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'chats/chat-1' }),
      expect.objectContaining({ fireStacks: { _increment: 1 } }),
    )
    expect(useUserStore.getState().incrementStacks).toHaveBeenCalled()
  })
})
```
(Reuse whatever `useUserStore`/`incrementStacks` spy setup the existing `sendNewsShare` tests already established in this file — same mock pattern, no new setup needed.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useChatStore.test.js`
Expected: FAIL — `sendGift is not a function`

- [ ] **Step 3: Implement** — add after `sendNewsShare`:

```js
  // Sends a virtual-gift message and always grants a fireStack (same
  // always-grant behavior as sendNewsShare, not sendMessage's once-per-day
  // rule) — extracted verbatim from ChatPanel.jsx's GiftModal.handleGift.
  // Coin debit/rollback stays in the caller (GiftModal) as optimistic UI.
  sendGift: async (chatId, myUid, gift) => {
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
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/useChatStore.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/useChatStore.js src/stores/useChatStore.test.js
git commit -m "feat: add useChatStore.sendGift - extracted from ChatPanel.GiftModal"
```

---

### Task 3: Add `giveCredit` to `useChatStore.js`

**Files:**
- Modify: `src/stores/useChatStore.js`
- Modify: `src/stores/useChatStore.test.js`

**Interfaces:**
- Produces: `giveCredit(friendUid, fromUser, taskSnapshot, note): Promise<void>` — writes to `cols.userCredits(friendUid)`, extracted verbatim from `ChatPanel.jsx`'s current `CreditModal.handleConfirm` (`src/components/ChatPanel.jsx:151-158`). Does NOT touch `addCreditToJourney` or `markTaskCredited` — those stay in the component (local journey-store update and localStorage dedup respectively, neither is chat-domain data).

- [ ] **Step 1: Write the failing test** — add to `src/stores/useChatStore.test.js`:

```js
describe('giveCredit', () => {
  it('writes a credit doc under cols.userCredits(friendUid)', async () => {
    await useChatStore.getState().giveCredit(
      'friend-uid',
      { uid: 'me', displayName: 'Me' },
      { title: 'Do the dishes', linkedJourneyKey: 'career' },
      '  nice work  ',
    )
    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _col: 'users/friend-uid/receivedCredits' }),
      expect.objectContaining({
        fromUid: 'me',
        fromName: 'Me',
        taskTitle: 'Do the dishes',
        journeyKey: 'career',
        message: 'nice work',
      }),
    )
  })
})
```
(Check `cols.userCredits`'s exact collection path shape in `src/lib/db.js` — `userCredits: (uid) => collection(db, 'users', uid, 'receivedCredits')` — and match the mocked `_col` string to whatever the test file's `collection` mock produces for a multi-segment path, following the same pattern already used for `cols.chatMessages` assertions in this file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useChatStore.test.js`
Expected: FAIL — `giveCredit is not a function`

- [ ] **Step 3: Implement** — add after `sendGift`:

```js
  // Writes a "friend helped with this task" credit doc to the friend's
  // receivedCredits subcollection. Extracted verbatim from ChatPanel.jsx's
  // CreditModal.handleConfirm — addCreditToJourney (local journey update) and
  // markTaskCredited (localStorage dedup) stay in the caller, since neither
  // is chat/Firestore data.
  giveCredit: async (friendUid, fromUser, taskSnapshot, note) => {
    await addDoc(cols.userCredits(friendUid), {
      fromUid: fromUser?.uid ?? '',
      fromName: fromUser?.displayName ?? '',
      taskTitle: taskSnapshot.title,
      journeyKey: taskSnapshot.linkedJourneyKey ?? null,
      message: note.trim(),
      createdAt: serverTimestamp(),
    })
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/useChatStore.test.js`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: all green, output pristine

- [ ] **Step 6: Commit**

```bash
git add src/stores/useChatStore.js src/stores/useChatStore.test.js
git commit -m "feat: add useChatStore.giveCredit - extracted from ChatPanel.CreditModal"
```

---

## Handoff

Once all 3 tasks are committed, Plan 12 (`docs/superpowers/plans/2026-07-04-plan12-cursor-chatpanel-jsx.md`) rewires `ChatPanel.jsx` to call these new actions instead of its inline Firestore code — hand that to Cursor.
