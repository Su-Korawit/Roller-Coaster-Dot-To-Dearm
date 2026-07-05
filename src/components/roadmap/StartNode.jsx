import { useCallback, useState } from 'react'
import { Position } from '@xyflow/react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { useUserStore } from '../../stores/useUserStore'
import { resolveLinkedJourney } from '../../utils/resolveLinkedJourney'
import ConnectionDot from './ConnectionDot'
import JourneyPickerModal from './JourneyPickerModal'

const PROGRESS_GAIN = 10

// Start block — the entry point of a Roadmap, two-way bound to one Journey
// item from Profile (useUserStore.journeys). Unlike Process/Condition it has
// no target handle: a Start block is never the destination of a connection,
// only ever the source of one.
export default function StartNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const journeys = useUserStore((s) => s.journeys)
  const updateJourneyProgress = useUserStore((s) => s.updateJourneyProgress)
  const [pickerOpen, setPickerOpen] = useState(false)

  const journeyRef = data.journeyRef ?? null
  const linked = resolveLinkedJourney(journeyRef, journeys)
  // A ref exists but resolveLinkedJourney came back empty: the item was
  // deleted from Profile after this block was linked to it.
  const isBroken = Boolean(journeyRef) && !linked

  const unlink = useCallback(() => updateNodeData(id, { journeyRef: null }), [id, updateNodeData])

  const gainProgress = useCallback(() => {
    if (!journeyRef) return
    updateJourneyProgress(journeyRef.category, journeyRef.id, `+${PROGRESS_GAIN}% via Roadmap`, PROGRESS_GAIN)
  }, [journeyRef, updateJourneyProgress])

  return (
    <div
      className={`relative w-32 h-32 rounded-2xl border-2 bg-white shadow-md p-2 flex flex-col gap-1 transition-all ${
        selected ? 'border-emerald-500 shadow-emerald-500/30 shadow-lg' : 'border-emerald-500/40'
      }`}
    >
      <span className="pixel-font text-[8px] text-emerald-600 font-bold">START</span>

      {!journeyRef && (
        <button
          onClick={() => setPickerOpen(true)}
          className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 text-emerald-500 text-[10px] px-2 hover:bg-emerald-50 active:scale-95 transition-all"
        >
          Link to Journey
        </button>
      )}

      {isBroken && (
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
          <span className="text-[9px] text-red-500 text-center leading-tight">
            Linked journey was removed
          </span>
          <button
            onClick={unlink}
            className="text-[9px] text-emerald-600 underline hover:text-emerald-700"
          >
            Choose another
          </button>
        </div>
      )}

      {linked && (
        <div className="flex-1 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-ink leading-tight line-clamp-1">
            {linked.title || '—'}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, linked.progress || 0)}%` }}
              />
            </div>
            <span className="text-[10px] text-purple-600 font-semibold">{linked.progress || 0}%</span>
          </div>
          <button
            onClick={gainProgress}
            className="mt-auto text-[9px] bg-emerald-500 text-white rounded-lg py-1 hover:bg-emerald-600 active:scale-95 transition-all"
          >
            +{PROGRESS_GAIN}% progress
          </button>
        </div>
      )}

      {/* No target handle — a Start block has no incoming connection. */}
      <ConnectionDot id="bottom" type="source" position={Position.Bottom} />
      <ConnectionDot type="source" position={Position.Right} />

      {pickerOpen && <JourneyPickerModal nodeId={id} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}
