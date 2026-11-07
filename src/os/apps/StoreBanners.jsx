import { useEffect, useRef, useState } from 'react'

const fill = (token) => ({ fill: `var(--color-${token})` })
const stroke = (token) => ({ stroke: `var(--color-${token})` })

// Scenes are drawn in code with theme tokens (Soft Pixel palette), so they follow the theme and
// stay crisp at any size. Each fills the right part of the banner; text sits on the left.
function MountainScene() {
  return (
    <svg viewBox="0 0 320 240" className="absolute right-0 inset-y-0 h-full w-auto" aria-hidden="true">
      <polygon points="0,240 110,100 220,240" style={fill('brand')} />
      <polygon points="120,240 230,50 340,240" style={fill('zone-soc')} />
      <polygon points="200,110 230,50 258,104 244,96 230,112 216,98" style={fill('paper')} />
      <line x1="230" y1="50" x2="230" y2="18" strokeWidth="3" style={stroke('ink')} />
      <polygon points="230,18 262,28 230,38" style={fill('warn')} />
      {[[40, 40], [90, 24], [150, 60], [286, 90], [30, 120]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="6" height="6" className="os-bob" style={{ ...fill('paper'), animationDelay: `${i * 0.25}s` }} />
      ))}
    </svg>
  )
}

function CalendarScene() {
  return (
    <svg viewBox="0 0 320 240" className="absolute right-0 inset-y-0 h-full w-auto" aria-hidden="true">
      <rect x="70" y="40" width="190" height="170" rx="10" strokeWidth="4" style={{ ...fill('paper'), ...stroke('ink') }} />
      <rect x="72" y="42" width="186" height="38" rx="8" style={fill('zone-health')} />
      <rect x="106" y="26" width="10" height="26" rx="3" style={fill('ink')} />
      <rect x="214" y="26" width="10" height="26" rx="3" style={fill('ink')} />
      {Array.from({ length: 15 }, (_, i) => (
        <rect key={i} x={92 + (i % 5) * 34} y={96 + Math.floor(i / 5) * 34} width="22" height="22" rx="4" style={fill(i === 7 ? 'zone-biz' : 'zone-soc-soft')} />
      ))}
      <polyline points="150,170 162,182 188,152" fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" style={stroke('good-strong')} />
    </svg>
  )
}

function SchoolScene() {
  return (
    <svg viewBox="0 0 320 240" className="absolute right-0 inset-y-0 h-full w-auto" aria-hidden="true">
      <rect x="0" y="200" width="320" height="40" style={fill('zone-earth-deep')} />
      <polygon points="60,100 165,50 270,100" strokeWidth="4" strokeLinejoin="round" style={{ ...fill('zone-biz'), ...stroke('ink') }} />
      <rect x="70" y="100" width="190" height="100" strokeWidth="4" style={{ ...fill('paper'), ...stroke('ink') }} />
      {[92, 132, 192, 232].map((x) => <rect key={x} x={x - 8} y="116" width="16" height="30" rx="3" style={fill('zone-sci')} />)}
      <rect x="147" y="146" width="36" height="54" rx="4" style={fill('brand')} />
      <circle cx="165" cy="80" r="9" style={fill('paper')} />
      {[[24, 60], [290, 56], [276, 150]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="6" height="6" className="os-bob" style={{ ...fill('paper'), animationDelay: `${i * 0.3}s` }} />
      ))}
    </svg>
  )
}

const BANNERS = [
  {
    id: 'welcome',
    title: 'ยินดีต้อนรับสู่ Store',
    text: 'แอปและเว็บไซต์ช่วยเตรียมตัวสอบ TCAS ติดตั้งแล้วอยู่บนหน้าหลัก',
    cta: 'เริ่มที่ Goal',
    action: { type: 'open', appId: 'goal' },
    background: 'linear-gradient(110deg, var(--color-brand-strong) 40%, var(--color-zone-soc))',
    image: '/assets/os/banners/welcome.webp',
    scrim: 'var(--color-brand-strong)',
    Scene: MountainScene,
  },
  {
    id: 'plan',
    title: 'วางแผนอ่านหนังสือถึงวันสอบ',
    text: 'ตั้งเป้าหมายใน Goal แล้วให้ Habit จัดแผนรายวันให้',
    cta: 'เปิด Habit',
    action: { type: 'open', appId: 'habit' },
    background: 'linear-gradient(110deg, var(--color-zone-sci-deep) 40%, var(--color-zone-sci))',
    image: '/assets/os/banners/plan.webp',
    scrim: 'var(--color-zone-sci-deep)',
    Scene: CalendarScene,
  },
  {
    id: 'admission',
    title: 'เว็บรับสมัครที่ต้องรู้',
    text: 'MyTCAS, KU Admission, Dek-D Admission รวมไว้ที่เดียว',
    cta: 'ดูหมวดสมัครและข้อมูลรับเข้า',
    action: { type: 'category', categoryId: 'admission' },
    background: 'linear-gradient(110deg, var(--color-zone-earth-deep) 40%, var(--color-zone-earth))',
    image: '/assets/os/banners/admission.webp',
    scrim: 'var(--color-zone-earth-deep)',
    Scene: SchoolScene,
  },
]

// Illustration (generated art) with a colour scrim on the left so the text stays readable.
// If the picture fails to load, the code-drawn scene is shown instead.
function BannerArt({ banner }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <banner.Scene />
  return (
    <>
      <img src={banner.image} alt="" draggable={false} onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
      <span className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${banner.scrim} 0%, ${banner.scrim} 38%, transparent 78%)` }} aria-hidden="true" />
    </>
  )
}

const AUTOPLAY_MS = 5000

// Play-Store style banner strip: swipe, tap the dots, or let it advance on its own.
export default function StoreBanners({ onAction }) {
  const scroller = useRef(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  function goTo(i) {
    const el = scroller.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  useEffect(() => {
    if (paused) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const t = setInterval(() => {
      const el = scroller.current
      if (!el) return
      const cur = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
      el.scrollTo({ left: ((cur + 1) % BANNERS.length) * el.clientWidth, behavior: 'smooth' })
    }, AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [paused])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="แบนเนอร์"
      className="relative"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={scroller}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="os-pages flex overflow-x-auto snap-x snap-mandatory rounded-slot"
      >
        {BANNERS.map((b, i) => (
          <article
            key={b.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} จาก ${BANNERS.length}`}
            className="px-card relative w-full shrink-0 snap-start overflow-hidden text-white aspect-[8/3] min-h-[150px]"
            style={{ background: b.background }}
          >
            <BannerArt banner={b} />
            <div className="relative h-full flex flex-col justify-center gap-1.5 p-5 max-w-[58%]">
              <h3 className="font-display font-bold text-lg sm:text-2xl leading-tight">{b.title}</h3>
              <p className="thai-font text-sm opacity-95 leading-snug">{b.text}</p>
              <button
                type="button"
                onClick={() => onAction(b.action)}
                className="self-start mt-1 px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {b.cta}
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-2" role="tablist" aria-label="เลือกแบนเนอร์">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={index === i}
            aria-label={`แบนเนอร์ ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-2.5 rounded-full bg-brand-strong transition-all ${index === i ? 'w-6' : 'w-2.5 opacity-30'}`}
          />
        ))}
      </div>
    </section>
  )
}
