import { hubArticleUrl } from '../../content/hubUrl'

// News on the Welcome page: the newest "news" articles of the content site. Each card
// links out to the article on ilovetcas.com.
export default function NewsSection({ news, loading }) {
  if (loading) {
    return (
      <section className="px-6 py-14">
        <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">NEWS &amp; UPDATES</h2>
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="neo-card overflow-hidden animate-pulse"
            >
              <div className="h-36 w-full bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }
  if (!news?.length) return null

  return (
    <section className="px-6 py-14">
      <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">NEWS & UPDATES</h2>
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((n) => (
          <a key={n.slug} href={hubArticleUrl(n.slug)} className="neo-card overflow-hidden text-left block">
            {n.coverUrl && <img src={n.coverUrl} alt={n.coverAlt ?? ''} className="h-36 w-full object-cover" />}
            <div className="p-4">
              <h3 className="thai-font font-bold text-ink">{n.title}</h3>
              <p className="thai-font mt-1 line-clamp-2 text-sm text-ink/60">{n.excerpt}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
