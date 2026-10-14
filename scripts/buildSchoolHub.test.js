import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildSchoolHub, W, H, LAYOUT } from './buildSchoolHub.mjs'
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
