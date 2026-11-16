// Shortcuts between apps that belong together. Kept small on purpose: at most MAX_SHORTCUTS per app,
// only apps the user actually has (built-in or installed), shown as two quiet icons in the window header.
export const MAX_SHORTCUTS = 2

export const RELATED = {
  goal: ['countdown', 'checklist'],
  countdown: ['goal', 'checklist'],
  checklist: ['goal', 'countdown'],
  habit: ['calendar', 'countdown'],
  calendar: ['habit', 'countdown'],
  secretary: ['habit', 'goal'],
  reading: ['habit'],
  mood: ['habit'],
  community: ['chat'],
  chat: ['community'],
}

// App ids to offer next to `appId`, in order. `has(id)` says whether the user can open that app.
export function shortcutsFor(appId, has, related = RELATED) {
  return (related[appId] ?? []).filter((id) => id !== appId && has(id)).slice(0, MAX_SHORTCUTS)
}
