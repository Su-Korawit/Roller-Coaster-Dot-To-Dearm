// HTML for the content site's server-rendered pages (api/content.js). Plain semantic
// markup that crawlers can read without JS; the SPA replaces it on mount, so no
// classes are needed beyond `article-body`. Everything user-supplied is escaped.
import { SITES } from '../constants/sites.js'
import { CATEGORIES, categoryLabel } from './schema.js'
import { groupByCategory, toMillis } from './listing.js'
import { renderBodyToHtml, parseBody } from './renderBody.js'

export const SITE_ORIGIN = 'https://ilovetcas.com'
export const APP_ORIGIN = 'https://app.ilovetcas.com'
const OG_IMAGE = `${SITE_ORIGIN}/brand/og-card.png`

export const MINIMAL_SHELL =
  '<!doctype html><html lang="th"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>I LOVE TCAS</title></head><body><div id="root"></div></body></html>'

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const isoDate = (value) => new Date(toMillis(value)).toISOString().slice(0, 10)

export function appLink(medium, campaign) {
  return `${APP_ORIGIN}/?utm_source=hub&utm_medium=${medium}&utm_campaign=${encodeURIComponent(campaign)}`
}

// Only https links to the configured OpenChat room, tagged with UTM parameters.
export function openChatLink(config, medium, campaign) {
  try {
    const url = new URL(config?.lineOpenChatUrl ?? '')
    if (url.protocol !== 'https:') return null
    url.searchParams.set('utm_source', 'hub')
    url.searchParams.set('utm_medium', medium)
    url.searchParams.set('utm_campaign', campaign)
    return url.href
  } catch {
    return null
  }
}

const chatBlock = (config, medium, campaign) => {
  const href = openChatLink(config, medium, campaign)
  return href ? `<p><a href="${esc(href)}" rel="noopener">เข้าห้องแชท LINE OpenChat ของ I LOVE TCAS</a></p>` : ''
}

const articleList = (items) =>
  `<ul>${items
    .map((a) => `<li><a href="/blog/${esc(a.slug)}">${esc(a.title)}</a>${a.excerpt ? ` — ${esc(a.excerpt)}` : ''}</li>`)
    .join('')}</ul>`

export function homeBody({ summaries, config }) {
  const groups = groupByCategory(summaries, 3)
  const rows = CATEGORIES.filter((c) => groups[c.id].length > 0)
    .map((c) => `<section><h2><a href="/category/${c.id}">${esc(c.labelTh)}</a></h2>${articleList(groups[c.id])}</section>`)
    .join('')
  const chat = openChatLink(config, 'band', 'home')
  const band = chat
    ? `<section><h2>ห้องคุยกับเพื่อน DEK70 บน LINE OpenChat</h2><p>${esc(config?.lineRules ?? '')}</p><p><a href="${esc(chat)}" rel="noopener">เข้าห้องแชท</a></p></section>`
    : ''
  const tools = ['roadmap', 'tcas', 'news', 'school']
    .map((k) => `<li><a href="${SITES[k].path}/">${esc(SITES[k].shortName)}</a> — ${esc(SITES[k].description)}</li>`)
    .join('')
  return (
    `<main><section><h1>${esc(SITES.hub.h1)}</h1><p>${esc(SITES.hub.intro)}</p>` +
    `<p><a href="${esc(appLink('banner', 'home'))}">เข้าสู่แอป</a></p></section>` +
    `${rows}${band}<section><h2>เครื่องมือฟรี ใช้ได้เลย ไม่ต้องสมัคร</h2><ul>${tools}</ul></section></main>`
  )
}

export function articleBody({ article, related, config }) {
  const html = renderBodyToHtml(parseBody(article.body))
  const cover = article.coverUrl
    ? `<img src="${esc(article.coverUrl)}" alt="${esc(article.coverAlt)}" loading="lazy" />`
    : ''
  const relatedHtml = related?.length ? `<nav><h2>บทความที่เกี่ยวข้อง</h2>${articleList(related)}</nav>` : ''
  return (
    `<main><article><p><a href="/category/${esc(article.category)}">${esc(categoryLabel(article.category))}</a></p>` +
    `<h1>${esc(article.title)}</h1>` +
    `<p>${esc(article.authorName)} · ${isoDate(article.publishedAt)} · อ่าน ${esc(article.readingMinutes ?? 1)} นาที</p>` +
    `${cover}<div class="article-body">${html}</div>` +
    `<aside><p><a href="${esc(appLink('article', article.slug))}">เปิดแอปวางแผน TCAS</a></p>${chatBlock(config, 'article', article.slug)}</aside>` +
    `${relatedHtml}</article></main>`
  )
}

