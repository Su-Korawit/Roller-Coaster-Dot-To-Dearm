import PxIcon from './PxIcon'
import NotificationBadge from './NotificationBadge'

// One hotbar / inventory cell. Selected slots lift 4px with a hard shadow.
// `label` is the accessible name and tooltip; the icon itself is decorative.
export default function ItemSlot({
  icon,
  label,
  selected = false,
  hotkey,
  badge = 0,
  onClick,
  className = '',
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      className={`relative aspect-square grid place-items-center rounded-slot border-2 transition-transform
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime
        ${selected ? '-translate-y-1 shadow-px border-line bg-paper' : 'border-hairline bg-mist'} ${className}`}
    >
      {hotkey != null && (
        <span className="absolute left-1 top-0.5 font-display text-xs font-bold text-ink-soft" aria-hidden="true">
          {hotkey}
        </span>
      )}
      <PxIcon src={icon} />
      {badge > 0 && <NotificationBadge count={badge} />}
    </button>
  )
}
