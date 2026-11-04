import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useArticlesStore } from '../../stores/useArticlesStore'
import { categoryLabel } from '../../content/schema'
import { relatedTo, formatThaiDate } from '../../content/listing'
import { readSsrData } from '../../content/ssrData'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import HubLayout from '../../components/hub/HubLayout'
import ArticleBody from '../../components/hub/ArticleBody'
import ArticleCard from '../../components/hub/ArticleCard'
import CtaBlock from '../../components/hub/CtaBlock'

const MESSAGES = {
  loading: 'กำลังโหลดบทความ...',
  missing: 'ไม่พบบทความนี้',
  error: 'โหลดบทความไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง',
}

export default function ArticlePage() {
  const { slug } = useParams()
  const loadArticle = useArticlesStore((s) => s.loadArticle)
  const loadHome = useArticlesStore((s) => s.loadHome)
  const summaries = useArticlesStore((s) => s.summaries)
  const config = useArticlesStore((s) => s.config)
  // On a server-rendered page the article is already embedded: start from it so the
  // server HTML is not replaced by a loading message while Firestore answers.
  const [loaded, setLoaded] = useState(() => {
    const embedded = readSsrData()?.article
    return embedded?.slug === slug
      ? { slug, status: 'ready', article: embedded }
      : { slug: null, status: 'loading', article: null }
  })

  useEffect(() => {
    loadHome()
  }, [loadHome])

  useEffect(() => {
    let alive = true
    loadArticle(slug)
      .then((article) => {
        if (!alive) return
        // Only live articles exist in `articles`; a draft-looking document is never shown.
        setLoaded(
          article && article.status !== 'draft'
            ? { slug, status: 'ready', article }
            : { slug, status: 'missing', article: null },
        )
      })
      .catch(() => alive && setLoaded({ slug, status: 'error', article: null }))
    return () => {
      alive = false
    }
  }, [slug, loadArticle])

  // Until the requested slug has loaded, show the loading state (never a stale article).
  const state = loaded.slug === slug ? loaded : { status: 'loading', article: null }
  const { article } = state
  useDocumentTitle(article ? `${article.seo?.title || article.title} | I LOVE TCAS` : 'I LOVE TCAS')
  const related = useMemo(() => (article ? relatedTo(summaries, { ...article, slug }, 3) : []), [summaries, article, slug])

  return (
    <HubLayout testId="article-page">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 md:px-6">
        {state.status !== 'ready' ? (
          <div className="px-card p-6 text-center">
            <p className="thai-font text-base text-ink">{MESSAGES[state.status]}</p>
            {state.status !== 'loading' && (
              <Link to="/" className="font-display mt-3 inline-block text-sm font-semibold text-brand hover:underline">
                กลับหน้าแรก
              </Link>
            )}
          </div>
        ) : (
          <article>
            <Link to={`/category/${article.category}`} className="font-display text-[13px] font-semibold text-brand hover:underline">
              {categoryLabel(article.category)}
            </Link>
            <h1 className="font-display mt-2 text-3xl font-bold leading-tight text-ink md:text-4xl">{article.title}</h1>
            <p className="thai-font mt-3 text-sm text-ink-soft">
              {[article.authorName, formatThaiDate(article.publishedAt), `อ่าน ${article.readingMinutes ?? 1} นาที`]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {article.coverUrl && (
              <img
                src={article.coverUrl}
                alt={article.coverAlt}
                className="mt-6 w-full rounded-ui border-2 border-line object-cover"
              />
            )}
            <ArticleBody body={article.body} />
            <CtaBlock slug={slug} config={config} />
            {related.length > 0 && (
              <section className="mt-12" aria-labelledby="related-heading">
                <h2 id="related-heading" className="font-display mb-4 text-xl font-bold text-ink">
                  บทความที่เกี่ยวข้อง
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {related.map((a) => (
                    <ArticleCard key={a.slug} article={a} />
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </div>
    </HubLayout>
  )
}
