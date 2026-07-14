// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../firebase', () => ({ storage: {} }))
vi.mock('firebase/storage', () => ({
  ref: (_s, p) => ({ path: p }),
  getDownloadURL: vi.fn(),
}))
vi.mock('../../utils/storageOps', () => ({
  listFlat: vi.fn(),
  uploadAsset: vi.fn(),
}))
vi.mock('../../services/fileBag', () => ({
  registerBagItem: vi.fn().mockResolvedValue('bag-id'),
}))
vi.mock('../../hooks/useMytcas', () => ({ tcasLogoUrl: (id) => `logo-${id}` }))

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))
let userState
vi.mock('../../stores/useUserStore', () => ({
  useUserStore: (sel) => sel(userState),
}))
let selectState
vi.mock('../../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

let roadmapState
let updateNodeDataSpy
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel(roadmapState),
}))

const { default: ImagePickerModal } = await import('./ImagePickerModal')
const { listFlat } = await import('../../utils/storageOps')

describe('ImagePickerModal', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    userState = { profilePhotoURL: null }
    selectState = { university: null }
    updateNodeDataSpy = vi.fn()
    roadmapState = {
      nodes: [{ id: 'n1', data: { images: [{ url: 'existing.png', offset: { x: 50, y: 50 } }], activeIndex: 0 } }],
      updateNodeData: updateNodeDataSpy,
    }
    listFlat.mockResolvedValue([])
  })

  it('appends a picked upload to the album instead of replacing it, and stays open', async () => {
    const { getDownloadURL } = await import('firebase/storage')
    listFlat.mockResolvedValue([{ path: 'x', ref: {} }])
    getDownloadURL.mockResolvedValue('https://cdn/new.png')
    const onClose = vi.fn()
    render(<ImagePickerModal nodeId="n1" onClose={onClose} />)

    const thumb = await screen.findByRole('img', { name: 'image' })
    fireEvent.click(thumb.closest('button'))

    await waitFor(() => expect(updateNodeDataSpy).toHaveBeenCalled())
    expect(updateNodeDataSpy).toHaveBeenCalledWith('n1', {
      images: [
        { url: 'existing.png', offset: { x: 50, y: 50 } },
        { url: 'https://cdn/new.png', offset: { x: 50, y: 50 } },
      ],
      activeIndex: 1,
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows a helper hint telling the user to close the modal when done', () => {
    render(<ImagePickerModal nodeId="n1" onClose={vi.fn()} />)
    expect(screen.getByText(/close when you're done/i)).toBeTruthy()
  })
})
