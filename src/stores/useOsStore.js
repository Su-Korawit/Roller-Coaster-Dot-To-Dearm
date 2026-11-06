import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_WALLPAPER, WALLPAPERS } from '../os/wallpapers'

// OS shell preferences, per device (like a phone's home screen): wallpaper + installed apps.
export const useOsStore = create(
  persist(
    (set) => ({
      wallpaperId: DEFAULT_WALLPAPER,
      installed: [],

      setWallpaper: (id) => {
        if (!WALLPAPERS.some((w) => w.id === id)) return
        set({ wallpaperId: id })
      },
      installApp: (id) => set((s) => (s.installed.includes(id) ? s : { installed: [...s.installed, id] })),
      uninstallApp: (id) => set((s) => ({ installed: s.installed.filter((x) => x !== id) })),
    }),
    { name: 'rc-os-store' },
  ),
)
