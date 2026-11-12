import OsSheet from './OsSheet'
import WallpaperPicker from './WallpaperPicker'

export default function WallpaperSheet({ onClose }) {
  return (
    <OsSheet title="เปลี่ยนวอลเปเปอร์" onClose={onClose} wide>
      <WallpaperPicker />
    </OsSheet>
  )
}
