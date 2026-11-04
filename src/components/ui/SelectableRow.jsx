// Tappable radio-style row: leading node + title/subtitle + radio dot.
export default function SelectableRow({ title, subtitle, leading, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-slot border-2 px-4 py-3 text-left transition-colors ${
        selected ? 'border-line bg-brand-soft' : 'border-hairline bg-paper hover:border-line-soft'
      }`}
    >
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink truncate">{title}</span>
        {subtitle && <span className="block text-xs text-ink-soft truncate">{subtitle}</span>}
      </span>
      <span
        role="radio"
        aria-checked={selected ? 'true' : 'false'}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-line' : 'border-hairline'
        }`}
      >
        {selected && <span className="w-2.5 h-2.5 rounded-full bg-line" />}
      </span>
    </button>
  )
}
