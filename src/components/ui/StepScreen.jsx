import SearchBar from './SearchBar'

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
        <h1 className="title-gradient pixel-font text-xl leading-tight">{title}</h1>
        {subtitle && <div className="mb-1 mt-2">{subtitle}</div>}
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
            <p className="thai-font text-center text-[10px] text-gray-400">
              {attribution}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
