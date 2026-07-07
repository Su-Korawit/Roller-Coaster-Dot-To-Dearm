import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useUserStore } from '../../stores/useUserStore'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

const CATEGORIES = [
  { key: 'mastery', label: 'Mastery' },
  { key: 'career', label: 'Career' },
  { key: 'university', label: 'University' },
]

// Picker for linking a Roadmap Start block to one Journey item across all 3
// useUserStore categories. Rendered through a portal to document.body — same
// reason as ImagePickerModal: the Start block lives inside React Flow's
// transformed viewport, where a `fixed` child would anchor to that transform
// (scaled/offset, unclickable) instead of the real screen.
export default function JourneyPickerModal({ nodeId, onClose }) {
  const journeys = useUserStore((s) => s.journeys)
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  function pick(category, item) {
    updateNodeData(nodeId, { journeyRef: { category, id: item.id } })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm max-h-[80vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b-2 border-ink/10 flex items-center justify-between shrink-0">
          <p className="pixel-font text-[11px] font-bold text-ink">Link to Journey</p>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="neo-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:bg-brand-soft hover:text-ink"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {CATEGORIES.map(({ key, label }) => {
            const items = journeys?.[key] || []
            return (
              <div key={key} className="flex flex-col gap-2">
                <p className="pixel-font text-[10px] text-ink-soft">{label}</p>
                {items.length === 0 ? (
                  <span className="pixel-font text-[10px] text-ink-soft/50">No journey items yet</span>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => pick(key, item)}
                      className="w-full text-left rounded-xl border border-ink/10 px-3 py-2 hover:border-brand hover:bg-brand/5 active:scale-95 transition-all"
                    >
                      <span className="thai-font text-xs font-semibold text-ink">{item.title || '—'}</span>
                    </button>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