export function categoryBody({ category, items }) {
  return `<main><h1>${esc(categoryLabel(category))}</h1>${articleList(items)}<p><a href="/">กลับหน้าแรก</a></p></main>`
}

export function searchBody() {
  return `<main><h1>ค้นหาบทความ</h1><p>พิมพ์ชื่อคณะ มหาลัย หรือหัวข้อที่สนใจ</p><p><a href="${SITES.tcas.path}/">ค้นหาคณะและหลักสูตร</a></p><p><a href="/">กลับหน้าแรก</a></p></main>`
}

export function notFoundBody() {
  return '<main><h1>ไม่พบบทความนี้</h1><p>บทความอาจถูกย้ายหรือยังไม่เผยแพร่</p><p><a href="/">กลับหน้าแรก</a></p></main>'
}

export function headFor({ title, description, canonical, image = OG_IMAGE, type = 'website', jsonLd, noindex = false, data }) {
  const ld = jsonLd ? JSON.stringify(jsonLd).replace(/</g, '\\u003c') : ''
  const embedded = data ? JSON.stringify(data).replace(/</g, '\\u003c') : ''
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    noindex ? '<meta name="robots" content="noindex, follow" />' : '',
    `<meta property="og:type" content="${esc(type)}" />`,
    '<meta property="og:site_name" content="I LOVE TCAS" />',
    '<meta property="og:locale" content="th_TH" />',
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    ld ? `<script type="application/ld+json">${ld}</script>` : '',
    embedded ? `<script id="hub-data" type="application/json">${embedded}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ')
}

export function sitemapXml({ articles }) {
  const url = (loc, lastmod) =>
    `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
  const lines = [
    url(`${SITE_ORIGIN}/`),
    ...CATEGORIES.map((c) => url(`${SITE_ORIGIN}/category/${c.id}`)),
    ...articles.map((a) => url(`${SITE_ORIGIN}/blog/${a.slug ?? a.id}`, isoDate(a.updatedAt ?? a.publishedAt))),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`
}

const HEAD_TAGS = [
  /\s*<title>[\s\S]*?<\/title>/g,
  /\s*<meta\s+name="description"[\s\S]*?\/>/g,
  /\s*<link\s+rel="canonical"[^>]*>/g,
  /\s*<meta\s+name="robots"[^>]*>/g,
  /\s*<meta\s+property="og:[^>]*>/g,
  /\s*<meta\s+name="twitter:[^>]*>/g,
  /\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
]

// Index of the </div> that closes the div opened at `start` (balanced scan).
function closingDiv(html, start) {
  const re = /<div\b|<\/div>/g
  re.lastIndex = start
  let depth = 0
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0] === '</div>' ? -1 : 1
    if (depth === 0) return m.index
  }
  return -1
}

export function injectIntoShell(shell, { head, body }) {
  let html = HEAD_TAGS.reduce((acc, re) => acc.replace(re, ''), shell)
  html = html.includes('</head>') ? html.replace('</head>', () => `    ${head}\n  </head>`) : `${head}${html}`

  const open = html.indexOf('<div id="root">')
  if (open === -1) return html
  const close = closingDiv(html, open)
  if (close === -1) return html
  return `${html.slice(0, open)}<div id="root">${body}${html.slice(close)}`
}

export function fallbackPage() {
  return (
    '<!doctype html><html lang="th"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<title>I LOVE TCAS</title></head><body><main><h1>I LOVE TCAS</h1><p>ระบบกำลังอัปเดต ลองใหม่อีกครั้งในอีกสักครู่</p>' +
    `<p><a href="${APP_ORIGIN}">เข้าสู่แอป</a></p></main></body></html>`
  )
}
