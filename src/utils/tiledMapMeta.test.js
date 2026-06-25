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
      { name: 'p1', x: 10, y: 20, width: 16, height: 16, target: 'cave', targetSpawn: 'entry' },
    ])
  })
  it('returns empty spawns/portals and null default when layers absent', () => {
    const m = parseMapMeta({ width: 10, height: 10, tilesets: [], layers: [] })
    expect(m.spawns).toEqual([])
    expect(m.portals).toEqual([])
    expect(m.defaultSpawnName).toBeNull()
  })
})

describe('parseMapMeta farm extensions', () => {
  it('builds a farmTiles set from non-zero FarmGround cells', () => {
    const map = {
      width: 3, height: 2, tilesets: [], layers: [
        { name: 'FarmGround', type: 'tilelayer', data: [0, 7, 0, 0, 0, 9] },
      ],
    }
    const m = parseMapMeta(map)
    expect(m.farmTiles instanceof Set).toBe(true)
    expect([...m.farmTiles].sort()).toEqual(['1_0', '2_1'])
  })

  it('returns an empty farmTiles set when FarmGround layer is absent', () => {
    const m = parseMapMeta({ width: 2, height: 2, tilesets: [], layers: [] })
    expect(m.farmTiles instanceof Set).toBe(true)
    expect(m.farmTiles.size).toBe(0)
  })

  it('parses Interactions objects with action/shopId', () => {
    const map = {
      width: 2, height: 2, tilesets: [], layers: [
        {
          name: 'Interactions', type: 'objectgroup', objects: [
            { x: 32, y: 48, width: 16, height: 16, properties: [{ name: 'action', value: 'shop' }, { name: 'shopId', value: 'seed_shop' }] },
            { x: 80, y: 16, width: 16, height: 16, properties: [{ name: 'action', value: 'chest' }] },
          ],
        },
      ],
    }
    const m = parseMapMeta(map)
    expect(m.interactions).toEqual([
      { x: 32, y: 48, width: 16, height: 16, action: 'shop', shopId: 'seed_shop' },
      { x: 80, y: 16, width: 16, height: 16, action: 'chest', shopId: null },
    ])
  })

  it('returns empty interactions when the layer is absent', () => {
    const m = parseMapMeta({ width: 2, height: 2, tilesets: [], layers: [] })
    expect(m.interactions).toEqual([])
  })
})

describe('parseMapMeta labels', () => {
  it('parses Labels points with text and optional color', () => {
    const map = {
      width: 2, height: 2, tilesets: [], layers: [
        {
          name: 'Labels', type: 'objectgroup', objects: [
            { x: 64, y: 32, properties: [{ name: 'text', value: 'ร้านค้า' }, { name: 'color', value: '#ff0000' }] },
            { x: 128, y: 96, properties: [{ name: 'text', value: 'ทางออก' }] },
          ],
        },
      ],
    }
    const m = parseMapMeta(map)
    expect(m.labels).toEqual([
      { x: 64, y: 32, text: 'ร้านค้า', color: '#ff0000' },
      { x: 128, y: 96, text: 'ทางออก', color: '#000000' },
    ])
  })

  it('returns empty labels when the layer is absent', () => {
    const m = parseMapMeta({ width: 2, height: 2, tilesets: [], layers: [] })
    expect(m.labels).toEqual([])
  })

  it('filters out objects with empty or absent text', () => {
    const map = {
      width: 2, height: 2, tilesets: [], layers: [
        {
          name: 'Labels', type: 'objectgroup', objects: [
            { x: 10, y: 10, properties: [{ name: 'text', value: '' }] },
            { x: 20, y: 20, properties: [] },
            { x: 30, y: 30, properties: [{ name: 'text', value: 'ฟาร์ม' }] },
          ],
        },
      ],
    }
    const m = parseMapMeta(map)
    expect(m.labels).toEqual([
      { x: 30, y: 30, text: 'ฟาร์ม', color: '#000000' },
    ])
  })
})
