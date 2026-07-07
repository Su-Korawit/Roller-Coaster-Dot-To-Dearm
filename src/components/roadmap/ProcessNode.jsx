import { useCallback, useRef } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import ConnectionDot from './ConnectionDot'

export default function ProcessNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const colorInputRef = useRef(null)

  const onLabelChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )
  const onNoteChange = useCallback(
    (e) => updateNodeData(id, { note: e.target.value }),
    [id, updateNodeData],
  )
  const onColorChange = useCallback(
    (e) => updateNodeData(id, { color: e.target.value }),
    [id, updateNodeData],
  )

  return (
    <div
      className={`relative w-32 h-32 rounded-xl border-2 bg-surface p-2.5 flex flex-col gap-1 transition-all ${
        selected ? 'border-ink shadow-hard-sm' : 'border-ink/30 shadow-none'
      }`}
      style={data.color ? { borderColor: data.color } : undefined}
    >
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => colorInputRef.current?.click()}
        aria-label="Choose block color"
        className="nodrag absolute top-1 right-1 w-5 h-5 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: data.color ?? '#94a3b8' }}
      />
      <input
        ref={colorInputRef}
        type="color"
        value={data.color ?? '#94a3b8'}
        onChange={onColorChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

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

      <ConnectionDot type="source" position={Position.Right} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
    </div>
  )
}
