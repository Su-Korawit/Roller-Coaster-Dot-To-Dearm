import { describe, it, expect } from 'vitest'
import { buildCampus, collisionGrid, reachable } from './buildCampus.mjs'
import { TILE_NAMES, FIRSTGID } from './art/families/campus.mjs'
import { parseMapMeta } from '../src/utils/tiledMapMeta.js'
import { MAP, PLACEMENTS, SPAWN, BRIDGE, LAKE_TOP, doorTile, hallDoorTile, HALL, footprints, QUADS, PROMENADE_ROWS } from '../src/game/campusLayout.js'

const { map } = buildCampus()
const layer = (name) => map.layers.find((l) => l.name === name)
const G = Object.fromEntries(TILE_NAMES.map((n, i) => [n, FIRSTGID + i]))
const at = (name, x, y) => layer(name).data[y * MAP.w + x]

describe('campus map', () => {
  it('is 107×85 tiles of 16 px with one tileset and the documented layers', () => {
    expect(map.width).toBe(107)
    expect(map.height).toBe(85)
    expect(map.tilewidth).toBe(16)
    expect(map.layers.map((l) => l.name)).toEqual(['Ground', 'Path', 'Water', 'Object', 'Decor', 'Canopy', 'Spawns', 'Interactions'])
    expect(map.tilesets).toHaveLength(1)
    expect(map.tilesets[0]).toMatchObject({ name: 'Campus Tiles', image: 'campus_tiles.png', firstgid: 1, tilecount: TILE_NAMES.length })
  })

  it('every tile layer has width×height cells and only uses gids of the tileset', () => {
    for (const l of map.layers.filter((x) => x.type === 'tilelayer')) {
      expect(l.data).toHaveLength(107 * 85)
      for (const gid of l.data) expect(gid === 0 || (gid >= FIRSTGID && gid < FIRSTGID + TILE_NAMES.length)).toBe(true)
    }
  })

  it('is deterministic: the same build gives the same bytes', () => {
    expect(JSON.stringify(buildCampus().map)).toBe(JSON.stringify(map))
  })

  it('parses with parseMapMeta: a default spawn on the bridge and one door zone per faculty', () => {
    const meta = parseMapMeta(map)
    expect(meta.defaultSpawnName).toBe('entry')
    const spawn = meta.spawns.find((s) => s.name === 'entry')
    expect(Math.floor(spawn.x / 16)).toBe(SPAWN.tx)
    expect(Math.floor(spawn.y / 16)).toBe(SPAWN.ty)
    const doors = meta.interactions.filter((i) => i.action === 'building')
    expect(doors.map((d) => d.buildingId).sort()).toEqual(PLACEMENTS.map((p) => p.id).sort())
    expect(meta.interactions.some((i) => i.action === 'directory')).toBe(true)
  })

  it('door zones are exactly the layout’s strips', () => {
    const meta = parseMapMeta(map)
    for (const p of PLACEMENTS) {
      const t = doorTile(p)
      const d = meta.interactions.find((i) => i.buildingId === p.id)
      expect([d.x, d.y, d.width, d.height]).toEqual([t.x * 16, t.y * 16, t.w * 16, t.h * 16])
    }
  })

  it('the lake fills the south, the bridge crosses it and the promenade runs above', () => {
    for (let x = 0; x < MAP.w; x += 7) {
      if (x >= BRIDGE.x && x < BRIDGE.x + BRIDGE.w) expect(at('Path', x, 75) || at('Ground', x, 75)).toBe(G.bridge_v)
      else expect(at('Water', x, 75) > 0).toBe(true)
    }
    for (const y of PROMENADE_ROWS) expect(at('Path', 20, y) > 0).toBe(true)
    expect(at('Water', 20, LAKE_TOP)).toBe(G.shore_n)
  })

  it('has the central fountain, the stage and the directory board', () => {
    expect(JSON.stringify(layer('Object').data)).toContain(`${G.board}`)
    expect(layer('Object').data.includes(G.fountain_c)).toBe(true)
    expect(layer('Object').data.includes(G.stage_back_m)).toBe(true)
  })

  it('trees keep their tops above the player and their trunks solid', () => {
    expect(layer('Canopy').data.includes(G.tree_tl)).toBe(true)
    expect(layer('Object').data.includes(G.tree_bl)).toBe(true)
  })
})

describe('campus walkability', () => {
  const grid = collisionGrid(map)

  it('the spawn is walkable and nothing solid is on the bridge', () => {
    expect(grid[SPAWN.ty][SPAWN.tx]).toBe(false)
    for (let y = LAKE_TOP; y < MAP.h; y++) for (let x = BRIDGE.x; x < BRIDGE.x + BRIDGE.w; x++) expect(grid[y][x], `${x},${y}`).toBe(false)
  })

  it('a faculty building is solid and the lake is solid', () => {
    const med = PLACEMENTS.find((p) => p.id === 'med')
    expect(grid[med.y + 2][med.x + 2]).toBe(true)
    expect(grid[75][20]).toBe(true)
  })

  it('every door zone and the hall door are reachable from the spawn on foot', () => {
    const reach = reachable(grid, SPAWN)
    for (const p of PLACEMENTS) {
      const t = doorTile(p)
      expect(reach.has(`${t.x},${t.y}`), `${p.id} door`).toBe(true)
      expect(reach.has(`${t.x + 1},${t.y}`), `${p.id} door 2`).toBe(true)
    }
    const hall = hallDoorTile()
    expect(reach.has(`${hall.x},${hall.y}`)).toBe(true)
    const directory = parseMapMeta(map).interactions.find((i) => i.action === 'directory')
    expect(reach.has(`${Math.floor(directory.x / 16)},${Math.floor(directory.y / 16)}`)).toBe(true)
  })

  it('both quad squares can be walked around (the fountain and the stage are solid, their rings are not)', () => {
    const reach = reachable(grid, SPAWN)
    expect(grid[32][26]).toBe(true) // fountain centre
    expect(reach.has('23,32')).toBe(true)
    expect(reach.has('29,32')).toBe(true)
    expect(grid[31][73]).toBe(true) // stage
    expect(reach.has('71,33')).toBe(true)
    expect(reach.has('77,33')).toBe(true)
  })

  it('the player can pass the gate between its pillars but not through them', () => {
    const gate = footprints().filter((r) => r.id.startsWith('gate'))
    const gx = gate[0].x + gate[0].w // first free tile of the gap
    expect(grid[gate[0].y + 1][gx]).toBe(false)
    expect(grid[gate[0].y + 1][gate[0].x]).toBe(true)
  })

  it('no free tile is cut off inside the quads except the sealed building interiors', () => {
    const reach = reachable(grid, SPAWN)
    let cut = 0
    for (let y = QUADS.y; y < QUADS.y + QUADS.h; y++) for (let x = QUADS.west.x; x < QUADS.west.x + QUADS.west.w; x++) if (!grid[y][x] && !reach.has(`${x},${y}`)) cut += 1
    expect(cut).toBe(0)
  })

  it('HALL is on the avenue axis between the quads', () => {
    expect(HALL.x + 3).toBe(50)
  })
})
