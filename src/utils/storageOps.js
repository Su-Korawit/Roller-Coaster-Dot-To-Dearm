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
