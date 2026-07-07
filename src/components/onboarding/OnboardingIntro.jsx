import Button from '../ui/Button'

// Step 0 — clean welcome hero before the wizard steps.
function OnboardingIntro({ onNext }) {
  return (
    <section className="onboarding-bg flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center neo-card bg-surface">
          <span className="pixel-font text-3xl text-brand-strong">RC</span>
        </div>

        <h1 className="pixel-title pixel-font text-2xl leading-tight md:text-3xl">
          Roller Coaster
        </h1>
        <p className="thai-font mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
          วางแผนเส้นทางเรียนต่อและอาชีพของคุณแบบเกม — เริ่มจากบุคลิก เป้าหมาย และมหาวิทยาลัยในฝัน
        </p>

        <Button onClick={onNext} className="mt-10 max-w-xs">
          เริ่มเลย
        </Button>
      </div>
    </section>
  )
}

export default OnboardingIntro
