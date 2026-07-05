// Step 0 — clean welcome hero before the wizard steps.
function OnboardingIntro({ onNext }) {
  return (
    <section className="onboarding-bg flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-soft shadow-inner">
          <span className="pixel-font text-3xl text-brand-strong">RC</span>
        </div>

        <h1 className="title-gradient pixel-font text-2xl leading-tight md:text-3xl">
          Roller Coaster
        </h1>
        <p
          className="mt-3 max-w-sm text-sm leading-relaxed text-gray-600"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
        >
          วางแผนเส้นทางเรียนต่อและอาชีพของคุณแบบเกม — เริ่มจากบุคลิก เป้าหมาย และมหาวิทยาลัยในฝัน
        </p>

        <button
          type="button"
          onClick={onNext}
          className="mt-10 w-full max-w-xs rounded-2xl bg-brand-strong px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand active:scale-[0.98]"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
        >
          เริ่มเลย
        </button>
      </div>
    </section>
  )
}

export default OnboardingIntro
