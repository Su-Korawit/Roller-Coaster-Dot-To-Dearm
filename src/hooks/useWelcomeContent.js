import { useEffect, useState } from 'react'
import { getDoc, getDocs, query, orderBy } from 'firebase/firestore'
import { refs, cols } from '../lib/db'

const EMPTY = { gamePreview: null, stats: [], news: [], faq: [], testimonials: [], loading: true }

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
        getDocs(query(cols.welcomeNews, orderBy('createdAt', 'desc'))),
        getDocs(query(cols.welcomeFaq, orderBy('order', 'asc'))),
        getDocs(query(cols.welcomeTestimonials, orderBy('order', 'asc'))),
      ])
      if (!alive) return
      setContent({
        gamePreview: gp.exists() ? gp.data() : null,
        stats: st.exists() ? (st.data().items ?? []) : [],
        news: news.docs.map((d) => ({ id: d.id, ...d.data() })),
        faq: faq.docs.map((d) => ({ id: d.id, ...d.data() })),
        testimonials: tst.docs.map((d) => ({ id: d.id, ...d.data() })),
        loading: false,
      })
    })().catch(() => { if (alive) setContent({ ...EMPTY, loading: false }) })
    return () => { alive = false }
  }, [])

  return content
}
