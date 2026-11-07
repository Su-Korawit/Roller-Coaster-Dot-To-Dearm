import { useEffect, useState } from 'react'
import { AppTile } from '../AppIcon'
import { splashDuration } from './splashLogic'

// Launch screen of an app window: the app's illustration, logo, name and a loading bar. It covers
// the window while the app loads underneath, then hands over. A tap/click skips it.
export default function AppSplash({ app, onDone }) {
  const [started, setStarted] = useState(false)
  const [artFailed, setArtFailed] = useState(false)
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const ms = splashDuration(reduced)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true))   // next frame, so the bar animates from 0
    const timer = setTimeout(onDone, ms)
    return () => { cancelAnimationFrame(frame); clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role="status"
      aria-label={`กำลังเปิด ${app.name}`}
      onPointerDown={onDone}
      className="absolute inset-0 z-10 bg-paper flex flex-col cursor-pointer"
    >
      <div className="relative flex-1 min-h-0 overflow-hidden bg-zone-sci-soft" aria-hidden="true">
        {!artFailed && (
          <>
            <img src={app.splash} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" />
            <img src={app.splash} alt="" draggable={false} onError={() => setArtFailed(true)} className="relative w-full h-full object-contain p-4" />
          </>
        )}
      </div>
      <div className="shrink-0 flex flex-col items-center gap-3 px-6 py-5 border-t-2 border-hairline">
        <div className="flex items-center gap-3 max-w-full">
          <AppTile app={app} size={52} />
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xl leading-tight truncate">{app.name}</h2>
            {app.tagline && <p className="thai-font text-xs text-ink-soft truncate">{app.tagline}</p>}
          </div>
        </div>
        <div className="w-full max-w-sm h-2 rounded-full bg-mist overflow-hidden" aria-hidden="true">
          <span className="block h-full rounded-full bg-brand-strong" style={{ width: started ? '100%' : '0%', transition: `width ${ms}ms cubic-bezier(.25,.6,.35,1)` }} />
        </div>
      </div>
    </div>
  )
}
