import { CATEGORIES } from './BagIconRail'

export default function BagSettingsPanel({ visibleCategories, onChange, onClose }) {
  const current = new Set(visibleCategories?.length
    ? visibleCategories
    : CATEGORIES.map((c) => c.id))

  const toggle = (id) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="neo-card w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="pixel-font text-[10px] text-ink">Bag Settings</h2>
          <button type="button" onClick={onClose} className="text-sm text-brand">ปิด</button>
        </div>
        <p className="text-xs text-ink-soft">เลือกไอคอนที่แสดงในแถบด้านซ้าย</p>
        <ul className="space-y-2">
          {CATEGORIES.map(({ id, label }) => (
            <li key={id}>
              <label className="flex items-center gap-3 text-sm text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={current.has(id)}
                  onChange={() => toggle(id)}
                  className="w-4 h-4 accent-brand"
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
