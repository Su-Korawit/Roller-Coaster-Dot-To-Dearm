# Architecture Improvement — Plan 15: TaskPanel Data Layer (Claude Code)

**Goal:** Add `sendTaskShare` to `src/stores/useChatStore.js` for `TaskPanel.jsx`'s task-sharing-to-chat feature. This is the ONLY genuine inline-Firestore concern in `TaskPanel.jsx` (692→706 lines, fourth god-panel) — plain task CRUD (create/toggle/delete/reorder/trash) already lives entirely in `useTaskStore.js` with zero Firestore code in the component (persistence is owned by `src/lib/syncManager.js`'s debounced writer). Do not force-fit a bigger refactor onto the CRUD path — there's nothing there to extract.

**Architecture:** `sendTaskShare` lands in `useChatStore.js` (not `useTaskStore.js`) because it writes chat data (`cols.chatMessages`, `refs.chat`) — same reasoning as `sendNewsShare`/`sendGift`: the write target is chat-domain, even though the trigger is a different panel. This mirrors the pattern established twice already this session.

**Tech Stack:** Zustand 5, Firebase Firestore, Vitest.

## Global Constraints

- **No TypeScript** — plain JS only.
- **Firebase paths** — only via `src/lib/db.js` (`cols.chatMessages`, `refs.chat` — already used elsewhere in `useChatStore.js`).
- Do not change `TaskPanel.jsx` in this plan — that's Plan 16, Cursor's job.
- Do not touch `useTaskStore.js` or `syncManager.js` — task CRUD/persistence is out of scope, already correctly seamed.
- The `addSharedRef`/`getSharedRefs` localStorage bookkeeping and the `syncSharedTaskStatus` status-sync loop stay in `TaskPanel.jsx` — they are session-local UI bookkeeping (which chat messages reference which task), not something to push into a Zustand store.

---

### Task 1: Add `sendTaskShare` to `useChatStore.js`

**Files:**
- Modify: `src/stores/useChatStore.js`
- Modify: `src/stores/useChatStore.test.js`

**Interfaces:**
- Produces: `sendTaskShare(chatId, myUid, task, ownerDisplayName): Promise<string>` — writes a `type: 'shared_task'` message + updates chat metadata + increments stacks, **returns the new message's id** (the caller needs it for `addSharedRef`). Extracted verbatim from `TaskPanel.jsx`'s current `TaskShareSheet.handleSend` (`src/components/TaskPanel.jsx:70-93`).

- [ ] **Step 1: Write the failing test** — add to `src/stores/useChatStore.test.js`:

```js
describe('sendTaskShare', () => {
  it('writes a shared_task message and returns its id', async () => {
    addDoc.mockResolvedValueOnce({ id: 'msg-1' })
    const task = { id: 'task-1', title: 'Do the dishes', estimatedProgress: 10, completed: false }
    const msgId = await useChatStore.getState().sendTaskShare('chat-1', 'me', task, 'My Name')

    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _col: 'chats/chat-1/messages' }),
      expect.objectContaining({
        senderId: 'me',
        type: 'shared_task',
        taskSnapshot: expect.objectContaining({
          title: 'Do the dishes',
          taskId: 'task-1',
          ownerUid: 'me',
          ownerName: 'My Name',
          status: 'in_progress',
        }),
      }),
    )
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'chats/chat-1' }),
      expect.objectContaining({ fireStacks: { _increment: 1 } }),
    )
    expect(useUserStore.getState().incrementStacks).toHaveBeenCalled()
    expect(msgId).toBe('msg-1')
  })

  it("marks status 'completed' when the task is already done", async () => {
    addDoc.mockResolvedValueOnce({ id: 'msg-2' })
    const task = { id: 'task-2', title: 'Done thing', completed: true }
    await useChatStore.getState().sendTaskShare('chat-1', 'me', task, 'My Name')
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ taskSnapshot: expect.objectContaining({ status: 'completed' }) }),
    )
  })
})
```
(`addDoc` in this test file's mock currently returns `undefined` by default per the existing `sendNewsShare`/`sendGift` tests, which never read a return value — this task's mock needs `addDoc.mockResolvedValueOnce({ id: '...' })` since `sendTaskShare` is the first action in this file that needs `addDoc`'s return value. Check the mock declaration at the top of the file supports per-test override via `mockResolvedValueOnce` — it should, since it's a plain `vi.fn()`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useChatStore.test.js`
Expected: FAIL — `sendTaskShare is not a function`

- [ ] **Step 3: Implement** — add after `giveCredit`:

```js
  // Shares a task into a chat as a 'shared_task' message and always grants a
  // fireStack. Returns the new message's id so the caller can record which
  // chat message references this task (for later status sync). Extracted
  // verbatim from TaskPanel.jsx's TaskShareSheet.handleSend.
  sendTaskShare: async (chatId, myUid, task, ownerDisplayName) => {
    const msgRef = await addDoc(cols.chatMessages(chatId), {
      senderId: myUid,
      text: `📋 ${task.title}`,
      type: 'shared_task',
      taskSnapshot: {
        title: task.title,
        estimatedProgress: task.estimatedProgress ?? null,
        linkedJourneyKey: task.linkedJourneyKey ?? null,
        linkedJourneyId: task.linkedJourneyId ?? null,
        taskId: task.id,
        ownerUid: myUid,
        ownerName: ownerDisplayName ?? '',
        status: task.completed ? 'completed' : 'in_progress',
      },
      giftItem: null,
      newsItem: null,
      createdAt: serverTimestamp(),
    })
    await updateDoc(refs.chat(chatId), {
      lastMessage: `📋 ${task.title}`,
      lastMessageAt: serverTimestamp(),
      fireStacks: increment(1),
    })
    useUserStore.getState().incrementStacks()
    return msgRef.id
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
git commit -m "feat: add useChatStore.sendTaskShare - extracted from TaskPanel.TaskShareSheet"
```

---

## Handoff

Once committed, Plan 16 (`docs/superpowers/plans/2026-07-04-plan16-cursor-taskpanel-jsx.md`) rewires `TaskPanel.jsx`'s `TaskShareSheet` to use this action, and — since Plan 11 already gave `useChatStore` a `participants` cache — also repoints `TaskShareSheet`'s own duplicate participant-resolution effect (a third copy of the same pattern already fixed once in `ChatPanel.jsx`) onto the shared cache. Hand Plan 16 to Cursor.
