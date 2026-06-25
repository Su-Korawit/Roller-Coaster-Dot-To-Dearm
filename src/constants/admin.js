export const ADMIN_EMAIL = 'o.korawitt@gmail.com'
export const ADMIN_UID = 'IaltEhO0mPVfK3ng8npr4CdqnEE3'
export const ADMIN_DISPLAY_NAME = 'ผู้พัฒนาระบบ'

// Section-scoped admin access. Each email maps to the admin sections it may edit.
// The super-admin gets every section. Adding/removing an admin here must be
// mirrored in firestore.rules + storage.rules (those gate writes by token email).
// Keys must be lowercase — getAdminSections() lowercases the lookup email.
export const ADMIN_SECTIONS = ['analytics', 'users', 'characters', 'maps', 'assets', 'music', 'shop', 'finance', 'welcome', 'farm']

export const ADMIN_ROLES = {
  'o.korawitt@gmail.com': ['analytics', 'users', 'characters', 'maps', 'assets', 'music', 'shop', 'finance', 'welcome', 'farm'],
  'takadaoni07@gmail.com': ['maps', 'assets'],
  'play198725@gmail.com': ['characters'],
  'itcity9476@gmail.com': ['music'],
}

// → array of section keys this email may edit (empty if not an admin).
export function getAdminSections(email) {
  if (!email) return []
  return ADMIN_ROLES[email.toLowerCase()] ?? []
}
