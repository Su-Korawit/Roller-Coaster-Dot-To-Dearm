// src/components/music/PlaylistBrowser.jsx
import { useEffect, useState } from 'react'
import { ChevronLeft, Play } from 'lucide-react'
import { useMusicStore } from '../../stores/useMusicStore'
import { withFreshToken } from '../../hooks/useSpotifyToken'
import { getMyPlaylists, getPlaylistTracks, play } from '../../services/spotifyApi'

export default function PlaylistBrowser() {
  const playlists = useMusicStore((s) => s.playlists)
  const tracks = useMusicStore((s) => s.activePlaylistTracks)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let cancelled = false
    withFreshToken((t) => getMyPlaylists(t))
      .then((pls) => { if (!cancelled) useMusicStore.getState().setPlaylists(pls) })
      .catch((e) => useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN'))
    return () => { cancelled = true }
  }, [])

  const openPlaylist = async (pl) => {
    setOpenId(pl.id)
    useMusicStore.getState().setActivePlaylistTracks([])
    try {
      const list = await withFreshToken((t) => getPlaylistTracks(t, pl.id))
      useMusicStore.getState().setActivePlaylistTracks(list)
    } catch (e) { useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const playAll = async (pl) => {
    useMusicStore.getState().setPlaying(true)
    try { await withFreshToken((t) => play(t, { contextUri: pl.uri })) }
    catch (e) { useMusicStore.getState().setPlaying(false); useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const playTrack = async (track) => {
    useMusicStore.getState().setPlaying(true)
    try { await withFreshToken((t) => play(t, { uris: [track.uri] })) }
    catch (e) { useMusicStore.getState().setPlaying(false); useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const openPl = playlists.find((p) => p.id === openId)

  if (openPl) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setOpenId(null)} aria-label="Back" className="text-brand"><ChevronLeft /></button>
          <span className="thai-font text-sm text-ink flex-1 truncate">{openPl.name}</span>
          <button
            onClick={() => playAll(openPl)}
            aria-label="เล่นทั้งหมด"
            className="pixel-font text-[9px] text-white bg-brand rounded-full px-3 py-1.5 flex items-center gap-1"
          >
            <Play size={12} /> เล่นทั้งหมด
          </button>
        </div>
        <ul className="flex flex-col divide-y divide-brand-soft">
          {tracks.map((t) => (
            <li key={t.id}>
              <button onClick={() => playTrack(t)} className="w-full text-left py-2 flex items-center gap-3">
                {t.albumArt && <img src={t.albumArt} alt="" className="w-10 h-10 rounded" />}
                <span className="flex flex-col min-w-0">
                  <span className="thai-font text-sm text-ink truncate">{t.name}</span>
                  <span className="thai-font text-xs text-ink-soft truncate">{t.artists}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-3">
      {playlists.map((pl) => (
        <li key={pl.id}>
          <button onClick={() => openPlaylist(pl)} className="w-full text-left flex flex-col gap-1">
            {pl.imageUrl
              ? <img src={pl.imageUrl} alt="" className="w-full aspect-square rounded-lg object-cover" />
              : <div className="w-full aspect-square rounded-lg bg-brand-soft" />}
            <span className="thai-font text-xs text-ink truncate">{pl.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
