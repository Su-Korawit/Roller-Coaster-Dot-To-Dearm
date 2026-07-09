import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SITES } from '../../constants/sites'
import SiteNav, { siteHref } from './SiteNav'
import WelcomeFooter from '../welcome/WelcomeFooter'

// Feature-landing skeleton per design.md §13: SiteNav → split hero (copy left,
// screenshot slot right) → 3-col benefits → repeated CTA → footer. All visible
// copy comes from SITES h1/intro/pixelName; `benefits[].icon` is a lucide
// component (emoji chrome is banned, §6).
export default function LandingShell({
  siteKey,
  toolPath,
  toolLabel,
  benefits,
  screenshotLabel,
  children,
}) {
  const site = SITES[siteKey]

  return (
    <main data-testid={`${siteKey}-landing`} className="min-h-dvh w-full overflow-x-hidden bg-mist">
      <SiteNav currentKey={siteKey} />

      {/* Split hero */}
      <header className="border-b-2 border-ink bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:px-6 md:py-16">
          <div className="text-center md:text-left">
            <p className="pixel-font mb-4 text-[10px] uppercase text-brand-strong md:text-xs">
              {site.pixelName}
            </p>
            <h1 className="thai-font text-3xl font-extrabold leading-tight text-ink md:text-4xl">
              {site.h1}
            </h1>
            <p className="thai-font mt-4 text-base leading-relaxed text-ink-soft">{site.intro}</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <Link
                to={toolPath}
                className="neo-btn thai-font inline-flex items-center gap-2 rounded-lg bg-brand-strong px-6 py-3 text-base font-semibold text-white"
              >
                {toolLabel}
                <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <a
                href={siteHref('hub')}
                className="thai-font text-sm font-semibold text-brand-strong hover:underline"
              >
                ดูเครื่องมืออื่น
              </a>
            </div>
          </div>

          <div className="neo-card overflow-hidden">
            <div className="pixel-checker flex h-52 items-center justify-center md:h-72">
              <p className="thai-font text-sm text-ink-soft">{screenshotLabel}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Benefits */}
      <section aria-label="จุดเด่น" className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-5 sm:grid-cols-3">
          {benefits.map((b) => {
            const Icon = b.icon
            return (
              <div key={b.title} className="neo-card p-6">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border-2 border-ink bg-brand-soft">
                  <Icon size={22} strokeWidth={2.5} className="text-brand-strong" aria-hidden="true" />
                </span>
                <h2 className="thai-font mb-1.5 text-base font-bold text-ink">{b.title}</h2>
                <p className="thai-font text-sm leading-relaxed text-ink-soft">{b.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      {children}

      {/* Closing CTA */}
      <section className="border-t-2 border-ink bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-12 text-center md:px-6">
          <p className="thai-font text-lg font-bold text-ink">พร้อมเริ่มหรือยัง? ใช้ฟรี ไม่ต้องสมัคร</p>
          <Link
            to={toolPath}
            className="neo-btn thai-font inline-flex items-center gap-2 rounded-lg bg-brand-strong px-6 py-3 text-base font-semibold text-white"
          >
            {toolLabel}
            <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <WelcomeFooter />
    </main>
  )
}
