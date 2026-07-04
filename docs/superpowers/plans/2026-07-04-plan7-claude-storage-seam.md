# Architecture Improvement — Plan 7: Storage Write/List Seam (Claude Code)

**Goal:** Extend `src/utils/storageOps.js` with `listAllRecursive`, `listFlat`, `deleteFile`, `uploadWithProgress`, `uploadAsset` — closing the gap where `cloudAsset.js` only covers cached reads and `storageOps.js` only covers move/trash/restore/copy, while 14 files do raw `ref(storage,...)`/`uploadBytes`/`listAll`/`getDownloadURL`/`deleteObject` inline. This plan builds the seam and repoints the one plain-`.js` consumer (`useShopStore.js`); Plan 8 repoints the 13 `.jsx` consumers (Cursor's job).

**Architecture:** Five new functions in `storageOps.js`, each replacing a duplicated pattern found across multiple files:
- `listAllRecursive(path)` — replaces 2 duplicate recursive-list helpers (`UpdateAssetsSection.jsx`'s `listAllFiles`, `AssetsManagerSection.jsx`'s `listAllRecursive`)
- `listFlat(path)` — replaces ~7 duplicate `listAll(ref(storage,X)).catch(() => ({items:[]}))` call sites
- `deleteFile(path)` — first shared wrapper for permanent delete (currently raw `deleteObject` in 2 files)
- `uploadWithProgress(path, file, opts)` — replaces 5 duplicate `uploadBytesResumable(...).on('state_changed', ...)` blocks, returns a Promise resolving to the download URL, calls `bustCache` on success
- `uploadAsset(path, file, opts)` — replaces 2 duplicate "upload then immediately getDownloadURL" blocks (simple, non-resumable)

All return plain data (`{ path, ref }` objects for listing, not raw Firebase `ListResult`), so callers don't need Storage SDK shape knowledge.

**Tech Stack:** Firebase Storage SDK 12, Vitest.

## Global Constraints

- **No TypeScript** — plain JS only.
- Don't touch any `.jsx` file in this plan — that's Plan 8, Cursor's job.
- Preserve exact existing behavior of `toTrashPath`/`fromTrashPath`/`copyStorageObject`/`moveFile`/`trashFile`/`restoreFile` — additive only.
- Verify with `npm test` after each function; full suite + `npm run build` at the end.

---

### Task 1: Add `listAllRecursive`, `listFlat`, `deleteFile` to `storageOps.js`

**Files:**
- Modify: `src/utils/storageOps.js`
- Modify: `src/utils/storageOps.test.js`

**Interfaces:**
- Produces: `listAllRecursive(path): Promise<Array<{path: string, ref: StorageReference}>>`, `listFlat(path): Promise<Array<{path: string, ref: StorageReference}>>` (returns `[]` on error, never throws), `deleteFile(path): Promise<void>` (swallows "not found" errors, matching `MapDashboard.jsx`'s existing `.catch(() => {})` pattern).

- [ ] **Step 1: Write the failing tests** — append to `src/utils/storageOps.test.js` (update the mock block first — add `listAll`):

```js
vi.mock('firebase/storage', () => ({
  ref: (_s, p) => ({ path: p }),
  getDownloadURL: vi.fn(),
  uploadBytes: vi.fn(),
  uploadBytesResumable: vi.fn(),
  deleteObject: vi.fn(),
  listAll: vi.fn(),
}))
```
(replaces the existing mock block at lines 4-9 — adds `uploadBytesResumable` and `listAll` for this task + Task 2)

```js
import { listAllRecursive, listFlat, deleteFile } from './storageOps'
const { listAll, deleteObject } = await import('firebase/storage')

describe('listFlat', () => {
  it('returns { path, ref } for each item in a folder', async () => {
    listAll.mockResolvedValueOnce({
      items: [{ fullPath: 'rc/tilesets/Grass.png' }, { fullPath: 'rc/tilesets/Water.png' }],
      prefixes: [],
    })
    const result = await listFlat('rc/tilesets')
    expect(result).toEqual([
      { path: 'rc/tilesets/Grass.png', ref: { fullPath: 'rc/tilesets/Grass.png' } },
      { path: 'rc/tilesets/Water.png', ref: { fullPath: 'rc/tilesets/Water.png' } },
    ])
  })

  it('returns [] when listAll rejects', async () => {
    listAll.mockRejectedValueOnce(new Error('storage/unauthorized'))
    expect(await listFlat('missing/folder')).toEqual([])
  })
})

describe('listAllRecursive', () => {
  it('walks nested prefixes and flattens all items', async () => {
    listAll
      .mockResolvedValueOnce({
        items: [{ fullPath: 'trash/a.png' }],
        prefixes: [{ fullPath: 'trash/sub' }],
      })
      .mockResolvedValueOnce({
        items: [{ fullPath: 'trash/sub/b.png' }],
        prefixes: [],
      })
    const result = await listAllRecursive('trash')
    expect(result.map((r) => r.path)).toEqual(['trash/a.png', 'trash/sub/b.png'])
  })
})

describe('deleteFile', () => {
  it('deletes the object', async () => {
    deleteObject.mockResolvedValueOnce()
    await deleteFile('rc/tilesets/Old.png')
    expect(deleteObject).toHaveBeenCalledWith({ path: 'rc/tilesets/Old.png' })
  })

  it('swallows a not-found error', async () => {
    deleteObject.mockRejectedValueOnce(new Error('storage/object-not-found'))
    await expect(deleteFile('gone.png')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/storageOps.test.js`
Expected: FAIL — `listAllRecursive`/`listFlat`/`deleteFile` not exported

- [ ] **Step 3: Implement** — add to `src/utils/storageOps.js` (update the top import to add `listAll`):

```js
import { ref, getDownloadURL, deleteObject, uploadBytes, uploadBytesResumable, listAll } from 'firebase/storage'
```

Append after `restoreFile`:

```js
// Non-recursive folder listing. Returns [] on any error (missing folder,
// rules) instead of throwing, matching the .catch(() => ({items:[]})) pattern
// every caller used to write by hand.
export async function listFlat(path) {
  try {
    const result = await listAll(ref(storage, path))
    return result.items.map((item) => ({ path: item.fullPath, ref: item }))
  } catch {
    return []
  }
}

// Recursive folder listing — walks all nested prefixes and flattens the
// result. Used by the Assets Manager's "trash" browser and the Sprout Lands
// asset sync, which both previously reimplemented this walk locally.
export async function listAllRecursive(path) {
  async function walk(storageRef) {
    const result = await listAll(storageRef)
    const files = result.items.map((item) => ({ path: item.fullPath, ref: item }))
    const nested = await Promise.all(result.prefixes.map(walk))
    return [...files, ...nested.flat()]
  }
  return walk(ref(storage, path))
}

// Permanent delete. Swallows errors (e.g. object already gone) so callers
// don't need their own try/catch for the common "best-effort cleanup" case.
export async function deleteFile(path) {
  await deleteObject(ref(storage, path)).catch(() => {})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/storageOps.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/storageOps.js src/utils/storageOps.test.js
git commit -m "feat(storage-seam): add listAllRecursive/listFlat/deleteFile to storageOps"
```

---

### Task 2: Add `uploadWithProgress` and `uploadAsset` to `storageOps.js`

**Files:**
- Modify: `src/utils/storageOps.js`
- Modify: `src/utils/storageOps.test.js`

**Interfaces:**
- Produces: `uploadWithProgress(path, file, { contentType, onProgress }): Promise<string>` (resolves to the download URL, calls `bustCache(path)` before resolving), `uploadAsset(path, file, { contentType }): Promise<string>` (simple non-resumable upload, also busts cache).
- Consumes: `bustCache` from `./cloudAsset` (existing, `src/utils/cloudAsset.js:59`).

- [ ] **Step 1: Write the failing tests** — add to `src/utils/storageOps.test.js`. First add a `bustCache` mock:

```js
vi.mock('./cloudAsset', () => ({ bustCache: vi.fn() }))
```

```js
import { uploadWithProgress, uploadAsset } from './storageOps'
const { uploadBytesResumable, uploadBytes } = await import('firebase/storage')
const { bustCache } = await import('./cloudAsset')

describe('uploadWithProgress', () => {
  it('reports progress, busts the cache, and resolves the download URL', async () => {
    const fakeSnapshot = { ref: { path: 'rc/tilesets/New.png' } }
    let successCb
    uploadBytesResumable.mockReturnValueOnce({
      on: (_event, progressCb, _errCb, doneCb) => {
        progressCb({ bytesTransferred: 50, totalBytes: 100 })
        successCb = doneCb
      },
      snapshot: fakeSnapshot,
    })
    getDownloadURL.mockResolvedValueOnce('https://cdn/new.png')

    const onProgress = vi.fn()
    const promise = uploadWithProgress('rc/tilesets/New.png', new Blob(), { onProgress })
    successCb()
    const url = await promise

    expect(onProgress).toHaveBeenCalledWith(50)
    expect(bustCache).toHaveBeenCalledWith('rc/tilesets/New.png')
    expect(url).toBe('https://cdn/new.png')
  })

  it('rejects when the upload errors', async () => {
    uploadBytesResumable.mockReturnValueOnce({
      on: (_event, _progressCb, errCb) => errCb(new Error('upload failed')),
    })
    await expect(uploadWithProgress('x.png', new Blob())).rejects.toThrow('upload failed')
  })
})

describe('uploadAsset', () => {
  it('uploads then resolves the download URL, busting the cache', async () => {
    uploadBytes.mockResolvedValueOnce()
    getDownloadURL.mockResolvedValueOnce('https://cdn/x.png')
    const url = await uploadAsset('welcome/hero/1-x.png', new Blob(), { contentType: 'image/png' })
    expect(uploadBytes).toHaveBeenCalled()
    expect(bustCache).toHaveBeenCalledWith('welcome/hero/1-x.png')
    expect(url).toBe('https://cdn/x.png')
  })
})
```
Add `const { getDownloadURL } = await import('firebase/storage')` alongside the other dynamic imports if not already destructured at file scope (check the existing test file's import style at the top and match it — `getDownloadURL` is already a named mock export, just needs to be in scope for `.mockResolvedValueOnce`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/storageOps.test.js`
Expected: FAIL — `uploadWithProgress`/`uploadAsset` not exported

- [ ] **Step 3: Implement** — add to `src/utils/storageOps.js`. Update the top import:

```js
import { ref, getDownloadURL, deleteObject, uploadBytes, uploadBytesResumable, listAll } from 'firebase/storage'
import { storage } from '../firebase'
import { bustCache } from './cloudAsset'
```

Append:

```js
// Resumable upload with progress reporting — the pattern duplicated across
// every admin upload UI (tileset/character/map-JSON/audio uploads). Resolves
// to the final download URL and busts the cloudAsset cache for `path` so the
// next read reflects the new file.
export function uploadWithProgress(path, file, { contentType, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), file, contentType ? { contentType } : undefined)
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        bustCache(path)
        resolve(await getDownloadURL(task.snapshot.ref))
      },
    )
  })
}

// Simple (non-resumable) upload for small files where progress reporting
// isn't needed — uploads then immediately resolves the download URL, busting
// the cache.
export async function uploadAsset(path, file, { contentType } = {}) {
  await uploadBytes(ref(storage, path), file, contentType ? { contentType } : undefined)
  bustCache(path)
  return getDownloadURL(ref(storage, path))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/storageOps.test.js`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: all green, output pristine

- [ ] **Step 6: Commit**

```bash
git add src/utils/storageOps.js src/utils/storageOps.test.js
git commit -m "feat(storage-seam): add uploadWithProgress/uploadAsset to storageOps"
```

---

### Task 3: Repoint `src/stores/useShopStore.js` (the one plain-`.js` consumer)

**Files:** Modify `src/stores/useShopStore.js`

- [ ] **Step 1:** Current code (around line 42-49):
```js
  verifyPayment: async (purchaseId, file) => {
    const uid = auth.currentUser?.uid
    if (!uid) throw new Error('not signed in')
    await uploadBytes(storageRef(storage, `slips/${uid}/${purchaseId}`), file)
    const fn = httpsCallable(functions, 'verifyPayment')
    const res = await fn({ purchaseId })
    return res.data
  },
```
Replace with:
```js
  verifyPayment: async (purchaseId, file) => {
    const uid = auth.currentUser?.uid
    if (!uid) throw new Error('not signed in')
    await uploadAsset(`slips/${uid}/${purchaseId}`, file)
    const fn = httpsCallable(functions, 'verifyPayment')
    const res = await fn({ purchaseId })
    return res.data
  },
```
Note: this drops the `getDownloadURL` step `uploadAsset` normally does internally — the payment slip's URL is never read back by the client (server reads it directly via Cloud Function), so the extra `getDownloadURL` call `uploadAsset` performs is a small unnecessary round-trip here. Accept it for consistency with the shared helper; do not special-case this one call site with a bespoke upload-only variant.

- [ ] **Step 2:** Update imports — replace:
```js
import { ref as storageRef, uploadBytes } from 'firebase/storage'
import { auth, functions, storage } from '../firebase'
```
with:
```js
import { auth, functions } from '../firebase'
import { uploadAsset } from '../utils/storageOps'
```
(confirm `storageRef`/`uploadBytes`/`storage` have no other use in the file before trimming — `storage` import stays only if used elsewhere in the file; check first.)

- [ ] **Step 3:** `npm test` → PASS. If a test file exists for `useShopStore.js`, run it specifically first: `npx vitest run src/stores/useShopStore.test.js` (check if it exists; if not, the full suite run is sufficient).

- [ ] **Step 4: Commit**

```bash
git add src/stores/useShopStore.js
git commit -m "refactor(seam): repoint useShopStore.verifyPayment through storageOps.uploadAsset"
```

---

## Handoff

Plan 8 (`docs/superpowers/plans/2026-07-04-plan8-cursor-storage-seam-jsx.md`) repoints the 13 `.jsx` files that do raw Storage calls — hand that to Cursor once this plan's 3 tasks are committed.
