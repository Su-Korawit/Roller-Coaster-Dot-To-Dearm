// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../services/fileBag', () => ({
  duplicateBagItem: vi.fn().mockResolvedValue('new-id'),
}))

const { useBagClipboard } = await import('./useBagClipboard')
const { duplicateBagItem } = await import('../services/fileBag')

describe('useBagClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Ctrl+D duplicates the current selection (reference, not Storage copy)', async () => {
    const onDuplicated = vi.fn()
    const itemsById = {
      a: { id: 'a', ownerUid: 'u', storagePath: 'users/u/bag/x', name: 'a', kind: 'file', source: 'bag-upload' },
    }
    renderHook(() => useBagClipboard({
      enabled: true,
      selection: ['a'],
      itemsById,
      folderId: null,
      onDuplicated,
    }))

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }))
      await Promise.resolve()
    })

    expect(duplicateBagItem).toHaveBeenCalledWith(itemsById.a, { folderId: null })
  })

  it('does not handle shortcuts when selection is empty', async () => {
    renderHook(() => useBagClipboard({
      enabled: true,
      selection: [],
      itemsById: {},
      folderId: null,
    }))

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }))
      await Promise.resolve()
    })

    expect(duplicateBagItem).not.toHaveBeenCalled()
  })
})
