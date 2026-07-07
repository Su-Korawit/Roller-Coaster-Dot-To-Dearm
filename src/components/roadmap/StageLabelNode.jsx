import { useCallback } from 'react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Stage Label — a freely-draggable text node used as a presentational scaffold.
// No connection handles; position carries no semantic meaning.
export default function StageLabelNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  const onChange = useCallback(
    (e) => updateNodeData(id, { label: e.target.value }),
    [id, updateNodeData],
  )

  return (
    <div
      className={`group min-w-[100px] px-4 py-1.5 rounded-xl border-2 transition-all ${
        selected
          ? 'border-ink bg-brand-soft shadow-hard-sm'
          : 'border-ink/30 bg-surface hover:border-ink/60'
      }`}
    >
      <input
        className="pixel-font text-[10px] font-bold text-brand bg-transparent outline-none text-center w-full placeholder:text-brand/30"
        placeholder="Stage name"
        value={data.label}
        onChange={onChange}
      />
    </div>
  )
}
