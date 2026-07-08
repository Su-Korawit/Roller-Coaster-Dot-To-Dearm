// src/components/music/PlayerSheet.jsx
import Popup from '../ui/Popup'
import { useMusicStore } from '../../stores/useMusicStore'
import SpotifyControls from './SpotifyControls'

export default function PlayerSheet() {
  const closeSheet = useMusicStore((s) => s.closeSheet)
  return (
    <Popup variant="sheet" size="md" onClose={closeSheet}>
      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        <SpotifyControls />
      </div>
    </Popup>
  )
}
