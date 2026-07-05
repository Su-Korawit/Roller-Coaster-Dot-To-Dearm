// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let updateNodeDataSpy
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData: (...args) => updateNodeDataSpy(...args) }),
}))
vi.mock('./ConnectionDot', () => ({ default: () => null }))
vi.mock('./ImagePickerModal', () => ({
  default: ({ nodeId }) => <div data-testid="picker" data-node-id={nodeId} />,
}))
vi.mock('./MediaLightbox', () => ({
  default: ({ items }) => <div data-testid="lightbox" data-count={items.length} />,
}))

const { default: ImageNode } = await import('./ImageNode')

function Harness({ initialData }) {
  const [data, setData] = useState(initialData)
  updateNodeDataSpy = (id, patch) => setData((d) => ({ ...d, ...patch }))
  return <ImageNode id="n1" data={data} selected={false} />
}

describe('ImageNode', () => {
  it('shows the empty state and opens the picker when tapped', () => {
    render(<Harness initialData={{}} />)
    expect(screen.getByText('tap to choose')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Choose image' }))
    expect(screen.getByTestId('picker').dataset.nodeId).toBe('n1')
  })

  it('renders a legacy single-image node via the normalizer', () => {
    render(<Harness initialData={{ url: 'legacy.png', offset: { x: 10, y: 20 } }} />)
    const img = screen.getByTestId('node-image')
    expect(img.src).toContain('legacy.png')
    expect(img.style.objectPosition).toBe('10% 20%')
  })

  it('pages through an album and shows the position indicator', () => {
    render(
      <Harness
        initialData={{ images: [{ url: 'a.png' }, { url: 'b.png' }, { url: 'c.png' }], activeIndex: 0 }}
      />,
    )
    expect(screen.getByText('1/3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'รูปถัดไป' }))
    expect(screen.getByText('2/3')).toBeTruthy()
    expect(screen.getByTestId('node-image').src).toContain('b.png')
  })

  it('removes the active image from the album', () => {
    render(<Harness initialData={{ images: [{ url: 'a.png' }, { url: 'b.png' }], activeIndex: 0 }} />)
    fireEvent.click(screen.getByRole('button', { name: 'ลบรูปนี้' }))
    expect(screen.getByTestId('node-image').src).toContain('b.png')
    expect(screen.queryByRole('button', { name: 'รูปถัดไป' })).toBeNull()
  })

  it('opens the lightbox with the full album', () => {
    render(<Harness initialData={{ images: [{ url: 'a.png' }, { url: 'b.png' }], activeIndex: 0 }} />)
    fireEvent.click(screen.getByRole('button', { name: 'ขยายรูป' }))
    expect(screen.getByTestId('lightbox').dataset.count).toBe('2')
  })
})
