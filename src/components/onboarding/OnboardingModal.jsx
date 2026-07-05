import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useSelectStore } from '../../stores/useSelectStore'
import { useOnboardingUiStore } from '../../stores/useOnboardingUiStore'
import OnboardingIntro from './OnboardingIntro'
import MbtiStep from './MbtiStep'
import CareerStep from './CareerStep'
import MasteryStep from './MasteryStep'
import UniversityStep from './UniversityStep'
import ProgramStep from './ProgramStep'
import Popup from '../ui/Popup'

// 0 intro → 1 MBTI → 2 Career → 3 Mastery → 4 University → 5 Program.
// MBTI stays outside WizardStepper's dots (matching today's behavior); each
// step component owns its own StepScreen `step` index for the 4-dot tracker.
const STEP_COMPONENTS = [OnboardingIntro, MbtiStep, CareerStep, MasteryStep, UniversityStep, ProgramStep]
const LAST_STEP = STEP_COMPONENTS.length - 1

// Full-viewport overlay that walks a signed-in user through onboarding.
// Visible when forced open (ProfilePanel "Edit your path" / SettingsSheet
// reset) or when the user has no `program` yet (first-visit gate). Never
// resets useSelectStore — re-entry shows existing selections, not blank ones.
function OnboardingModal() {
  const user = useAuthStore((s) => s.user)
  const program = useSelectStore((s) => s.program)
  const forceOpen = useOnboardingUiStore((s) => s.forceOpen)
  const close = useOnboardingUiStore((s) => s.close)
  const [step, setStep] = useState(0)

  const visible = forceOpen || (!!user && !program)

  useEffect(() => {
    if (visible) setStep(0)
  }, [visible])

  if (!visible) return null

  function handleNext() {
    if (step === LAST_STEP) {
      // Program step already committed the selection; program becoming
      // truthy plus clearing forceOpen here is what hides the modal.
      close()
      return
    }
    setStep((s) => Math.min(s + 1, LAST_STEP))
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  const StepComponent = STEP_COMPONENTS[step]

  return (
    <Popup variant="center" size="lg" maxHeight="max-h-[100vh]" backdrop={false} navSafe={false} onClose={close}>
      <StepComponent onNext={handleNext} onBack={handleBack} />
    </Popup>
  )
}

export default OnboardingModal
