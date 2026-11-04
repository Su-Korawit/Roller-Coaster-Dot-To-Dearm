import {
  Image, Film, FileText, Package, Trash2, Settings,
} from 'lucide-react'

const CATEGORIES = [
  { id: 'images', label: 'Images', Icon: Image },
  { id: 'videos', label: 'Videos', Icon: Film },
  { id: 'files', label: 'Files', Icon: FileText },
  { id: 'exports', label: 'Exports', Icon: Package },
  { id: 'trash', label: 'Trash', Icon: Trash2 },
]

export default function BagIconRail({
  visibleCategories,
  activeCategory,
  onSelectCategory,
  onOpenSettings,
}) {
  const visible = new Set(visibleCategories?.length
    ? visibleCategories
    : CATEGORIES.map((c) => c.id))

  return (
    <aside className="flex md:flex-col items-center gap-1 p-2 border-b md:border-b-0 md:border-r border-ink/10 bg-paper flex-shrink-0 overflow-x-auto no-scrollbar">
      {CATEGORIES.filter((c) => visible.has(c.id)).map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={activeCategory === id}
          onClick={() => onSelectCategory(id)}
          className={[
            'flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl transition-all flex-shrink-0',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
            activeCategory === id ? 'bg-brand/20 text-brand' : 'text-ink-soft hover:bg-brand/10',
          ].join(' ')}
        >
          <Icon size={20} strokeWidth={2} />
          <span className="pixel-font text-xs mt-0.5 hidden md:block">{label}</span>
        </button>
      ))}
      <button
        type="button"
        title="Settings"
        aria-label="Bag settings"
        onClick={onOpenSettings}
        className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl text-ink-soft hover:bg-brand/10 flex-shrink-0 md:mt-auto"
      >
        <Settings size={20} strokeWidth={2} />
      </button>
    </aside>
  )
}

export { CATEGORIES }
