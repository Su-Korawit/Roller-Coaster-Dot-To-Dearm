import { useState } from 'react'
import Popup from '../ui/Popup'
import { useRoomStore } from '../../stores/useRoomStore'
import { useLeavesStore } from '../../stores/useLeavesStore'
import { useFxStore } from '../../stores/useFxStore'
import { buyRoomItem } from '../../services/roomApi'
import { emitGuide } from '../../lib/guideEvents'
import { describeBuyError } from '../../room/messages'

const TABS = [
  { id: 'furniture', label: 'เฟอร์นิเจอร์', kinds: ['furniture', 'desk'] },
  { id: 'decor', label: 'ของตกแต่ง', kinds: ['decor', 'wall'] },
  { id: 'theme', label: 'ธีม', kinds: ['theme'] },
]
const UNIQUE = ['theme', 'tier', 'pet']

// Spend Leaves on furniture. The price and the balance are the server's: nothing is deducted
// here until buyRoomItem answers.
export default function ShopSheet({ onClose }) {
  const catalog = useRoomStore((s) => s.catalog)
  const leaves = useLeavesStore((s) => s.leaves)
  const inventory = useLeavesStore((s) => s.inventory)
  const [tab, setTab] = useState('furniture')
  const [busy, setBusy] = useState(null)

  const kinds = TABS.find((t) => t.id === tab).kinds
  const rows = Object.entries(catalog).filter(([, item]) => !item.hidden && kinds.includes(item.kind))

  const buy = async (id, item) => {
    setBusy(id)
    try {
      const r = await buyRoomItem(id)
      useLeavesStore.getState().applyServer({ leaves: r.leaves, inventory: { ...useLeavesStore.getState().inventory, [id]: r.owned } })
      useFxStore.getState().push({ kind: 'info', text: `ซื้อ${item.name}แล้ว` })
      emitGuide('bought')
    } catch (e) {
      useFxStore.getState().push({ kind: 'info', text: describeBuyError(e) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div className="p-5 flex flex-col gap-4 min-h-0">
        <div className="flex items-center justify-between">
          <h2 className="pixel-font text-lg text-ink">ร้านค้า</h2>
          <span className="pixel-font text-sm text-ink">{`${leaves.toLocaleString('en-US')} ใบ`}</span>
        </div>

        <div role="tablist" className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-btn h-11 px-3 text-sm font-bold ${tab === t.id ? 'bg-ink text-white' : 'bg-paper text-ink'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-3 overflow-y-auto">
          {rows.map(([id, item]) => {
            const owned = Number(inventory[id] ?? 0)
            const locked = UNIQUE.includes(item.kind) && owned >= 1
            return (
              <li key={id} className="px-card bg-paper p-3 flex flex-col gap-2">
                <span className="text-sm font-bold text-ink">{item.name}</span>
                <span className="text-xs text-ink-soft" data-price={id}>{`${item.price} ใบ`}</span>
                <span className="text-xs text-ink-soft">{owned > 0 ? `มี ${owned}` : 'ยังไม่มี'}</span>
                <button
                  type="button"
                  className="px-btn h-11 text-sm font-bold bg-leaf text-ink disabled:opacity-60"
                  disabled={locked || busy === id}
                  aria-label={`${locked ? 'มีแล้ว' : 'ซื้อ'} ${item.name}`}
                  onClick={() => buy(id, item)}
                >
                  {locked ? 'มีแล้ว' : 'ซื้อ'}
                </button>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          className="px-btn h-11 text-sm font-bold bg-paper text-ink"
          data-guide="decorate"
          onClick={() => {
            useRoomStore.getState().setDecorating(true)
            onClose()
          }}
        >
          แต่งห้อง
        </button>
      </div>
    </Popup>
  )
}
