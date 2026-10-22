import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildRoom, W, H } from './buildRoom.mjs'
import { TILE_NAMES, FIRSTGID } from './art/families/room.mjs'
import { parseMapMeta } from '../src/utils/tiledMapMeta'
import { DEFAULT_MAP_CONFIGS } from '../src/utils/mapConfig'

const { map } = buildRoom()
const layer = (name) => map.layers.find((l) => l.name === name)
const meta = parseMapMeta(map)
const T = 16
const G = Object.fromEntries(TILE_NAMES.map((n, i) => [n, FIRSTGID + i]))

describe('room map', () => {
  it('is a well-formed 11x9 Tiled map with the layers the scene needs', () => {
    expect([map.width, map.height, W, H]).toEqual([11, 9, 11, 9])
    expect(map.layers.map((l) => l.name)).toEqual(['Floor', 'Wall', 'Decor', 'Portals', 'Spawns', 'Interactions'])
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

  it('floors every cell and walls the border, with a door in the bottom wall', () => {
    const floor = layer('Floor').data
    expect(floor.every(Boolean)).toBe(true)
    const wall = layer('Wall').data
    for (let x = 0; x < W; x++) {
      expect(wall[x], `top ${x}`).toBeGreaterThan(0)
      expect(wall[(H - 1) * W + x], `bottom ${x}`).toBeGreaterThan(0)
    }
    for (let y = 0; y < H; y++) {
      expect(wall[y * W]).toBeGreaterThan(0)
      expect(wall[y * W + W - 1]).toBeGreaterThan(0)
    }
    expect(wall[(H - 1) * W + 5]).toBe(G.door)
    expect(wall.filter((g) => g === G.window_day)).toHaveLength(2)
  })

  it('collides only with the Wall layer', () => {
    expect(DEFAULT_MAP_CONFIGS.room.collision).toEqual({ Wall: true })
    expect(DEFAULT_MAP_CONFIGS.room).toMatchObject({ room: true, isEntry: true, editable: false, multiplayer: false, defaultSpawn: 'entry' })
  })

  it('puts the spawn on walkable floor and the desk seat reachable from it', () => {
    const wall = layer('Wall').data
    const blocked = (tx, ty) => tx < 0 || ty < 0 || tx >= W || ty >= H || wall[ty * W + tx] > 0
    const spawn = meta.spawns.find((s) => s.name === meta.defaultSpawnName)
    expect(spawn.name).toBe('entry')
    const sx = Math.floor(spawn.x / T)
    const sy = Math.floor(spawn.y / T)
    expect(blocked(sx, sy)).toBe(false)
    const seat = meta.interactions.find((i) => i.action === 'roomSeat')
    expect(seat).toBeTruthy()
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
    expect(seen.has(`${Math.floor((seat.x + seat.width / 2) / T)},${Math.floor((seat.y + seat.height / 2) / T)}`)).toBe(true)
  })

  it('has a portal on the door to the School Hub', () => {
    expect(meta.portals).toHaveLength(1)
    expect(meta.portals[0].target).toBe('school_hub')
    expect(Math.floor(meta.portals[0].x / T)).toBe(5)
  })

  it('is deterministic and the checked-in JSON matches the generator', () => {
    expect(JSON.parse(JSON.stringify(buildRoom().map))).toEqual(JSON.parse(JSON.stringify(map)))
    const onDisk = JSON.parse(readFileSync(new URL('../public/maps/room.json', import.meta.url), 'utf8'))
    expect(onDisk).toEqual(JSON.parse(JSON.stringify(map)))
  })
})
