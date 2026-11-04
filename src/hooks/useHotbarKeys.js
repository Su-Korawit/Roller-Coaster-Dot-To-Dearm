import { useEffect } from 'react'

const TYPING = ['INPUT', 'TEXTAREA', 'SELECT']

// Keyboard shortcuts for the hotbar: 1–7 use a slot, B opens the Bag, Esc closes the top
// sheet. Ignored while typing in a field or with a modifier held, so it never steals text input.
export function useHotbarKeys({ onSlot, onBag, onEscape }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t && (TYPING.includes(t.tagName) || t.isContentEditable)) return
      if (e.key === 'Escape') {
        onEscape?.()
        return
      }
      if (/^[1-7]$/.test(e.key)) {
        onSlot?.(Number(e.key) - 1)
      } else if (e.key === 'b' || e.key === 'B') {
        onBag?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSlot, onBag, onEscape])
}
