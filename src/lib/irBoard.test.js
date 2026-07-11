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
})
