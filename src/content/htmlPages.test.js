import { describe, it, expect } from 'vitest'
import {
  SITE_ORIGIN,
  appLink,
  openChatLink,
  homeBody,
  articleBody,
  categoryBody,
  searchBody,
  openHouseBody,
  notFoundBody,
  headFor,
  sitemapXml,
  injectIntoShell,
  fallbackPage,
  MINIMAL_SHELL,
} from './htmlPages'

const body = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'หัวข้อย่อย' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'เนื้อหาบทความ <b>x</b>' }] },
  ],
})

const article = (over = {}) => ({
  slug: 'medicine-all',
  title: 'ทุกโครงการแพทย์',
  excerpt: 'สรุปโครงการ',
  category: 'compare',
  tags: ['แพทย์'],
  coverUrl: 'https://x.org/c.png',
  coverAlt: 'ปก',
  authorName: 'มายด์',
  publishedAt: '2026-10-01T03:00:00.000Z',
  updatedAt: '2026-10-05T03:00:00.000Z',
  readingMinutes: 3,
  body,
  ...over,
})

const summary = (slug, over = {}) => ({
  slug,
  title: `เรื่อง ${slug}`,
  excerpt: 'สรุป',
  category: 'news',
  tags: [],
  coverUrl: '',
  coverAlt: '',
  authorName: '',
  publishedAt: '2026-10-01T00:00:00.000Z',
  readingMinutes: 1,
  ...over,
})

describe('links', () => {
  it('builds app links with UTM parameters', () => {
    expect(appLink('banner', 'home')).toBe('https://app.ilovetcas.com/?utm_source=hub&utm_medium=banner&utm_campaign=home')
    expect(appLink('article', 'a b')).toContain('utm_campaign=a%20b')
  })

  it('adds UTM parameters to the OpenChat link, and rejects anything but https', () => {
    const url = openChatLink({ lineOpenChatUrl: 'https://line.me/ti/g2/abc?x=1' }, 'band', 'home')
    expect(url).toContain('https://line.me/ti/g2/abc')
    expect(url).toContain('utm_medium=band')
    expect(url).toContain('x=1')
    expect(openChatLink({ lineOpenChatUrl: 'http://line.me/x' }, 'band', 'home')).toBeNull()
    expect(openChatLink({ lineOpenChatUrl: 'javascript:alert(1)' }, 'band', 'home')).toBeNull()
    expect(openChatLink({}, 'band', 'home')).toBeNull()
    expect(openChatLink(null, 'band', 'home')).toBeNull()
  })
})

