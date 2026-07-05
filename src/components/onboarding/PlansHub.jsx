import { Trash2 } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import StepScreen from '../ui/StepScreen'
import ProgressRing from '../ui/ProgressRing'
import { programs, universities } from '../../data/onboardingData'
import { tcasLogoUrl, useTcasRounds } from '../../hooks/useMytcas'
import { usePlansStore } from '../../stores/usePlansStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { syncSelectToFirestore } from '../../utils/syncSelectToFirestore'

const MAX_PLANS = 10

function ProgramRoundTags({ programId }) {
  const { rounds } = useTcasRounds(programId)
  if (!rounds.length) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {rounds.map((r) => (
        <span
          key={r.id ?? r.round}
          className="rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-medium text-black"
        >
          {r.name ?? `รอบ ${r.round}`}
        </span>
      ))}
    </div>
  )
}

function PlanCard({ plan, selected, onSelect, onDelete, dragHandleProps }) {
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
      className={`flex w-full items-start gap-3 rounded-2xl border bg-white p-4 text-left transition-all hover:shadow-md active:scale-[0.98] ${
        selected ? 'border-brand-strong ring-2 ring-brand-strong bg-brand-soft' : 'border-gray-200'
      }`}
      aria-label={`แผน ${plan.id}`}
      {...dragHandleProps}
    >
      {plan.university ? (
        <img
          src={tcasLogoUrl(plan.university)}
          alt={uniName}
          className="h-12 w-12 shrink-0 rounded-xl bg-brand-soft object-contain p-1"
          onError={(event) => { event.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          🧭
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{uniName}</p>
        <p className="mt-0.5 truncate text-xs text-gray-500">{programName}</p>
        {plan.program && <ProgramRoundTags programId={plan.program} />}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
        className="shrink-0 rounded-xl p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
        aria-label={`ลบแผน ${plan.id}`}
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

export default function PlansHub({ onEditPlan, onNext, onBack }) {
  const plans = usePlansStore((state) => state.plans)
  const activePlanId = usePlansStore((state) => state.activePlanId)
  const addPlan = usePlansStore((state) => state.addPlan)
  const removePlan = usePlansStore((state) => state.removePlan)
  const reorderPlans = usePlansStore((state) => state.reorderPlans)
  const setActivePlan = usePlansStore((state) => state.setActivePlan)
  const uid = useAuthStore((state) => state.user?.uid)

  const remaining = MAX_PLANS - plans.length

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

  function handleDragEnd(result) {
    if (!result.destination) return
    reorderPlans(result.source.index, result.destination.index)
    if (uid) syncSelectToFirestore(uid)
  }

  return (
    <div className="relative flex h-full flex-col">
      <StepScreen
        step={3}
        title="เปรียบเทียบแผน"
        subtitle={
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">เป้าหมายมหาลัยของฉัน</p>
              <p className="text-xs text-gray-500">เพิ่มได้อีก {remaining} โปรแกรม</p>
            </div>
            <ProgressRing
              value={plans.length}
              total={MAX_PLANS}
              label={remaining > 0 ? `เพิ่มได้อีก ${remaining}` : `${plans.length}/${MAX_PLANS}`}
            />
          </div>
        }
        searchValue=""
        onSearchChange={() => {}}
        searchLabel="Plans Hub"
        onNext={handleFinish}
        onBack={onBack}
        nextDisabled={plans.length === 0}
        nextLabel="เสร็จสิ้น"
        hideSearch
      >
        <div className="mx-auto mt-3 w-full max-w-3xl space-y-3 pb-20">
          {plans.length === 0 ? (
            <div className="rounded-2xl bg-white/80 px-4 py-8 text-center">
              <p className="text-sm text-gray-500">ยังไม่มีแผน กด + เพื่อเพิ่มแผนแรกของคุณ</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="plans-list">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {plans.map((plan, index) => (
                      <Draggable key={plan.id} draggableId={plan.id} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                          >
                            <PlanCard
                              plan={plan}
                              selected={plan.id === activePlanId}
                              onSelect={() => handleSelectPlan(plan.id)}
                              onDelete={() => removePlan(plan.id)}
                              dragHandleProps={dragProvided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </StepScreen>

      <button
        type="button"
        onClick={handleAdd}
        disabled={plans.length >= MAX_PLANS}
        className="absolute bottom-24 right-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-brand-strong text-2xl font-bold text-white shadow-lg transition hover:bg-brand disabled:opacity-50"
        aria-label="Add plan"
      >
        +
      </button>
    </div>
  )
}
