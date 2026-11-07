// Window manager state for the OS shell. A window is { id, app, minimized, maximized, pos }.
// List order is stacking order: the last item is on top. All functions are pure.

export const TASKBAR_H = 48          // desktop bottom bar (h-12)
export const WINDOW_W = 960
export const WINDOW_H = 680
const KEEP_VISIBLE = 120             // px of the title bar that must stay on screen while dragging

export function windowSize(vw, vh) {
  return { w: Math.round(Math.min(WINDOW_W, vw * 0.9)), h: Math.round(Math.min(WINDOW_H, (vh - TASKBAR_H) * 0.92)) }
}

export function centredPos(vw, vh) {
  const { w, h } = windowSize(vw, vh)
  return { x: Math.round((vw - w) / 2), y: Math.max(0, Math.round((vh - TASKBAR_H - h) / 2)) }
}

// Keep the title bar reachable: never fully off-screen, never under the taskbar.
export function clampPos(pos, size, vw, vh) {
  const x = Math.min(Math.max(pos.x, KEEP_VISIBLE - size.w), vw - KEEP_VISIBLE)
  const y = Math.min(Math.max(pos.y, 0), Math.max(0, vh - TASKBAR_H - 44))
  return { x, y }
}

export function openWindow(list, app) {
  const found = list.find((w) => w.id === app.id)
  if (!found) return [...list, { id: app.id, app, minimized: false, maximized: false, pos: null }]
  return [...list.filter((w) => w.id !== app.id), { ...found, app, minimized: false }]
}

export function focusWindow(list, id) {
  const found = list.find((w) => w.id === id)
  if (!found) return list
  if (!found.minimized && list[list.length - 1].id === id) return list
  return [...list.filter((w) => w.id !== id), { ...found, minimized: false }]
}

export const closeWindow = (list, id) => list.filter((w) => w.id !== id)

export const minimizeWindow = (list, id) => list.map((w) => (w.id === id ? { ...w, minimized: true } : w))

export const toggleMaximize = (list, id) => list.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w))

export const moveWindow = (list, id, pos) => list.map((w) => (w.id === id ? { ...w, pos } : w))

// The window that has focus: the top-most one that is not minimized.
export function topWindowId(list) {
  for (let i = list.length - 1; i >= 0; i--) if (!list[i].minimized) return list[i].id
  return null
}

// Taskbar chip click: restore a minimized window, minimize the focused one, otherwise focus it.
export function taskbarToggle(list, id) {
  const w = list.find((x) => x.id === id)
  if (!w) return list
  if (w.minimized) return focusWindow(list, id)
  return topWindowId(list) === id ? minimizeWindow(list, id) : focusWindow(list, id)
}
