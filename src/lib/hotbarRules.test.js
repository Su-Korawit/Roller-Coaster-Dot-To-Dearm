import { describe, it, expect } from 'vitest'
import { SLOTS, defaultHotbar, normalizeHotbar, swapSlots, placeFromBag } from './hotbarRules'
import { HOTBAR_ITEMS, BAG_ONLY_ITEMS } from '../constants/hotbarItems'

const ALL = { ...HOTBAR_ITEMS, ...BAG_ONLY_ITEMS }
const ready = (id) => ALL[id]?.ready === true
const valid = (ids) => ids.length === SLOTS && new Set(ids).size === SLOTS && ids.includes('warp')

describe('defaultHotbar', () => {
  it('puts the plan in slot 3 now that it is ready', () => {
    expect(defaultHotbar(ready)).toEqual(['focus', 'warp', 'plan', 'tasks', 'letter', 'shop', 'wardrobe'])
  })
  it('falls back to the calendar in slot 3 while plan is not ready', () => {
    expect(defaultHotbar((id) => id !== 'plan' && ready(id))).toEqual(['focus', 'warp', 'calendar', 'tasks', 'letter', 'shop', 'wardrobe'])
  })
  it('puts plan in slot 3 once ready', () => {
    expect(defaultHotbar(() => true)[2]).toBe('plan')
  })
})

describe('normalizeHotbar', () => {
  it.each([
    ['undefined', undefined], ['null', null], ['a string', 'x'], ['empty', []],
    ['too long', ['focus', 'warp', 'calendar', 'tasks', 'letter', 'shop', 'wardrobe', 'x', 'y']],
    ['duplicates', ['focus', 'focus', 'focus', 'tasks', 'letter', 'shop', 'wardrobe']],
    ['unknown ids', ['a', 'b', 'c', 'd', 'e', 'f', 'g']],
    ['not-ready plan', ['focus', 'warp', 'plan', 'tasks', 'letter', 'shop', 'wardrobe']],
    ['numbers', [1, 2, 3, 4, 5, 6, 7]],
  ])('repairs %s into a valid bar', (_n, input) => {
    const out = normalizeHotbar(input, ready)
    expect(valid(out)).toBe(true)
    expect(out.every(ready)).toBe(true)
  })

  it('inserts warp when it is missing, keeping focus', () => {
    const out = normalizeHotbar(['focus', 'tasks', 'letter', 'shop', 'wardrobe', 'calendar', 'mastery'], ready)
    expect(valid(out)).toBe(true)
    expect(out[0]).toBe('focus')
  })

  it('keeps a valid custom bar as it is', () => {
    const bar = ['tasks', 'warp', 'focus', 'letter', 'shop', 'wardrobe', 'calendar']
    expect(normalizeHotbar(bar, ready)).toEqual(bar)
  })
})

describe('swapSlots', () => {
  const bar = defaultHotbar(ready)
  it('swaps two slots and keeps warp', () => {
    const out = swapSlots(bar, 1, 4)
    expect(out[1]).toBe('letter')
    expect(out[4]).toBe('warp')
  })
  it('same index or bad index is a no-op', () => {
    expect(swapSlots(bar, 2, 2)).toEqual(bar)
    expect(swapSlots(bar, -1, 2)).toEqual(bar)
    expect(swapSlots(bar, 0, 9)).toEqual(bar)
  })
})

describe('placeFromBag', () => {
  const bar = defaultHotbar(ready)
  it('puts a bag-only item into a slot and drops the old occupant', () => {
    const out = placeFromBag(bar, 'mastery', 0, ready)
    expect(out[0]).toBe('mastery')
    expect(out.includes('focus')).toBe(false)
    expect(valid(out)).toBe(true)
  })
  it('moves an item already on the bar, swapping with the occupant', () => {
    const out = placeFromBag(bar, 'shop', 0, ready)
    expect(out[0]).toBe('shop')
    expect(out[5]).toBe('focus')
  })
  it('refuses to displace warp with an item from outside the bar', () => {
    expect(placeFromBag(bar, 'mastery', 1, ready)).toEqual(bar)
  })
  it('refuses an item that is not ready or unknown', () => {
    expect(placeFromBag(bar, 'plan', 0, (id) => id !== 'plan' && ready(id))).toEqual(bar)
    expect(placeFromBag(bar, 'nope', 0, ready)).toEqual(bar)
  })
})
