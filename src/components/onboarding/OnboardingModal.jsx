import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/useAuthStore'
import { usePlansStore } from '../../stores/usePlansStore'
import { useOnboardingUiStore } from '../../stores/useOnboardingUiStore'
import { usePopupStore } from '../../stores/usePopupStore'
import { syncSelectToFirestore } from '../../utils/syncSelectToFirestore'
import OnboardingIntro from './OnboardingIntro'
import MbtiStep from './MbtiStep'
import PlansHub from './PlansHub'
import UniversityStep from './UniversityStep'
import ProgramStep from './ProgramStep'
import Popup from '../ui/Popup'

const LAST_MAIN_STEP = 2

// Full-viewport overlay that walks a signed-in user through onboarding.
// Visible when forced open (ProfilePanel "Edit your path" / SettingsSheet
// reset) or when the user has no committed plan yet (first-visit gate). Never
// resets useSelectStore — re-entry shows existing selections, not blank ones.
function OnboardingModal() {
  const user = useAuthStore((s) => s.user)
  const plans = usePlansStore((s) => s.plans)
  const forceOpen = useOnboardingUiStore((s) => s.forceOpen)
  const close = useOnboardingUiStore((s) => s.close)
  const hasCommittedPlan = plans.some((plan) => plan.program)
  const [step, setStep] = useState(0)
  const [subStep, setSubStep] = useState(null)

  const visible = forceOpen || (!!user && !hasCommittedPlan)

  useEffect(() => {
    if (!visible) return
    usePopupStore.getState().close()
    setStep(forceOpen ? LAST_MAIN_STEP : 0)
    setSubStep(null)
  }, [visible, forceOpen])

  if (!visible) return null

  function handleNext() {
    setStep((s) => Math.min(s + 1, LAST_MAIN_STEP))
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function handleEditPlan(planId) {
    usePlansStore.getState().setActivePlan(planId)
    setSubStep('university')
    const uid = useAuthStore.getState().user?.uid
    if (uid) syncSelectToFirestore(uid)
  }

  function renderCurrentStep() {
    if (step === 0) return <OnboardingIntro onNext={handleNext} onBack={handleBack} />
    if (step === 1) return <MbtiStep onNext={handleNext} onBack={handleBack} />
    if (subStep === 'university') {
      return <UniversityStep onNext={() => setSubStep('program')} onBack={() => setSubStep(null)} />
    }
    if (subStep === 'program') {
      return <ProgramStep onNext={() => setSubStep(null)} onBack={() => setSubStep('university')} />
    }
    return <PlansHub onEditPlan={handleEditPlan} onNext={close} onBack={handleBack} />
  }

  return (
    <Popup variant="center" size="lg" maxHeight="max-h-[100vh]" backdrop={false} navSafe={false} onClose={close}>
      {renderCurrentStep()}
    </Popup>
  )
}

export default OnboardingModal
