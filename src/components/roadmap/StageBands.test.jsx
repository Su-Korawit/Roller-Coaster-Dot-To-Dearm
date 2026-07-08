// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
const { default: StageBands, DEFAULT_STAGES } = await import('./StageBands')

describe('StageBands', () => {
  it('renders a band per stage with proportional width', () => {
    render(<StageBands stages={DEFAULT_STAGES} onRename={vi.fn()} />)
    const school = screen.getByText('School').closest('[data-testid="stage-band"]')
    expect(school.style.width).toBe(`${(5 / 12) * 100}%`)
    expect(screen.getByText('University')).toBeTruthy()
  })

  it('renaming via double-click calls onRename', () => {
    const onRename = vi.fn()
    vi.spyOn(window, 'prompt').mockReturnValue('มัธยม')
    render(<StageBands stages={DEFAULT_STAGES} onRename={onRename} />)
    fireEvent.doubleClick(screen.getByLabelText('แก้ชื่อช่วง School'))
    expect(onRename).toHaveBeenCalledWith(0, 'มัธยม')
  })
})
