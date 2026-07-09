// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('../ui/Popup', () => ({ default: ({ children }) => <div>{children}</div> }))

let entitlementsState
vi.mock('../../stores/useEntitlementsStore', () => ({
  useEntitlementsStore: (sel) => sel(entitlementsState),
}))

const { default: StickerPickerSheet } = await import('./StickerPickerSheet')
const { STICKER_CATALOG } = await import('../../constants/stickerCatalog')

describe('StickerPickerSheet', () => {
  beforeEach(() => {
    entitlementsState = { entitlements: {} }
  })

  it('lists both groups and picks a sticker', () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<StickerPickerSheet onPick={onPick} onClose={onClose} />)
    const first = STICKER_CATALOG[0]
    fireEvent.click(screen.getByLabelText(first.label))
    expect(onPick).toHaveBeenCalledWith(first.url)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows no premium group without owned packs', () => {
    render(<StickerPickerSheet onPick={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByText('พรีเมียม')).toBeNull()
  })

  it('merges owned premium sticker packs as a third group', () => {
    entitlementsState = {
      entitlements: {
        'pack-x': { kind: 'sticker-pack', payload: { stickers: [{ id: 'p1', label: 'มงกุฎ', url: 'data:crown' }] } },
      },
    }
    const onPick = vi.fn()
    render(<StickerPickerSheet onPick={onPick} onClose={vi.fn()} />)
    expect(screen.getByText('พรีเมียม')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('มงกุฎ'))
    expect(onPick).toHaveBeenCalledWith('data:crown')
  })
})
