import { MessageCircle } from 'lucide-react'
import { openChatLink } from '../../content/htmlPages'

// Invitation to the LINE OpenChat room. Renders nothing unless the owner configured a
// valid https link (siteConfig/hub); the room itself lives in the LINE app.
export default function OpenChatBand({ config }) {
  const href = openChatLink(config, 'band', 'home')
  if (!href) return null
  return (
    <section data-testid="openchat-band" className="px-card mt-10 flex flex-wrap items-center gap-5 p-5 md:p-6">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-slot border-2 border-line bg-zone-earth-soft text-zone-earth-deep">
        <MessageCircle size={28} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <div className="min-w-[240px] flex-1">
        <h2 className="font-display text-lg font-bold text-ink">ห้องคุยกับเพื่อน DEK70 บน LINE OpenChat</h2>
        {config?.lineRules && <p className="thai-font mt-1 text-sm text-ink-soft">{config.lineRules}</p>}
        {config?.lineModerators && (
          <p className="thai-font mt-0.5 text-sm text-ink-soft">ผู้ดูแลห้อง: {config.lineModerators}</p>
        )}
      </div>
      <a
        href={href}
        rel="noopener"
        className="px-btn thai-font rounded-ui bg-ink px-5 py-2.5 text-sm font-semibold text-white"
      >
        เข้าห้องแชท
      </a>
    </section>
  )
}
