// Promo recording mode (dev server only): `?promo=1` swaps Firebase sign-in for a local demo user so
// the promo video can film the signed-in screens without touching real accounts or data. The flag is
// remembered for the tab (sessionStorage) so SPA navigation keeps it. Never active in a production build.
function detect() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false
  try {
    if (new URLSearchParams(window.location.search).get('promo') === '1') sessionStorage.setItem('rc-promo', '1')
    return sessionStorage.getItem('rc-promo') === '1'
  } catch {
    return false
  }
}

export const PROMO = detect()

export const PROMO_USER = {
  uid: 'promo-demo',
  email: 'mali.demo@example.com',
  displayName: 'น้องมะลิ',
  photoURL: null,
  getIdToken: async () => '',
  getIdTokenResult: async () => ({ claims: {} }),
}
