# Architecture Improvement — Plan 5: NewsPanel Data Layer (Claude Code)

**Goal:** Extract NewsPanel's Firestore reads/writes/listener into a new `useNewsStore.js`, following the exact pattern already established by `useChatStore.js`/`useSocialStore.js` (`createFirestoreListener` seam), and eliminate `ShareSheet`'s duplicated chat-send logic by adding a `sendNewsShare` action to `useChatStore.js`. This is step 1 of decomposing NewsPanel (593 lines, first of 4 god-panels); step 2 (Plan 6) rewires the JSX to use this store — Cursor's job per this project's collaboration split.

**Architecture:** No new patterns — `useNewsStore.js` mirrors `useSocialStore.js`'s shape exactly (plain `create()`, no persist middleware, module-level `createFirestoreListener()` singleton). `sendNewsShare` is added to the existing `useChatStore.js` rather than duplicated in the new store, since it's chat-domain data (writes to `chats`/`chats/{id}/messages`), not news-domain data.

**Tech Stack:** Zustand 5, Firebase Firestore, Vitest.

## Global Constraints

- **No TypeScript** — plain JS only.
- **Firebase paths** — only via `src/lib/db.js` refs/cols/queries (already done for this file — `cols.appUpdates`, `refs.appUpdate`, `queries.appUpdatesByDate` exist).
- Do not change `NewsPanel.jsx` in this plan — that's Plan 6, Cursor's job. This plan only adds/extends store files.
- Preserve exact current behavior — **do not fix the `sendNewsShare` vs `sendMessage` fireStacks discrepancy** found during research (see Task 2's note) — only surface it as a comment, don't silently change behavior.

---

### Task 1: Create `src/stores/useNewsStore.js`

**Files:**
- Create: `src/stores/useNewsStore.js`
- Create: `src/stores/useNewsStore.test.js`

**Interfaces:**
- Produces: `useNewsStore` — Zustand store with state `{ updates: [] }` and actions `subscribeUpdates()`, `addUpdate({ type, title, description, image })`, `deleteUpdate(id)`, `getAllUpdates()`.
- Consumes: `createFirestoreListener` from `../lib/firestoreListener` (existing, `src/lib/firestoreListener.js:21`); `cols`, `refs`, `queries` from `../lib/db` (existing: `cols.appUpdates`, `refs.appUpdate`, `queries.appUpdatesByDate`); `STATIC_UPDATES` from `../data/appUpdates` (existing).

- [ ] **Step 1: Write the failing test** — `src/stores/useNewsStore.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
  onSnapshot: vi.fn((query, handler) => {
    handler({ docs: [{ id: 'u1', data: () => ({ title: 'Test update', type: 'new' }) }] })
    return vi.fn() // unsub
  }),
  collection: vi.fn((_, ...path) => ({ _col: path.join('/') })),
  doc: vi.fn((_, ...path) => ({ _path: path.join('/') })),
  query: vi.fn((col) => col),
  orderBy: vi.fn(),
}))

const { useNewsStore } = await import('./useNewsStore')
const { addDoc, deleteDoc } = await import('firebase/firestore')

beforeEach(() => {
  useNewsStore.setState({ updates: [] })
  vi.clearAllMocks()
})

describe('subscribeUpdates', () => {
  it('attaches a listener and populates updates from the snapshot', () => {
    useNewsStore.getState().subscribeUpdates()
    expect(useNewsStore.getState().updates).toEqual([
      { id: 'u1', _firestore: true, title: 'Test update', type: 'new' },
    ])
  })
})

describe('addUpdate', () => {
  it('writes a trimmed update doc via cols.appUpdates', async () => {
    await useNewsStore.getState().addUpdate({ type: 'new', title: '  Hi  ', description: '  desc  ', image: '' })
    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _col: 'appUpdates' }),
      expect.objectContaining({ type: 'new', title: 'Hi', description: 'desc', image: null }),
    )
  })
})

describe('deleteUpdate', () => {
  it('deletes via refs.appUpdate(id)', async () => {
    await useNewsStore.getState().deleteUpdate('u1')
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ _path: 'appUpdates/u1' }))
  })
})

describe('getAllUpdates', () => {
  it('merges STATIC_UPDATES with Firestore updates and sorts by date desc', () => {
    useNewsStore.setState({
      updates: [{ id: 'u1', _firestore: true, title: 'New', createdAt: { toMillis: () => 2000 } }],
    })
    const all = useNewsStore.getState().getAllUpdates()
    expect(all[0]).toMatchObject({ id: 'u1', title: 'New' })
    expect(all.length).toBeGreaterThan(1) // includes STATIC_UPDATES too
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useNewsStore.test.js`
Expected: FAIL — `Cannot find module './useNewsStore'`

- [ ] **Step 3: Write the implementation** — `src/stores/useNewsStore.js`:

```js
import { create } from 'zustand'
import { addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { cols, refs, queries } from '../lib/db'
import { createFirestoreListener } from '../lib/firestoreListener'
import { STATIC_UPDATES } from '../data/appUpdates'

// Shared listener slot — owns the detach-before-reattach lifecycle.
const updatesListener = createFirestoreListener()

export const useNewsStore = create((set, get) => ({
  updates: [], // Firestore-backed appUpdates, admin-added

  // Attaches a real-time listener to appUpdates ordered by createdAt desc.
  // Replaces any existing listener. Returns the unsubscribe function.
  subscribeUpdates: () =>
    updatesListener.attach(queries.appUpdatesByDate(), (snap) => {
      set({ updates: snap.docs.map((d) => ({ id: d.id, _firestore: true, ...d.data() })) })
    }),

  addUpdate: async ({ type, title, description, image }) => {
    await addDoc(cols.appUpdates, {
      type,
      title: title.trim(),
      description: description.trim(),
      image: image?.trim() || null,
      createdAt: serverTimestamp(),
    })
  },

  deleteUpdate: async (id) => {
    await deleteDoc(refs.appUpdate(id))
  },

  // Merge static + Firestore updates, sorted by date desc.
  getAllUpdates: () => {
    const { updates } = get()
    return [...STATIC_UPDATES, ...updates]
      .map((u) => ({ ...u, _ts: u.createdAt?.toMillis?.() ?? new Date(u.date).getTime() }))
      .sort((a, b) => b._ts - a._ts)
  },
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/useNewsStore.test.js`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add src/stores/useNewsStore.js src/stores/useNewsStore.test.js
git commit -m "feat: add useNewsStore - Firestore listener/actions for NewsPanel updates"
```

---

### Task 2: Add `sendNewsShare` to `useChatStore.js`

**Files:**
- Modify: `src/stores/useChatStore.js`
- Create: `src/stores/useChatStore.test.js` (no test file currently exists for this store — add one covering only the new action, not a full retrofit)

**Interfaces:**
- Produces: `useChatStore.getState().sendNewsShare(chatId, { title, url, poster })` — writes a `type: 'news'` message + updates chat metadata, mirrors `ShareSheet.handleSend`'s current exact behavior (see note below).
- Consumes: nothing new — `addDoc`, `updateDoc`, `increment`, `serverTimestamp`, `refs`, `cols`, `auth`, `useUserStore` are already imported in this file (`src/stores/useChatStore.js:1-12`).

**Important — behavior note, not a fix:** `ShareSheet.handleSend` (current `src/components/NewsPanel.jsx:46-69`) always grants a fireStack (`fireStacks: increment(1)` unconditionally), unlike `sendMessage` (`useChatStore.js:71-79`) which only grants once per calendar day per chat (`grantStack` check). This is a real behavioral discrepancy between "send a text message" and "share a news item" — but fixing it is out of scope for this refactor (a pure extraction should not silently change behavior). `sendNewsShare` below preserves the exact current always-grant behavior; the discrepancy is flagged in a comment for a human decision later.

- [ ] **Step 1: Write the failing test** — `src/stores/useChatStore.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'me' } } }))
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  increment: (n) => ({ _increment: n }),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
  collection: vi.fn((_, ...path) => ({ _col: path.join('/') })),
  doc: vi.fn((_, ...path) => ({ _path: path.join('/') })),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}))

