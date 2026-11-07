// Splash (launch) screen of an app window, like a desktop app's: full-bleed key art, app logo + name,
// a status line and a thin progress bar. Only apps with art (`app.splash`) get one.

export const SPLASH_MS = 2000
export const SPLASH_REDUCED_MS = 700   // shorter when the user asked for less motion

export const hasSplash = (app) => typeof app?.splash === 'string' && app.splash.length > 0

export const splashDuration = (reducedMotion) => (reducedMotion ? SPLASH_REDUCED_MS : SPLASH_MS)

// 0..1 → eased 0..1 (fast start, slow finish, like a real load).
export const easeOut = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3

// Whole percent for `elapsed` ms of a `total` ms splash.
export const splashPercent = (elapsed, total) => Math.round(easeOut(elapsed / total) * 100)

// Status line under the app name.
export function splashStatus(percent) {
  if (percent >= 100) return 'พร้อมแล้ว'
  if (percent >= 70) return 'เกือบเสร็จแล้ว'
  if (percent >= 30) return 'กำลังโหลดข้อมูลของคุณ'
  return 'กำลังเตรียมแอป'
}
