// Files dropped on the Home screen (desktop): the bytes live only on this device (IndexedDB),
// never uploaded. The store keeps just { id, name, size, type }.

const DB_NAME = 'rc-os-files'
const STORE = 'files'

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
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = op(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export const saveHomeFile = (id, blob) => run('readwrite', (s) => s.put(blob, id))
export const loadHomeFile = (id) => run('readonly', (s) => s.get(id))
export const deleteHomeFile = (id) => run('readwrite', (s) => s.delete(id))

export const newFileId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// Open a stored file: images/PDFs/text show in a new tab, anything else downloads.
export async function openHomeFile(meta) {
  const blob = await loadHomeFile(meta.id)
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  const viewable = /^(image\/|application\/pdf|text\/)/.test(meta.type || '')
  if (viewable) {
    window.open(url, '_blank', 'noopener')
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = meta.name
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return true
}
