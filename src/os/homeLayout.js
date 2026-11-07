// Pure logic for the Home screen layout: one ordered list of "tokens" — apps, folders and dropped
// files — plus folder editing. No React, no storage. `apps` is always passed in (the registry).
//
// token: 'goal' (an app id) | 'f:<folderId>' | 'file:<fileId>'

export const folderToken = (id) => `f:${id}`
export const fileToken = (id) => `file:${id}`

export function parseToken(t = '') {
  if (t.startsWith('f:')) return { kind: 'folder', id: t.slice(2) }
  if (t.startsWith('file:')) return { kind: 'file', id: t.slice(5) }
  return { kind: 'app', id: t }
}

export const MAX_FILES = 20
export const MAX_FILE_BYTES = 5 * 1024 * 1024

// What Home shows, in order. `order` is the saved arrangement; anything new (a freshly installed app,
// a new folder or file) is appended, anything gone (uninstalled, deleted, moved into a folder) is dropped.
// Built-in apps (Store, Settings) come first by default but can be moved like the rest.
export function layoutTokens({ order = [], installed = [], folders = [], files = [], apps = [] }) {
  const inFolder = new Set(folders.flatMap((f) => f.appIds))
  const byId = new Map(apps.map((a) => [a.id, a]))
  const okApp = (id) => {
    const a = byId.get(id)
    return !!a && !inFolder.has(id) && (a.builtIn || (a.installable && installed.includes(id)))
  }
  const base = [
    ...apps.filter((a) => a.builtIn).map((a) => a.id),
    ...installed,
    ...folders.map((f) => folderToken(f.id)),
    ...files.map((f) => fileToken(f.id)),
  ]
  const valid = (t) => {
    const p = parseToken(t)
    if (p.kind === 'folder') return folders.some((f) => f.id === p.id)
    if (p.kind === 'file') return files.some((f) => f.id === p.id)
    return okApp(p.id)
  }
  const out = []
  for (const t of [...order, ...base]) if (valid(t) && !out.includes(t)) out.push(t)
  return out
}

// Put `from` where `to` is; `to` null/unknown with from known → end of the list.
export function moveToken(tokens, from, to) {
  const i = tokens.indexOf(from)
  if (i < 0 || from === to) return tokens
  const without = tokens.filter((t) => t !== from)
  const j = to == null ? -1 : without.indexOf(to)
  if (j < 0) return [...without, from]
  without.splice(i < tokens.indexOf(to) ? j + 1 : j, 0, from)
  return without
}

const stripApp = (folders, appId) => folders.map((f) => ({ ...f, appIds: f.appIds.filter((id) => id !== appId) }))

// Two apps dropped on each other → a new folder at the target's slot. Returns { folders, order } or null.
export function folderFromDrop({ tokens, folders, from, onto, id, name = 'โฟลเดอร์' }) {
  const a = parseToken(from)
  const b = parseToken(onto)
  if (a.kind !== 'app' || b.kind !== 'app' || a.id === b.id) return null
  const order = tokens.filter((t) => t !== from).map((t) => (t === onto ? folderToken(id) : t))
  return { folders: [...stripApp(folders, a.id), { id, name, appIds: [b.id, a.id] }], order }
}

// An app dropped on a folder joins it (and leaves any other folder).
export function addToFolder(folders, folderId, appId) {
  return stripApp(folders, appId).map((f) => (f.id === folderId ? { ...f, appIds: [...f.appIds, appId] } : f))
}

export const removeFromFolder = (folders, folderId, appId) =>
  folders.map((f) => (f.id === folderId ? { ...f, appIds: f.appIds.filter((id) => id !== appId) } : f))

export const renameFolder = (folders, folderId, name) =>
  folders.map((f) => (f.id === folderId ? { ...f, name: String(name).trim().slice(0, 24) || 'โฟลเดอร์' } : f))

// What the drag-and-drop does. mode 'folder' = dropped on the middle of an app (touch), else reorder.
// Returns { action: 'folder-create' | 'folder-add' | 'move' | null }.
export function dropAction({ from, onto, mode }) {
  const a = parseToken(from)
  const b = onto == null ? null : parseToken(onto)
  if (!b) return { action: 'move' }
  if (a.kind === 'app' && b.kind === 'folder') return { action: 'folder-add' }
  if (a.kind === 'app' && b.kind === 'app' && mode === 'folder') return { action: 'folder-create' }
  return { action: 'move' }
}

// Dropped files: keep the ones that fit. Returns { ok: [file], rejected: [{ name, reason }] }.
export function acceptFiles(list, existingCount = 0) {
  const ok = []
  const rejected = []
  for (const f of list) {
    if (existingCount + ok.length >= MAX_FILES) rejected.push({ name: f.name, reason: `เก็บได้สูงสุด ${MAX_FILES} ไฟล์` })
    else if (f.size > MAX_FILE_BYTES) rejected.push({ name: f.name, reason: 'ไฟล์ใหญ่เกิน 5 MB' })
    else if (f.size === 0) rejected.push({ name: f.name, reason: 'ไฟล์ว่าง' })
    else ok.push(f)
  }
  return { ok, rejected }
}
