import { create } from 'zustand'
import { getDoc, getDocs } from 'firebase/firestore'
import { queries, refs } from '../lib/db'
import { toSummary } from '../content/listing'

// Development only: VITE_CONTENT_SEED=1 swaps Firestore for local sample articles so the
// hub can be previewed before any content exists (see docs/content-site-ops.md). The
// The DEV check is written inline at each use (not behind a helper) so the bundler can
// prove it false in production builds and drop the fixtures chunk entirely.

// Public content-site data. One-time reads (no realtime listeners): the hub is
// public and re-reads on reload; the server-rendered HTML covers first paint.
export const useArticlesStore = create((set) => ({
  summaries: [], // newest published articles, without bodies
  config: null, // siteConfig/hub (OpenChat info, featured slug, …)
  loading: false,
  error: null,

  loadHome: async () => {
    set({ loading: true, error: null })
    try {
      if (import.meta.env.DEV && import.meta.env.VITE_CONTENT_SEED === '1') {
        const { DEV_ARTICLES, DEV_CONFIG } = await import('../content/devFixtures')
        set({ summaries: DEV_ARTICLES.map(toSummary), config: DEV_CONFIG, loading: false })
        return
      }
      const [snap, cfg] = await Promise.all([getDocs(queries.publishedArticles()), getDoc(refs.siteConfigHub())])
      set({
        summaries: snap.docs.map((d) => toSummary({ id: d.id, ...d.data() })),
        config: cfg.exists() ? cfg.data() : null,
        loading: false,
      })
    } catch (error) {
      set({ loading: false, error })
    }
  },

  // The full published article (with body) or null when it does not exist.
  loadArticle: async (slug) => {
    if (import.meta.env.DEV && import.meta.env.VITE_CONTENT_SEED === '1') {
      const { DEV_ARTICLES } = await import('../content/devFixtures')
      return DEV_ARTICLES.find((a) => a.slug === slug) ?? null
    }
    const snap = await getDoc(refs.article(slug))
    return snap.exists() ? { slug: snap.id, ...snap.data() } : null
  },
}))
