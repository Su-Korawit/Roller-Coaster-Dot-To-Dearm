import { describe, it, expect } from 'vitest'
import { cardLayers, timeOfDay, formatMinutes, formatDuration, CARD_W, CARD_H } from './cardLayers'
import { ROOM_CATALOG } from '../data/roomCatalogSeed'

const at = (h) => new Date(2026, 9, 24, h, 0, 0)
const layout = {
  tier: 0, theme: 'minimal', petId: 'pet_shiba',
  placed: [
    { itemId: 'desk_basic', x: 96, y: 32 },
    { itemId: 'lamp_desk', x: 96, y: 32, slot: 'left' },
    { itemId: 'mug', x: 96, y: 32, slot: 'right' },
    { itemId: 'plant_small', x: 96, y: 32, slot: 'back' },
    { itemId: 'bed_basic', x: 16, y: 16 },
  ],
}
const inventory = { desk_basic: 1, lamp_desk: 1, mug: 1, plant_small: 1, bed_basic: 1, pet_shiba: 1 }
const base = { now: at(14), layout, catalog: ROOM_CATALOG, inventory, tree: 'tree', pet: 'pet_shiba', strict: false, minutes: 85, dayNumber: 14 }
const kinds = (layers) => layers.map((l) => l.kind)

describe('timeOfDay', () => {
  it.each([[5, 'morning'], [8, 'morning'], [9, 'day'], [15, 'day'], [16, 'evening'], [18, 'evening'], [19, 'night'], [23, 'night'], [0, 'night'], [4, 'night']])('%i:00 is %s', (h, p) => {
    expect(timeOfDay(at(h))).toBe(p)
  })
  it('survives a bad date', () => {
    expect(timeOfDay(new Date('nope'))).toBe('day')
    expect(timeOfDay(undefined)).toBe('day')
  })
})

describe('formatMinutes / formatDuration', () => {
  it.each([[0, '0m'], [25, '25m'], [59, '59m'], [60, '1h'], [85, '1h 25m'], [125, '2h 5m'], [600, '10h']])('%i min -> %s', (m, text) => {
    expect(formatMinutes(m)).toBe(text)
  })
  it('card style: H:MM with hours, minutes alone under an hour', () => {
    expect(formatDuration(150)).toEqual({ big: '2:30', unit: 'ชม.' })
    expect(formatDuration(65)).toEqual({ big: '1:05', unit: 'ชม.' })
    expect(formatDuration(25)).toEqual({ big: '25', unit: 'นาที' })
    expect(formatDuration(0)).toEqual({ big: '0', unit: 'นาที' })
  })
  it('junk becomes zero', () => {
    for (const v of [undefined, null, NaN, -5, 'x']) expect(formatMinutes(v)).toBe('0m')
    expect(formatDuration(-1)).toEqual({ big: '0', unit: 'นาที' })
  })
})

