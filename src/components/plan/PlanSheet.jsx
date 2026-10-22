import { useState } from 'react'
import { createPortal } from 'react-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Popup from '../ui/Popup'
import NextUpCard from './NextUpCard'
import PlanEntryRow from './PlanEntryRow'
import SubjectGoalRow from './SubjectGoalRow'
import { usePlansStore } from '../../stores/usePlansStore'
import { useLeavesStore } from '../../stores/useLeavesStore'
import { useRoomUiStore } from '../../stores/useRoomUiStore'
import { useFocusStore } from '../../stores/useFocusStore'
import { useTcasEventsStore } from '../../stores/useTcasEventsStore'
import { eventsWithFallback, TCAS_LABEL } from '../../data/tcas70'
import { nextUp, aggregateSubjects, defaultGoalHours } from '../../utils/planDerive'
import { localToday } from '../../lib/hotbarBadges'

const ROUND_NAMES = { 1: 'Portfolio', 2: 'Quota', 3: 'Admission', 4: 'Direct' }
const FILTERS = [{ id: null, label: 'ทั้งหมด' }, ...[1, 2, 3, 4].map((n) => ({ id: n, label: `รอบ ${n}` }))]
const HOUR_MS = 3600000

// The student's TCAS plan (hotbar slot 3): what to do next, the programs by round (round 3 is
// ranked by dragging), and every exam subject they need with a focus-hour goal.
export default function PlanSheet({ onClose, today = localToday() }) {
  const plans = usePlansStore((s) => s.plans)
  const goalHours = usePlansStore((s) => s.goalHours)
  const studied = useLeavesStore((s) => s.focusBySubject)
  const focusStatus = useFocusStore((s) => s.status)
  const storedEvents = useTcasEventsStore((s) => s.events)
  const events = eventsWithFallback(storedEvents)
  const [filter, setFilter] = useState(null)
  const [openId, setOpenId] = useState(null)

  const actions = usePlansStore.getState
  const entries = plans.filter((p) => p.programId || p.round != null)
  const next = nextUp({ entries, events, today })
  const subjects = aggregateSubjects(entries)
  const goalOf = (s) => goalHours[s.key] ?? defaultGoalHours(s.maxWeight)
  const totalGoal = subjects.reduce((n, s) => n + goalOf(s), 0)
  const totalStudied = Math.floor(subjects.reduce((n, s) => n + (studied[s.key] ?? 0), 0) / HOUR_MS)
  const busy = focusStatus !== 'idle'

  const byRound = (n) => entries.filter((e) => e.round === n)
  const shows = (n) => filter === null || filter === n
  const round3 = byRound(3).sort((a, b) => a.rank - b.rank)
  const unplaced = entries.filter((e) => e.round == null)

  const rowProps = (entry) => ({
    entry,
    open: openId === entry.id,
    onOpen: (id) => setOpenId((cur) => (cur === id ? null : id)),
    onToggle: (id, itemId) => actions().toggleChecklist(id, itemId),
    onAddItem: (id, text) => actions().addChecklistItem(id, text),
    onRemoveItem: (id, itemId) => actions().removeChecklistItem(id, itemId),
    onMove: (id, round) => actions().setRound(id, round),
    onRemove: (id) => {
      setOpenId(null)
      actions().removePlan(id)
    },
  })

  const section = (n, list, title) => (
    <section key={title} className="flex flex-col gap-2">
      <p className="thai-font text-xs font-bold text-ink-soft">{title}</p>
      <ul aria-label={title} className="flex flex-col gap-2">
        {list.map((e) => <PlanEntryRow key={e.id} {...rowProps(e)} />)}
      </ul>
    </section>
  )

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div className="p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        <header className="flex flex-col gap-1">
          <h2 className="pixel-font text-lg text-ink">{`แผน ${TCAS_LABEL} ของฉัน`}</h2>
          {next && (
            <p className="thai-font text-sm text-ink-soft flex items-baseline gap-1">
              <b className="pixel-font text-2xl text-ink">{next.days}</b>
              {` วัน ถึง ${next.event.title}`}
            </p>
          )}
        </header>

        {entries.length === 0 ? (
          <p className="thai-font text-sm text-ink-soft">ยังไม่มีหลักสูตรในแผน เพิ่มหลักสูตรจากตึกคณะในแคมปัส แล้วระบบจะรวบรวมสิ่งที่ต้องใช้และกำหนดการให้</p>
        ) : (
          <>
            <div role="tablist" aria-label="กรองตามรอบ" className="flex gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex-1 h-10 rounded-ui border-2 text-xs font-bold ${filter === f.id ? 'bg-ink text-white border-line' : 'bg-paper text-ink-soft border-hairline'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {next && <NextUpCard next={next} onToggle={(id, itemId) => actions().toggleChecklist(id, itemId)} />}

            {shows(3) && round3.length > 0 && (
              <section className="flex flex-col gap-2">
                <p className="thai-font text-xs font-bold text-ink-soft">รอบ 3 Admission (ลากเพื่อเรียงอันดับ)</p>
                <DragDropContext onDragEnd={(r) => r.destination && actions().reorderRound3(r.source.index, r.destination.index)}>
                  <Droppable
                    droppableId="round3"
                    renderClone={(provided, snapshot, rubric) => createPortal(
                      <ul ref={provided.innerRef} {...provided.draggableProps} style={{ ...provided.draggableProps.style, zIndex: 100 }} className="list-none m-0 p-0">
                        <PlanEntryRow {...rowProps(round3[rubric.source.index])} open={false} dragging dragProps={provided.dragHandleProps} />
                      </ul>,
                      document.body,
                    )}
                  >
                    {(provided) => (
                      <ul ref={provided.innerRef} {...provided.droppableProps} aria-label="รอบ 3 Admission" className="flex flex-col gap-2">
                        {round3.map((e, i) => (
                          <Draggable key={e.id} draggableId={e.id} index={i}>
                            {(p, snap) => (
                              <PlanEntryRow {...rowProps(e)} innerRef={p.innerRef} draggableProps={p.draggableProps} dragProps={p.dragHandleProps} dragging={snap.isDragging} />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              </section>
            )}

            {[1, 2, 4].filter((n) => shows(n) && byRound(n).length > 0).map((n) => section(n, byRound(n), `รอบ ${n} ${ROUND_NAMES[n]}`))}
            {filter === null && unplaced.length > 0 && section(null, unplaced, 'ยังไม่เลือกรอบ')}

            {subjects.length > 0 && (
              <section aria-label="วิชาที่ต้องสอบ" className="flex flex-col gap-2">
                <h3 className="thai-font text-sm font-bold text-ink">วิชาที่ต้องสอบ</h3>
                <p className="thai-font text-xs text-ink-soft">{`อ่านแล้ว ${totalStudied} ชม. จากเป้า ${totalGoal} ชม. · เรียงตามจำนวนหลักสูตรที่ใช้`}</p>
                {busy && <p className="thai-font text-xs text-ink-soft">จบโฟกัสที่กำลังทำอยู่ก่อน แล้วค่อยกด อ่าน</p>}
                <ul className="flex flex-col gap-2">
                  {subjects.map((s) => (
                    <SubjectGoalRow
                      key={s.key}
                      subject={s}
                      studiedMs={studied[s.key] ?? 0}
                      goal={goalOf(s)}
                      busy={busy}
                      onRead={(subj) => useRoomUiStore.getState().open('focus', { subjectKey: subj.key })}
                      onGoal={(subj, hours) => actions().setGoalHours(subj.key, hours)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </Popup>
  )
}
