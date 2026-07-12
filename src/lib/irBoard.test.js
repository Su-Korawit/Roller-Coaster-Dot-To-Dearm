import { describe, it, expect } from 'vitest'
import {
  listIdeas,
  collectIdeaSubtree,
  setIdeaStatus,
  appendReportNode,
} from './irBoard'

const nodes = [
  { id: 'r1', type: 'ideaRoot', position: { x: 0, y: 0 }, data: { title: 'Alpha', status: 'idea' } },
  { id: 'p1', type: 'process', position: { x: 200, y: 0 }, data: { label: 'Do X', note: '' } },
  { id: 'r2', type: 'ideaRoot', position: { x: 0, y: 300 }, data: { title: 'Beta', status: 'done' } },
  { id: 'u1', type: 'update', position: { x: 200, y: 300 }, data: { summary: 'old', timestamp: 't' } },
]
const edges = [
  { id: 'e1', source: 'r1', target: 'p1' },
  { id: 'e2', source: 'r2', target: 'u1' },
]

describe('listIdeas', () => {
  it('omits done by default', () => {
    expect(listIdeas(nodes)).toEqual([{ id: 'r1', title: 'Alpha', status: 'idea' }])
  })

  it('can include done', () => {
    expect(listIdeas(nodes, { includeDone: true })).toHaveLength(2)
  })
})

describe('collectIdeaSubtree', () => {
  it('returns the root plus reachable blocks', () => {
    const sub = collectIdeaSubtree('r1', nodes, edges)
    expect(sub.root.id).toBe('r1')
    expect(sub.nodes.map((n) => n.id).sort()).toEqual(['p1', 'r1'])
    expect(sub.edges).toHaveLength(1)
  })
})

describe('setIdeaStatus', () => {
  it('patches only the matching ideaRoot', () => {
    const next = setIdeaStatus(nodes, 'r1', 'planned')
    expect(next.find((n) => n.id === 'r1').data.status).toBe('planned')
    expect(next.find((n) => n.id === 'r2').data.status).toBe('done')
  })

  it('throws on invalid status', () => {
    expect(() => setIdeaStatus(nodes, 'r1', 'nope')).toThrow(/invalid status/i)
  })
})

describe('appendReportNode', () => {
  it('adds an update node edged from the idea root', () => {
    const { nodes: n2, edges: e2, reportId } = appendReportNode({
      nodes,
      edges,
      ideaId: 'r1',
      type: 'update',
      summary: 'blocked on rules',
    })
    const report = n2.find((n) => n.id === reportId)
    expect(report.type).toBe('update')
    expect(report.data.summary).toBe('blocked on rules')
    expect(typeof report.data.timestamp).toBe('string')
    expect(e2.some((e) => e.source === 'r1' && e.target === reportId)).toBe(true)
  })

  it('snaps the first report to the idea root bottom dot', () => {
    const root = [{ id: 'r', type: 'ideaRoot', position: { x: 100, y: 100 }, data: { title: '', status: 'idea' } }]
    const { nodes: n2, edges: e2, reportId } = appendReportNode({
      nodes: root, edges: [], ideaId: 'r', type: 'update', summary: 's',
    })
    const report = n2.find((n) => n.id === reportId)
    // ideaRoot is 128×128 — bottom snap puts the report flush underneath.
    expect(report.position).toEqual({ x: 100, y: 228 })
    expect(e2).toEqual([
      expect.objectContaining({ source: 'r', target: reportId, sourceHandle: 'bottom', targetHandle: 'top' }),
    ])
  })

  it('chains the next report under the previous one, not the root', () => {
    const base = [{ id: 'r', type: 'ideaRoot', position: { x: 100, y: 100 }, data: { title: '', status: 'idea' } }]
    const first = appendReportNode({ nodes: base, edges: [], ideaId: 'r', type: 'update', summary: '1' })
    const second = appendReportNode({
      nodes: first.nodes, edges: first.edges, ideaId: 'r', type: 'success', summary: '2',
    })
    const report2 = second.nodes.find((n) => n.id === second.reportId)
    expect(report2.position).toEqual({ x: 100, y: 356 })
    expect(second.edges.at(-1)).toEqual(
      expect.objectContaining({ source: first.reportId, target: second.reportId, sourceHandle: 'bottom', targetHandle: 'top' }),
    )
  })

  it('continues below legacy fanned-out reports instead of overlapping them', () => {
    // Legacy layout: two reports parked at the old +180/+40 offsets, both edged from the root.
    const legacyNodes = [
      { id: 'r', type: 'ideaRoot', position: { x: 0, y: 0 }, data: { title: '', status: 'idea' } },
      { id: 'u1', type: 'update', position: { x: 180, y: 40 }, data: { summary: '', timestamp: 't' } },
      { id: 'u2', type: 'update', position: { x: 180, y: 160 }, data: { summary: '', timestamp: 't' } },
    ]
    const legacyEdges = [
      { id: 'e1', source: 'r', target: 'u1' },
      { id: 'e2', source: 'r', target: 'u2' },
    ]
    const { nodes: n2, edges: e2, reportId } = appendReportNode({
      nodes: legacyNodes, edges: legacyEdges, ideaId: 'r', type: 'update', summary: 's',
    })
    // Tail = the lowest report in this idea's subtree (u2 at y=160) → snap under it.
    expect(n2.find((n) => n.id === reportId).position).toEqual({ x: 180, y: 288 })
    expect(e2.at(-1)).toEqual(
      expect.objectContaining({ source: 'u2', target: reportId, sourceHandle: 'bottom', targetHandle: 'top' }),
    )
  })
})
