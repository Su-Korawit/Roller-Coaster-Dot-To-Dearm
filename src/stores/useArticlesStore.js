import { create } from 'zustand'
import { getDoc, getDocs } from 'firebase/firestore'
import { queries, refs } from '../lib/db'
import { toSummary } from '../content/listing'

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
    const snap = await getDoc(refs.article(slug))
    return snap.exists() ? { slug: snap.id, ...snap.data() } : null
  },
}))
