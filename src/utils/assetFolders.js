import { doc, getDocs, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { refs, cols } from '../lib/db'

const SYSTEM_FOLDERS = [
  { path: 'rc/tilesets', displayName: 'Tilesets', isSystem: true, order: 0 },
  { path: 'rc/objects',  displayName: 'Objects',  isSystem: true, order: 1 },
]

const col = () => cols.assetFolders

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
  const path = `rc/${slug}`
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
  await updateDoc(refs.assetFolder(id), {
    displayName: newDisplayName.trim(),
    path: newPath,
    updatedAt: serverTimestamp(),
    updatedBy: uid ?? null,
  })
}

export async function trashFolder(id, uid) {
  await updateDoc(refs.assetFolder(id), {
    trashedAt: serverTimestamp(),
    trashedBy: uid ?? null,
  })
}
