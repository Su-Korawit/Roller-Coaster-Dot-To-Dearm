// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }) => <div data-testid="rf">{children}</div>,
  ReactFlowProvider: ({ children }) => children,
  Background: () => null,
  Controls: () => null,
  applyNodeChanges: (_c, nodes) => nodes,
}))
vi.mock('../roadmap/TrashZone', () => ({
  default: () => null,
}))
vi.mock('../../services/fileBag', () => ({
  createBagFolder: vi.fn(),
  deleteBagFolderDoc: vi.fn(),
  deleteBagItemDoc: vi.fn(),
  deleteBagNativeFile: vi.fn(),
  moveBagItem: vi.fn(),
  updateBagFolderPosition: vi.fn(),
  updateBagItemPosition: vi.fn(),
  uploadToBag: vi.fn(),
}))
vi.mock('../../hooks/useBagClipboard', () => ({
  useBagClipboard: () => ({}),
}))

const { default: BagCanvas } = await import('./BagCanvas')
const { default: BagGridView } = await import('./BagGridView')

describe('BagCanvas', () => {
  it('renders and exposes new-folder control', () => {
    render(
      <BagCanvas
        uid="u1"
        folderId={null}
        items={[{ id: 'i1', name: 'a.png', kind: 'image', position: { x: 0, y: 0 } }]}
        folders={[{ id: 'f1', name: 'Docs', position: { x: 100, y: 0 } }]}
        category="images"
        onOpenFolder={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )
    expect(screen.getByText('+ Folder')).toBeTruthy()
    expect(screen.getByTestId('rf')).toBeTruthy()
  })
})

describe('BagGridView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens a folder when its tile is tapped', () => {
    const onOpenFolder = vi.fn()
    render(
      <BagGridView
        uid="u1"
        folderId={null}
        items={[]}
        folders={[{ id: 'f1', name: 'Docs' }]}
        category="files"
        onOpenFolder={onOpenFolder}
        onRefresh={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Docs'))
    expect(onOpenFolder).toHaveBeenCalledWith('f1')
  })
})
