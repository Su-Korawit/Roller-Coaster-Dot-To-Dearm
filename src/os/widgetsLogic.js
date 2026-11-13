// Home-screen widgets: small live cards that belong to an app. Pure logic for the registry, the
// layout and the numbers they show. The user's choice is an ordered list of ids in useOsStore; the
// cards themselves are in WidgetCards.jsx.
//
// Sizes follow the phone convention: 'small' = a 2-column square-ish card with ONE key number,
// 'medium' = a 4-column card with a few rows and several tap targets. Every widget shows something that
// changes (days left, tasks, minutes), never just a shortcut to the app.
import { shiftKey } from './lifeLogic'
import { weekStartKey } from './studyPlan'

export const MAX_WIDGETS = 4
export const DEFAULT_WIDGETS = ['exam-next']
export const SPAN = { small: 2, medium: 4 }   // columns of the Home grid

// id = widget id, appId = the app it opens (and must be available for the widget to show).
export const WIDGET_DEFS = [
  { id: 'exam-next', appId: 'countdown', size: 'small', tone: 'health', name: 'สอบถัดไป', hint: 'วันที่เหลือถึงวิชาสอบที่ใกล้ที่สุด' },
  { id: 'exam-list', appId: 'countdown', size: 'medium', tone: 'health', name: 'ตารางสอบ 3 วิชาถัดไป', hint: 'วิชา วันสอบ และคาบ ของ 3 วิชาที่ใกล้ที่สุด' },
  { id: 'plan-today', appId: 'habit', size: 'medium', tone: 'earth', name: 'แผนวันนี้', hint: 'ติ๊กงานของวันนี้ได้จากหน้า Home เลย' },
  { id: 'reading-week', appId: 'reading', size: 'medium', tone: 'sci', name: 'อ่านหนังสือสัปดาห์นี้', hint: 'กราฟเวลาอ่านรายวัน และวันต่อเนื่อง' },
  { id: 'portfolio', appId: 'countdown', size: 'small', tone: 'biz', name: 'ยื่นพอร์ต', hint: 'วันส่งแฟ้มรอบ 1 ที่ใกล้ที่สุดของเป้าหมาย' },
  { id: 'secretary', appId: 'secretary', size: 'small', tone: 'brand', name: 'โควตาเลขา AI', hint: 'ข้อความที่เหลือกับพี่ใจดีวันนี้' },
]

// Ids used by the first version of widgets.
const LEGACY = { countdown: 'exam-next', habit: 'plan-today', reading: 'reading-week' }

const known = (id, defs) => defs.some((d) => d.id === id)

// Saved ids -> valid, unique, capped (old ids are renamed).
export function cleanWidgetIds(ids, defs = WIDGET_DEFS) {
  const out = []
  for (const raw of Array.isArray(ids) ? ids : []) {
    const id = LEGACY[raw] ?? raw
    if (known(id, defs) && !out.includes(id)) out.push(id)
  }
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

// Grid columns a widget takes on a Home grid of `cols` columns (never more than the grid has).
export const widgetSpan = (size, cols) => Math.min(cols, SPAN[size] ?? SPAN.small)

// Today's tasks: { done, total, percent }.
export function todayProgress(tasks = [], today) {
  const list = tasks.filter((t) => t.date === today)
  const done = list.filter((t) => t.done).length
  return { done, total: list.length, percent: list.length ? Math.round((done / list.length) * 100) : 0 }
}

// Up to `n` of today's tasks, unfinished first (keeps the saved order inside each group).
export function todayTasks(tasks = [], today, n = 3) {
  const list = tasks.filter((t) => t.date === today)
  return [...list.filter((t) => !t.done), ...list.filter((t) => t.done)].slice(0, n)
}

// Monday..Sunday of this week: [{ key, minutes, future, today }] from a { 'YYYY-MM-DD': minutes } log.
export function weekBars(readLog = {}, today) {
  const start = weekStartKey(today)
  return Array.from({ length: 7 }, (_, i) => {
    const key = shiftKey(start, i)
    const m = readLog[key]
    return { key, minutes: Number.isFinite(m) && m > 0 ? m : 0, future: key > today, today: key === today }
  })
}

// Bar heights 0..1. Scaled to the longest day, but never below `floor` minutes so one short day is not a full bar.
export function barRatios(bars, floor = 60) {
  const top = Math.max(floor, ...bars.map((b) => b.minutes))
  return bars.map((b) => b.minutes / top)
}

// 0..1 ring fill for "days left": empty when 100+ days away, full on the day.
export const urgencyRing = (days, horizon = 100) => (days == null ? 0 : Math.max(0, Math.min(1, 1 - days / horizon)))
