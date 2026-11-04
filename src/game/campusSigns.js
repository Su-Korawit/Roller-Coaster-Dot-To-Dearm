// Pure rules for the campus scene: how visible a door sign is at a distance, and whether the
// first-visit camera pan plays. The scene owns the Phaser objects; this file owns the decisions.

export const SIGN_NEAR = 3 // tiles: fully visible inside this
export const SIGN_FAR = 8 // tiles: gone beyond this
export const INTRO_MS = 1800
export const INTRO_KEY = 'rc-campus-seen'

export function signAlpha(distTiles) {
  if (typeof distTiles !== 'number' || Number.isNaN(distTiles)) return 0
  if (distTiles <= SIGN_NEAR) return 1
  if (distTiles >= SIGN_FAR) return 0
  return 1 - (distTiles - SIGN_NEAR) / (SIGN_FAR - SIGN_NEAR)
}

export function shouldPlayIntro({ seen, reducedMotion, hasResume }) {
  return !seen && !reducedMotion && !hasResume
}

export function introSeen(storage) {
  try { return storage?.getItem(INTRO_KEY) === '1' } catch { return false }
}

export function markIntroSeen(storage) {
  try { storage?.setItem(INTRO_KEY, '1') } catch { /* private mode: the pan just plays again */ }
}
