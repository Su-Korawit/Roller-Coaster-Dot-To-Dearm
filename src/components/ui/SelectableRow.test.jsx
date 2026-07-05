// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SelectableRow from './SelectableRow'

describe('SelectableRow', () => {
  it('renders title + subtitle and fires onClick', () => {
    const onClick = vi.fn()
    render(<SelectableRow title="สายสามัญ" subtitle="Academic" onClick={onClick} />)
    fireEvent.click(screen.getByText('สายสามัญ'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('marks the radio as checked when selected', () => {
    render(<SelectableRow title="x" selected onClick={() => {}} />)
    expect(screen.getByRole('radio').getAttribute('aria-checked')).toBe('true')
  })
})
