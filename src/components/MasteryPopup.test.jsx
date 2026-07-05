// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MasteryPopup from './MasteryPopup'
import { useUserStore } from '../stores/useUserStore'

describe('MasteryPopup', () => {
  beforeEach(() => {
    useUserStore.setState({ journeys: { mastery: [], career: [], university: [] }, activeMasteryBlockId: null })
  })

  it('renders a Mastery heading', () => {
    render(<MasteryPopup onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Mastery' })).toBeTruthy()
  })

  it('closes on backdrop click', () => {
    const onClose = vi.fn()
    const { container } = render(<MasteryPopup onClose={onClose} />)
    fireEvent.click(container.querySelector('[aria-hidden="true"]'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
