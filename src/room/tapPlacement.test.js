import { describe, it, expect } from 'vitest'
import { resolveTap } from './tapPlacement'
import { ROOM_CATALOG } from '../data/roomCatalogSeed'

const layout = (placed) => ({ tier: 0, theme: 'minimal', petId: null, placed })
const desk = { itemId: 'desk_basic', x: 96, y: 32 }
const base = { catalog: ROOM_CATALOG }

describe('resolveTap with an item selected', () => {
  it('centres a floor item footprint on the tap and snaps to the 8 px grid', () => {
    // chair is 1x1 tile: tap (60, 70) -> top-left (52, 62) -> snapped (56, 64)
    expect(resolveTap({ ...base, layout: layout([]), selected: 'chair_basic', x: 60, y: 70 })).toEqual({
      kind: 'place', itemId: 'chair_basic', x: 56, y: 64,
    })
    // desk is 2x1: tap (80, 40) -> top-left (64, 32)
    expect(resolveTap({ ...base, layout: layout([]), selected: 'desk_basic', x: 80, y: 40 })).toEqual({
      kind: 'place', itemId: 'desk_basic', x: 64, y: 32,
    })
  })

  it('puts a desk item in the slot under the tap, using the desk position', () => {
    const l = layout([desk])
    expect(resolveTap({ ...base, layout: l, selected: 'lamp_desk', x: 100, y: 40 })).toEqual({ kind: 'place', itemId: 'lamp_desk', x: 96, y: 32, slot: 'left' })
    expect(resolveTap({ ...base, layout: l, selected: 'lamp_desk', x: 112, y: 40 })).toEqual({ kind: 'place', itemId: 'lamp_desk', x: 96, y: 32, slot: 'centre' })
    expect(resolveTap({ ...base, layout: l, selected: 'lamp_desk', x: 124, y: 40 })).toEqual({ kind: 'place', itemId: 'lamp_desk', x: 96, y: 32, slot: 'right' })
  })

  it('uses the back slot when the tap is at the far edge of the desk', () => {
    expect(resolveTap({ ...base, layout: layout([desk]), selected: 'mug', x: 112, y: 25 })).toMatchObject({ kind: 'place', slot: 'back' })
  })

  it('refuses a desk item tapped away from any desk', () => {
    expect(resolveTap({ ...base, layout: layout([desk]), selected: 'lamp_desk', x: 20, y: 100 })).toEqual({ kind: 'none', reason: 'bad_slot' })
  })
})

describe('resolveTap with nothing selected', () => {
  it('picks up the placed item under the tap', () => {
    const l = layout([{ itemId: 'chair_basic', x: 32, y: 32 }, { itemId: 'bed_basic', x: 64, y: 64 }])
    expect(resolveTap({ ...base, layout: l, selected: null, x: 40, y: 40 })).toEqual({ kind: 'pickup', index: 0 })
    expect(resolveTap({ ...base, layout: l, selected: null, x: 80, y: 70 })).toEqual({ kind: 'pickup', index: 1 })
  })

  it('prefers the item drawn on top when two overlap (a rug under a chair)', () => {
    const l = layout([{ itemId: 'rug_round', x: 32, y: 32 }, { itemId: 'chair_basic', x: 40, y: 40 }])
    expect(resolveTap({ ...base, layout: l, selected: null, x: 44, y: 44 })).toEqual({ kind: 'pickup', index: 1 })
  })

  it('picks up a desk item before the desk under it', () => {
    const l = layout([desk, { itemId: 'lamp_desk', x: 96, y: 32, slot: 'left' }])
    expect(resolveTap({ ...base, layout: l, selected: null, x: 104, y: 24 })).toEqual({ kind: 'pickup', index: 1 })
  })

  it('does nothing on an empty spot', () => {
    expect(resolveTap({ ...base, layout: layout([]), selected: null, x: 40, y: 40 })).toEqual({ kind: 'none' })
  })

  it('ignores placed items the catalog no longer has', () => {
    const l = layout([{ itemId: 'ghost', x: 32, y: 32 }])
    expect(resolveTap({ ...base, layout: l, selected: null, x: 40, y: 40 })).toEqual({ kind: 'none' })
  })
})
