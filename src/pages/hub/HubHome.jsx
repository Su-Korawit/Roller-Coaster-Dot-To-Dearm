import { useEffect, useMemo } from 'react'
import { useArticlesStore } from '../../stores/useArticlesStore'
import { CATEGORIES } from '../../content/schema'
import { groupByCategory, toMillis } from '../../content/listing'
import { SITES } from '../../constants/sites'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import HubLayout from '../../components/hub/HubLayout'
import HubHero from '../../components/hub/HubHero'
import ArticleCard from '../../components/hub/ArticleCard'
import CategoryRow from '../../components/hub/CategoryRow'
import OpenChatBand from '../../components/hub/OpenChatBand'
import ToolsStrip from '../../components/hub/ToolsStrip'

// The new ilovetcas.com front door: full-screen banner into the app, then the latest
// articles by category, the LINE OpenChat invitation and the free tools.
export default function HubHome() {
  const summaries = useArticlesStore((s) => s.summaries)
  const config = useArticlesStore((s) => s.config)
  const loadHome = useArticlesStore((s) => s.loadHome)

  useEffect(() => {
    loadHome()
  }, [loadHome])
  useDocumentTitle(SITES.hub.title)

  const featured = useMemo(() => {
    if (summaries.length === 0) return null
    const picked = config?.featuredSlug && summaries.find((s) => s.slug === config.featuredSlug)
    if (picked) return picked
    return [...summaries].sort((a, b) => toMillis(b.publishedAt) - toMillis(a.publishedAt))[0]
  }, [summaries, config])

  const groups = useMemo(
    () => groupByCategory(summaries.filter((s) => s.slug !== featured?.slug), 3),
    [summaries, featured],
  )

  return (
    <HubLayout testId="hub-home">
      <HubHero config={config} />
      <div id="latest" className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-6">
        {featured && (
          <section data-testid="featured-article" aria-label="บทความเด่น">
            <ArticleCard article={featured} featured />
          </section>
        )}
        {CATEGORIES.map((c) => (
          <CategoryRow key={c.id} category={c} items={groups[c.id]} />
        ))}
        <OpenChatBand config={config} />
        <ToolsStrip />
      </div>
    </HubLayout>
  )
}
