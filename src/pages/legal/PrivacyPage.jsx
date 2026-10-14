import LegalPage from './LegalPage'
import { PRIVACY } from '../../data/legalContent'
import { LEGAL_PATHS } from '../../constants/legal'

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} other={{ to: LEGAL_PATHS.terms, label: 'ข้อกำหนดการใช้งาน' }} />
}
