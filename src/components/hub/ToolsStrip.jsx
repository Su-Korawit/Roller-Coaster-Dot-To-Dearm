import { Map, GraduationCap, Newspaper, NotebookPen } from 'lucide-react'
import { SITES } from '../../constants/sites'
import { siteHref } from '../landing/siteHref'

const TOOLS = [
  ['roadmap', Map],
  ['tcas', GraduationCap],
  ['news', Newspaper],
  ['school', NotebookPen],
]

export default function ToolsStrip() {
  return (
    <section className="mt-12" aria-labelledby="tools-heading">
      <h2 id="tools-heading" className="font-display mb-4 text-xl font-bold text-ink">
        เครื่องมือฟรี ใช้ได้เลย ไม่ต้องสมัคร
      </h2>
      <div data-testid="tools-strip" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map(([key, icon]) => {
          const Icon = icon
          return (
          <a
            key={key}
            href={siteHref(key)}
            className="px-card flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui border-2 border-line bg-brand-soft">
              <Icon size={20} strokeWidth={2.5} className="text-brand" aria-hidden="true" />
            </span>
            <span className="font-display text-sm font-semibold text-ink">{SITES[key].shortName}</span>
          </a>
          )
        })}
      </div>
    </section>
  )
}
