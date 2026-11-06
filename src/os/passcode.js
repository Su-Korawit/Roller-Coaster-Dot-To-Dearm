// Device passcode for the OS shell. Per device, never sent anywhere: a 6-digit PIN, hashed with
// SHA-256 (salted with the uid) and kept in localStorage. Like a phone passcode, it only guards
// this device; forgetting it means signing in with Google again.

export const PIN_LENGTH = 6

const key = (uid) => `rc-os-pass-${uid}`

export function isValidPin(pin) {
  return typeof pin === 'string' && new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)
}

export async function hashPasscode(uid, pin) {
  const data = new TextEncoder().encode(`rc-os:${uid}:${pin}`)
  const buf = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

function read(uid) {
  try {
    return localStorage.getItem(key(uid))
  } catch {
    return null
  }
}

export function hasPasscode(uid) {
  return !!uid && !!read(uid)
}

export async function savePasscode(uid, pin) {
  if (!uid || !isValidPin(pin)) throw new Error('invalid passcode')
  const hash = await hashPasscode(uid, pin)
  try {
    localStorage.setItem(key(uid), hash)
  } catch {
    // Storage blocked (private window): the passcode only lives for this session.
  }
}

export async function verifyPasscode(uid, pin) {
  const stored = read(uid)
  if (!stored || !isValidPin(pin)) return false
  return (await hashPasscode(uid, pin)) === stored
}

export function clearPasscode(uid) {
  try {
    localStorage.removeItem(key(uid))
  } catch {
    // ignore
  }
}
