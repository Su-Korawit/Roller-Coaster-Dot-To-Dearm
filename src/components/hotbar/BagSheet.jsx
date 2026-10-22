import { useState } from 'react'
import Popup from '../ui/Popup'
import AtlasIcon from '../ui/AtlasIcon'
import { ALL_ITEMS } from '../../constants/hotbarItems'
import { ADMIN_UID } from '../../constants/admin'
import { useHotbarStore } from '../../stores/useHotbarStore'
import { useUserStore } from '../../stores/useUserStore'
import { useAuthStore } from '../../stores/useAuthStore'

// Items a student may see in the Bag, in display order. Hidden by the Interface settings,
// not-ready items never appear.
function visibleItems({ uiVisibility, uid }) {
  return Object.values(ALL_ITEMS).filter((item) => {
    if (!item.ready) return false
    if (item.id === 'news' && uiVisibility?.newsButton === false) return false
    if (item.id === 'adminChat' && (!uid || uid === ADMIN_UID || uiVisibility?.contactFab === false)) return false
    return true
  })
}

// Everything the hotbar can hold plus the tools that live only here. Tap an item to use it;
// "ใส่ในช่อง" arms it and a tap on a slot of the bar preview puts it there (no dragging needed,
// so it works with a keyboard and on touch).
export default function BagSheet({ onClose, ctx }) {
  const slots = useHotbarStore((s) => s.slots)
  const assign = useHotbarStore((s) => s.assign)
  const uiVisibility = useUserStore((s) => s.uiVisibility)
  const uid = useAuthStore((s) => s.user?.uid ?? null)
  const [armed, setArmed] = useState(null)

  const items = visibleItems({ uiVisibility, uid })

  const use = (item) => {
    onClose()
    if (item.id === 'adminChat') ctx.openAdminChat?.()
    else if (item.sheet) ctx.openSheet(item.sheet)
    else if (item.popup) ctx.openPopup(item.popup)
    else ctx.openView(item.view)
  }

  const put = (slot) => {
    if (!armed) return
    assign(armed, slot)
    setArmed(null)
  }

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div className="p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        <h2 className="pixel-font text-lg text-ink">กระเป๋า</h2>

        <section aria-label="แถบไอเทม" className="flex flex-col gap-2">
          <p className="thai-font text-sm text-ink-soft">
            {armed ? `เลือกช่องที่จะวาง “${ALL_ITEMS[armed].labelTh}”` : 'แถบไอเทมของคุณ'}
          </p>
          <div className="grid grid-cols-7 gap-1">
            {slots.map((id, i) => (
              <button
                key={id}
                type="button"
                aria-label={`ช่อง ${i + 1}: ${ALL_ITEMS[id].labelTh}`}
                disabled={!armed}
                onClick={() => put(i)}
                className={`aspect-square grid place-items-center rounded-slot border-2 border-hairline bg-mist
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${armed ? 'border-line bg-paper' : 'opacity-90'}`}
              >
                <AtlasIcon name={ALL_ITEMS[id].icon} scale={1} />
              </button>
            ))}
          </div>
        </section>

        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const slot = slots.indexOf(item.id)
            return (
              <li key={item.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => use(item)}
                  className="flex-1 min-w-0 flex items-center gap-3 px-btn h-12 px-3 bg-paper text-ink text-left"
                >
                  <AtlasIcon name={item.icon} scale={1} />
                  <span className="thai-font text-sm font-bold truncate">{item.labelTh}</span>
                  {item.id === 'news' && ctx.newsUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-danger border border-ink" aria-label="ใหม่" />
                  )}
                  {slot >= 0 && <span className="ml-auto text-xs text-ink-soft">{`บนแถบ ช่อง ${slot + 1}`}</span>}
                </button>
                <button
                  type="button"
                  aria-label={`ใส่ ${item.labelTh} ในช่อง`}
                  aria-pressed={armed === item.id}
                  onClick={() => setArmed(armed === item.id ? null : item.id)}
                  className={`px-btn h-12 px-3 text-xs font-bold ${armed === item.id ? 'bg-ink text-white' : 'bg-mist text-ink'}`}
                >
                  ใส่ในช่อง
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Popup>
  )
}
