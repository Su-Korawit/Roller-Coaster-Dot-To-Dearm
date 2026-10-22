// A tiny event line from the places where the student does things (buy, place, warp, practice)
// to the Guide. Producers only import this file, so they never depend on the guide store.
const handlers = new Set()

export function emitGuide(event) {
  for (const h of handlers) h(event)
}

export function onGuideEvent(handler) {
  handlers.add(handler)
  return () => handlers.delete(handler)
}
