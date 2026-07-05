import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export function trackProgress(track) {
  const milestones = track?.milestones ?? []
  const done = milestones.filter((m) => m.done).length
  return { done, total: milestones.length }
}

export const useMasteryStore = create(
  persist(
    (set) => ({
      tracks: [],
      activeTrackId: null,

      setActiveTrack: (id) => set({ activeTrackId: id }),

      addTrack: (track) =>
        set((s) => ({ tracks: [...s.tracks, track] })),

      toggleMilestone: (trackId, milestoneId) =>
        set((s) => ({
          tracks: s.tracks.map((t) =>
            t.id !== trackId
              ? t
              : {
                  ...t,
                  milestones: t.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, done: !m.done } : m,
                  ),
                },
          ),
        })),

      resetMastery: () => set({ tracks: [], activeTrackId: null }),
    }),
    { name: 'rc-mastery-store' },
  ),
)
