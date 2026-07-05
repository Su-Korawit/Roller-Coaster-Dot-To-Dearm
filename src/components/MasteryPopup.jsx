import { useState } from 'react'
import Popup from './ui/Popup'
import PanelHeader from './ui/PanelHeader'
import MasteryRoundSection from './mastery/MasteryRoundSection'
import MasteryTrackDetail from './mastery/MasteryTrackDetail'
import { useMasteryStore } from '../stores/useMasteryStore'

export default function MasteryPopup({ onClose }) {
  const [view, setView] = useState('entry')
  const activeTrackId = useMasteryStore((s) => s.activeTrackId)
  const setActiveTrack = useMasteryStore((s) => s.setActiveTrack)
  const tracks = useMasteryStore((s) => s.tracks)

  function handleOpen(id) {
    setActiveTrack(id)
    setView('detail')
  }

  function handleBack() {
    setActiveTrack(null)
    setView('entry')
  }

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <PanelHeader title="Mastery" onClose={onClose} />
      <div className="overflow-y-auto flex-1 px-3 pb-4">
        {view === 'detail' && activeTrackId ? (
          <MasteryTrackDetail trackId={activeTrackId} onBack={handleBack} />
        ) : (
          <div className="space-y-6 py-2">
            {tracks.length === 0 ? (
              <p className="thai-font text-center text-sm text-gray-400">
                ยังไม่มีแทร็ก — เพิ่มจากโปรไฟล์หรือ AI เร็วๆ นี้
              </p>
            ) : (
              <>
                <MasteryRoundSection round="portfolio" label="Portfolio" onOpen={handleOpen} />
                <MasteryRoundSection round="admission" label="Admission" onOpen={handleOpen} />
              </>
            )}
          </div>
        )}
      </div>
    </Popup>
  )
}
