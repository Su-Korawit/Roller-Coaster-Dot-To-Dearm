import { uploadAsset } from './storageOps'
import { registerBagItem } from '../services/fileBag'

// One image file -> users/{uid}/roadmap/{nodeId}-{ts} -> download URL.
// Shared by ImagePickerModal's Upload button and ImageNode's direct
// drop/paste path so the storage layout stays identical either way.
// Also registers a File Bag pointer (ADR-0016) — additive, errors ignored.
export async function uploadRoadmapImage(uid, nodeId, file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Not an image file')
  const storagePath = `users/${uid}/roadmap/${nodeId}-${Date.now()}`
  const url = await uploadAsset(storagePath, file, { contentType: file.type })
  try {
    await registerBagItem({
      ownerUid: uid,
      storagePath,
      name: file.name || 'image',
      kind: 'image',
      source: 'roadmap-image',
      sizeBytes: file.size ?? 0,
    })
  } catch (err) {
    console.warn('[fileBag] register roadmap image failed', err)
  }
  return url
}
