// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let userState
let updateNodeData

vi.mock('../../stores/useUserStore', () => ({
  useUserStore: (sel) => sel(userState),
}))
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData }),
}))

const { default: JourneyPickerModal } = await import('./JourneyPickerModal')

describe('JourneyPickerModal', () => {
  beforeEach(() => {
    updateNodeData = vi.fn()
    userState = {
      journeys: {
        mastery: [{ id: 'm1', title: 'Learn React' }],
        career: [],
        university: [{ id: 'u1', title: 'Apply to KMUTT' }],
      },
    }
  })

  it('lists journey items grouped by category', () => {
    render(<JourneyPickerModal nodeId="n1" onClose={() => {}} />)
    expect(screen.getByText('Learn React')).toBeTruthy()
    expect(screen.getByText('Apply to KMUTT')).toBeTruthy()
  })

  it('shows an empty state for a category with no items', () => {
    render(<JourneyPickerModal nodeId="n1" onClose={() => {}} />)
    expect(screen.getAllByText('No journey items yet')).toHaveLength(1) // only 'career' is empty
  })

  it('picking an item calls updateNodeData with the journeyRef and closes', () => {
    const onClose = vi.fn()
    render(<JourneyPickerModal nodeId="n1" onClose={onClose} />)
    fireEvent.click(screen.getByText('Learn React'))
    expect(updateNodeData).toHaveBeenCalledWith('n1', { journeyRef: { category: 'mastery', id: 'm1' } })
    expect(onClose).toHaveBeenCalled()
  })
})
