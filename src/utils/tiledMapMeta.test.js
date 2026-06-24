import { describe, it, expect } from 'vitest'
import { parseMapMeta } from './tiledMapMeta'

const sampleMap = {
  width: 80, height: 60,
  tilesets: [{ name: 'Grass' }, { name: 'Water' }],
  layers: [
    { name: 'Ground', type: 'tilelayer' },
    {
      name: 'Spawns', type: 'objectgroup',
      objects: [
        { name: 'entry', x: 100, y: 200, properties: [{ name: 'default', value: true }] },
        { name: 'south_gate', x: 300, y: 400 },
      ],
    },
    {
      name: 'Portals', type: 'objectgroup',
      objects: [
        {
          name: 'p1', x: 10, y: 20, width: 16, height: 16,
          properties: [{ name: 'target', value: 'cave' }, { name: 'targetSpawn', value: 'entry' }],
        },
      ],
    },
  ],
}

describe('parseMapMeta', () => {
  it('reads map dimensions and tileset names', () => {
    const m = parseMapMeta(sampleMap)
    expect(m.width).toBe(80)
    expect(m.height).toBe(60)
    expect(m.tilesetNames).toEqual(['Grass', 'Water'])
  })
  it('reads named spawns and marks the default-flagged one', () => {
    const m = parseMapMeta(sampleMap)
    expect(m.spawns).toEqual([
      { name: 'entry', x: 100, y: 200, isDefault: true },
      { name: 'south_gate', x: 300, y: 400, isDefault: false },
    ])
    expect(m.defaultSpawnName).toBe('entry')
  })
  it('falls back to the first spawn when none flagged default', () => {
    const map = { ...sampleMap, layers: [
      { name: 'Spawns', type: 'objectgroup', objects: [{ name: 'a', x: 1, y: 1 }, { name: 'b', x: 2, y: 2 }] },
    ] }
    expect(parseMapMeta(map).defaultSpawnName).toBe('a')
  })
  it('reads portal target and targetSpawn from properties', () => {
    const m = parseMapMeta(sampleMap)
    expect(m.portals).toEqual([
      { x: 10, y: 20, width: 16, height: 16, target: 'cave', targetSpawn: 'entry' },
    ])
  })
  it('returns empty spawns/portals and null default when layers absent', () => {
    const m = parseMapMeta({ width: 10, height: 10, tilesets: [], layers: [] })
    expect(m.spawns).toEqual([])
    expect(m.portals).toEqual([])
    expect(m.defaultSpawnName).toBeNull()
  })
})
