import { ROUNDS, ROUND_NAMES } from '../../constants/tcasRounds'

// Rounds 1–4 with how many universities have entries. A round nobody announced yet is greyed
// ("ยังไม่ประกาศ") but still selectable, so the list can say so instead of hiding the tab.
// summary: { [round]: { universities, seats } } from summariseRounds.
export default function RoundTabs({ summary, round, onChange, zone }) {
  return (
    <div className="grid grid-cols-4 border-b-2 border-line shrink-0" role="tablist" aria-label="รอบการรับสมัคร">
      {ROUNDS.map((r) => {
        const count = summary?.[r]?.universities ?? 0
        const on = r === round
        const wait = count === 0
        return (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(r)}
            className={`py-2 px-1 text-center border-r-2 border-line last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${on ? 'text-white' : wait ? 'bg-paper text-ink-soft' : 'bg-paper text-ink'}`}
            style={on ? { background: zone.color, boxShadow: `inset 0 -4px 0 ${zone.deep}` } : undefined}
          >
            <span className="pixel-font block text-lg leading-none">{r}</span>
            <span className="thai-font block text-xs font-bold mt-0.5">{ROUND_NAMES[r]}</span>
            <span className={`thai-font block text-xs mt-0.5 ${on ? 'text-white' : 'text-ink-soft'}`}>
              {wait ? 'ยังไม่ประกาศ' : `${count} มหาลัย`}
            </span>
          </button>
        )
      })}
    </div>
  )
}
