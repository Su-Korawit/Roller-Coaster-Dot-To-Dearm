// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@xyflow/react', () => ({
  Panel: ({ children }) => <div data-testid="rf-panel">{children}</div>,
}))
vi.mock('./SelectionActionBar', () => ({
  default: ({ count }) => (count > 0 ? <div data-testid="selection-bar">{count}</div> : null),
}))

const { default: RoadmapToolbar } = await import('./RoadmapToolbar')

const PALETTE = [
  {
    type: 'process',
    label: 'Process',
    preview: <div data-testid="preview-process" />,
  },
  {
    type: 'image',
    label: 'Image',
    preview: <div data-testid="preview-image" />,
  },
]

describe('RoadmapToolbar', () => {
  it('renders palette items and fires onAddType', () => {
    const onAddType = vi.fn()
    render(
      <RoadmapToolbar
        paletteItems={PALETTE}
        onAddType={onAddType}
        onToggleSelectMode={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Add Process block')).toBeTruthy()
    expect(screen.getByLabelText('Add Image block')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Add Process block'))
    expect(onAddType).toHaveBeenCalledWith('process')
  })

  it('fires select-mode toggle callback', () => {
    const onToggleSelectMode = vi.fn()
    render(
      <RoadmapToolbar
        paletteItems={PALETTE}
        onAddType={vi.fn()}
        onToggleSelectMode={onToggleSelectMode}
        mobileSelectMode={false}
      />,
    )
    fireEvent.click(screen.getByLabelText('Enter select mode'))
    expect(onToggleSelectMode).toHaveBeenCalledTimes(1)
  })

  it('hides the palette strip when wireframe mode and showPalette is false', () => {
    render(
      <RoadmapToolbar
        showPalette={false}
        paletteItems={PALETTE}
        onAddType={vi.fn()}
        wireframe={{
          onText: vi.fn(),
          lineMode: false,
          onToggleLine: vi.fn(),
          onStickers: vi.fn(),
          onTogglePalette: vi.fn(),
        }}
      />,
    )
    expect(screen.queryByLabelText('Add Process block')).toBeNull()
    expect(screen.getByLabelText('เพิ่มบล็อก')).toBeTruthy()
  })
})
