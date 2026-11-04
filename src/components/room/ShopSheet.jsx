import { useState } from 'react'
import Popup from '../ui/Popup'
import { useRoomStore } from '../../stores/useRoomStore'
import { useLeavesStore } from '../../stores/useLeavesStore'
import { useFxStore } from '../../stores/useFxStore'
import { useRoomUiStore } from '../../stores/useRoomUiStore'
import { buyRoomItem } from '../../services/roomApi'
import { emitGuide } from '../../lib/guideEvents'
import { describeBuyError, describeStyleError } from '../../room/messages'

const TABS = [
  { id: 'furniture', label: 'เฟอร์นิเจอร์', kinds: ['furniture', 'desk'] },
  { id: 'decor', label: 'ของตกแต่ง', kinds: ['decor', 'wall'] },
  { id: 'tier', label: 'ห้อง', kinds: ['tier'] },
  { id: 'theme', label: 'ธีม', kinds: ['theme'] },
  { id: 'pet', label: 'สัตว์เลี้ยง', kinds: ['pet'] },
  { id: 'accessory', label: 'ตัวละคร', kinds: ['accessory'] },
]
const UNIQUE = ['theme', 'tier', 'pet', 'accessory']
const tierNumber = (id) => Number(id.replace('tier_', ''))

// Spend Leaves on furniture, bigger rooms, themes, pets and accessories. The price and the balance
// are the server's: nothing is deducted here until buyRoomItem answers. Owned room styles are applied
// from here too (the layout rules decide whether that is allowed).
export default function ShopSheet({ onClose }) {
  const catalog = useRoomStore((s) => s.catalog)
  const layout = useRoomStore((s) => s.layout)
  const leaves = useLeavesStore((s) => s.leaves)
  const inventory = useLeavesStore((s) => s.inventory)
  const [tab, setTab] = useState('furniture')
  const [busy, setBusy] = useState(null)

  const kinds = TABS.find((t) => t.id === tab).kinds
  const rows = Object.entries(catalog)
    .filter(([, item]) => !item.hidden && kinds.includes(item.kind))
    .sort(([a], [b]) => (tab === 'tier' ? tierNumber(a) - tierNumber(b) : 0))

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

  const apply = (ok) => {
    if (!ok) useFxStore.getState().push({ kind: 'info', text: describeStyleError(useRoomStore.getState().lastError) })
  }

  // What the button of a card does: buy, apply an owned style, or nothing.
  const actionFor = (id, item) => {
    const owned = Number(inventory[id] ?? 0)
    const state = useRoomStore.getState()
    const buyAction = { label: 'ซื้อ', aria: `ซื้อ ${item.name}`, run: () => buy(id, item), disabled: busy === id }
    if (owned < 1) {
      if (item.requires && Number(inventory[item.requires] ?? 0) < 1) {
        return { ...buyAction, disabled: true, note: `ต้องซื้อ ${catalog[item.requires]?.name ?? 'ขั้นก่อนหน้า'} ก่อน` }
      }
      return buyAction
    }
    if (item.kind === 'theme') {
      const theme = id.replace(/^theme_/, '')
      return layout.theme === theme
        ? { label: 'ใช้อยู่', disabled: true }
        : { label: 'ใช้ธีมนี้', run: () => apply(state.setTheme(theme)) }
    }
    if (item.kind === 'tier') {
      return layout.tier === tierNumber(id)
        ? { label: 'ใช้อยู่', disabled: true }
        : { label: 'ใช้ขั้นนี้', run: () => apply(state.setTier(tierNumber(id))) }
    }
    if (item.kind === 'pet') {
      return layout.petId === id
        ? { label: 'อยู่กับคุณ', disabled: true }
        : { label: 'เลือก', run: () => apply(state.setPet(id)) }
    }
    if (UNIQUE.includes(item.kind)) return { label: 'มีแล้ว', aria: `มีแล้ว ${item.name}`, disabled: true }
    return buyAction
  }

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div className="p-5 flex flex-col gap-4 min-h-0">
        <div className="flex items-center justify-between">
          <h2 className="pixel-font text-lg text-ink">ร้านค้า</h2>
          <span className="pixel-font text-sm text-ink">{`${leaves.toLocaleString('en-US')} ใบ`}</span>
        </div>

        <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-btn h-11 px-3 text-sm font-bold shrink-0 ${tab === t.id ? 'bg-ink text-white' : 'bg-paper text-ink'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'tier' && layout.tier > 0 && (
          <button type="button" className="px-btn h-11 text-sm font-bold bg-paper text-ink" onClick={() => apply(useRoomStore.getState().setTier(0))}>
            ใช้ห้องเริ่มต้น
          </button>
        )}
        {tab === 'pet' && layout.petId && (
          <button type="button" className="px-btn h-11 text-sm font-bold bg-paper text-ink" onClick={() => apply(useRoomStore.getState().setPet(null))}>
            ไม่มีสัตว์เลี้ยง
          </button>
        )}
        {tab === 'accessory' && (
          <button type="button" className="px-btn h-11 text-sm font-bold bg-paper text-ink" onClick={() => useRoomUiStore.getState().open('wardrobe')}>
            เปิดตู้เสื้อผ้า
          </button>
        )}

        <ul className="grid grid-cols-2 gap-3 overflow-y-auto">
          {rows.map(([id, item]) => {
            const owned = Number(inventory[id] ?? 0)
            const a = actionFor(id, item)
            return (
              <li key={id} className="px-card bg-paper p-3 flex flex-col gap-2">
                <span className="text-sm font-bold text-ink">{item.name}</span>
                <span className="text-xs text-ink-soft" data-price={id}>{`${item.price} ใบ`}</span>
                <span className="text-xs text-ink-soft">{a.note ?? (owned > 0 ? `มี ${owned}` : 'ยังไม่มี')}</span>
                <button
                  type="button"
                  className="px-btn h-11 text-sm font-bold bg-leaf text-ink disabled:opacity-60"
                  disabled={!!a.disabled}
                  aria-label={a.aria}
                  onClick={a.run}
                >
                  {a.label}
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
