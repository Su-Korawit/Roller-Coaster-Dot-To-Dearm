// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../services/articleImages', () => ({
  uploadArticleImage: vi.fn(),
  ImageError: class ImageError extends Error {},
}))

const { default: ArticleEditor } = await import('./ArticleEditor')
const { parseBody } = await import('../../content/renderBody')

const doc = (...content) => JSON.stringify({ type: 'doc', content })
const para = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })

const collectTypes = (node, out = new Set()) => {
  out.add(node.type)
  for (const c of node.content ?? []) collectTypes(c, out)
  return out
}

// jsdom has no layout; ProseMirror asks for rects when it scrolls the cursor into view.
const noRects = () => Object.assign([], { item: () => null })
const zeroRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 })
Range.prototype.getClientRects = noRects
Range.prototype.getBoundingClientRect = zeroRect
Element.prototype.getClientRects = noRects

let onChange
beforeEach(() => {
  onChange = vi.fn()
})

const mount = (initialBody = doc(para('เริ่มต้น'))) =>
  render(<ArticleEditor draftId="d1" initialBody={initialBody} onChange={onChange} />)

const lastDoc = () => parseBody(onChange.mock.calls.at(-1)[0])

describe('ArticleEditor', () => {
  it('offers exactly the formatting the renderer supports', async () => {
    mount()
    for (const name of ['ตัวหนา', 'ตัวเอียง', 'หัวข้อใหญ่', 'หัวข้อย่อย', 'รายการจุด', 'รายการเลข', 'อ้างอิง', 'ลิงก์', 'รูปภาพ', 'ตาราง', 'เส้นคั่น']) {
      expect(await screen.findByRole('button', { name })).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: /โค้ด|ขีดฆ่า|ขีดเส้นใต้/ })).toBeNull()
  })

  it('reports changes as a JSON string that parseBody accepts', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'เส้นคั่น' }))
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(typeof onChange.mock.calls.at(-1)[0]).toBe('string')
    expect(lastDoc()?.type).toBe('doc')
  })

  it('inserts a 3x3 table whose first row is a header row', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'ตาราง' }))
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const table = lastDoc().content.find((n) => n.type === 'table')
    expect(table.content).toHaveLength(3)
    expect(table.content[0].content.every((c) => c.type === 'tableHeader')).toBe(true)
    expect(table.content[1].content.every((c) => c.type === 'tableCell')).toBe(true)
    expect(table.content[0].content).toHaveLength(3)
  })

  it('turns the current block into a heading', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'หัวข้อใหญ่' }))
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const heading = lastDoc().content.find((n) => n.type === 'heading')
    expect(heading.attrs.level).toBe(2)
  })

  it('never writes node types the renderer would drop', async () => {
    const body = doc(para('ก่อน'), { type: 'codeBlock', content: [{ type: 'text', text: 'alert(1)' }] }, para('หลัง'))
    mount(body)
    fireEvent.click(await screen.findByRole('button', { name: 'เส้นคั่น' }))
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const allowed = new Set(['doc', 'paragraph', 'heading', 'text', 'hardBreak', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'horizontalRule', 'image', 'table', 'tableRow', 'tableHeader', 'tableCell'])
    for (const type of collectTypes(lastDoc())) expect(allowed.has(type), type).toBe(true)
    // the unsupported block goes, the text around it stays
    expect(JSON.stringify(lastDoc())).toContain('ก่อน')
    expect(JSON.stringify(lastDoc())).toContain('หลัง')
    expect(JSON.stringify(lastDoc())).not.toContain('alert(1)')
  })
})
