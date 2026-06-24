# Asset Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Assets" tab to the Admin Dashboard that lets admins upload/rename/move/delete files and folders in Firebase Storage, fixing the hardcoded auto-match bug that blocks new map uploads.

**Architecture:** Firestore `assetFolders` collection tracks folder metadata (path, displayName, isSystem); Firebase Storage holds actual files. The existing `autoMatchTilesets` logic is unchanged — only its caller (`UploadPanel`) is updated to fetch folders dynamically. File and folder operations use a new `storageOps.js` helper (copy+delete pattern, since Storage has no native rename/move).

**Tech Stack:** React 18, Firebase v9 modular SDK (Storage + Firestore), Tailwind CSS, Vitest

## Global Constraints

- Firebase imports: `firebase/storage` and `firebase/firestore` (modular v9 syntax — no compat)
- No new npm packages — Tailwind and Firebase are already installed
- `.jsx` for React components, `.js` for utilities
- Tests with Vitest; mock Firebase with `vi.mock` (see `src/utils/cloudAsset.test.js` for the pattern)
- Toast notifications via `useToast()` from `src/components/admin/Toast.jsx`
- Auth uid via `useAuthStore(s => s.user?.uid)` from `src/stores/useAuthStore.js`
- `firebase/app` exports: `db` (Firestore), `storage` from `src/firebase.js`
- Reuse `bustCache` from `src/utils/cloudAsset.js` after any Storage write
- No TypeScript; no comments explaining what the code does
- Commit after every task

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/storageOps.js` | **Create** | Storage helpers: copy, move, trash, restore |
| `src/utils/storageOps.test.js` | **Create** | Tests for pure path helpers |
| `src/utils/assetFolders.js` | **Create** | Firestore CRUD for `assetFolders` collection |
| `src/utils/assetFolders.test.js` | **Create** | Tests for `folderSlug` |
| `src/components/admin/AssetsSection.jsx` | **Modify** | Swap `copyStorageObject` import to `storageOps.js` |
| `src/components/admin/MapDashboard.jsx` | **Modify** | Replace hardcoded folder list with `listAssetFolders()` |
| `src/components/admin/FolderPickerModal.jsx` | **Create** | Modal: pick a target folder (for "Move to" action) |
| `src/components/admin/AssetsManagerSection.jsx` | **Create** | Full Asset Manager UI (FolderSidebar + FileGrid + TrashView) |
| `src/pages/AdminPage.jsx` | **Modify** | Add 'assets' tab + render AssetsManagerSection |
| `src/constants/admin.js` | **Modify** | Add 'assets' to ADMIN_SECTIONS + ADMIN_ROLES |

---

### Task 1: `storageOps.js` — Storage operation helpers

**Files:**
- Create: `src/utils/storageOps.js`
- Create: `src/utils/storageOps.test.js`

**Interfaces:**
- Produces:
  - `toTrashPath(path: string): string` — `'sprites/x.png'` → `'trash/sprites/x.png'`
  - `fromTrashPath(trashPath: string): string` — `'trash/sprites/x.png'` → `'sprites/x.png'`
  - `copyStorageObject(srcPath: string, destPath: string): Promise<void>`
  - `moveFile(srcPath: string, destPath: string): Promise<void>`
  - `trashFile(path: string): Promise<void>`
  - `restoreFile(trashPath: string): Promise<void>`

- [ ] **Step 1: Write failing tests for pure path helpers**

```js
// src/utils/storageOps.test.js
import { describe, it, expect, vi } from 'vitest'

vi.mock('../firebase', () => ({ storage: {} }))
vi.mock('firebase/storage', () => ({
  ref: (_s, p) => ({ path: p }),
  getDownloadURL: vi.fn(),
  uploadBytes: vi.fn(),
  deleteObject: vi.fn(),
}))

import { toTrashPath, fromTrashPath } from './storageOps'

describe('toTrashPath', () => {
  it('prepends trash/ prefix', () => {
    expect(toTrashPath('sprites/tilesets/Grass.png')).toBe('trash/sprites/tilesets/Grass.png')
  })
  it('works for nested paths', () => {
    expect(toTrashPath('sprites/dungeon/Rock.png')).toBe('trash/sprites/dungeon/Rock.png')
  })
})

