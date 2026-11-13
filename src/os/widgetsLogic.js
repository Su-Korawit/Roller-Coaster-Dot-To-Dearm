// Home-screen widgets: small live cards that belong to an app. Pure logic for the registry and the
// user's choice (an ordered list of ids kept in useOsStore). The cards themselves are in WidgetCards.jsx.
export const MAX_WIDGETS = 4
export const DEFAULT_WIDGETS = ['countdown']

// id = widget id, appId = the app it opens (and must be available for the widget to show).
export const WIDGET_DEFS = [
  { id: 'countdown', appId: 'countdown', name: 'นับถอยหลังสอบ', hint: 'วันที่เหลือถึงวิชาสอบที่ใกล้ที่สุด' },
  { id: 'habit', appId: 'habit', name: 'แผนวันนี้', hint: 'งานของวันนี้ทำไปแล้วกี่ข้อ' },
  { id: 'reading', appId: 'reading', name: 'เวลาอ่านหนังสือ', hint: 'เวลาอ่านสัปดาห์นี้และวันต่อเนื่อง' },
  { id: 'secretary', appId: 'secretary', name: 'โควตาเลขา AI', hint: 'ข้อความที่เหลือกับพี่ใจดีวันนี้' },
]

const known = (id, defs) => defs.some((d) => d.id === id)

// Saved ids -> valid, unique, capped.
export function cleanWidgetIds(ids, defs = WIDGET_DEFS) {
  const out = []
  for (const id of Array.isArray(ids) ? ids : []) if (known(id, defs) && !out.includes(id)) out.push(id)
  return out.slice(0, MAX_WIDGETS)
}

// Add when missing (ignored once MAX_WIDGETS is reached), remove when present.
export function toggleWidgetId(ids, id, defs = WIDGET_DEFS) {
  const list = cleanWidgetIds(ids, defs)
  if (!known(id, defs)) return list
  if (list.includes(id)) return list.filter((x) => x !== id)
  return list.length >= MAX_WIDGETS ? list : [...list, id]
}

// The widgets to draw: saved order, only those whose app the user can open. `has(appId)` -> boolean.
export function visibleWidgets(ids, has, defs = WIDGET_DEFS) {
  return cleanWidgetIds(ids, defs).map((id) => defs.find((d) => d.id === id)).filter((d) => has(d.appId))
}

// Today's tasks: { done, total, percent }.
export function todayProgress(tasks = [], today) {
  const list = tasks.filter((t) => t.date === today)
  const done = list.filter((t) => t.done).length
  return { done, total: list.length, percent: list.length ? Math.round((done / list.length) * 100) : 0 }
}
