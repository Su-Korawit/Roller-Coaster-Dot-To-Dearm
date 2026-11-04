import { describe, it, expect } from 'vitest'
import {
  MAP, SPRITE, PLACEMENTS, HALL, GATE, SPAWN, BRIDGE, LAKE_TOP, PROMENADE_ROWS,
  doorZone, footprints, doorTile, blockedByFootprints, placementOf, minimapRects,
} from './campusLayout'
import { BUILDING_IDS } from '../constants/openHouseBuildings'

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const inside = (r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= MAP.w && r.y + r.h <= MAP.h

describe('campus layout', () => {
  it('is 107×85 tiles of 16 px with 6×5-tile building sprites', () => {
    expect(MAP).toEqual({ w: 107, h: 85, tile: 16 })
    expect(SPRITE).toEqual({ w: 96, h: 80, tilesW: 6, tilesH: 5 })
  })

  it('places each of the 18 faculty buildings exactly once', () => {
    expect(PLACEMENTS.map((p) => p.id).sort()).toEqual([...BUILDING_IDS].sort())
    expect(PLACEMENTS).toHaveLength(18)
  })

  it('west quad holds health + science/tech, east quad society + business + arts + education, agri on the east edge', () => {
    const west = (id) => placementOf(id).x < MAP.w / 2 - 6
    for (const id of ['med', 'dent', 'pharm', 'vet', 'allied', 'sci', 'it', 'eng', 'arch']) expect(west(id), id).toBe(true)
    for (const id of ['law', 'comm', 'pol', 'hum', 'biz', 'tour', 'fine', 'edu']) expect(west(id), id).toBe(false)
    expect(placementOf('agri').x).toBeGreaterThan(placementOf('edu').x)
  })

  it('the top rows are the layout’s top rows (health / society) and the bottom rows are science / business', () => {
    const top = (id) => placementOf(id).y < 20
    for (const id of ['med', 'dent', 'pharm', 'vet', 'allied', 'law', 'comm', 'pol', 'hum']) expect(top(id), id).toBe(true)
    for (const id of ['sci', 'it', 'eng', 'arch', 'biz', 'tour', 'fine', 'edu']) expect(top(id), id).toBe(false)
  })

  it('every footprint is inside the map and none overlaps another', () => {
    const rects = footprints()
    for (const r of rects) expect(inside(r), JSON.stringify(r)).toBe(true)
    for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) {
      expect(overlap(rects[i], rects[j]), `${rects[i].id} / ${rects[j].id}`).toBe(false)
    }
  })

  it('a door zone is a 2×1-tile strip just below its building, inside the map, outside every footprint', () => {
    for (const p of PLACEMENTS) {
      const z = doorZone(p)
      expect(z).toEqual({ x: (p.x + 2) * 16, y: (p.y + 5) * 16, width: 32, height: 16 })
      const t = doorTile(p)
      expect(t).toEqual({ x: p.x + 2, y: p.y + 5, w: 2, h: 1 })
      expect(inside(t)).toBe(true)
      for (const r of footprints()) expect(overlap(t, r), `${p.id} door in ${r.id}`).toBe(false)
    }
  })

  it('the hall and the gate sit on the avenue; the gate leaves a two-tile gap between its pillars', () => {
    expect(HALL.x + 3).toBe(GATE.x + 3) // same axis
    const pillars = footprints().filter((r) => r.id === 'gate-w' || r.id === 'gate-e')
    expect(pillars).toHaveLength(2)
    const gap = pillars[1].x - (pillars[0].x + pillars[0].w)
    expect(gap).toBe(2)
  })

  it('the spawn is on the bridge, south of the promenade, in the lake', () => {
    expect(SPAWN.ty).toBeGreaterThan(LAKE_TOP)
    expect(SPAWN.tx).toBeGreaterThanOrEqual(BRIDGE.x)
    expect(SPAWN.tx).toBeLessThan(BRIDGE.x + BRIDGE.w)
    expect(PROMENADE_ROWS.every((r) => r < LAKE_TOP)).toBe(true)
  })

  it('blockedByFootprints says whether a tile is under a building', () => {
    const p = placementOf('med')
    expect(blockedByFootprints(p.x + 1, p.y + 1)).toBe(true)
    expect(blockedByFootprints(p.x + 2, p.y + 5)).toBe(false)
  })

  it('minimapRects gives one rect per faculty with its zone colour', () => {
    const rects = minimapRects()
    expect(rects).toHaveLength(18)
    expect(rects.find((r) => r.id === 'med').color).toBe('#E8817B')
    for (const r of rects) expect(r.w).toBeGreaterThan(0)
  })
})
