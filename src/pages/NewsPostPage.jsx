import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { hubArticleUrl } from '../content/hubUrl'

// Legacy news URL (app `/news/:id` and the news site `/:id`). Old posts were migrated into
// the content site's articles keeping their ids as slugs, so this just forwards the reader.
export default function NewsPostPage() {
  const { id } = useParams()
  const target = hubArticleUrl(id)

  useEffect(() => {
    window.location.replace(target)
  }, [target])

  return (
    <main data-testid="news-post-page" className="flex min-h-dvh w-full items-center justify-center bg-mist">
      <p className="thai-font text-sm text-ink-soft">กำลังพาไปยังบทความ...</p>
    </main>
  )
}
