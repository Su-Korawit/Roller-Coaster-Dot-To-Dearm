import { useCallback } from 'react'
import ItemSlot from '../ui/ItemSlot'
import { ALL_ITEMS } from '../../constants/hotbarItems'
import { HOTBAR_GAP } from '../../constants/hotbarLayout'
import { Z_NAV } from '../../constants/zIndex'
import { useHotbarStore } from '../../stores/useHotbarStore'
import { useRoomUiStore } from '../../stores/useRoomUiStore'
import { useFocusStore } from '../../stores/useFocusStore'
import { useTaskStore } from '../../stores/useTaskStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useFxStore } from '../../stores/useFxStore'
import { usePopupStore } from '../../stores/usePopupStore'
import { useHotbarKeys } from '../../hooks/useHotbarKeys'
import { activateItem } from '../../lib/activateItem'
import { dueTodayCount } from '../../lib/hotbarBadges'

const NEEDS_ACCOUNT = ['focus', 'shop']

// The seven usable items plus the fixed Bag button. HomePage supplies `ctx` so the hotbar never
// knows how panels are rendered: { openView(view), openPopup(id), openSheet(name), activeView }.
export default function Hotbar({ ctx }) {
  const slots = useHotbarStore((s) => s.slots)
  const sheet = useRoomUiStore((s) => s.sheet)
  const signedIn = useAuthStore((s) => !!s.user)
  const dueToday = useTaskStore((s) => dueTodayCount(s.tasks))

  const activate = useCallback((id) => {
    const item = ALL_ITEMS[id]
    if (!item) return
    if (NEEDS_ACCOUNT.includes(id) && !signedIn) {
      useFxStore.getState().push({ kind: 'info', text: 'ต้องเข้าสู่ระบบก่อนถึงจะใช้ได้' })
      return
    }
    if (id === 'focus' && useFocusStore.getState().status === 'running') {
      document.getElementById('focus-hud')?.focus()
      return
    }
    activateItem(item, ctx)
  }, [ctx, signedIn])

  const onEscape = useCallback(() => {
    if (useRoomUiStore.getState().sheet) useRoomUiStore.getState().close()
    // The popup's own close logic (not a bare store reset) so the calendar restores Home
    // and the daily check-in stays until it is answered.
    else if (usePopupStore.getState().activePopup) ctx.closeTopPopup?.()
  }, [ctx])

  useHotbarKeys({
    onSlot: (i) => activate(slots[i]),
    onBag: () => ctx.openSheet('bag'),
    onEscape,
  })

  const badgeFor = (id) => (id === 'tasks' ? dueToday : 0)
  const isSelected = (item) => (item.sheet ? sheet === item.sheet : item.view ? ctx.activeView === item.view : false)

  return (
    <nav
      aria-label="แถบไอเทม"
      className="absolute left-1/2 -translate-x-1/2 w-[96%] max-w-md"
      style={{ bottom: HOTBAR_GAP, marginBottom: 'env(safe-area-inset-bottom)', zIndex: Z_NAV }}
    >
      <div className="px-slab p-1.5 grid grid-cols-8 gap-1 items-center">
        {slots.map((id, i) => {
          const item = ALL_ITEMS[id]
          return (
            <ItemSlot
              key={id}
              iconName={item.icon}
              label={item.labelTh}
              hotkey={String(i + 1)}
              selected={isSelected(item)}
              badge={badgeFor(id)}
              data-guide={`slot-${id}`}
              onClick={() => activate(id)}
            />
          )
        })}
        <ItemSlot
          iconName="bag"
          label="กระเป๋า"
          hotkey="B"
          selected={sheet === 'bag'}
          data-guide="bag"
          onClick={() => ctx.openSheet('bag')}
        />
      </div>
    </nav>
  )
}
