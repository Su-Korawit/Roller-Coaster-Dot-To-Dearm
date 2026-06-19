import { describe, it, expect, beforeEach } from 'vitest'

const { useWorldStore } = await import('./useWorldStore')

describe('useWorldStore', () => {
  beforeEach(() => {
    useWorldStore.setState({ currentMapOwnerUid: null, mapObjects: [] })
  })

  it('initializes with null currentMapOwnerUid', () => {
    expect(useWorldStore.getState().currentMapOwnerUid).toBeNull()
  })

  it('initializes with empty mapObjects', () => {
    expect(useWorldStore.getState().mapObjects).toEqual([])
  })

  it('setMapOwner switches currentMapOwnerUid', () => {
    useWorldStore.getState().setMapOwner('uid-abc')
    expect(useWorldStore.getState().currentMapOwnerUid).toBe('uid-abc')
  })

  it('setMapOwner accepts null to reset to no owner', () => {
    useWorldStore.getState().setMapOwner('uid-abc')
    useWorldStore.getState().setMapOwner(null)
    expect(useWorldStore.getState().currentMapOwnerUid).toBeNull()
  })

  it('setMapObjects replaces the decoration objects array', () => {
    const objects = [{ key: 'wood_bridge', x: 100, y: 200 }]
    useWorldStore.getState().setMapObjects(objects)
    expect(useWorldStore.getState().mapObjects).toEqual(objects)
  })

  it('setMapObjects replaces a previous array entirely', () => {
    useWorldStore.getState().setMapObjects([{ key: 'wood_bridge', x: 0, y: 0 }])
    useWorldStore.getState().setMapObjects([{ key: 'grass_things', x: 50, y: 50 }])
    expect(useWorldStore.getState().mapObjects).toHaveLength(1)
    expect(useWorldStore.getState().mapObjects[0].key).toBe('grass_things')
  })
})
