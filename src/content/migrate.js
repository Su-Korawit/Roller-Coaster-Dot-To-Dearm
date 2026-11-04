// Converts legacy `welcomeConfig/news/items` posts (plain text) into content-site
// articles. Pure: scripts/migrateWelcomeNews.mjs does the Firestore I/O. Imports keep
// explicit `.js` extensions because Node (not Vite) loads this file.
import { LIMITS, isValidSlug } from './schema.js'
import { parseBody, readingMinutes } from './renderBody.js'

const byteLength = (s) => new TextEncoder().encode(s).length

function toDate(value, fallback) {
  if (value && typeof value.toDate === 'function') return value.toDate()
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
  }
  return fallback
}

function bodyFromText(text, title) {
  const lines = String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  const paragraphs = (lines.length ? lines : [title]).map((line) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: line }],
  }))
  return JSON.stringify({ type: 'doc', content: paragraphs })
}

export function welcomeNewsToArticle(oldDoc, id, { authorUid, authorName, now = new Date() }) {
  const title = String(oldDoc.titleTh ?? '').trim()
  const collapsed = String(oldDoc.bodyTh ?? '').replace(/\s+/g, ' ').trim()
  const excerpt = (collapsed || title).slice(0, LIMITS.excerptMax)
  const body = bodyFromText(oldDoc.bodyTh, title)
  const publishedAt = toDate(oldDoc.createdAt, now)
  const coverUrl = oldDoc.coverUrl ?? ''

  const shared = { title, excerpt, category: 'news', tags: [], coverUrl, coverAlt: title, body, authorUid, authorName, seo: null }
  const article = {
    ...shared,
    draftId: `legacy-${id}`,
    readingMinutes: readingMinutes(parseBody(body)),
    publishedAt,
    updatedAt: publishedAt,
  }
  const draft = { ...shared, slug: id, publishedSlug: id, isLive: true, liveUpdatedAt: publishedAt, publishedAt, createdAt: publishedAt, updatedAt: publishedAt }
  return { article, draft }
}

// existingIds: Set of article ids already present. Idempotent: re-planning after a run
// creates nothing. `oldDocs`: [{ id, ...data }].
export function planMigration(existingIds, oldDocs, opts) {
  const toCreate = []
  const skipped = []
  for (const old of oldDocs) {
    if (existingIds.has(old.id)) {
      skipped.push({ id: old.id, reason: 'already_exists' })
    } else if (!isValidSlug(old.id)) {
      skipped.push({ id: old.id, reason: 'invalid_slug' })
    } else {
      const { article, draft } = welcomeNewsToArticle(old, old.id, opts)
      if (byteLength(article.body) > LIMITS.bodyMaxBytes) skipped.push({ id: old.id, reason: 'body_too_large' })
      else toCreate.push({ id: old.id, article, draft })
    }
  }
  return { toCreate, skipped }
}
