export default function BagQuotaMeter({ used = 0, quota = 1, isAdmin = false, onUpgrade }) {
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0
  const format = (n) => {
    if (n >= 1024 ** 4) return `${(n / 1024 ** 4).toFixed(1)} TB`
    if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`
    if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2)} MB`
    return `${n} B`
  }

  return (
    <div className="px-3 py-2 space-y-1.5 border-t border-ink/10">
      <div className="flex items-center justify-between gap-2">
        <span className="pixel-font text-[7px] text-ink-soft">
          {isAdmin ? '1TB (Admin)' : `${format(used)} / ${format(quota)}`}
        </span>
        {!isAdmin && onUpgrade && (
          <button type="button" onClick={onUpgrade} className="text-[10px] text-brand font-semibold">
            Upgrade
          </button>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-danger' : 'bg-brand'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
