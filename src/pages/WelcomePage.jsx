import { useWelcomeContent } from '../hooks/useWelcomeContent'
import HeroSection from '../components/welcome/HeroSection'
import FeatureHighlights from '../components/welcome/FeatureHighlights'
import StatsSection from '../components/welcome/StatsSection'
import GamePreview from '../components/welcome/GamePreview'
import NewsSection from '../components/welcome/NewsSection'
import HowItWorks from '../components/welcome/HowItWorks'
import Testimonials from '../components/welcome/Testimonials'
import FaqSection from '../components/welcome/FaqSection'
import WelcomeFooter from '../components/welcome/WelcomeFooter'

export default function WelcomePage() {
  const { gamePreview, stats, news, testimonials, faq } = useWelcomeContent()
  return (
    <main data-testid="welcome-page" className="min-h-dvh w-full bg-[#F4F7FC] overflow-x-hidden">
      <HeroSection />
      <FeatureHighlights />
      <StatsSection stats={stats} />
      <GamePreview gamePreview={gamePreview} />
      <NewsSection news={news} />
      <HowItWorks />
      <Testimonials testimonials={testimonials} />
      <FaqSection faq={faq} />
      <WelcomeFooter />
    </main>
  )
}
