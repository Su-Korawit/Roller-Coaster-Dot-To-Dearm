import { describe, it, expect } from 'vitest'
import { WARP_PLACES, availablePlaces } from './warpPlaces'

const ids = (list) => list.map((p) => p.id)

describe('availablePlaces', () => {
  it('always offers the room; campus only when its map exists; the hub only when signed in', () => {
    expect(ids(availablePlaces({ hasMap: () => false, signedIn: false }))).toEqual(['room'])
    expect(ids(availablePlaces({ hasMap: () => false, signedIn: true }))).toEqual(['room', 'hub'])
    expect(ids(availablePlaces({ hasMap: (k) => k === 'campus', signedIn: true }))).toEqual(['room', 'campus', 'hub'])
  })

  it('every place has a Thai label and a map key', () => {
    for (const p of WARP_PLACES) {
      expect(p.labelTh.length).toBeGreaterThan(0)
      expect(p.mapKey.length).toBeGreaterThan(0)
    }
  })
})
