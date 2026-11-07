import { useEffect, useState } from 'react'
import { INTROS, INTRO_FRAMES, introFrameUrl, pickVideoUrl, stepDuration, FIRST_FRAME_MS, END_HOLD_MS, markIntroSeen } from './introLogic'
import { GoalScene, HabitScene, CommunityScene } from './scenes'
import { ReadingScene, SecretaryScene, ReportScene } from './scenes2'

const SCENES = { goal: GoalScene, habit: HabitScene, community: CommunityScene, reading: ReadingScene, secretary: SecretaryScene, report: ReportScene }

const mq = (q) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null)

// True while the screen is taller than wide (phones held upright): picks the 9:16 video.
function useMatches(query) {
  const [on, setOn] = useState(() => mq(query)?.matches ?? false)
  useEffect(() => {
    const m = mq(query)
    if (!m) return undefined
    const change = () => setOn(m.matches)
    m.addEventListener('change', change)
    return () => m.removeEventListener('change', change)
  }, [query])
  return on
}

// Full-window story shown before Goal / Habit / Community the first time they open in a session.
// Skippable at any time; when the last caption has been shown the app is revealed.
export default function AppIntro({ introId, onDone }) {
  const intro = INTROS[introId]
  const Scene = SCENES[introId]
  const [step, setStep] = useState(-1)   // -1 = starting frame, then 0..steps-1
  const [framesFailed, setFramesFailed] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [videoSec, setVideoSec] = useState(0)
  const portrait = useMatches('(orientation: portrait)')
  const reduceMotion = useMatches('(prefers-reduced-motion: reduce)')
  // A video only plays when there is one for this app, motion is allowed and it loaded.
  const videoUrl = videoFailed || reduceMotion ? null : pickVideoUrl(introId, portrait)
  const stepMs = stepDuration(intro.steps.length, videoUrl ? videoSec : 0)
  const frameCount = framesFailed ? 0 : (INTRO_FRAMES[introId] ?? 0)

  useEffect(() => {
    const last = intro.steps.length - 1
    let t
    if (step === -1) t = setTimeout(() => setStep(0), FIRST_FRAME_MS)
    else if (step < last) t = setTimeout(() => setStep(step + 1), stepMs)
    else t = setTimeout(finish, stepMs + END_HOLD_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stepMs])

  function finish() {
    markIntroSeen(introId)
    onDone()
  }

  return (
    <div className="absolute inset-0 z-10 bg-paper flex flex-col" role="region" aria-label={`แนะนำ ${intro.title}`}>
      <div className="flex-1 min-h-0 flex items-center justify-center bg-zone-sci-soft overflow-hidden">
        {videoUrl ? (
          <div className="relative w-full h-full" aria-hidden="true">
            <img src={introFrameUrl(introId, 1)} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" draggable={false} />
            <video
              key={videoUrl}
              src={videoUrl}
              poster={introFrameUrl(introId, 1)}
              muted
              playsInline
              autoPlay
              preload="auto"
              className="relative w-full h-full object-contain"
              onLoadedMetadata={(e) => setVideoSec(e.currentTarget.duration || 0)}
              onError={() => setVideoFailed(true)}
            />
          </div>
        ) : frameCount > 0 ? (
          <div className="relative w-full h-full" aria-hidden="true">
            {Array.from({ length: frameCount }, (_, i) => i + 1).map((n) => (
              <div key={n} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: n === Math.max(step, 0) + 1 ? 1 : 0 }}>
                <img src={introFrameUrl(introId, n)} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" draggable={false} />
                <img src={introFrameUrl(introId, n)} alt="" className="relative w-full h-full object-contain p-3" draggable={false} onError={() => setFramesFailed(true)} />
              </div>
            ))}
          </div>
        ) : (
          <svg viewBox="0 0 400 260" className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <Scene pose={step + 1} />
          </svg>
        )}
      </div>
      <div className="shrink-0 flex flex-col items-center gap-3 px-4 py-4 border-t-2 border-hairline">
        <p key={step} className="thai-font font-bold text-lg text-center min-h-[1.75rem] animate-pop" aria-live="polite">
          {step >= 0 ? intro.steps[step] : ''}
        </p>
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            {intro.steps.map((_, i) => (
              <span key={i} className={`h-2 rounded-full bg-brand-strong transition-all ${i === step ? 'w-6' : 'w-2 opacity-30'}`} />
            ))}
          </span>
          <button type="button" onClick={finish} className="px-btn px-4 py-1.5 thai-font text-xs font-bold bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            ข้าม
          </button>
        </div>
      </div>
    </div>
  )
}
