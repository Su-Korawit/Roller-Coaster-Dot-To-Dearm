import { describe, it, expect } from 'vitest'
import { computeStageMembership } from './computeStageMembership'

// stageA: range [0, 200]. stageB: range [150, 350] — overlaps stageA on [150, 200].
const stageA = { id: 'stageA', type: 'stageLabel', position: { x: 0, y: 0 }, width: 200, data: { label: 'A' } }
const stageB = { id: 'stageB', type: 'stageLabel', position: { x: 150, y: 0 }, width: 200, data: { label: 'B' } }

describe('computeStageMembership', () => {
  it('assigns a node whose center falls in exactly one stage range', () => {
    const node1 = { id: 'node1', type: 'process', position: { x: 20, y: 300 }, data: {} }
    const membership = computeStageMembership([stageA, stageB, node1])
    expect(membership.stageA).toEqual(['node1'])
    expect(membership.stageB).toEqual([])
  })

  it('breaks a tie between overlapping stages by picking the stage with the closest (largest) left edge', () => {
    const node2 = { id: 'node2', type: 'process', position: { x: 111, y: 300 }, data: {} }
    const membership = computeStageMembership([stageA, stageB, node2])
    expect(membership.stageB).toEqual(['node2'])
    expect(membership.stageA).toEqual([])
  })

  it('assigns a node that only falls within the second stage range', () => {
    const node3 = { id: 'node3', type: 'condition', position: { x: 220, y: 300 }, data: {} }
    const membership = computeStageMembership([stageA, stageB, node3])
    expect(membership.stageB).toEqual(['node3'])
    expect(membership.stageA).toEqual([])
  })

  it('omits a node whose center falls outside every stage range (orphan)', () => {
    const node4 = { id: 'node4', type: 'process', position: { x: 900, y: 300 }, data: {} }
    const membership = computeStageMembership([stageA, stageB, node4])
    expect(Object.values(membership).flat()).not.toContain('node4')
  })

  it('returns an empty-array entry per stage when a stage has no members, and an empty object when there are no stages', () => {
    expect(computeStageMembership([stageA, stageB])).toEqual({ stageA: [], stageB: [] })
    expect(computeStageMembership([])).toEqual({})
  })

  it('never includes a stageLabel node as a member of another stage', () => {
    const membership = computeStageMembership([stageA, stageB])
    expect(Object.values(membership).flat()).toEqual([])
  })
})
