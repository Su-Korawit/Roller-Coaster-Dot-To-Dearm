import { thaiShortDate, daysText } from '../../utils/thaiDate'
import { programName } from './entryNames'

// "ต้องทำต่อไป": the nearest dated milestone that touches the plan, the programs it touches, and
// the checklist of the first of them (tick items right here). Pure view over planDerive.nextUp.
export default function NextUpCard({ next, onToggle }) {
  const first = next.entries[0]
  const pct = next.progress.total ? Math.round((next.progress.done / next.progress.total) * 100) : 0
  return (
    <section aria-label="ต้องทำต่อไป" className="px-slab bg-warn/30 p-3 flex flex-col gap-1.5">
      <p className="pixel-font text-xs text-danger">{`${thaiShortDate(next.event.date)} (${daysText(next.days)})`}</p>
      <p className="thai-font text-sm font-bold text-ink">{next.event.title}</p>
      <p className="thai-font text-xs text-ink-soft">{next.entries.map(programName).join(' · ')}</p>
      {first.checklist.length > 0 && (
        <ul className="flex flex-col gap-1 mt-1">
          {first.checklist.slice(0, 5).map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-2 thai-font text-sm text-ink min-h-8">
                <input type="checkbox" aria-label={c.text} checked={c.done} onChange={() => onToggle(first.id, c.id)} className="w-4 h-4" />
                <span className={c.done ? 'line-through text-ink-soft' : ''}>{c.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {next.progress.total > 0 && (
        <div role="progressbar" aria-label="ความคืบหน้า" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 rounded-full border-2 border-line bg-paper overflow-hidden">
          <div className="h-full bg-leaf" style={{ width: `${pct}%` }} />
        </div>
      )}
    </section>
  )
}
