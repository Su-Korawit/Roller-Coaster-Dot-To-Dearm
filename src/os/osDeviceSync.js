// What follows the account across devices (users/{uid}.osDevice): installed apps, Home arrangement
// (order, folders) and a preset wallpaper. The user's own wallpaper photo and dropped files stay on
// the device they were added on (bytes live in IndexedDB), so they are never part of this.
// Pure functions, never throw on malformed cloud data.
import { WALLPAPERS } from './wallpapers'
import { OS_APPS } from './apps'

export const CUSTOM_WALLPAPER_ID = 'custom'

const isStr = (v) => typeof v === 'string' && v !== ''
const strings = (v) => (Array.isArray(v) ? v.filter(isStr) : [])

export function toOsDevice(state) {
  return {
    installed: state.installed ?? [],
    order: state.order ?? [],
    folders: state.folders ?? [],
    wallpaperId: state.wallpaperId === CUSTOM_WALLPAPER_ID ? null : state.wallpaperId ?? null,
  }
}

// Cloud data -> a safe { installed, order, folders, wallpaperId|null } or null when there is none.
export function cleanOsDevice(data, apps = OS_APPS) {
  if (!data || typeof data !== 'object') return null
  const installable = new Set(apps.filter((a) => a.installable).map((a) => a.id))
  const folders = (Array.isArray(data.folders) ? data.folders : [])
    .filter((f) => f && isStr(f.id))
    .map((f) => ({ id: f.id, name: typeof f.name === 'string' ? f.name : 'โฟลเดอร์', appIds: strings(f.appIds).filter((id) => installable.has(id)) }))
  return {
    installed: [...new Set(strings(data.installed))].filter((id) => installable.has(id)),
    order: strings(data.order),
    folders,
    wallpaperId: WALLPAPERS.some((w) => w.id === data.wallpaperId) ? data.wallpaperId : null,
  }
}

// Store patch when the cloud copy simply wins (a device that already adopted this account).
export function applyCloud(local, cloud) {
  return { installed: cloud.installed, order: cloud.order, folders: cloud.folders, ...(cloud.wallpaperId ? { wallpaperId: cloud.wallpaperId } : {}) }
}

// First time this device meets this account: keep what it has AND what the account has, so installing
// on a phone never loses the apps the desktop installed (and vice versa). Cloud arrangement leads.
export function mergeFirstAdopt(local, cloud) {
  const installed = [...new Set([...cloud.installed, ...(local.installed ?? [])])]
  const folders = cloud.folders.length > 0 ? cloud.folders : local.folders ?? []
  return {
    installed,
    order: cloud.order.length > 0 ? cloud.order : local.order ?? [],
    folders,
    ...(cloud.wallpaperId ? { wallpaperId: cloud.wallpaperId } : {}),
  }
}

export function sameDevice(a, b) {
  return JSON.stringify(toOsDevice(a)) === JSON.stringify(toOsDevice(b))
}
