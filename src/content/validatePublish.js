// Client mirror of functions/articleLogic.js `validateDraftForPublish`: lets the Studio
// show problems before calling the publishArticle function. The server re-validates;
// validatePublish.test.js proves both stay identical over shared fixtures.
import { CATEGORY_IDS, LIMITS, isValidSlug } from './schema'
import { parseBody } from './renderBody'

const MAX_DEPTH = 20
const blank = (v) => typeof v !== 'string' || v.trim() === ''
const byteLength = (s) => new TextEncoder().encode(s).length

function bodyStats(doc) {
  let text = ''
  let imagesMissingAlt = 0
  const walk = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > MAX_DEPTH) return
    if (node.type === 'text' && typeof node.text === 'string') text += node.text
    if (node.type === 'image' && !String(node.attrs?.alt ?? '').trim()) imagesMissingAlt += 1
    for (const child of Array.isArray(node.content) ? node.content : []) walk(child, depth + 1)
  }
  walk(doc, 0)
  return { text, imagesMissingAlt }
}

export function validateDraftForPublish(draft) {
  const errors = []
  const add = (field, code) => errors.push({ field, code })
  const d = draft ?? {}

  if (blank(d.title)) add('title', 'required')
  else if (d.title.length > LIMITS.titleMax) add('title', 'too_long')

  if (!isValidSlug(d.slug)) add('slug', 'invalid_slug')
  if (!CATEGORY_IDS.includes(d.category)) add('category', 'invalid_category')

  if (blank(d.excerpt)) add('excerpt', 'required')
  else if (d.excerpt.length > LIMITS.excerptMax) add('excerpt', 'too_long')

  if (blank(d.coverUrl)) add('coverUrl', 'required')
  else if (!/^https:\/\//i.test(d.coverUrl)) add('coverUrl', 'invalid_url')
  if (blank(d.coverAlt)) add('coverAlt', 'required')

  if (Array.isArray(d.tags) && d.tags.length > LIMITS.tagsMax) add('tags', 'too_many')

  const bodyText = typeof d.body === 'string' ? d.body : ''
  if (byteLength(bodyText) > LIMITS.bodyMaxBytes) {
    add('body', 'body_too_large')
  } else {
    const doc = parseBody(bodyText)
    const stats = doc ? bodyStats(doc) : null
    if (!stats || stats.text.trim() === '') add('body', 'empty_body')
    else if (stats.imagesMissingAlt > 0) add('body', 'image_alt_missing')
  }

  return { ok: errors.length === 0, errors }
}
