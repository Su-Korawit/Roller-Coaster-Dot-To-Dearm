// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FileViewerModal from './FileViewerModal'

describe('FileViewerModal', () => {
  it('renders an inline iframe viewer for a .pdf', () => {
    const url = 'https://x/f.pdf?alt=media'
    render(<FileViewerModal url={url} name="sheet.pdf" onClose={vi.fn()} />)
    const iframe = screen.getByTitle('sheet.pdf')
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe.src).toBe(url)
  })

  it('shows the no-preview fallback for a .docx', () => {
    render(<FileViewerModal url="https://x/essay.docx" name="essay.docx" onClose={vi.fn()} />)
    expect(screen.queryByTitle('essay.docx')).toBeNull()
    expect(screen.getByText(/ยังไม่รองรับ|no preview/i)).toBeTruthy()
  })

  it('has a Download button and an open-in-new-tab link for every type', () => {
    const url = 'https://x/f.pdf?alt=media'
    render(<FileViewerModal url={url} name="sheet.pdf" onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'ดาวน์โหลดไฟล์' })).toBeTruthy()
    const link = screen.getByRole('link', { name: 'เปิดในแท็บใหม่' })
    expect(link.getAttribute('href')).toBe(url)
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('closes on backdrop click and Escape', () => {
    const onClose = vi.fn()
    render(<FileViewerModal url="https://x/f.pdf" name="sheet.pdf" onClose={onClose} />)
    fireEvent.click(screen.getByTestId('file-viewer-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
    onClose.mockClear()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
