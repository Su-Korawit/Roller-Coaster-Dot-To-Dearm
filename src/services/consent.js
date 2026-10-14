// Consent to the Privacy Policy and Terms (PDPA). The record lives on the user
// document as `consent: { version, acceptedAt, ageOrGuardianConfirmed }` and is the
// student's own statement; it is written once at sign-up and again whenever
// CONSENT_VERSION changes.
//
// The sign-in page can only collect the tick-boxes BEFORE the Firebase user (and
// its document) exists, so it leaves a marker in sessionStorage that the session
// bootstrap turns into the record right after the document is created. Users who
// signed up before this feature have no record and are asked once by ConsentGate.
import { setDoc, serverTimestamp } from 'firebase/firestore'
import { refs } from '../lib/db'
import { CONSENT_VERSION } from '../constants/legal'
import { useConsentStore } from '../stores/useConsentStore'

export const PENDING_KEY = 'rc-consent-pending'   // rc- prefix: cleared with the rest on account deletion

export const needsConsent = (userDoc) => userDoc?.consent?.version !== CONSENT_VERSION

export function markConsentPending(storage = globalThis.sessionStorage) {
  try { storage?.setItem(PENDING_KEY, JSON.stringify({ version: CONSENT_VERSION, at: Date.now() })) } catch { /* storage blocked */ }
}

// A pending marker only counts when it was made for the CURRENT version.
export function hasPendingConsent(storage = globalThis.sessionStorage) {
  try {
    const raw = storage?.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw)?.version === CONSENT_VERSION : false
  } catch { return false }
}

export function clearPendingConsent(storage = globalThis.sessionStorage) {
  try { storage?.removeItem(PENDING_KEY) } catch { /* nothing to clear */ }
}

export async function recordConsent(uid) {
  await setDoc(
    refs.user(uid),
    { consent: { version: CONSENT_VERSION, acceptedAt: serverTimestamp(), ageOrGuardianConfirmed: true } },
    { merge: true },
  )
  clearPendingConsent()
  useConsentStore.getState().setStatus('ok')
}

// Called by the session bootstrap with the user document it just loaded.
export async function resolveConsent(uid, userDoc) {
  const store = useConsentStore.getState()
  if (!needsConsent(userDoc)) { store.setStatus('ok'); return 'ok' }
  if (hasPendingConsent()) { await recordConsent(uid); return 'recorded' }
  store.setStatus('needed')
  return 'needed'
}
