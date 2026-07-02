# Wire UpdateAssetsSection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken Toast call in the orphaned `UpdateAssetsSection.jsx` and render it as a top card inside the Admin "Assets" tab so the Sprout Lands asset-download feature actually works.

**Architecture:** `UpdateAssetsSection` already implements the full download flow (recursive Storage list of `sprites/`/`ui/`/`audio/` → `showDirectoryPicker` → write to local dir with progress). It has never been wired into any tab and its toast calls target a non-existent `showToast` API. This plan is two surgical edits: (1) correct the toast API to match `useToast()`'s real `{ success, error }` shape, (2) render it above `AssetsManagerSection` under the existing `assets` section key in `AdminPage.jsx`. No new tab, no `admin.js` role/section changes.

**Tech Stack:** React 19 + JSX (no TypeScript), Firebase v9 modular Storage SDK, Tailwind v4, `useToast()` from `src/components/admin/Toast.jsx`.

## Global Constraints

- **No TypeScript** — plain JS + JSX only. No type annotations.
- `useToast()` returns `{ success(msg), error(msg) }`. There is **no** `showToast`. Call `const toast = useToast()` then `toast?.error(msg)` / `toast?.success(msg)` (optional-chaining guards against a null context).
- No new npm packages. No new tests (browser-only File System Access API — cannot run under vitest/jsdom; verified by manual smoke test).
- Match existing admin-section style. Don't touch `AssetsManagerSection.jsx`, `storageOps.js`, or `assetFolders.js` — they already ship.
- `rc/` prefix is intentionally NOT in the download set (`SYNC_PREFIXES = ['sprites','ui','audio']`) — leave it that way.
- Commit after every task.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/admin/UpdateAssetsSection.jsx` | **Modify** | Fix `useToast()` usage (4 call sites + hook line + dep array) |
| `src/pages/AdminPage.jsx` | **Modify** | Import + render `UpdateAssetsSection` above `AssetsManagerSection` in the `assets` tab |

---

### Task 1: Fix the Toast API in `UpdateAssetsSection.jsx`

**Files:**
- Modify: `src/components/admin/UpdateAssetsSection.jsx:38`, `:50`, `:75`, `:102-104`, `:106`

**Interfaces:**
- Consumes: `useToast()` from `src/components/admin/Toast.jsx` → returns `{ success: (msg) => void, error: (msg) => void }`
- Produces: nothing new — same default-exported `UpdateAssetsSection` component, now with working toasts.

**Why:** The current line `const { showToast } = useToast()` destructures a property that does not exist, so `showToast` is `undefined` and every `showToast(...)` call throws `TypeError: showToast is not a function`. The component crashes on the browser-support check, the list-error path, and both completion paths.

- [ ] **Step 1: Replace the hook line (line 38)**

**Before:**
```jsx
  const { showToast } = useToast()
```

**After:**
```jsx
  const toast = useToast()
```

- [ ] **Step 2: Fix the browser-support toast (line 50)**

**Before:**
```jsx
      showToast('Browser นี้ไม่รองรับ File System Access API — ใช้ Chrome หรือ Edge', 'error')
```

**After:**
```jsx
      toast?.error('Browser นี้ไม่รองรับ File System Access API — ใช้ Chrome หรือ Edge')
```

- [ ] **Step 3: Fix the list-error toast (line 75)**

**Before:**
```jsx
      showToast('ดึงรายการไฟล์จาก Firebase ไม่สำเร็จ', 'error')
```

**After:**
```jsx
      toast?.error('ดึงรายการไฟล์จาก Firebase ไม่สำเร็จ')
```

- [ ] **Step 4: Fix both completion toasts (lines 102 and 104)**

**Before:**
```jsx
    if (errors.length === 0) {
      showToast(`อัปเดตสำเร็จ — ${allItems.length} ไฟล์ ไปยัง "${dirHandle.name}"`, 'success')
    } else {
      showToast(`อัปเดต ${allItems.length - errors.length}/${allItems.length} ไฟล์ (${errors.length} ไฟล์ผิดพลาด)`, 'error')
    }
