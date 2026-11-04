// Article body renderer: TipTap/ProseMirror JSON -> safe HTML.
//
// The body is stored as JSON text and rendered here with a whitelist, so a creator
// account can never inject script: unknown nodes/marks are dropped, all text and
// attributes are escaped, links are limited to https/http/mailto and images to
// https. Pure and dependency-free; used by the browser, the Vercel function and tests.

export const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

const MAX_DEPTH = 20
const CHARS_PER_MINUTE = 600
const LINK_SCHEMES = new Set(['https:', 'http:', 'mailto:'])

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

function safeUrl(value, schemes) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value.trim())
    return schemes.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function renderText(node) {
  let html = escapeHtml(node.text ?? '')
  for (const mark of Array.isArray(node.marks) ? node.marks : []) {
    if (mark?.type === 'bold') html = `<strong>${html}</strong>`
    else if (mark?.type === 'italic') html = `<em>${html}</em>`
    else if (mark?.type === 'link') {
      const href = safeUrl(mark.attrs?.href, LINK_SCHEMES)
      if (href) html = `<a href="${escapeHtml(href)}" rel="noopener noreferrer nofollow">${html}</a>`
    }
  }
  return html
}

function span(attrs) {
  const n = Number(attrs?.colspan)
  return Number.isInteger(n) && n > 1 && n <= 10 ? ` colspan="${n}"` : ''
}

function renderChildren(node, depth) {
  return (Array.isArray(node.content) ? node.content : []).map((child) => renderNode(child, depth + 1)).join('')
}

const wrap = (tag) => (node, depth) => `<${tag}>${renderChildren(node, depth)}</${tag}>`
const cell = (tag) => (node, depth) => `<${tag}${span(node.attrs)}>${renderChildren(node, depth)}</${tag}>`

const RENDERERS = {
  paragraph: wrap('p'),
  heading: (node, depth) => {
    const tag = Number(node.attrs?.level) <= 2 ? 'h2' : 'h3'
    return `<${tag}>${renderChildren(node, depth)}</${tag}>`
  },
  text: (node) => renderText(node),
  hardBreak: () => '<br>',
  bulletList: wrap('ul'),
  orderedList: wrap('ol'),
  listItem: wrap('li'),
  blockquote: wrap('blockquote'),
  horizontalRule: () => '<hr>',
  image: (node) => {
    const src = safeUrl(node.attrs?.src, new Set(['https:']))
    if (!src) return ''
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.attrs?.alt ?? '')}" loading="lazy">`
  },
  table: wrap('table'),
  tableRow: wrap('tr'),
  tableHeader: cell('th'),
  tableCell: cell('td'),
}

function renderNode(node, depth) {
  if (!node || typeof node !== 'object' || depth > MAX_DEPTH) return ''
  const render = RENDERERS[node.type]
  return render ? render(node, depth) : ''
}

export function renderBodyToHtml(doc) {
  if (!doc || typeof doc !== 'object' || doc.type !== 'doc') return ''
  return renderChildren(doc, 0)
}

export function parseBody(text) {
  if (typeof text !== 'string' || !text) return null
  try {
    const value = JSON.parse(text)
    return value && typeof value === 'object' && value.type === 'doc' ? value : null
  } catch {
    return null
  }
}

const BLOCKS = new Set(['paragraph', 'heading', 'listItem', 'blockquote', 'tableCell', 'tableHeader'])

export function plainText(doc) {
  let out = ''
  const walk = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > MAX_DEPTH) return
    if (node.type === 'text') out += node.text ?? ''
    for (const child of Array.isArray(node.content) ? node.content : []) walk(child, depth + 1)
    if (BLOCKS.has(node.type)) out += ' '
  }
  walk(doc, 0)
  return out.replace(/\s+/g, ' ').trim()
}

export function readingMinutes(doc) {
  return Math.max(1, Math.ceil(plainText(doc).length / CHARS_PER_MINUTE))
}
