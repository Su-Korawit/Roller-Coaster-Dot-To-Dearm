import { useCallback, useRef, useState } from 'react'

const LONG_PRESS_MS = 500

// Touch/pen long-press-and-drag gesture for creating a new Roadmap block from
// a toolbar button. HTML5 drag-and-drop (`draggable`/`dataTransfer`) never
// fires on touch devices, so this is a separate Pointer Events based path,
// following the tap-vs-long-press disambiguation already used by
// PortfolioCircle.jsx (setTimeout + a "did it fire" ref flag), extended to
// track the pointer's live position afterwards so a ghost preview can follow
// it. Mouse pointers are ignored entirely — desktop uses the HTML5
// drag-and-drop path instead (see RoadmapPage.jsx / Task 2).
export function useLongPressDrag(onDrop) {
  const [dragState, setDragState] = useState(null)
  const timerRef = useRef(null)
  const draggingRef = useRef(false)

  const getHandlers = useCallback((type) => ({
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse') return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      draggingRef.current = false
      timerRef.current = setTimeout(() => {
        draggingRef.current = true
        setDragState({ type, x: e.clientX, y: e.clientY })
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e) => {
      if (e.pointerType === 'mouse' || !draggingRef.current) return
      setDragState((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
    },
    onPointerUp: (e) => {
      if (e.pointerType === 'mouse') return
      clearTimeout(timerRef.current)
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      if (draggingRef.current) {
        // A real gesture happened (movement past the long-press threshold) —
        // suppress the browser's synthetic "click" so tapping-then-dragging
        // doesn't also fire the button's click-to-add-at-centre handler.
        e.preventDefault?.()
        onDrop(type, { clientX: e.clientX, clientY: e.clientY })
      }
      draggingRef.current = false
      setDragState(null)
    },
    onPointerCancel: (e) => {
      clearTimeout(timerRef.current)
      e.currentTarget?.releasePointerCapture?.(e.pointerId)
      draggingRef.current = false
      setDragState(null)
    },
  }), [onDrop])

  return { dragState, getHandlers }
}