```

**After:**
```jsx
    if (errors.length === 0) {
      toast?.success(`อัปเดตสำเร็จ — ${allItems.length} ไฟล์ ไปยัง "${dirHandle.name}"`)
    } else {
      toast?.error(`อัปเดต ${allItems.length - errors.length}/${allItems.length} ไฟล์ (${errors.length} ไฟล์ผิดพลาด)`)
    }
```

- [ ] **Step 5: Update the `handleUpdate` dependency array (line 106)**

**Before:**
```jsx
  }, [showToast])
```

**After:**
```jsx
  }, [toast])
```

- [ ] **Step 6: Verify no `showToast` references remain**

Run: `grep -n showToast src/components/admin/UpdateAssetsSection.jsx`
Expected: no output (exit 1). Every occurrence is now `toast?.success` / `toast?.error`.

- [ ] **Step 7: Verify the dev server compiles**

Run: `npm run dev`
Expected: Vite starts with no compile error for `UpdateAssetsSection.jsx`. (Component is not yet mounted anywhere — this only confirms it parses. Stop the server after confirming.)

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/UpdateAssetsSection.jsx
git commit -m "fix(admin): correct Toast API in UpdateAssetsSection"
```

---

### Task 2: Render `UpdateAssetsSection` inside the Assets tab

**Files:**
- Modify: `src/pages/AdminPage.jsx:5` (import) and `:74` (render)

**Interfaces:**
- Consumes: default export `UpdateAssetsSection` from `src/components/admin/UpdateAssetsSection.jsx` (fixed in Task 1)
- Produces: nothing new. `AdminPage` still renders one section per tab; the `assets` tab now stacks two sections. No change to `ALL_TABS`, `ADMIN_SECTIONS`, or `ADMIN_ROLES` — both existing `assets` admins (`o.korawitt@gmail.com`, `takadaoni07@gmail.com`) get the feature automatically.

- [ ] **Step 1: Add the import (after line 5)**

Insert directly below the existing `AssetsManagerSection` import:

```jsx
import UpdateAssetsSection from '../components/admin/UpdateAssetsSection'
```

Result — lines 5–6 read:
```jsx
import AssetsManagerSection from '../components/admin/AssetsManagerSection'
import UpdateAssetsSection from '../components/admin/UpdateAssetsSection'
```

- [ ] **Step 2: Stack both sections in the `assets` render slot (line 74)**

**Before:**
```jsx
          {tab === 'assets'     && <AssetsManagerSection />}
```

**After:**
```jsx
          {tab === 'assets'     && (
            <div className="space-y-8">
              <UpdateAssetsSection />
              <AssetsManagerSection />
            </div>
          )}
```

- [ ] **Step 3: Manual smoke test (Chrome or Edge only)**

Run: `npm run dev`, open the app, sign in as an admin with the `assets` role, go to Admin → **Assets** tab.

Verify:
1. An **"Update Assets"** card appears at the top, above the folder sidebar/grid.
2. Click **"Update Assets from Firebase"** → the OS folder picker opens.
3. Pick a scratch folder → spinner shows "กำลังดึงรายการไฟล์…", then a progress bar counting `done / total`.
4. On completion a green success toast fires (`อัปเดตสำเร็จ — N ไฟล์…`) and the picked folder contains `sprites/`, `ui/`, `audio/` subfolders with the downloaded files. **No `TypeError` in the console.**
5. The existing folder manager (Tilesets/Objects sidebar, file grid, Trash) below the card still works unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminPage.jsx
git commit -m "feat(admin): render UpdateAssetsSection atop the Assets tab"
```

---

## Self-Review

- **Spec coverage:** Scope = wire UpdateAssetsSection (Task 2) + the fix it needs to actually run (Task 1). Placement = top card inside Assets tab (Task 2 Step 2). Verify = manual smoke, no vitest (Task 2 Step 3). All three locked decisions covered.
- **Placeholder scan:** none — every edit shows exact before/after code.
- **Type/name consistency:** `toast` variable + `toast?.success` / `toast?.error` used identically across all four Task 1 call sites and the dep array; import name `UpdateAssetsSection` matches the file's default export and the Task 2 render.
- **Out of scope (do not do here):** ADR-0007 `rc/` migration of `assetManifest.js`; excluding `sprites/characters/` (RC MBTI sprites) from the download — the download only writes to a local folder, overwrites nothing in Storage, so the leak is benign and left for the separate rc/ migration.
