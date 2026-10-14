import { useCallback } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { IDEA_STATUSES } from '../../constants/irBoard'
import ConnectionDot from './ConnectionDot'

export default function IdeaRootNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const onTitle = useCallback(
    (e) => updateNodeData(id, { title: e.target.value }),
    [id, updateNodeData],
  )
  const onStatus = useCallback(
    (e) => updateNodeData(id, { status: e.target.value }),
    [id, updateNodeData],
  )

  return (
    <div
      className={`relative w-32 h-32 rounded-xl border-2 bg-brand-soft p-2.5 flex flex-col gap-1 ${
        selected ? 'border-brand shadow-hard-sm' : 'border-brand/40'
      }`}
    >
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />
      <p className="pixel-font text-[8px] text-brand">IDEA</p>
      <input
        className="nodrag w-full text-[12px] font-semibold text-ink bg-transparent outline-none"
        placeholder="Idea title"
        value={data.title ?? ''}
        onChange={onTitle}
      />
      <select
        aria-label="Idea status"
        className="nodrag w-full text-[10px] text-ink bg-surface border border-edge/50 rounded px-1 py-0.5"
        value={data.status ?? 'idea'}
        onChange={onStatus}
      >
        {IDEA_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <ConnectionDot type="source" position={Position.Right} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
    </div>
  )
}
