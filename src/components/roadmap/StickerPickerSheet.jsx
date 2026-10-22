import Popup from '../ui/Popup'
import { STICKER_CATALOG } from '../../constants/stickerCatalog'
import { useEntitlementsStore } from '../../stores/useEntitlementsStore'

const GROUPS = [
  { key: 'university', label: 'มหาวิทยาลัย' },
  { key: 'motivation', label: 'กำลังใจ' },
]

function StickerButton({ sticker, onPick, onClose }) {
  return (
    <button
      aria-label={sticker.label}
      onClick={() => { onPick(sticker.url); onClose() }}
      className="px-card p-2 flex items-center justify-center aspect-square active:scale-95"
    >
      <img src={sticker.url} alt="" className="max-w-full max-h-full object-contain" />
    </button>
  )
}

export default function StickerPickerSheet({ onPick, onClose }) {
  // Raw-field selector; premium stickers are derived during render (e1d67fe).
  const entitlements = useEntitlementsStore((s) => s.entitlements)
  const premiumStickers = Object.values(entitlements)
    .filter((e) => e?.kind === 'sticker-pack')
    .flatMap((e) => e.payload?.stickers ?? [])

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div className="px-5 pb-6 overflow-y-auto">
        <p className="pixel-font text-xs text-center text-ink mb-3">Sticker</p>
        {GROUPS.map((g) => (
          <div key={g.key} className="mb-4">
            <p className="thai-font text-xs text-ink-soft mb-2">{g.label}</p>
            <div className="grid grid-cols-4 gap-3">
              {STICKER_CATALOG.filter((s) => s.group === g.key).map((s) => (
                <StickerButton key={s.id} sticker={s} onPick={onPick} onClose={onClose} />
              ))}
            </div>
          </div>
        ))}
        {premiumStickers.length > 0 && (
          <div className="mb-4">
            <p className="thai-font text-xs text-ink-soft mb-2">พรีเมียม</p>
            <div className="grid grid-cols-4 gap-3">
              {premiumStickers.map((s) => (
                <StickerButton key={s.id} sticker={s} onPick={onPick} onClose={onClose} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Popup>
  )
}
