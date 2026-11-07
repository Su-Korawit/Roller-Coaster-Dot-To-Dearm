import { useEffect, useState } from 'react'
import { INTROS, STEP_MS, FIRST_FRAME_MS, END_HOLD_MS, markIntroSeen } from './introLogic'
import { GoalScene, HabitScene, CommunityScene } from './scenes'
import { ReadingScene, SecretaryScene, ReportScene } from './scenes2'

const SCENES = { goal: GoalScene, habit: HabitScene, community: CommunityScene, reading: ReadingScene, secretary: SecretaryScene, report: ReportScene }

// Full-window story shown before Goal / Habit / Community the first time they open in a session.
// Skippable at any time; when the last caption has been shown the app is revealed.
export default function AppIntro({ introId, onDone }) {
  const intro = INTROS[introId]
  const Scene = SCENES[introId]
  const [step, setStep] = useState(-1)   // -1 = starting frame, then 0..steps-1

  useEffect(() => {
    const last = intro.steps.length - 1
    let t
    if (step === -1) t = setTimeout(() => setStep(0), FIRST_FRAME_MS)
    else if (step < last) t = setTimeout(() => setStep(step + 1), STEP_MS)
    else t = setTimeout(finish, STEP_MS + END_HOLD_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function finish() {
    markIntroSeen(introId)
    onDone()
  }

  return (
    <div className="absolute inset-0 z-10 bg-paper flex flex-col" role="region" aria-label={`แนะนำ ${intro.title}`}>
      <div className="flex-1 min-h-0 flex items-center justify-center bg-zone-sci-soft overflow-hidden">
        <svg viewBox="0 0 400 260" className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <Scene pose={step + 1} />
        </svg>
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
