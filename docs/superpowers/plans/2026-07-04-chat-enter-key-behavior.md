# Chat Enter-Key Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two chat message boxes (friend/admin chat and Shop AI chat) so Enter behaves correctly per platform: on desktop, Enter sends and Shift+Enter inserts a newline; on mobile/tablet, Enter always inserts a newline and only the send button sends.

**Architecture:** Both chat inputs are currently native `<input type="text">` elements, which cannot hold a newline character at all — that's the root cause of "Enter ในข้อความไม่ได้" (can't put a newline in the message), independent of any key-handling code. The fix swaps both to `<textarea>` and introduces one shared hook, `useChatComposer`, that (a) auto-grows the textarea to fit its content and (b) decides — based on viewport width, matching this codebase's existing `window.innerWidth < 768` mobile check (see `Hotbar.jsx`, `ShopUI.jsx`, `StorageUI.jsx`) — whether an Enter keypress should trigger send or fall through to the browser's default newline insertion.

**Tech Stack:** React (plain JS/JSX, no TypeScript), Tailwind v4 utility classes, Vitest + jsdom + @testing-library/react.

## Global Constraints

- No TypeScript — plain JS + JSX only (per `CLAUDE.md`).
- Tailwind v4 — use existing utility classes / `@theme` tokens only, no new config files.
- Mobile detection must reuse the codebase's existing convention: `typeof window !== 'undefined' && window.innerWidth < 768`, computed inline/at call time (not a media-query listener/hook), matching `Hotbar.jsx`, `ShopUI.jsx`, `StorageUI.jsx`.
- Surgical changes only — do not touch unrelated chat features (gifts, credit modal, product cards, payment cards).
- This is a planning/implementation artifact for **Cursor** to implement (per project's Claude Code ↔ Cursor split). Claude Code's role after this plan is written is to **check/verify and edit**, not to author the UI changes itself.

---

### Task 1: `useChatComposer` shared hook

**Files:**
- Create: `src/hooks/useChatComposer.js`
- Test: `src/hooks/useChatComposer.test.jsx`

**Interfaces:**
- Produces: `useChatComposer(text: string, onSend: () => void) => { textareaRef: RefObject, handleKeyDown: (e: KeyboardEvent) => void }`
  - `textareaRef` — attach to the `<textarea>` element; the hook auto-resizes it (up to 120px, then scrolls) whenever `text` changes.
  - `handleKeyDown` — attach to the `<textarea>`'s `onKeyDown`. On viewports narrower than 768px, it never intercepts Enter (default newline insertion always wins, only the send button sends). On viewports ≥768px, `Enter` without `Shift` calls `preventDefault()` and `onSend()`; `Shift+Enter` and all other keys are left alone (default newline insertion).
- Consumes: nothing from other tasks (this is the first task).

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useChatComposer.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, renderHook } from '@testing-library/react'

const { useChatComposer } = await import('./useChatComposer')

function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
}

function TestComposer({ text, onSend }) {
  const { textareaRef, handleKeyDown } = useChatComposer(text, onSend)
  return <textarea ref={textareaRef} value={text} onChange={() => {}} onKeyDown={handleKeyDown} />
}

