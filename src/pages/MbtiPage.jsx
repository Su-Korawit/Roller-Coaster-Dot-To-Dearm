import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import CharacterSprite from '../components/ui/CharacterSprite'
import { mbtiCharacters, mbtiDescriptions } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'
import { useAuthStore } from '../stores/useAuthStore'
import { syncSelectToFirestore } from '../utils/syncSelectToFirestore'

const mbtiBg = new URL('../../assets/eachPageAssets/mbti/03_Setup_MBTI_Background.png', import.meta.url).href

function MbtiPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const selectedMbti = useSelectStore((state) => state.mbti)
  const setMbti = useSelectStore((state) => state.setMbti)

  const current = useMemo(() => mbtiCharacters[index], [index])
  const isSelected = selectedMbti === current.code

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

      <div className="mx-auto max-w-md md:max-w-lg px-6 pb-5">
        <h1 className="title-gradient pixel-font text-xl md:text-2xl leading-tight">Select your MBTI</h1>

        <p className="pixel-font mt-2 text-base md:text-lg font-bold text-black">
          {current.code} - {current.name}
        </p>

        <div className="mt-7 flex justify-center">
          <CharacterSprite code={current.code} />
        </div>

        <p
          className="mt-4 text-sm leading-relaxed text-center"
          style={{ color: '#5D3FD3', fontFamily: "'Noto Sans Thai', sans-serif" }}
        >
          {mbtiDescriptions[current.code]}
        </p>

        <p
          className="mt-2 text-xs leading-relaxed text-black/70"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
        >
          เลือกบุคลิกที่ใกล้กับตัวคุณมากที่สุด เพื่อใช้ในการแนะนำเส้นทางเรียนต่อและอาชีพ{' '}
          หากคุณต้องการค้นหาตัวเองให้ชัดเจนขึ้น{' '}
          <a
            href="https://personality.co/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
          >
            คลิกที่นี่ (personality.co)
          </a>
        </p>

        <div className="mt-8 grid grid-cols-3 overflow-hidden rounded-[28px] border border-black/20 bg-white/95 text-center shadow-sm">
          <button
            onClick={() => setIndex((prev) => (prev === 0 ? mbtiCharacters.length - 1 : prev - 1))}
            aria-label="Previous MBTI type"
            className="pixel-font border-r border-black/20 px-3 py-4 text-xs text-gray-600
              hover:bg-gray-50 active:bg-gray-100 transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
          >
            ◀ Prev
          </button>
          <button
            onClick={() => {
              setMbti(current.code)
              syncSelectToFirestore(useAuthStore.getState().user?.uid)
              navigate('/select/career')
            }}
            aria-label={`Select ${current.code}`}
            aria-pressed={isSelected}
            className={`pixel-font px-3 py-4 text-sm transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand
              ${isSelected
                ? 'bg-pink-100 text-pink-500 font-bold'
                : 'text-brand/60 hover:bg-brand-soft hover:text-brand-strong'}`}
          >
            Select
          </button>
          <button
            onClick={() => setIndex((prev) => (prev + 1) % mbtiCharacters.length)}
            aria-label="Next MBTI type"
            className="pixel-font border-l border-black/20 px-3 py-4 text-xs text-gray-600
              hover:bg-gray-50 active:bg-gray-100 transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
          >
            Next ▶
          </button>
        </div>
      </div>
    </section>
  )
}

export default MbtiPage
