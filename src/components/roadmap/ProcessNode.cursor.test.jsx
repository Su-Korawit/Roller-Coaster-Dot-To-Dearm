// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let updateNodeDataSpy
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData: (...args) => updateNodeDataSpy(...args) }),
}))
vi.mock('./ConnectionDot', () => ({ default: () => null }))

const { default: ProcessNode } = await import('./ProcessNode')

// Regression guard: reproduces the exact data flow described in the reported
// cursor-jump-to-end bug (typing mid-string in a controlled input whose value
// comes from a brand-new object on every keystroke, matching how
// useRoadmapStore.updateNodeData + RoadmapPage really re-render this
// component). This passed when written (see Task 9 in
// docs/superpowers/plans/2026-07-04-roadmap-canvas-interaction.md for the
// full investigation) — if it ever starts failing, that's a real regression
// to fix, not a flake to skip.
function Harness({ initialLabel }) {
  const [data, setData] = useState({ label: initialLabel, note: '' })
  updateNodeDataSpy = (id, patch) => setData((d) => ({ ...d, ...patch }))
  return <ProcessNode id="n1" data={data} selected={false} />
}

describe('ProcessNode — caret position while editing mid-word', () => {
  it('typing a character after moving the caret inserts it there, not at the end', () => {
    render(<Harness initialLabel="hello world" />)
    const input = screen.getByPlaceholderText('Title')
    input.setSelectionRange(6, 6)
    fireEvent.change(input, { target: { value: 'hello Xworld', selectionStart: 7, selectionEnd: 7 } })
    expect(input.value).toBe('hello Xworld')
    expect(input.selectionStart).toBe(7)
  })
})
