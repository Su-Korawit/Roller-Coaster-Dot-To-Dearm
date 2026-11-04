import { describe, it, expect, vi } from 'vitest'
import { decodeValue, decodeDocument, createFirestoreRest } from './firestoreRest'

describe('decodeValue', () => {
  it.each([
    [{ stringValue: 'สวัสดี' }, 'สวัสดี'],
    [{ integerValue: '42' }, 42],
    [{ doubleValue: 1.5 }, 1.5],
    [{ booleanValue: true }, true],
    [{ nullValue: null }, null],
    [{ timestampValue: '2026-10-01T00:00:00Z' }, '2026-10-01T00:00:00Z'],
    [{ arrayValue: {} }, []],
    [{ arrayValue: { values: [{ stringValue: 'a' }, { integerValue: '2' }] } }, ['a', 2]],
    [{ mapValue: {} }, {}],
    [{ mapValue: { fields: { a: { stringValue: 'x' }, n: { mapValue: { fields: { z: { booleanValue: false } } } } } } }, { a: 'x', n: { z: false } }],
  ])('%j', (value, expected) => {
    expect(decodeValue(value)).toEqual(expected)
  })

  it('returns null for unknown or missing values', () => {
    expect(decodeValue(undefined)).toBeNull()
    expect(decodeValue({ weirdValue: 1 })).toBeNull()
  })
})

describe('decodeDocument', () => {
  it('flattens fields and takes the id from the document name', () => {
    const doc = {
      name: 'projects/p/databases/(default)/documents/articles/my-slug',
      fields: { title: { stringValue: 'T' }, tags: { arrayValue: { values: [{ stringValue: 'a' }] } } },
      updateTime: '2026-10-02T00:00:00Z',
    }
    expect(decodeDocument(doc)).toEqual({ id: 'my-slug', title: 'T', tags: ['a'] })
  })

  it('handles a document with no fields and a missing document', () => {
    expect(decodeDocument({ name: 'projects/p/databases/(default)/documents/articles/x' })).toEqual({ id: 'x' })
    expect(decodeDocument(null)).toBeNull()
  })
})

function fakeFetch(handlers) {
  return vi.fn(async (url, init) => {
    for (const [match, respond] of handlers) {
      if (url.includes(match)) return respond(url, init)
    }
    return { ok: false, status: 404, json: async () => ({}) }
  })
}

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const docOf = (id, fields) => ({ name: `projects/p/databases/(default)/documents/articles/${id}`, fields })

describe('createFirestoreRest', () => {
  it('lists published articles with a structured query (newest first, no body)', async () => {
    const f = fakeFetch([
      [
        ':runQuery',
        () =>
          json(200, [
            { document: docOf('a', { title: { stringValue: 'A' } }), readTime: 't' },
            { document: docOf('b', { title: { stringValue: 'B' } }) },
          ]),
      ],
    ])
    const rest = createFirestoreRest({ fetchImpl: f, projectId: 'proj', apiKey: 'K' })
    const items = await rest.listPublished(25)

    expect(items.map((i) => i.id)).toEqual(['a', 'b'])
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('https://firestore.googleapis.com/v1/projects/proj/databases/(default)/documents:runQuery?key=K')
    const q = JSON.parse(init.body).structuredQuery
    expect(q.from).toEqual([{ collectionId: 'articles' }])
    expect(q.orderBy).toEqual([{ field: { fieldPath: 'publishedAt' }, direction: 'DESCENDING' }])
    expect(q.limit).toBe(25)
    expect(q.select.fields.map((x) => x.fieldPath)).not.toContain('body')
    expect(q.select.fields.map((x) => x.fieldPath)).toContain('title')
  })

  it('returns an empty list when the query matches nothing', async () => {
    const f = fakeFetch([[':runQuery', () => json(200, [{ readTime: 't' }])]])
    expect(await createFirestoreRest({ fetchImpl: f, projectId: 'p' }).listPublished()).toEqual([])
  })

  it('omits the key parameter when no API key is configured', async () => {
    const f = fakeFetch([[':runQuery', () => json(200, [])]])
    await createFirestoreRest({ fetchImpl: f, projectId: 'p' }).listPublished()
    expect(f.mock.calls[0][0].endsWith('documents:runQuery')).toBe(true)
  })

  it('gets one article with its body, or null when it does not exist', async () => {
    const f = fakeFetch([
      ['/articles/here', () => json(200, docOf('here', { body: { stringValue: '{}' } }))],
      ['/articles/gone', () => json(404, { error: { status: 'NOT_FOUND' } })],
    ])
    const rest = createFirestoreRest({ fetchImpl: f, projectId: 'p' })
    expect(await rest.getArticle('here')).toEqual({ id: 'here', body: '{}' })
    expect(await rest.getArticle('gone')).toBeNull()
  })

  it('url-encodes slugs', async () => {
    const f = fakeFetch([['/articles/', () => json(404, {})]])
    await createFirestoreRest({ fetchImpl: f, projectId: 'p' }).getArticle('a b/c')
    expect(f.mock.calls[0][0]).toContain('/articles/a%20b%2Fc')
  })

  it('reads the hub config, null when absent', async () => {
    const f = fakeFetch([['/siteConfig/hub', () => json(200, { name: 'x/siteConfig/hub', fields: { lineOpenChatUrl: { stringValue: 'https://line.me/ti/g2/z' } } })]])
    expect(await createFirestoreRest({ fetchImpl: f, projectId: 'p' }).getConfig()).toEqual({
      id: 'hub',
      lineOpenChatUrl: 'https://line.me/ti/g2/z',
    })
    const none = fakeFetch([['/siteConfig/hub', () => json(404, {})]])
    expect(await createFirestoreRest({ fetchImpl: none, projectId: 'p' }).getConfig()).toBeNull()
  })

  it('throws on upstream errors instead of pretending the data is empty', async () => {
    const f = fakeFetch([[':runQuery', () => json(500, {})], ['/articles/', () => json(503, {})]])
    const rest = createFirestoreRest({ fetchImpl: f, projectId: 'p' })
    await expect(rest.listPublished()).rejects.toThrow(/500/)
    await expect(rest.getArticle('x')).rejects.toThrow(/503/)
  })

  it('throws when the network call itself fails', async () => {
    const f = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(createFirestoreRest({ fetchImpl: f, projectId: 'p' }).getConfig()).rejects.toThrow('offline')
  })
})
