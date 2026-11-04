import ItemSlot from '../ui/ItemSlot'
import { HOTBAR_GAP } from '../../constants/hotbarLayout'
import { Z_NAV } from '../../constants/zIndex'
import { useRoomUiStore } from '../../stores/useRoomUiStore'
import { usePopupStore } from '../../stores/usePopupStore'
import { useGuideStore } from '../../stores/useGuideStore'

// The guest's reduced hotbar on /openhouse: Plan, Guide, Settings (the guest Bag) and sign-in.
// Same look as the app hotbar; slots needing an account (focus, shop, warp...) are simply absent.
export default function GuestHotbar({ onSignIn }) {
  const sheet = useRoomUiStore((s) => s.sheet)
  const popup = usePopupStore((s) => s.activePopup)

  const togglePlan = () => {
    const ui = useRoomUiStore.getState()
    if (ui.sheet === 'plan') ui.close()
    else ui.open('plan')
  }
  const toggleSettings = () => {
    const pop = usePopupStore.getState()
    if (pop.activePopup === 'settings') pop.close()
    else pop.open('settings')
  }

  return (
    <nav
      aria-label="แถบไอเทม"
      className="absolute left-1/2 -translate-x-1/2 w-[70%] max-w-xs"
      style={{ bottom: HOTBAR_GAP, marginBottom: 'env(safe-area-inset-bottom)', zIndex: Z_NAV }}
    >
      <div className="px-slab p-1.5 grid grid-cols-4 gap-1 items-center">
        <ItemSlot iconName="plan" label="แผน TCAS" selected={sheet === 'plan'} data-guide="slot-plan" onClick={togglePlan} />
        <ItemSlot iconName="guide" label="คู่มือ" onClick={() => useGuideStore.getState().replay()} />
        <ItemSlot iconName="bag" label="ตั้งค่า" selected={popup === 'settings'} onClick={toggleSettings} />
        <ItemSlot iconName="wardrobe" label="เข้าสู่ระบบ" onClick={onSignIn} />
      </div>
    </nav>
  )
}
