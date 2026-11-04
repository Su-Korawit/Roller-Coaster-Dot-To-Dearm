import { useEffect, useState } from 'react'
import { getDoc, getDocs, query, orderBy } from 'firebase/firestore'
import { refs, cols, queries } from '../lib/db'
import { toSummary, toMillis } from '../content/listing'

const EMPTY = { gamePreview: null, stats: [], news: [], faq: [], testimonials: [], loading: true }
const NEWS_COUNT = 3

// News on the Welcome page = the newest published articles of the "news" category.
// Its own failure (e.g. offline, rules) must not blank the rest of the page.
async function loadNews() {
  try {
    const snap = await getDocs(queries.publishedArticles(60))
    return snap.docs
      .map((d) => toSummary({ id: d.id, ...d.data() }))
      .filter((a) => a.category === 'news')
      .sort((a, b) => toMillis(b.publishedAt) - toMillis(a.publishedAt))
      .slice(0, NEWS_COUNT)
  } catch (e) {
    console.error('[useWelcomeContent] news read failed:', e)
    return []
  }
}

// One-time read of the public Welcome content. No realtime listeners — the
// landing page is public and re-reads on reload.
export function useWelcomeContent() {
  const [content, setContent] = useState(EMPTY)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [gp, st, news, faq, tst] = await Promise.all([
        getDoc(refs.welcomeGamePreview()),
        getDoc(refs.welcomeStats()),
        loadNews(),
        getDocs(query(cols.welcomeFaq, orderBy('order', 'asc'))),
        getDocs(query(cols.welcomeTestimonials, orderBy('order', 'asc'))),
      ])
      if (!alive) return
      setContent({
        gamePreview: gp.exists() ? gp.data() : null,
        stats: st.exists() ? (st.data().items ?? []) : [],
        news,
        faq: faq.docs.map((d) => ({ id: d.id, ...d.data() })),
        testimonials: tst.docs.map((d) => ({ id: d.id, ...d.data() })),
        loading: false,
      })
    })().catch(() => { if (alive) setContent({ ...EMPTY, loading: false }) })
    return () => { alive = false }
  }, [])

  return content
}
