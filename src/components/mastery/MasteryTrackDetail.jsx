import { ArrowLeft } from 'lucide-react'
import { useMasteryStore } from '../../stores/useMasteryStore'
import MilestoneChecklist from './MilestoneChecklist'
import LootResources from './LootResources'
import CommunityQA from './CommunityQA'

export default function MasteryTrackDetail({ trackId, onBack }) {
  const track = useMasteryStore((s) => s.tracks.find((t) => t.id === trackId))

  if (!track) return null

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-brand-strong"
        aria-label="Back"
      >
        <ArrowLeft size={18} />
        <span className="pixel-font text-xs">Back</span>
      </button>
      <h2 className="pixel-font text-base text-brand-strong">{track.title}</h2>
      <MilestoneChecklist trackId={trackId} />
      <LootResources trackId={trackId} />
      <CommunityQA trackId={trackId} />
    </div>
  )
}
