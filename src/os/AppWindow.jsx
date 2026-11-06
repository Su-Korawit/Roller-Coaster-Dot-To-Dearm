import { Suspense, useEffect } from 'react'
import { X } from 'lucide-react'
import { Z_PANEL } from '../constants/zIndex'

// An open app. Full screen on phones/tablets, a centred window on desktop.
export default function AppWindow({ app, onClose, onOpenApp }) {
  const { Icon, Component } = app

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 flex items-stretch lg:items-center justify-center lg:bg-ink/30"
      style={{ zIndex: Z_PANEL }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-label={app.name}
        className="px-card bg-paper text-ink flex flex-col w-full h-full lg:w-[min(960px,90vw)] lg:h-[min(680px,85vh)] animate-pop
          rounded-none lg:rounded-[var(--radius-ui)] border-0 lg:border-2"
      >
        <header className="flex items-center gap-2 px-3 h-11 shrink-0 border-b-2 border-hairline bg-mist">
          {Icon && (
            <span className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ background: app.tone }}>
              <Icon size={14} />
            </span>
          )}
          <h2 className="thai-font font-bold text-sm flex-1 truncate">{app.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`ปิด ${app.name}`}
            className="w-8 h-8 flex items-center justify-center rounded-ui hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<p className="thai-font text-sm text-ink-soft p-6">กำลังเปิด...</p>}>
            <Component app={app} onOpenApp={onOpenApp} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
