import { describe, it, expect, beforeEach } from 'vitest'

const { useWorldStore } = await import('./useWorldStore')

describe('useWorldStore', () => {
  beforeEach(() => {
    useWorldStore.setState({
      currentMapOwnerUid: null,
      currentMapKey: null,
      objectsByMap: {},
      mapObjects: [],
      editMode: false,
      selectedItemKey: null,
      remotePlayers: {},
    })
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
    useWorldStore.setState({ currentMapKey: 'a' })
    const objects = [{ key: 'wood_bridge', x: 100, y: 200 }]
    useWorldStore.getState().setMapObjects(objects)
    expect(useWorldStore.getState().mapObjects).toEqual(objects)
  })

  it('setMapObjects replaces a previous array entirely', () => {
    useWorldStore.setState({ currentMapKey: 'a' })
    useWorldStore.getState().setMapObjects([{ key: 'wood_bridge', x: 0, y: 0 }])
    useWorldStore.getState().setMapObjects([{ key: 'grass_things', x: 50, y: 50 }])
    expect(useWorldStore.getState().mapObjects).toHaveLength(1)
    expect(useWorldStore.getState().mapObjects[0].key).toBe('grass_things')
  })

  it('setCurrentMapKey switches which map objects mapObjects reflects', () => {
    useWorldStore.setState({ objectsByMap: { a: [{ key: 'wood_bridge', x: 0, y: 0 }], b: [] }, currentMapKey: null, mapObjects: [] })
    useWorldStore.getState().setCurrentMapKey('a')
    expect(useWorldStore.getState().mapObjects).toEqual([{ key: 'wood_bridge', x: 0, y: 0 }])
    useWorldStore.getState().setCurrentMapKey('b')
    expect(useWorldStore.getState().mapObjects).toEqual([])
  })

  it('addObject appends to the current map only', () => {
    useWorldStore.setState({ objectsByMap: {}, currentMapKey: 'a', mapObjects: [] })
    useWorldStore.getState().addObject({ key: 'grass_things', x: 5, y: 5 })
    expect(useWorldStore.getState().objectsByMap.a).toEqual([{ key: 'grass_things', x: 5, y: 5 }])
    expect(useWorldStore.getState().mapObjects).toEqual([{ key: 'grass_things', x: 5, y: 5 }])
  })

  // ── Edit mode ────────────────────────────────────────────────────────────

  it('initializes with editMode false', () => {
    expect(useWorldStore.getState().editMode).toBe(false)
  })

  it('toggleEditMode switches editMode on then off', () => {
    useWorldStore.getState().toggleEditMode()
    expect(useWorldStore.getState().editMode).toBe(true)
    useWorldStore.getState().toggleEditMode()
    expect(useWorldStore.getState().editMode).toBe(false)
  })

  // ── Palette selection ────────────────────────────────────────────────────

  it('initializes with selectedItemKey null', () => {
    expect(useWorldStore.getState().selectedItemKey).toBeNull()
  })

  it('setSelectedItem sets selectedItemKey', () => {
    useWorldStore.getState().setSelectedItem('wood_bridge')
    expect(useWorldStore.getState().selectedItemKey).toBe('wood_bridge')
  })

  it('setSelectedItem can clear back to null', () => {
    useWorldStore.getState().setSelectedItem('wood_bridge')
    useWorldStore.getState().setSelectedItem(null)
    expect(useWorldStore.getState().selectedItemKey).toBeNull()
  })

  // ── addObject ────────────────────────────────────────────────────────────

  it('addObject appends a decoration to mapObjects', () => {
    useWorldStore.getState().addObject({ key: 'wood_bridge', x: 100, y: 200 })
    expect(useWorldStore.getState().mapObjects).toEqual([
      { key: 'wood_bridge', x: 100, y: 200 },
    ])
  })

  it('addObject appends without losing existing objects', () => {
    useWorldStore.setState({ currentMapKey: 'a', objectsByMap: { a: [{ key: 'wood_bridge', x: 0, y: 0 }] }, mapObjects: [{ key: 'wood_bridge', x: 0, y: 0 }] })
    useWorldStore.getState().addObject({ key: 'grass_things', x: 50, y: 50 })
    expect(useWorldStore.getState().mapObjects).toHaveLength(2)
  })

  // ── removeObject ─────────────────────────────────────────────────────────

  it('removeObject removes the decoration at the given index', () => {
    const objs = [{ key: 'wood_bridge', x: 0, y: 0 }, { key: 'grass_things', x: 50, y: 50 }]
    useWorldStore.setState({ currentMapKey: 'a', objectsByMap: { a: objs }, mapObjects: objs })
    useWorldStore.getState().removeObject(0)
    expect(useWorldStore.getState().mapObjects).toHaveLength(1)
    expect(useWorldStore.getState().mapObjects[0].key).toBe('grass_things')
  })

  it('removeObject leaves other objects untouched', () => {
    const objs = [{ key: 'wood_bridge', x: 0, y: 0 }, { key: 'grass_things', x: 50, y: 50 }, { key: 'wood_bridge', x: 100, y: 100 }]
    useWorldStore.setState({ currentMapKey: 'a', objectsByMap: { a: objs }, mapObjects: objs })
    useWorldStore.getState().removeObject(1)
    expect(useWorldStore.getState().mapObjects).toHaveLength(2)
    expect(useWorldStore.getState().mapObjects[0].key).toBe('wood_bridge')
    expect(useWorldStore.getState().mapObjects[1].x).toBe(100)
  })

  // ── moveObject ───────────────────────────────────────────────────────────

  it('moveObject updates the position of the decoration at the given index', () => {
    const objs = [{ key: 'wood_bridge', x: 0, y: 0 }]
    useWorldStore.setState({ currentMapKey: 'a', objectsByMap: { a: objs }, mapObjects: objs })
    useWorldStore.getState().moveObject(0, 300, 400)
    expect(useWorldStore.getState().mapObjects[0]).toEqual({
      key: 'wood_bridge', x: 300, y: 400,
    })
  })

  // ── remotePlayers ────────────────────────────────────────────────────────

  it('initializes with empty remotePlayers', () => {
    expect(useWorldStore.getState().remotePlayers).toEqual({})
  })

  it('setRemotePlayers populates the remote player map from a presence snapshot', () => {
    const snapshot = {
      'uid-a': { x: 10, y: 20, dir: 'down', moving: false, mbti: 'INTJ', name: 'Alice' },
    }
    useWorldStore.getState().setRemotePlayers(snapshot)
    expect(useWorldStore.getState().remotePlayers).toEqual(snapshot)
  })

  it('setRemotePlayers replaces all previous remote players (handles leaves)', () => {
    useWorldStore.getState().setRemotePlayers({
      'uid-a': { x: 0, y: 0, mbti: 'INTJ', name: 'Alice' },
      'uid-b': { x: 5, y: 5, mbti: 'ENFP', name: 'Bob' },
    })
    useWorldStore.getState().setRemotePlayers({
      'uid-a': { x: 0, y: 0, mbti: 'INTJ', name: 'Alice' },
    })
    expect(Object.keys(useWorldStore.getState().remotePlayers)).toHaveLength(1)
    expect(useWorldStore.getState().remotePlayers['uid-b']).toBeUndefined()
  })

  it('setRemotePlayers({}) clears all remote players', () => {
    useWorldStore.getState().setRemotePlayers({ 'uid-a': { x: 0 } })
    useWorldStore.getState().setRemotePlayers({})
    expect(useWorldStore.getState().remotePlayers).toEqual({})
  })

  it('moveObject preserves key and other objects', () => {
    const objs = [{ key: 'wood_bridge', x: 0, y: 0 }, { key: 'grass_things', x: 50, y: 50 }]
    useWorldStore.setState({ currentMapKey: 'a', objectsByMap: { a: objs }, mapObjects: objs })
    useWorldStore.getState().moveObject(1, 200, 250)
    expect(useWorldStore.getState().mapObjects[0].x).toBe(0)
    expect(useWorldStore.getState().mapObjects[1]).toEqual({
      key: 'grass_things', x: 200, y: 250,
    })
  })
})
