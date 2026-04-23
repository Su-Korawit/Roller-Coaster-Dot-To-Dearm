import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Lock } from 'lucide-react'
import { useSkillStore, PASSIVE_UNLOCK_THRESHOLDS } from '../stores/useSkillStore'
import { useUserStore } from '../stores/useUserStore'
import { useTaskStore } from '../stores/useTaskStore'
import { PASSIVE_SKILLS, ACTIVE_SKILLS } from '../data/skillData'
import SkillExecutionPopup from './SkillExecutionPopup'

// ─────────────────────────────────────────────────────────────
// Unlocked skill ids (mock data — 2 unlocked, 2 locked each type)
// ─────────────────────────────────────────────────────────────
const UNLOCKED_PASSIVE_IDS = ['spark', 'flow', 'planner']
const UNLOCKED_ACTIVE_IDS = ['ignite', 'capsule']

// ─────────────────────────────────────────────────────────────
// SkillPanel — Passive / Active tabs with DnD equip slots
// ─────────────────────────────────────────────────────────────
export default function SkillPanel({ onClose, onOpenCreateTask, onOpenCalendar }) {
  const [tab, setTab] = useState('passive')
  // Tracks which skill card is being dragged (for the dynamic hint box)
  const [draggingSkillId, setDraggingSkillId] = useState(null)
  // Task that has an active skill popup open
  const [activeSkillTask, setActiveSkillTask] = useState(null)

  const {
    equippedPassiveSkill,
    equippedActiveSkill,
    setEquippedPassiveSkill,
    setEquippedActiveSkill,
    passiveSlots,
    equipPassiveSkill,
    clearPassiveSlot,
  } = useSkillStore()

  const totalStacks = useUserStore((s) => s.totalStacks)
  const { tasks, applySkillToTask } = useTaskStore()
  const pendingTasks = tasks.filter((t) => !t.completed)

  function handleDragStart(start) {
    setDraggingSkillId(start.draggableId)
  }

  function handleDragEnd(result) {
    setDraggingSkillId(null)
    const { destination, draggableId } = result
    if (!destination) return

    // Passive slot drop: slot-0, slot-1, slot-2
    if (destination.droppableId.startsWith('slot-')) {
      const slotIdx = parseInt(destination.droppableId.replace('slot-', ''), 10)
      if (!isNaN(slotIdx)) {
        const isUnlocked = totalStacks >= PASSIVE_UNLOCK_THRESHOLDS[slotIdx]
        if (!isUnlocked) return
        equipPassiveSkill(draggableId, slotIdx)
        // Keep the legacy single-skill field in sync for backward compat
        setEquippedPassiveSkill(draggableId)
        return
      }
    }

    // Active skill → task drop
    if (destination.droppableId.startsWith('task-')) {
      const rawId = destination.droppableId.replace('task-', '')
      const task = pendingTasks.find((t) => String(t.id) === rawId)
      if (!task || task.assignedSkill) return
      const skillId = draggableId
      const timerEnd = skillId === 'capsule' ? Date.now() + 30 * 60 * 1000 : null
      applySkillToTask(task.id, skillId, timerEnd)
      setEquippedActiveSkill(skillId)
      setActiveSkillTask({ ...task, assignedSkill: skillId, timerEnd })
    }
  }

  const passiveUnlocked = PASSIVE_SKILLS.filter((s) => UNLOCKED_PASSIVE_IDS.includes(s.id))
  const passiveLocked   = PASSIVE_SKILLS.filter((s) => !UNLOCKED_PASSIVE_IDS.includes(s.id))
  const activeUnlocked  = ACTIVE_SKILLS.filter((s) => UNLOCKED_ACTIVE_IDS.includes(s.id))
  const activeLocked    = ACTIVE_SKILLS.filter((s) => !UNLOCKED_ACTIVE_IDS.includes(s.id))

  const equippedPassive = PASSIVE_SKILLS.find((s) => s.id === equippedPassiveSkill) || null
  const equippedActive  = ACTIVE_SKILLS.find((s) => s.id === equippedActiveSkill) || null

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden" style={{ top: '8%' }}>
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      <div className="px-3 pb-4 flex-1 flex flex-col">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">

          {/* Tab header */}
          <div className="flex border-b border-gray-200">
            <TabBtn active={tab === 'passive'} onClick={() => setTab('passive')}>
              Passive Skill
            </TabBtn>
            <TabBtn active={tab === 'active'} onClick={() => setTab('active')}>
              Active Skill
            </TabBtn>
            <button onClick={onClose} className="ml-auto pr-4 text-gray-400 text-lg">✕</button>
          </div>

          {/* DnD context wraps both tab bodies */}
          <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

              {tab === 'passive' ? (
                <>
                  {/* ── 3 Passive Slots ───────────────────────────────── */}
                  <div>
                    <p className="pixel-font text-[9px] text-gray-500 mb-3">Equipped Passive Slots</p>
                    <div className="flex gap-2">
                      {PASSIVE_UNLOCK_THRESHOLDS.map((threshold, slotIdx) => {
                        const isUnlocked = totalStacks >= threshold
                        const slotData = passiveSlots[slotIdx] ?? { equippedSkillId: null }
                        const equipped = PASSIVE_SKILLS.find((s) => s.id === slotData.equippedSkillId) || null

                        return (
                          <div key={slotIdx} className="flex-1 flex flex-col gap-1">
                            {/* Slot header label */}
                            <p className={`pixel-font text-[7px] text-center ${
                              isUnlocked ? 'text-pink-400' : 'text-gray-400'
                            }`}>
                              {isUnlocked ? `Slot ${slotIdx + 1}` : `🔒 ${threshold} stacks`}
                            </p>

                            <Droppable droppableId={`slot-${slotIdx}`} isDropDisabled={!isUnlocked}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`relative border-2 border-dashed rounded-xl h-24 flex flex-col items-center justify-center transition-all duration-150 overflow-hidden ${
                                    !isUnlocked
                                      ? 'border-gray-200 bg-gray-50 opacity-50 grayscale'
                                      : snapshot.isDraggingOver
                                      ? 'border-pink-400 bg-pink-50 scale-[1.02]'
                                      : equipped
                                      ? 'border-pink-300 bg-pink-50'
                                      : 'border-gray-300 bg-gray-50'
                                  }`}
                                >
                                  {!isUnlocked ? (
                                    <Lock size={18} className="text-gray-300" />
                                  ) : equipped ? (
                                    <>
                                      {equipped.image
                                        ? <img src={equipped.image} alt={equipped.name} className="w-9 h-9 object-contain" />
                                        : <span className="text-3xl leading-none">{equipped.emoji}</span>
                                      }
                                      <span className="pixel-font text-[8px] text-gray-800 font-bold mt-0.5">{equipped.name}</span>
                                      {/* Tap-to-clear button */}
                                      <button
                                        onClick={() => clearPassiveSlot(slotIdx)}
                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[10px] leading-none flex items-center justify-center active:scale-95"
                                        title="Remove skill"
                                      >
                                        ✕
                                      </button>
                                    </>
                                  ) : (
                                    <p className="pixel-font text-[8px] text-gray-400 text-center px-1">Drop here</p>
                                  )}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )
                      })}
                    </div>

                    {/* Stack progress bar */}
                    <div className="mt-3 px-1">
                      <div className="flex justify-between mb-1">
                        <p className="pixel-font text-[7px] text-gray-400">Stacks: {totalStacks}</p>
                        <p className="pixel-font text-[7px] text-gray-400">
                          Next unlock: {PASSIVE_UNLOCK_THRESHOLDS.find((t) => totalStacks < t) ?? 'MAX ✓'}
                        </p>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (totalStacks / 7) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Available passive skills ───────────────────────── */}
                  <div>
                    <p className="pixel-font text-[9px] text-gray-500 mb-2">Available Skills</p>
                    <Droppable droppableId="list-passive" direction="horizontal" isDropDisabled>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-3">
                          {passiveUnlocked.map((skill, index) => (
                            <Draggable key={skill.id} draggableId={skill.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex-1 rounded-2xl border-2 p-3 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing transition-all select-none
                                    ${passiveSlots.some((s) => s.equippedSkillId === skill.id) ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white'}
                                    ${snapshot.isDragging ? 'shadow-xl scale-105 z-50 rotate-1' : ''}`}
                                >
                                  {skill.image
                                    ? <img src={skill.image} alt={skill.name} className="w-10 h-10 object-contain" draggable={false} />
                                    : <span className="text-3xl leading-none">{skill.emoji}</span>
                                  }
                                  <span className="pixel-font text-[8px] text-gray-700">{skill.name}</span>
                                  {passiveSlots.some((s) => s.equippedSkillId === skill.id) && (
                                    <span className="pixel-font text-[7px] text-pink-400">✓ Equipped</span>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* Locked passive skills */}
                    <div className="flex gap-3 mt-3">
                      {passiveLocked.map((skill) => (
                        <div
                          key={skill.id}
                          className="flex-1 rounded-2xl border-2 border-gray-200 bg-gray-50 p-3 flex flex-col items-center gap-1 opacity-50 grayscale select-none"
                        >
                          {skill.image
                            ? <img src={skill.image} alt={skill.name} className="w-10 h-10 object-contain" />
                            : <span className="text-3xl leading-none">{skill.emoji}</span>
                          }
                          <span className="pixel-font text-[8px] text-gray-500">{skill.name}</span>
                          <Lock size={10} className="text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active-effect info for each equipped passive */}
                  {passiveSlots.some((s) => s.equippedSkillId) && (
                    <div className="space-y-2">
                      {passiveSlots
                        .filter((s) => s.equippedSkillId)
                        .map((s) => {
                          const skill = PASSIVE_SKILLS.find((p) => p.id === s.equippedSkillId)
                          if (!skill) return null
                          return (
                            <div key={skill.id} className="rounded-xl bg-pink-50 border border-pink-100 px-4 py-3">
                              <p className="pixel-font text-[9px] text-pink-600 font-bold mb-1">{skill.name} — Active Effect</p>
                              <p className="text-xs text-gray-600 leading-relaxed">{skill.description}</p>
                              {skill.id === 'planner' && (
                                <button
                                  onClick={() => onOpenCalendar?.()}
                                  className="mt-3 w-full rounded-xl bg-purple-500 text-white py-2.5 pixel-font text-[10px] active:scale-95 transition-transform shadow"
                                >
                                  📅 Open Calendar
                                </button>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* ── Task Drop Zone (TOP) ─────────────────────────────── */}
                  <div>
                    <p className="pixel-font text-[9px] text-gray-500 mb-2">
                      {pendingTasks.length > 0 ? `Tasks (${pendingTasks.length})` : 'No Active Tasks'}
                    </p>
                    {pendingTasks.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center gap-2">
                        <span className="text-3xl">📋</span>
                        <p className="pixel-font text-[9px] text-gray-300">Create a task first!</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                        {pendingTasks.map((task) => (
                          <Droppable key={task.id} droppableId={`task-${task.id}`}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`rounded-xl border-2 px-4 py-3 flex items-center gap-3 transition-all duration-150 min-h-16 ${
                                  task.assignedSkill === 'ignite'
                                    ? 'border-orange-300 bg-orange-50 shadow-[0_0_10px_rgba(251,146,60,0.35)]'
                                    : task.assignedSkill === 'capsule'
                                    ? 'border-sky-300 bg-sky-50 shadow-[0_0_10px_rgba(56,189,248,0.35)]'
                                    : snapshot.isDraggingOver
                                    ? 'border-purple-400 bg-purple-50 scale-[1.01] shadow-md'
                                    : 'border-gray-200 bg-white'
                                }`}
                              >
                                {/* Skill badge or drop target indicator */}
                                {task.assignedSkill ? (
                                  <span className="text-2xl shrink-0">
                                    {task.assignedSkill === 'ignite' ? '🚀' : '⏳'}
                                  </span>
                                ) : (
                                  <div className={`w-8 h-8 rounded-lg border-2 border-dashed flex items-center justify-center shrink-0 transition-colors ${
                                    snapshot.isDraggingOver ? 'border-purple-400 bg-purple-100' : 'border-gray-200'
                                  }`}>
                                    <span className="text-sm text-gray-300">+</span>
                                  </div>
                                )}

                                {/* Task info */}
                                <div className="flex-1 min-w-0">
                                  <p className="pixel-font text-[10px] text-gray-800 truncate">{task.title}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {task.type} · {task.timeMinutes}min · {task.rewardCoins}💰
                                  </p>
                                </div>

                                {/* Launch / View button when skill is active on this task */}
                                {task.assignedSkill && (
                                  <button
                                    onClick={() => setActiveSkillTask(task)}
                                    className={`pixel-font text-[8px] text-white rounded-xl px-3 py-1.5 active:scale-95 transition-transform shrink-0 shadow ${
                                      task.assignedSkill === 'ignite' ? 'bg-orange-400' : 'bg-sky-400'
                                    }`}
                                  >
                                    {task.assignedSkill === 'ignite' ? '🚀 Go' : '⏳ View'}
                                  </button>
                                )}

                                {/* DnD placeholder must be inside Droppable */}
                                <div className="hidden">{provided.placeholder}</div>
                              </div>
                            )}
                          </Droppable>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Dynamic how-to-use / drag hint ──────────────────── */}
                  <div className={`rounded-xl px-4 py-3 transition-colors duration-200 ${
                    draggingSkillId === 'ignite'
                      ? 'bg-orange-50 border border-orange-200'
                      : draggingSkillId === 'capsule'
                      ? 'bg-sky-50 border border-sky-200'
                      : 'bg-gray-50 border border-gray-100'
                  }`}>
                    <p className="pixel-font text-[9px] font-bold mb-1 text-gray-700">
                      {draggingSkillId === 'ignite' ? '🚀 Ignite — Drop on a task!'
                        : draggingSkillId === 'capsule' ? '⏳ Capsule — Drop on a task!'
                        : '💡 How to Use'}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {draggingSkillId === 'ignite'
                        ? 'Drop onto any task above to start a 5-second launch countdown!'
                        : draggingSkillId === 'capsule'
                        ? 'Drop onto any task to lock it for 30 min and earn +50% coins on finish!'
                        : 'Drag a skill card below and drop it onto a task above to activate a focus mode.'}
                    </p>
                  </div>

                  {/* ── Available Active Skills — drag source (BOTTOM) ──── */}
                  <div>
                    <p className="pixel-font text-[9px] text-gray-500 mb-2">Available Skills — Drag onto a Task ↑</p>
                    <Droppable droppableId="list-active" direction="horizontal" isDropDisabled>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-3">
                          {activeUnlocked.map((skill, index) => (
                            <Draggable key={skill.id} draggableId={skill.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex-1 rounded-2xl border-2 p-4 flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing transition-all select-none
                                    ${skill.id === 'ignite'
                                      ? 'border-orange-300 bg-orange-50'
                                      : 'border-sky-300 bg-sky-50'}
                                    ${snapshot.isDragging ? 'shadow-2xl scale-110 z-50 opacity-90 rotate-2' : ''}`}
                                >
                                  {skill.image
                                    ? <img src={skill.image} alt={skill.name} className="w-12 h-12 object-contain" draggable={false} />
                                    : <span className="text-3xl leading-none">{skill.emoji}</span>
                                  }
                                  <span className="pixel-font text-[8px] text-gray-700">{skill.name}</span>
                                  <span className={`pixel-font text-[7px] ${skill.id === 'ignite' ? 'text-orange-400' : 'text-sky-400'}`}>
                                    {skill.tagline}
                                  </span>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {activeLocked.length > 0 && (
                      <div className="flex gap-3 mt-3">
                        {activeLocked.map((skill) => (
                          <div
                            key={skill.id}
                            className="flex-1 rounded-2xl border-2 border-gray-200 bg-gray-50 p-3 flex flex-col items-center gap-1 opacity-50 grayscale select-none"
                          >
                            {skill.image
                              ? <img src={skill.image} alt={skill.name} className="w-10 h-10 object-contain" />
                              : <span className="text-3xl leading-none">{skill.emoji}</span>
                            }
                            <span className="pixel-font text-[8px] text-gray-500">{skill.name}</span>
                            <Lock size={10} className="text-gray-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* ── Skill Execution Popup ── */}
      {activeSkillTask && (
        <SkillExecutionPopup
          task={tasks.find((t) => t.id === activeSkillTask.id) ?? activeSkillTask}
          onClose={() => setActiveSkillTask(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Tab button
// ─────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 pixel-font text-[10px] transition-colors
        ${active
          ? 'text-[#c46b9a] border-b-2 border-[#c46b9a]'
          : 'text-gray-400'
        }`}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// SkillInfoSheet — bottom sheet modal when skill is tapped
// ─────────────────────────────────────────────────────────────
function SkillInfoSheet({ skill, onClose }) {
  const { ownedSkills, equippedPassive, equippedActive, equipPassive, equipActive } = useSkillStore()
  const coins = useUserStore((s) => s.coins)
  const streak = useUserStore((s) => s.streak)

  const isOwned = ownedSkills.includes(skill.id)
  const isPassive = skill.type === 'passive'

  const isEquipped = isPassive
    ? equippedPassive.includes(skill.id)
    : equippedActive.includes(skill.id)

  function handleEquip() {
    if (!isOwned) return
    if (isPassive) {
      const slotUnlock = [0, 7, 14]
      const empty = equippedPassive.findIndex(
        (s, i) => s === null && streak >= slotUnlock[i],
      )
      if (empty !== -1) equipPassive(skill.id, empty)
    } else {
      equipActive(skill.id)
    }
    onClose()
  }

  function handleBuy() {
    const { buySkill } = useSkillStore.getState()
    const { addCoins } = useUserStore.getState()
    const spendCoins = (amt) => addCoins(-amt)
    buySkill(skill.id, skill.cost, coins, spendCoins)
    onClose()
  }

  // Evolution stage images: show skill, darker version, question mark
  const stages = [
    { img: skill.image, label: 'Lv 1' },
    { img: skill.image, label: 'Lv 2', dark: true },
    { img: null, label: '?' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-50 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-4xl bg-[#fce4ef] px-6 pt-6 pb-8 shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-pink-200 rounded-full" />
        </div>

        {/* Tab strip (just shows type) */}
        <div className="flex gap-2 mb-6">
          <div className={`px-4 py-2 rounded-xl pixel-font text-[9px] ${isPassive ? 'bg-white text-gray-800' : 'text-gray-400'}`}>
            Passive Skill
          </div>
          <div className={`px-4 py-2 rounded-xl pixel-font text-[9px] ${!isPassive ? 'bg-pink-100 text-[#c46b9a]' : 'text-gray-400'}`}>
            Active Skill
          </div>
        </div>

        {/* Evolution stages */}
        <div className="flex items-center justify-center gap-4 mb-5">
          {stages.map((stage, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-20 h-20 rounded-2xl border-2 border-gray-300 bg-white flex items-center justify-center
                ${stage.dark ? 'brightness-50' : ''}`}
              >
                {stage.img
                  ? <img
                      src={stage.img}
                      alt={stage.label}
                      className={`w-12 h-12 object-contain ${stage.dark ? 'opacity-40' : ''}`}
                    />
                  : <span className="pixel-font text-2xl text-gray-400">?</span>
                }
              </div>
              {i < stages.length - 1 && (
                <span className="text-gray-500 text-xl font-bold">→</span>
              )}
            </div>
          ))}
        </div>

        {/* Name + description */}
        <h2 className="pixel-font text-[14px] text-gray-800 mb-2">{skill.tagline}</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{skill.description}</p>

        {/* Example button */}
        <button className="w-full rounded-full border-2 border-gray-800 py-2 pixel-font text-[10px] text-gray-800 mb-3">
          Example
        </button>

        {/* MBTI tags */}
        <p className="text-center text-sm text-gray-500 mb-4">
          {skill.mbtiMatch.join(' / ')}
        </p>

        {/* Equip / Buy button */}
        {isOwned ? (
          <button
            onClick={handleEquip}
            disabled={isEquipped}
            className={`w-full rounded-full py-4 pixel-font text-[12px] shadow-sm transition-all
              ${isEquipped
                ? 'bg-gray-200 text-gray-400'
                : 'bg-white border-2 border-gray-800 text-gray-800 active:scale-[0.98]'
              }`}
          >
            {isEquipped ? 'Equipped ✓' : `Equip | ${skill.cost} 🪙`}
          </button>
        ) : (
          <button
            onClick={handleBuy}
            disabled={coins < skill.cost}
            className={`w-full rounded-full py-4 pixel-font text-[12px] shadow-sm transition-all
              ${coins < skill.cost
                ? 'bg-gray-200 text-gray-400'
                : 'bg-white border-2 border-gray-800 text-gray-800 active:scale-[0.98]'
              }`}
          >
            {coins < skill.cost ? 'Not enough coins' : `Buy & Equip | ${skill.cost} 🪙`}
          </button>
        )}
      </div>
    </>
  )
}
