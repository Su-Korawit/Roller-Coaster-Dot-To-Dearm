import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

const NAV_LINKS = [
  { label: 'FEATURES', href: '#features' },
  { label: 'HOW IT WORKS', href: '#how-it-works' },
  { label: 'STATS', href: '#stats' },
  { label: 'NEWS', href: '#news' },
  { label: 'DONATE', href: '#donate' },
  { label: 'TESTIMONIALS', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
]

export default function WelcomeNav() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const onPlay = () => navigate(user ? '/home' : '/auth?mode=login')

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3 transition-all duration-300 ${
          scrolled
            ? 'bg-[#1a1035] border-b border-white/10 shadow-lg'
            : 'bg-transparent'
        }`}
      >
        {/* Hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="เปิดเมนู"
          aria-expanded={open}
          className="flex flex-col gap-1.5 p-2 group"
        >
          <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 origin-center ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 origin-center ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>

        {/* CTA buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/auth')}
            className="neo-btn pixel-font text-[9px] text-ink rounded-xl px-4 py-2.5 bg-surface"
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={onPlay}
            className="neo-btn pixel-font text-[9px] text-white rounded-xl px-4 py-2.5 bg-brand-strong"
          >
            ▶ PLAY
          </button>
        </div>
      </nav>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#1a1035] border-r border-white/10 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="pixel-font text-[10px] text-white/50">MENU</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="ปิดเมนู"
            className="text-white/40 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-col py-4">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="pixel-font text-[10px] text-white/60 hover:text-white hover:bg-white/5 px-5 py-3.5 transition-colors border-b border-white/5 last:border-0"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  )
}
