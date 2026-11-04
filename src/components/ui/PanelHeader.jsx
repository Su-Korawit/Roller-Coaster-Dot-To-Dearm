import { X } from 'lucide-react'

// Shared chrome header for all full-screen panels.
export default function PanelHeader({ title, leftIcon, rightActions, onClose }) {
  return (
    <div className="rpg-plank flex items-center justify-between px-4 py-3 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
        <h2 className="font-display text-base font-bold text-ink truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {rightActions}
        <button
          onClick={onClose}
          aria-label="ปิด"
          className="px-btn w-9 h-9 flex items-center justify-center bg-paper text-ink
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <X size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
