import { useState } from 'react'
import { ExternalLink, RotateCw } from 'lucide-react'

// A website listed in the Store, shown inside our own window. Sites that forbid embedding
// (app.embed === false) or fail to load get a card with a button to open them in a new tab.
export default function LinkApp({ app }) {
  const [rev, setRev] = useState(0)
  const [blocked, setBlocked] = useState(app.embed === false)
  let host = ''
  try { host = new URL(app.url).hostname } catch { host = app.url }

  const openLink = (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      className="px-btn px-4 py-1.5 thai-font text-xs font-bold bg-paper inline-flex items-center gap-2"
    >
      <ExternalLink size={14} /> เปิดในแท็บใหม่
    </a>
  )

  if (blocked) {
    return (
      <div className="p-6 max-w-md mx-auto flex flex-col items-center gap-4 text-center">
        <h3 className="thai-font font-bold text-lg">{app.name}</h3>
        <p className="thai-font text-sm text-ink-soft">{app.tagline}</p>
        <p className="thai-font text-sm">เว็บไซต์นี้ไม่อนุญาตให้แสดงในแอปอื่น ({host}) กดปุ่มด้านล่างเพื่อเปิดในแท็บใหม่</p>
        {openLink}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b-2 border-hairline bg-paper shrink-0">
        <button type="button" onClick={() => setRev((r) => r + 1)} aria-label="โหลดใหม่" className="w-8 h-8 flex items-center justify-center rounded-ui hover:bg-brand-soft">
          <RotateCw size={16} />
        </button>
        <span className="thai-font text-xs text-ink-soft flex-1 truncate">{host}</span>
        <button type="button" onClick={() => setBlocked(true)} className="thai-font text-xs font-semibold text-brand-strong underline">เปิดไม่ขึ้น?</button>
        {openLink}
      </div>
      <iframe
        key={rev}
        src={app.url}
        title={app.name}
        className="flex-1 w-full border-0 bg-paper"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  )
}
