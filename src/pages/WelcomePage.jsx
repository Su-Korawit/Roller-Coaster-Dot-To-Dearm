import { useWelcomeContent } from '../hooks/useWelcomeContent'
import WelcomeNav from '../components/welcome/WelcomeNav'
import HeroSection from '../components/welcome/HeroSection'
import FeatureHighlights from '../components/welcome/FeatureHighlights'
import HowToPlay from '../components/welcome/HowToPlay'
import StatsSection from '../components/welcome/StatsSection'
import NewsSection from '../components/welcome/NewsSection'
import HowItWorks from '../components/welcome/HowItWorks'
import Testimonials from '../components/welcome/Testimonials'
import FaqSection from '../components/welcome/FaqSection'
import DonateSection from '../components/welcome/DonateSection'
import WelcomeFooter from '../components/welcome/WelcomeFooter'

export default function WelcomePage() {
  const { gamePreview, stats, news, testimonials, faq, loading } = useWelcomeContent()
  return (
    <main data-testid="welcome-page" className="min-h-dvh w-full bg-[#F4F7FC] overflow-x-hidden">
      <WelcomeNav />
      <HeroSection gamePreview={gamePreview} loading={loading} />
      <div id="features"><FeatureHighlights /></div>
      <div id="how-to-play"><HowToPlay /></div>
      <div id="stats"><StatsSection stats={stats} loading={loading} /></div>
      <div id="how-it-works"><HowItWorks /></div>
      <div id="news"><NewsSection news={news} loading={loading} /></div>
      <div id="testimonials"><Testimonials testimonials={testimonials} loading={loading} /></div>
      <div id="faq"><FaqSection faq={faq} loading={loading} /></div>
      <div id="donate"><DonateSection /></div>
      <WelcomeFooter />
    </main>
  )
}
