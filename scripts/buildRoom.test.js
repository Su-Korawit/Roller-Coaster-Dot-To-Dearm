import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildRoom, W, H, DOORS } from './buildRoom.mjs'
import { TILE_NAMES, FIRSTGID } from './art/families/room.mjs'
import { parseMapMeta } from '../src/utils/tiledMapMeta'
import { DEFAULT_MAP_CONFIGS } from '../src/utils/mapConfig'
import { TIER_AREAS } from '../src/room/placement'

const { map } = buildRoom()
const layer = (name) => map.layers.find((l) => l.name === name)
const meta = parseMapMeta(map)
const T = 16
const G = Object.fromEntries(TILE_NAMES.map((n, i) => [n, FIRSTGID + i]))
const sfx = (tier) => (tier === 0 ? '' : `_t${tier}`)
const at = (name, x, y) => layer(name).data[y * W + x]
const inAny = (areas, x, y) => areas.some((a) => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h)

describe('room map', () => {
  it('is one 20x19 Tiled map with a shell per tier and the objects the scene needs', () => {
    expect([map.width, map.height, W, H]).toEqual([20, 19, 20, 19])
    expect(map.layers.map((l) => l.name)).toEqual([
      'Floor', 'Wall', 'Decor', 'Floor_t1', 'Wall_t1', 'Decor_t1', 'Floor_t2', 'Wall_t2', 'Decor_t2', 'Floor_t3', 'Wall_t3', 'Decor_t3',
      'Portals', 'Spawns', 'Interactions',
    ])
    for (const l of map.layers.filter((x) => x.type === 'tilelayer')) expect(l.data).toHaveLength(W * H)
  })

  it('only uses gids from the Room Tiles tileset, declared once', () => {
    const [ts] = map.tilesets
    expect(map.tilesets).toHaveLength(1)
    expect(ts).toMatchObject({ name: 'Room Tiles', firstgid: FIRSTGID, columns: 16, tilecount: TILE_NAMES.length, tilewidth: 16 })
    const max = FIRSTGID + TILE_NAMES.length - 1
    for (const l of map.layers.filter((x) => x.type === 'tilelayer')) for (const g of l.data) if (g) expect(g).toBeLessThanOrEqual(max)
    expect(DEFAULT_MAP_CONFIGS.room.tilesets).toEqual({ 'Room Tiles': 'rc/tilesets/room_tiles.png' })
  })

  it.each([0, 1, 2, 3])('tier %i: the floor covers exactly the owned areas', (tier) => {
    const floor = layer(`Floor${sfx(tier)}`).data
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      expect(floor[y * W + x] > 0, `${x},${y}`).toBe(inAny(TIER_AREAS[tier], x, y))
    }
  })

  it.each([0, 1, 2, 3])('tier %i: nothing is drawn outside the owned areas', (tier) => {
    for (const base of ['Wall', 'Decor']) {
      const data = layer(`${base}${sfx(tier)}`).data
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[y * W + x]) expect(inAny(TIER_AREAS[tier], x, y), `${base} ${x},${y}`).toBe(true)
    }
  })

  it('the starter shell (tier 0) is the part 1 room: 11x9, door at x=5, two windows', () => {
    expect(at('Wall', 5, 8)).toBe(G.door)
    expect(layer('Wall').data.filter((g) => g === G.window_day)).toHaveLength(2)
    expect(at('Wall', 0, 0)).toBe(G.wall_minimal_tl)
    expect(at('Wall', 10, 0)).toBe(G.wall_minimal_tr)
    expect(at('Wall', 11, 0)).toBe(0)
  })

  it('has the hub door of every tier in its bottom wall, and only one door per shell', () => {
    for (const tier of [0, 1, 2, 3]) {
      const d = DOORS[tier]
      expect(at(`Wall${sfx(tier)}`, d.x, d.y), `tier ${tier}`).toBe(G.door)
      expect(layer(`Wall${sfx(tier)}`).data.filter((g) => g === G.door)).toHaveLength(1)
    }
  })

  it('tier 2 opens the east wall onto a railed balcony; tier 3 joins a second room through both walls', () => {
    expect(at('Wall_t2', 13, 4)).toBe(0)
    expect(at('Wall_t2', 13, 5)).toBe(0)
    expect(at('Wall_t2', 13, 3)).toBe(G.wall_minimal_r)
    expect(at('Floor_t2', 14, 4)).toBe(G.balcony_floor)
    expect(at('Wall_t2', 19, 4)).toBe(G.rail_r)
    expect(at('Wall_t2', 14, 1)).toBe(G.rail_t)
    expect(at('Wall_t3', 6, 9)).toBe(0)
    expect(at('Wall_t3', 7, 10)).toBe(0)
    expect(at('Wall_t3', 5, 9)).toBe(G.wall_minimal_b)
    expect(at('Wall_t1', 13, 4)).toBe(G.wall_minimal_r)
  })

  it('collides only with the Wall layers of every shell', () => {
    expect(DEFAULT_MAP_CONFIGS.room.collision).toEqual({ Wall: true, Wall_t1: true, Wall_t2: true, Wall_t3: true })
    expect(DEFAULT_MAP_CONFIGS.room).toMatchObject({ room: true, isEntry: true, editable: false, multiplayer: false, defaultSpawn: 'entry' })
  })

  it.each([0, 1, 2, 3])('tier %i: the spawn, the desk seat, the hub door and every area are reachable on foot', (tier) => {
    const wall = layer(`Wall${sfx(tier)}`).data
    const floor = layer(`Floor${sfx(tier)}`).data
    const blocked = (tx, ty) => tx < 0 || ty < 0 || tx >= W || ty >= H || wall[ty * W + tx] > 0 || floor[ty * W + tx] === 0
    const spawn = meta.spawns.find((s) => s.name === (tier === 0 ? 'entry' : `entry_t${tier}`))
    const sx = Math.floor(spawn.x / T)
    const sy = Math.floor(spawn.y / T)
    expect(blocked(sx, sy)).toBe(false)
    const seen = new Set([`${sx},${sy}`])
    const queue = [[sx, sy]]
    while (queue.length) {
      const [x, y] = queue.shift()
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx
        const ny = y + dy
        if (!blocked(nx, ny) && !seen.has(`${nx},${ny}`)) { seen.add(`${nx},${ny}`); queue.push([nx, ny]) }
      }
    }
    const seat = meta.interactions.find((i) => i.action === 'roomSeat')
    expect(seen.has(`${Math.floor((seat.x + seat.width / 2) / T)},${Math.floor((seat.y + seat.height / 2) / T)}`)).toBe(true)
    const portal = meta.portals.find((p) => p.tier === tier)
    expect(seen.has(`${Math.floor(portal.x / T)},${Math.floor(portal.y / T)}`), 'hub door').toBe(true)
    // every walkable tile of the tier is reachable (no sealed rooms, the balcony and second room included)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!blocked(x, y)) expect(seen.has(`${x},${y}`), `${x},${y}`).toBe(true)
  })

  it('tags one hub portal per tier and one entry spawn per tier', () => {
    expect(meta.portals.map((p) => [p.tier, p.target])).toEqual([[0, 'school_hub'], [1, 'school_hub'], [2, 'school_hub'], [3, 'school_hub']])
    expect(meta.spawns.map((s) => s.name)).toEqual(['entry', 'entry_t1', 'entry_t2', 'entry_t3'])
    expect(meta.defaultSpawnName).toBe('entry')
  })

  it('is deterministic and the checked-in JSON matches the generator', () => {
    expect(JSON.parse(JSON.stringify(buildRoom().map))).toEqual(JSON.parse(JSON.stringify(map)))
    const onDisk = JSON.parse(readFileSync(new URL('../public/maps/room.json', import.meta.url), 'utf8'))
    expect(onDisk).toEqual(JSON.parse(JSON.stringify(map)))
  })
})
