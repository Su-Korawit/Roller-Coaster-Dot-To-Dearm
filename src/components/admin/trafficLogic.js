// Turns analyticsDaily docs ([{ id: 'YYYY-MM-DD', views, visitors, paths, events, devices, refs }]) into
// what the admin Traffic block shows. Pure, so it is unit-tested.
const top = (map, n = 8) => Object.entries(map ?? {}).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).slice(0, n)

const sumMaps = (docs, key) => {
  const out = {}
  for (const d of docs) for (const [k, v] of Object.entries(d[key] ?? {})) out[k] = (out[k] ?? 0) + v
  return out
}

export function summarizeTraffic(docs) {
  const days = [...docs].sort((a, b) => a.id.localeCompare(b.id))
  const sum = (key) => days.reduce((s, d) => s + (d[key] ?? 0), 0)
  const today = days.at(-1)
  return {
    views: sum('views'),
    visitors: sum('visitors'),               // sum of daily uniques (a person on 3 days counts 3)
    todayViews: today?.views ?? 0,
    todayVisitors: today?.visitors ?? 0,
    perDay: days.map((d) => [d.id, d.views ?? 0]),
    topApps: top(Object.fromEntries(Object.entries(sumMaps(days, 'events')).filter(([k]) => k.startsWith('app_')).map(([k, v]) => [k.slice(4), v]))),
    topPages: top(sumMaps(days, 'paths')),
    devices: top(sumMaps(days, 'devices'), 2),
    refs: top(sumMaps(days, 'refs'), 5),
  }
}
