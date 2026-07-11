import { describe, it, expect, beforeEach, vi } from 'vitest'

// Zustand persist writes to localStorage; stub it so tests stay isolated
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

const { useRoadmapStore, roadmapStorePartialize } = await import('./useRoadmapStore')

describe('useRoadmapStore', () => {
  beforeEach(() => {
    useRoadmapStore.setState({
      nodes: [], edges: [], setpoint: null, selection: [], syncStatus: 'idle',
      sheets: [{ id: 'local-default', name: 'Roadmap', nodes: [], edges: [], ownerUid: null, myRole: 'owner' }],
      activeSheetId: 'local-default',
      myUid: null,
    })
  })

  it('initializes with empty nodes and edges', () => {
    const { nodes, edges } = useRoadmapStore.getState()
    expect(nodes).toEqual([])
    expect(edges).toEqual([])
  })

  it('setNodes replaces the nodes array', () => {
    const newNodes = [{ id: '1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Step 1' } }]
    useRoadmapStore.getState().setNodes(newNodes)
    expect(useRoadmapStore.getState().nodes).toEqual(newNodes)
  })

  it('setEdges replaces the edges array', () => {
    const newEdges = [{ id: 'e1-2', source: '1', target: '2' }]
    useRoadmapStore.getState().setEdges(newEdges)
    expect(useRoadmapStore.getState().edges).toEqual(newEdges)
  })

  it('addNode creates a node of the given type', () => {
    useRoadmapStore.getState().addNode('process')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('process')
  })

  it('addNode assigns a unique id to each node', () => {
    useRoadmapStore.getState().addNode('process')
    useRoadmapStore.getState().addNode('process')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes).toHaveLength(2)
    expect(nodes[0].id).not.toBe(nodes[1].id)
  })

  it('updateNodeData patches data on the correct node', () => {
    useRoadmapStore.getState().addNode('process')
    const id = useRoadmapStore.getState().nodes[0].id
    useRoadmapStore.getState().updateNodeData(id, { label: 'My Step' })
    const node = useRoadmapStore.getState().nodes.find((n) => n.id === id)
    expect(node.data.label).toBe('My Step')
  })

  it('addNode defaults data.color to null', () => {
    useRoadmapStore.getState().addNode('process')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes[0].data.color).toBeNull()
  })

  it('updateNodeData sets color on the correct node without touching others', () => {
    useRoadmapStore.getState().addNode('process')
    useRoadmapStore.getState().addNode('process')
    const [a, b] = useRoadmapStore.getState().nodes.map((n) => n.id)
    useRoadmapStore.getState().updateNodeData(a, { color: '#fff' })
    const { nodes } = useRoadmapStore.getState()
    expect(nodes.find((n) => n.id === a).data.color).toBe('#fff')
    expect(nodes.find((n) => n.id === b).data.color).toBeNull()
  })

  it('removeNode removes the node from the board', () => {
    useRoadmapStore.getState().addNode('process')
    const id = useRoadmapStore.getState().nodes[0].id
    useRoadmapStore.getState().removeNode(id)
    expect(useRoadmapStore.getState().nodes).toHaveLength(0)
  })

  it('connect adds an edge between two blocks', () => {
    useRoadmapStore.getState().connect({ source: 'a', target: 'b' })
    const { edges } = useRoadmapStore.getState()
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe('a')
    expect(edges[0].target).toBe('b')
  })

  it('removeEdge removes the connection from the board', () => {
    useRoadmapStore.getState().connect({ source: 'a', target: 'b' })
    const id = useRoadmapStore.getState().edges[0].id
    useRoadmapStore.getState().removeEdge(id)
    expect(useRoadmapStore.getState().edges).toHaveLength(0)
  })

  it('addNode creates a condition-typed node', () => {
    useRoadmapStore.getState().addNode('condition')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes[0].type).toBe('condition')
  })

  it('a Condition block can fork — hold two or more outgoing edges from the same source', () => {
    useRoadmapStore.getState().connect({ source: 'cond-1', target: 'a' })
    useRoadmapStore.getState().connect({ source: 'cond-1', target: 'b' })
    const outgoing = useRoadmapStore.getState().edges.filter((e) => e.source === 'cond-1')
    expect(outgoing).toHaveLength(2)
  })

  it('addNode creates a stageLabel-typed node', () => {
    useRoadmapStore.getState().addNode('stageLabel')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes[0].type).toBe('stageLabel')
  })

  it('addNode creates an image-typed node', () => {
    useRoadmapStore.getState().addNode('image')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes[0].type).toBe('image')
  })

  it('addSticker adds an image node with the sticker url and sets the setpoint', () => {
    const id = useRoadmapStore.getState().addSticker('https://assets.mytcas.com/i/logo/001.png', { x: 50, y: 60 })
    const node = useRoadmapStore.getState().nodes.find((n) => n.id === id)
    expect(node).toMatchObject({
      type: 'image',
      position: { x: 50, y: 60 },
      data: { url: 'https://assets.mytcas.com/i/logo/001.png', offset: { x: 0, y: 0 } },
    })
    expect(useRoadmapStore.getState().setpoint).toBe(id)
  })

  it('addNode creates a start-typed node with a null journeyRef', () => {
    useRoadmapStore.getState().addNode('start')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes[0].type).toBe('start')
    expect(nodes[0].data).toEqual({ journeyRef: null })
  })

  it('addNode creates an ideaRoot node with default idea status', () => {
    useRoadmapStore.getState().addNode('ideaRoot')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes[0].type).toBe('ideaRoot')
    expect(nodes[0].data.status).toBe('idea')
    expect(nodes[0].data.title).toBe('')
  })

  it('connect snaps the target block adjacent to the source block', () => {
    useRoadmapStore.getState().setNodes([
      { id: 'a', type: 'process', position: { x: 100, y: 100 }, data: { label: '' } },
      { id: 'b', type: 'process', position: { x: 500, y: 500 }, data: { label: '' } },
    ])
    useRoadmapStore.getState().connect({ source: 'a', target: 'b', sourceHandle: null })
    const b = useRoadmapStore.getState().nodes.find((n) => n.id === 'b')
    // right exit of a 128x128 process at (100,100): x = 228, y = 100
    expect(b.position).toEqual({ x: 228, y: 100 })
  })

  it('detachNode removes every edge touching the node (dragging detaches)', () => {
    useRoadmapStore.getState().connect({ source: 'a', target: 'b' })
    useRoadmapStore.getState().connect({ source: 'c', target: 'b' })
    useRoadmapStore.getState().detachNode('b')
    expect(useRoadmapStore.getState().edges).toHaveLength(0)
  })

  it('setSelection stores the array of selected ids', () => {
    useRoadmapStore.getState().setSelection(['a', 'b'])
    expect(useRoadmapStore.getState().selection).toEqual(['a', 'b'])
  })

  it('syncStatus starts idle', () => {
    expect(useRoadmapStore.getState().syncStatus).toBe('idle')
  })

  it('setSyncStatus updates syncStatus', () => {
    useRoadmapStore.getState().setSyncStatus('saving')
    expect(useRoadmapStore.getState().syncStatus).toBe('saving')
    useRoadmapStore.getState().setSyncStatus('saved')
    expect(useRoadmapStore.getState().syncStatus).toBe('saved')
  })

  it('clearSelection empties the selection', () => {
    useRoadmapStore.getState().setSelection(['a'])
    useRoadmapStore.getState().clearSelection()
    expect(useRoadmapStore.getState().selection).toEqual([])
  })

  it('removeSelection deletes selected nodes', () => {
    useRoadmapStore.getState().addNode('process')
    useRoadmapStore.getState().addNode('process')
    const ids = useRoadmapStore.getState().nodes.map((n) => n.id)
    useRoadmapStore.getState().setSelection([ids[0]])
    useRoadmapStore.getState().removeSelection()
    expect(useRoadmapStore.getState().nodes).toHaveLength(1)
    expect(useRoadmapStore.getState().nodes[0].id).toBe(ids[1])
  })

  it('removeSelection prunes edges touching deleted nodes', () => {
    useRoadmapStore.getState().addNode('process')
    useRoadmapStore.getState().addNode('process')
    useRoadmapStore.getState().addNode('process')
    const [a, b, c] = useRoadmapStore.getState().nodes.map((n) => n.id)
    useRoadmapStore.getState().connect({ source: a, target: b })
    useRoadmapStore.getState().connect({ source: b, target: c })
    useRoadmapStore.getState().setSelection([b])
    useRoadmapStore.getState().removeSelection()
    expect(useRoadmapStore.getState().nodes).toHaveLength(2)
    expect(useRoadmapStore.getState().edges).toHaveLength(0)
  })

  it('removeSelection clears selection afterward', () => {
    useRoadmapStore.getState().addNode('process')
    const id = useRoadmapStore.getState().nodes[0].id
    useRoadmapStore.getState().setSelection([id])
    useRoadmapStore.getState().removeSelection()
    expect(useRoadmapStore.getState().selection).toEqual([])
  })

  it('duplicateSelection copies selected nodes with offset positions', () => {
    useRoadmapStore.getState().setNodes([
      { id: 'a', type: 'process', position: { x: 100, y: 100 }, data: { label: 'A' } },
    ])
    useRoadmapStore.getState().setSelection(['a'])
    useRoadmapStore.getState().duplicateSelection()
    const { nodes } = useRoadmapStore.getState()
    expect(nodes).toHaveLength(2)
    const copy = nodes.find((n) => n.id !== 'a')
    expect(copy.id).not.toBe('a')
    expect(copy.position.x).not.toBe(100)
    expect(copy.data.label).toBe('A')
  })

  it('duplicateSelection preserves edges internal to the selection', () => {
    useRoadmapStore.getState().setNodes([
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'process', position: { x: 200, y: 0 }, data: {} },
    ])
    useRoadmapStore.getState().setEdges([{ id: 'e1', source: 'a', target: 'b' }])
    useRoadmapStore.getState().setSelection(['a', 'b'])
    useRoadmapStore.getState().duplicateSelection()
    const { edges } = useRoadmapStore.getState()
    // original edge + 1 copied internal edge
    expect(edges).toHaveLength(2)
  })

  it('duplicateSelection does not copy edges to outside nodes', () => {
    useRoadmapStore.getState().setNodes([
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'process', position: { x: 200, y: 0 }, data: {} },
    ])
    useRoadmapStore.getState().setEdges([{ id: 'e1', source: 'a', target: 'b' }])
    useRoadmapStore.getState().setSelection(['a']) // only 'a', not 'b'
    useRoadmapStore.getState().duplicateSelection()
    const { edges } = useRoadmapStore.getState()
    expect(edges).toHaveLength(1) // original edge preserved, no new edge for external target
  })

  it('duplicateSelection makes copies the new selection', () => {
    useRoadmapStore.getState().setNodes([
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} },
    ])
    useRoadmapStore.getState().setSelection(['a'])
    useRoadmapStore.getState().duplicateSelection()
    const { nodes, selection } = useRoadmapStore.getState()
    const copyId = nodes.find((n) => n.id !== 'a').id
    expect(selection).toEqual([copyId])
  })

  it('importRoadmap regenerates node ids so they never collide with existing', () => {
    useRoadmapStore.getState().setNodes([
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} },
    ])
    useRoadmapStore.getState().importRoadmap({
      version: 1,
      nodes: [{ id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'imported' } }],
      edges: [],
    })
    const { nodes } = useRoadmapStore.getState()
    expect(nodes).toHaveLength(2)
    const ids = nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(2) // no duplicate id
  })

  it('importRoadmap remaps edges onto the regenerated node ids', () => {
    useRoadmapStore.getState().importRoadmap({
      version: 1,
      nodes: [
        { id: 'x', type: 'process', position: { x: 0, y: 0 }, data: {} },
        { id: 'y', type: 'process', position: { x: 100, y: 0 }, data: {} },
      ],
      edges: [{ id: 'ex', source: 'x', target: 'y', sourceHandle: null, targetHandle: null }],
    })
    const { nodes, edges } = useRoadmapStore.getState()
    expect(edges).toHaveLength(1)
    const ids = new Set(nodes.map((n) => n.id))
    expect(ids.has(edges[0].source)).toBe(true)
    expect(ids.has(edges[0].target)).toBe(true)
    expect(edges[0].source).not.toBe('x') // remapped, not the original id
  })

  it('importRoadmap offsets imported nodes so they do not overlap existing ones', () => {
    useRoadmapStore.getState().setNodes([
      { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} },
    ])
    useRoadmapStore.getState().importRoadmap({
      version: 1,
      nodes: [{ id: 'b', type: 'process', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
    })
    const { nodes } = useRoadmapStore.getState()
    const imported = nodes.find((n) => n.position.x !== 0 || n.position.y !== 0)
    expect(imported).toBeDefined() // shifted off the existing block at (0,0)
  })

  it('importRoadmap throws on an unsupported version', () => {
    expect(() => useRoadmapStore.getState().importRoadmap({ version: 99, nodes: [], edges: [] })).toThrow()
  })

  it('setpoint is null on an empty roadmap', () => {
    expect(useRoadmapStore.getState().setpoint).toBeNull()
  })

  it('addNode records the new node id as setpoint', () => {
    useRoadmapStore.getState().addNode('process')
    const { nodes, setpoint } = useRoadmapStore.getState()
    expect(setpoint).toBe(nodes[0].id)
  })

  it('adding a second node updates setpoint to the latest', () => {
    useRoadmapStore.getState().addNode('process')
    useRoadmapStore.getState().addNode('condition')
    const { nodes, setpoint } = useRoadmapStore.getState()
    expect(setpoint).toBe(nodes[1].id)
  })

})

