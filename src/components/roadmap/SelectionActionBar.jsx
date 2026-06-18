import { Trash2, Copy, X } from 'lucide-react'

export default function SelectionActionBar({ count, onDuplicate, onDelete, onCancel }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl shadow-lg px-4 py-2 border border-gray-100 mb-2">
      <span className="pixel-font text-[9px] text-gray-500">{count} selected</span>
      <button
        onClick={onDuplicate}
        aria-label="Duplicate selected blocks"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-11 min-w-11"
      >
        <Copy size={15} className="text-brand" strokeWidth={2} />
        <span className="pixel-font text-[8px] text-brand">Dupe</span>
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete selected blocks"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 min-h-11 min-w-11"
      >
        <Trash2 size={15} className="text-red-500" strokeWidth={2} />
        <span className="pixel-font text-[8px] text-red-600">Delete</span>
      </button>
      <button
        onClick={onCancel}
        aria-label="Cancel selection"
        className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-11 min-w-11"
      >
        <X size={16} className="text-gray-500" strokeWidth={2} />
      </button>
    </div>
  )
}
