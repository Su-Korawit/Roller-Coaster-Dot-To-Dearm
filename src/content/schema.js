// Content-site schema: categories, limits and slug helpers. Pure (no imports) so the
// browser, the Vercel function and tests all share it. `functions/articleLogic.js`
// keeps its own copy of the constants (separate CommonJS package); a parity test
// (`validatePublish.test.js`) keeps both in step.

export const CATEGORIES = [
  { id: 'news', labelTh: 'ข่าว TCAS' },
  { id: 'camps', labelTh: 'ค่ายและกิจกรรม' },
  { id: 'guide', labelTh: 'แนะแนวเลือกคณะ' },
  { id: 'compare', labelTh: 'เทียบโครงการ' },
  { id: 'motivation', labelTh: 'ให้กำลังใจ' },
]

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

export function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.labelTh ?? ''
}

export const LIMITS = {
  titleMax: 120,
  excerptMax: 160,
  tagsMax: 8,
  imageMaxBytes: 5 * 1024 * 1024,
  imageMaxWidth: 1600,
  bodyMaxBytes: 716800,
}

const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,79}$/

export function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug)
}

// Latin letters/digits only: Thai titles yield '' (callers fall back to suggestSlug).
export function slugify(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

export function suggestSlug(title, fallbackId) {
  const fromTitle = slugify(title)
  if (fromTitle.length >= 3) return fromTitle
  return `a-${String(fallbackId ?? '').slice(0, 8).toLowerCase()}`
}
