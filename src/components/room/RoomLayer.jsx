import { useEffect } from 'react'
import { roomSync } from '../../stores/useRoomStore'
import { flushOnLeave } from '../../lib/roomSync'
import FocusSetupSheet from './FocusSetupSheet'
import ShopSheet from './ShopSheet'
import FocusHud from './FocusHud'
import FocusCompleteScreen from './FocusCompleteScreen'
import DecorateBar from './DecorateBar'
import { useAuthStore } from '../../stores/useAuthStore'
import { useFocusStore } from '../../stores/useFocusStore'
import { useRoomUiStore } from '../../stores/useRoomUiStore'
import { Z_HUD } from '../../constants/zIndex'

// Everything the study room adds on top of the game canvas. The two buttons are temporary entry
// points until the Hotbar sub-project replaces them (the desk seat also opens the focus setup).
export default function RoomLayer() {
  const user = useAuthStore((s) => s.user)
  const focusStatus = useFocusStore((s) => s.status)
  const sheet = useRoomUiStore((s) => s.sheet)
  const open = useRoomUiStore((s) => s.open)
  const close = useRoomUiStore((s) => s.close)

  // The last decorate edit must not be lost when the tab is hidden or closed.
  useEffect(() => flushOnLeave(roomSync), [])

  return (
    <>
      {user && (
        <div className="absolute left-4 bottom-28 flex flex-col gap-2" style={{ zIndex: Z_HUD }}>
          <button type="button" className="px-btn h-11 px-4 text-sm font-bold bg-paper text-ink" onClick={() => open('focus')}>โฟกัส</button>
          <button type="button" className="px-btn h-11 px-4 text-sm font-bold bg-paper text-ink" onClick={() => open('shop')}>ร้านค้า</button>
        </div>
      )}
      <FocusHud />
      <DecorateBar />
      {sheet === 'focus' && focusStatus === 'idle' && <FocusSetupSheet onClose={close} />}
      {sheet === 'shop' && <ShopSheet onClose={close} />}
      <FocusCompleteScreen />
    </>
  )
}
