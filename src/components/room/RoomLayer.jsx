import { useEffect } from 'react'
import { roomSync } from '../../stores/useRoomStore'
import { flushOnLeave } from '../../lib/roomSync'
import FocusSetupSheet from './FocusSetupSheet'
import ShopSheet from './ShopSheet'
import FocusHud from './FocusHud'
import FocusCompleteScreen from './FocusCompleteScreen'
import DecorateBar from './DecorateBar'
import { useFocusStore } from '../../stores/useFocusStore'
import { useRoomUiStore } from '../../stores/useRoomUiStore'

// Everything the study room adds on top of the game canvas: the focus and shop sheets (opened
// from the hotbar or the desk seat), the HUD, the decorate bar and the completion screen.
export default function RoomLayer() {
  const focusStatus = useFocusStore((s) => s.status)
  const sheet = useRoomUiStore((s) => s.sheet)
  const close = useRoomUiStore((s) => s.close)

  // The last decorate edit must not be lost when the tab is hidden or closed.
  useEffect(() => flushOnLeave(roomSync), [])

  return (
    <>
      <FocusHud />
      <DecorateBar />
      {sheet === 'focus' && focusStatus === 'idle' && <FocusSetupSheet onClose={close} />}
      {sheet === 'shop' && <ShopSheet onClose={close} />}
      <FocusCompleteScreen />
    </>
  )
}
