import { Link } from 'react-router-dom'
import ArticleCard from './ArticleCard'

export default function CategoryRow({ category, items }) {
  if (items.length === 0) return null
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-ink">{category.labelTh}</h2>
        <Link to={`/category/${category.id}`} className="font-display text-[13px] font-semibold text-brand hover:underline">
          ดูทั้งหมด
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>
    </section>
  )
}
