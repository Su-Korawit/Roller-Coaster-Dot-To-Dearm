import { describe, it, expect } from 'vitest'
import { computeGroupedLayout } from './computeGroupedLayout'

describe('computeGroupedLayout', () => {
  it('returns nodes unchanged (but as a new array) when there are no stageLabel nodes', () => {
    const nodes = [{ id: 'a', type: 'process', position: { x: 10, y: 10 }, data: {} }]
    const result = computeGroupedLayout(nodes)
    expect(result).toEqual(nodes)
    expect(result).not.toBe(nodes)
  })

  it('aligns a member node vertical center onto the main line, x untouched', () => {
    const nodes = [
      { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 200 }, width: 300, height: 40, data: { label: 'S1' } },
      { id: 'proc-1', type: 'process', position: { x: 50, y: 900 }, data: {} },
    ]
    const result = computeGroupedLayout(nodes)
    const proc1 = result.find((n) => n.id === 'proc-1')
    expect(proc1.position).toEqual({ x: 50, y: 156 })
  })

  it('leaves an orphan node (outside every stage range) unchanged', () => {
    const nodes = [
      { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 200 }, width: 100, height: 40, data: { label: 'S1' } },
      { id: 'proc-1', type: 'process', position: { x: 900, y: 900 }, data: {} },
    ]
    const result = computeGroupedLayout(nodes)
    const proc1 = result.find((n) => n.id === 'proc-1')
    expect(proc1.position).toEqual({ x: 900, y: 900 })
  })

  it('leaves stageLabel nodes themselves unchanged (they are never members)', () => {
    const nodes = [
      { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 200 }, width: 300, height: 40, data: { label: 'S1' } },
    ]
    const result = computeGroupedLayout(nodes)
    expect(result[0].position).toEqual({ x: 0, y: 200 })
  })

  it('does not mutate the input array or its node objects', () => {
    const nodes = [
      { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 200 }, width: 300, height: 40, data: { label: 'S1' } },
      { id: 'proc-1', type: 'process', position: { x: 50, y: 900 }, data: {} },
    ]
    const snapshot = JSON.parse(JSON.stringify(nodes))
    computeGroupedLayout(nodes)
    expect(nodes).toEqual(snapshot)
  })
})
