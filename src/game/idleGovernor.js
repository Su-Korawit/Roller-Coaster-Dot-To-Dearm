// ============================================================================
// idleGovernor.js — detects "no user input for N ms" and fires edge callbacks.
// Pure (no DOM, no Phaser): the caller feeds it input via touch() and drives it
// with tick(); GameCanvas uses it to drop Phaser to a low FPS while AFK.
// ============================================================================

export const IDLE_FPS = 10
export const GOVERNOR_IDLE_AFTER_MS = 60_000

export function createIdleGovernor({ idleAfterMs = GOVERNOR_IDLE_AFTER_MS, onIdle, onActive, now = Date.now } = {}) {
  let lastInput = now()
  let idle = false

  return {
    touch() {
      lastInput = now()
      if (idle) {
        idle = false
        onActive?.()
      }
    },
    tick() {
      if (!idle && now() - lastInput >= idleAfterMs) {
        idle = true
        onIdle?.()
      }
    },
    isIdle: () => idle,
  }
}

// Phaser's TimeStep has no public runtime setter for the FPS cap; these three
// fields are what its constructor derives from config `fps.limit`.
export function setFpsLimit(game, limit) {
  const loop = game?.loop
  if (!loop) return
  loop.fpsLimit = limit
  loop.hasFpsLimit = limit > 0
  loop._limitRate = limit > 0 ? 1000 / limit : 0
}
