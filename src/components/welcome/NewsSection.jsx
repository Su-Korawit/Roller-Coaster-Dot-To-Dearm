import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet'

export default function NewsSection({ news }) {
  const [active, setActive] = useState(null)
  if (!news?.length) return null

  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">NEWS &amp; UPDATES</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((n) => (
          <button
            key={n.id}
            onClick={() => setActive(n)}
            className="neo-card overflow-hidden text-left"
          >
            {n.coverUrl && <img src={n.coverUrl} alt="" className="h-36 w-full object-cover" />}
            <div className="p-4">
              <h3 className="thai-font font-bold text-ink">{n.titleTh}</h3>
              <p className="thai-font mt-1 line-clamp-2 text-sm text-ink/60">{n.bodyTh}</p>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-[60]">
          <BottomSheet onClose={() => setActive(null)}>
            <div className="p-5">
              {active.coverUrl && (
                <img src={active.coverUrl} alt="" className="mb-4 w-full rounded-xl object-cover" />
              )}
              <h3 className="thai-font text-lg font-bold text-ink">{active.titleTh}</h3>
              <p className="thai-font mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/80">
                {active.bodyTh}
              </p>
            </div>
          </BottomSheet>
        </div>
      )}
    </section>
  )
}
