import { ExternalLink } from 'lucide-react'

// A website listed in the Store. Most sites block being embedded, so it opens in a new tab.
export default function LinkApp({ app }) {
  let host = ''
  try { host = new URL(app.url).hostname } catch { host = app.url }
  return (
    <div className="p-6 max-w-md mx-auto flex flex-col items-center gap-4 text-center">
      <h3 className="thai-font font-bold text-lg">{app.name}</h3>
      <p className="thai-font text-sm text-ink-soft">{app.tagline}</p>
      <p className="thai-font text-xs text-ink-soft">{host}</p>
      <a
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-btn px-5 py-2 thai-font text-sm font-bold bg-paper inline-flex items-center gap-2"
      >
        <ExternalLink size={16} /> เปิดเว็บ
      </a>
    </div>
  )
}
