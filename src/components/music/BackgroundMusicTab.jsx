import { Play, Pause, Music } from 'lucide-react'

export default function BackgroundMusicTab({ tracks, currentTrackIdx, isPlaying, onTogglePlay, onSelectTrack }) {
  return (
    <>
      <div className="px-4 py-3 border-b-2 border-ink flex items-center justify-between shrink-0">
        <div className="min-w-0 flex-1">
          <p className="pixel-font text-xs text-ink">BACKGROUND MUSIC</p>
          {isPlaying && (
            <p className="thai-font text-xs text-brand-strong mt-0.5 truncate">
              {tracks[currentTrackIdx].title}
            </p>
          )}
        </div>
        <button
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'หยุดเพลง' : 'เล่นเพลง'}
          className="ml-3 shrink-0 px-btn w-9 h-9 rounded-lg bg-brand-soft flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span aria-hidden="true">{isPlaying ? <Pause size={14} strokeWidth={2.5}/> : <Play size={14} strokeWidth={2.5}/>}</span>
        </button>
      </div>
      <div className="overflow-y-auto">
        {tracks.map((t, i) => (
          <button
            key={i}
            onClick={() => onSelectTrack(i)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-left border-b border-ink/10 hover:bg-brand-soft transition-colors ${
              currentTrackIdx === i && isPlaying ? 'bg-brand-soft' : ''
            }`}
          >
            <span className={`thai-font text-xs font-semibold truncate flex-1 ${
              currentTrackIdx === i && isPlaying ? 'text-brand-strong' : 'text-ink'
            }`}>
              {t.title}
            </span>
            {currentTrackIdx === i && isPlaying && (
              <Music size={12} className="shrink-0 text-brand-strong" />
            )}
          </button>
        ))}
      </div>
    </>
  )
}
