// Splash (loading) screen shown while an app window opens, like a desktop app's launch screen:
// one illustration, the app logo + name and a loading bar. Only apps with art (`app.splash`) get one.

export const SPLASH_MS = 1800
export const SPLASH_REDUCED_MS = 700   // shorter when the user asked for less motion

export const hasSplash = (app) => typeof app?.splash === 'string' && app.splash.length > 0

export const splashDuration = (reducedMotion) => (reducedMotion ? SPLASH_REDUCED_MS : SPLASH_MS)
