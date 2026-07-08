import { useState } from 'react'
import { X } from 'lucide-react'
import { Z_NAV } from '../../constants/zIndex'
import BackgroundMusicTab from './BackgroundMusicTab'
import SpotifyControls from './SpotifyControls'

export default function MusicPanel({ onClose, tracks, currentTrackIdx, isPlaying, onTogglePlay, onSelectTrack }) {
  const [tab, setTab] = useState('background')
  return (
    <div
      className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[90%] max-w-sm md:max-w-md neo-card flex flex-col overflow-hidden max-h-[65vh]"
      style={{ zIndex: Z_NAV }}
    >
      <div className="flex items-center border-b-2 border-ink shrink-0">
        {[{ key: 'background', label: 'Background' }, { key: 'spotify', label: 'Spotify' }].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 pixel-font text-[9px] ${tab === t.key ? 'text-brand-strong bg-brand-soft' : 'text-ink-soft'}`}
          >
            {t.label}
          </button>
        ))}
        <button onClick={onClose} aria-label="ปิด" className="px-3 text-ink-soft hover:text-ink">
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
      <div className="overflow-y-auto">
        {tab === 'background' ? (
          <BackgroundMusicTab
            tracks={tracks}
            currentTrackIdx={currentTrackIdx}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            onSelectTrack={onSelectTrack}
          />
        ) : (
          <div className="p-4"><SpotifyControls /></div>
        )}
      </div>
    </div>
  )
}