describe('multi-sheet: createSheet / switchSheet / renameSheet / deleteSheet / hydrateSheets', () => {
  beforeEach(() => {
    useRoadmapStore.setState({
      nodes: [], edges: [], setpoint: null, selection: [],
      sheets: [{ id: 'local-default', name: 'Roadmap', nodes: [], edges: [], ownerUid: null, myRole: 'owner' }],
      activeSheetId: 'local-default',
      myUid: 'me',
    })
  })

  it('createSheet adds a new empty sheet and switches to it', () => {
    const id = useRoadmapStore.getState().createSheet('Side Project')
    const { sheets, activeSheetId, nodes, edges } = useRoadmapStore.getState()
    expect(sheets).toHaveLength(2)
    expect(activeSheetId).toBe(id)
    expect(nodes).toEqual([])
    expect(edges).toEqual([])
    expect(sheets.find((s) => s.id === id).name).toBe('Side Project')
    expect(sheets.find((s) => s.id === id).ownerUid).toBe('me')
  })

  it('switching sheets does not lose the other sheet\'s data', () => {
    useRoadmapStore.getState().addNode('process')
    const sheet2Id = useRoadmapStore.getState().createSheet('Sheet 2')
    useRoadmapStore.getState().addNode('condition')

    useRoadmapStore.getState().switchSheet('local-default')
    expect(useRoadmapStore.getState().nodes).toHaveLength(1)
    expect(useRoadmapStore.getState().nodes[0].type).toBe('process')

    useRoadmapStore.getState().switchSheet(sheet2Id)
    expect(useRoadmapStore.getState().nodes).toHaveLength(1)
    expect(useRoadmapStore.getState().nodes[0].type).toBe('condition')
  })

  it('adding a node while on sheet 2 does not touch sheet 1', () => {
    useRoadmapStore.getState().addNode('process')
    const sheet2Id = useRoadmapStore.getState().createSheet('Sheet 2')
    useRoadmapStore.getState().addNode('condition')
    useRoadmapStore.getState().addNode('image')

    const { sheets } = useRoadmapStore.getState()
    const sheet1 = sheets.find((s) => s.id === 'local-default')
    const sheet2 = sheets.find((s) => s.id === sheet2Id)
    expect(sheet1.nodes).toHaveLength(1)
    expect(sheet2.nodes).toHaveLength(2)
  })

  it('renameSheet updates only the target sheet\'s name', () => {
    const sheet2Id = useRoadmapStore.getState().createSheet('Sheet 2')
    useRoadmapStore.getState().renameSheet(sheet2Id, 'Renamed')
    const { sheets } = useRoadmapStore.getState()
    expect(sheets.find((s) => s.id === sheet2Id).name).toBe('Renamed')
    expect(sheets.find((s) => s.id === 'local-default').name).toBe('Roadmap')
  })

  it('deleteSheet refuses to delete the last remaining sheet', () => {
    useRoadmapStore.getState().deleteSheet('local-default')
    expect(useRoadmapStore.getState().sheets).toHaveLength(1)
    expect(useRoadmapStore.getState().activeSheetId).toBe('local-default')
  })

  it('deleting the active sheet falls back to another sheet sensibly', () => {
    const sheet2Id = useRoadmapStore.getState().createSheet('Sheet 2')
    useRoadmapStore.getState().addNode('process')

    useRoadmapStore.getState().deleteSheet(sheet2Id)

    const { sheets, activeSheetId, nodes } = useRoadmapStore.getState()
    expect(sheets).toHaveLength(1)
    expect(activeSheetId).toBe('local-default')
    expect(nodes).toEqual([])
  })

  it('deleting a non-active sheet leaves the active sheet untouched', () => {
    useRoadmapStore.getState().addNode('process')
    const sheet2Id = useRoadmapStore.getState().createSheet('Sheet 2')
    useRoadmapStore.getState().switchSheet('local-default')

    useRoadmapStore.getState().deleteSheet(sheet2Id)

    const { sheets, activeSheetId, nodes } = useRoadmapStore.getState()
    expect(sheets).toHaveLength(1)
    expect(activeSheetId).toBe('local-default')
    expect(nodes).toHaveLength(1)
  })

  it('switchSheet resets selection and setpoint (no stale cross-sheet references)', () => {
    useRoadmapStore.getState().addNode('process')
    useRoadmapStore.getState().setSelection(['some-id'])
    useRoadmapStore.getState().createSheet('Sheet 2')
    expect(useRoadmapStore.getState().selection).toEqual([])
    expect(useRoadmapStore.getState().setpoint).toBeNull()
  })

  it('hydrateSheets replaces the sheet list and activates the given sheet', () => {
    const incoming = [
      { id: 's1', name: 'Roadmap', nodes: [{ id: 'n1', type: 'process', position: { x: 0, y: 0 }, data: {} }], edges: [], ownerUid: 'me', myRole: 'owner' },
      { id: 's2', name: 'Extra', nodes: [], edges: [], ownerUid: 'me', myRole: 'owner' },
    ]
    useRoadmapStore.getState().hydrateSheets(incoming, 's1')
    const { sheets, activeSheetId, nodes } = useRoadmapStore.getState()
    expect(sheets).toEqual(incoming)
    expect(activeSheetId).toBe('s1')
    expect(nodes).toHaveLength(1)
  })
})

describe('persist partialize', () => {
  it('excludes admin-idea-board from persisted sheets and remaps activeSheetId', () => {
    const partial = roadmapStorePartialize({
      myUid: 'alice',
      sheets: [
        { id: 'sheet-1', name: 'Mine', nodes: [], edges: [] },
        { id: 'admin-idea-board', name: 'IR Board', nodes: [], edges: [] },
      ],
      activeSheetId: 'admin-idea-board',
      nodes: [],
      edges: [],
      timeline: null,
      setpoint: null,
      selection: [],
      syncStatus: 'idle',
    })

    expect(partial.sheets.map((s) => s.id)).toEqual(['sheet-1'])
    expect(partial.activeSheetId).toBe('sheet-1')
    expect(partial.myUid).toBe('alice')
  })
})
