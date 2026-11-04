// What scripts/prerender.mjs writes for each site. The hub is rendered on request by
// api/content.js (articles change without a rebuild), so it only ships robots.txt.

export function prerenderOutputs(siteKey) {
  const dynamic = siteKey === 'hub'
  return { index: !dynamic, sitemap: !dynamic, robots: true }
}

export function robotsTxt(site, { indexable }) {
  return indexable
    ? `User-agent: *\nAllow: /\n\nSitemap: ${site.path}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n`
}
