// Decides when a running focus session has been abandoned, from timestamps only: background
// tabs throttle timers, so counting ticks would be wrong. Strict allows 10 s hidden,
// Flexible 2 min. Fires onWither at most once.
const LIMIT_MS = { strict: 10000, flexible: 120000 }

export function createFocusGuard({ mode, now = Date.now, onWither }) {
  const limit = LIMIT_MS[mode] ?? LIMIT_MS.flexible
  let hiddenAt = null
  let withered = false

  const check = () => {
    if (withered || hiddenAt === null) return
    if (now() - hiddenAt > limit) {
      withered = true
      onWither(mode === 'strict' ? 'hidden' : 'away')
    }
  }

  return {
    onHidden() {
      if (hiddenAt === null) hiddenAt = now()
    },
    onVisible() {
      check()
      hiddenAt = null
    },
    tick: check,
  }
}
