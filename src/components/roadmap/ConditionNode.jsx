import { useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

export default function ConditionNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  const onLabelChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )

  return (
    // Root stays un-rotated — React Flow computes handle offsets from this
    // element's bounding box, so a transform here would misplace the handles.
    <div className="relative w-28 h-28">
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
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-400 !border-white !border-2"
      />
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        className="!w-3 !h-3 !bg-green-400 !border-white !border-2"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-green-400 !border-white !border-2"
      />
    </div>
  )
}
