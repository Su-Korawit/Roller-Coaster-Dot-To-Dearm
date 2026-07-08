import Popup from '../ui/Popup'
import { STICKER_CATALOG } from '../../constants/stickerCatalog'

const GROUPS = [
  { key: 'university', label: 'มหาวิทยาลัย' },
  { key: 'motivation', label: 'กำลังใจ' },
]

export default function StickerPickerSheet({ onPick, onClose }) {
  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div className="px-5 pb-6 overflow-y-auto">
        <p className="pixel-font text-[10px] text-center text-ink mb-3">Sticker</p>
        {GROUPS.map((g) => (
          <div key={g.key} className="mb-4">
            <p className="thai-font text-[11px] text-ink-soft mb-2">{g.label}</p>
            <div className="grid grid-cols-4 gap-3">
              {STICKER_CATALOG.filter((s) => s.group === g.key).map((s) => (
                <button
                  key={s.id}
                  aria-label={s.label}
                  onClick={() => { onPick(s.url); onClose() }}
                  className="neo-card p-2 flex items-center justify-center aspect-square active:scale-95"
                >
                  <img src={s.url} alt="" className="max-w-full max-h-full object-contain" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Popup>
  )
}
