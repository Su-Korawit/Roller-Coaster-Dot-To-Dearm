import { useCallback } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import ConnectionDot from './ConnectionDot'

export default function ProcessNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

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
      className={`w-32 h-32 rounded-2xl border-2 bg-white shadow-md p-2.5 flex flex-col gap-1 transition-all ${
        selected ? 'border-brand shadow-brand/30 shadow-lg' : 'border-brand/40'
      }`}
    >
      <ConnectionDot type="target" position={Position.Left} />

      <input
        className="w-full text-[12px] font-semibold text-ink bg-transparent outline-none placeholder:text-gray-300 focus:placeholder:text-gray-200"
        placeholder="Title"
        value={data.label}
        onChange={onLabelChange}
      />
      <textarea
        className="w-full flex-1 text-[10px] text-gray-500 bg-transparent outline-none resize-none placeholder:text-gray-300 focus:placeholder:text-gray-200 leading-tight"
        placeholder="Note (optional)"
        value={data.note}
        onChange={onNoteChange}
      />

      <ConnectionDot type="source" position={Position.Right} />
    </div>
  )
}
