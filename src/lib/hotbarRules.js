// Pure rules for the 7-slot hotbar: defaults, repairing stored data, and swaps. `warp` must
// always be on the bar (it may move); the Bag button is separate and not one of the 7.
import { ALL_ITEMS } from '../constants/hotbarItems'

export const SLOTS = 7
const readyDefault = (id) => ALL_ITEMS[id]?.ready === true
const ORDER = ['focus', 'warp', 'plan', 'tasks', 'letter', 'shop', 'wardrobe']

export function defaultHotbar(isReady = readyDefault) {
  return ORDER.map((id) => (isReady(id) ? id : id === 'plan' ? 'calendar' : id))
}

export function normalizeHotbar(ids, isReady = readyDefault) {
  const out = []
  if (Array.isArray(ids)) {
    for (const id of ids) {
      if (out.length === SLOTS) break
      if (typeof id === 'string' && isReady(id) && !out.includes(id)) out.push(id)
    }
  }
  for (const id of defaultHotbar(isReady)) {
    if (out.length === SLOTS) break
    if (!out.includes(id)) out.push(id)
  }
  if (!out.includes('warp')) out[out.length === SLOTS ? SLOTS - 1 : out.length] = 'warp'
  return out.slice(0, SLOTS)
}

export function swapSlots(ids, from, to) {
  const ok = (i) => Number.isInteger(i) && i >= 0 && i < SLOTS
  if (!ok(from) || !ok(to) || from === to) return ids
  const out = [...ids]
  ;[out[from], out[to]] = [out[to], out[from]]
  return out
}

// Put `itemId` into `slot`. An item already on the bar swaps places with the occupant;
// one from the Bag replaces the occupant, except that it can never replace `warp`.
export function placeFromBag(ids, itemId, slot, isReady = readyDefault) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOTS || !isReady(itemId)) return ids
  const at = ids.indexOf(itemId)
  if (at >= 0) return swapSlots(ids, at, slot)
  if (ids[slot] === 'warp') return ids
  const out = [...ids]
  out[slot] = itemId
  return out
}
