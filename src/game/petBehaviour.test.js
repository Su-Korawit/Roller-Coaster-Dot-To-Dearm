import { describe, it, expect } from 'vitest'
import { createPet, stepPet, petFloor, petFrame, PET_FRAMES, walkableAt } from './petBehaviour'

const room = { floor: [{ x: 16, y: 32, w: 144, h: 96 }], blocked: [{ x: 64, y: 48, w: 32, h: 32 }], bed: null }
const run = (pet, ms, input = {}, stepMs = 100) => {
  let p = pet
  for (let t = 0; t < ms; t += stepMs) p = stepPet(p, { dt: stepMs, ...input })
  return p
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

describe('petFloor', () => {
  const catalog = {
    desk_basic: { kind: 'desk', footprint: [2, 1] },
    chair_basic: { kind: 'furniture', footprint: [1, 1] },
    rug_round: { kind: 'decor', footprint: [2, 2] },
    pet_bed: { kind: 'decor', footprint: [1, 1] },
  }

  it('is the owned areas without the wall ring and the wall shadow row', () => {
    const { floor } = petFloor({ tier: 0, placed: [], catalog })
    expect(floor).toEqual([{ x: 16, y: 32, w: 9 * 16, h: 6 * 16 }])
  })
  it('tier 2 adds the balcony floor and tier 3 the second room', () => {
    expect(petFloor({ tier: 2, placed: [], catalog }).floor).toHaveLength(2)
    expect(petFloor({ tier: 3, placed: [], catalog }).floor).toHaveLength(3)
  })
  it('blocks furniture and desks but not rugs, and finds the bed', () => {
    const placed = [{ itemId: 'desk_basic', x: 96, y: 32 }, { itemId: 'rug_round', x: 64, y: 80 }, { itemId: 'pet_bed', x: 48, y: 96 }]
    const r = petFloor({ tier: 0, placed, catalog })
    expect(r.blocked).toEqual([{ x: 96, y: 32, w: 32, h: 16 }])
    expect(r.bed).toEqual({ x: 56, y: 104 })
  })
  it('survives unknown items and a missing catalog', () => {
    expect(() => petFloor({ tier: 0, placed: [{ itemId: 'ghost', x: 0, y: 0 }, null], catalog })).not.toThrow()
    expect(() => petFloor({ tier: 0, placed: [], catalog: undefined })).not.toThrow()
  })
})

describe('walkableAt', () => {
  it('is inside a floor rect and outside every blocked one', () => {
    expect(walkableAt(room, 30, 40)).toBe(true)
    expect(walkableAt(room, 70, 60)).toBe(false) // on the blocked rect
    expect(walkableAt(room, 5, 5)).toBe(false) // outside the floor
  })
})

describe('stepPet', () => {
  it('never leaves the floor or enters furniture, over a long time and big time steps', () => {
    let p = createPet({ seed: 1, room })
    for (let i = 0; i < 10000; i += 1) {
      p = stepPet(p, { dt: i % 7 === 0 ? 900 : 60 })
      expect(walkableAt(room, p.x, p.y), `step ${i} at ${p.x},${p.y} (${p.mode})`).toBe(true)
    }
  })

  it('is deterministic for a seed and different for another', () => {
    const a = run(createPet({ seed: 7, room }), 20000)
    const b = run(createPet({ seed: 7, room }), 20000)
    const c = run(createPet({ seed: 8, room }), 20000)
    expect([a.x, a.y, a.mode]).toEqual([b.x, b.y, b.mode])
    expect([a.x, a.y]).not.toEqual([c.x, c.y])
  })

  it('walks, grooms and sleeps over time', () => {
    const modes = new Set()
    let p = createPet({ seed: 3, room })
    for (let i = 0; i < 3000; i += 1) { p = stepPet(p, { dt: 100 }); modes.add(p.mode) }
    for (const m of ['idle', 'wander', 'groom', 'sleep']) expect(modes.has(m), m).toBe(true)
  })

  it('goes to its bed to sleep when it has one', () => {
    const withBed = { ...room, bed: { x: 130, y: 110 } }
    let p = createPet({ seed: 5, room: withBed })
    let slept = null
    for (let i = 0; i < 6000 && !slept; i += 1) { p = stepPet(p, { dt: 100 }); if (p.mode === 'sleep') slept = { x: p.x, y: p.y } }
    expect(slept).not.toBeNull()
    expect(dist(slept, withBed.bed)).toBeLessThan(6)
  })

  it('comes and sits within 24 px of the player while a focus session runs, and goes back to normal after', () => {
    const player = { x: 120, y: 100 }
    let p = run(createPet({ seed: 2, room }), 40000, { focusing: true, playerAt: player })
    expect(p.mode).toBe('sit')
    expect(dist(p, player)).toBeLessThanOrEqual(24)
    p = run(p, 20000, { focusing: false, playerAt: player })
    expect(p.mode).not.toBe('sit')
  })

  it('a tap makes a heart for 1.2 s, then it goes back to what it was doing', () => {
    let p = run(createPet({ seed: 4, room }), 2000)
    p = stepPet(p, { dt: 16, tapped: true })
    expect(p.mode).toBe('heart')
    p = run(p, 1000)
    expect(p.mode).toBe('heart')
    p = run(p, 400)
    expect(p.mode).not.toBe('heart')
  })

  it('a second tap during the heart does not extend it forever', () => {
    let p = stepPet(createPet({ seed: 4, room }), { dt: 16, tapped: true })
    for (let i = 0; i < 20; i += 1) p = stepPet(p, { dt: 100, tapped: i < 3 })
    expect(p.mode).not.toBe('heart')
  })

  it('under reduced motion it never moves, even while the player focuses', () => {
    const start = createPet({ seed: 6, room })
    const p = run(start, 60000, { reducedMotion: true })
    expect([p.x, p.y]).toEqual([start.x, start.y])
    const q = run(start, 60000, { reducedMotion: true, focusing: true, playerAt: { x: 150, y: 110 } })
    expect([q.x, q.y]).toEqual([start.x, start.y])
    expect(['idle', 'groom', 'sleep', 'sit', 'heart']).toContain(q.mode)
  })

  it('stays put (no crash) when there is no walkable floor', () => {
    const none = { floor: [], blocked: [], bed: null }
    const p = run(createPet({ seed: 1, room: none }), 5000)
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
  })

  it('ignores a player position that is outside the floor (it sits as near as it can)', () => {
    const p = run(createPet({ seed: 2, room }), 40000, { focusing: true, playerAt: { x: 900, y: 900 } })
    expect(walkableAt(room, p.x, p.y)).toBe(true)
  })

  it('moves the facing with the direction of travel', () => {
    let p = createPet({ seed: 9, room })
    let sawBoth = new Set()
    for (let i = 0; i < 4000; i += 1) { p = stepPet(p, { dt: 100 }); if (p.mode === 'wander') sawBoth.add(p.facing) }
    expect([...sawBoth].sort()).toEqual([-1, 1])
  })
})

describe('petFrame', () => {
  it('maps modes to the pets sheet frames and alternates walking and grooming', () => {
    const base = { mode: 'idle' }
    expect(petFrame({ ...base, mode: 'idle' }, 0)).toBe(PET_FRAMES.idle)
    expect(petFrame({ ...base, mode: 'sleep' }, 0)).toBe(PET_FRAMES.sleep)
    expect(petFrame({ ...base, mode: 'sit' }, 0)).toBe(PET_FRAMES.sit)
    expect(petFrame({ ...base, mode: 'heart' }, 0)).toBe(PET_FRAMES.sit)
    const walk = [petFrame({ mode: 'wander' }, 0), petFrame({ mode: 'wander' }, 200)]
    expect(new Set(walk)).toEqual(new Set([PET_FRAMES.walkA, PET_FRAMES.walkB]))
    const groom = [petFrame({ mode: 'groom' }, 0), petFrame({ mode: 'groom' }, 400)]
    expect(new Set(groom)).toEqual(new Set([PET_FRAMES.groomA, PET_FRAMES.groomB]))
  })
})
