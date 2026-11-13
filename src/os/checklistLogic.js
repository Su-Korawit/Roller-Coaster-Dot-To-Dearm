// Checklist app logic. Pure functions, no React.
// Data lives in src/data/checklists: a tiny index.json (loaded with the app) and one JSON per list
// (loaded only when opened, so the app opens fast and the bundle stays small).
import index from '../data/checklists/index.json'
import { UNIVERSITY_ROWS, shortUniName } from '../data/universityApps'

export const CHECKLIST_INDEX = index

const files = import.meta.glob('../data/checklists/*.json')
const cache = new Map()

// Load one list by id. Resolves null for an unknown id. Cached after the first load.
export function loadChecklist(id) {
  if (cache.has(id)) return cache.get(id)
  const load = files[`../data/checklists/${id}.json`]
  if (!load || id === 'index') return Promise.resolve(null)
  const p = load().then((m) => m.default ?? m).catch(() => { cache.delete(id); return null })
  cache.set(id, p)
  return p
}

// Warm the cache for a list (e.g. on hover) without waiting for it.
export const prefetchChecklist = (id) => { loadChecklist(id) }

export const itemIds = (doc) => (doc?.groups ?? []).flatMap((g) => g.items.map((i) => i.id))

// Keep only ids that still exist in the list (the JSON may change between releases).
export const cleanChecked = (checked, doc) => {
  const valid = new Set(itemIds(doc))
  return [...new Set(Array.isArray(checked) ? checked : [])].filter((id) => valid.has(id))
}

export function toggleId(checked = [], id) {
  return checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id]
}

// { done, total, pct } for the whole list.
export function progress(doc, checked = []) {
  const ids = itemIds(doc)
  const set = new Set(checked)
  const done = ids.filter((id) => set.has(id)).length
  return { done, total: ids.length, pct: ids.length ? Math.round((done / ids.length) * 100) : 0 }
}

export function groupProgress(group, checked = []) {
  const set = new Set(checked)
  const done = group.items.filter((i) => set.has(i.id)).length
  return { done, total: group.items.length }
}

// Progress per list from the saved { [listId]: ids[] } using the item counts in the index.
export function indexProgress(entry, checkedMap = {}) {
  const done = (checkedMap[entry.id] ?? []).length
  const total = entry.items
  return { done: Math.min(done, total), total, pct: total ? Math.min(100, Math.round((done / total) * 100)) : 0 }
}

export function searchLists(query, lists = index.lists, group = 'all') {
  const q = query.trim().toLowerCase()
  return lists.filter(
    (l) => (group === 'all' || l.group === group) && (!q || `${l.title} ${l.short} ${l.subtitle}`.toLowerCase().includes(q)),
  )
}

// University admission sites for a list's `uniIds`, as { id, name, url }.
export function uniLinks(ids = []) {
  const rows = new Map(UNIVERSITY_ROWS.map((r) => [r[0], r]))
  return ids.filter((id) => rows.has(id)).map((id) => ({ id, name: shortUniName(rows.get(id)[1]), url: rows.get(id)[2] }))
}

// Only http(s) links are ever opened (the JSON is ours, but never trust a link blindly).
export const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null)
