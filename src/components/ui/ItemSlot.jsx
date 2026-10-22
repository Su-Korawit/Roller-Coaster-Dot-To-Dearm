import PxIcon from './PxIcon'
import AtlasIcon from './AtlasIcon'
import NotificationBadge from './NotificationBadge'

// One hotbar / inventory cell. Selected slots lift 4px with a hard shadow.
// `label` is the accessible name and tooltip; the icon itself is decorative. The icon is
// either an image `icon` (src) or `iconName`, a sprite of the generated icon sheet.
// Extra props (data-*, aria-*) go to the button.
export default function ItemSlot({
  icon,
  iconName,
  label,
  selected = false,
  hotkey,
  badge = 0,
  onClick,
  className = '',
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      {...rest}
      className={`relative aspect-square grid place-items-center rounded-slot border-2 transition-transform
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime
        ${selected ? '-translate-y-1 shadow-px border-line bg-paper' : 'border-hairline bg-mist'} ${className}`}
    >
      {hotkey != null && (
        <span className="hidden md:block absolute left-1 top-0.5 font-display text-xs font-bold text-ink-soft" aria-hidden="true">
          {hotkey}
        </span>
      )}
      {iconName ? (
        <>
          <AtlasIcon name={iconName} scale={2} className="hidden min-[430px]:inline-block" />
          <AtlasIcon name={iconName} scale={1} className="min-[430px]:hidden" />
        </>
      ) : (
        <PxIcon src={icon} />
      )}
      {badge > 0 && <NotificationBadge count={badge} />}
    </button>
  )
}
