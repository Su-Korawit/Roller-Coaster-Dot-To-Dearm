import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Task 5 replaces this stub with the full document viewer.
export default function FileViewerModal({ url, name, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-lg shadow-xl p-4 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="pixel-font text-[11px] font-bold text-ink truncate">{name}</p>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="neo-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:bg-brand-soft hover:text-ink shrink-0"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        <a
          href={url}
          download={name}
          className="pixel-font text-[10px] text-brand underline"
        >
          Download
        </a>
      </div>
    </div>,
    document.body,
  )
}
