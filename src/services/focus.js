// Client side of Focus sessions (ADR 0018). Thin wrappers over the server
// callables: the server owns time, credit and XP; this file only asks, and holds
// the cadence constants the HUD uses to prompt the student.
import { getFunctions, httpsCallable } from 'firebase/functions'

// Prompt a check-in every 25 min. The server accepts gaps up to 35 min
// (functions/focusMath.js CHECKIN_WINDOW_MS), leaving 10 min of slack for a
// student who is mid-problem when the prompt appears.
export const CHECKIN_PROMPT_MS = 25 * 60 * 1000

const call = async (name, payload) => {
  const { data } = await httpsCallable(getFunctions(), name)(payload)
  return data
}

// mode: 'strict' | 'flexible', plannedMin: 10-120 (the server validates and defaults).
// practice: the Guide's one-time 1-minute session (the server ignores mode/plannedMin for it).
// subjectKey: an exam subject (TCAS Plan goals) the session counts toward.
export const startFocus = ({ mode, plannedMin, practice, subjectKey } = {}) =>
  call('startFocus', { ...(mode ? { mode } : {}), ...(plannedMin ? { plannedMin } : {}), ...(practice ? { practice: true } : {}), ...(subjectKey ? { subjectKey } : {}) })
export const checkInFocus = () => call('checkInFocus')
export const endFocus = () => call('endFocus')
// The player left the page too long: the tree withers (Strict earns nothing).
export const abandonFocus = () => call('abandonFocus')

// Milliseconds until the next check-in prompt, given when the last one happened.
export function msUntilCheckIn(lastCheckInAt, now = Date.now()) {
  return Math.max(0, lastCheckInAt + CHECKIN_PROMPT_MS - now)
}
