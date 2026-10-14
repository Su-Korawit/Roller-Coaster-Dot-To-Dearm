// Client side of Focus sessions (ADR 0018). Thin wrappers over the server
// callables: the server owns time, credit and XP; this file only asks, and holds
// the cadence constants the HUD uses to prompt the student.
import { getFunctions, httpsCallable } from 'firebase/functions'

// Prompt a check-in every 25 min. The server accepts gaps up to 35 min
// (functions/focusMath.js CHECKIN_WINDOW_MS), leaving 10 min of slack for a
// student who is mid-problem when the prompt appears.
export const CHECKIN_PROMPT_MS = 25 * 60 * 1000

const call = async (name) => {
  const { data } = await httpsCallable(getFunctions(), name)()
  return data
}

export const startFocus = () => call('startFocus')
export const checkInFocus = () => call('checkInFocus')
export const endFocus = () => call('endFocus')

// Milliseconds until the next check-in prompt, given when the last one happened.
export function msUntilCheckIn(lastCheckInAt, now = Date.now()) {
  return Math.max(0, lastCheckInAt + CHECKIN_PROMPT_MS - now)
}
