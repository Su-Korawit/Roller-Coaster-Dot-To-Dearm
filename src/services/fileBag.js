import { addDoc, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { refs, cols, queries, shapes } from '../lib/db'
import { uploadAsset, deleteFile } from '../utils/storageOps'
import { FREE_BAG_BYTES, ADMIN_BAG_BYTES } from '../constants/entitlements'
import { ADMIN_ROLES } from '../constants/admin'
import { useEntitlementsStore } from '../stores/useEntitlementsStore'

export function resolveBagQuotaBytes({ email, extraStorageBytes = 0 } = {}) {
  if (email && ADMIN_ROLES[email.toLowerCase()]) return ADMIN_BAG_BYTES
  return FREE_BAG_BYTES + extraStorageBytes
}

export async function reserveBagUpload(sizeBytes) {
  const call = httpsCallable(getFunctions(), 'reserveBagUpload')
  const { data } = await call({ sizeBytes })
  return data
}

/** Register an existing Storage object as a Bag item (roadmap retrofit / export). */
export async function registerBagItem({
  ownerUid,
  storagePath,
  name,
  kind,
  source,
  sizeBytes = 0,
  folderId = null,
  position = { x: 80 + Math.random() * 120, y: 80 + Math.random() * 120 },
}) {
  const ref = await addDoc(
    cols.fileBagItems,
    shapes.fileBagItem({
      ownerUid,
      storagePath,
      name,
      kind,
      source,
      sizeBytes,
      folderId,
      position,
    }),
  )
  return ref.id
}

/**
 * Bag-native upload: reserve quota → Storage → Firestore doc.
 * Throws with code BAG_QUOTA_EXCEEDED when over quota.
 */
export async function uploadToBag({ uid, file, folderId = null, kind, source = 'bag-upload', name }) {
  const sizeBytes = file.size
  try {
    await reserveBagUpload(sizeBytes)
  } catch (err) {
    const code = err?.code || err?.message || ''
    if (String(code).includes('BAG_QUOTA_EXCEEDED') || String(code).includes('resource-exhausted')) {
      const e = new Error('BAG_QUOTA_EXCEEDED')
      e.code = 'BAG_QUOTA_EXCEEDED'
      throw e
    }
    throw err
  }

  const itemRef = doc(cols.fileBagItems)
  const fileName = name || file.name || 'file'
  const storagePath = `users/${uid}/bag/${itemRef.id}-${fileName}`
  await uploadAsset(storagePath, file, { contentType: file.type || 'application/octet-stream' })

  const inferredKind = kind
    ?? (file.type?.startsWith('image/') ? 'image'
      : file.type?.startsWith('video/') ? 'video'
        : file.type === 'application/json' ? 'export'
          : 'file')

  await setDoc(itemRef, shapes.fileBagItem({
    ownerUid: uid,
    storagePath,
    name: fileName,
    kind: inferredKind,
    source,
    sizeBytes,
    folderId,
  }))
  return itemRef.id
}

/** Save an in-memory Blob/File to Bag (Roadmap/Notebook export). */
export async function saveBlobToBag({ uid, blob, fileName, source }) {
  const file = blob instanceof File
    ? blob
    : new File([blob], fileName, { type: blob.type || 'application/json' })
  return uploadToBag({
    uid,
    file,
    kind: 'export',
    source,
    name: fileName,
  })
}

/** Reference duplicate — new doc, same storagePath; no quota cost (ADR-0016). */
export async function duplicateBagItem(item, { folderId, position } = {}) {
  return registerBagItem({
    ownerUid: item.ownerUid,
    storagePath: item.storagePath,
    name: item.name,
    kind: item.kind,
    source: item.source,
    sizeBytes: 0, // reference — does not count toward quota
    folderId: folderId ?? item.folderId ?? null,
    position: position ?? {
      x: (item.position?.x ?? 80) + 24,
      y: (item.position?.y ?? 80) + 24,
    },
  })
}

export async function createBagFolder({ ownerUid, name, parentId = null, position }) {
  const ref = await addDoc(
    cols.fileBagFolders,
    shapes.fileBagFolder({ ownerUid, name, parentId, position }),
  )
  return ref.id
}

export async function moveBagItem(itemId, folderId) {
  await updateDoc(refs.fileBagItem(itemId), { folderId })
}

export async function updateBagItemPosition(itemId, position) {
  await updateDoc(refs.fileBagItem(itemId), { position })
}

export async function updateBagFolderPosition(folderId, position) {
  await updateDoc(refs.fileBagFolder(folderId), { position })
}

export async function deleteBagItemDoc(itemId) {
  await deleteDoc(refs.fileBagItem(itemId))
}

export async function deleteBagFolderDoc(folderId) {
  await deleteDoc(refs.fileBagFolder(folderId))
}

/** Delete Bag-native Storage object (releases quota via Functions trigger). */
export async function deleteBagNativeFile(storagePath) {
  if (!storagePath?.includes('/bag/')) return
  try {
    await deleteFile(storagePath)
  } catch {
    // best-effort; doc may already be gone
  }
}

export async function loadBagFolderContents(uid, folderId) {
  const [itemsSnap, foldersSnap] = await Promise.all([
    // Single-field query avoids a composite index; folder filter is client-side.
    getDocs(queries.fileBagItemsByOwner(uid)),
    getDocs(queries.fileBagFoldersByOwner(uid)),
  ])
  const items = itemsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((i) => (i.folderId ?? null) === folderId)
  const folders = foldersSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((f) => (f.parentId ?? null) === folderId)
  return { items, folders }
}

export function bagQuotaFromStores(email, usageBytes = 0) {
  const extra = useEntitlementsStore.getState().extraStorageBytes()
  const quota = resolveBagQuotaBytes({ email, extraStorageBytes: extra })
  return { used: usageBytes, quota, isAdmin: Boolean(email && ADMIN_ROLES[email.toLowerCase()]) }
}
