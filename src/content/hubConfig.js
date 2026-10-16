// Validation for the editable hub settings (siteConfig/hub).

// The OpenChat link is shown to every visitor, so it may only point at LINE itself
// (a look-alike host such as line.me.evil.test must not pass).
const LINE_URL = /^https:\/\/line\.me\/[^\s]+$/

export function isValidOpenChatUrl(value) {
  const text = String(value ?? '').trim()
  return text === '' || LINE_URL.test(text)
}
