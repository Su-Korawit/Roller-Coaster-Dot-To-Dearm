// src/game/assetManifest.test.js
import { describe, it, expect } from 'vitest'
import { GAME_ASSETS } from './assetManifest'

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
