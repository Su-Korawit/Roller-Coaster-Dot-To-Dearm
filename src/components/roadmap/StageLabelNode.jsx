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
          ? 'border-line bg-brand-soft shadow-hard-sm ring-2 ring-lime'
          : 'border-line/60 bg-paper hover:border-line'
      }`}
    >
      <input
        className="pixel-font text-xs font-bold text-brand bg-transparent outline-none text-center w-full placeholder:text-brand/30"
        placeholder="Stage name"
        value={data.label}
        onChange={onChange}
      />
    </div>
  )
}
