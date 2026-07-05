import { useMemo, useState } from 'react'
import StepScreen from '../ui/StepScreen'
import CharacterSprite from '../ui/CharacterSprite'
import { mbtiCharacters, mbtiDescriptions } from '../../data/onboardingData'
import { useSelectStore } from '../../stores/useSelectStore'
import { useSelectionCommit } from '../../hooks/useSelectionCommit'

// Step 1 — responsive MBTI card grid (replaces carousel).
function MbtiStep({ onNext, onBack }) {
  const selectedMbti = useSelectStore((state) => state.mbti)
  const setMbti = useSelectStore((state) => state.setMbti)
  const commitMbti = useSelectionCommit(setMbti)
  const [pending, setPending] = useState(selectedMbti)

  const description = useMemo(
    () => (pending ? mbtiDescriptions[pending] : null),
    [pending],
  )

  function handleSelect(code) {
    setPending(code)
    commitMbti(code)
  }

  return (
    <StepScreen
      title="เลือก MBTI"
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!pending}
      hideSearch
    >
      <div className="mx-auto mt-3 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {mbtiCharacters.map((item) => {
          const selected = pending === item.code
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => handleSelect(item.code)}
              aria-pressed={selected}
              aria-label={`${item.code} ${item.name}`}
              className={`flex flex-col items-center rounded-2xl border bg-white p-3 transition-all active:scale-[0.98] ${
                selected ? 'border-brand-strong ring-2 ring-brand-strong bg-brand-soft' : 'border-gray-200 hover:border-brand'
              }`}
            >
              <CharacterSprite code={item.code} />
              <p className="pixel-font mt-2 text-xs font-bold text-ink">{item.code}</p>
              <p className="text-[10px] text-gray-500">{item.name}</p>
            </button>
          )
        })}
      </div>

      {description && (
        <p
          className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-brand-strong"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
        >
          {description}
        </p>
      )}

      <p
        className="mx-auto mt-3 max-w-2xl text-center text-xs text-gray-500"
        style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
      >
        หากต้องการค้นหาตัวเองให้ชัดเจนขึ้น{' '}
        <a
          href="https://personality.co/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-strong underline"
        >
          คลิกที่นี่ (personality.co)
        </a>
      </p>
    </StepScreen>
  )
}

export default MbtiStep
