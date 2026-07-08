// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
vi.mock('../ui/Popup', () => ({ default: ({ children }) => <div>{children}</div> }))
const { default: StickerPickerSheet } = await import('./StickerPickerSheet')
const { STICKER_CATALOG } = await import('../../constants/stickerCatalog')

describe('StickerPickerSheet', () => {
  it('lists both groups and picks a sticker', () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<StickerPickerSheet onPick={onPick} onClose={onClose} />)
    const first = STICKER_CATALOG[0]
    fireEvent.click(screen.getByLabelText(first.label))
    expect(onPick).toHaveBeenCalledWith(first.url)
    expect(onClose).toHaveBeenCalled()
  })
})
