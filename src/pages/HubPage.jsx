import { Map, GraduationCap, Newspaper, NotebookPen, Gamepad2, ArrowRight, HardDriveDownload, CloudUpload, LockOpen, Check } from 'lucide-react'
import { SITES } from '../constants/sites'
import SiteNav, { siteHref } from '../components/landing/SiteNav'
import WelcomeFooter from '../components/welcome/WelcomeFooter'
import { useGamePreviewMedia } from '../hooks/useGamePreviewMedia'
import SceneBackdrop from '../components/landing/SceneBackdrop'
import CharacterSprite from '../components/ui/CharacterSprite'

// Hub anatomy per design.md §13: nav → text-only outcome hero → tool grid
// (the hero product) → 3-step "work your way" strip → dark app band → trust
// strip → footer. Copy comes from SITES h1/intro/shortName/pixelName only.
const TOOL_ICONS = {
  roadmap: Map,
  tcas: GraduationCap,
  news: Newspaper,
  school: NotebookPen,
}

const TOOL_SHOTS = {
  roadmap: '/assets/screenshots/roadmap.png',
  tcas: '/assets/screenshots/tcas.png',
  news: '/assets/screenshots/news.png',
  school: '/assets/screenshots/school.png',
}

const STEPS = [
  {
    icon: LockOpen,
    title: 'เปิดแล้วใช้ได้เลย',
    text: 'เปิดลิงก์แล้วทำงานได้ทันที ไม่บังคับสมัครหรือล็อกอิน',
  },
  {
    icon: HardDriveDownload,
    title: 'งานเก็บในเครื่องอัตโนมัติ',
    text: 'ปิดแท็บแล้วกลับมา งานยังอยู่ครบ ไม่ต้องกดเซฟ',
  },
  {
    icon: CloudUpload,
    title: 'ล็อกอินเมื่อพร้อม sync',
    text: 'อยากเก็บขึ้นคลาวด์หรือใช้ AI ค่อยล็อกอิน งานเดิมตามไปด้วย',
  },
]

function ToolCard({ siteKey }) {
  const site = SITES[siteKey]
  const Icon = TOOL_ICONS[siteKey]
  return (
    <a href={siteHref(siteKey)} className="neo-card neo-btn group flex flex-col overflow-hidden text-left">
      <img
        src={TOOL_SHOTS[siteKey]}
        alt=""
        width={640}
        height={400}
        loading="lazy"
        className="aspect-[16/10] w-full object-cover object-top border-b-2 border-ink"
      />
      <div className="flex flex-1 flex-col p-6">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border-2 border-ink bg-brand-soft">
          <Icon size={24} strokeWidth={2.5} className="text-brand-strong" aria-hidden="true" />
        </span>
        <span className="pixel-font mb-2 text-[10px] uppercase text-brand-strong">{site.pixelName}</span>
        <h3 className="thai-font mb-1.5 text-lg font-bold leading-snug text-ink">{site.h1}</h3>
        <p className="thai-font mb-4 flex-1 text-sm leading-relaxed text-ink-soft">{site.description}</p>
        <span className="thai-font inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong">
          เปิดเครื่องมือ
          <ArrowRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </a>
  )
}

export default function HubPage() {
  const { mediaUrl, mediaType } = useGamePreviewMedia()

  return (
    <main data-testid="hub-page" className="min-h-dvh w-full overflow-x-hidden bg-mist">
      <SiteNav currentKey="hub" />

      {/* Hero — text only; the tool grid right below is the real hero (§13) */}
      <header className="relative overflow-hidden border-b-2 border-edge">
        <SceneBackdrop position="center 40%" shade={0.35} />
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-12 pb-28 text-center md:px-6 md:pt-16 md:pb-32">
          <div className="neo-card mx-auto max-w-3xl px-3 py-7 animate-pop sm:px-6 md:px-10 md:py-10">
            <p className="pixel-font pixel-title mb-5 text-[10px] md:text-xs">I LOVE TCAS</p>
            <h1 className="thai-font mx-auto max-w-3xl text-[1.65rem] font-extrabold leading-tight text-ink sm:text-3xl md:text-5xl">
              {SITES.hub.h1}
            </h1>
            <p className="thai-font mx-auto mt-4 max-w-xl text-base text-ink-soft md:text-lg">
              {SITES.hub.intro}
            </p>
          </div>
        </div>
        {/* The cast, strolling along the bottom edge of the hero. */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center gap-1 sm:gap-6" aria-hidden="true">
          {['INTJ', 'ENFP', 'ISTP', 'ESFJ', 'INFP'].map((code) => (
            <CharacterSprite key={code} code={code} scale={2} />
          ))}
        </div>
      </header>

      {/* Tool grid — the product */}
      <section aria-label="เครื่องมือทั้งหมด" className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Object.keys(TOOL_ICONS).map((key) => (
            <ToolCard key={key} siteKey={key} />
          ))}
        </div>
      </section>

      {/* Work-your-way strip */}
      <section className="border-y-2 border-ink bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6 md:py-14">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex items-start gap-4">
              <span className="pixel-font flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-warn/20 text-xs text-ink">
                {i + 1}
              </span>
              <div>
                <h3 className="thai-font mb-1 text-base font-bold text-ink">{step.title}</h3>
                <p className="thai-font text-sm leading-relaxed text-ink-soft">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* App band — the one dark moment on the page (§15) */}
      <section className="bg-ink">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-14 text-center md:flex-row md:items-center md:gap-10 md:px-6 md:text-left">
          {mediaUrl ? (
            <div className="neo-card w-full max-w-md shrink-0 overflow-hidden md:w-[min(42%,24rem)]">
              {mediaType === 'video' ? (
                <video
                  src={mediaUrl}
                  className="aspect-[16/10] w-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-hidden="true"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                />
              )}
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-6 md:flex-row md:justify-between">
            <div>
              <p className="pixel-font pixel-title-dark mb-3 text-sm md:text-base">CREATE YOUR VIBE SPACE</p>
              <p className="thai-font max-w-xl text-base text-white/85">
                รวมทุก Feature ที่ใช้เตรียมสอบ ไว้ในโลกเกมเดียว เลี้ยงฟาร์ม เก็บเหรียญ
                ทำภารกิจรายวัน และหาเพื่อนเป้าหมายเดียวกัน
              </p>
            </div>
            <a
              href={siteHref('app')}
              className="neo-btn thai-font inline-flex shrink-0 items-center gap-2 rounded-lg border-2 border-surface bg-brand-strong px-6 py-3 text-base font-semibold text-white"
              style={{ boxShadow: '4px 4px 0 0 var(--color-surface)' }}
            >
              <Gamepad2 size={20} strokeWidth={2.5} aria-hidden="true" />
              เข้าแอป + เกม
            </a>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b-2 border-ink bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 md:px-6">
          {['ฟรี ไม่มีค่าใช้จ่ายแอบแฝง', 'ข้อมูลคณะจาก MyTCAS', 'ใช้ได้โดยไม่ต้องสมัครสมาชิก'].map((line) => (
            <p key={line} className="thai-font inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
              <Check size={16} strokeWidth={2.5} className="text-good" aria-hidden="true" />
              {line}
            </p>
          ))}
        </div>
      </section>

      <WelcomeFooter />
    </main>
  )
}
