// ============================================================================
// prerender.mjs — Phase 4 of ADR-0012 (run by `npm run build` after vite build)
// ----------------------------------------------------------------------------
// Emits dist/sites/<key>/{index.html,sitemap.xml,robots.txt} for the hub and
// each feature site. vercel.json host-rewrites serve these for `/`,
// `/sitemap.xml`, and `/robots.txt` on the matching host; every other path
// falls through to the plain SPA shell.
//
// index.html = the built shell with the head swapped (title/description/
// canonical/OG + JSON-LD) and the site's landing copy injected as static HTML
// inside #root. Crawlers read real Thai content without JS; the browser's
// createRoot(...).render() replaces it the moment React mounts.
//
// The app site is deliberately NOT prerendered for SEO: the hub is the front
// door. Its robots.txt disallows indexing so app.ilovetcas.com never competes
// with hub/feature pages as duplicate content.
// ============================================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITES } from '../src/constants/sites.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const shell = readFileSync(resolve(dist, 'index.html'), 'utf8')

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const FEATURE_KEYS = ['roadmap', 'tcas', 'news', 'school']
const PRERENDERED_KEYS = ['hub', ...FEATURE_KEYS]

function jsonLd(site) {
  if (site.key === 'hub') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'I LOVE TCAS',
        url: site.path,
        description: site.description,
        inLanguage: 'th',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: FEATURE_KEYS.map((key, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: SITES[key].title,
          url: SITES[key].path,
        })),
      },
    ]
  }
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: site.title,
      url: site.path,
      description: site.description,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      inLanguage: 'th',
      isPartOf: { '@type': 'WebSite', name: 'I LOVE TCAS', url: SITES.hub.path },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'THB' },
    },
  ]
}

function headTags(site) {
  return [
    `<title>${esc(site.title)}</title>`,
    `<meta name="description" content="${esc(site.description)}" />`,
    `<link rel="canonical" href="${site.path}/" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="I LOVE TCAS" />`,
    `<meta property="og:title" content="${esc(site.title)}" />`,
    `<meta property="og:description" content="${esc(site.description)}" />`,
    `<meta property="og:url" content="${site.path}/" />`,
    `<meta property="og:locale" content="th_TH" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd(site))}</script>`,
  ].join('\n    ')
}

// Static landing copy a crawler can read without JS. React replaces this
// subtree on mount, so keep it plain semantic HTML — no classes needed.
function staticContent(site) {
  const links =
    site.key === 'hub'
      ? `<ul>${FEATURE_KEYS.map(
          (key) => `<li><a href="${SITES[key].path}/">${esc(SITES[key].h1)}</a> — ${esc(SITES[key].description)}</li>`,
        ).join('')}</ul>`
      : `<p><a href="${SITES.hub.path}/">เครื่องมือ TCAS อื่น ๆ ของ I LOVE TCAS</a></p>`
  return `<main><h1>${esc(site.h1)}</h1><p>${esc(site.intro)}</p>${links}</main>`
}

function renderSite(site) {
  let html = shell
  // Swap the shell's <title> + description for the site's own head block —
  // drop the shell description FIRST (headTags carries the site's own, and a
  // later removal would eat the freshly inserted one instead).
  html = html.replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, '')
  html = html.replace(/<title>[\s\S]*?<\/title>/, headTags(site))
  // Inject crawlable landing content inside #root.
  html = html.replace('<div id="root"></div>', `<div id="root">${staticContent(site)}</div>`)
  return html
}

const today = new Date().toISOString().slice(0, 10)

function sitemap(site) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site.path}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq></url>
</urlset>
`
}

function robots(site, { indexable }) {
  return indexable
    ? `User-agent: *\nAllow: /\n\nSitemap: ${site.path}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n`
}

for (const key of PRERENDERED_KEYS) {
  const site = SITES[key]
  const out = resolve(dist, 'sites', key)
  mkdirSync(out, { recursive: true })
  writeFileSync(resolve(out, 'index.html'), renderSite(site))
  writeFileSync(resolve(out, 'sitemap.xml'), sitemap(site))
  writeFileSync(resolve(out, 'robots.txt'), robots(site, { indexable: true }))
  console.log(`prerendered sites/${key}`)
}

// app.ilovetcas.com: no prerender (SPA shell as-is), but do serve a
// noindex robots so the login-gated app never duplicates the hub in search.
{
  const out = resolve(dist, 'sites', 'app')
  mkdirSync(out, { recursive: true })
  writeFileSync(resolve(out, 'robots.txt'), robots(SITES.app, { indexable: false }))
  console.log('wrote sites/app robots.txt (noindex)')
}
