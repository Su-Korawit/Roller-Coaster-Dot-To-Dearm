import { describe, it, expect } from 'vitest'
import { toOsDevice, cleanOsDevice, applyCloud, mergeFirstAdopt, sameDevice } from './osDeviceSync'

const apps = [{ id: 'store', builtIn: true }, { id: 'goal', installable: true }, { id: 'habit', installable: true }, { id: 'chat', installable: true }]

describe('osDeviceSync', () => {
  it('never sends the custom photo wallpaper', () => {
    expect(toOsDevice({ installed: ['goal'], wallpaperId: 'custom' }).wallpaperId).toBeNull()
    expect(toOsDevice({ installed: ['goal'], wallpaperId: 'night' }).wallpaperId).toBe('night')
  })

  it('cleans malformed cloud data', () => {
    expect(cleanOsDevice(null, apps)).toBeNull()
    const c = cleanOsDevice({ installed: ['goal', 'goal', 'ghost', 5], order: ['goal', 3], folders: [{ id: 'a', name: 'x', appIds: ['habit', 'ghost'] }, null], wallpaperId: 'nope' }, apps)
    expect(c).toEqual({ installed: ['goal'], order: ['goal'], folders: [{ id: 'a', name: 'x', appIds: ['habit'] }], wallpaperId: null })
  })

  it('cloud wins on a known device, keeps local wallpaper when cloud has none', () => {
    const patch = applyCloud({}, { installed: ['goal'], order: [], folders: [], wallpaperId: null })
    expect(patch).toEqual({ installed: ['goal'], order: [], folders: [] })
  })

  it('first adoption unions installed apps', () => {
    const m = mergeFirstAdopt({ installed: ['habit', 'chat'], order: ['habit'], folders: [] }, { installed: ['goal', 'habit'], order: [], folders: [], wallpaperId: 'sky' })
    expect(m.installed).toEqual(['goal', 'habit', 'chat'])
    expect(m.order).toEqual(['habit'])
    expect(m.wallpaperId).toBe('sky')
  })

  it('compares only the synced fields', () => {
    expect(sameDevice({ installed: ['a'], order: [], folders: [], wallpaperId: 'x', files: [1] }, { installed: ['a'], order: [], folders: [], wallpaperId: 'x' })).toBe(true)
  })
})
