import { SITES } from '../constants/sites'
import WelcomeFooter from '../components/welcome/WelcomeFooter'

const TOOL_SITES = ['roadmap', 'tcas', 'news', 'school']

const TOOL_ICONS = {
  roadmap: '🗺️',
  tcas: '🎓',
  news: '📰',
  school: '📚',
}

function siteHref(key) {
  if (import.meta.env.DEV) return `/?site=${key}`
  return SITES[key].path
}

export default function HubPage() {
  return (
    <main data-testid="hub-page" className="min-h-dvh w-full bg-[#F4F7FC] overflow-x-hidden">
      <header className="border-b-2 border-ink bg-surface px-6 py-8 text-center">
        <p className="pixel-font text-sm md:text-base pixel-title text-ink mb-3">I LOVE TCAS</p>
        <p className="thai-font text-base md:text-lg text-ink/80 max-w-xl mx-auto">
          เครื่องมือวางแผน TCAS ครบวงจร — ใช้ได้ทันที ไม่ต้องล็อกอิน
        </p>
      </header>

      <section className="px-6 py-10 md:py-14">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_SITES.map((key) => {
            const site = SITES[key]
            return (
              <a
                key={key}
                href={siteHref(key)}
                className="neo-card group flex flex-col p-6 transition-transform hover:-translate-y-1"
              >
                <span className="text-4xl mb-4" aria-hidden="true">{TOOL_ICONS[key]}</span>
                <h2 className="pixel-font text-[10px] md:text-xs text-brand-strong mb-2 group-hover:text-brand">
                  {site.title.split('—')[0].trim()}
                </h2>
                <p className="thai-font text-sm text-ink/75 flex-1">{site.description}</p>
                <span className="thai-font text-xs text-brand-strong mt-4 font-semibold">
                  เปิดเครื่องมือ →
                </span>
              </a>
            )
          })}

          <a
            href={siteHref('app')}
            className="neo-card group flex flex-col p-6 sm:col-span-2 lg:col-span-1 border-brand bg-brand-soft transition-transform hover:-translate-y-1"
          >
            <span className="text-4xl mb-4" aria-hidden="true">🎢</span>
            <h2 className="pixel-font text-[10px] md:text-xs text-brand-strong mb-2">
              เข้าแอปเต็ม + เกม
            </h2>
            <p className="thai-font text-sm text-ink/75 flex-1">
              {SITES.app.description} — MBTI, gamification, และทุกฟีเจอร์ในที่เดียว
            </p>
            <span className="thai-font text-xs text-brand-strong mt-4 font-semibold">
              เข้าแอป →
            </span>
          </a>
        </div>
      </section>

      <WelcomeFooter />
    </main>
  )
}
