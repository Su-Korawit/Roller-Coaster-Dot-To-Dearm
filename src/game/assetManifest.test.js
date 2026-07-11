import { describe, it, expect } from 'vitest'
import { GAME_ASSETS, localMapPath } from './assetManifest'

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

  it('the crops spritesheet uses the rc/objects/ prefix', () => {
    const crops = GAME_ASSETS.find((a) => a.key === 'crops')
    expect(crops.storagePath).toBe('rc/objects/Basic_Plants.png')
  })
})

describe('localMapPath', () => {
  it('returns the public/ path for maps shipped with the repo', () => {
    expect(localMapPath('test3')).toBe('/maps/test3.json')
    expect(localMapPath('indoor')).toBe('/maps/indoor.json')
  })

  it('returns null for cloud-only (uploaded) maps', () => {
    expect(localMapPath('test2')).toBe(null)
  })

  it('returns null for non-map asset keys', () => {
    expect(localMapPath('Grass')).toBe(null)
  })
})
