import { useCallback, useRef } from 'react'
import { NodeResizer } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Stage Label — a freely-draggable text node used as a presentational scaffold.
// No connection handles; position carries no semantic meaning. Resizable by
// dragging its edges/corners when selected (React Flow's NodeResizer); the new
// width/height ride the existing node-change -> store -> Firestore sync.
export default function StageLabelNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const colorInputRef = useRef(null)

  const onChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )
  const onColorChange = useCallback(
    (e) => updateNodeData(id, { color: e.target.value }),
    [id, updateNodeData],
  )

  return (
    <>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={32} />
      <div
        className={`group w-full h-full min-w-[100px] px-4 py-1.5 rounded-full border flex items-center gap-2 transition-all ${
          selected
            ? 'border-brand bg-brand/10'
            : 'border-brand/30 bg-white/70 hover:border-brand/60'
        }`}
        style={data.color ? { borderColor: data.color } : undefined}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => colorInputRef.current?.click()}
          aria-label="Choose block color"
          className="nodrag shrink-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow"
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
          className="pixel-font text-[10px] font-bold text-brand bg-transparent outline-none text-center w-full placeholder:text-brand/30"
          placeholder="Stage name"
          value={data.label}
          onChange={onChange}
        />
      </div>
    </>
  )
}
