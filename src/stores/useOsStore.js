import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_WALLPAPER, WALLPAPERS } from '../os/wallpapers'
import { DEFAULT_CROP, normalizeCrop } from '../os/customWallpaper'
import { findAvatar } from '../os/avatars'
import { DEFAULT_INSTALLED, OS_APPS } from '../os/apps'
import {
  layoutTokens, moveToken, dropAction, folderFromDrop, addToFolder, removeFromFolder, renameFolder, fileToken, folderToken,
} from '../os/homeLayout'
import { deleteHomeFile } from '../os/homeFiles'

// OS shell preferences, per device (like a phone's home screen): wallpaper + installed apps.
// The user's own photo is kept in IndexedDB (too big for localStorage); only its crop, aspect and
// brightness live here. `customRev` bumps on every change so views reload the picture.
export const CUSTOM_WALLPAPER = 'custom'

export const useOsStore = create(
  persist(
    (set) => ({
      wallpaperId: DEFAULT_WALLPAPER,
      installed: DEFAULT_INSTALLED,
      customAspect: null,      // null = no photo saved
      customDark: false,
      customCrop: DEFAULT_CROP,
      customRev: 0,
      avatars: {},             // { [uid]: avatarId } — profile picture chosen on this device
      order: [],               // saved Home arrangement (tokens, see homeLayout); repaired on read
      folders: [],             // { id, name, appIds }
      files: [],               // { id, name, size, type } — bytes in IndexedDB (homeFiles)
      cloudUid: null,          // account whose installed apps / layout this device has merged with
      guideSeen: false,        // the welcome tour has been shown on this device

      // Called at login: true the first time this device meets this account (merge instead of overwrite).
      adoptUser: (uid) => {
        if (!uid || useOsStore.getState().cloudUid === uid) return false
        set({ cloudUid: uid })
        return true
      },
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

      setAvatar: (uid, id) =>
        set((s) => {
          if (!uid) return s
          if (id != null && !findAvatar(id)) return s     // unknown id: keep the current choice
          const next = { ...s.avatars }
          if (id == null) delete next[uid]                 // null = back to Google photo / initial
          else next[uid] = id
          return { avatars: next }
        }),

      markGuideSeen: () => set({ guideSeen: true }),
      installApp: (id) => set((s) => (s.installed.includes(id) ? s : { installed: [...s.installed, id] })),
      // Home drag and drop. `onto` null = dropped on empty space (goes to the end); mode 'folder' =
      // dropped on the middle of an app (touch), which makes a folder of the two.
      dropToken: (from, onto, mode = 'reorder') =>
        set((s) => {
          const tokens = layoutTokens({ ...s, apps: OS_APPS })
          const { action } = dropAction({ from, onto, mode })
          if (action === 'folder-add') {
            const folderId = onto.slice(2)
            return { folders: addToFolder(s.folders, folderId, from), order: tokens.filter((t) => t !== from) }
          }
          if (action === 'folder-create') {
            const made = folderFromDrop({ tokens, folders: s.folders, from, onto, id: `${Date.now().toString(36)}` })
            return made ?? s
          }
          const next = moveToken(tokens, from, onto)
          return next === tokens ? s : { order: next }
        }),
      newFolder: () =>
        set((s) => {
          const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`
          return { folders: [...s.folders, { id, name: 'โฟลเดอร์', appIds: [] }], order: [...layoutTokens({ ...s, apps: OS_APPS }), folderToken(id)] }
        }),
      renameFolder: (id, name) => set((s) => ({ folders: renameFolder(s.folders, id, name) })),
      // The app goes back to the Home grid (end of the list).
      takeOutOfFolder: (folderId, appId) =>
        set((s) => ({
          folders: removeFromFolder(s.folders, folderId, appId),
          order: [...layoutTokens({ ...s, apps: OS_APPS }).filter((t) => t !== appId), appId],
        })),
      deleteFolder: (id) => set((s) => ({ folders: s.folders.filter((f) => f.id !== id) })),
      addFile: (meta) =>
        set((s) => ({ files: [...s.files, meta], order: [...layoutTokens({ ...s, apps: OS_APPS }), fileToken(meta.id)] })),
      removeFile: (id) => {
        deleteHomeFile(id).catch(() => {})
        set((s) => ({ files: s.files.filter((f) => f.id !== id) }))
      },
      uninstallApp: (id) =>
        set((s) => ({
          installed: s.installed.filter((x) => x !== id),
          folders: s.folders.map((f) => ({ ...f, appIds: f.appIds.filter((a) => a !== id) })),
        })),
    }),
    {
      name: 'rc-os-store',
      // v1/v2: the core apps come pre-installed (existing devices get them once; removing stays possible).
      // v2: Report joins the pre-installed set.
      // v3: Home layout (order, folders, files).
      version: 3,
      migrate: (state, version) => {
        if (version < 2) {
          const have = Array.isArray(state?.installed) ? state.installed : []
          return { ...state, installed: [...new Set([...DEFAULT_INSTALLED, ...have])] }
        }
        return state
      },
    },
  ),
)
