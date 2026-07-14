import { useEffect } from 'react'

const isEditableTarget = (el) =>
  el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable

// Ctrl/Cmd+C/V/D for the Roadmap canvas (Idea: "ทำ Short Cut Tool"). A no-op
// while focus is inside a text field (so normal browser copy/paste inside a
// block's own label/note input keeps working) and while the sheet is
// read-only. Duplicate mirrors the existing "Dupe" button in
// SelectionActionBar exactly; Copy/Paste read/write an in-memory clipboard
// (see useRoadmapStore) — never the OS clipboard, so nothing here needs
// navigator.clipboard permissions.
export function useRoadmapShortcuts({ enabled, hasSelection, onDuplicate, onCopy, onPaste }) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e) => {
      if (isEditableTarget(document.activeElement)) return
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'd') {
        e.preventDefault()
        onDuplicate()
      } else if (key === 'c') {
        if (!hasSelection) return
        e.preventDefault()
        onCopy()
      } else if (key === 'v') {
        e.preventDefault()
        onPaste()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, hasSelection, onDuplicate, onCopy, onPaste])
}
