// Data the server embedded in the page (`<script id="hub-data">`, see headFor in
// htmlPages.js) so the first client render can match the server HTML instead of
// replacing it with a loading state.
export function readSsrData(doc = typeof document === 'undefined' ? null : document) {
  const el = doc?.getElementById('hub-data')
  if (!el) return null
  try {
    const value = JSON.parse(el.textContent)
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch {
    return null
  }
}
