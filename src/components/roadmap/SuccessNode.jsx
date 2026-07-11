import { Position } from '@xyflow/react'
import ConnectionDot from './ConnectionDot'

export default function SuccessNode({ data, selected }) {
  const summary = data.summary ?? ''

  return (
    <div
      className={`relative w-40 min-h-24 rounded-xl border-2 bg-emerald-50 p-2.5 flex flex-col gap-1 ${
        selected ? 'border-emerald-500 shadow-hard-sm' : 'border-emerald-300'
      }`}
    >
      <ConnectionDot type="target" position={Position.Left} />
      <ConnectionDot id="top" type="source" position={Position.Top} />
      <p className="pixel-font text-[8px] text-emerald-700">SUCCESS</p>
      <p className="text-[11px] text-ink leading-tight whitespace-pre-wrap">
        {summary || <span className="text-ink-soft/50">Summary</span>}
      </p>
      {data.timestamp && (
        <p className="text-[9px] text-ink-soft mt-auto">{data.timestamp}</p>
      )}
      <ConnectionDot type="source" position={Position.Right} />
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
    </div>
  )
}
