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

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))
let updateNodeDataSpy
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData: (...args) => updateNodeDataSpy(...args) }),
}))

const { default: VideoPickerModal } = await import('./VideoPickerModal')
const { listFlat } = await import('../../utils/storageOps')

describe('VideoPickerModal', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    updateNodeDataSpy = vi.fn()
    listFlat.mockResolvedValue([])
  })

  it('lists previous uploads from the roadmap-video/ prefix, not roadmap/', async () => {
    render(<VideoPickerModal nodeId="n1" onClose={vi.fn()} />)
    await waitFor(() => expect(listFlat).toHaveBeenCalledWith('users/u1/roadmap-video/'))
  })

  it('picking an uploaded video replaces data.url and closes the modal', async () => {
    const { getDownloadURL } = await import('firebase/storage')
    listFlat.mockResolvedValue([{ path: 'x', ref: {} }])
    getDownloadURL.mockResolvedValue('https://cdn/clip.mp4')
    const onClose = vi.fn()
    render(<VideoPickerModal nodeId="n1" onClose={onClose} />)

    const thumb = await screen.findByRole('button', { name: 'เลือกวิดีโอนี้' })
    fireEvent.click(thumb)

    expect(updateNodeDataSpy).toHaveBeenCalledWith('n1', { url: 'https://cdn/clip.mp4' })
    expect(onClose).toHaveBeenCalled()
  })

  it('has no App images section (unlike ImagePickerModal)', () => {
    render(<VideoPickerModal nodeId="n1" onClose={vi.fn()} />)
    expect(screen.queryByText('App images')).toBeNull()
  })
})
