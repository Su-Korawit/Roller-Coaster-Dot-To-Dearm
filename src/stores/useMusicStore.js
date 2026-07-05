// src/stores/useMusicStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const disconnectedSlice = {
  status: 'disconnected',
  accessToken: null,
  expiresAt: null,
  spotifyUserId: null,
  isPlaying: false,
  currentTrack: null,
  progressMs: 0,
  device: null,
  devices: [],
  sheetOpen: false,
  searchQuery: '',
  searchResults: [],
  playlists: [],
  activePlaylistTracks: [],
  lastError: null,
}

export const useMusicStore = create(
  persist(
    (set) => ({
      ...disconnectedSlice,
      volumePercent: 100,

      setConnecting: () => set({ status: 'connecting' }),
      setTokens: ({ accessToken, expiresAt, spotifyUserId }) =>
        set((s) => ({ status: 'connected', accessToken, expiresAt, spotifyUserId: spotifyUserId ?? s.spotifyUserId })),
      disconnect: () => set({ ...disconnectedSlice }),

      applyPlayback: (p) =>
        set(p
          ? { isPlaying: p.isPlaying, currentTrack: p.track, progressMs: p.progressMs, device: p.device, volumePercent: p.volumePercent }
          : { isPlaying: false, currentTrack: null, progressMs: 0 }),
      setPlaying: (isPlaying) => set({ isPlaying }),
      setDevices: (devices) => set({ devices }),
      setVolumePercent: (volumePercent) => set({ volumePercent }),

      openSheet: () => set({ sheetOpen: true }),
      closeSheet: () => set({ sheetOpen: false }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchResults: (searchResults) => set({ searchResults }),
      setPlaylists: (playlists) => set({ playlists }),
      setActivePlaylistTracks: (activePlaylistTracks) => set({ activePlaylistTracks }),
      setError: (lastError) => set({ lastError }),
    }),
    { name: 'rc-music-store', partialize: (s) => ({ volumePercent: s.volumePercent }) },
  ),
)
