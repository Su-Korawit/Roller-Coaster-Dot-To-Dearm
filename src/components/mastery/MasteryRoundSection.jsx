import { useMemo } from 'react'
import { useMasteryStore } from '../../stores/useMasteryStore'
import MasteryTrackCard from './MasteryTrackCard'

export default function MasteryRoundSection({ round, label, onOpen }) {
  const allTracks = useMasteryStore((s) => s.tracks)
  const tracks = useMemo(() => allTracks.filter((t) => t.round === round), [allTracks, round])

  if (!tracks.length) return null

  return (
    <section className="space-y-3">
      <h3 className="pixel-font text-sm text-brand-strong">{label}</h3>
      <div className="flex flex-wrap gap-3">
        {tracks.map((track) => (
          <MasteryTrackCard key={track.id} track={track} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}
