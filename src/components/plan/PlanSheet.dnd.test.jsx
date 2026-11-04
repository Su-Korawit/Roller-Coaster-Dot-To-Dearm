// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// The drag library cannot be driven without a layout engine, so its two seams are pinned instead:
// what we tell Draggable (the handle is a <button>, which the library refuses to drag from unless
// interactive-element blocking is disabled — dragging silently did nothing without it) and what
// we do when it reports a finished drag.
const dnd = vi.hoisted(() => ({ draggableProps: [], onDragEnd: null }))
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ onDragEnd, children }) => {
    dnd.onDragEnd = onDragEnd
    return <div>{children}</div>
  },
  Droppable: ({ children }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children, ...props }) => {
    dnd.draggableProps.push(props)
    return children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: { 'data-handle': 'true' } }, { isDragging: false })
  },
}))
vi.mock('../../stores/useEntitlementsStore', () => ({
  useEntitlementsStore: { getState: () => ({ extraPlanSlots: () => 10 }) },
}))
vi.mock('../../stores/useTcasEventsStore', () => ({
  useTcasEventsStore: Object.assign((sel) => sel({ events: [] }), { getState: () => ({ events: [] }) }),
}))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: PlanSheet } = await import('./PlanSheet')
const { usePlansStore } = await import('../../stores/usePlansStore')

const add = (n) => usePlansStore.getState().addFromProgram({
  universityId: `u${n}`, universityName: `มหาวิทยาลัย ${n}`, programId: `p${n}`, programName: `หลักสูตร ${n}`,
  buildingId: 'med', round: 3, minGpax: 2.5, scores: [],
})
const order = () => usePlansStore.getState().plans.map((p) => [p.programName, p.rank])

beforeEach(() => {
  dnd.draggableProps = []
  dnd.onDragEnd = null
  usePlansStore.getState().resetPlans()
  add(1); add(2); add(3)
})

describe('round-3 ranking', () => {
  it('every row is draggable from its <button> handle (interactive-element blocking is off)', () => {
    render(<PlanSheet onClose={() => {}} today="2027-01-01" />)
    const handle = screen.getByRole('button', { name: 'ลากเพื่อเรียง หลักสูตร 1' })
    expect(handle.tagName).toBe('BUTTON')
    expect(dnd.draggableProps).toHaveLength(3)
    for (const p of dnd.draggableProps) expect(p.disableInteractiveElementBlocking).toBe(true)
  })

  it('draggable ids and indices follow the rank order shown', () => {
    render(<PlanSheet onClose={() => {}} today="2027-01-01" />)
    expect(dnd.draggableProps.map((p) => p.index)).toEqual([0, 1, 2])
    expect(new Set(dnd.draggableProps.map((p) => p.draggableId)).size).toBe(3)
  })

  it('a finished drag reorders the ranks; a drag dropped outside the list changes nothing', () => {
    render(<PlanSheet onClose={() => {}} today="2027-01-01" />)
    dnd.onDragEnd({ source: { index: 0 }, destination: { index: 1 } })
    expect(order()).toEqual([['หลักสูตร 1', 2], ['หลักสูตร 2', 1], ['หลักสูตร 3', 3]])
    dnd.onDragEnd({ source: { index: 0 }, destination: null })
    expect(order()).toEqual([['หลักสูตร 1', 2], ['หลักสูตร 2', 1], ['หลักสูตร 3', 3]])
  })
})
