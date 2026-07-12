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

const SHOWCASE = [
  { title: 'Roadmap', description: 'วางแผนเส้นทางสู่มหาลัยแบบเห็นภาพ ลากวาง ตกแต่งได้' },
  { title: 'Gamification', description: 'ทำการบ้านได้เหรียญ สะสมสตรีค เลี้ยงฟาร์มของตัวเอง' },
  { title: 'School System', description: 'ตารางเรียน การบ้าน และโน้ตประจำวัน ในหน้าเดียว' },
]

export default function WelcomePage() {
  const { gamePreview, stats, news, testimonials, faq, loading } = useWelcomeContent()
  return (
    <main data-testid="welcome-page" className="min-h-dvh w-full bg-[#F4F7FC] overflow-x-hidden">
      <WelcomeNav />
      <HeroSection gamePreview={gamePreview} loading={loading} />
      <section className="px-6 py-10">
        <h2 className="pixel-font text-center text-sm md:text-lg text-ink mb-8">จุดเด่น</h2>
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {SHOWCASE.map((item) => (
            <div key={item.title} className="neo-card p-6 text-center">
              <h3 className="pixel-font text-[10px] text-brand-strong mb-2">{item.title}</h3>
              <p className="thai-font text-sm text-ink/80">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
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
