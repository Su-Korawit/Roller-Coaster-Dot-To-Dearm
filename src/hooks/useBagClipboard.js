import { useEffect, useCallback, useRef } from 'react'
import { duplicateBagItem } from '../services/fileBag'

/**
 * Ctrl+C / Ctrl+V / Ctrl+D for Bag canvas.
 * Reference duplicates only (no Storage copy, no quota cost) — ADR-0016.
 * Only handles when selection is non-empty so browser clipboard works elsewhere.
 */
export function useBagClipboard({ enabled, selection, itemsById, folderId, onDuplicated }) {
  const clipboardRef = useRef([])

  const duplicateIds = useCallback(async (ids) => {
    const created = []
    for (const id of ids) {
      const item = itemsById[id]
      if (!item || item._bagType === 'folder') continue
      const newId = await duplicateBagItem(item, { folderId })
      created.push(newId)
    }
    onDuplicated?.(created)
  }, [itemsById, folderId, onDuplicated])

  useEffect(() => {
    if (!enabled) return undefined
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || selection.length === 0) return
      const key = e.key.toLowerCase()
      if (key === 'c') {
        e.preventDefault()
        clipboardRef.current = [...selection]
      } else if (key === 'v') {
        if (clipboardRef.current.length === 0) return
        e.preventDefault()
        duplicateIds(clipboardRef.current)
      } else if (key === 'd') {
        e.preventDefault()
        duplicateIds(selection)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, selection, duplicateIds])

  return { clipboardRef }
}