describe('articleBody', () => {
  const html = articleBody({ article: article(), related: [summary('r1')], config: { lineOpenChatUrl: 'https://line.me/ti/g2/abc' } })

  it('has the title as the single h1 and the rendered body', () => {
    expect(html).toContain('<h1>ทุกโครงการแพทย์</h1>')
    expect(html.match(/<h1>/g)).toHaveLength(1)
    expect(html).toContain('<h2>หัวข้อย่อย</h2>')
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>x</b>')
  })

  it('shows author, date and reading time', () => {
    expect(html).toContain('มายด์')
    expect(html).toContain('2026-10-01')
    expect(html).toContain('3')
  })

  it('links to the app and the OpenChat with article UTM parameters', () => {
    expect(html).toContain('https://app.ilovetcas.com/?utm_source=hub&amp;utm_medium=article&amp;utm_campaign=medicine-all')
    expect(html).toContain('utm_medium=article')
    expect(html).toContain('line.me/ti/g2/abc')
  })

  it('lists related articles', () => {
    expect(html).toContain('href="/blog/r1"')
  })

  it('keeps hostile titles inert', () => {
    const evil = articleBody({ article: article({ title: '<img src=x onerror=alert(1)>' }), related: [], config: null })
    expect(evil).not.toContain('<img src=x')
    expect(evil).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('omits the OpenChat link when none is configured', () => {
    expect(articleBody({ article: article(), related: [], config: null })).not.toContain('line.me')
  })
})

describe('homeBody, categoryBody, searchBody, notFoundBody', () => {
  it('home has one h1, the app link, category links and article links', () => {
    const html = homeBody({ summaries: [summary('n1'), summary('g1', { category: 'guide' })], config: null })
    expect(html.match(/<h1>/g)).toHaveLength(1)
    expect(html).toContain('utm_medium=banner')
    expect(html).toContain('href="/blog/n1"')
    expect(html).toContain('href="/blog/g1"')
    expect(html).toContain('href="/category/guide"')
  })

  it('home shows the OpenChat band only when configured', () => {
    expect(homeBody({ summaries: [], config: null })).not.toContain('OpenChat')
    expect(homeBody({ summaries: [], config: { lineOpenChatUrl: 'https://line.me/ti/g2/abc' } })).toContain('line.me/ti/g2/abc')
  })

  it('category lists its articles with the Thai label', () => {
    const html = categoryBody({ category: 'guide', items: [summary('g1', { category: 'guide' })] })
    expect(html).toContain('แนะแนวเลือกคณะ')
    expect(html).toContain('href="/blog/g1"')
  })

  it('the Open House page is a real page: a heading, what it is, and a link per faculty', () => {
    const html = openHouseBody()
    expect(html).toContain('<h1>')
    expect(html).toContain('/openhouse?b=med')
    expect((html.match(/\/openhouse\?b=/g) ?? []).length).toBe(18)
  })

  it('search and not-found pages are real pages with a way back', () => {
    expect(searchBody()).toContain('<h1>')
    expect(notFoundBody()).toContain('href="/"')
  })
})

describe('headFor data', () => {
  it('embeds page data as JSON that cannot close the script tag', () => {
    const head = headFor({ title: 't', description: 'd', canonical: 'https://x.org/', data: { a: '</script><b>' } })
    expect(head).toContain('<script id="hub-data" type="application/json">')
    expect(head).not.toContain('</script><b>')
    const json = head.match(/id="hub-data" type="application\/json">(.*?)<\/script>/s)[1]
    expect(JSON.parse(json)).toEqual({ a: '</script><b>' })
  })

  it('omits the data script when there is none', () => {
    expect(headFor({ title: 't', description: 'd', canonical: 'https://x.org/' })).not.toContain('hub-data')
  })
})

describe('headFor', () => {
  const head = headFor({
    title: 'ทุกโครงการ',
    description: 'คำอธิบาย "พิเศษ"',
    canonical: `${SITE_ORIGIN}/blog/medicine-all`,
    image: 'https://x.org/c.png',
    type: 'article',
    jsonLd: { '@type': 'Article', headline: '</script><script>alert(1)</script>' },
  })

  it('has title, description, canonical and share cards', () => {
    expect(head).toContain('<title>ทุกโครงการ</title>')
    expect(head).toContain('content="คำอธิบาย &quot;พิเศษ&quot;"')
    expect(head).toContain('<link rel="canonical" href="https://ilovetcas.com/blog/medicine-all" />')
    expect(head).toContain('property="og:title" content="ทุกโครงการ"')
    expect(head).toContain('property="og:type" content="article"')
    expect(head).toContain('property="og:image" content="https://x.org/c.png"')
    expect(head).toContain('name="twitter:card" content="summary_large_image"')
  })

  it('cannot be broken out of by hostile JSON-LD', () => {
    expect(head).toContain('application/ld+json')
    expect(head).not.toContain('</script><script>alert(1)')
    expect(head.match(/<script/g)).toHaveLength(1)
  })

  it('marks pages noindex on request', () => {
    expect(headFor({ title: 'x', description: 'y', canonical: SITE_ORIGIN, noindex: true })).toContain('noindex')
  })
})

describe('sitemapXml', () => {
  it('lists home, categories and every article with lastmod', () => {
    const xml = sitemapXml({ articles: [article(), article({ slug: 'second', updatedAt: undefined, publishedAt: '2026-09-01T00:00:00.000Z' })] })
    expect(xml).toContain('<loc>https://ilovetcas.com/</loc>')
    expect(xml).toContain('<loc>https://ilovetcas.com/category/guide</loc>')
    expect(xml).toContain('<loc>https://ilovetcas.com/blog/medicine-all</loc>')
    expect(xml).toContain('<lastmod>2026-10-05</lastmod>')
    expect(xml).toContain('<lastmod>2026-09-01</lastmod>')
    expect(xml.startsWith('<?xml')).toBe(true)
  })

  it('escapes slugs', () => {
    expect(sitemapXml({ articles: [article({ slug: 'a&b' })] })).toContain('a&amp;b')
  })
})

describe('injectIntoShell', () => {
  const shell = `<!doctype html><html lang="th"><head><meta charset="UTF-8" /><title>เก่า</title>
    <meta
      name="description"
      content="เก่า"
    />
    <script type="module" crossorigin src="/assets/index-abc.js"></script></head><body><div id="root"></div></body></html>`

  it('swaps title and description, injects the body, and keeps the bundle tags', () => {
    const out = injectIntoShell(shell, { head: '<title>ใหม่</title><meta name="description" content="ใหม่" />', body: '<main>x</main>' })
    expect(out).toContain('<title>ใหม่</title>')
    expect(out).not.toContain('เก่า')
    expect(out).toContain('<div id="root"><main>x</main></div>')
    expect(out).toContain('/assets/index-abc.js')
    expect(out.match(/<title>/g)).toHaveLength(1)
    expect(out.match(/name="description"/g)).toHaveLength(1)
  })

  it('is idempotent on repeated injection', () => {
    const head = headFor({ title: 'ใหม่', description: 'd', canonical: SITE_ORIGIN })
    const once = injectIntoShell(shell, { head, body: '<p>1</p>' })
    const twice = injectIntoShell(once, { head, body: '<p>1</p>' })
    expect(twice.match(/rel="canonical"/g)).toHaveLength(1)
    expect(twice.match(/<title>/g)).toHaveLength(1)
  })

  it('works on the minimal shell and the fallback page', () => {
    const out = injectIntoShell(MINIMAL_SHELL, { head: '<title>t</title>', body: '<p>b</p>' })
    expect(out).toContain('<p>b</p>')
    expect(fallbackPage()).toContain('https://app.ilovetcas.com')
    expect(fallbackPage()).toContain('<!doctype html>')
  })
})
