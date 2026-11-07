import { useEffect, useRef, useState } from 'react'
import { AppTile } from '../AppIcon'
import { splashDuration, splashPercent, splashStatus } from './splashLogic'

// Launch screen of an app window, in the style of a desktop app's splash: full-bleed key art, the
// app logo + name + tagline bottom-left, a status line with the percentage, and a thin progress
// bar on the bottom edge. Landscape: text sits over the art (calm area on the left, with a scrim).
// Portrait: the art fills the top, text sits on a dark panel below. It covers the window while the
// app loads underneath; a tap/click skips it.
export default function AppSplash({ app, onDone }) {
  const [pct, setPct] = useState(0)
  const [artFailed, setArtFailed] = useState(false)
  const done = useRef(onDone)
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const ms = splashDuration(reduced)

  useEffect(() => {
    let raf = 0
    let last = -1
    const t0 = performance.now()
    const tick = (now) => {
      const p = splashPercent(now - t0, ms)
      if (p !== last) { last = p; setPct(p) }
      if (now - t0 < ms) raf = requestAnimationFrame(tick)
      else done.current()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ms])

  return (
    <div
      role="status"
      aria-label={`กำลังเปิด ${app.name}`}
      onPointerDown={() => done.current()}
      className="absolute inset-0 z-10 bg-ink text-white flex flex-col md:block overflow-hidden cursor-pointer"
    >
      {/* Key art */}
      <div className="relative h-[58%] md:h-full md:absolute md:inset-0 shrink-0" aria-hidden="true">
        {!artFailed && (
          <img
            src={app.splash}
            alt=""
            draggable={false}
            onError={() => setArtFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-[60%_40%]"
          />
        )}
        {/* legibility scrims: left edge on landscape, bottom edge on portrait */}
        <span className="absolute inset-0 hidden md:block" style={{ background: 'linear-gradient(0deg, rgb(43 37 80 / 0.94) 0%, rgb(43 37 80 / 0.78) 22%, rgb(43 37 80 / 0.25) 46%, transparent 62%), linear-gradient(90deg, rgb(43 37 80 / 0.45) 0%, transparent 38%)' }} />
        <span className="absolute inset-x-0 bottom-0 h-1/3 md:hidden" style={{ background: 'linear-gradient(0deg, var(--color-ink), transparent)' }} />
      </div>

      {/* Wordmark */}
      <p className="hidden md:flex absolute top-5 left-6 items-center gap-2 font-display font-bold text-sm tracking-wide">
        I LOVE TCAS <span className="px-2 py-0.5 rounded-full bg-white/15 text-xs font-semibold">TCAS70</span>
      </p>

      {/* App identity + status */}
      <div className="relative md:absolute md:left-6 md:bottom-9 md:max-w-[min(420px,60%)] flex-1 md:flex-none flex flex-col justify-center md:justify-end gap-3 px-6 md:px-0 pb-8 md:pb-0">
        <div className="flex items-center gap-4">
          <AppTile app={app} size={64} />
          <div className="min-w-0">
            <h2 className="font-display font-bold text-3xl leading-none truncate">{app.name}</h2>
            {app.tagline && <p className="thai-font text-sm mt-1.5 opacity-90 line-clamp-2">{app.tagline}</p>}
          </div>
        </div>
        <p className="thai-font text-xs opacity-80 flex items-center justify-between gap-3">
          <span>{splashStatus(pct)}…</span>
          <span className="tabular-nums">{pct}%</span>
        </p>
      </div>

      {/* Thin progress bar on the bottom edge */}
      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/15" aria-hidden="true">
        <span className="block h-full bg-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
