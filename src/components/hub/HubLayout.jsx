import HubNav from './HubNav'
import SiteFooter from '../landing/SiteFooter'

// Shared frame for every content-site page: nav, content, footer.
export default function HubLayout({ children, testId }) {
  return (
    <div data-testid={testId} className="min-h-dvh w-full overflow-x-hidden bg-mist">
      <HubNav />
      {children}
      <SiteFooter />
    </div>
  )
}
