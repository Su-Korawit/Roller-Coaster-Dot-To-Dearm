import { Link } from 'react-router-dom'
import { categoryLabel } from '../../content/schema'
import { formatThaiDate } from '../../content/listing'

// One article in a list. `featured` lays the cover beside the text on wide screens.
export default function ArticleCard({ article, featured = false }) {
  return (
    <Link
      to={`/blog/${article.slug}`}
      className={`px-card group block overflow-hidden transition-transform hover:-translate-y-0.5 ${
        featured ? 'md:grid md:grid-cols-[minmax(0,320px)_1fr]' : ''
      }`}
    >
      {article.coverUrl && (
        <img
          src={article.coverUrl}
          alt={article.coverAlt}
          width={640}
          height={360}
          loading="lazy"
          className={`aspect-video w-full border-b-2 border-line object-cover ${featured ? 'md:h-full md:border-b-0 md:border-r-2' : ''}`}
        />
      )}
      <div className="p-4 md:p-5">
        <span className="thai-font inline-block rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
          {categoryLabel(article.category)}
        </span>
        <h3 className={`font-display mt-2 font-bold leading-snug text-ink ${featured ? 'text-xl md:text-2xl' : 'text-base'}`}>
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="thai-font mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">{article.excerpt}</p>
        )}
        <p className="thai-font mt-2 text-xs text-ink-soft">
          {[formatThaiDate(article.publishedAt), `อ่าน ${article.readingMinutes ?? 1} นาที`].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  )
}
