# Architecture Improvement — Plan 8: Storage Seam JSX Repoint (Cursor)

> **Prerequisite:** Plan 7 (`2026-07-04-plan7-claude-storage-seam.md`) must be done first — it adds `listAllRecursive`, `listFlat`, `deleteFile`, `uploadWithProgress`, `uploadAsset` to `src/utils/storageOps.js`. Confirm these exist before starting.

**Goal:** Repoint the 13 remaining `.jsx` files that call `ref(storage,...)`/`uploadBytes`/`uploadBytesResumable`/`listAll`/`getDownloadURL`/`deleteObject` directly, onto the new `storageOps.js` seam functions and the existing `cloudAsset.js`. Each task is independent — different files, any order, one commit per task.

**Architecture:** Pure call-site repoint, no new modules. Reference:
- `cloudAsset(path, { fallback })` — cached download URL read (existing)
- `bustCache(path)` — invalidate a cached URL (existing)
- `listFlat(path): Promise<Array<{path, ref}>>` — flat folder listing, `[]` on error (new)
- `listAllRecursive(path): Promise<Array<{path, ref}>>` — recursive folder listing (new)
- `deleteFile(path): Promise<void>` — permanent delete, swallows not-found (new)
- `uploadWithProgress(path, file, { contentType, onProgress }): Promise<url>` — resumable upload (new)
- `uploadAsset(path, file, { contentType }): Promise<url>` — simple upload (new)

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- Don't touch any JSX markup/layout — only the Storage call sites and their imports.
- Only touch the exact sites named per task — don't refactor surrounding logic.
- Verify with `npm test` after each file; `npm run build` + manual admin-dashboard smoke test once at the end (these are all admin-only upload/browse flows — hard to unit-test meaningfully, so manual verification matters here).

---

### Task 1: `src/components/ItemSprite.jsx` — dedupe hardcoded fallback

**Files:** Modify `src/components/ItemSprite.jsx`

