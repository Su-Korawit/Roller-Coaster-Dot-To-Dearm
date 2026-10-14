// Client side of "delete my account" (PDPA right to erasure). The erasure itself
// is the deleteMyAccount Cloud Function (functions/accountDeletion.js); this file
// re-authenticates the person (the server requires a sign-in from the last 5
// minutes), calls it, and clears everything this browser kept.
//
// Credentials: a password is only ever passed straight to Firebase's
// reauthenticateWithCredential — never stored, logged or sent anywhere else.
import {
  EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, signOut,
} from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth } from '../firebase'

// Typed by the student to confirm; also the only thing the button waits for.
export const DELETE_CONFIRM_PHRASE = 'ลบบัญชี'

// Browser storage this app owns: every persisted store uses an `rc-` prefix.
export const LOCAL_PREFIX = 'rc-'

export const hasProvider = (user, id) => !!user?.providerData?.some((p) => p?.providerId === id)

// A password is needed only for accounts that sign in with email+password and not Google.
export const needsPassword = (user) => hasProvider(user, 'password') && !hasProvider(user, 'google.com')

// Pure: which keys of a Storage-like object belong to this app.
export function localKeysToClear(storage) {
  const keys = []
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (k && k.startsWith(LOCAL_PREFIX)) keys.push(k)
  }
  return keys
}

export function clearLocalData(local = globalThis.localStorage, session = globalThis.sessionStorage) {
  for (const storage of [local, session]) {
    if (!storage) continue
    try { localKeysToClear(storage).forEach((k) => storage.removeItem(k)) } catch { /* storage blocked: nothing to clear */ }
  }
}

export async function reauthenticate(user, { password } = {}) {
  if (needsPassword(user)) {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password ?? ''))
  } else {
    await reauthenticateWithPopup(user, new GoogleAuthProvider())
  }
}

// Thai message for an error from reauthentication or the callable; null = the person
// cancelled (closed the Google popup), so nothing should be shown.
export function deletionErrorMessage(e) {
  const code = e?.code ?? ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'รหัสผ่านไม่ถูกต้อง'
  if (code === 'auth/too-many-requests') return 'ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่'
  if (code === 'auth/network-request-failed' || code === 'functions/unavailable') return 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต'
  if (code === 'auth/popup-blocked') return 'เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตแล้วลองใหม่'
  const msg = e?.message ?? ''
  if (msg.includes('REAUTH_REQUIRED')) return 'ต้องยืนยันตัวตนอีกครั้งก่อนลบ กรุณาลองใหม่'
  if (msg.includes('ADMIN_PROTECTED')) return 'บัญชีผู้ดูแลระบบหลักลบเองไม่ได้'
  return 'ลบบัญชีไม่สำเร็จ ข้อมูลของคุณยังอยู่ครบ ลองใหม่อีกครั้ง หรือติดต่อผู้พัฒนา'
}

// Re-authenticate, erase on the server, clear this browser, sign out.
// Throws on any failure BEFORE the server call completes (nothing local is cleared then).
export async function deleteMyAccount({ password } = {}, deps = {}) {
  const { user = auth.currentUser, call = defaultCall, clear = clearLocalData, logOut = () => signOut(auth) } = deps
  if (!user) throw Object.assign(new Error('NOT_SIGNED_IN'), { code: 'app/not-signed-in' })

  await reauthenticate(user, { password })
  await user.getIdToken(true)          // refresh so the token carries the new auth_time
  const result = await call()

  // The account no longer exists; the order below only matters for tidiness.
  clear()
  try { await logOut() } catch { /* the token is already invalid */ }
  return result
}

async function defaultCall() {
  const { data } = await httpsCallable(getFunctions(), 'deleteMyAccount')({ confirm: true })
  return data
}
