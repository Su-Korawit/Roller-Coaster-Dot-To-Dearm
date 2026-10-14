import LegalPage from './LegalPage'
import { TERMS } from '../../data/legalContent'
import { LEGAL_PATHS } from '../../constants/legal'

export default function TermsPage() {
  return <LegalPage doc={TERMS} other={{ to: LEGAL_PATHS.privacy, label: 'นโยบายความเป็นส่วนตัว' }} />
}
