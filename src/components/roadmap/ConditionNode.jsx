import { useCallback, useRef } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import ConnectionDot from './ConnectionDot'

export default function ConditionNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const colorInputRef = useRef(null)

  const onLabelChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )
  const onColorChange = useCallback(
    (e) => updateNodeData(id, { color: e.target.value }),
    [id, updateNodeData],
  )

  return (
    // Root stays un-rotated — React Flow computes handle offsets from this
    // element's bounding box, so a transform here would misplace the handles.
    <div className="relative w-32 h-32">
      {/* Visual diamond — rotation lives here, not on the root. The square is
          sized 1/√2 (70.71%) of the frame and centered so that once rotated 45°
          its four vertices land exactly on the frame's edge midpoints, where
          React Flow anchors the handles. This keeps the diamond's footprint at
          the full 128x128 (matching ProcessNode) and the dots flush on the edge. */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 bg-surface transition-all ${
          selected ? 'border-ink shadow-hard-sm' : 'border-ink/30 shadow-none'
        }`}
        style={{ width: '70.71%', height: '70.71%', borderRadius: '8px', ...(data.color ? { borderColor: data.color } : {}) }}
      />

      {/* Centered text (root is upright, so no counter-rotation needed) */}
      <div className="absolute inset-0 flex items-center justify-center px-1">
        <input
          className="w-20 text-center text-[11px] font-semibold text-ink bg-transparent outline-none placeholder:text-ink-soft/50"
          placeholder="Decision"
          value={data.label}
          onChange={onLabelChange}
        />
      </div>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => colorInputRef.current?.click()}
        aria-label="Choose block color"
        className="nodrag absolute top-1 right-1 w-5 h-5 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: data.color ?? '#f472b6' }}
      />
      <input
        ref={colorInputRef}
        type="color"
        value={data.color ?? '#f472b6'}
        onChange={onColorChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Handles map to the true diamond corners now that the root is upright */}
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
    </div>
  )
}
