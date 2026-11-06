import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Z_SHEET } from '../constants/zIndex'

// Small dialog used by the Home screen: bottom sheet on phones, centred card on larger screens.
export default function OsSheet({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center bg-ink/40"
      style={{ zIndex: Z_SHEET }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="px-card bg-paper text-ink w-full sm:max-w-md p-5 pb-7 sm:pb-5 animate-pop rounded-b-none sm:rounded-b-[var(--radius-ui)]"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="thai-font font-bold text-base">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="w-8 h-8 flex items-center justify-center rounded-ui hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
