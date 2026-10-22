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
              className={`px-card px-btn relative flex flex-col items-center p-3 transition-all ${
                selected ? 'ring-4 ring-lime bg-brand-soft' : ''
              }`}
            >
              {selected && (
                <span className="rpg-coin pixel-font absolute -top-2 -right-2 text-xs" aria-hidden="true">✓</span>
              )}
              <CharacterSprite code={item.code} />
              <p className="pixel-font mt-2 text-xs font-bold text-ink">{item.code}</p>
              <p className="thai-font text-xs text-ink-soft">{item.name}</p>
            </button>
          )
        })}
      </div>

      {description && (
        <div className="px-card mx-auto mt-5 max-w-2xl px-5 py-4">
          <p className="thai-font text-center text-sm leading-relaxed text-brand-strong">
            {description}
          </p>
        </div>
      )}

      <p className="thai-font mx-auto mt-3 max-w-2xl text-center text-xs text-ink-soft">
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