describe('useChatComposer', () => {
  afterEach(() => setViewportWidth(1024))

  it('desktop: Enter without Shift sends and prevents the default newline', () => {
    setViewportWidth(1024)
    const onSend = vi.fn()
    const { result } = renderHook(() => useChatComposer('hello', onSend))
    const preventDefault = vi.fn()
    result.current.handleKeyDown({ key: 'Enter', shiftKey: false, preventDefault })
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })

  it('desktop: Shift+Enter does not send, leaving the default newline insertion intact', () => {
    setViewportWidth(1024)
    const onSend = vi.fn()
    const { result } = renderHook(() => useChatComposer('hello', onSend))
    const preventDefault = vi.fn()
    result.current.handleKeyDown({ key: 'Enter', shiftKey: true, preventDefault })
    expect(onSend).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('mobile: Enter never sends (with or without Shift), so it always inserts a newline', () => {
    setViewportWidth(375)
    const onSend = vi.fn()
    const { result } = renderHook(() => useChatComposer('hello', onSend))
    const preventDefault = vi.fn()
    result.current.handleKeyDown({ key: 'Enter', shiftKey: false, preventDefault })
    result.current.handleKeyDown({ key: 'Enter', shiftKey: true, preventDefault })
    expect(onSend).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('non-Enter keys are ignored', () => {
    setViewportWidth(1024)
    const onSend = vi.fn()
    const { result } = renderHook(() => useChatComposer('hello', onSend))
    result.current.handleKeyDown({ key: 'a', shiftKey: false, preventDefault: vi.fn() })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('auto-resizes the textarea height to fit content, capped at the max height', () => {
    setViewportWidth(1024)
    const onSend = vi.fn()
    const { rerender, getByRole } = render(<TestComposer text="" onSend={onSend} />)
    const textarea = getByRole('textbox')

    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 80 })
    rerender(<TestComposer text="hello" onSend={onSend} />)
    expect(textarea.style.height).toBe('80px')

    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 300 })
    rerender(<TestComposer text="hello\nworld\nmulti-line" onSend={onSend} />)
    expect(textarea.style.height).toBe('120px')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/hooks/useChatComposer.test.jsx`
Expected: FAIL with "Failed to resolve import ./useChatComposer" (module doesn't exist yet)

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useChatComposer.js`:

```js
import { useEffect, useRef } from 'react'

const MOBILE_BREAKPOINT_PX = 768
const MAX_TEXTAREA_HEIGHT_PX = 120

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX
}

export function useChatComposer(text, onSend) {
  const textareaRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`
  }, [text])

  function handleKeyDown(e) {
    if (isMobileViewport()) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return { textareaRef, handleKeyDown }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/hooks/useChatComposer.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useChatComposer.js src/hooks/useChatComposer.test.jsx
git commit -m "feat: add useChatComposer hook for desktop/mobile Enter-to-send behavior"
```

---

### Task 2: Wire `useChatComposer` into Shop AI chat

**Files:**
- Modify: `src/components/shop/ShopChatView.jsx`
- Test: `src/components/shop/ShopChatView.test.jsx`

**Interfaces:**
- Consumes: `useChatComposer(text, onSend)` from Task 1 (`src/hooks/useChatComposer.js`, relative import `../../hooks/useChatComposer`).
- Produces: nothing new for later tasks (leaf UI component).

- [ ] **Step 1: Write the failing tests**

Create `src/components/shop/ShopChatView.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let authState
let shopState
let shopChatState
const sendShopChat = vi.fn()

vi.mock('../../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(authState) }))
vi.mock('../../stores/useShopStore', () => ({
  useShopStore: Object.assign((sel) => sel(shopState), { getState: () => shopState }),
}))
vi.mock('../../stores/useShopChatStore', () => ({ useShopChatStore: (sel) => sel(shopChatState) }))
vi.mock('../../services/shopAi', () => ({ sendShopChat: (...args) => sendShopChat(...args) }))
vi.mock('../../constants/shopPrompt', () => ({ buildShopSystemPrompt: () => 'system-prompt' }))
vi.mock('./ProductCard', () => ({ default: () => null }))
vi.mock('./PaymentCard', () => ({ default: () => null }))

const { default: ShopChatView } = await import('./ShopChatView')

function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
}

describe('ShopChatView composer', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    shopState = { products: [], loadProducts: vi.fn(), loadPurchases: vi.fn(), createPurchase: vi.fn() }
    shopChatState = {
      messages: [{ id: 'm1', type: 'text', role: 'ai', text: 'สวัสดี' }],
      addText: vi.fn(),
      addPaymentCard: vi.fn(),
      addSystemMessage: vi.fn(),
    }
    sendShopChat.mockReset().mockResolvedValue('ตอบกลับ')
    setViewportWidth(1024)
  })

  afterEach(() => setViewportWidth(1024))

  it('desktop: Enter sends the message', () => {
    render(<ShopChatView onBack={() => {}} />)
    const textarea = screen.getByPlaceholderText('พิมพ์ข้อความ...')
    fireEvent.change(textarea, { target: { value: 'สวัสดีครับ' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(sendShopChat).toHaveBeenCalledTimes(1)
  })

  it('desktop: Shift+Enter does not send', () => {
    render(<ShopChatView onBack={() => {}} />)
    const textarea = screen.getByPlaceholderText('พิมพ์ข้อความ...')
    fireEvent.change(textarea, { target: { value: 'บรรทัดแรก' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(sendShopChat).not.toHaveBeenCalled()
  })

  it('mobile: Enter does not send, only the send button does', () => {
    setViewportWidth(375)
    render(<ShopChatView onBack={() => {}} />)
    const textarea = screen.getByPlaceholderText('พิมพ์ข้อความ...')
    fireEvent.change(textarea, { target: { value: 'ทักทาย' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(sendShopChat).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'ส่ง' }))
    expect(sendShopChat).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/shop/ShopChatView.test.jsx`
Expected: FAIL — pressing Enter on the current `<input>` calls `sendShopChat` regardless of viewport width, so the "mobile: Enter does not send" assertion fails.

- [ ] **Step 3: Replace the `<input>` with a `<textarea>` wired to the hook**

In `src/components/shop/ShopChatView.jsx`, add the import (after the existing `PaymentCard` import on line 8):

```js
import PaymentCard from './PaymentCard'
import { useChatComposer } from '../../hooks/useChatComposer'
```

Remove the now-unused manual ref (line 24):

```js
  const inputRef = useRef(null)
```

In `handleSend`'s `finally` block (was `inputRef.current?.focus()`, around line 60), change it to:

```js
      inputRef.current?.focus()
```
→
```js
      textareaRef.current?.focus()
```

Right after the `handleSend` function definition (after its closing `}` around line 62), add the hook call:

```js
  const { textareaRef, handleKeyDown } = useChatComposer(input, () => handleSend(input))
```

Replace the input element (lines 173–182):

```jsx
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input) } }}
            placeholder="พิมพ์ข้อความ..."
            disabled={sending}
            className="thai-font flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-ink placeholder-ink/40 focus:border-brand focus:outline-none disabled:opacity-50"
          />
```

with:

```jsx
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์ข้อความ..."
            disabled={sending}
            className="thai-font flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-ink placeholder-ink/40 focus:border-brand focus:outline-none disabled:opacity-50 resize-none leading-relaxed"
            style={{ maxHeight: 120, overflowY: 'auto' }}
          />
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/shop/ShopChatView.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/shop/ShopChatView.jsx src/components/shop/ShopChatView.test.jsx
git commit -m "fix: shop chat composer respects Enter-to-send vs newline per platform"
```

---

### Task 3: Wire `useChatComposer` into friend/admin chat

**Files:**
- Modify: `src/components/ChatPanel.jsx` (the `ChatWindowView` inner component)

**Interfaces:**
- Consumes: `useChatComposer(text, onSend)` from Task 1 (`src/hooks/useChatComposer.js`, relative import `../hooks/useChatComposer`).
- Produces: nothing new for later tasks. `ChatWindowView` is not exported outside this file, so this task has no dedicated component test — behavior is covered by Task 1's hook tests plus the manual verification in Task 4.

- [ ] **Step 1: Add the import**

In `src/components/ChatPanel.jsx`, after the existing import on line 11:

```js
import { visitMap } from '../lib/syncManager'
```

add:

```js
import { useChatComposer } from '../hooks/useChatComposer'
```

- [ ] **Step 2: Replace the local `handleKeyDown` with the shared hook**

Remove the current implementation (lines 250–252):

```js
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }
```

Replace it with:

```js
  const { textareaRef, handleKeyDown } = useChatComposer(text, handleSend)
```

(This sits in the same spot, after `handleSend` and before the `if (!activeChat) return null` early return on line 254 — hooks must run unconditionally before that guard.)

- [ ] **Step 3: Replace the `<input>` with a `<textarea>`**

Replace lines 482–490:

```jsx
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 bg-gray-50 rounded-xl px-3 py-2 outline-none border border-gray-200 focus:border-brand transition-colors"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 13 }}
        />
```

with:

```jsx
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 bg-gray-50 rounded-xl px-3 py-2 outline-none border border-gray-200 focus:border-brand transition-colors resize-none leading-relaxed"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 13, maxHeight: 120, overflowY: 'auto' }}
        />
```

- [ ] **Step 4: Run the full unit test suite to confirm nothing else broke**

Run: `npm test`
Expected: PASS — all existing suites plus the two new ones from Tasks 1–2 pass; no test imports `ChatPanel.jsx` today, so this step is a regression check on the rest of the app, not a check on this file's new behavior (see Task 4 for that).

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel.jsx
git commit -m "fix: friend/admin chat composer respects Enter-to-send vs newline per platform"
```

---

### Task 4: Manual verification

**Files:** none (browser QA only)

**Interfaces:** none.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` and open the printed `http://localhost:5173` URL.

- [ ] **Step 2: Verify desktop behavior in both chats**

Sign in, open a friend/admin chat, and separately the Shop AI chat (from the chat list). In each:
- Type text, press `Enter` (no Shift) → message sends immediately, input clears.
- Type text, press `Shift+Enter` → a newline appears in the box, nothing is sent; continue typing a second line, then press `Enter` alone → the multi-line message sends.

- [ ] **Step 3: Verify mobile/tablet behavior in both chats**

Open the browser's device toolbar (e.g. Chrome DevTools → Toggle device toolbar, pick an iPad or a width < 768px) and reload. In each chat:
- Type text, press `Enter` (physical/on-screen keyboard) → a newline is inserted, message is **not** sent.
- Tap the send button → the message (including any newlines typed) sends.

- [ ] **Step 4: Resize the browser across the 768px breakpoint with a chat open**

Confirm Enter's behavior switches correctly as the window crosses 768px wide (desktop rules above 768px, mobile rules at/below it), matching the same breakpoint already used by `Hotbar.jsx`/`ShopUI.jsx`/`StorageUI.jsx`.

---

## Self-Review Notes

- **Spec coverage:** Rule 1 (desktop Enter sends) and Rule 2 (desktop Shift+Enter inserts newline) are both covered by `useChatComposer`'s `handleKeyDown` and tested in Task 1 + Task 2. Rule 3 (mobile: button-only send, but Enter still inserts a newline) is covered by the same `handleKeyDown` returning early on narrow viewports — tested in Task 1 (hook) and Task 2 (component), and confirmed for the untested `ChatPanel.jsx` surface via Task 4's manual pass.
- **Root cause fix:** the underlying reason Enter "couldn't" insert a newline was that both message boxes were `<input type="text">`, which structurally cannot hold `\n`. Switching to `<textarea>` is required independent of the key-handling logic — noted in the plan's Architecture section so Cursor doesn't skip it as "just a JS change."
- **Placeholder scan:** no TBD/pseudo-code — every step has literal file contents and exact line anchors.
- **Type consistency:** `useChatComposer(text, onSend)` signature and its `{ textareaRef, handleKeyDown }` return are identical across Task 1's tests, Task 2's `ShopChatView` wiring (`useChatComposer(input, () => handleSend(input))`), and Task 3's `ChatWindowView` wiring (`useChatComposer(text, handleSend)`).
