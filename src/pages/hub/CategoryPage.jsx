import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useArticlesStore } from '../../stores/useArticlesStore'
import { CATEGORY_IDS, categoryLabel } from '../../content/schema'
import { toMillis } from '../../content/listing'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import HubLayout from '../../components/hub/HubLayout'
import ArticleCard from '../../components/hub/ArticleCard'

const PAGE_SIZE = 12

export default function CategoryPage() {
  const { cat } = useParams()
  const summaries = useArticlesStore((s) => s.summaries)
  const loadHome = useArticlesStore((s) => s.loadHome)
  const [view, setView] = useState({ cat, count: PAGE_SIZE })
  // A different category starts from the first page again.
  const visible = view.cat === cat ? view.count : PAGE_SIZE

  useEffect(() => {
    loadHome()
  }, [loadHome])
  useDocumentTitle(CATEGORY_IDS.includes(cat) ? `${categoryLabel(cat)} | I LOVE TCAS` : 'I LOVE TCAS')

  const items = useMemo(
    () =>
      summaries
        .filter((s) => s.category === cat)
        .sort((a, b) => toMillis(b.publishedAt) - toMillis(a.publishedAt)),
    [summaries, cat],
  )

  if (!CATEGORY_IDS.includes(cat)) return <Navigate to="/" replace />

  return (
    <HubLayout testId="category-page">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-6">
        <h1 className="font-display text-3xl font-bold text-ink">{categoryLabel(cat)}</h1>
        {items.length === 0 ? (
          <p className="thai-font mt-6 text-base text-ink-soft">ยังไม่มีบทความในหมวดนี้ กลับมาดูใหม่เร็ว ๆ นี้</p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.slice(0, visible).map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
            {visible < items.length && (
              <button
                type="button"
                onClick={() => setView({ cat, count: visible + PAGE_SIZE })}
                className="px-btn font-display mx-auto mt-8 block rounded-ui bg-paper px-6 py-2.5 text-sm font-semibold text-ink"
              >
                โหลดเพิ่ม
              </button>
            )}
          </>
        )}
      </div>
    </HubLayout>
  )
}
