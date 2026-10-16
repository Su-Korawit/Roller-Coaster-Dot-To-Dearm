import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useArticlesStore } from '../../stores/useArticlesStore'
import { searchSummaries } from '../../content/listing'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import HubLayout from '../../components/hub/HubLayout'
import ArticleCard from '../../components/hub/ArticleCard'
import { siteHref } from '../../components/landing/SiteNav'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const summaries = useArticlesStore((s) => s.summaries)
  const loadHome = useArticlesStore((s) => s.loadHome)

  useEffect(() => {
    loadHome()
  }, [loadHome])
  useDocumentTitle('ค้นหาบทความ | I LOVE TCAS')

  const results = useMemo(() => searchSummaries(summaries, q), [summaries, q])
  const onChange = (e) => {
    setQ(e.target.value)
    setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })
  }

  return (
    <HubLayout testId="search-page">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-6">
        <h1 className="font-display text-3xl font-bold text-ink">ค้นหาบทความ</h1>
        <input
          type="search"
          value={q}
          onChange={onChange}
          aria-label="ค้นหาบทความ"
          placeholder="พิมพ์ชื่อคณะ มหาลัย หรือหัวข้อที่สนใจ"
          className="px-input thai-font mt-5 w-full max-w-xl px-4 py-3 text-base text-ink placeholder:text-ink-soft"
        />
        {q.trim() === '' ? (
          <p className="thai-font mt-6 text-base text-ink-soft">พิมพ์ชื่อคณะ มหาลัย หรือหัวข้อที่สนใจเพื่อค้นหาบทความ</p>
        ) : results.length === 0 ? (
          <div className="mt-6">
            <p className="thai-font text-base text-ink">ไม่พบบทความ</p>
            <a href={siteHref('tcas')} className="font-display mt-2 inline-block text-sm font-semibold text-brand hover:underline">
              ค้นหาคณะและหลักสูตรโดยตรง
            </a>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        )}
      </div>
    </HubLayout>
  )
}
