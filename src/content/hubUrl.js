// URL of an article on the content site. In development the site is selected with
// ?site=hub (the dev origin is not a canonical host); in production it is the apex domain.
export function hubArticleUrl(id, dev = import.meta.env.DEV) {
  const path = `/blog/${encodeURIComponent(id)}`
  return dev ? `${path}?site=hub` : `https://ilovetcas.com${path}`
}
