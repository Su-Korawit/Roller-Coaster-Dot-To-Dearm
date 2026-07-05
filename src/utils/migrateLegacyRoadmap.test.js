import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/db', () => ({
  shapes: {
    newRoadmapSheet: ({ ownerUid, name, nodes, edges, order }) => ({
      ownerUid, name, nodes, edges, order,
      collaborators: {}, collaboratorUids: [],
      createdAt: { _type: 'serverTimestamp' },
      updatedAt: { _type: 'serverTimestamp' },
    }),
  },
}))

const { migrateLegacyRoadmap } = await import('./migrateLegacyRoadmap')

describe('migrateLegacyRoadmap', () => {
  it('returns null when there is no legacy roadmap field', () => {
    expect(migrateLegacyRoadmap({ uid: 'alice' }, 'sheet-1')).toBeNull()
  })

  it('returns null when roadmapSheetIds already exists (already migrated)', () => {
    const userDoc = { uid: 'alice', roadmap: { nodes: [], edges: [] }, roadmapSheetIds: ['sheet-0'] }
    expect(migrateLegacyRoadmap(userDoc, 'sheet-1')).toBeNull()
  })

  it('builds a "Roadmap"-named sheet doc from the legacy nodes/edges', () => {
    const nodes = [{ id: 'n1', type: 'process', position: { x: 0, y: 0 }, data: {} }]
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }]
    const userDoc = { uid: 'alice', roadmap: { nodes, edges } }

    const result = migrateLegacyRoadmap(userDoc, 'sheet-1')

    expect(result.sheetId).toBe('sheet-1')
    expect(result.sheetDoc).toEqual({
      ownerUid: 'alice',
      name: 'Roadmap',
      nodes,
      edges,
      order: 0,
      collaborators: {},
      collaboratorUids: [],
      createdAt: { _type: 'serverTimestamp' },
      updatedAt: { _type: 'serverTimestamp' },
    })
  })

  it('sets roadmapSheetIds to exactly the new sheetId on the user-doc patch', () => {
    const userDoc = { uid: 'alice', roadmap: { nodes: [], edges: [] } }
    const result = migrateLegacyRoadmap(userDoc, 'sheet-1')
    expect(result.userDocPatch).toEqual({ roadmapSheetIds: ['sheet-1'] })
  })

  it('defaults to empty nodes/edges when the legacy roadmap field is malformed', () => {
    const userDoc = { uid: 'alice', roadmap: {} }
    const result = migrateLegacyRoadmap(userDoc, 'sheet-1')
    expect(result.sheetDoc.nodes).toEqual([])
    expect(result.sheetDoc.edges).toEqual([])
  })

  it('never mutates the input userDoc', () => {
    const userDoc = { uid: 'alice', roadmap: { nodes: [{ id: 'n1' }], edges: [] } }
    const before = JSON.stringify(userDoc)
    migrateLegacyRoadmap(userDoc, 'sheet-1')
    expect(JSON.stringify(userDoc)).toBe(before)
  })
})
