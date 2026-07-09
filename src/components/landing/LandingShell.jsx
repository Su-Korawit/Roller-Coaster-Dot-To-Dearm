import { Link } from 'react-router-dom'
import { SITES } from '../../constants/sites'
import WelcomeFooter from '../welcome/WelcomeFooter'

function hubHref() {
  if (import.meta.env.DEV) return '/?site=hub'
  return SITES.hub.path
}

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
    <main data-testid={`${siteKey}-landing`} className="min-h-dvh w-full bg-[#F4F7FC] overflow-x-hidden">
      <header className="border-b-2 border-ink bg-surface px-6 py-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="pixel-font text-[10px] text-brand-strong mb-4">I LOVE TCAS</p>
          <h1 className="pixel-font text-sm md:text-base text-ink mb-4">{site.description}</h1>
          <p className="thai-font text-base text-ink/70">{site.title}</p>
        </div>
      </header>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-3xl grid gap-6 sm:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="neo-card p-5 text-center">
              <span className="text-3xl mb-3 block" aria-hidden="true">{b.icon}</span>
              <h2 className="pixel-font text-[9px] text-brand-strong mb-2">{b.title}</h2>
              <p className="thai-font text-sm text-ink/75">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-8">
        <div className="mx-auto max-w-3xl neo-card overflow-hidden">
          <div className="h-48 md:h-64 bg-gradient-to-br from-brand-soft to-brand/30 flex items-center justify-center border-b-2 border-ink">
            <p className="thai-font text-sm text-ink/50">{screenshotLabel}</p>
          </div>
          <div className="p-6 text-center">
            <Link
              to={toolPath}
              className="neo-btn inline-flex rounded-xl bg-brand-strong px-6 py-3 thai-font text-sm font-semibold text-white"
            >
              {toolLabel}
            </Link>
          </div>
        </div>
      </section>

      {children}

      <footer className="px-6 pb-6 text-center">
        <a href={hubHref()} className="thai-font text-sm text-brand-strong hover:underline">
          ← กลับหน้าแรก I LOVE TCAS
        </a>
      </footer>

      <WelcomeFooter />
    </main>
  )
}
