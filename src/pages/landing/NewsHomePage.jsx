import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SITES } from '../../constants/sites'
import { useNewsStore } from '../../stores/useNewsStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { UPDATE_TYPES } from '../../data/appUpdates'
import { DEFAULT_CATEGORY } from '../../data/campCategories'
import TcasCalendarTab from '../../components/TcasCalendarTab'
import Popup from '../../components/ui/Popup'
import WelcomeFooter from '../../components/welcome/WelcomeFooter'

const camphubLogo = new URL('../../../assets/eachPageAssets/news/camphub_logo.png', import.meta.url).href
const placeholderPoster = new URL('../../../assets/eachPageAssets/news/camphub_poster.jpg', import.meta.url).href

export default function NewsHomePage() {
  const [activeTab, setActiveTab] = useState('feed')
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showLoginCta, setShowLoginCta] = useState(false)
  const [detailUpdate, setDetailUpdate] = useState(null)

  const allUpdates = useNewsStore((s) => s.getAllUpdates())
  const signIn = useAuthStore((s) => s.signIn)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    document.title = SITES.news.title
    const unsub = useNewsStore.getState().subscribeUpdates()
    return () => unsub?.()
  }, [])

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/camphub?category=${encodeURIComponent(DEFAULT_CATEGORY)}`)
        if (!res.ok) throw new Error('Failed to fetch camps')
        const data = await res.json()
        if (alive) setCamps(data)
      } catch (err) {
        if (alive) setError(err.message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const hubHref = import.meta.env.DEV ? '/?site=hub' : SITES.hub.path

  async function handleGoogleLogin() {
    setSigningIn(true)
    try {
      await signIn('google')
      setShowLoginCta(false)
    } catch (e) {
      console.error('[news] sign-in failed:', e)
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <main data-testid="news-home" className="min-h-dvh w-full bg-[#F4F7FC] overflow-x-hidden">
      <header className="border-b-2 border-ink bg-surface px-6 py-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="pixel-font text-[10px] text-brand-strong mb-4">I LOVE TCAS</p>
          <h1 className="pixel-font text-sm md:text-base text-ink mb-4">
            {SITES.news.description}
          </h1>
          <p className="thai-font text-base text-ink/70">{SITES.news.title}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="neo-card overflow-hidden">
          <div className="flex border-b border-ink/10">
            {[
              { key: 'feed', label: 'ข่าวค่าย' },
              { key: 'updates', label: 'อัปเดตแอป' },
              { key: 'tcas', label: 'TCAS70' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 pixel-font text-[9px] transition-colors relative ${
                  activeTab === tab.key ? 'text-brand-strong' : 'text-ink-soft'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-strong rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {activeTab === 'feed' && (
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-brand" size={24} />
                </div>
              ) : error ? (
                <p className="thai-font text-center text-sm text-danger py-8">{error}</p>
              ) : camps.length === 0 ? (
                <p className="thai-font text-center text-sm text-ink-soft py-8">ไม่พบข้อมูลค่าย</p>
              ) : (
                camps.map((camp, idx) => (
                  <a
                    key={idx}
                    href={camp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-ink/10 overflow-hidden hover:border-brand transition-colors"
                  >
                    <img
                      src={camp.poster_image || placeholderPoster}
                      alt=""
                      className="w-full h-32 object-cover bg-brand-soft/60"
                      onError={(e) => { e.target.src = placeholderPoster }}
                    />
                    <div className="p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <img src={camphubLogo} alt="" className="w-4 h-4 rounded object-contain" />
                        <span className="thai-font text-[10px] text-brand-strong font-semibold">CAMPHUB</span>
                      </div>
                      <p className="thai-font text-sm font-semibold text-ink line-clamp-2">{camp.title}</p>
                    </div>
                  </a>
                ))
              )}
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {allUpdates.slice(0, 20).map((update) => {
                const badge = UPDATE_TYPES[update.type] ?? UPDATE_TYPES.update
                return (
                  <button
                    key={update.id}
                    type="button"
                    onClick={() => setDetailUpdate(update)}
                    className="w-full text-left neo-card p-4 hover:border-brand transition-colors"
                  >
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold mb-2 ${badge.color}`}>
                      {badge.label}
                    </span>
                    <p className="thai-font text-sm font-semibold text-ink">{update.title}</p>
                  </button>
                )
              })}
            </div>
          )}

          {activeTab === 'tcas' && (
            <div className="relative max-h-[60vh] overflow-y-auto">
              <TcasCalendarTab onGuestAction={() => setShowLoginCta(true)} />
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-6 text-center">
        <a href={hubHref} className="thai-font text-sm text-brand-strong hover:underline">
          ← กลับหน้าแรก I LOVE TCAS
        </a>
      </footer>

      <WelcomeFooter />

      {detailUpdate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setDetailUpdate(null)}>
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="thai-font text-base font-bold text-ink mb-3">{detailUpdate.title}</p>
            <p className="thai-font text-sm text-ink-soft whitespace-pre-line">{detailUpdate.description}</p>
          </div>
        </div>
      )}

      {showLoginCta && (
        <div className="fixed inset-0 z-50">
          <Popup variant="center" size="sm" onClose={() => setShowLoginCta(false)}>
            <div className="p-6 text-center">
              <p className="pixel-font text-[10px] text-ink mb-3">เข้าสู่ระบบ</p>
              <p className="thai-font text-sm text-ink/70 mb-5">
                ล็อกอินเพื่อเพิ่มกิจกรรมลงตารางเรียนของคุณ
              </p>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={signingIn}
                className="neo-btn w-full rounded-xl bg-brand-strong py-3 thai-font text-sm text-white disabled:opacity-50"
              >
                {signingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
              </button>
            </div>
          </Popup>
        </div>
      )}
    </main>
  )
}
