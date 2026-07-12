import { uploadAsset } from './storageOps'

// One image file -> users/{uid}/roadmap/{nodeId}-{ts} -> download URL.
// Shared by ImagePickerModal's Upload button and ImageNode's direct
// drop/paste path so the storage layout stays identical either way.
export async function uploadRoadmapImage(uid, nodeId, file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Not an image file')
  return uploadAsset(`users/${uid}/roadmap/${nodeId}-${Date.now()}`, file, { contentType: file.type })
}
