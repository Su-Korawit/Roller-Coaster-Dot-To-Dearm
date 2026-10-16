import SearchBar from './SearchBar'
import Button from './Button'

/**
 * StepScreen — shared layout shell for onboarding wizard steps.
 * Title + optional search + sticky Back/Next footer only (no stepper, no header nav).
 */
export default function StepScreen({
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
  children,
  attribution,
  hideSearch = false,
}) {
  return (
    <section className="onboarding-bg flex h-full flex-col">
      <div className={`mx-auto w-full ${maxWidth} shrink-0 px-6 pt-6`}>
        <div className="px-card px-4 py-3">
          <h1 className="font-display text-xl font-bold text-ink leading-tight">{title}</h1>
          {subtitle && <div className="mt-2">{subtitle}</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-2">
        {children}
      </div>

      <div className="sticky bottom-0 bg-paper border-t-2 border-line">
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
                className="px-btn flex-1 rounded-slot bg-paper py-3 thai-font text-sm text-ink"
              >
                ย้อนกลับ
              </button>
            )}
            <Button onClick={onNext} disabled={nextDisabled} className="flex-1">
              {nextLabel}
            </Button>
          </div>
          {attribution && (
            <p className="thai-font text-center text-[10px] text-ink-soft">
              {attribution}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
