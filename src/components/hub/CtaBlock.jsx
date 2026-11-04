import { MessageCircle } from 'lucide-react'
import { appLink, openChatLink } from '../../content/htmlPages'

// End-of-article prompt: the app, and the OpenChat room when one is configured.
export default function CtaBlock({ slug, config }) {
  const chat = openChatLink(config, 'article', slug)
  return (
    <aside className="px-card mt-10 p-5 md:p-6">
      <h2 className="font-display text-lg font-bold text-ink">ไปต่อกับ I LOVE TCAS</h2>
      <p className="thai-font mt-1 text-sm text-ink-soft">วางแผนเส้นทางเข้ามหาลัยของคุณ และคุยกับเพื่อน DEK70</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={appLink('article', slug)} className="px-btn thai-font rounded-ui bg-ink px-5 py-2.5 text-sm font-semibold text-white">
          เปิดแอปวางแผน TCAS
        </a>
        {chat && (
          <a
            href={chat}
            rel="noopener"
            className="px-btn thai-font inline-flex items-center gap-2 rounded-ui bg-paper px-5 py-2.5 text-sm font-semibold text-ink"
          >
            <MessageCircle size={16} strokeWidth={2.5} aria-hidden="true" />
            เข้าห้องแชท LINE OpenChat
          </a>
        )}
      </div>
    </aside>
  )
}
