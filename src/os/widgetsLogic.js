// Home-screen widgets: small live cards that belong to an app. Pure logic for the registry, the
// layout and the numbers they show. The user's choice is an ordered list of ids in useOsStore; the
// cards themselves are in WidgetCards.jsx.
//
// Sizes follow the phone convention: 'small' = a 2-column card with ONE key number, 'medium' = a
// 4-column card with a few rows and several tap targets, 'large' = 4 columns x 2 rows with the whole
// picture. Every widget shows something that changes (days left, tasks, minutes), never just a shortcut.
import { shiftKey } from './lifeLogic'
import { weekStartKey } from './studyPlan'

export const MAX_WIDGETS = 6
export const DEFAULT_WIDGETS = ['countdown:small']
export const SIZES = ['small', 'medium', 'large']
export const SIZE_LABEL = { small: 'เล็ก', medium: 'กลาง', large: 'ใหญ่' }
export const SPAN = { small: 2, medium: 4, large: 4 }   // columns of the Home grid
export const ROWS = { small: 1, medium: 1, large: 2 }   // rows of the Home grid

// One widget family per app; each comes in several sizes and the user picks the size (like a phone).
// A widget on Home is identified by `<family>:<size>`. appId = the app it opens (must be available).
export const WIDGET_FAMILIES = [
  { id: 'countdown', appId: 'countdown', tone: 'health', name: 'นับถอยหลังสอบ', hint: 'สอบถัดไป · ตารางสอบ · สรุปทั้งหมดพร้อมยื่นพอร์ต', sizes: ['small', 'medium', 'large'] },
  { id: 'plan', appId: 'habit', tone: 'earth', name: 'แผนวันนี้', hint: 'ความคืบหน้า · ติ๊กงานจากหน้า Home ได้เลย', sizes: ['small', 'medium', 'large'] },
  { id: 'reading', appId: 'reading', tone: 'sci', name: 'อ่านหนังสือ', hint: 'เวลาและวันต่อเนื่อง · กราฟรายวัน · สถิติสัปดาห์', sizes: ['small', 'medium', 'large'] },
  { id: 'portfolio', appId: 'countdown', tone: 'biz', name: 'ยื่นพอร์ต', hint: 'วันส่งแฟ้มรอบ 1 ที่ใกล้ที่สุดของเป้าหมาย', sizes: ['small', 'medium'] },
  { id: 'secretary', appId: 'secretary', tone: 'brand', name: 'เลขา AI', hint: 'โควตาข้อความที่เหลือกับพี่ใจดี', sizes: ['small', 'medium'] },
]

export const widgetId = (family, size) => `${family}:${size}`

// Flat list of every widget that can be placed: { id, family, size, appId, tone, name, hint }.
export const WIDGET_DEFS = WIDGET_FAMILIES.flatMap((f) => f.sizes.map((size) => ({ id: widgetId(f.id, size), family: f.id, size, appId: f.appId, tone: f.tone, name: f.name, hint: f.hint })))

// Ids used by earlier versions.
const LEGACY = {
  countdown: 'countdown:small', habit: 'plan:medium', reading: 'reading:medium',
  'exam-next': 'countdown:small', 'exam-list': 'countdown:medium', 'plan-today': 'plan:medium',
  'reading-week': 'reading:medium', portfolio: 'portfolio:small', secretary: 'secretary:small',
}

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
export const widgetRows = (size) => ROWS[size] ?? 1

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

// Totals of a weekBars() list: { total, activeDays, avg (per active day), best (minutes) }.
export function weekStats(bars) {
  const active = bars.filter((b) => b.minutes > 0)
  const total = active.reduce((a, b) => a + b.minutes, 0)
  return { total, activeDays: active.length, avg: active.length ? Math.round(total / active.length) : 0, best: Math.max(0, ...bars.map((b) => b.minutes)) }
}
