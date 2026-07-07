import { trackProgress } from '../../stores/useMasteryStore'

export default function MasteryTrackCard({ track, onOpen }) {
  const { done, total } = trackProgress(track)

  return (
    <button
      type="button"
      onClick={() => onOpen(track.id)}
      className="flex min-w-[140px] flex-col rounded-2xl border border-ink/10 bg-surface p-3 text-left shadow-hard-sm transition hover:border-brand active:scale-[0.98]"
    >
      <span className="pixel-font text-[10px] text-brand-strong uppercase">{track.round}</span>
      <p className="pixel-font mt-1 text-[11px] text-ink line-clamp-2">{track.title}</p>
      <p className="pixel-font mt-2 text-[10px] text-ink-soft">{done}/{total}</p>
    </button>
  )
}
