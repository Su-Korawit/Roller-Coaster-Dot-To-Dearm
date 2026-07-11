import { describe, it, expect } from 'vitest'
import { localMapPath } from './assetManifest'

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
