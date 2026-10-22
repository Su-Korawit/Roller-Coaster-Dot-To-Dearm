// Debounced saving of the room layout through the saveRoomLayout callable (Firestore rules
// cannot validate a layout, so clients never write rooms/{uid} directly). Reuses the
// Studio autosaver: merged edits, backoff retry after a failure, flush on demand.
import { createAutosaver } from '../content/autosave'

export function createRoomSync({ save, getLayout, delayMs = 2000, onStatus }) {
  // The save always sends the latest layout, so the pushed patch only marks "dirty".
  // Timers are looked up when used (not captured at import), so tests can fake them.
  const saver = createAutosaver({
    save: () => save(getLayout()),
    delayMs,
    onStatus,
    setTimeoutFn: (fn, ms) => setTimeout(fn, ms),
    clearTimeoutFn: (id) => clearTimeout(id),
  })
  return {
    schedule: () => saver.push({ dirty: true }),
    flush: () => saver.flush(),
    cancel: () => saver.cancel(),
    get status() {
      return saver.status
    },
  }
}

// Make sure the last edit is not lost when the tab is hidden or closed.
export function flushOnLeave(sync, doc = typeof document === 'undefined' ? null : document, win = typeof window === 'undefined' ? null : window) {
  const onHide = () => {
    if (!doc || doc.visibilityState === 'hidden') sync.flush()
  }
  doc?.addEventListener('visibilitychange', onHide)
  win?.addEventListener('pagehide', onHide)
  return () => {
    doc?.removeEventListener('visibilitychange', onHide)
    win?.removeEventListener('pagehide', onHide)
  }
}
