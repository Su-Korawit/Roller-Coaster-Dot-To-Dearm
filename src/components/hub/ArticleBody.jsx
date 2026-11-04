import { useMemo } from 'react'
import { parseBody, renderBodyToHtml } from '../../content/renderBody'

// The only place article HTML enters the DOM. The HTML is produced by the whitelist
// renderer (escaped text, https/http/mailto links, https images, no unknown nodes),
// never taken from the stored document directly.
export default function ArticleBody({ body }) {
  const html = useMemo(() => renderBodyToHtml(parseBody(body)), [body])
  return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
}
