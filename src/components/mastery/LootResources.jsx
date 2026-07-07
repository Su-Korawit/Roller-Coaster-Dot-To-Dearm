import { useMasteryStore } from '../../stores/useMasteryStore'

const TYPE_STYLES = {
  reading: { bg: 'bg-good/10', border: 'border-good/30', label: 'READING', cta: 'EXPLORE →' },
  podcast: { bg: 'bg-warn/10', border: 'border-warn/30', label: 'PODCAST', cta: 'LISTEN ▶' },
  course: { bg: 'bg-brand-soft', border: 'border-brand', label: 'COURSE', cta: 'EXPLORE →' },
  book: { bg: 'bg-brand-soft', border: 'border-brand', label: 'BOOK', cta: 'EXPLORE →' },
}

export default function LootResources({ trackId }) {
  const track = useMasteryStore((s) => s.tracks.find((t) => t.id === trackId))
  const resources = track?.resources ?? []

  return (
    <section className="space-y-3">
      <h3 className="pixel-font text-sm text-brand-strong">Loot &amp; Resources</h3>
      {resources.length === 0 ? (
        <p className="thai-font text-xs text-ink-soft">ยังไม่มีแหล่งเรียนรู้</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => {
            const style = TYPE_STYLES[r.type] ?? TYPE_STYLES.reading
            return (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-xl border p-3 ${style.bg} ${style.border}`}
              >
                <span className="pixel-font text-[10px] text-ink-soft">{style.label}</span>
                <p className="pixel-font mt-1 text-[11px] text-ink">{r.title}</p>
                <span className="pixel-font mt-2 inline-block text-[9px] text-brand-strong">{style.cta}</span>
              </a>
            )
          })}
        </div>
      )}
    </section>
  )
}
