import { describe, it, expect } from 'vitest'
import { toRcPath } from './rcPathRewrite'

describe('toRcPath', () => {
  it('rewrites a sprites/tilesets path to rc/tilesets', () => {
    expect(toRcPath('sprites/tilesets/Grass.png')).toBe('rc/tilesets/Grass.png')
  })

  it('rewrites a sprites/objects path to rc/objects', () => {
    expect(toRcPath('sprites/objects/Chest.png')).toBe('rc/objects/Chest.png')
  })

  it('returns null for a path already under rc/', () => {
    expect(toRcPath('rc/tilesets/Grass.png')).toBeNull()
  })

  it('returns null for an unrelated sprites/ path', () => {
    expect(toRcPath('sprites/animals/Chicken.png')).toBeNull()
  })
})
