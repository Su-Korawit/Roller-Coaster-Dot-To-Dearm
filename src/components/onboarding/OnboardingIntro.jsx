import Button from '../ui/Button'
import CharacterSprite from '../ui/CharacterSprite'
import SceneBackdrop from '../landing/SceneBackdrop'

// Step 0 — title screen before the wizard steps: pixel scenery, a wooden sign,
// the cast strolling by, and a single leaf-green start button.
function OnboardingIntro({ onNext }) {
  return (
    <section className="relative flex h-full flex-col overflow-hidden">
      <SceneBackdrop position="center 55%" shade={0.45} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <div className="px-card px-8 pt-6 pb-6 animate-pop">
          <h1 className="pixel-title wordmark-font text-2xl leading-tight md:text-3xl">
            I LOVE TCAS
          </h1>
          <p className="thai-font mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            วางแผนเส้นทางเรียนต่อและอาชีพของคุณแบบเกม — เริ่มจากบุคลิก เป้าหมาย และมหาวิทยาลัยในฝัน
          </p>
        </div>

        <div className="mt-4 flex gap-1 sm:gap-4" aria-hidden="true">
          {['INTJ', 'ENFP', 'ISTP', 'ESFJ'].map((code) => (
            <CharacterSprite key={code} code={code} scale={2} />
          ))}
        </div>

        <Button onClick={onNext} className="mt-6 max-w-xs">
          เริ่มเลย
        </Button>
      </div>
    </section>
  )
}

export default OnboardingIntro
