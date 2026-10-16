// Uploads an article image to Storage (creator-only path, see storage.rules).
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import { LIMITS } from '../content/schema'
import { fitWithin } from '../content/imageFit'

export class ImageError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ImageError'
    this.code = code
  }
}

// Animated or vector files would lose their point if redrawn on a canvas.
const KEEP_AS_IS = ['image/gif', 'image/svg+xml']

async function shrink(file, max) {
  if (KEEP_AS_IS.includes(file.type) || typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return file
  }
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, max)
  if (width === bitmap.width && height === bitmap.height) {
    bitmap.close?.()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.88))
  return blob ?? file
}

const safeName = (name) => String(name).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+/, '').slice(-60) || 'image'

export async function uploadArticleImage(draftId, file, { now = Date.now() } = {}) {
  if (!file?.type?.startsWith('image/')) throw new ImageError('not_image')
  if (file.size > LIMITS.imageMaxBytes) throw new ImageError('too_large')
  const body = await shrink(file, LIMITS.imageMaxWidth)
  const fileRef = ref(storage, `articles/${draftId}/${now}-${safeName(file.name)}`)
  await uploadBytes(fileRef, body, { contentType: body.type || file.type })
  return { url: await getDownloadURL(fileRef) }
}
