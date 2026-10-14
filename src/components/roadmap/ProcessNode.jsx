import { useCallback, useState } from 'react'
import { Position } from '@xyflow/react'
import { Maximize2 } from 'lucide-react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import ConnectionDot from './ConnectionDot'
import ProcessEditorModal from './ProcessEditorModal'

export default function ProcessNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const [expanded, setExpanded] = useState(false)

  const onLabelChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )
  const onNoteChange = useCallback(
    (e) => updateNodeData(id, { note: e.target.value }),
    [id, updateNodeData],
  )

  return (
    <div
      className={`relative w-32 h-32 rounded-xl border-2 bg-surface p-2.5 flex flex-col gap-1 transition-all ${
        selected ? 'border-edge shadow-hard-sm ring-2 ring-lime' : 'border-edge/60 shadow-hard-sm'
      }`}
    >
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />

      <input
        className="w-full text-[12px] font-semibold text-ink bg-transparent outline-none placeholder:text-ink-soft/50 focus:placeholder:text-ink-soft"
        placeholder="Title"
        value={data.label}
        onChange={onLabelChange}
      />
      <textarea
        className="w-full flex-1 text-[10px] text-ink-soft bg-transparent outline-none resize-none placeholder:text-ink-soft/50 focus:placeholder:text-ink-soft leading-tight"
        placeholder="Note (optional)"
        value={data.note}
        onChange={onNoteChange}
      />

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
        aria-label="ขยายดู/แก้ไข"
        className="nodrag absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-surface border-2 border-edge flex items-center justify-center text-ink-soft hover:text-brand"
      >
        <Maximize2 size={13} />
      </button>

      <ConnectionDot type="source" position={Position.Right} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />

      {expanded && (
        <ProcessEditorModal nodeId={id} data={data} onClose={() => setExpanded(false)} />
      )}
    </div>
  )
}
