// What the studygram card shows (layout B of the spec: the picture is the hero, one big number, a
// small tag). Pure: a list of layers in drawing order that src/lib/renderCard.js paints on a canvas.
// Nothing about the person (name, school, e-mail, id) ever enters this list: it is built from named
// inputs only, so whatever else a caller has at hand cannot leak onto an image that gets posted.
import { ROOM_ITEM_ROWS } from '../game/roomRender'

export const CARD_W = 1080
export const CARD_H = 1350 // 4:5, the Instagram portrait size

export function timeOfDay(now) {
  const h = now instanceof Date && !Number.isNaN(now.getTime()) ? now.getHours() : 12
  if (h >= 5 && h < 9) return 'morning'
  if (h >= 9 && h < 16) return 'day'
  if (h >= 16 && h < 19) return 'evening'
  if (h >= 19 || h < 5) return 'night'
  return 'day'
}

const whole = (m) => (Number.isFinite(m) && m > 0 ? Math.floor(m) : 0)

// "1h 25m", "25m", "2h"
export function formatMinutes(min) {
  const m = whole(min)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}m`
  return r === 0 ? `${h}h` : `${h}h ${r}m`
}

// The big number of the card: "2:30 ชม." or "25 นาที".
export function formatDuration(min) {
  const m = whole(min)
  if (m < 60) return { big: String(m), unit: 'นาที' }
  return { big: `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`, unit: 'ชม.' }
}

const SLOTS = ['left', 'centre', 'right', 'back']

export function cardLayers({ now, layout, catalog, inventory, tree, withered = false, pet, strict = false, minutes, dayNumber, showGoal = false, goalText = '', showStreak = false, streak = 0 }) {
  const owned = (id) => Number(inventory?.[id] ?? 0) > 0
  const layers = [
    { kind: 'sky', period: timeOfDay(now) },
    { kind: 'wall', theme: layout?.theme ?? 'minimal' },
    { kind: 'desk' },
  ]

  const placed = Array.isArray(layout?.placed) ? layout.placed : []
  const used = new Set()
  for (const p of placed) {
    const item = p && catalog?.[p.itemId]
    if (!item?.deskSlot || !SLOTS.includes(p.slot) || !owned(p.itemId) || ROOM_ITEM_ROWS[p.itemId] === undefined || used.has(p.slot)) continue
    used.add(p.slot)
    layers.push({ kind: 'item', itemId: p.itemId, slot: p.slot, row: ROOM_ITEM_ROWS[p.itemId], frame: item.frames > 1 ? 1 : 0 })
  }

  layers.push({ kind: 'tree', species: withered ? 'withered' : tree ?? 'sprout', stage: 3 })
  if (pet && catalog?.[pet]?.kind === 'pet' && owned(pet)) layers.push({ kind: 'pet', petId: pet })
  if (strict) layers.push({ kind: 'phone' })

  const { big, unit } = formatDuration(minutes)
  layers.push({ kind: 'text', id: 'tag', text: Number.isInteger(dayNumber) && dayNumber > 0 ? `day ${dayNumber}, ilovetcas.com` : 'ilovetcas.com' })
  layers.push({ kind: 'text', id: 'duration', text: big, unit })
  if (showGoal && typeof goalText === 'string' && goalText.trim()) layers.push({ kind: 'text', id: 'goal', text: goalText.trim() })
  if (showStreak && Number.isInteger(streak) && streak > 0) layers.push({ kind: 'text', id: 'streak', text: `ติดต่อกัน ${streak} วัน` })
  return layers
}
