import { ref, getDownloadURL, deleteObject, uploadBytes, uploadBytesResumable, listAll } from 'firebase/storage'
import { storage } from '../firebase'
import { bustCache } from './cloudAsset'

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
