import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SITES } from '../../constants/sites'
import { siteHref } from './siteHref'

const TOOL_KEYS = ['roadmap', 'tcas', 'news', 'school']

// Shared public-site top nav (design.md §13/§16): wordmark → hub, tool links
// inline on desktop / behind a neo-card dropdown on mobile, ONE brand-strong
// CTA ("เข้าแอป"). Feature tools that need auth chrome use FeatureLayout instead.
export default function SiteNav({ currentKey = 'hub' }) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 border-b-2 border-ink bg-paper">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        <a
          href={siteHref('hub')}
          className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="I LOVE TCAS — หน้าแรก"
        >
          <img
            src="/brand/logo-96.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded border-2 border-ink"
          />
          <span className="wordmark-font pixel-title text-xs md:text-[13px]">I LOVE TCAS</span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {TOOL_KEYS.map((key) => (
            <a
              key={key}
              href={siteHref(key)}
              aria-current={key === currentKey ? 'page' : undefined}
              className={`thai-font rounded-lg px-3 py-1.5 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand ${
                key === currentKey
                  ? 'bg-brand-soft text-brand-strong'
                  : 'text-ink hover:bg-brand-soft'
              }`}
            >
              {SITES[key].shortName}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              aria-expanded={open}
              className="thai-font flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink hover:bg-brand-soft focus-visible:ring-2 focus-visible:ring-brand"
            >
              เครื่องมือ
              <ChevronDown size={16} strokeWidth={2.5} aria-hidden="true" />
            </button>
            {open && (
              <div className="px-card absolute right-0 top-full z-50 mt-2 min-w-[13rem] py-1">
                {TOOL_KEYS.map((key) => (
                  <a
                    key={key}
                    href={siteHref(key)}
                    className="thai-font block px-4 py-2.5 text-sm text-ink hover:bg-brand-soft"
                  >
                    {SITES[key].shortName}
                  </a>
                ))}
              </div>
            )}
          </div>

          <a
            href={siteHref('app')}
            className="px-btn thai-font rounded-lg bg-brand-strong px-4 py-2 text-sm font-semibold text-white"
          >
            เข้าแอป
          </a>
        </div>
      </div>
    </nav>
  )
}