- [ ] **Step 1:** Current code (around lines 2-3, 17-22):
```js
import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
...
    getDownloadURL(ref(storage, 'rc/objects/Basic_Plants.png'))
      .then((url) => { _cachedUrl = url; setImgUrl(url) })
      .catch(() => {
        _cachedUrl = '/assets/sprites/Objects/Basic_Plants.png'
        setImgUrl(_cachedUrl)
      })
```
Replace with:
```js
import { cloudAsset } from '../utils/cloudAsset'
...
    cloudAsset('rc/objects/Basic_Plants.png', { fallback: '/assets/sprites/Objects/Basic_Plants.png' })
      .then((url) => { _cachedUrl = url; setImgUrl(url) })
```
(`cloudAsset` already caches — the module-level `_cachedUrl` variable in this file was duplicating that; check whether `_cachedUrl` is read anywhere else in the file. If it's only ever written here and read once more locally, it's fine to leave as-is for now — don't remove it unless it's trivially safe; this task's scope is just the fetch call, not the caching variable.)

- [ ] **Step 2:** `npm test` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "refactor(storage-seam): repoint ItemSprite through cloudAsset"`

---

### Task 2: `src/components/admin/FarmPlantsTab.jsx` — same dedupe

**Files:** Modify `src/components/admin/FarmPlantsTab.jsx`

- [ ] **Step 1:** Current code (around lines 4-5, 67-69):
```js
import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase'
...
    getDownloadURL(ref(storage, 'rc/objects/Basic_Plants.png'))
      .then(setImgUrl)
      .catch(() => setImgUrl('/assets/sprites/Objects/Basic_Plants.png'))
```
Replace with:
```js
import { cloudAsset } from '../../utils/cloudAsset'
...
    cloudAsset('rc/objects/Basic_Plants.png', { fallback: '/assets/sprites/Objects/Basic_Plants.png' }).then(setImgUrl)
```
Remove the `ref`/`getDownloadURL`/`storage` imports if unused elsewhere in the file (confirm first).

- [ ] **Step 2:** `npm test` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "refactor(storage-seam): repoint FarmPlantsTab through cloudAsset"`

---

### Task 3: `src/components/admin/FarmItemsTab.jsx` — same dedupe

**Files:** Modify `src/components/admin/FarmItemsTab.jsx`

- [ ] **Step 1:** Current code (around lines 4-5, 61-63) — identical pattern to Task 2:
```js
import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase'
...
    getDownloadURL(ref(storage, 'rc/objects/Basic_Plants.png'))
      .then(setImgUrl)
      .catch(() => setImgUrl('/assets/sprites/Objects/Basic_Plants.png'))
```
Replace with:
```js
import { cloudAsset } from '../../utils/cloudAsset'
...
    cloudAsset('rc/objects/Basic_Plants.png', { fallback: '/assets/sprites/Objects/Basic_Plants.png' }).then(setImgUrl)
```

- [ ] **Step 2:** `npm test` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "refactor(storage-seam): repoint FarmItemsTab through cloudAsset"`

---

### Task 4: `src/components/admin/WelcomeSection.jsx` — upload-then-read

**Files:** Modify `src/components/admin/WelcomeSection.jsx`

- [ ] **Step 1:** Current code (around lines 5-6, 10-14):
```js
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase'
...
async function uploadWelcomeMedia(file, kind) {
  const path = `welcome/${kind}/${Date.now()}-${file.name}`
  await uploadBytes(storageRef(storage, path), file, { contentType: file.type || 'image/png' })
  return getDownloadURL(storageRef(storage, path))
}
```
Replace with:
```js
import { uploadAsset } from '../../utils/storageOps'
...
async function uploadWelcomeMedia(file, kind) {
  const path = `welcome/${kind}/${Date.now()}-${file.name}`
  return uploadAsset(path, file, { contentType: file.type || 'image/png' })
}
```

- [ ] **Step 2:** `npm test` → PASS. Manual: Admin → Welcome section, upload a hero image, confirm it saves and displays.
- [ ] **Step 3: Commit** — `git commit -m "refactor(storage-seam): repoint WelcomeSection through storageOps.uploadAsset"`

---

### Task 5: `src/components/roadmap/ImagePickerModal.jsx` — list + upload-then-read

**Files:** Modify `src/components/roadmap/ImagePickerModal.jsx`

- [ ] **Step 1:** Current code (around lines 3, 5, 28-31):
```js
import { ref, listAll, getDownloadURL, uploadBytes } from 'firebase/storage'
...
import { storage } from '../../firebase'
...
    listAll(ref(storage, `users/${uid}/roadmap/`))
      .then((res) => Promise.all(res.items.map((item) => getDownloadURL(item))))
      .then((urls) => { if (alive) setUploads(urls) })
      .catch(() => { if (alive) setUploads([]) })
```
Replace with:
```js
import { listFlat, uploadAsset } from '../../utils/storageOps'
...
    listFlat(`users/${uid}/roadmap/`)
      .then((entries) => Promise.all(entries.map(({ ref }) => getDownloadURL(ref))))
      .then((urls) => { if (alive) setUploads(urls) })
```
Note: `listFlat` already returns `[]` on error (no separate `.catch` needed for the empty-list fallback), but `getDownloadURL` inside the `.then` can still throw per-item — if the original `.catch` was also guarding against that, keep a `.catch(() => { if (alive) setUploads([]) })` appended after the `.then((urls) => ...)` chain. Since `getDownloadURL` isn't part of the new seam (only listing is), keep importing it from `firebase/storage`.

- [ ] **Step 2:** Current code (around lines 45-47):
```js
      const storageRef = ref(storage, `users/${uid}/roadmap/${nodeId}`)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const url = await getDownloadURL(storageRef)
```
Replace with:
```js
      const url = await uploadAsset(`users/${uid}/roadmap/${nodeId}`, file, { contentType: file.type })
```

- [ ] **Step 3:** Trim `firebase/storage` import to just `getDownloadURL` (used in Step 1's list-then-resolve chain); remove `ref`, `listAll`, `uploadBytes` if no other use remains; remove the `storage` import from `../../firebase` if unused elsewhere in the file.

- [ ] **Step 4:** `npm test` → PASS. Manual: open Roadmap, use the image picker to browse existing images and upload a new one to a node.

- [ ] **Step 5: Commit** — `git commit -m "refactor(storage-seam): repoint ImagePickerModal through storageOps.listFlat/uploadAsset"`

---

### Task 6: `src/components/admin/UpdateAssetsSection.jsx` — recursive list

**Files:** Modify `src/components/admin/UpdateAssetsSection.jsx`

- [ ] **Step 1:** Current code (around lines 10-11, 18-23):
```js
import { ref, listAll, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase'
...
async function listAllFiles(storageRef) {
  const result = await listAll(storageRef)
  const files  = result.items
  const nested = await Promise.all(result.prefixes.map((p) => listAllFiles(p)))
  return [...files, ...nested.flat()]
}
```
Delete the local `listAllFiles` helper entirely — it's now `listAllRecursive` from the seam. Add:
```js
import { listAllRecursive } from '../../utils/storageOps'
```

- [ ] **Step 2:** Find the call site(s) using `listAllFiles(ref(storage, prefix))` (around line 69: `SYNC_PREFIXES.map((prefix) => listAllFiles(ref(storage, prefix)))`) and replace with `SYNC_PREFIXES.map((prefix) => listAllRecursive(prefix))`. The seam returns `{ path, ref }` objects instead of raw `StorageReference`s — find the downstream consumer (around line 86: `const url = await getDownloadURL(item)`) and confirm whether `item` there is used as a ref (needs `.ref` from the new shape) or as a path string (needs `.path`) — adjust accordingly: `getDownloadURL(item.ref)`.

- [ ] **Step 3:** Trim the `firebase/storage` import — `listAll` no longer needed; keep `getDownloadURL`/`ref` only if still used elsewhere (confirm).

- [ ] **Step 4:** `npm test` → PASS. Manual: Admin → "Update Assets" button, confirm the Sprout Lands asset sync still lists and downloads correctly.

- [ ] **Step 5: Commit** — `git commit -m "refactor(storage-seam): repoint UpdateAssetsSection through storageOps.listAllRecursive"`

---

### Task 7: `src/components/admin/StorageBrowser.jsx` — flat list

**Files:** Modify `src/components/admin/StorageBrowser.jsx`

- [ ] **Step 1:** Current code (around lines 2-4, 18-20):
```js
import { ref, listAll } from 'firebase/storage'
import { storage } from '../../firebase'
import { cloudAsset } from '../../utils/cloudAsset'
...
        listAll(ref(storage, f))
          .then((res) => res.items.map((i) => i.fullPath))
          .catch(() => []),
```
Replace with:
```js
import { cloudAsset } from '../../utils/cloudAsset'
import { listFlat } from '../../utils/storageOps'
...
        listFlat(f).then((entries) => entries.map((e) => e.path)),
```
(`listFlat` already resolves to `[]` on error — the trailing `.catch(() => [])` is no longer needed.)

- [ ] **Step 2:** Remove `ref`/`listAll`/`storage` imports if unused elsewhere in the file (confirm first).

- [ ] **Step 3:** `npm test` → PASS. Manual: Admin → open the generic Storage browser, confirm folders list their contents.

- [ ] **Step 4: Commit** — `git commit -m "refactor(storage-seam): repoint StorageBrowser through storageOps.listFlat"`

---

### Task 8: `src/components/admin/MusicSection.jsx` — resumable upload

**Files:** Modify `src/components/admin/MusicSection.jsx`

- [ ] **Step 1:** Current code (around lines 2-3, 5, 10, 32-38):
```js
import { ref, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../../firebase'
...
import { bustCache } from '../../utils/cloudAsset'
...
const AUDIO_PATH = 'media/audio/Background_Music_1.mp3'
...
    const task = uploadBytesResumable(ref(storage, AUDIO_PATH), file)
    task.on(
      'state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { setProgress(null); toast?.error(err.message) },
      () => { bustCache(AUDIO_PATH); setProgress(null); toast?.success('อัปโหลดเพลงแล้ว') },
    )
```
Replace with:
```js
import { uploadWithProgress } from '../../utils/storageOps'
...
const AUDIO_PATH = 'media/audio/Background_Music_1.mp3'
...
    uploadWithProgress(AUDIO_PATH, file, { onProgress: setProgress })
      .then(() => { setProgress(null); toast?.success('อัปโหลดเพลงแล้ว') })
      .catch((err) => { setProgress(null); toast?.error(err.message) })
```
Remove the `bustCache` import (now handled inside `uploadWithProgress`) and the `firebase/storage`/`../../firebase` imports if unused elsewhere.

- [ ] **Step 2:** `npm test` → PASS. Manual: Admin → Music section, upload a new background track, confirm progress bar shows and the new track plays on Home after upload.

- [ ] **Step 3: Commit** — `git commit -m "refactor(storage-seam): repoint MusicSection through storageOps.uploadWithProgress"`

---

### Task 9: `src/components/admin/MapDashboard.jsx` — list + upload + delete

**Files:** Modify `src/components/admin/MapDashboard.jsx`

- [ ] **Step 1 — folder listing (around lines 2, 4, 7, 156-161):**
```js
import { ref, uploadBytes, listAll, deleteObject } from 'firebase/storage'
...
import { storage } from '../../firebase'
...
import { cloudAsset } from '../../utils/cloudAsset'
...
      const folders = await listAssetFolders()
      const storagePaths = (
        await Promise.all(
          folders.map((f) => listAll(ref(storage, f.path)).catch(() => ({ items: [] }))),
        )
      ).flatMap((r) => r.items.map((i) => i.fullPath))
```
Replace with:
```js
import { cloudAsset } from '../../utils/cloudAsset'
import { listFlat, uploadAsset, deleteFile } from '../../utils/storageOps'
...
      const folders = await listAssetFolders()
      const storagePaths = (
        await Promise.all(folders.map((f) => listFlat(f.path)))
      ).flatMap((entries) => entries.map((e) => e.path))
```

- [ ] **Step 2 — map JSON upload (around lines 181-185):**
```js
      await uploadBytes(
        ref(storage, `maps/${key}.json`),
        parsedFile.file,
        { contentType: 'application/json' },
      )
```
Replace with:
```js
      await uploadAsset(`maps/${key}.json`, parsedFile.file, { contentType: 'application/json' })
```

- [ ] **Step 3 — delete (around line 347):**
```js
        deleteObject(ref(storage, `maps/${deleteKey}.json`)).catch(() => {}), // ok if not in storage
```
Replace with:
```js
        deleteFile(`maps/${deleteKey}.json`),
```
(`deleteFile` already swallows the not-found case — the inline comment can be dropped since it's now the documented behavior of `deleteFile` itself.)

- [ ] **Step 4:** Remove `ref`, `uploadBytes`, `listAll`, `deleteObject` from the `firebase/storage` import, and the `storage` import, if nothing else in the file uses them (confirm — `cloudAsset` calls elsewhere in this file don't need raw `storage`).

- [ ] **Step 5:** `npm test` → PASS. Manual: Admin → Maps tab — list existing maps (uses the repointed listing), upload a new map JSON, delete a test map config (confirm both the Storage object and Firestore doc go away).

- [ ] **Step 6: Commit** — `git commit -m "refactor(storage-seam): repoint MapDashboard through storageOps.listFlat/uploadAsset/deleteFile"`

---

### Task 10: `src/components/admin/MapInfoScreen.jsx` — upload + dual list + upload

**Files:** Modify `src/components/admin/MapInfoScreen.jsx`

- [ ] **Step 1 — tileset upload with progress (around lines 2-3, 38-40):**
```js
import { ref, uploadBytesResumable, uploadBytes, listAll } from 'firebase/storage'
import { storage } from '../../firebase'
...
    const task = uploadBytesResumable(ref(storage, storagePath), file, {
      contentType: file.type || 'image/png',
    })
```
Replace the resumable-upload block with a call to `uploadWithProgress(storagePath, file, { contentType: file.type || 'image/png', onProgress: ... })` — find the existing `task.on('state_changed', ...)` handler immediately following (not shown in the snippet above — read the surrounding ~15 lines in the actual file) and fold its progress/error/success callbacks into `uploadWithProgress`'s `onProgress` option and the returned Promise's `.then`/`.catch`, following the exact same transformation shape as Task 8.

- [ ] **Step 2 — duplicate `rc/tilesets`+`rc/objects` listing, appears twice verbatim (around lines 132-133 and 210-211):**
```js
          listAll(ref(storage, 'rc/tilesets')).catch(() => ({ items: [] })),
          listAll(ref(storage, 'rc/objects')).catch(() => ({ items: [] })),
```
Replace **both occurrences** with:
```js
          listFlat('rc/tilesets'),
          listFlat('rc/objects'),
```
Adjust the downstream consumer of the result at each site — it previously received `{ items: [{fullPath}] }` shape; `listFlat` returns `[{path, ref}]` directly (no `.items` wrapper), so update whatever destructures `tsResult.items`/`objResult.items` to use the array directly, and `.fullPath` → `.path`.

- [ ] **Step 3 — map JSON replace upload (around lines 197-201):**
```js
      await uploadBytes(
        ref(storage, `maps/${mapKey}.json`),
        file,
        { contentType: 'application/json' },
      )
```
Replace with:
```js
      await uploadAsset(`maps/${mapKey}.json`, file, { contentType: 'application/json' })
```

- [ ] **Step 4:** Add `import { listFlat, uploadWithProgress, uploadAsset } from '../../utils/storageOps'`. Trim `ref`, `uploadBytesResumable`, `uploadBytes`, `listAll` from the `firebase/storage` import and `storage` from `../../firebase` if nothing else in the file needs them (this file already imports `cloudAsset, bustCache` — `bustCache` may become unused if its only use was inside the removed resumable-upload's success callback; confirm before removing).

- [ ] **Step 5:** `npm test` → PASS. Manual: Admin → Map Info screen — upload a tileset image (progress bar works), confirm tileset auto-matching (the `rc/tilesets`+`rc/objects` listing) still finds files, replace a map's JSON.

- [ ] **Step 6: Commit** — `git commit -m "refactor(storage-seam): repoint MapInfoScreen through storageOps"`

---

### Task 11: `src/components/admin/MapConfigEditor.jsx` — upload + upload

**Files:** Modify `src/components/admin/MapConfigEditor.jsx`

- [ ] **Step 1 — tileset upload with progress (around lines 2-3, 112):**
```js
import { ref, uploadBytes, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../../firebase'
...
    const task = uploadBytesResumable(ref(storage, dest), file, { contentType: file.type || 'image/png' })
```
Same transformation as Task 8/10 — replace with `uploadWithProgress(dest, file, { contentType: file.type || 'image/png', onProgress: ... })`, folding in the existing `task.on(...)` handler's callbacks (read the ~10 lines following in the actual file).

- [ ] **Step 2 — map JSON upload from edited text (around lines 133-136):**
```js
        await uploadBytes(ref(storage, `maps/${mapKey}.json`), new Blob([jsonText], { type: 'application/json' }), {
          contentType: 'application/json',
        })
```
Replace with:
```js
        await uploadAsset(`maps/${mapKey}.json`, new Blob([jsonText], { type: 'application/json' }), { contentType: 'application/json' })
```
Note: this file previously called `bustCache(...)` right after this upload (line ~136 per the original) — since `uploadAsset` now busts the cache internally, remove the now-redundant manual `bustCache` call at this site only (check the exact line to avoid removing a `bustCache` call elsewhere in the file that's unrelated).

- [ ] **Step 3:** Add `import { uploadWithProgress, uploadAsset } from '../../utils/storageOps'`. Trim `ref`, `uploadBytes`, `uploadBytesResumable` from `firebase/storage` and `storage` from `../../firebase` if unused elsewhere (this file also imports `cloudAsset, bustCache` — keep `bustCache` only if still used for something else in the file).

- [ ] **Step 4:** `npm test` → PASS. Manual: Admin → Map Config editor, upload a tileset image, edit and save a map's JSON.

- [ ] **Step 5: Commit** — `git commit -m "refactor(storage-seam): repoint MapConfigEditor through storageOps"`

---

### Task 12: `src/components/admin/AssetsSection.jsx` — upload + list

**Files:** Modify `src/components/admin/AssetsSection.jsx`

- [ ] **Step 1 — character upload with progress (around lines 2-3, 56):**
```js
import { ref, uploadBytesResumable, listAll } from 'firebase/storage'
import { storage } from '../../firebase'
...
    const task = uploadBytesResumable(ref(storage, storagePath), file)
```
Same transformation as prior upload tasks — replace with `uploadWithProgress(storagePath, file, { onProgress: ... })`, folding in the existing `task.on(...)` handler (read the following ~10 lines in the actual file).

- [ ] **Step 2 — character list (around line 116):**
```js
      const result = await listAll(ref(storage, 'rc/characters'))
```
Replace with:
```js
      const result = await listFlat('rc/characters')
```
Adjust the downstream consumer — `result` was previously `{ items: [...] }`; `listFlat` returns the array directly (no `.items`), and each entry is `{ path, ref }` not a raw `StorageReference` — update whatever reads `result.items[i].fullPath` to `result[i].path`.

- [ ] **Step 3:** Add `import { uploadWithProgress, listFlat } from '../../utils/storageOps'`. Trim `ref`, `uploadBytesResumable`, `listAll` from `firebase/storage` and `storage` from `../../firebase` if unused elsewhere (this file also imports `cloudAsset, bustCache` and `copyStorageObject` from `storageOps` already — keep those, just add the two new named imports to the existing `storageOps` import line rather than a second import statement).

- [ ] **Step 4:** `npm test` → PASS. Manual: Admin → Assets section, upload a new MBTI character sprite, confirm the character list refreshes.

- [ ] **Step 5: Commit** — `git commit -m "refactor(storage-seam): repoint AssetsSection through storageOps.uploadWithProgress/listFlat"`

---

### Task 13: `src/components/admin/AssetsManagerSection.jsx` — the big one (7 call sites)

**Files:** Modify `src/components/admin/AssetsManagerSection.jsx`

This file already imports both seams (`cloudAsset, bustCache` and `moveFile, trashFile, restoreFile, fromTrashPath`) — only add the new functions to that existing `storageOps` import line.

- [ ] **Step 1 — delete the local `listAllRecursive` helper (around lines 15-20):**
```js
async function listAllRecursive(storageRef) {
  const result = await listAll(storageRef)
  const files = result.items.map((i) => i.fullPath)
  const sub = await Promise.all(result.prefixes.map((p) => listAllRecursive(p)))
  return [...files, ...sub.flat()]
}
```
Delete this entirely — it's a local name collision with the new seam function; when you add `import { listAllRecursive, ... } from '../../utils/storageOps'`, this local definition must be removed, not shadowed.

- [ ] **Step 2 — flat list sites (around lines 185, 505, 525, 535)** — each currently:
```js
      const result = await listAll(ref(storage, folderPath))   // (or folder.path / deleteTarget.path depending on site)
```
possibly followed by `.catch(() => ({ items: [] }))` at 3 of the 4 sites. Replace each with:
```js
      const result = await listFlat(folderPath)   // match the exact variable name used at that site
```
and update each site's downstream use of `result.items` → `result` directly (no `.items` wrapper), and any `.fullPath` reads on entries → `.path`.

- [ ] **Step 3 — recursive list for trash browsing (around line 345):**
```js
      const all = await listAllRecursive(ref(storage, 'trash'))
```
Replace with (now calling the imported seam function instead of the local one just deleted):
```js
      const all = await listAllRecursive('trash')
```
Update downstream consumers of `all` — entries are now `{ path, ref }` instead of raw path strings; adjust accordingly.

- [ ] **Step 4 — upload with progress (around line 197):**
```js
      const task = uploadBytesResumable(ref(storage, dest), file)
```
Same transformation as prior upload tasks — replace with `uploadWithProgress(dest, file, { onProgress: ... })`, folding in the existing `task.on(...)` handler (read the following lines in the actual file).

- [ ] **Step 5 — permanent delete, single (around line 371):**
```js
      await deleteObject(ref(storage, trashPath))
```
Replace with:
```js
      await deleteFile(trashPath)
```

- [ ] **Step 6 — permanent delete, bulk (around line 383):**
```js
      await Promise.all((files ?? []).map((p) => deleteObject(ref(storage, p)).catch(() => {})))
```
Replace with:
```js
      await Promise.all((files ?? []).map((p) => deleteFile(p)))
```
(`deleteFile` already swallows errors — the per-call `.catch(() => {})` is redundant, drop it.)

- [ ] **Step 7:** Update the `storageOps` import line to include the new functions:
```js
import { moveFile, trashFile, restoreFile, fromTrashPath, listAllRecursive, listFlat, deleteFile, uploadWithProgress } from '../../utils/storageOps'
```
Trim `ref`, `listAll`, `deleteObject`, `uploadBytesResumable` from the `firebase/storage` import and `storage` from `../../firebase` if nothing else in this large file needs them (this file is 590 lines — read it carefully before trimming; there may be other raw Storage usage not covered by this task's 7 sites — if you find one, treat it as an 8th site following the same patterns above, don't leave it half-migrated).

- [ ] **Step 8:** `npm test` → PASS. Manual: this is the most-used admin file — Admin → Assets Manager: browse folders, upload a file (progress bar), move a file, trash a file, restore from trash, permanently delete from trash (both single and bulk-select), browse the trash folder listing.

- [ ] **Step 9: Commit** — `git commit -m "refactor(storage-seam): repoint AssetsManagerSection through storageOps (7 call sites)"`

---

## Final check (after all 13 tasks)

- [ ] Grep `src/components/` for `ref(storage,` / `uploadBytes(` / `uploadBytesResumable(` / `listAll(` / `getDownloadURL(` used directly (not via `cloudAsset`/`storageOps`) — expect zero hits outside `src/game/worldScenes.js` (already migrated, out of scope) and the seam files themselves.
- [ ] `npm test` → full suite green.
- [ ] `npm run build` → succeeds.
- [ ] Full manual pass through the Admin dashboard's Assets/Maps/Music/Welcome sections (the individual task manual checks above, run once more end-to-end).
