import TopBar from '../TopBar'
import Button from '../ui/Button'

const whyBg = new URL('../../../assets/eachPageAssets/why/02_Review_Background.png', import.meta.url).href

// Step 0 of OnboardingModal — ex-WhyPage marketing content, shown before the
// stepper-tracked select steps (MBTI/Career/Mastery/University/Program).
function OnboardingIntro({ onNext }) {
  return (
    <section
      className="relative h-full overflow-y-auto"
      style={{
        backgroundImage: `url(${whyBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <TopBar />

      {/* Hero */}
      <div className="mx-auto max-w-3xl px-5 pt-1 text-center">
        <h1 className="title-soft-gradient pixel-font text-3xl md:text-4xl leading-snug">We Start With Why?</h1>
        <div
          className="mt-3 space-y-1 text-black/80"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
        >
          <p className="text-left text-xs font-bold">ทำไมเด็กไทยดรอปเรียนในระดับอุดมศึกษา?</p>
          <p className="text-right text-xs font-bold">ทำไมถึงไม่สนใจเรียน?</p>
          <p className="pl-6 text-xs">ทำไมถึงไม่เห็นความคุ้มค่า?</p>
          <p className="text-left text-xs font-bold">ทำไมไม่เห็นภาพอนาคต?</p>
          <p className="text-right text-sm font-black text-black">ทำไมถึงไม่มีเป้าหมาย?</p>
        </div>
      </div>

      {/* Main content */}
      <div
        className="mx-auto max-w-3xl px-5 pb-28 pt-5 text-center text-black"
        style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
      >
        <p className="text-lg font-bold leading-tight">
          เด็กไทยขาด <span className="font-black">เป้าหมาย</span>
        </p>
        <p className="text-base leading-tight">ต้องการค้นหา/พัฒนาตัวเอง</p>

        <p className="mt-6 text-sm font-bold">เกิดความเสียหายโดยรวมต่อปี</p>

        {/* Stats row */}
        <div className="mt-2 grid grid-cols-3 gap-1 md:gap-4 text-center">
          <div>
            <p className="title-soft-gradient pixel-font text-2xl md:text-3xl">12B</p>
            <p className="text-xs font-bold">บาทต่อปี</p>
            <p className="text-xs leading-tight text-black/60">มูลค่าความเสียหายต่อปี</p>
          </div>
          <div>
            <p className="title-soft-gradient pixel-font text-2xl md:text-3xl">100k+</p>
            <p className="text-xs font-bold">คนต่อปี</p>
            <p className="text-xs leading-tight text-black/60">จำนวนเด็กซิ่วโดยประมาณ</p>
          </div>
          <div>
            <p className="title-soft-gradient pixel-font text-2xl md:text-3xl">120k</p>
            <p className="text-xs font-bold">บาทต่อปี</p>
            <p className="text-xs leading-tight text-black/60">ค่าใช้จ่ายการครองชีพ</p>
          </div>
        </div>

        <p className="mt-5 text-sm font-bold">ยังไม่รวมความเสียหายทางอ้อม</p>
        <div className="mt-1 flex justify-between text-xs font-bold">
          <span>ค่าเสียหายทางการเงิน</span>
          <span>ค่าเสียโอกาส</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-black/70">
          ค่าสมัครสอบ, ค่ากวดวิชา, ประสบการณ์การทำงาน, โอกาสเติบโตในอาชีพ
        </p>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40">
        <Button
          onClick={onNext}
          variant="secondary"
          aria-label="Ready to use — continue to onboarding"
        >
          <span className="pixel-font text-[9px]">Ready to use? ▼</span>
        </Button>
      </div>
    </section>
  )
}

export default OnboardingIntro
