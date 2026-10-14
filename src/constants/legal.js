// Legal metadata shared by the Privacy Policy, Terms, the consent prompt and the
// consent record on each user. Bump CONSENT_VERSION whenever either document
// changes in a way that needs fresh consent — every signed-in user is then asked
// again (see ConsentGate).
//
// OWNER: confirm CONTROLLER_NAME and CONTACT_EMAIL before launch. The email below
// is the project's existing admin address (src/constants/admin.js), used as a
// placeholder so the pages are never published with an empty contact.

import { ADMIN_EMAIL } from './admin'

export const CONSENT_VERSION = '2026-10-14'
export const EFFECTIVE_DATE_TH = '14 ตุลาคม 2569'

export const CONTROLLER_NAME = 'ผู้พัฒนา I LOVE TCAS'
export const CONTACT_EMAIL = ADMIN_EMAIL

// Thai PDPC (สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล) — where a complaint can be filed.
export const REGULATOR_NAME = 'สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)'

export const LEGAL_PATHS = { privacy: '/privacy', terms: '/terms' }
