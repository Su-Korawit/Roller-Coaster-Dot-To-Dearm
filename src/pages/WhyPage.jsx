import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'

const whyBg = new URL('../../assets/eachPageAssets/why/02_Review_Background.png', import.meta.url).href

function WhyPage() {
  const navigate = useNavigate()

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

      {/* Hero — floating questions around title */}
      <div className="px-5 pt-1 text-center">
        <h1 className="title-soft-gradient pixel-font text-3xl leading-snug">We Start With Why?</h1>
        <div className="mt-3 space-y-0.5 text-black/80">
          <p className="text-left text-[9px] font-bold">ทำไมเด็กไทยดรอปเรียนในระดับอุดมศึกษา?</p>
          <p className="text-right text-[9px] font-bold">ทำไมถึงไม่สนใจเรียน?</p>
          <p className="pl-6 text-[9px]">ทำไมถึงไม่เห็นความคุ้มค่า?</p>
          <p className="text-left text-[9px] font-bold">ทำไมไม่เห็นภาพอนาคต?</p>
          <p className="text-right text-[10px] font-black text-black">ทำไมถึงไม่มีเป้าหมาย?</p>
        </div>
      </div>

      {/* Main content */}
      <div className="px-5 pb-28 pt-5 text-center text-black">
        <p className="text-lg font-bold leading-tight">
          เด็กไทยขาด <span className="font-black">เป้าหมาย</span>
        </p>
        <p className="text-base leading-tight">ต้องการค้นหา/พัฒนาตัวเอง</p>

        <p className="mt-6 text-sm font-bold">เกิดความเสียหายโดยรวมต่อปี</p>

        {/* Stats row */}
        <div className="mt-2 grid grid-cols-3 gap-1 text-center">
          <div>
            <p className="title-soft-gradient pixel-font text-2xl">12B</p>
            <p className="text-[9px] font-bold">บาทต่อปี</p>
            <p className="text-[8px] leading-tight text-black/65">มูลค่าความเสียหายต่อปี</p>
          </div>
          <div>
            <p className="title-soft-gradient pixel-font text-2xl">100k+</p>
            <p className="text-[9px] font-bold">คนต่อปี</p>
            <p className="text-[8px] leading-tight text-black/65">จำนวนเด็กซิ่วโดยประมาณ</p>
          </div>
          <div>
            <p className="title-soft-gradient pixel-font text-2xl">120k</p>
            <p className="text-[9px] font-bold">บาทต่อปี</p>
            <p className="text-[8px] leading-tight text-black/65">ค่าใช้จ่ายการครองชีพ</p>
          </div>
        </div>

        <p className="mt-5 text-sm font-bold">ยังไม่รวมความเสียหายทางอ้อม</p>
        <div className="mt-1 flex justify-between text-[10px] font-bold">
          <span>ค่าเสียหายทางการเงิน</span>
          <span>ค่าเสียโอกาส</span>
        </div>
        <p className="mt-1 text-[9px] leading-relaxed text-black/75">
          ค่าสมัครสอบ, ค่ากวดวิชา, ประสบการณ์การทำงาน, โอกาสเติบโตในอาชีพ
        </p>
      </div>

      <button
        onClick={() => navigate('/')}
        className="pixel-font absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-white"
      >
        <p className="text-xs">Ready to use?</p>
        <p className="text-2xl leading-none">▼</p>
      </button>
    </section>
  )
}

export default WhyPage
