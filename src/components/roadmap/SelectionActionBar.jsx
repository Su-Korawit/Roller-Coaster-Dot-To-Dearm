import { Trash2, X } from 'lucide-react'

export default function SelectionActionBar({ count, onDelete, onCancel }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl shadow-lg px-4 py-2 border border-gray-100 mb-2">
      <span className="pixel-font text-[9px] text-gray-500">{count} selected</span>
      <button
        onClick={onDelete}
        aria-label="Delete selected blocks"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 min-h-[44px] min-w-[44px]"
      >
        <Trash2 size={15} className="text-red-500" strokeWidth={2} />
        <span className="pixel-font text-[8px] text-red-600">Delete</span>
      </button>
      <button
        onClick={onCancel}
        aria-label="Cancel selection"
        className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-[44px] min-w-[44px]"
      >
        <X size={16} className="text-gray-500" strokeWidth={2} />
      </button>
    </div>
  )
}
