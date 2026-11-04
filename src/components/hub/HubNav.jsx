import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Search } from 'lucide-react'
import { CATEGORIES } from '../../content/schema'
import { appLink } from '../../content/htmlPages'
import { SITES } from '../../constants/sites'
import { siteHref } from '../landing/siteHref'

const TOOL_KEYS = ['roadmap', 'tcas', 'news', 'school']

// Top nav of the content site: wordmark, category links, search, tools menu and the one
// filled call-to-action into the app.
export default function HubNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 border-b-2 border-line bg-paper">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center gap-4 px-4 md:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="I LOVE TCAS หน้าแรก">
          <img src="/brand/logo-96.png" alt="" width={32} height={32} className="h-8 w-8 rounded-ui border-2 border-line" />
          <span className="wordmark-font hidden text-xs text-ink sm:inline md:text-[12px]">I LOVE TCAS</span>
        </Link>

        <div className="ml-2 hidden flex-1 items-center gap-1 lg:flex">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              to={`/category/${c.id}`}
              className="thai-font rounded-ui px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-mist hover:text-ink"
            >
              {c.labelTh}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <Link
            to="/search"
            aria-label="ค้นหาบทความ"
            className="rounded-ui p-2 text-ink hover:bg-mist focus-visible:ring-2 focus-visible:ring-lime"
          >
            <Search size={20} strokeWidth={2.5} aria-hidden="true" />
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              aria-expanded={open}
              className="thai-font flex items-center gap-1 whitespace-nowrap rounded-ui px-2 py-1.5 text-sm font-semibold text-ink hover:bg-mist focus-visible:ring-2 focus-visible:ring-lime"
            >
              เครื่องมือ
              <ChevronDown size={16} strokeWidth={2.5} aria-hidden="true" />
            </button>
            {open && (
              <div className="px-card absolute right-0 top-full z-50 mt-2 min-w-[13rem] py-1">
                {TOOL_KEYS.map((key) => (
                  <a key={key} href={siteHref(key)} className="thai-font block px-4 py-2.5 text-sm text-ink hover:bg-mist">
                    {SITES[key].shortName}
                  </a>
                ))}
              </div>
            )}
          </div>

          <a
            href={appLink('nav', 'home')}
            className="px-btn thai-font whitespace-nowrap rounded-ui bg-ink px-3 py-2 text-sm font-semibold text-white md:px-4"
          >
            เข้าสู่แอป
          </a>
        </div>
      </div>
    </nav>
  )
}
