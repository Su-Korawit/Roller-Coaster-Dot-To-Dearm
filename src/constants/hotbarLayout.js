// Vertical space the floating hotbar takes at the bottom of the home screen. Popups and the
// mini player offset themselves by this so nothing hides behind it.
export const HOTBAR_H = 64 // px, the bar itself
export const HOTBAR_GAP = 16 // px, from the bottom edge (plus the safe-area inset)
export const HOTBAR_CLEARANCE = `calc(env(safe-area-inset-bottom) + ${HOTBAR_H + HOTBAR_GAP * 2}px)`
export const HOTBAR_DOCK = `calc(env(safe-area-inset-bottom) + ${HOTBAR_H + HOTBAR_GAP + 8}px)`
