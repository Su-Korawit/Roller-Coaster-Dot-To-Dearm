import Popup from './ui/Popup'
import PanelHeader from './ui/PanelHeader'
import MasteryTracks from './profile/MasteryTracks'

export default function MasteryPopup({ onClose }) {
  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <PanelHeader title="Mastery" onClose={onClose} />
      <div className="overflow-y-auto flex-1 px-3 pb-4">
        <MasteryTracks />
      </div>
    </Popup>
  )
}