describe('fromTrashPath', () => {
  it('strips trash/ prefix', () => {
    expect(fromTrashPath('trash/sprites/tilesets/Grass.png')).toBe('sprites/tilesets/Grass.png')
  })
  it('is the inverse of toTrashPath', () => {
    const original = 'sprites/objects/Tree.png'
    expect(fromTrashPath(toTrashPath(original))).toBe(original)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/utils/storageOps.test.js
```

Expected: FAIL — `storageOps` module not found

- [ ] **Step 3: Write `storageOps.js`**

```js
// src/utils/storageOps.js
import { ref, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase'

export function toTrashPath(path) {
  return `trash/${path}`
}

export function fromTrashPath(trashPath) {
  return trashPath.replace(/^trash\//, '')
}

export async function copyStorageObject(srcPath, destPath) {
  const url = await getDownloadURL(ref(storage, srcPath))
  const blob = await (await fetch(url)).blob()
  await uploadBytes(ref(storage, destPath), blob, { contentType: blob.type || 'image/png' })
}

export async function moveFile(srcPath, destPath) {
  await copyStorageObject(srcPath, destPath)
  await deleteObject(ref(storage, srcPath))
}

export async function trashFile(path) {
  await moveFile(path, toTrashPath(path))
}

export async function restoreFile(trashPath) {
  await moveFile(trashPath, fromTrashPath(trashPath))
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/utils/storageOps.test.js
```

Expected: PASS (2 describe blocks, 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/storageOps.js src/utils/storageOps.test.js
git commit -m "feat: add storageOps helpers (copy/move/trash/restore)"
```

---

### Task 2: `assetFolders.js` — Firestore folder registry

**Files:**
- Create: `src/utils/assetFolders.js`
- Create: `src/utils/assetFolders.test.js`

**Interfaces:**
- Consumes: `db` from `src/firebase.js`
- Produces:
  - `folderSlug(displayName: string): string` — pure, deterministic slug
  - `listAssetFolders(): Promise<Array<{id, path, displayName, isSystem, order, trashedAt}>>` — sorted, non-trashed
  - `seedSystemFolders(uid: string): Promise<void>` — idempotent, creates tilesets+objects if missing
  - `createFolder(displayName: string, existingPaths: string[], uid: string): Promise<string>` — returns doc id, throws on path conflict
  - `renameFolder(id: string, newDisplayName: string, newPath: string, uid: string): Promise<void>` — Firestore only (Storage move is caller's job)
  - `trashFolder(id: string, uid: string): Promise<void>`

- [ ] **Step 1: Write failing tests for `folderSlug`**

```js
// src/utils/assetFolders.test.js
import { describe, it, expect, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'TIMESTAMP'),
  query: vi.fn(),
  where: vi.fn(),
}))

import { folderSlug } from './assetFolders'

describe('folderSlug', () => {
  it('lowercases and replaces spaces with underscores', () => {
    expect(folderSlug('My Custom Pack')).toBe('my_custom_pack')
  })
  it('strips special characters', () => {
    expect(folderSlug('Special!@# Chars')).toBe('special_chars')
  })
  it('trims whitespace', () => {
    expect(folderSlug('  dungeon  ')).toBe('dungeon')
  })
  it('collapses multiple spaces', () => {
    expect(folderSlug('A  B')).toBe('a_b')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/utils/assetFolders.test.js
```

Expected: FAIL — `assetFolders` module not found

- [ ] **Step 3: Write `assetFolders.js`**

```js
// src/utils/assetFolders.js
import { collection, doc, getDocs, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const SYSTEM_FOLDERS = [
  { path: 'sprites/tilesets', displayName: 'Tilesets', isSystem: true, order: 0 },
  { path: 'sprites/objects',  displayName: 'Objects',  isSystem: true, order: 1 },
]

const col = () => collection(db, 'assetFolders')

export function folderSlug(displayName) {
  return displayName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export async function listAssetFolders() {
  const snap = await getDocs(col())
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((f) => !f.trashedAt)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.path.localeCompare(b.path))
}

export async function seedSystemFolders(uid) {
  const snap = await getDocs(col())
  const existingPaths = new Set(snap.docs.map((d) => d.data().path))
  await Promise.all(
    SYSTEM_FOLDERS
      .filter((f) => !existingPaths.has(f.path))
      .map((f) =>
        setDoc(doc(col()), {
          ...f,
          createdAt: serverTimestamp(),
          createdBy: uid ?? null,
          trashedAt: null,
        }),
      ),
  )
}

export async function createFolder(displayName, existingPaths, uid) {
  const slug = folderSlug(displayName)
  if (!slug) throw new Error('ชื่อ folder ไม่ถูกต้อง')
  const path = `sprites/${slug}`
  if (existingPaths.includes(path)) throw new Error(`Folder "${path}" มีอยู่แล้ว`)
  const ref = doc(col())
  await setDoc(ref, {
    path,
    displayName: displayName.trim(),
    isSystem: false,
    order: 99,
    createdAt: serverTimestamp(),
    createdBy: uid ?? null,
    trashedAt: null,
  })
  return ref.id
}

export async function renameFolder(id, newDisplayName, newPath, uid) {
  await updateDoc(doc(db, 'assetFolders', id), {
    displayName: newDisplayName.trim(),
    path: newPath,
    updatedAt: serverTimestamp(),
    updatedBy: uid ?? null,
  })
}

export async function trashFolder(id, uid) {
  await updateDoc(doc(db, 'assetFolders', id), {
    trashedAt: serverTimestamp(),
    trashedBy: uid ?? null,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/utils/assetFolders.test.js
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/assetFolders.js src/utils/assetFolders.test.js
git commit -m "feat: add assetFolders Firestore utility"
```

---

### Task 3: Update `AssetsSection.jsx` — swap `copyStorageObject` import

**Files:**
- Modify: `src/components/admin/AssetsSection.jsx:11-17`

**Interfaces:**
- Consumes: `copyStorageObject` from `src/utils/storageOps.js` (same signature as before)

- [ ] **Step 1: Remove the local `copyStorageObject` definition and import from `storageOps`**

In `src/components/admin/AssetsSection.jsx`, replace lines 1–17 with:

```jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { ref, uploadBytesResumable, listAll } from 'firebase/storage'
import { storage } from '../../firebase'
import { cloudAsset, bustCache } from '../../utils/cloudAsset'
import { MBTI_TYPES, GAME_ASSET_BY_KEY } from '../../game/assetManifest'
import { copyStorageObject } from '../../utils/storageOps'
import StorageBrowser from './StorageBrowser'
import { useToast } from './Toast'
```

(`uploadBytes` ถูกลบออกเพราะใช้แค่ใน `copyStorageObject` เดิม — `uploadBytesResumable` ยังคงอยู่สำหรับ `UploadRow`)

- [ ] **Step 2: Verify app starts without errors**

```
npm run dev
```

Open Admin → Characters tab — sprite upload and "เลือก" browse should still work.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AssetsSection.jsx
git commit -m "refactor: move copyStorageObject to storageOps.js"
```

---

### Task 4: Update `MapDashboard.jsx` — fix hardcoded auto-match

**Files:**
- Modify: `src/components/admin/MapDashboard.jsx`

**Interfaces:**
- Consumes: `listAssetFolders()` from `src/utils/assetFolders.js`

- [ ] **Step 1: Add import at top of `MapDashboard.jsx`**

After the existing imports, add:

```js
import { listAssetFolders } from '../../utils/assetFolders'
```

- [ ] **Step 2: Replace hardcoded folder fetch in `handleValidateAndUpload`**

In `UploadPanel` inside `MapDashboard.jsx`, find `handleValidateAndUpload` (around line 147). Replace the two `listAll` calls and the `storagePaths` construction:

**Before:**
```js
// List Storage tileset paths
const [tilesetsResult, objectsResult] = await Promise.all([
  listAll(ref(storage, 'sprites/tilesets')).catch(() => ({ items: [] })),
  listAll(ref(storage, 'sprites/objects')).catch(() => ({ items: [] })),
])
const storagePaths = [
  ...tilesetsResult.items.map((i) => i.fullPath),
  ...objectsResult.items.map((i) => i.fullPath),
]
```

**After:**
```js
const folders = await listAssetFolders()
const storagePaths = (
  await Promise.all(
    folders.map((f) => listAll(ref(storage, f.path)).catch(() => ({ items: [] }))),
  )
).flatMap((r) => r.items.map((i) => i.fullPath))
```

- [ ] **Step 3: Manual test — upload a map with a tileset in a new folder**

1. In Admin → Maps, click "อัปโหลดแมพใหม่"
2. Upload a `.json` map that references tileset names matching files in `sprites/tilesets/`
3. Verify: no `"Tileset X ยังหา asset ไม่เจอ"` error if the tileset exists in any registered folder

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/MapDashboard.jsx
git commit -m "fix: auto-match scans all registered asset folders, not just tilesets+objects"
```

---

### Task 5: `FolderPickerModal.jsx` — folder picker for "Move to"

**Files:**
- Create: `src/components/admin/FolderPickerModal.jsx`

**Interfaces:**
- Props: `{ excludePath: string, onPick: (folder: {id, path, displayName}) => void, onClose: () => void }`
- Consumes: `listAssetFolders()` from `src/utils/assetFolders.js`

- [ ] **Step 1: Create `FolderPickerModal.jsx`**

```jsx
// src/components/admin/FolderPickerModal.jsx
import { useEffect, useState } from 'react'
import { listAssetFolders } from '../../utils/assetFolders'

export default function FolderPickerModal({ excludePath, onPick, onClose }) {
  const [folders, setFolders] = useState(null)

  useEffect(() => {
    listAssetFolders().then(setFolders).catch(() => setFolders([]))
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xs max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-800 text-sm">ย้ายไป Folder</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="p-3 overflow-y-auto space-y-0.5">
          {folders === null ? (
            <p className="text-gray-400 text-sm animate-pulse px-2">โหลด...</p>
          ) : folders
              .filter((f) => f.path !== excludePath)
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => onPick(f)}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-brand/5 transition-colors"
                >
                  <span>📁</span>
                  <span className="text-sm text-gray-800 flex-1">{f.displayName}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{f.path}</span>
                </button>
              ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify import works (no runtime error)**

No automated test needed here — it will be exercised by `AssetsManagerSection` in Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/FolderPickerModal.jsx
git commit -m "feat: add FolderPickerModal for move-to-folder action"
```

---

### Task 6: `AssetsManagerSection.jsx` — full Asset Manager UI

**Files:**
- Create: `src/components/admin/AssetsManagerSection.jsx`

**Interfaces:**
- Consumes:
  - `listAssetFolders`, `createFolder`, `renameFolder`, `trashFolder`, `seedSystemFolders`, `folderSlug` from `src/utils/assetFolders.js`
  - `moveFile`, `trashFile`, `restoreFile`, `toTrashPath`, `fromTrashPath` from `src/utils/storageOps.js`
  - `cloudAsset`, `bustCache` from `src/utils/cloudAsset.js`
  - `useToast` from `src/components/admin/Toast.jsx`
  - `useAuthStore` from `src/stores/useAuthStore.js`
  - `FolderPickerModal` from `./FolderPickerModal`
  - Firebase: `ref`, `listAll`, `deleteObject`, `uploadBytesResumable` from `firebase/storage`
  - `storage` from `src/firebase.js`

- [ ] **Step 1: Create `AssetsManagerSection.jsx` — utility helper**

```jsx
// src/components/admin/AssetsManagerSection.jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { ref, listAll, deleteObject, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../../firebase'
import { cloudAsset, bustCache } from '../../utils/cloudAsset'
import {
  listAssetFolders, createFolder, renameFolder, trashFolder,
  seedSystemFolders, folderSlug,
} from '../../utils/assetFolders'
import { moveFile, trashFile, restoreFile, fromTrashPath } from '../../utils/storageOps'
import FolderPickerModal from './FolderPickerModal'
import { useToast } from './Toast'
import { useAuthStore } from '../../stores/useAuthStore'

async function listAllRecursive(storageRef) {
  const result = await listAll(storageRef)
  const files = result.items.map((i) => i.fullPath)
  const sub = await Promise.all(result.prefixes.map((p) => listAllRecursive(p)))
  return [...files, ...sub.flat()]
}
```

- [ ] **Step 2: Add `FolderSidebar` component**

Append to `AssetsManagerSection.jsx`:

```jsx
function FolderSidebar({ folders, selectedPath, onSelect, onRenameFolder, onDeleteFolder, trashCount }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName]   = useState('')

  function startEdit(folder) {
    setEditingId(folder.id)
    setEditName(folder.displayName)
  }

  async function commitEdit(folder) {
    const trimmed = editName.trim()
    setEditingId(null)
    if (!trimmed || trimmed === folder.displayName) return
    await onRenameFolder(folder, trimmed)
  }

  return (
    <div className="w-48 shrink-0 border-r border-gray-100 pr-3 space-y-0.5">
      {folders.map((f) => (
        <div
          key={f.id}
          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer ${
            selectedPath === f.path
              ? 'bg-brand/10 text-brand'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
          onClick={() => onSelect(f.path)}
        >
          <span className="text-sm leading-none">📁</span>

          {editingId === f.id ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => commitEdit(f)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(f)
                if (e.key === 'Escape') setEditingId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 text-xs border border-brand rounded px-1 py-0.5 outline-none"
            />
          ) : (
            <span className="flex-1 min-w-0 text-xs truncate">{f.displayName}</span>
          )}

          {f.isSystem && (
            <span className="text-[9px] text-gray-400 shrink-0">sys</span>
          )}

          {!f.isSystem && editingId !== f.id && (
            <div
              className="hidden group-hover:flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => startEdit(f)}
                className="text-gray-400 hover:text-brand text-xs leading-none"
                title="Rename"
              >✏</button>
              <button
                onClick={() => onDeleteFolder(f)}
                className="text-gray-400 hover:text-red-500 text-xs leading-none"
                title="Delete"
              >🗑</button>
            </div>
          )}
        </div>
      ))}

      <div className="border-t border-gray-100 mt-2 pt-2">
        <div
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer ${
            selectedPath === '__trash__'
              ? 'bg-red-50 text-red-600'
              : 'hover:bg-gray-50 text-gray-500'
          }`}
          onClick={() => onSelect('__trash__')}
        >
          <span className="text-sm leading-none">🗑</span>
          <span className="flex-1 text-xs">Trash</span>
          {trashCount > 0 && (
            <span className="text-[9px] bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 font-semibold">
              {trashCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add `FileCard` component**

Append to `AssetsManagerSection.jsx`:

```jsx
function FileCard({ path, onRename, onMove, onDelete }) {
  const [thumbUrl, setThumbUrl] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(path)
  const name    = path.split('/').pop()

  useEffect(() => {
    if (!isImage) return
    cloudAsset(path, { fallback: null }).then((url) => { if (url) setThumbUrl(url) })
  }, [path, isImage])

  return (
    <div className="relative flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
      {isImage && thumbUrl ? (
        <img
          src={thumbUrl}
          alt={name}
          className="h-14 w-14 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <div className="h-14 w-14 flex items-center justify-center text-gray-300 text-xs font-mono">
          {/\.json$/i.test(path) ? 'JSON' : '—'}
        </div>
      )}
      <span className="text-[10px] text-gray-600 break-all w-full text-center leading-tight">
        {name}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-sm leading-none px-1"
      >···</button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-7 right-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[100px]">
            <button
              onClick={() => { setMenuOpen(false); onRename(path) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
            >✏ Rename</button>
            <button
              onClick={() => { setMenuOpen(false); onMove(path) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
            >📂 Move to</button>
            <button
              onClick={() => { setMenuOpen(false); onDelete(path) }}
              className="block w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >🗑 Delete</button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add `FileGrid` component**

Append to `AssetsManagerSection.jsx`:

```jsx
function FileGrid({ folderPath, onFilesChanged }) {
  const [files, setFiles]           = useState(null)
  const [renamingPath, setRenamingPath] = useState(null)
  const [newName, setNewName]       = useState('')
  const [movingPath, setMovingPath] = useState(null)
  const [busy, setBusy]             = useState(false)
  const uploadRef = useRef(null)
  const toast = useToast()
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadFiles = useCallback(async () => {
    setFiles(null)
    try {
      const result = await listAll(ref(storage, folderPath))
      if (mountedRef.current) setFiles(result.items.map((i) => i.fullPath))
    } catch {
      if (mountedRef.current) setFiles([])
    }
  }, [folderPath])

  useEffect(() => { loadFiles() }, [loadFiles])

  function handleUpload(file) {
    if (!file) return
    const dest = `${folderPath}/${file.name}`
    const task = uploadBytesResumable(ref(storage, dest), file)
    task.on(
      'state_changed',
      null,
      (err) => toast?.error(err.message),
      () => { bustCache(dest); loadFiles(); onFilesChanged?.() },
    )
  }

  async function handleRenameConfirm() {
    if (!renamingPath || !newName.trim()) { setRenamingPath(null); return }
    const folder = renamingPath.split('/').slice(0, -1).join('/')
    const dest   = `${folder}/${newName.trim()}`
    if (dest === renamingPath) { setRenamingPath(null); return }
    setBusy(true)
    try {
      await moveFile(renamingPath, dest)
      bustCache(renamingPath)
      bustCache(dest)
      toast?.success('เปลี่ยนชื่อแล้ว')
      loadFiles()
    } catch (err) {
      toast?.error(err.message || 'เปลี่ยนชื่อไม่สำเร็จ')
    } finally {
      setBusy(false)
      setRenamingPath(null)
    }
  }

  async function handleMove(path, targetFolder) {
    const filename = path.split('/').pop()
    const dest     = `${targetFolder.path}/${filename}`
    setBusy(true)
    setMovingPath(null)
    try {
      await moveFile(path, dest)
      bustCache(path)
      bustCache(dest)
      toast?.success(`ย้ายไป ${targetFolder.displayName} แล้ว`)
      loadFiles()
      onFilesChanged?.()
    } catch (err) {
      toast?.error(err.message || 'ย้ายไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(path) {
    setBusy(true)
    try {
      await trashFile(path)
      bustCache(path)
      toast?.success('ย้ายไป Trash แล้ว')
      loadFiles()
      onFilesChanged?.()
    } catch (err) {
      toast?.error(err.message || 'ลบไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <label className="px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-strong cursor-pointer">
          ⬆ Upload
          <input
            ref={uploadRef}
            type="file"
            accept=".png,.jpg,.jpeg,.gif,.webp,.json"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </label>
        <span className="text-xs text-gray-400 font-mono">{folderPath}/</span>
      </div>

      {files === null ? (
        <p className="text-gray-400 text-sm animate-pulse">โหลด...</p>
      ) : files.length === 0 ? (
        <p className="text-gray-400 text-sm">ยังไม่มีไฟล์ — อัปโหลดได้เลย</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map((path) => (
            <FileCard
              key={path}
              path={path}
              onRename={(p) => { setRenamingPath(p); setNewName(p.split('/').pop()) }}
              onMove={(p) => setMovingPath(p)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {renamingPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-xs space-y-3">
            <p className="font-semibold text-gray-800 text-sm">เปลี่ยนชื่อไฟล์</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameConfirm()
                if (e.key === 'Escape') setRenamingPath(null)
              }}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRenameConfirm}
                disabled={busy}
                className="flex-1 px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold disabled:opacity-50"
              >บันทึก</button>
              <button
                onClick={() => setRenamingPath(null)}
                disabled={busy}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs"
              >ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {movingPath && (
        <FolderPickerModal
          excludePath={folderPath}
          onPick={(targetFolder) => handleMove(movingPath, targetFolder)}
          onClose={() => setMovingPath(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add `TrashView` component**

Append to `AssetsManagerSection.jsx`:

```jsx
function TrashView({ onFilesChanged, onTrashCountChange }) {
  const [files, setFiles]           = useState(null)
  const [clearing, setClearing]     = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const toast = useToast()
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadTrash = useCallback(async () => {
    setFiles(null)
    try {
      const all = await listAllRecursive(ref(storage, 'trash'))
      if (mountedRef.current) {
        setFiles(all)
        onTrashCountChange?.(all.length)
      }
    } catch {
      if (mountedRef.current) setFiles([])
    }
  }, [onTrashCountChange])

  useEffect(() => { loadTrash() }, [loadTrash])

  async function handleRestore(trashPath) {
    try {
      await restoreFile(trashPath)
      bustCache(fromTrashPath(trashPath))
      toast?.success('กู้คืนแล้ว')
      loadTrash()
      onFilesChanged?.()
    } catch (err) {
      toast?.error(err.message || 'กู้คืนไม่สำเร็จ')
    }
  }

  async function handlePermanentDelete(trashPath) {
    try {
      await deleteObject(ref(storage, trashPath))
      toast?.success('ลบถาวรแล้ว')
      loadTrash()
    } catch (err) {
      toast?.error(err.message || 'ลบไม่สำเร็จ')
    }
  }

  async function handleClearAll() {
    setClearing(true)
    setConfirmClear(false)
    try {
      await Promise.all((files ?? []).map((p) => deleteObject(ref(storage, p)).catch(() => {})))
      toast?.success('ล้าง Trash แล้ว')
      loadTrash()
      onFilesChanged?.()
    } catch (err) {
      toast?.error(err.message || 'ล้างไม่สำเร็จ')
    } finally {
      if (mountedRef.current) setClearing(false)
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-gray-700">Trash</span>
        {files !== null && files.length > 0 && (
          confirmClear ? (
            <>
              <span className="text-xs text-red-600">ลบถาวร {files.length} ไฟล์?</span>
              <button onClick={handleClearAll} disabled={clearing}
                className="px-3 py-1 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50">
                {clearing ? 'กำลังลบ...' : 'ยืนยัน'}
              </button>
              <button onClick={() => setConfirmClear(false)}
                className="px-3 py-1 rounded-xl border border-gray-200 text-gray-600 text-xs">
                ยกเลิก
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmClear(true)}
              className="px-3 py-1 rounded-xl border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50">
              ล้าง Trash ทั้งหมด
            </button>
          )
        )}
      </div>

      {files === null ? (
        <p className="text-gray-400 text-sm animate-pulse">โหลด...</p>
      ) : files.length === 0 ? (
        <p className="text-gray-400 text-sm">Trash ว่างเปล่า</p>
      ) : (
        <div className="space-y-2">
          {files.map((trashPath) => {
            const original = fromTrashPath(trashPath)
            const name     = trashPath.split('/').pop()
            return (
              <div key={trashPath} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm">
                <span className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate">→ {original}</p>
                </span>
                <button onClick={() => handleRestore(trashPath)}
                  className="px-2.5 py-1 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-strong">
                  Restore
                </button>
                <button onClick={() => handlePermanentDelete(trashPath)}
                  className="px-2.5 py-1 rounded-lg border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50">
                  ลบถาวร
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Add main `AssetsManagerSection` component**

Append to `AssetsManagerSection.jsx`:

```jsx
export default function AssetsManagerSection() {
  const [folders, setFolders]           = useState([])
  const [selectedPath, setSelectedPath] = useState(null)
  const [trashCount, setTrashCount]     = useState(0)
  const [showCreate, setShowCreate]     = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)   // folder awaiting confirm
  const [deleteFileCount, setDeleteFileCount] = useState(0)
  const [deletingId, setDeletingId]     = useState(null)
  const [renameProgress, setRenameProgress] = useState(null) // "กำลังย้ายไฟล์ 2/5..."
  const toast = useToast()
  const uid = useAuthStore((s) => s.user?.uid)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadFolders = useCallback(async () => {
    try {
      await seedSystemFolders(uid)
      const list = await listAssetFolders()
      if (!mountedRef.current) return
      setFolders(list)
      setSelectedPath((prev) => prev ?? list[0]?.path ?? null)
    } catch {
      toast?.error('โหลด folders ไม่สำเร็จ')
    }
  }, [uid, toast])

  useEffect(() => { loadFolders() }, [loadFolders])

  async function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) return
    try {
      await createFolder(name, folders.map((f) => f.path), uid)
      setNewFolderName('')
      setShowCreate(false)
      await loadFolders()
    } catch (err) {
      toast?.error(err.message || 'สร้าง folder ไม่สำเร็จ')
    }
  }

  async function handleRenameFolder(folder, newDisplayName) {
    const slug    = folderSlug(newDisplayName)
    const newPath = `sprites/${slug}`
    if (folders.some((f) => f.path === newPath && f.id !== folder.id)) {
      toast?.error(`"${newPath}" ซ้ำกับ folder ที่มีอยู่แล้ว`)
      return
    }
    try {
      await renameFolder(folder.id, newDisplayName, newPath, uid)
      await loadFolders()

      const result = await listAll(ref(storage, folder.path)).catch(() => ({ items: [] }))
      const items  = result.items
      for (let i = 0; i < items.length; i++) {
        setRenameProgress(`กำลังย้ายไฟล์ ${i + 1}/${items.length}...`)
        const oldFile = items[i].fullPath
        const newFile = `${newPath}/${oldFile.split('/').pop()}`
        await moveFile(oldFile, newFile)
        bustCache(oldFile)
        bustCache(newFile)
      }
      setRenameProgress(null)
      setSelectedPath(newPath)
      toast?.success('เปลี่ยนชื่อ folder แล้ว')
    } catch (err) {
      setRenameProgress(null)
      toast?.error(err.message || 'เปลี่ยนชื่อไม่สำเร็จ')
    }
  }

  async function initiateDeleteFolder(folder) {
    const result = await listAll(ref(storage, folder.path)).catch(() => ({ items: [] }))
    setDeleteFileCount(result.items.length)
    setDeleteTarget(folder)
  }

  async function handleDeleteFolder() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setDeleteTarget(null)
    try {
      const result = await listAll(ref(storage, deleteTarget.path)).catch(() => ({ items: [] }))
      await Promise.all(result.items.map((item) => trashFile(item.fullPath).catch(() => {})))
      await trashFolder(deleteTarget.id, uid)
      toast?.success(`ย้าย folder "${deleteTarget.displayName}" ไป Trash แล้ว`)
      if (selectedPath === deleteTarget.path) setSelectedPath(null)
      await loadFolders()
    } catch (err) {
      toast?.error(err.message || 'ลบ folder ไม่สำเร็จ')
    } finally {
      if (mountedRef.current) setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Assets</h3>
        {showCreate ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') { setShowCreate(false); setNewFolderName('') }
              }}
              placeholder="ชื่อ folder ใหม่"
              className="px-2 py-1 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <button onClick={handleCreateFolder}
              className="px-3 py-1 rounded-xl bg-brand text-white text-xs font-semibold">สร้าง</button>
            <button onClick={() => { setShowCreate(false); setNewFolderName('') }}
              className="px-3 py-1 rounded-xl border border-gray-200 text-gray-600 text-xs">ยกเลิก</button>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-strong">
            + สร้าง Folder
          </button>
        )}
      </div>

      {renameProgress && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-brand/10 text-brand text-xs font-semibold">
          {renameProgress}
        </div>
      )}

      <div className="flex gap-4">
        <FolderSidebar
          folders={folders}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={initiateDeleteFolder}
          trashCount={trashCount}
        />

        <div className="flex-1 min-w-0">
          {selectedPath === '__trash__' ? (
            <TrashView
              onFilesChanged={loadFolders}
              onTrashCountChange={setTrashCount}
            />
          ) : selectedPath ? (
            <FileGrid
              key={selectedPath}
              folderPath={selectedPath}
              onFilesChanged={loadFolders}
            />
          ) : (
            <p className="text-gray-400 text-sm">เลือก folder จากซ้าย</p>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm space-y-3">
            <p className="font-semibold text-gray-800 text-sm">ลบ Folder "{deleteTarget.displayName}"?</p>
            <p className="text-xs text-gray-600">
              {deleteFileCount > 0
                ? `ไฟล์ ${deleteFileCount} ไฟล์จะถูกย้ายไป Trash`
                : 'Folder นี้ว่างเปล่า'}
            </p>
            <div className="flex gap-2">
              <button onClick={handleDeleteFolder}
                className="flex-1 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700">
                ยืนยัน
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Manual smoke test**

```
npm run dev
```

Open Admin → Assets tab (will be added in Task 7). Verify:
- Folder sidebar shows Tilesets, Objects (seeded on first visit)
- Upload a `.png` to Tilesets → appears in grid
- `···` menu on file → Rename, Move to, Delete work
- Delete moves to Trash → Trash shows file → Restore brings it back
- "ล้าง Trash ทั้งหมด" permanently deletes

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/AssetsManagerSection.jsx
git commit -m "feat: add AssetsManagerSection with folder/file CRUD and trash"
```

---

### Task 7: Wire up `AdminPage.jsx` and `admin.js`

**Files:**
- Modify: `src/constants/admin.js`
- Modify: `src/pages/AdminPage.jsx`

**Interfaces:**
- Consumes: `AssetsManagerSection` (default export) from `src/components/admin/AssetsManagerSection.jsx`

- [ ] **Step 1: Update `src/constants/admin.js`**

```js
export const ADMIN_EMAIL = 'o.korawitt@gmail.com'
export const ADMIN_UID = 'IaltEhO0mPVfK3ng8npr4CdqnEE3'
export const ADMIN_DISPLAY_NAME = 'ผู้พัฒนาระบบ'

export const ADMIN_SECTIONS = ['analytics', 'users', 'characters', 'maps', 'assets', 'music', 'shop', 'finance', 'welcome']

export const ADMIN_ROLES = {
  'o.korawitt@gmail.com': ['analytics', 'users', 'characters', 'maps', 'assets', 'music', 'shop', 'finance', 'welcome'],
  'takadaoni07@gmail.com': ['maps', 'assets'],
  'play198725@gmail.com': ['characters'],
  'itcity9476@gmail.com': ['music'],
}

export function getAdminSections(email) {
  if (!email) return []
  return ADMIN_ROLES[email.toLowerCase()] ?? []
}
```

- [ ] **Step 2: Update `src/pages/AdminPage.jsx`**

Add import after the existing admin imports:

```js
import AssetsManagerSection from '../components/admin/AssetsManagerSection'
```

Add `{ id: 'assets', label: 'Assets' }` to `ALL_TABS` between `maps` and `music`:

```js
const ALL_TABS = [
  { id: 'analytics',  label: 'Analytics' },
  { id: 'users',      label: 'Users' },
  { id: 'characters', label: 'Characters' },
  { id: 'maps',       label: 'Maps' },
  { id: 'assets',     label: 'Assets' },
  { id: 'music',      label: 'Music' },
  { id: 'shop',       label: 'Shop' },
  { id: 'finance',    label: 'Finance' },
  { id: 'welcome',    label: 'Welcome' },
]
```

Add render in `<main>`:

```jsx
{tab === 'assets'     && <AssetsManagerSection />}
```

(place after `{tab === 'maps' && <MapsPanel />}`)

- [ ] **Step 3: Manual end-to-end test**

```
npm run dev
```

1. Open Admin → verify "Assets" tab appears
2. Click Assets → Tilesets and Objects appear in sidebar (seeded from Firestore)
3. Create new folder → appears in sidebar
4. Upload a file → appears in grid
5. Rename file → name changes
6. Move file to different folder → disappears from source, appears in target
7. Delete file → moves to Trash
8. Open Trash → file visible, Restore works
9. Open Admin → Maps → Upload new map → if all tilesets exist across registered folders, upload succeeds

- [ ] **Step 4: Commit**

```bash
git add src/constants/admin.js src/pages/AdminPage.jsx
git commit -m "feat: wire Assets tab into AdminPage and admin role config"
```
