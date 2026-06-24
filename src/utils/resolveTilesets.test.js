import { describe, it, expect } from 'vitest'
import { autoMatchTilesets } from './resolveTilesets'

const paths = [
  'sprites/tilesets/Grass.png',
  'sprites/tilesets/Tilled_Dirt.png',
  'sprites/objects/Wood_Bridge.png',
]

describe('autoMatchTilesets', () => {
  it('matches exact basename ignoring extension', () => {
    const r = autoMatchTilesets(['Grass'], paths)
    expect(r.matched).toEqual({ Grass: 'sprites/tilesets/Grass.png' })
    expect(r.unmatched).toEqual([])
  })
  it('matches across space/underscore and case differences', () => {
    const r = autoMatchTilesets(['Tilled Dirt'], paths)
    expect(r.matched).toEqual({ 'Tilled Dirt': 'sprites/tilesets/Tilled_Dirt.png' })
  })
  it('reports names with no matching file as unmatched', () => {
    const r = autoMatchTilesets(['Grass', 'Lava'], paths)
    expect(r.matched).toEqual({ Grass: 'sprites/tilesets/Grass.png' })
    expect(r.unmatched).toEqual(['Lava'])
  })
})
