import { useRoomStore } from '../../stores/useRoomStore'
import { useLeavesStore } from '../../stores/useLeavesStore'
import { describePlaceError } from '../../room/messages'
import { Z_NAV } from '../../constants/zIndex'

const PLACEABLE = ['furniture', 'desk', 'decor', 'wall']

// Decorate mode: pick an owned item, then tap the room to place it; tap a placed item (with
// nothing picked) to put it back in storage.
export default function DecorateBar() {
  const decorating = useRoomStore((s) => s.decorating)
  const selected = useRoomStore((s) => s.selected)
  const lastError = useRoomStore((s) => s.lastError)
  const catalog = useRoomStore((s) => s.catalog)
  const placed = useRoomStore((s) => s.layout.placed)
  const inventory = useLeavesStore((s) => s.inventory)

  if (!decorating) return null

  const left = Object.entries(inventory)
    .filter(([id]) => PLACEABLE.includes(catalog[id]?.kind))
    .map(([id, owned]) => [id, owned - placed.filter((p) => p.itemId === id).length])
    .filter(([, n]) => n > 0)

  return (
    <div className="absolute inset-x-0 bottom-24 flex flex-col items-center gap-2 px-3" style={{ zIndex: Z_NAV }}>
      <p className="text-xs text-ink bg-paper/90 rounded-slot px-3 py-1">แตะที่ห้องเพื่อวาง · แตะของที่วางแล้วเพื่อเก็บ</p>
      {lastError && <p role="alert" className="text-sm font-bold text-ink bg-warn rounded-slot px-3 py-1">{describePlaceError(lastError)}</p>}
      <div className="px-slab bg-paper p-2 flex items-center gap-2 max-w-full overflow-x-auto">
        {left.length === 0 && <span className="text-sm text-ink-soft px-2">ของที่ซื้อไว้วางครบแล้ว</span>}
        {left.map(([id, n]) => (
          <button
            key={id}
            type="button"
            aria-pressed={selected === id}
            onClick={() => useRoomStore.getState().selectItem(selected === id ? null : id)}
            className={`px-btn h-11 px-3 text-sm font-bold whitespace-nowrap ${selected === id ? 'bg-ink text-white' : 'bg-paper text-ink'}`}
          >
            {`${catalog[id].name} ×${n}`}
          </button>
        ))}
        <button type="button" className="px-btn h-11 px-4 text-sm font-bold bg-leaf text-ink" onClick={() => useRoomStore.getState().setDecorating(false)}>
          เสร็จ
        </button>
      </div>
    </div>
  )
}
