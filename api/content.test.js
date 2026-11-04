import { describe, it, expect, vi } from 'vitest'
import handler from './content.js'

const enc = (v) => {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } }
}
const fsDoc = (collection, id, data) => ({
  name: `projects/p/databases/(default)/documents/${collection}/${id}`,
  fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])),
})

const body = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'เนื้อหาบทความฉบับเต็ม' }] }],
})
const ARTICLES = {
  'medicine-all': {
    title: 'ทุกโครงการแพทย์',
    excerpt: 'สรุปโครงการ',
    category: 'compare',
    tags: ['แพทย์'],
    coverUrl: 'https://x.org/c.png',
    coverAlt: 'ปก',
    authorName: 'มายด์',
    readingMinutes: 2,
    publishedAt: '2026-10-01T03:00:00Z',
    updatedAt: '2026-10-05T03:00:00Z',
    body,
  },
  'news-one': {
    title: 'ข่าวหนึ่ง',
    excerpt: 'ข่าว',
    category: 'news',
    tags: [],
    coverUrl: 'https://x.org/n.png',
    coverAlt: 'n',
    authorName: 'A',
    readingMinutes: 1,
    publishedAt: '2026-10-02T03:00:00Z',
    body,
  },
}
const SHELL = '<!doctype html><html lang="th"><head><title>เก่า</title><script type="module" src="/assets/index-abc.js"></script></head><body><div id="root"></div></body></html>'

function makeFetch({ failFirestore = false, failShell = false, config = true } = {}) {
  return vi.fn(async (url) => {
    const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => data })
    if (url.endsWith('/app.html')) {
      if (failShell) throw new Error('shell down')
      return { ok: true, status: 200, text: async () => SHELL }
    }
    if (failFirestore) throw new Error('firestore down')
    if (url.includes(':runQuery')) {
      const rows = Object.entries(ARTICLES).map(([id, d]) => ({ document: fsDoc('articles', id, { ...d, body: undefined }) }))
      return ok(rows)
    }
    const m = url.match(/\/articles\/([^?]+)/)
    if (m) {
      const id = decodeURIComponent(m[1])
      return ARTICLES[id] ? ok(fsDoc('articles', id, ARTICLES[id])) : { ok: false, status: 404, json: async () => ({}) }
    }
    if (url.includes('/siteConfig/hub')) {
      return config
        ? ok(fsDoc('siteConfig', 'hub', { lineOpenChatUrl: 'https://line.me/ti/g2/abc', lineRules: 'กติกาห้องแชท' }))
        : { ok: false, status: 404, json: async () => ({}) }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  })
}

function makeRes() {
  const headers = {}
  return {
    statusCode: 0,
    headers,
    body: '',
    setHeader(k, v) { headers[k.toLowerCase()] = v },
    end(b) { this.body = b },
  }
}

async function call(query, opts) {
  const fetchImpl = makeFetch(opts)
  const res = makeRes()
  await handler({ query, headers: { host: 'ilovetcas.com' } }, res, { fetchImpl, projectId: 'p' })
  return { res, fetchImpl }
}

const CACHE = 'public, s-maxage=60, stale-while-revalidate=86400'

describe('api/content', () => {
  it('renders a published article into the SPA shell with SEO tags', async () => {
    const { res } = await call({ route: 'article', slug: 'medicine-all' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.headers['cache-control']).toBe(CACHE)
    expect(res.body).toContain('<h1>ทุกโครงการแพทย์</h1>')
    expect(res.body).toContain('เนื้อหาบทความฉบับเต็ม')
    expect(res.body).toContain('<title>ทุกโครงการแพทย์ | I LOVE TCAS</title>')
    expect(res.body).toContain('rel="canonical" href="https://ilovetcas.com/blog/medicine-all"')
    expect(res.body).toContain('"@type":"Article"')
    expect(res.body).toContain('id="hub-data"')
    expect(res.body).toContain('/assets/index-abc.js')
    expect(res.body).not.toContain('เก่า')
  })

  it('renders the home page with recent articles and the OpenChat band', async () => {
    const { res } = await call({ route: 'home' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toBe(CACHE)
    expect(res.body).toContain('href="/blog/news-one"')
    expect(res.body).toContain('line.me/ti/g2/abc')
    expect(res.body).toContain('utm_medium=banner')
  })

  it('renders home without a config document', async () => {
    const { res } = await call({ route: 'home' }, { config: false })
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toContain('line.me')
  })

  it('renders a category page with only that category', async () => {
    const { res } = await call({ route: 'category', cat: 'news' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('href="/blog/news-one"')
    expect(res.body).not.toContain('href="/blog/medicine-all"')
  })

  it('returns 404 pages for unknown slugs and categories without hitting Firestore for bad input', async () => {
    const missing = await call({ route: 'article', slug: 'nope-nope' })
    expect(missing.res.statusCode).toBe(404)
    expect(missing.res.body).toContain('ไม่พบบทความนี้')
    expect(missing.res.body).toContain('noindex')

    const bad = await call({ route: 'article', slug: '../../etc/passwd' })
    expect(bad.res.statusCode).toBe(404)
    expect(bad.fetchImpl.mock.calls.some(([u]) => u.includes('firestore.googleapis.com'))).toBe(false)

    expect((await call({ route: 'category', cat: 'sports' })).res.statusCode).toBe(404)
    expect((await call({ route: 'weird' })).res.statusCode).toBe(404)
  })

  it('serves a noindex search page', async () => {
    const { res } = await call({ route: 'search' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('ค้นหาบทความ')
    expect(res.body).toContain('noindex')
  })

  it('serves the sitemap as XML', async () => {
    const { res } = await call({ route: 'sitemap' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/xml')
    expect(res.body).toContain('<loc>https://ilovetcas.com/blog/medicine-all</loc>')
  })

  it('still serves real content when only the shell fetch fails', async () => {
    const { res } = await call({ route: 'article', slug: 'medicine-all' }, { failShell: true })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('เนื้อหาบทความฉบับเต็ม')
  })

  it('answers 503 with no-store and a real page when Firestore fails (never an empty or cacheable error)', async () => {
    for (const route of [{ route: 'home' }, { route: 'article', slug: 'medicine-all' }, { route: 'category', cat: 'news' }]) {
      const { res } = await call(route, { failFirestore: true })
      expect(res.statusCode).toBe(503)
      expect(res.headers['cache-control']).toBe('no-store')
      expect(res.body.length).toBeGreaterThan(100)
      expect(res.body).toContain('app.ilovetcas.com')
    }
    const sm = await call({ route: 'sitemap' }, { failFirestore: true })
    expect(sm.res.statusCode).toBe(503)
    expect(sm.res.headers['cache-control']).toBe('no-store')
  })

  it('defaults to the home route', async () => {
    const { res } = await call({})
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('href="/blog/news-one"')
  })
})
