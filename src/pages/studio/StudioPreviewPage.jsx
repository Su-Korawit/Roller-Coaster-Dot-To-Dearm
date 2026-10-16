import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getDoc } from 'firebase/firestore'
import { refs } from '../../lib/db'
import ArticleBody from '../../components/hub/ArticleBody'

// The saved draft as readers will see it: same safe renderer and article styles.
export default function StudioPreviewPage() {
  const { draftId } = useParams()
  const [loaded, setLoaded] = useState({ id: null, draft: null })

  useEffect(() => {
    let cancelled = false
    getDoc(refs.articleDraft(draftId))
      .then((snap) => {
        if (!cancelled) setLoaded({ id: draftId, draft: snap.exists() ? snap.data() : false })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id: draftId, draft: false })
      })
    return () => {
      cancelled = true
    }
  }, [draftId])

  if (loaded.id !== draftId) return null
  if (!loaded.draft) {
    return (
      <div className="min-h-dvh bg-mist flex flex-col items-center justify-center gap-3">
        <p className="text-ink">ไม่พบบทความนี้</p>
        <Link to="/studio" className="text-sm text-ink-soft underline">กลับไปรายการบทความ</Link>
      </div>
    )
  }
  const d = loaded.draft
  return (
    <div className="min-h-dvh bg-white">
      <article className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-xs font-bold text-ink-soft mb-2">ตัวอย่างบทความ (ยังไม่เผยแพร่)</p>
        {d.coverUrl && <img src={d.coverUrl} alt={d.coverAlt ?? ''} className="w-full rounded-card mb-4" />}
        <h1 className="text-2xl font-bold text-ink mb-1">{d.title}</h1>
        {d.authorName && <p className="text-sm text-ink-soft mb-4">โดย {d.authorName}</p>}
        <ArticleBody body={d.body} />
      </article>
    </div>
  )
}