describe('cardLayers', () => {
  it('is a 4:5 frame, 1080x1350', () => {
    expect([CARD_W, CARD_H]).toEqual([1080, 1350])
  })

  it('stacks sky, wall, desk, desk items, tree, pet, then the text, in that order', () => {
    const layers = cardLayers(base)
    const order = kinds(layers)
    const first = (k) => order.indexOf(k)
    expect(order.slice(0, 3)).toEqual(['sky', 'wall', 'desk'])
    expect(first('item')).toBeGreaterThan(first('desk'))
    expect(first('tree')).toBeGreaterThan(order.lastIndexOf('item'))
    expect(first('pet')).toBeGreaterThan(first('tree'))
    expect(first('text')).toBeGreaterThan(first('pet'))
    expect(order.filter((k) => k === 'phone')).toHaveLength(0)
  })

  it('draws only the owned desk items, on their slots (floor furniture is not on the card)', () => {
    const layers = cardLayers({ ...base, inventory: { ...inventory, mug: 0 } })
    const items = layers.filter((l) => l.kind === 'item')
    expect(items.map((i) => [i.itemId, i.slot]).sort()).toEqual([['lamp_desk', 'left'], ['plant_small', 'back']])
  })

  it('lights the lamp frame', () => {
    const lamp = cardLayers(base).find((l) => l.itemId === 'lamp_desk')
    expect(lamp.frame).toBe(1)
  })

  it('skips items missing from the catalog and tolerates a broken layout', () => {
    expect(() => cardLayers({ ...base, layout: { placed: [{ itemId: 'ghost', x: 0, y: 0, slot: 'left' }, null] } })).not.toThrow()
    expect(() => cardLayers({ ...base, layout: undefined, catalog: undefined })).not.toThrow()
    expect(kinds(cardLayers({ ...base, layout: undefined }))).toContain('sky')
  })

  it('an empty room or nothing owned still yields a valid card with its text', () => {
    const layers = cardLayers({ ...base, layout: { placed: [] }, inventory: {}, pet: null })
    expect(kinds(layers)).toEqual(expect.arrayContaining(['sky', 'wall', 'desk', 'tree', 'text']))
    expect(layers.some((l) => l.kind === 'item' || l.kind === 'pet')).toBe(false)
    expect(layers.find((l) => l.id === 'duration')).toBeTruthy()
  })

  it('shows the pet only when it is owned and a pet kind', () => {
    expect(cardLayers({ ...base, inventory: { ...inventory, pet_shiba: 0 } }).some((l) => l.kind === 'pet')).toBe(false)
    expect(cardLayers({ ...base, pet: 'desk_basic' }).some((l) => l.kind === 'pet')).toBe(false)
    expect(cardLayers(base).find((l) => l.kind === 'pet')).toMatchObject({ petId: 'pet_shiba' })
  })

  it('puts a phone face-down only for a strict session', () => {
    expect(cardLayers({ ...base, strict: true }).some((l) => l.kind === 'phone')).toBe(true)
  })

  it('a withered tree is drawn as the withered one', () => {
    expect(cardLayers({ ...base, tree: 'blossom', withered: true }).find((l) => l.kind === 'tree')).toMatchObject({ species: 'withered' })
    expect(cardLayers(base).find((l) => l.kind === 'tree')).toMatchObject({ species: 'tree', stage: 3 })
  })

  it('the sky follows the time of day', () => {
    expect(cardLayers({ ...base, now: at(7) }).find((l) => l.kind === 'sky').period).toBe('morning')
    expect(cardLayers({ ...base, now: at(21) }).find((l) => l.kind === 'sky').period).toBe('night')
  })

  it('texts: big duration, a small day tag, and the optional goal and streak lines', () => {
    const t = (o) => Object.fromEntries(cardLayers({ ...base, ...o }).filter((l) => l.kind === 'text').map((l) => [l.id, l]))
    expect(t({}).duration).toMatchObject({ text: '1:25', unit: 'ชม.' })
    expect(t({}).tag.text).toBe('day 14, ilovetcas.com')
    expect(t({}).goal).toBeUndefined()
    expect(t({}).streak).toBeUndefined()
    expect(t({ showGoal: true, goalText: 'แพทยศาสตร์ จุฬาฯ' }).goal.text).toBe('แพทยศาสตร์ จุฬาฯ')
    expect(t({ showGoal: true, goalText: '' }).goal).toBeUndefined()
    expect(t({ showStreak: true, streak: 14 }).streak.text).toBe('ติดต่อกัน 14 วัน')
    expect(t({ showStreak: true, streak: 0 }).streak).toBeUndefined()
  })

  it('without a day number the tag is just the site', () => {
    const tag = cardLayers({ ...base, dayNumber: undefined }).find((l) => l.id === 'tag')
    expect(tag.text).toBe('ilovetcas.com')
  })

  it('never carries a name, school, e-mail or id, even when the caller passes them', () => {
    const layers = cardLayers({ ...base, displayName: 'Somchai Jaidee', email: 'somchai@example.com', schoolName: 'โรงเรียนสวนกุหลาบ', uid: 'u-123', photoURL: 'https://x/y.png' })
    const json = JSON.stringify(layers)
    for (const secret of ['Somchai', 'example.com', 'สวนกุหลาบ', 'u-123', 'y.png']) expect(json).not.toContain(secret)
  })
})
