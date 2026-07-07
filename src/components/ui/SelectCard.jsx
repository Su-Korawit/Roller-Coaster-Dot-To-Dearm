/**
 * SelectCard — selectable card used by Career and Mastery pages.
 * Ink border + pressed brand fill when selected (design.md §4).
 */
export default function SelectCard({ name, detail, selected, onClick }) {
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`
        flex w-full items-start overflow-hidden rounded-xl text-left border-2 transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
        ${selected
          ? 'border-ink bg-brand-soft shadow-hard-sm'
          : 'border-ink/25 bg-surface hover:border-ink/60'}
      `}
    >
      <div className="px-4 py-3">
        <p className="thai-font text-sm font-bold text-ink leading-snug">{name}</p>
        {detail && (
          <p className="thai-font mt-1 text-xs leading-snug text-ink-soft">{detail}</p>
        )}
      </div>
    </button>
  )
}
