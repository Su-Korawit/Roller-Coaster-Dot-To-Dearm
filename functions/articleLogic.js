/* global module, Buffer */
// Pure publish logic for the content site (spec: 2026-10-16-content-site-design.md).
// The Cloud Functions in index.js are thin wrappers around these helpers.
//
// CATEGORY_IDS / LIMITS / the slug rule are COPIES of src/content/schema.js
// (functions/ is a separate CommonJS package); src/content/validatePublish.test.js
// asserts both copies and both validators stay identical.

const CATEGORY_IDS = ['news', 'camps', 'guide', 'compare', 'motivation']
const LIMITS = {
  titleMax: 120,
  excerptMax: 160,
  tagsMax: 8,
  imageMaxBytes: 5 * 1024 * 1024,
  imageMaxWidth: 1600,
  bodyMaxBytes: 716800,
}
const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,79}$/
const CHARS_PER_MINUTE = 600
const MAX_DEPTH = 20

function parseBody(text) {
  if (typeof text !== 'string' || !text) return null
  try {
    const value = JSON.parse(text)
    return value && typeof value === 'object' && value.type === 'doc' ? value : null
  } catch {
    return null
  }
}

function walk(node, visit, depth = 0) {
  if (!node || typeof node !== 'object' || depth > MAX_DEPTH) return
  visit(node)
  for (const child of Array.isArray(node.content) ? node.content : []) walk(child, visit, depth + 1)
}

function bodyStats(doc) {
  let text = ''
  let imagesMissingAlt = 0
  walk(doc, (node) => {
    if (node.type === 'text' && typeof node.text === 'string') text += node.text
    if (node.type === 'image' && !String(node.attrs?.alt ?? '').trim()) imagesMissingAlt += 1
  })
  return { text, imagesMissingAlt }
}

function readingMinutes(doc) {
  const { text } = bodyStats(doc)
  return Math.max(1, Math.ceil(text.replace(/\s+/g, ' ').trim().length / CHARS_PER_MINUTE))
}

const blank = (v) => typeof v !== 'string' || v.trim() === ''

function validateDraftForPublish(draft) {
  const errors = []
  const add = (field, code) => errors.push({ field, code })
  const d = draft ?? {}

  if (blank(d.title)) add('title', 'required')
  else if (d.title.length > LIMITS.titleMax) add('title', 'too_long')

  if (typeof d.slug !== 'string' || !SLUG_RE.test(d.slug)) add('slug', 'invalid_slug')
  if (!CATEGORY_IDS.includes(d.category)) add('category', 'invalid_category')

  if (blank(d.excerpt)) add('excerpt', 'required')
  else if (d.excerpt.length > LIMITS.excerptMax) add('excerpt', 'too_long')

  if (blank(d.coverUrl)) add('coverUrl', 'required')
  else if (!/^https:\/\//i.test(d.coverUrl)) add('coverUrl', 'invalid_url')
  if (blank(d.coverAlt)) add('coverAlt', 'required')

  if (Array.isArray(d.tags) && d.tags.length > LIMITS.tagsMax) add('tags', 'too_many')

  const bodyText = typeof d.body === 'string' ? d.body : ''
  if (Buffer.byteLength(bodyText, 'utf8') > LIMITS.bodyMaxBytes) {
    add('body', 'body_too_large')
  } else {
    const doc = parseBody(bodyText)
    const stats = doc ? bodyStats(doc) : null
    if (!stats || stats.text.trim() === '') add('body', 'empty_body')
    else if (stats.imagesMissingAlt > 0) add('body', 'image_alt_missing')
  }

  return { ok: errors.length === 0, errors }
}

function fail(code, message, extra) {
  const err = new Error(message)
  err.code = code
  if (extra) Object.assign(err, extra)
  return err
}

// A draft that was ever published keeps its first slug forever.
function resolveSlug(draft) {
  return (draft && (draft.publishedSlug || draft.slug)) || ''
}

function planPublish({ draft, draftId, uid, isSuperAdmin, existingLive, now }) {
  if (!draft) throw fail('failed-precondition', 'Draft not found.')
  if (!isSuperAdmin && draft.authorUid !== uid) throw fail('permission-denied', 'Only the author can publish this draft.')

  const slug = resolveSlug(draft)
  const result = validateDraftForPublish({ ...draft, slug })
  if (!result.ok) throw fail('failed-precondition', 'The draft is incomplete.', { errors: result.errors })

  if (existingLive && existingLive.draftId !== draftId) throw fail('already-exists', 'This slug is already in use.')

  const publishedAt = existingLive?.publishedAt ?? now
  const doc = parseBody(draft.body)
  return {
    slug,
    liveDoc: {
      title: draft.title,
      excerpt: draft.excerpt,
      category: draft.category,
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      coverUrl: draft.coverUrl,
      coverAlt: draft.coverAlt,
      body: draft.body,
      authorUid: draft.authorUid,
      authorName: draft.authorName ?? '',
      draftId,
      seo: draft.seo ?? null,
      readingMinutes: readingMinutes(doc),
      publishedAt,
      updatedAt: now,
    },
    // liveUpdatedAt marks the draft state that is live: edits after it are unpublished.
    draftPatch: { publishedSlug: slug, publishedAt, updatedAt: now, isLive: true, liveUpdatedAt: now },
  }
}

function planUnpublish({ live, uid, isSuperAdmin }) {
  if (!live) throw fail('failed-precondition', 'Article not found.')
  if (!isSuperAdmin && live.authorUid !== uid) throw fail('permission-denied', 'Only the author can unpublish this article.')
}

module.exports = {
  CATEGORY_IDS,
  LIMITS,
  validateDraftForPublish,
  planPublish,
  planUnpublish,
  resolveSlug,
  readingMinutes,
}
