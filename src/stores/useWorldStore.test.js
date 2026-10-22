import { describe, it, expect, beforeEach } from 'vitest'

const { useWorldStore } = await import('./useWorldStore')

describe('useWorldStore', () => {
  beforeEach(() => {
    useWorldStore.setState({ currentMapOwnerUid: null, currentMapKey: null, remotePlayers: {} })
  })

  it('starts with no owner, no map and nobody else around', () => {
    expect(useWorldStore.getState()).toMatchObject({ currentMapOwnerUid: null, currentMapKey: null, remotePlayers: {} })
  })

  it('setMapOwner switches the owner and accepts null to reset', () => {
    useWorldStore.getState().setMapOwner('uid-abc')
    expect(useWorldStore.getState().currentMapOwnerUid).toBe('uid-abc')
    useWorldStore.getState().setMapOwner(null)
    expect(useWorldStore.getState().currentMapOwnerUid).toBeNull()
  })

  it('setCurrentMapKey records the map being shown', () => {
    useWorldStore.getState().setCurrentMapKey('room')
    expect(useWorldStore.getState().currentMapKey).toBe('room')
  })

  it('setRemotePlayers replaces the snapshot of other players', () => {
    useWorldStore.getState().setRemotePlayers({ u2: { x: 1, y: 2 } })
    expect(useWorldStore.getState().remotePlayers).toEqual({ u2: { x: 1, y: 2 } })
  })

  it('no longer carries Personal Map decorations (removed with the farm)', () => {
    const state = useWorldStore.getState()
    for (const key of ['objectsByMap', 'mapObjects', 'editMode', 'selectedItemKey', 'addObject', 'removeObject']) {
      expect(state).not.toHaveProperty(key)
    }
  })
})
