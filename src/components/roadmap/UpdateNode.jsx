import { useCallback } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import ConnectionDot from './ConnectionDot'

export default function UpdateNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  const onSummaryChange = useCallback(
    (e) => updateNodeData(id, { summary: e.target.value }),
    [id, updateNodeData],
  )

  return (
    <div
      className={`relative w-40 min-h-24 rounded-xl border-2 bg-amber-50 p-2.5 flex flex-col gap-1 ${
        selected ? 'border-amber-500 shadow-hard-sm' : 'border-amber-300'
      }`}
    >
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />
      <p className="pixel-font text-[8px] text-amber-700">UPDATE</p>
      <textarea
        className="w-full flex-1 text-[11px] text-ink bg-transparent outline-none resize-none placeholder:text-ink-soft/50 focus:placeholder:text-ink-soft leading-tight"
        placeholder="Summary"
        value={data.summary ?? ''}
        onChange={onSummaryChange}
      />
      {data.timestamp && (
        <p className="text-[9px] text-ink-soft mt-auto">{data.timestamp}</p>
      )}
      <ConnectionDot type="source" position={Position.Right} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
    </div>
  )
}
