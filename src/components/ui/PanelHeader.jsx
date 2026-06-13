// Shared chrome header for all full-screen panels.
// leftIcon: rendered left of title (optional)
// rightActions: node(s) rendered right of the close button (optional)
// onClose: required — close button calls this
export default function PanelHeader({ title, leftIcon, rightActions, onClose }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
        <h2 className="pixel-font text-[11px] text-gray-800 truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {rightActions}
        <button
          onClick={onClose}
          aria-label="ปิด"
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400
            hover:bg-gray-100 active:scale-90 transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span aria-hidden="true" className="text-base leading-none">✕</span>
        </button>
      </div>
    </div>
  )
}
