import { useState } from 'react'
import { SITES } from '../constants/sites'
import { currentSite } from '../lib/site'
import { useAuthStore } from '../stores/useAuthStore'

const TOOL_KEYS = ['roadmap', 'tcas', 'news', 'school', 'app']

function siteHref(key) {
  if (import.meta.env.DEV) return `/?site=${key}`
  return SITES[key].path
}

function hubHref() {
  if (import.meta.env.DEV) return '/?site=hub'
  return SITES.hub.path
}

function siteLabel(key) {
  const title = SITES[key]?.title ?? key
  return title.split('—')[0].trim()
}

export default function FeatureLayout({ children }) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const signIn = useAuthStore((s) => s.signIn)
  const signOut = useAuthStore((s) => s.signOut)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)

  const site = SITES[currentSite] ?? SITES.roadmap

  async function handleSignIn() {
    setAuthBusy(true)
    try {
      await signIn('google')
    } catch (e) {
      console.error('[FeatureLayout] sign-in failed:', e)
    } finally {
      setAuthBusy(false)
    }
  }

  return (
    <div className="h-dvh w-full flex flex-col bg-[#F4F7FC] overflow-hidden">
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-ink bg-surface z-20">
        <h1 className="pixel-font text-[10px] text-ink truncate min-w-0">
          {siteLabel(currentSite)}
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setToolsOpen((v) => !v)}
              onBlur={() => setTimeout(() => setToolsOpen(false), 150)}
              className="thai-font text-xs text-brand-strong px-2 py-1 rounded-lg hover:bg-brand-soft"
            >
              เครื่องมืออื่น ▾
            </button>
            {toolsOpen && (
              <div className="absolute right-0 top-full mt-1 neo-card py-1 z-50 min-w-[11rem]">
                <a
                  href={hubHref()}
                  className="block px-4 py-2 thai-font text-xs text-ink hover:bg-brand-soft border-b border-ink/10"
                >
                  หน้าแรก I LOVE TCAS
                </a>
                {TOOL_KEYS.filter((k) => k !== currentSite).map((key) => (
                  <a
                    key={key}
                    href={siteHref(key)}
                    className="block px-4 py-2 thai-font text-xs text-ink hover:bg-brand-soft"
                  >
                    {siteLabel(key)}
                  </a>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <span className="w-8 h-8" aria-hidden="true" />
          ) : user ? (
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="ออกจากระบบ"
              className="flex items-center gap-2 rounded-lg hover:bg-brand-soft p-1"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border-2 border-ink/20 object-cover" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-brand-soft pixel-font text-[8px] flex items-center justify-center text-ink">
                  U
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={authBusy}
              className="neo-btn rounded-lg px-3 py-1.5 thai-font text-xs bg-brand-strong text-white disabled:opacity-50"
            >
              {authBusy ? '...' : 'บันทึก'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 relative overflow-hidden">
        {children}
      </main>
    </div>
  )
}
