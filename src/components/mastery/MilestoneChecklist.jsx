import { useMasteryStore, trackProgress } from '../../stores/useMasteryStore'

export default function MilestoneChecklist({ trackId }) {
  const track = useMasteryStore((s) => s.tracks.find((t) => t.id === trackId))
  const toggleMilestone = useMasteryStore((s) => s.toggleMilestone)

  if (!track) return null

  const { done, total } = trackProgress(track)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="pixel-font text-sm text-brand-strong">Milestones</h3>
        <span className="pixel-font text-[10px] text-brand-strong">{done}/{total} DONE</span>
      </div>
      <ul className="space-y-2">
        {track.milestones.map((m) => (
          <li key={m.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 bg-surface p-3">
              <input
                type="checkbox"
                role="checkbox"
                checked={m.done}
                onChange={() => toggleMilestone(trackId, m.id)}
                className="mt-1 h-4 w-4 accent-brand-strong"
              />
              <div>
                <p className="pixel-font text-[11px] text-ink">{m.title}</p>
                {m.desc && <p className="thai-font text-xs text-ink-soft">{m.desc}</p>}
              </div>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
