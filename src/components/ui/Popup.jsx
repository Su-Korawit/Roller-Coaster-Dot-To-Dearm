import { useEffect } from 'react'
import DragHandle from './DragHandle'
import { Z_SHEET, Z_MODAL } from '../../constants/zIndex'
import { usePopupStore } from '../../stores/usePopupStore'
import { playSound } from '../../lib/sfx'

const SIZE_MAXW = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
const NAV_SAFE_PB = 'calc(env(safe-area-inset-bottom) + 96px)'

// Unified popup shell.
//   variant="sheet"  → bottom sheet (rounded top + drag handle), default
//   variant="center" → centered modal card
// size → standardized max-width. navSafe → bottom padding clearing the
// floating BottomNavBar. z-index comes from the semantic tokens.
export default function Popup({
  id,
  variant = 'sheet',
  size = 'md',
  maxHeight = 'max-h-[90vh]',
  backdrop = true,
  navSafe,
  zIndex,
  onClose,
  children,
}) {
  const isSheet = variant === 'sheet'
  const z = zIndex ?? (isSheet ? Z_SHEET : Z_MODAL)
  const clearNav = navSafe ?? isSheet
  const maxW = SIZE_MAXW[size] ?? SIZE_MAXW.md

  // Every panel/sheet announces itself with a short blip going up, and one going down.
  useEffect(() => {
    playSound('open')
    return () => playSound('close')
  }, [])

  useEffect(() => {
    if (!id) return
    usePopupStore.getState().open(id)
    return () => {
      if (usePopupStore.getState().activePopup === id) usePopupStore.getState().close()
    }
  }, [id])

  return (
    <div
      className={`absolute inset-0 flex flex-col ${
        isSheet ? 'justify-end' : 'items-center justify-center p-4'
      }`}
      style={{ zIndex: z }}
    >
      {backdrop && (
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`relative flex flex-col overflow-hidden w-full ${maxW} md:mx-auto ${maxHeight} ${
          isSheet ? 'neo-sheet animate-sheet-up' : 'neo-card'
        }`}
        style={clearNav ? { paddingBottom: NAV_SAFE_PB } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {isSheet && <DragHandle />}
        {children}
      </div>
    </div>
  )
}
