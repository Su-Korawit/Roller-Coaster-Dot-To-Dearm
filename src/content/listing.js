// List helpers for the content site. Pure: shared by the browser stores, the Vercel
// function (src/content/htmlPages.js) and tests.
import { CATEGORY_IDS } from './schema'

// Accepts ISO strings (REST), Dates, numbers, and Firestore Timestamps.
export function toMillis(value) {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.seconds === 'number') return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1e6)
  const t = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isFinite(t) ? t : 0
}

export function toSummary(article) {
  return {
    slug: article.slug ?? article.id,
    title: article.title ?? '',
    excerpt: article.excerpt ?? '',
    category: article.category ?? '',
    tags: Array.isArray(article.tags) ? article.tags : [],
    coverUrl: article.coverUrl ?? '',
    coverAlt: article.coverAlt ?? '',
    authorName: article.authorName ?? '',
    publishedAt: article.publishedAt ?? null,
    readingMinutes: article.readingMinutes ?? 1,
  }
}

const newestFirst = (a, b) => toMillis(b.publishedAt) - toMillis(a.publishedAt)

export function groupByCategory(summaries, perCategory = 3) {
  const groups = Object.fromEntries(CATEGORY_IDS.map((id) => [id, []]))
  for (const s of [...summaries].sort(newestFirst)) {
    if (groups[s.category] && groups[s.category].length < perCategory) groups[s.category].push(s)
  }
  return groups
}

export function searchSummaries(summaries, query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return []
  return summaries.filter((s) => `${s.title} ${s.excerpt} ${s.tags.join(' ')}`.toLowerCase().includes(q))
}

export function relatedTo(summaries, article, n = 3) {
  const others = summaries.filter((s) => s.slug !== article.slug).sort(newestFirst)
  const same = others.filter((s) => s.category === article.category)
  const rest = others.filter((s) => s.category !== article.category)
  return [...same, ...rest].slice(0, n)
}
