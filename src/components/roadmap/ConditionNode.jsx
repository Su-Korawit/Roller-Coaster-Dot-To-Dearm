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
    // Outer rotated wrapper produces the diamond shape
    <div
      className={`w-28 h-28 rotate-45 border-2 bg-white shadow-md flex items-center justify-center transition-all ${
        selected ? 'border-accent-pink shadow-accent-pink/30 shadow-lg' : 'border-accent-pink/50'
      }`}
      style={{ borderRadius: '12px' }}
    >
      {/* Inner counter-rotated so text stays upright */}
      <div className="-rotate-45 flex items-center justify-center w-full px-1">
        <input
          className="w-20 text-center text-[11px] font-semibold text-ink bg-transparent outline-none placeholder:text-gray-300"
          placeholder="Decision"
          value={data.label}
          onChange={onLabelChange}
        />
      </div>

      {/* Target handle — left point of diamond */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-5 !h-5 !bg-white !border-black !border-[3px] !-rotate-45"
      />
      {/* Source handle 1 — top point (outgoing branch) */}
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        className="!w-5 !h-5 !bg-white !border-black !border-[3px] !-rotate-45"
      />
      {/* Source handle 2 — bottom point (fork outgoing) */}
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!w-5 !h-5 !bg-white !border-black !border-[3px] !-rotate-45"
      />
    </div>
  )
}
