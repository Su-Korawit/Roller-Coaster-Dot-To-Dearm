import TopBar from '../TopBar'
import WizardStepper from '../WizardStepper'
import SearchBar from './SearchBar'
import Button from './Button'

/**
 * StepScreen — shared layout shell for the 4 wizard select pages.
 * Collapses the duplicated: onboarding-bg section → TopBar → title + stepper
 * + optional subtitle → scrollable content → sticky footer (search + Next).
 *
 * Props:
 *   step         number   - WizardStepper step (0-3)
 *   title        string   - Page heading (pixel-font + title-gradient)
 *   subtitle     node     - Optional element below stepper (h2 text, back btn, etc.)
 *   maxWidth     string   - Tailwind max-w class for content (default 'max-w-4xl')
 *   searchValue  string
 *   onSearchChange fn
 *   searchLabel  string   - aria-label for search input
 *   onNext       fn
 *   nextDisabled bool
 *   children     node     - The scrollable card grid / list
 *   attribution  string   - Optional small print below Next (e.g., O*NET)
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
  nextDisabled,
  children,
  attribution,
}) {
  return (
    <section className="onboarding-bg flex h-full flex-col">
      <TopBar />

      <div className={`mx-auto w-full ${maxWidth} shrink-0 px-6 pt-4`}>
        <h1 className="title-gradient pixel-font text-xl leading-tight">{title}</h1>
        <WizardStepper step={step} />
        {subtitle && <div className="mb-1">{subtitle}</div>}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-2">
        {children}
      </div>

      <div className="shrink-0 border-t border-white/60 bg-white/50 backdrop-blur-md">
        <div className={`mx-auto w-full ${maxWidth} px-6 py-4 space-y-3`}>
          <SearchBar
            value={searchValue}
            onChange={onSearchChange}
            label={searchLabel}
          />
          <Button onClick={onNext} disabled={nextDisabled}>
            Next
          </Button>
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
