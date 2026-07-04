import { useEffect, useRef } from 'react'

const MOBILE_BREAKPOINT_PX = 768
const MAX_TEXTAREA_HEIGHT_PX = 120

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX
}

export function useChatComposer(text, onSend) {
  const textareaRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`
  }, [text])

  function handleKeyDown(e) {
    if (isMobileViewport()) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return { textareaRef, handleKeyDown }
}
