// Private beta: only the owner may use the voice-call system for now.
const CALL_ALLOWED_EMAILS = ['o.korawitt@gmail.com']

export function isCallAllowed(email) {
  return CALL_ALLOWED_EMAILS.includes(String(email || '').trim().toLowerCase())
}
