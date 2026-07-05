import StepScreen from '../ui/StepScreen'
import { programs, universities } from '../../data/onboardingData'
import { tcasLogoUrl } from '../../hooks/useMytcas'
import { usePlansStore } from '../../stores/usePlansStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { syncSelectToFirestore } from '../../utils/syncSelectToFirestore'

const MAX_PLANS = 10

function ProgressRing({ value, max }) {
  const safeValue = Math.min(value, max)
  const radius = 32
  const circumference = 2 * Math.PI * radius
  const progress = safeValue / max
  const dash = `${circumference * progress} ${circumference}`

  return (
    <div className="relative h-20 w-20">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} className="fill-none stroke-brand-soft" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className="fill-none stroke-brand"
          strokeWidth="8"
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="pixel-font text-xs text-ink">{safeValue}/{max}</span>
      </div>
    </div>
  )
}

function PlanCard({ plan, selected, onSelect, onDelete }) {
  const university = universities.find((item) => item.id === plan.university)
  const program = programs.find((item) => item.id === plan.program)
  const uniName = university?.name ?? plan.university ?? 'ยังไม่ได้เลือกมหาวิทยาลัย'
  const programName = program?.name ?? plan.program ?? 'ยังไม่ได้เลือกหลักสูตร'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={`
        flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left
        transition-all hover:shadow-md active:scale-[0.98]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
        ${selected ? 'ring-4 ring-pink-400 shadow-md' : 'ring-0 shadow-sm'}
      `}
      aria-label={planName(plan)}
    >
      {plan.university ? (
        <img
          src={tcasLogoUrl(plan.university)}
          alt={uniName}
          className="h-12 w-12 rounded-xl bg-brand-soft object-contain p-1"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
          🧭
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="pixel-font truncate text-xs text-ink">{uniName}</p>
        <p className="mt-1 truncate text-xs text-gray-500 thai-font">{programName}</p>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
        className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-100"
        aria-label={`Delete ${planName(plan)}`}
      >
        ลบ
      </button>
    </div>
  )
}

function planName(plan) {
  return `Plan ${plan.id}`
}

export default function PlansHub({ onEditPlan, onNext, onBack }) {
  const plans = usePlansStore((state) => state.plans)
  const activePlanId = usePlansStore((state) => state.activePlanId)
  const addPlan = usePlansStore((state) => state.addPlan)
  const removePlan = usePlansStore((state) => state.removePlan)
  const setActivePlan = usePlansStore((state) => state.setActivePlan)
  const uid = useAuthStore((state) => state.user?.uid)

  const handleAdd = () => {
    if (plans.length >= MAX_PLANS) return
    const newId = addPlan()
    onEditPlan(newId)
  }

  async function handleFinish() {
    if (uid) await syncSelectToFirestore(uid)
    onNext()
  }

  async function handleSelectPlan(planId) {
    setActivePlan(planId)
    if (uid) await syncSelectToFirestore(uid)
    onEditPlan(planId)
  }

  return (
    <StepScreen
      step={3}
      title="Plans Hub"
      subtitle={
        <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
          <div>
            <p className="pixel-font text-xs text-ink">เป้าหมายมหาลัยของฉัน</p>
            <p className="thai-font mt-1 text-xs text-gray-500">สร้างได้สูงสุด {MAX_PLANS} แผน</p>
          </div>
          <ProgressRing value={plans.length} max={MAX_PLANS} />
        </div>
      }
      searchValue=""
      onSearchChange={() => {}}
      searchLabel="Plans Hub"
      onNext={handleFinish}
      nextDisabled={plans.length === 0}
    >
      <div className="mx-auto mt-3 w-full max-w-3xl space-y-4 pb-4">
        {plans.length === 0 ? (
          <div className="rounded-2xl bg-white/70 px-4 py-6 text-center shadow-sm">
            <p className="thai-font text-sm text-gray-500">ยังไม่มีแผน กด + เพื่อเพิ่มแผนแรกของคุณ</p>
          </div>
        ) : (
          plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={plan.id === activePlanId}
              onSelect={() => handleSelectPlan(plan.id)}
              onDelete={() => removePlan(plan.id)}
            />
          ))
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-white/70 bg-white/70 px-4 py-2 text-xs font-bold text-gray-600 shadow-sm"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white shadow-md transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-brand/50"
            aria-label="Add plan"
            disabled={plans.length >= MAX_PLANS}
          >
            +
          </button>
        </div>
      </div>
    </StepScreen>
  )
}
