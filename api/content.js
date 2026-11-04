/* global process */
// api/content.js
// Vercel serverless function — server-rendered pages for the ilovetcas.com content site
// (home, article, category, search, sitemap). vercel.json rewrites the hub hosts here.
//
// Each response is the real SPA shell (so the React app takes over in the browser) with
// the page's <head> (title, canonical, Open Graph, JSON-LD) swapped in and crawlable
// semantic HTML injected into #root — the same technique as scripts/prerender.mjs, but
// rendered on request and cached at the edge so a published article is visible within a
// minute with no rebuild.
//
// Data comes from Firestore's public REST API (published articles are world-readable).
// Imports below must keep explicit `.js` extensions: Vercel runs this as native ESM
// (api/vercelConfig.test.js guards it).
import { createFirestoreRest } from '../src/content/firestoreRest.js'
import {
  SITE_ORIGIN,
  MINIMAL_SHELL,
  homeBody,
  articleBody,
  categoryBody,
  searchBody,
  openHouseBody,
  OPEN_HOUSE_TITLE,
  OPEN_HOUSE_DESCRIPTION,
  notFoundBody,
  headFor,
  sitemapXml,
  injectIntoShell,
  fallbackPage,
} from '../src/content/htmlPages.js'
import { toSummary, relatedTo, toMillis } from '../src/content/listing.js'
import { CATEGORY_IDS, categoryLabel, isValidSlug } from '../src/content/schema.js'
import { SITES } from '../src/constants/sites.js'

const DEFAULT_PROJECT_ID = 'rollercoasterdottodream'
const CACHE_OK = 'public, s-maxage=60, stale-while-revalidate=86400'
const SHELL_TTL_MS = 5 * 60 * 1000
const BRAND = 'I LOVE TCAS'

// Shell cache keyed by the fetch function so tests (own fetch each) stay isolated.
const shellCache = new WeakMap()

async function loadShell(fetchImpl) {
  const hit = shellCache.get(fetchImpl)
  if (hit && Date.now() - hit.at < SHELL_TTL_MS) return hit.html
  try {
    const res = await fetchImpl(`${SITE_ORIGIN}/app.html`)
    if (!res.ok) throw new Error(`shell ${res.status}`)
    const html = await res.text()
    shellCache.set(fetchImpl, { html, at: Date.now() })
    return html
  } catch {
    // Real content without the SPA bundle still beats an error page for crawlers.
    return MINIMAL_SHELL
  }
}

function send(res, status, contentType, body, cache) {
  res.statusCode = status
  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', cache)
  res.end(body)
}

const iso = (value) => new Date(toMillis(value)).toISOString()

function articleJsonLd(article, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seo?.description || article.excerpt,
    image: article.coverUrl || undefined,
    datePublished: iso(article.publishedAt),
    dateModified: iso(article.updatedAt ?? article.publishedAt),
    author: { '@type': 'Person', name: article.authorName || BRAND },
    publisher: {
      '@type': 'Organization',
      name: BRAND,
      logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/brand/favicon-512.png` },
    },
    mainEntityOfPage: canonical,
    inLanguage: 'th',
  }
}

const hubJsonLd = [
  { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, url: SITE_ORIGIN, inLanguage: 'th' },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/brand/favicon-512.png`,
  },
]

export default async function handler(req, res, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch
  const rest = createFirestoreRest({
    fetchImpl,
    projectId: deps.projectId ?? process.env.FIREBASE_PROJECT_ID ?? DEFAULT_PROJECT_ID,
    apiKey: deps.apiKey ?? process.env.FIREBASE_API_KEY,
  })

  const route = String(req.query?.route ?? 'home')
  const html = async (status, { head, body }) => {
    const shell = await loadShell(fetchImpl)
    send(res, status, 'text/html; charset=utf-8', injectIntoShell(shell, { head, body }), CACHE_OK)
  }
  const notFound = () =>
    html(404, {
      head: headFor({ title: `ไม่พบบทความ | ${BRAND}`, description: 'ไม่พบหน้าที่ค้นหา', canonical: SITE_ORIGIN, noindex: true }),
      body: notFoundBody(),
    })

  try {
    switch (route) {
      case 'home': {
        const [list, config] = await Promise.all([rest.listPublished(60), rest.getConfig()])
        return html(200, {
          head: headFor({
            title: SITES.hub.title,
            description: SITES.hub.description,
            canonical: `${SITE_ORIGIN}/`,
            jsonLd: hubJsonLd,
            data: { summaries: list.map(toSummary), config },
          }),
          body: homeBody({ summaries: list.map(toSummary), config }),
        })
      }

      case 'article': {
        const slug = String(req.query?.slug ?? '')
        if (!isValidSlug(slug)) return notFound()
        const article = await rest.getArticle(slug)
        if (!article) return notFound()
        const [list, config] = await Promise.all([rest.listPublished(60), rest.getConfig()])
        const full = { ...article, slug }
        const canonical = `${SITE_ORIGIN}/blog/${slug}`
        return html(200, {
          head: headFor({
            title: `${article.seo?.title || article.title} | ${BRAND}`,
            description: article.seo?.description || article.excerpt,
            canonical,
            image: article.coverUrl || undefined,
            type: 'article',
            jsonLd: articleJsonLd(full, canonical),
            data: { article: full, summaries: list.map(toSummary), config },
          }),
          body: articleBody({ article: full, related: relatedTo(list.map(toSummary), full, 3), config }),
        })
      }

      case 'category': {
        const cat = String(req.query?.cat ?? '')
        if (!CATEGORY_IDS.includes(cat)) return notFound()
        const items = (await rest.listPublished(200)).map(toSummary).filter((a) => a.category === cat)
        return html(200, {
          head: headFor({
            title: `${categoryLabel(cat)} | ${BRAND}`,
            description: `บทความหมวด${categoryLabel(cat)} จาก ${BRAND}`,
            canonical: `${SITE_ORIGIN}/category/${cat}`,
          }),
          body: categoryBody({ category: cat, items }),
        })
      }

      case 'search':
        return html(200, {
          head: headFor({
            title: `ค้นหาบทความ | ${BRAND}`,
            description: 'ค้นหาบทความเรื่อง TCAS คณะ และมหาวิทยาลัย',
            canonical: `${SITE_ORIGIN}/search`,
            noindex: true,
          }),
          body: searchBody(),
        })

      case 'openhouse':
        return html(200, {
          head: headFor({
            title: OPEN_HOUSE_TITLE,
            description: OPEN_HOUSE_DESCRIPTION,
            canonical: `${SITE_ORIGIN}/openhouse`,
          }),
          body: openHouseBody(),
        })

      case 'sitemap': {
        const articles = (await rest.listPublished(500)).map((a) => ({ ...toSummary(a), updatedAt: a.updatedAt }))
        return send(res, 200, 'application/xml; charset=utf-8', sitemapXml({ articles }), CACHE_OK)
      }

      default:
        return notFound()
    }
  } catch (err) {
    console.error('[content api]', err)
    // Never cache or index a failure: the next request retries Firestore.
    return send(res, 503, 'text/html; charset=utf-8', fallbackPage(), 'no-store')
  }
}
