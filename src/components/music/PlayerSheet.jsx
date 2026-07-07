// src/components/music/PlayerSheet.jsx
import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import Popup from '../ui/Popup'
import { useMusicStore } from '../../stores/useMusicStore'
import { withFreshToken } from '../../hooks/useSpotifyToken'
import { searchTracks, play, pause, next, previous } from '../../services/spotifyApi'
import { startConnect } from '../../services/spotifyConnect'
import PlaylistBrowser from './PlaylistBrowser'
import DevicePicker from './DevicePicker'

export default function PlayerSheet() {
  const status = useMusicStore((s) => s.status)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const results = useMusicStore((s) => s.searchResults)
  const lastError = useMusicStore((s) => s.lastError)
  const closeSheet = useMusicStore((s) => s.closeSheet)
  const [query, setQuery] = useState('')
  const [view, setView] = useState('search')
  const debounceRef = useRef()

  useEffect(() => {
    if (status !== 'connected') return
    if (!query.trim()) { useMusicStore.getState().setSearchResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const tracks = await withFreshToken((t) => searchTracks(t, query.trim()))
        useMusicStore.getState().setSearchResults(tracks)
      } catch (e) { useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, status])

  const onPlayTrack = async (track) => {
    useMusicStore.getState().setPlaying(true)
    try { await withFreshToken((t) => play(t, { uris: [track.uri] })) }
    catch (e) { useMusicStore.getState().setPlaying(false); useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const control = (fn) => async () => {
    try { await withFreshToken((t) => fn(t)) }
    catch (e) { useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const togglePlay = async () => {
    const wantPlay = !isPlaying
    useMusicStore.getState().setPlaying(wantPlay)
    try { await withFreshToken((t) => (wantPlay ? play(t) : pause(t))) }
    catch (e) { useMusicStore.getState().setPlaying(!wantPlay); useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  return (
    <Popup variant="sheet" size="md" onClose={closeSheet}>
      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        {status !== 'connected' ? (
          <button
            onClick={() => startConnect()}
            className="pixel-font text-[10px] text-white bg-brand rounded-2xl py-3"
          >
            เชื่อม Spotify
          </button>
        ) : (
          <>
            <DevicePicker />

            <div className="flex gap-2">
              <button
                onClick={() => setView('search')}
                className={`pixel-font text-[9px] rounded-full px-3 py-1.5 ${view === 'search' ? 'bg-brand text-white' : 'text-brand bg-brand-soft'}`}
              >
                ค้นหา
              </button>
              <button
                onClick={() => setView('playlists')}
                className={`pixel-font text-[9px] rounded-full px-3 py-1.5 ${view === 'playlists' ? 'bg-brand text-white' : 'text-brand bg-brand-soft'}`}
              >
                เพลย์ลิสต์
              </button>
            </div>

            {lastError === 'NO_ACTIVE_DEVICE' && (
              <p className="thai-font text-xs text-accent-pink">เปิดแอป Spotify ในเครื่องใดเครื่องหนึ่งก่อน แล้วลองใหม่</p>
            )}
            {lastError === 'PREMIUM_REQUIRED' && (
              <p className="thai-font text-xs text-accent-pink">ต้องใช้ Spotify Premium เพื่อควบคุมการเล่น</p>
            )}
            {lastError === 'SPOTIFY_NOT_CONFIGURED' && (
              <p className="thai-font text-xs text-accent-pink">ยังไม่ได้ตั้งค่า Spotify — ติดต่อทีมพัฒนา (VITE_SPOTIFY_CLIENT_ID)</p>
            )}
            {lastError === 'PLAYLIST_ACCESS_DENIED' && (
              <p className="thai-font text-xs text-accent-pink">เปิดได้เฉพาะเพลย์ลิสต์ที่คุณเป็นเจ้าของหรือผู้ร่วมแก้ไข</p>
            )}

            {view === 'search' ? (
              <>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาเพลง…"
                  className="w-full rounded-2xl border border-brand-soft px-4 py-2 thai-font"
                />
                <ul className="flex flex-col divide-y divide-brand-soft">
                  {results.map((t) => (
                    <li key={t.id}>
                      <button onClick={() => onPlayTrack(t)} className="w-full text-left py-2 flex items-center gap-3">
                        {t.albumArt && <img src={t.albumArt} alt="" className="w-10 h-10 rounded" />}
                        <span className="flex flex-col min-w-0">
                          <span className="thai-font text-sm text-ink truncate">{t.name}</span>
                          <span className="thai-font text-xs text-ink-soft truncate">{t.artists}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <PlaylistBrowser />
            )}

            <div className="flex items-center justify-center gap-6 pt-2">
              <button onClick={control(previous)} aria-label="Previous"><SkipBack /></button>
              <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause /> : <Play />}</button>
              <button onClick={control(next)} aria-label="Next"><SkipForward /></button>
            </div>
          </>
        )}
      </div>
    </Popup>
  )
}
