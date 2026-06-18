import { useCallback } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import ConnectionDot from './ConnectionDot'

export default function ConditionNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  const onLabelChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )

  return (
    // Root stays un-rotated — React Flow computes handle offsets from this
    // element's bounding box, so a transform here would misplace the handles.
    <div className="relative w-32 h-32">
      {/* Visual diamond — rotation lives here, not on the root */}
      <div
        className={`absolute inset-0 rotate-45 border-2 bg-white shadow-md transition-all ${
          selected ? 'border-accent-pink shadow-accent-pink/30 shadow-lg' : 'border-accent-pink/50'
        }`}
        style={{ borderRadius: '12px' }}
      />

      {/* Centered text (root is upright, so no counter-rotation needed) */}
      <div className="absolute inset-0 flex items-center justify-center px-1">
        <input
          className="w-20 text-center text-[11px] font-semibold text-ink bg-transparent outline-none placeholder:text-gray-300"
          placeholder="Decision"
          value={data.label}
          onChange={onLabelChange}
        />
      </div>

      {/* Handles map to the true diamond corners now that the root is upright */}
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
    </div>
  )
}
