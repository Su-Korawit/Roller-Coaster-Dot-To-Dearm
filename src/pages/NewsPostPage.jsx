import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDoc } from 'firebase/firestore'
import { refs } from '../lib/db'

export default function NewsPostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getDoc(refs.welcomeNewsPost(id))
      .then((snap) => { if (alive) setPost(snap.exists() ? { id: snap.id, ...snap.data() } : null) })
      .catch(() => { if (alive) setPost(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  return (
    <main data-testid="news-post-page" className="min-h-dvh w-full bg-[#F4F7FC]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/5 bg-white px-4 py-3">
        <button
          onClick={() => navigate('/')}
          aria-label="กลับ"
          className="rounded-lg p-1.5 text-ink/60 transition-colors hover:bg-gray-100 hover:text-ink"
        >
          <span aria-hidden="true">←</span>
        </button>
        <h1 className="thai-font truncate text-sm font-bold text-ink">
          {loading ? 'กำลังโหลด...' : post ? post.titleTh : 'ไม่พบข่าว'}
        </h1>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        {loading && <p className="thai-font text-sm text-ink/60">กำลังโหลด...</p>}
        {!loading && !post && (
          <p className="thai-font text-sm text-ink/60">ไม่พบข่าวนี้ อาจถูกลบไปแล้ว</p>
        )}
        {!loading && post && (
          <>
            {post.coverUrl && (
              <img src={post.coverUrl} alt="" className="mb-6 w-full rounded-2xl object-cover" />
            )}
            <h2 className="pixel-font mb-4 text-sm text-ink md:text-base">{post.titleTh}</h2>
            <p className="thai-font whitespace-pre-line text-sm leading-relaxed text-ink/80 md:text-base">
              {post.bodyTh}
            </p>
          </>
        )}
      </div>
    </main>
  )
}
