import { describe, it, expect } from 'vitest'
import { GAME_ASSETS, localMapPath, mapStoragePath } from './assetManifest'

describe('GAME_ASSETS storage paths', () => {
  it('has no entry still pointing at the legacy sprites/tilesets, sprites/objects, or sprites/characters prefixes', () => {
    const legacy = GAME_ASSETS.filter((a) =>
      a.storagePath?.startsWith('sprites/tilesets/') ||
      a.storagePath?.startsWith('sprites/objects/') ||
      a.storagePath?.startsWith('sprites/characters/')
    )
    expect(legacy).toEqual([])
  })

  it('MBTI character entries use the rc/characters/ prefix', () => {
    const enfj = GAME_ASSETS.find((a) => a.key === 'ENFJ')
    expect(enfj.storagePath).toBe('rc/characters/ENFJ.png')
  })

  it('no longer ships the farm crops sheet or the Personal Map', () => {
    expect(GAME_ASSETS.find((a) => a.key === 'crops')).toBeUndefined()
    expect(GAME_ASSETS.find((a) => a.key === 'test3')).toBeUndefined()
  })
})

describe('localMapPath', () => {
  it('returns the public/ path for maps shipped with the repo', () => {
    expect(localMapPath('room')).toBe('/maps/room.json')
    expect(localMapPath('indoor')).toBe('/maps/indoor.json')
  })

  it('returns null for cloud-only (uploaded) maps', () => {
    expect(localMapPath('test2')).toBe(null)
  })

  it('returns null for non-map asset keys', () => {
    expect(localMapPath('Grass')).toBe(null)
  })
})

describe('School Hub tileset', () => {
  it('is declared as a Storage-backed image with a local fallback', () => {
    const entry = GAME_ASSETS.find((a) => a.key === 'School Hub Tiles')
    expect(entry).toMatchObject({
      type: 'image',
      storagePath: 'rc/tilesets/school_hub_tiles.png',
      localPath: '/assets/rc/school_hub_tiles.png',
    })
  })
})

describe('School Hub map path', () => {
  it('is versioned so a stale copy of the old map in Storage can never be paired with the new tileset', () => {
    const entry = GAME_ASSETS.find((a) => a.key === 'school_hub')
    expect(entry.storagePath).toBe('maps/school_hub_v2.json')
    expect(entry.localPath).toBe('/maps/school_hub.json')
  })
})

describe('study room assets', () => {
  it('declares the room map, tileset, furniture and focus art', () => {
    const by = (k) => GAME_ASSETS.find((a) => a.key === k)
    expect(by('room')).toMatchObject({ type: 'tilemapJSON', storagePath: 'maps/room_v1.json', localPath: '/maps/room.json' })
    expect(by('Room Tiles')).toMatchObject({ type: 'image', storagePath: 'rc/tilesets/room_tiles.png', localPath: '/assets/rc/room_tiles.png' })
    expect(by('room_items')).toMatchObject({ type: 'spritesheet', frameConfig: { frameWidth: 32, frameHeight: 32 }, localPath: '/assets/rc/room_items.png' })
    expect(by('focus_art')).toMatchObject({ type: 'spritesheet', frameConfig: { frameWidth: 48, frameHeight: 48 }, localPath: '/assets/rc/focus.png' })
  })
})

describe('mapStoragePath', () => {
  it('uses the manifest path for shipped maps, so versioned paths really are loaded', () => {
    expect(mapStoragePath('room')).toBe('maps/room_v1.json')
    expect(mapStoragePath('school_hub')).toBe('maps/school_hub_v2.json')
  })

  it('falls back to maps/<key>.json for uploaded maps', () => {
    expect(mapStoragePath('custom_map')).toBe('maps/custom_map.json')
  })

  it('does not treat a non-map asset key as a map', () => {
    expect(mapStoragePath('Grass')).toBe('maps/Grass.json')
  })
})
