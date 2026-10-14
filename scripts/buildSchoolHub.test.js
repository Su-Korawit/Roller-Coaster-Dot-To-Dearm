import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildSchoolHub, W, H, LAYOUT, LAWNS } from './buildSchoolHub.mjs'
import { parseMapMeta } from '../src/utils/tiledMapMeta'
import { DEFAULT_MAP_CONFIGS } from '../src/utils/mapConfig'

const { map, unresolvedPathCells, seats } = buildSchoolHub()
const layerData = (name) => map.layers.find((l) => l.name === name).data
const meta = parseMapMeta(map)
const T = 16

// Collision exactly as the game configures it for school_hub (see DEFAULT_MAP_CONFIGS).
const collisionLayers = Object.keys(DEFAULT_MAP_CONFIGS.school_hub.collision)
const blocked = new Set()
for (const name of collisionLayers) {
  layerData(name).forEach((g, i) => { if (g) blocked.add(i) })
}
const walkable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !blocked.has(y * W + x)

function reachableFrom(sx, sy) {
  const seen = new Set([sy * W + sx])
  const queue = [[sx, sy]]
  while (queue.length) {
    const [x, y] = queue.shift()
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy
      if (walkable(nx, ny) && !seen.has(ny * W + nx)) { seen.add(ny * W + nx); queue.push([nx, ny]) }
    }
  }
  return seen
}

const spawn = meta.spawns.find((s) => s.name === meta.defaultSpawnName)
const reach = reachableFrom(Math.floor(spawn.x / T), Math.floor(spawn.y / T))

// A zone is usable if any walkable tile it covers is reachable from spawn.
const zoneReachable = (z) => {
  for (let y = Math.floor(z.y / T); y < Math.ceil((z.y + z.height) / T); y++) {
    for (let x = Math.floor(z.x / T); x < Math.ceil((z.x + z.width) / T); x++) {
      if (reach.has(y * W + x)) return true
    }
  }
  return false
}

describe('school_hub map', () => {
  it('is a well-formed Tiled map: every layer is W*H and gids belong to declared tilesets', () => {
    expect(map.width).toBe(W)
    expect(map.height).toBe(H)
    const firstgids = map.tilesets.map((t) => t.firstgid)
    const last = map.tilesets[map.tilesets.length - 1]
    const maxGid = last.firstgid + last.tilecount - 1
    for (const l of map.layers.filter((x) => x.type === 'tilelayer')) {
      expect(l.data).toHaveLength(W * H)
      for (const g of l.data) {
        if (!g) continue
        expect(g).toBeLessThanOrEqual(maxGid)
        expect(firstgids.some((f) => g >= f)).toBe(true)
      }
    }
  })

  it('declares exactly the tilesets that DEFAULT_MAP_CONFIGS maps to Storage images', () => {
    expect(meta.tilesetNames.sort()).toEqual(Object.keys(DEFAULT_MAP_CONFIGS.school_hub.tilesets).sort())
  })

  it('autotiles every path cell (no 1-wide corridors)', () => {
    expect(unresolvedPathCells).toEqual([])
  })

  it('has a default spawn on walkable ground', () => {
    expect(meta.defaultSpawnName).toBe('entry')
    expect(walkable(Math.floor(spawn.x / T), Math.floor(spawn.y / T))).toBe(true)
  })

  it('exposes the interactions the school world needs', () => {
    const byAction = (a) => meta.interactions.filter((i) => i.action === a)
    expect(byAction('focusSeat')).toHaveLength(8)
    expect(byAction('board').map((b) => b.boardId).sort()).toEqual(['contest', 'leaderboard', 'news'])
    expect(byAction('tool').map((t) => t.route).sort()).toEqual(['/roadmap', 'view:profile'])
    expect(new Set(byAction('focusSeat').map((s) => s.seatId)).size).toBe(8)
  })

  it('every interaction zone and the exit portal can actually be reached on foot from spawn', () => {
    for (const z of meta.interactions) {
      expect(zoneReachable(z), `${z.action}:${z.seatId ?? z.boardId ?? z.route} unreachable`).toBe(true)
    }
    for (const p of meta.portals) expect(zoneReachable(p), `portal ${p.name} unreachable`).toBe(true)
  })

  it('library seats sit on chairs (blocked tiles) with a free tile beside them to stand on', () => {
    for (const s of seats) {
      expect(blocked.has(s.y * W + s.x), `${s.id} chair tile`).toBe(true)
      const sides = [[s.x - 1, s.y], [s.x + 1, s.y]]
      expect(sides.some(([x, y]) => reach.has(y * W + x)), `${s.id} has no reachable side tile`).toBe(true)
    }
  })

  it('closed buildings keep their door tile blocked but the tile in front of it reachable', () => {
    for (const b of [LAYOUT.canteen, LAYOUT.contest, LAYOUT.guidance, LAYOUT.hall]) {
      const doorIdx = (b.y + b.h - 1) * W + b.door
      expect(blocked.has(doorIdx)).toBe(true)
      expect(reach.has((b.y + b.h) * W + b.door)).toBe(true)
    }
  })

  it('the library doorway is walkable so players can go inside', () => {
    const lib = LAYOUT.library
    for (let x = lib.doorway[0]; x <= lib.doorway[1]; x++) {
      expect(reach.has((lib.y + lib.h - 1) * W + x)).toBe(true)
    }
    expect(reach.has((lib.y + 2) * W + lib.doorway[0])).toBe(true)   // inside, in the aisle
  })

  it('keeps non-colliding decoration out of the collision layers (flowers must not block)', () => {
    expect(collisionLayers).not.toContain('Decor')
    expect(layerData('Decor').some(Boolean)).toBe(true)
  })

  it('labels carry Thai text and the checked-in JSON matches the generator output', () => {
    expect(meta.labels.map((l) => l.text)).toContain('ห้องสมุด')
    const onDisk = JSON.parse(readFileSync(new URL('../public/maps/school_hub.json', import.meta.url), 'utf8'))
    expect(onDisk).toEqual(JSON.parse(JSON.stringify(map)))
  })
})

