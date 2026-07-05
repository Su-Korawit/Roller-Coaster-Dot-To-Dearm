import TopBar from '../TopBar'
import WizardStepper from '../WizardStepper'
import SearchBar from './SearchBar'
import ProgressRing from './ProgressRing'

/**
 * StepScreen — shared layout shell for onboarding wizard steps.
 * Redesigned chrome: optional progress ring, Thai CTAs, sticky footer.
 */
export default function StepScreen({
  step,
  title,
  subtitle,
  maxWidth = 'max-w-4xl',
  searchValue,
  onSearchChange,
  searchLabel,
  onNext,
  onBack,
  nextDisabled,
  nextLabel = 'ถัดไป',
  progress,
  children,
  attribution,
  hideSearch = false,
}) {
  return (
    <section className="onboarding-bg flex h-full flex-col">
      <TopBar />

      <div className={`mx-auto w-full ${maxWidth} shrink-0 px-6 pt-4`}>
        <div className="flex items-start justify-between gap-3">
          <h1 className="title-gradient pixel-font text-xl leading-tight">{title}</h1>
          {progress && (
            <ProgressRing value={progress.value} total={progress.total} label={progress.label} />
          )}
        </div>
        <WizardStepper step={step} />
        {subtitle && <div className="mb-1">{subtitle}</div>}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-2">
        {children}
      </div>

      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-white/60">
        <div className={`mx-auto w-full ${maxWidth} px-6 py-3 space-y-3`}>
          {!hideSearch && onSearchChange && (
            <SearchBar
              value={searchValue}
              onChange={onSearchChange}
              label={searchLabel}
            />
          )}
          <div className="flex gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm text-gray-600"
              >
                ย้อนกลับ
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="flex-1 rounded-2xl bg-brand-strong text-white py-3 text-sm font-semibold disabled:opacity-50"
            >
              {nextLabel}
            </button>
          </div>
          {attribution && (
            <p
              className="text-center text-[10px] text-gray-400"
              style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
            >
              {attribution}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
