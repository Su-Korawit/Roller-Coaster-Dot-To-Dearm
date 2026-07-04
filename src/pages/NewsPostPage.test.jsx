// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

const navigate = vi.fn()
let paramsId
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ id: paramsId }),
}))

const getDoc = vi.fn()
vi.mock('firebase/firestore', () => ({ getDoc: (...args) => getDoc(...args) }))
vi.mock('../lib/db', () => ({ refs: { welcomeNewsPost: (id) => ({ _id: id }) } }))

const { default: NewsPostPage } = await import('./NewsPostPage')

const snapDoc = (id, data) => ({ id, exists: () => data != null, data: () => data })

describe('NewsPostPage', () => {
  beforeEach(() => { navigate.mockClear(); getDoc.mockClear(); paramsId = 'n1' })

  it('renders the post once loaded', async () => {
    getDoc.mockResolvedValueOnce(snapDoc('n1', { titleTh: 'อัปเดตใหม่', bodyTh: 'รายละเอียดข่าว' }))
    render(<NewsPostPage />)
    await waitFor(() => expect(screen.getByText('รายละเอียดข่าว')).toBeTruthy())
    expect(screen.getAllByText('อัปเดตใหม่').length).toBeGreaterThan(0)
  })

  it('shows a not-found message when the post does not exist', async () => {
    getDoc.mockResolvedValueOnce(snapDoc('n1', null))
    render(<NewsPostPage />)
    await waitFor(() => expect(screen.getByText('ไม่พบข่าวนี้ อาจถูกลบไปแล้ว')).toBeTruthy())
  })

  it('Back button navigates to the welcome page', async () => {
    getDoc.mockResolvedValueOnce(snapDoc('n1', { titleTh: 'ข่าว', bodyTh: 'เนื้อหา' }))
    render(<NewsPostPage />)
    await waitFor(() => expect(screen.getByText('เนื้อหา')).toBeTruthy())
    fireEvent.click(screen.getByLabelText('กลับ'))
    expect(navigate).toHaveBeenCalledWith('/')
  })
})
