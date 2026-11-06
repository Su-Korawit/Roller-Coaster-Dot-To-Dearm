// "My photo" wallpaper: the picture lives only on this device (IndexedDB), never uploaded.
// The crop is a focal point + zoom, so one picture adapts to every screen shape:
//   img { object-fit: cover; object-position: fx% fy%; transform: scale(zoom); origin: fx% fy% }

export const MAX_SIDE = 2560
export const MAX_ZOOM = 3
export const DEFAULT_CROP = { fx: 50, fy: 50, zoom: 1 }

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

export function fitSize(width, height, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function normalizeCrop(crop = DEFAULT_CROP) {
  return {
    fx: clamp(Number(crop.fx) || 0, 0, 100),
    fy: clamp(Number(crop.fy) || 0, 0, 100),
    zoom: clamp(Number(crop.zoom) || 1, 1, MAX_ZOOM),
  }
}

// Style for the <img> that fills a box (the whole screen, or the crop preview frame).
export function cropImgStyle(crop) {
  const { fx, fy, zoom } = normalizeCrop(crop)
  return {
    objectFit: 'cover',
    objectPosition: `${fx}% ${fy}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${fx}% ${fy}%`,
  }
}

// Dragging the picture by (dx, dy) px inside a frame of `frame` px, for an image of `aspect`
// (w/h). Image left edge = fx/100 * (frameW - zoom*coverW), so d(fx) = dx*100 / (frameW - zoom*coverW).
// With the cover box and fx in [0,100] the frame is always fully covered.
export function dragToFocus(crop, dx, dy, frame, aspect) {
  const { fx, fy, zoom } = normalizeCrop(crop)
  const coverW = Math.max(frame.w, frame.h * aspect)
  const coverH = Math.max(frame.h, frame.w / aspect)
  const spanX = frame.w - zoom * coverW
  const spanY = frame.h - zoom * coverH
  return normalizeCrop({
    fx: Math.abs(spanX) < 1 ? fx : fx + (dx * 100) / spanX,
    fy: Math.abs(spanY) < 1 ? fy : fy + (dy * 100) / spanY,
    zoom,
  })
}

// ── IndexedDB (one blob under one key) ──────────────────────────────────────────
const DB_NAME = 'rc-os'
const STORE = 'kv'
const KEY = 'wallpaper'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run(mode, op) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = op(tx.objectStore(STORE))
    tx.oncomplete = () => { db.close(); resolve(req.result) }
    tx.onerror = () => { db.close(); reject(tx.error) }
    tx.onabort = () => { db.close(); reject(tx.error) }
  })
}

export const saveWallpaperBlob = (blob) => run('readwrite', (s) => s.put(blob, KEY))
export const loadWallpaperBlob = () => run('readonly', (s) => s.get(KEY))
export const deleteWallpaperBlob = () => run('readwrite', (s) => s.delete(KEY))

// ── Reading a picked file ───────────────────────────────────────────────────────
function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file)
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('cannot read image')) }
    img.src = url
  })
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality))

// Downscales to MAX_SIDE, re-encodes, and measures brightness so text can switch to light/dark.
// Returns { blob, aspect, dark }.
export async function prepareImage(file) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('not an image')
  const bmp = await loadBitmap(file)
  const { width, height } = fitSize(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bmp, 0, 0, width, height)

  const probe = document.createElement('canvas')
  probe.width = 16
  probe.height = 16
  const pctx = probe.getContext('2d')
  pctx.drawImage(canvas, 0, 0, 16, 16)
  const px = pctx.getImageData(0, 0, 16, 16).data
  let sum = 0
  for (let i = 0; i < px.length; i += 4) sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]
  const dark = sum / (px.length / 4) < 128

  const blob = (await toBlob(canvas, 'image/webp', 0.9)) ?? (await toBlob(canvas, 'image/jpeg', 0.9))
  if (!blob) throw new Error('cannot encode image')
  bmp.close?.()
  return { blob, aspect: width / height, dark }
}
