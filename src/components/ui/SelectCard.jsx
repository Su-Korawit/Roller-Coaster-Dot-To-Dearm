/**
 * SelectCard — selectable card used by Career and Mastery pages.
 * Line border + soft brand fill when selected (design.md §4).
 */
export default function SelectCard({ name, detail, selected, onClick }) {
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`
        flex w-full items-start overflow-hidden rounded-slot text-left border-2 transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
        ${selected
          ? 'border-line bg-brand-soft shadow-px-sm'
          : 'border-hairline bg-paper hover:border-line-soft'}
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
