// Reads the Open House index files that scripts/refreshOpenHouseIndex.mjs publishes to the public
// `data/` area of Storage. Never throws: every outcome is { ok: true, data } or { ok: false, error }
// with error 'missing' (not published yet), 'corrupt' (not the documented shape) or 'network'.
import { BUILDING_IDS } from '../constants/openHouseBuildings'

const BUCKET = 'rollercoasterdottodream.firebasestorage.app'
const BASE = 'data/mytcas/openhouse'

export const storageUrl = (path) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

export const validateIndex = (d) => isObject(d) && isObject(d.buildings)

export const validateBuilding = (d) =>
  isObject(d)
  && Array.isArray(d.universities)
  && d.universities.every((u) => isObject(u) && typeof u.id === 'string' && typeof u.nameTh === 'string' && Array.isArray(u.programs))

async function readJson(path, validate) {
  let res
  try {
    res = await fetch(storageUrl(path))
  } catch {
    return { ok: false, error: 'network' }
  }
  if (res.status === 404 || res.status === 403) return { ok: false, error: 'missing' }
  if (!res.ok) return { ok: false, error: 'network' }
  let data
  try {
    data = await res.json()
  } catch {
    return { ok: false, error: 'corrupt' }
  }
  return validate(data) ? { ok: true, data } : { ok: false, error: 'corrupt' }
}

export const fetchIndex = () => readJson(`${BASE}/index.json`, validateIndex)

export async function fetchBuilding(id) {
  if (!BUILDING_IDS.includes(id)) return { ok: false, error: 'missing' }
  return readJson(`${BASE}/${id}.json`, validateBuilding)
}
