import HeroSection from '../components/welcome/HeroSection'
import FeatureHighlights from '../components/welcome/FeatureHighlights'
import HowItWorks from '../components/welcome/HowItWorks'
import WelcomeFooter from '../components/welcome/WelcomeFooter'

export default function WelcomePage() {
  return (
    <main data-testid="welcome-page" className="min-h-dvh w-full bg-[#F4F7FC] overflow-x-hidden">
      <HeroSection />
      <FeatureHighlights />
      <HowItWorks />
      <WelcomeFooter />
    </main>
  )
}
