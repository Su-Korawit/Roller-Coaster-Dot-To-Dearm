// src/components/music/MiniPlayer.jsx
import { Play, Pause, Music } from 'lucide-react'
import { useMusicStore } from '../../stores/useMusicStore'
import { useNowPlayingPoll } from '../../hooks/useNowPlayingPoll'
import { withFreshToken } from '../../hooks/useSpotifyToken'
import { play, pause } from '../../services/spotifyApi'
import { Z_NAV } from '../../constants/zIndex'
import PlayerSheet from './PlayerSheet'

export default function MiniPlayer() {
  useNowPlayingPoll()
  const status = useMusicStore((s) => s.status)
  const track = useMusicStore((s) => s.currentTrack)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const sheetOpen = useMusicStore((s) => s.sheetOpen)
  const openSheet = useMusicStore((s) => s.openSheet)

  const togglePlay = async (e) => {
    e.stopPropagation()
    const wantPlay = !isPlaying
    useMusicStore.getState().setPlaying(wantPlay)
    try { await withFreshToken((t) => (wantPlay ? play(t) : pause(t))) }
    catch (err) { useMusicStore.getState().setPlaying(!wantPlay); useMusicStore.getState().setError(err?.reason ?? 'UNKNOWN') }
  }

  return (
    <>
      {/* Docked just above the floating BottomNavBar (bottom-4 h~64). */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[92%] max-w-md"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)', zIndex: Z_NAV }}
      >
        {status !== 'connected' ? (
          <button
            onClick={openSheet}
            className="w-full px-btn px-slab px-4 py-2.5 flex items-center gap-2 pixel-font text-xs text-brand-strong"
          >
            <Music size={16} /> เชื่อม Spotify
          </button>
        ) : (
          <div
            onClick={openSheet}
            role="button"
            className="w-full px-slab px-3 py-2 flex items-center gap-3"
          >
            {track?.albumArt
              ? <img src={track.albumArt} alt="" className="w-9 h-9 rounded-lg border-2 border-ink" />
              : <div className="w-9 h-9 rounded-lg border-2 border-ink bg-brand-soft flex items-center justify-center"><Music size={16} className="text-brand" /></div>}
            <span className="flex-1 min-w-0">
              <span className="block truncate thai-font text-sm text-ink">{track?.name ?? 'พร้อมเล่น'}</span>
              <span className="block truncate thai-font text-xs text-ink-soft">{track?.artists ?? ''}</span>
            </span>
            <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="text-ink">
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>
          </div>
        )}
      </div>
      {sheetOpen && <PlayerSheet />}
    </>
  )
}
