import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { appLink } from '../../content/htmlPages'
import { siteHref } from '../landing/siteHref'

const QUICK_FACULTIES = ['แพทย์', 'วิศวะ', 'นิติ', 'บริหาร', 'นิเทศ', 'ครุศาสตร์']

// Full-screen banner: the campus backdrop, a headline, article search, and the way into
// the app. Height = viewport minus the 60px nav (min 560px).
export default function HubHero({ config }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const submit = (e) => {
    e.preventDefault()
    navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <section
      aria-label="แบนเนอร์"
      className="relative isolate flex min-h-[560px] items-center overflow-hidden border-b-2 border-line"
      style={{
        height: 'calc(100vh - 60px)',
        backgroundColor: 'var(--color-zone-sci-soft)',
        backgroundImage: 'url(/assets/hub/campus-hero.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
      }}
    >
      {/* Text panel: soft fade on wide screens, near-opaque on narrow ones. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden md:block"
        style={{ background: 'linear-gradient(90deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.88) 34%, rgba(255,255,255,0) 66%)' }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-paper/90 md:hidden" />

      <div className="relative mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="max-w-[640px]">
          <span className="thai-font inline-block rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
            เว็บแอปวางแผน TCAS
          </span>
          <h1 className="font-display mt-3 text-[clamp(30px,4.4vw,52px)] font-bold leading-[1.15] text-ink">
            <span className="whitespace-nowrap">วางแผนสอบติดมหาลัย</span>
            <br />
            แบบเล่นเกม
          </h1>
          <p className="thai-font mt-4 max-w-md text-base leading-relaxed text-ink-soft md:text-lg">
            เดินดูทุกคณะในแคมปัสพิกเซล เห็นเส้นทางเข้าทุกรอบ แล้วอ่านบทความที่ช่วยเลือกโครงการ
          </p>

          <form onSubmit={submit} role="search" className="mt-6">
            <label className="sr-only" htmlFor="hub-search">ค้นหาบทความ</label>
            <input
              id="hub-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="วันนี้อยากรู้เรื่องอะไร? พิมพ์ชื่อคณะหรือมหาลัย"
              className="px-input thai-font w-full px-4 py-3 text-base text-ink placeholder:text-ink-soft"
            />
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_FACULTIES.map((name) => (
              <Link
                key={name}
                to={`/search?q=${encodeURIComponent(name)}`}
                className="font-display rounded-full border-2 border-hairline bg-paper px-3 py-1 text-[13px] font-semibold text-ink hover:border-line"
              >
                {name}
              </Link>
            ))}
            <a
              href={siteHref('tcas')}
              className="font-display rounded-full border-2 border-hairline bg-paper px-3 py-1 text-[13px] font-semibold text-ink hover:border-line"
            >
              ดูทุกคณะ
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={appLink('banner', 'home')}
              className="px-btn thai-font rounded-ui bg-ink px-5 py-3 text-base font-semibold text-white"
            >
              เข้าสู่แอป
            </a>
            {config?.openHouseEnabled === true && (
              <Link
                to="/openhouse"
                className="px-btn thai-font rounded-ui bg-paper px-5 py-3 text-base font-semibold text-ink"
              >
                เดินดูแคมปัส Open House
              </Link>
            )}
          </div>
        </div>
      </div>

      <a
        href="#latest"
        className="font-display absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border-2 border-line bg-paper px-4 py-1.5 text-[13px] font-semibold text-ink shadow-px-sm"
      >
        เลื่อนลง อ่านบทความล่าสุด
        <ChevronDown size={16} strokeWidth={2.5} aria-hidden="true" />
      </a>
    </section>
  )
}
