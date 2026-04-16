import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { mbtiCharacters } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'

const mbtiBg = new URL('../../assets/eachPageAssets/mbti/03_Setup_MBTI_Background.png', import.meta.url).href

function MbtiPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const selectedMbti = useSelectStore((state) => state.mbti)
  const setMbti = useSelectStore((state) => state.setMbti)

  const current = useMemo(() => mbtiCharacters[index], [index])

  return (
    <section
      className="h-full overflow-hidden"
      style={{
        backgroundImage: `url(${mbtiBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <TopBar icon="◎" />

      <div className="px-6 pb-5">
        <h1 className="title-gradient pixel-font text-xl leading-tight">Select your MBTI</h1>
        <p className="pixel-font mt-2 text-base font-bold text-black">{current.code} - {current.name}</p>

        <div className="mt-7 flex justify-center">
          <img src={current.image} alt={current.code} className="h-52 w-auto object-contain" />
        </div>

        <p className="pixel-font mt-2 text-[10px] leading-relaxed text-black/70">
          เลือกบุคลิกที่ใกล้กับตัวคุณมากที่สุด เพื่อใช้ในการแนะนำเส้นทางเรียนต่อและอาชีพ
        </p>

        <div className="mt-8 grid grid-cols-3 overflow-hidden rounded-[28px] border border-black/20 bg-white/95 text-center">
          <button
            onClick={() => setIndex((prev) => (prev === 0 ? mbtiCharacters.length - 1 : prev - 1))}
            className="pixel-font border-r border-black/20 px-3 py-4 text-xs"
          >
            ◀ Prev
          </button>
          <button
            onClick={() => setMbti(current.code)}
            className={`pixel-font px-3 py-4 text-sm ${selectedMbti === current.code ? 'text-pink-500' : 'text-[#beb6d9]'}`}
          >
            Select
          </button>
          <button
            onClick={() => setIndex((prev) => (prev + 1) % mbtiCharacters.length)}
            className="pixel-font border-l border-black/20 px-3 py-4 text-xs"
          >
            Next ▶
          </button>
        </div>

        <button
          onClick={() => navigate('/select/career')}
          disabled={!selectedMbti}
          className="pixel-font mt-4 h-11 w-full rounded-2xl bg-sky-300 text-sm text-black disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  )
}

export default MbtiPage
