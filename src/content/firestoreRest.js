// Minimal Firestore REST client for the Vercel function (no Firebase SDK, no auth):
// the public content collections allow unauthenticated reads (firestore.rules).
// Pure apart from the injected `fetchImpl`.

export function decodeValue(value) {
  if (!value || typeof value !== 'object') return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) return (value.arrayValue?.values ?? []).map(decodeValue)
  if ('mapValue' in value) {
    return Object.fromEntries(Object.entries(value.mapValue?.fields ?? {}).map(([k, v]) => [k, decodeValue(v)]))
  }
  return null
}

export function decodeDocument(doc) {
  if (!doc) return null
  const id = String(doc.name ?? '').split('/').pop()
  const fields = Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, v]) => [k, decodeValue(v)]))
  return { id, ...fields }
}

// Fields the list pages need; the (large) body is only fetched for a single article.
const LIST_FIELDS = [
  'title', 'excerpt', 'category', 'tags', 'coverUrl', 'coverAlt',
  'authorName', 'readingMinutes', 'publishedAt', 'updatedAt',
]

export function createFirestoreRest({ fetchImpl = globalThis.fetch, projectId, apiKey }) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
  const keyQuery = apiKey ? `?key=${encodeURIComponent(apiKey)}` : ''

  async function getDocument(path) {
    const res = await fetchImpl(`${base}/${path}${keyQuery}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Firestore ${res.status}`)
    return decodeDocument(await res.json())
  }

  return {
    async listPublished(limit = 60) {
      const res = await fetchImpl(`${base}:runQuery${keyQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'articles' }],
            orderBy: [{ field: { fieldPath: 'publishedAt' }, direction: 'DESCENDING' }],
            select: { fields: LIST_FIELDS.map((fieldPath) => ({ fieldPath })) },
            limit,
          },
        }),
      })
      if (!res.ok) throw new Error(`Firestore ${res.status}`)
      const rows = await res.json()
      return rows.filter((r) => r.document).map((r) => decodeDocument(r.document))
    },

    getArticle: (slug) => getDocument(`articles/${encodeURIComponent(slug)}`),
    getConfig: () => getDocument('siteConfig/hub'),
  }
}
