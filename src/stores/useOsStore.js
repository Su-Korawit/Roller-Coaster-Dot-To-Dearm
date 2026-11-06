import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_WALLPAPER, WALLPAPERS } from '../os/wallpapers'
import { DEFAULT_CROP, normalizeCrop } from '../os/customWallpaper'

// OS shell preferences, per device (like a phone's home screen): wallpaper + installed apps.
// The user's own photo is kept in IndexedDB (too big for localStorage); only its crop, aspect and
// brightness live here. `customRev` bumps on every change so views reload the picture.
export const CUSTOM_WALLPAPER = 'custom'

export const useOsStore = create(
  persist(
    (set) => ({
      wallpaperId: DEFAULT_WALLPAPER,
      installed: [],
      customAspect: null,      // null = no photo saved
      customDark: false,
      customCrop: DEFAULT_CROP,
      customRev: 0,

      setWallpaper: (id) =>
        set((s) => {
          if (id === CUSTOM_WALLPAPER) return s.customAspect ? { wallpaperId: id } : s
          return WALLPAPERS.some((w) => w.id === id) ? { wallpaperId: id } : s
        }),
      // A new photo was saved to IndexedDB: select it with a centred, un-zoomed crop.
      setCustomWallpaper: ({ aspect, dark }) =>
        set((s) => ({
          wallpaperId: CUSTOM_WALLPAPER,
          customAspect: aspect,
          customDark: !!dark,
          customCrop: DEFAULT_CROP,
          customRev: s.customRev + 1,
        })),
      setCustomCrop: (crop) => set({ customCrop: normalizeCrop(crop) }),
      clearCustomWallpaper: () =>
        set((s) => ({
          wallpaperId: s.wallpaperId === CUSTOM_WALLPAPER ? DEFAULT_WALLPAPER : s.wallpaperId,
          customAspect: null,
          customDark: false,
          customCrop: DEFAULT_CROP,
          customRev: s.customRev + 1,
        })),

      installApp: (id) => set((s) => (s.installed.includes(id) ? s : { installed: [...s.installed, id] })),
      uninstallApp: (id) => set((s) => ({ installed: s.installed.filter((x) => x !== id) })),
    }),
    { name: 'rc-os-store' },
  ),
)
