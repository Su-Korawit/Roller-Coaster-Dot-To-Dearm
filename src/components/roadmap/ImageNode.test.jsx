// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DEFAULT_IMAGE_OFFSET } from '../../utils/normalizeImageNodeData'

const uploadRoadmapImageMock = vi.fn().mockResolvedValue('https://x/new')
vi.mock('../../utils/uploadRoadmapImage', () => ({
  uploadRoadmapImage: (...args) => uploadRoadmapImageMock(...args),
}))

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

let updateNodeDataSpy
let mockUpdateNodeData
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

const pngFile = new File(['x'], 'p.png', { type: 'image/png' })

function Harness({ initialData, selected = false }) {
  const [data, setData] = useState(initialData)
  updateNodeDataSpy = (id, patch) => {
    mockUpdateNodeData(id, patch)
    setData((d) => ({ ...d, ...patch }))
  }
  return <ImageNode id="n1" data={data} selected={selected} />
}

describe('ImageNode', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    mockUpdateNodeData = vi.fn()
    uploadRoadmapImageMock.mockClear()
  })

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

  it('uploads and appends a dropped image file', async () => {
    render(<Harness initialData={{}} />)
    const nodeRoot = screen.getByRole('button', { name: 'Choose image' }).parentElement
    fireEvent.drop(nodeRoot, { dataTransfer: { files: [pngFile] } })
    await waitFor(() => expect(mockUpdateNodeData).toHaveBeenCalled())
    expect(mockUpdateNodeData).toHaveBeenCalledWith('n1', {
      images: [{ url: 'https://x/new', offset: DEFAULT_IMAGE_OFFSET }],
      activeIndex: 0,
    })
  })

  it('uploads and appends a pasted image while the node is selected', async () => {
    render(<Harness initialData={{}} selected />)
    fireEvent.paste(window, { clipboardData: { files: [pngFile] } })
    await waitFor(() => expect(mockUpdateNodeData).toHaveBeenCalled())
    expect(mockUpdateNodeData).toHaveBeenCalledWith('n1', {
      images: [{ url: 'https://x/new', offset: DEFAULT_IMAGE_OFFSET }],
      activeIndex: 0,
    })
  })

  it('ignores paste when the node is not selected', () => {
    render(<Harness initialData={{}} selected={false} />)
    fireEvent.paste(window, { clipboardData: { files: [pngFile] } })
    expect(uploadRoadmapImageMock).not.toHaveBeenCalled()
  })
})