describe('school_hub visual layers (production polish)', () => {
  const at = (name, x, y) => layerData(name)[y * W + x]
  const buildings = Object.values(LAYOUT)

  it('has the full layer stack in draw order, with Canopy and Roof last among the tile layers', () => {
    const tileLayers = map.layers.filter((l) => l.type === 'tilelayer').map((l) => l.name)
    expect(tileLayers).toEqual(['Grass', 'Lawn', 'Path', 'Decor', 'Hill/Wall', 'Object', 'Canopy', 'Roof'])
  })

  it('overhead layers (Canopy, Roof) are visible tile layers that never collide', () => {
    for (const name of ['Canopy', 'Roof']) {
      expect(map.layers.find((l) => l.name === name).visible).toBe(true)
      expect(collisionLayers).not.toContain(name)
    }
  })

  const isOpening = (b, x) => (b.door != null && x === b.door) || (b.doorway && x >= b.doorway[0] && x <= b.doorway[1])

  it('every building has a roof from one row above its top wall down onto the front wall row (the eave)', () => {
    for (const b of buildings) {
      for (let x = b.x; x < b.x + b.w; x++) {
        expect(at('Roof', x, b.y - 1), `roof top ${x},${b.y - 1}`).toBeGreaterThan(0)
        expect(at('Roof', x, b.y + b.h - 2), `roof bottom ${x}`).toBeGreaterThan(0)
        if (!isOpening(b, x)) expect(at('Roof', x, b.y + b.h - 1), `eave ${x}`).toBeGreaterThan(0)
      }
    }
  })

  it('doors and the library doorway stay open in the roof so they can be seen and entered', () => {
    for (const b of buildings) {
      for (let x = b.x; x < b.x + b.w; x++) if (isOpening(b, x)) expect(at('Roof', x, b.y + b.h - 1)).toBe(0)
    }
  })

  it('each roof has exactly one ridge band row (the pack draws one; repeating it stripes the roof)', () => {
    for (const b of buildings) {
      const mid = b.x + 1
      const ridges = []
      for (let y = b.y - 1; y <= b.y + b.h - 1; y++) if (at('Roof', mid, y) === 101) ridges.push(y)
      expect(ridges, b.name ?? 'building').toHaveLength(1)
    }
  })

  it('the library interior is under its roof (so it can fade when the player walks in) and the doorway is not', () => {
    const lib = LAYOUT.library
    expect(at('Roof', lib.doorway[0], lib.y + lib.h - 2)).toBeGreaterThan(0)
    expect(at('Roof', lib.doorway[0], lib.y + lib.h - 1)).toBe(0)
  })

  it('no roof tile exists outside the buildings (roofs form exactly one connected block per building)', () => {
    const roofCells = layerData('Roof').map((g, i) => (g ? i : -1)).filter((i) => i >= 0)
    const inside = (i) => {
      const x = i % W, y = Math.floor(i / W)
      return buildings.some((b) => x >= b.x && x < b.x + b.w && y >= b.y - 1 && y <= b.y + b.h - 1)
    }
    expect(roofCells.every(inside)).toBe(true)
    const openings = buildings.reduce((n, b) => n + (b.door != null ? 1 : b.doorway[1] - b.doorway[0] + 1), 0)
    expect(roofCells.length).toBe(buildings.reduce((n, b) => n + b.w * (b.h + 1), 0) - openings)
  })

  it('every tree canopy tile sits directly above a trunk tile on the Object layer (walk-behind, not floating)', () => {
    const canopy = layerData('Canopy')
    let count = 0
    canopy.forEach((g, i) => {
      if (!g) return
      count += 1
      const x = i % W, y = Math.floor(i / W)
      expect(at('Object', x, y + 1), `trunk under canopy ${x},${y}`).toBeGreaterThan(0)
      expect(at('Object', x, y), `canopy cell ${x},${y} must be walkable ground`).toBe(0)
    })
    expect(count).toBeGreaterThan(100)
  })

  it('garden beds are fully drawn on the Lawn layer (corners, edges, and fill) and carry flowers', () => {
    for (const [lx, ly, lw, lh] of LAWNS) {
      expect(at('Lawn', lx, ly), 'TL').toBe(1)
      expect(at('Lawn', lx + lw - 1, ly), 'TR').toBe(3)
      expect(at('Lawn', lx, ly + lh - 1), 'BL').toBe(23)
      expect(at('Lawn', lx + lw - 1, ly + lh - 1), 'BR').toBe(25)
    }
    expect(layerData('Decor').filter(Boolean).length).toBeGreaterThan(60)
  })

  it('nothing is scattered on a path, and plaza planters leave a 2-wide promenade and an open cross', () => {
    const path = layerData('Path'), object = layerData('Object'), decor = layerData('Decor')
    const NOTICE_BOARD = 20 * W + 27     // the leaderboard board deliberately stands in the plaza
    path.forEach((g, i) => { if (g) { if (i !== NOTICE_BOARD) expect(object[i], `object on path cell ${i}`).toBe(0); expect(decor[i]).toBe(0) } })
    for (let x = 21; x <= 33; x++) expect(path[19 * W + x] || path[22 * W + x]).toBeTruthy()   // lanes stay open
  })

  it('ground has texture: meadow variants are mixed into the base grass', () => {
    const grass = layerData('Grass').filter((g) => g && g !== 97)
    const variants = grass.filter((g) => g !== 13)
    expect(variants.length / grass.length).toBeGreaterThan(0.1)
    expect(variants.length / grass.length).toBeLessThan(0.3)
  })

  it('ambient critters are declared as Critters objects the scene can spawn, all on walkable ground', () => {
    expect(meta.critters.length).toBeGreaterThanOrEqual(6)
    for (const c of meta.critters) {
      expect(['chicken', 'cow']).toContain(c.kind)
      expect(c.radius).toBeGreaterThan(0)
      expect(walkable(Math.floor(c.x / T), Math.floor(c.y / T)), `${c.kind} at ${c.x},${c.y}`).toBe(true)
    }
    expect(DEFAULT_MAP_CONFIGS.school_hub.critters).toBe(true)
  })
})