const { useChatStore } = await import('./useChatStore')
const { useUserStore } = await import('./useUserStore')
const { addDoc, updateDoc } = await import('firebase/firestore')

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(useUserStore.getState(), 'incrementStacks').mockImplementation(() => {})
})

describe('sendNewsShare', () => {
  it('writes a news-type message and always grants a fireStack', async () => {
    await useChatStore.getState().sendNewsShare('chat-1', { title: 'Big News', url: 'https://x', poster: 'https://p' })

    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _col: 'chats/chat-1/messages' }),
      expect.objectContaining({
        senderId: 'me',
        type: 'news',
        newsItem: { title: 'Big News', url: 'https://x', thumbnail: 'https://p' },
      }),
    )
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'chats/chat-1' }),
      expect.objectContaining({ fireStacks: { _increment: 1 } }),
    )
    expect(useUserStore.getState().incrementStacks).toHaveBeenCalled()
  })

  it('does nothing when signed out', async () => {
    vi.doMock('../firebase', () => ({ db: {}, auth: { currentUser: null } }))
    await useChatStore.getState().sendNewsShare('chat-1', { title: 'x' })
    expect(addDoc).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/useChatStore.test.js`
Expected: FAIL — `sendNewsShare is not a function`

- [ ] **Step 3: Add the action** to `src/stores/useChatStore.js`, right after `sendMessage` (after line 84, before `subscribeMessages`):

```js
  // Shares a news item into a chat. Always grants a fireStack (unlike
  // sendMessage's once-per-day rule) — preserves NewsPanel.ShareSheet's
  // existing behavior exactly; this discrepancy is a known follow-up, not
  // something this extraction should silently fix.
  sendNewsShare: async (chatId, newsItem) => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    await addDoc(cols.chatMessages(chatId), {
      senderId: uid,
      text: `📰 ${newsItem.title}`,
      type: 'news',
      newsItem: { title: newsItem.title, url: newsItem.url, thumbnail: newsItem.poster },
      giftItem: null,
      createdAt: serverTimestamp(),
    })
    await updateDoc(refs.chat(chatId), {
      lastMessage: `📰 ${newsItem.title}`,
      lastMessageAt: serverTimestamp(),
      fireStacks: increment(1),
    })
    useUserStore.getState().incrementStacks()
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/useChatStore.test.js`
Expected: PASS (2/2)

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: all green, output pristine

- [ ] **Step 6: Commit**

```bash
git add src/stores/useChatStore.js src/stores/useChatStore.test.js
git commit -m "feat: add useChatStore.sendNewsShare - extracted from NewsPanel.ShareSheet"
```

---

## Handoff

Once both tasks are committed, Plan 6 (`docs/superpowers/plans/2026-07-04-plan6-cursor-newspanel-jsx.md`) rewires `NewsPanel.jsx` to call `useNewsStore`/`useChatStore.sendNewsShare` instead of its inline Firestore code — hand that plan to Cursor.
