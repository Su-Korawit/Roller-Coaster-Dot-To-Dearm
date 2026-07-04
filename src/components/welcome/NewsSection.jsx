import { useNavigate } from 'react-router-dom'

export default function NewsSection({ news }) {
  const navigate = useNavigate()
  if (!news?.length) return null

  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">NEWS & UPDATES</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((n) => (
          <button
            key={n.id}
            onClick={() => navigate(`/news/${n.id}`)}
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
    </section>
  )
}
