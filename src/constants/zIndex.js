// Semantic stacking layers — replaces the magic z-index numbers (40/50/55/60/70/80/90)
// scattered across HUD, panels, sheets and modals. Higher = closer to the user.
export const Z_HUD = 20    // HomePage floating header pills / FAB row
export const Z_NAV = 30    // BottomNavBar, tracklist popup
export const Z_PANEL = 50  // full-screen slide-up panels (Task/News/Profile/Skill/Social/Chat)
export const Z_FAB = 55    // contact-dev FAB (above panels)
export const Z_SHEET = 60  // bottom sheets layered over a panel
export const Z_MODAL = 70  // centered modals / share / gift / credit sheets
export const Z_TOAST = 80  // transient toasts, skill-execution popups
export const Z_MODAL_ABOVE = 90   // modals that must sit above toasts (DailyLogin band)
export const Z_CELEBRATION = 9999 // full-screen celebration overlays (KawaiiMatch)
