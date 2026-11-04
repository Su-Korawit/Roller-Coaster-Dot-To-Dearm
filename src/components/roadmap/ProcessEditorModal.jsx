import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Full-size editor for a Process block, portalled to document.body for the
// same transformed-viewport reason as FileViewerModal/MediaLightbox — the
// block lives inside React Flow's transformed pane, where a `position:fixed`
// child would inherit that scale/offset instead of the real screen. The
// block itself keeps its compact inline <input>/<textarea> for quick edits;
// this modal is only a more comfortable surface for a long note, writing
// through the exact same updateNodeData calls.
export default function ProcessEditorModal({ nodeId, data, onClose }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const onLabelChange = useCallback(
    (e) => updateNodeData(nodeId, { label: e.target.value }),
    [nodeId, updateNodeData],
  )
  const onNoteChange = useCallback(
    (e) => updateNodeData(nodeId, { note: e.target.value }),
    [nodeId, updateNodeData],
  )

  return createPortal(
    <div
      data-testid="process-editor-backdrop"
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg px-card flex flex-col overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center gap-2 rpg-plank px-4 py-3">
          <span className="pixel-font text-xs text-ink font-bold flex-1">Edit Process</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="px-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:text-ink"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
          <input
            className="w-full text-[14px] font-semibold text-ink bg-transparent border-b-2 border-line/30 outline-none focus:border-brand pb-2 placeholder:text-ink-soft/50"
            placeholder="Title"
            value={data.label}
            onChange={onLabelChange}
            autoFocus
          />
          <textarea
            className="w-full flex-1 min-h-[220px] text-[13px] text-ink bg-transparent outline-none resize-none placeholder:text-ink-soft/50 leading-relaxed"
            placeholder="Note (optional)"
            value={data.note}
            onChange={onNoteChange}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
