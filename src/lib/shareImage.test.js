import { describe, it, expect, vi } from 'vitest'
import { shareImage } from './shareImage'

const blob = new Blob(['png'], { type: 'image/png' })
const doc = () => {
  const a = { click: vi.fn(), remove: vi.fn(), set href(v) { this._h = v }, get href() { return this._h } }
  return { a, createElement: vi.fn(() => a), body: { appendChild: vi.fn() } }
}
const urls = () => ({ createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })

describe('shareImage', () => {
  it('shares the file with the system sheet when the browser can', async () => {
    const nav = { canShare: vi.fn(() => true), share: vi.fn().mockResolvedValue(undefined) }
    const d = doc()
    expect(await shareImage(blob, 'card.png', { nav, doc: d, url: urls() })).toBe('shared')
    expect(nav.share).toHaveBeenCalledTimes(1)
    expect(nav.share.mock.calls[0][0].files[0].name).toBe('card.png')
    expect(d.a.click).not.toHaveBeenCalled()
  })

  it('treats closing the share sheet as cancelled, not as an error and not as a download', async () => {
    const nav = { canShare: () => true, share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })) }
    const d = doc()
    expect(await shareImage(blob, 'card.png', { nav, doc: d, url: urls() })).toBe('cancelled')
    expect(d.a.click).not.toHaveBeenCalled()
  })

  it('downloads when sharing files is not supported', async () => {
    const d = doc()
    const u = urls()
    expect(await shareImage(blob, 'card.png', { nav: {}, doc: d, url: u })).toBe('downloaded')
    expect(d.a.click).toHaveBeenCalledTimes(1)
    expect(d.a.download).toBe('card.png')
    expect(u.revokeObjectURL).toHaveBeenCalled()
  })

  it('downloads when share() fails for a reason other than the user closing it', async () => {
    const nav = { canShare: () => true, share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' })) }
    const d = doc()
    expect(await shareImage(blob, 'card.png', { nav, doc: d, url: urls() })).toBe('downloaded')
    expect(d.a.click).toHaveBeenCalledTimes(1)
  })

  it('downloads when canShare says no for files', async () => {
    const nav = { canShare: () => false, share: vi.fn() }
    expect(await shareImage(blob, 'card.png', { nav, doc: doc(), url: urls() })).toBe('downloaded')
    expect(nav.share).not.toHaveBeenCalled()
  })

  it('save-only mode never opens the share sheet', async () => {
    const nav = { canShare: () => true, share: vi.fn() }
    expect(await shareImage(blob, 'card.png', { nav, doc: doc(), url: urls(), saveOnly: true })).toBe('downloaded')
    expect(nav.share).not.toHaveBeenCalled()
  })
})
