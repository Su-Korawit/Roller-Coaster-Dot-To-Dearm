// prefers-reduced-motion helpers, safe outside a browser.

const QUERY = '(prefers-reduced-motion: reduce)'

function query() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(QUERY)
}

export function prefersReducedMotion() {
  return query()?.matches === true
}

// cb(matches: boolean) on every change. Returns an unsubscribe function.
export function subscribeReducedMotion(cb) {
  const mq = query()
  if (!mq) return () => {}
  const handler = (e) => cb(e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
