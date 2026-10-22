import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, LEGAL_PATHS } from '../../constants/legal'

function Items({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((t) => <li key={t}>{t}</li>)}
    </ul>
  )
}

// Reader for a document shaped like PRIVACY / TERMS in data/legalContent.js.
// Self-contained (no auth, no game, no site layout) so it renders on every
// subdomain and for logged-out visitors.
export default function LegalPage({ doc, other }) {
  useEffect(() => {
    const prev = document.title
    document.title = `${doc.title} · I LOVE TCAS`
    return () => { document.title = prev }
  }, [doc.title])

  return (
    <div className="min-h-dvh bg-paper text-ink overflow-y-auto" style={{ height: '100dvh' }}>
      <header className="sticky top-0 z-10 bg-paper border-b-2 border-ink px-4 py-3 flex items-center justify-between">
        <Link to="/" className="wordmark-font text-xs text-brand-strong">I LOVE TCAS</Link>
        <nav aria-label="เอกสารทางกฎหมาย" className="thai-font text-xs flex gap-3">
          <Link to={other.to} className="underline text-ink-soft">{other.label}</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 thai-font text-sm leading-relaxed">
        <h1 className="text-xl font-bold mb-1">{doc.title}</h1>
        <p className="text-ink-soft text-xs mb-5">{doc.subtitle}</p>

        {doc.intro.map((t) => <p key={t} className="mb-3">{t}</p>)}

        <nav aria-label="สารบัญ" className="px-slab p-3 my-5">
          <p className="text-xs font-bold mb-1.5">สารบัญ</p>
          <ol className="space-y-1 text-xs">
            {doc.sections.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="underline">{s.heading}</a></li>
            ))}
          </ol>
        </nav>

        {doc.sections.map((s) => (
          <section key={s.id} id={s.id} className="mb-6 scroll-mt-16">
            <h2 className="text-base font-bold mb-2">{s.heading}</h2>
            {s.items && <Items items={s.items} />}
            {s.lists?.map((l) => (
              <div key={l.label} className="mt-2">
                <h3 className="font-semibold mb-1">{l.label}</h3>
                <Items items={l.items} />
              </div>
            ))}
            {s.note && <p className="mt-2 font-semibold">{s.note}</p>}
          </section>
        ))}

        <footer className="border-t-2 border-ink/20 pt-4 text-xs text-ink-soft">
          มีคำถามหรืออยากใช้สิทธิของคุณ ติดต่อ{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
          {' · '}
          <Link to={LEGAL_PATHS.privacy} className="underline">นโยบายความเป็นส่วนตัว</Link>
          {' · '}
          <Link to={LEGAL_PATHS.terms} className="underline">ข้อกำหนดการใช้งาน</Link>
        </footer>
      </main>
    </div>
  )
}
