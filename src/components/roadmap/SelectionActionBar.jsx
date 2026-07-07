import { Trash2, Copy, Download, X } from 'lucide-react'

export default function SelectionActionBar({ count, onDuplicate, onExport, onDelete, onCancel }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-3 neo-slab rounded-xl px-4 py-2 mb-2">
      <span className="pixel-font text-[10px] text-ink-soft">{count} selected</span>
      <button
        onClick={onDuplicate}
        aria-label="Duplicate selected blocks"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-11 min-w-11"
      >
        <Copy size={15} className="text-brand" strokeWidth={2} />
        <span className="pixel-font text-[8px] text-brand">Dupe</span>
      </button>
      <button
        onClick={onExport}
        aria-label="Export selected blocks"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-11 min-w-11"
      >
        <Download size={15} className="text-brand" strokeWidth={2} />
        <span className="pixel-font text-[8px] text-brand">Export</span>
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete selected blocks"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-danger/10 hover:bg-danger/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger min-h-11 min-w-11"
      >
        <Trash2 size={15} className="text-danger" strokeWidth={2} />
        <span className="pixel-font text-[10px] text-danger">Delete</span>
      </button>
      <button
        onClick={onCancel}
        aria-label="Cancel selection"
        className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-brand-soft active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-11 min-w-11"
      >
        <X size={16} className="text-ink-soft" strokeWidth={2.5} />
      </button>
    </div>
  )
}
