// Pure rules for "resume where you left off": merging the local and cloud copies, choosing the
// map to boot, and labelling a point. Positions are map pixels (not scaled), so a zoom or scale
// change never invalidates a stored point.
export const EMPTY_RESUME = { last: null, points: {} }
export const MAX_LABEL_DIST = 96

export const validPoint = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y)

// Never throws: anything malformed becomes the empty resume or loses the bad points. `last`
// always names a map that has a point.
export function sanitizeResume(d) {
  const points = {}
  if (d && typeof d === 'object' && d.points && typeof d.points === 'object') {
    for (const [key, p] of Object.entries(d.points)) {
      if (validPoint(p)) points[key] = { x: p.x, y: p.y, facing: p.facing ?? 'down', label: typeof p.label === 'string' ? p.label : '', at: Number(p.at) || 0 }
    }
  }
  const keys = Object.keys(points)
  const last = typeof d?.last === 'string' && points[d.last] ? d.last : keys.sort((a, b) => points[b].at - points[a].at)[0] ?? null
  return { last, points }
}

// Per map the point with the greater `at` wins; `last` is the map of the newest point.
export function mergeResume(a, b) {
  const x = sanitizeResume(a)
  const y = sanitizeResume(b)
  const points = { ...x.points }
  for (const [key, p] of Object.entries(y.points)) {
    if (!points[key] || p.at > points[key].at) points[key] = p
  }
  const keys = Object.keys(points)
  if (keys.length === 0) return { last: null, points: {} }
  const last = keys.reduce((best, k) => (points[k].at > points[best].at ? k : best), keys[0])
  return { last, points }
}

// Which map to boot and where. `isAllowed(mapKey)` says whether that map can be entered
// directly (it exists, is not retired and is not the School Hub, which needs its async room choice).
export function pickBootTarget({ resume, isAllowed, fallbackKey }) {
  const last = resume?.last
  if (typeof last === 'string' && isAllowed(last)) {
    const p = resume.points?.[last]
    return { mapKey: last, point: validPoint(p) ? p : null }
  }
  return { mapKey: fallbackKey, point: null }
}

// Name of the nearest zone within MAX_LABEL_DIST, else the fallback. zones: [{ x, y, label }].
export function nearestLabel(zones, x, y, fallback) {
  let best = null
  let bestD = MAX_LABEL_DIST
  for (const z of zones ?? []) {
    const d = Math.hypot(z.x - x, z.y - y)
    if (d <= bestD && z.label) {
      best = z.label
      bestD = d
    }
  }
  return best ?? fallback
}

// A page that pins its first map (the guest /openhouse page) must not change where the app boots next.
export const shouldRecordResume = (pinnedMapKey) => !pinnedMapKey
