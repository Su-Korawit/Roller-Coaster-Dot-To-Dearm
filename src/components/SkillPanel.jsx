import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Lock } from 'lucide-react'
import { useSkillStore } from '../stores/useSkillStore'
import { useUserStore } from '../stores/useUserStore'
import { PASSIVE_SKILLS, ACTIVE_SKILLS } from '../data/skillData'

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
  const [showCountdown, setShowCountdown] = useState(false)
  const [countNum, setCountNum] = useState(5)

  const {
    equippedPassiveSkill,
    equippedActiveSkill,
    setEquippedPassiveSkill,
    setEquippedActiveSkill,
  } = useSkillStore()

  // ── Ignite countdown: 5 → 0 → open Add Task ─────────────
  useEffect(() => {
    if (!showCountdown) return
    if (countNum === 0) {
      setShowCountdown(false)
      setCountNum(5)
      onOpenCreateTask?.()
      return
    }
    const timer = setTimeout(() => setCountNum((n) => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [showCountdown, countNum, onOpenCreateTask])

  function handleDragEnd(result) {
    const { destination, draggableId } = result
    if (!destination) return
    if (destination.droppableId === 'slot-passive') {
      setEquippedPassiveSkill(draggableId)
    } else if (destination.droppableId === 'slot-active') {
      setEquippedActiveSkill(draggableId)
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
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

              {tab === 'passive' ? (
                <>
                  {/* Equipped Passive Slot */}
                  <div>
                    <p className="pixel-font text-[9px] text-gray-500 mb-2">Equipped Passive</p>
                    <Droppable droppableId="slot-passive">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`border-2 border-dashed rounded-xl h-24 flex items-center justify-center transition-colors
                            ${snapshot.isDraggingOver ? 'border-pink-400 bg-pink-50' : 'border-gray-300 bg-gray-50'}`}
                        >
                          {equippedPassive ? (
                            <div className="flex flex-col items-center gap-1 pointer-events-none">
                              {equippedPassive.image
                                ? <img src={equippedPassive.image} alt={equippedPassive.name} className="w-10 h-10 object-contain" />
                                : <span className="text-4xl leading-none">{equippedPassive.emoji}</span>
                              }
                              <span className="pixel-font text-[9px] text-gray-800 font-bold">{equippedPassive.name}</span>
                              <span className="pixel-font text-[7px] text-pink-500 text-center px-2">{equippedPassive.effect}</span>
                            </div>
                          ) : (
                            <p className="pixel-font text-[9px] text-gray-400">Drag skill here to equip</p>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>

                  {/* Available passive skills */}
                  <div>
                    <p className="pixel-font text-[9px] text-gray-500 mb-2">Available Skills</p>
                    <Droppable droppableId="list-passive" direction="horizontal">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-3">
                          {passiveUnlocked.map((skill, index) => (
                            <Draggable key={skill.id} draggableId={skill.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex-1 rounded-2xl border-2 p-3 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing transition-all
                                    ${equippedPassiveSkill === skill.id ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white'}
                                    ${snapshot.isDragging ? 'shadow-xl scale-105 z-50' : ''}`}
                                >
                                  {skill.image
                                    ? <img src={skill.image} alt={skill.name} className="w-10 h-10 object-contain" />
                                    : <span className="text-3xl leading-none">{skill.emoji}</span>
                                  }
                                  <span className="pixel-font text-[8px] text-gray-700">{skill.name}</span>
                                  {equippedPassiveSkill === skill.id && (
                                    <span className="pixel-font text-[7px] text-pink-400">✓ Active</span>
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

                  {equippedPassive && (
                    <div className="rounded-xl bg-pink-50 border border-pink-100 px-4 py-3">
                      <p className="pixel-font text-[9px] text-pink-600 font-bold mb-1">{equippedPassive.name} — Active Effect</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{equippedPassive.description}</p>
                      {equippedPassive.id === 'planner' && (
                        <button
                          onClick={() => onOpenCalendar?.()}
                          className="mt-3 w-full rounded-xl bg-purple-500 text-white py-2.5 pixel-font text-[10px] active:scale-95 transition-transform shadow"
                        >
                          📅 Open Calendar
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Equipped Active Slot */}
                  <div>
                    <p className="pixel-font text-[9px] text-gray-500 mb-2">Equipped Active</p>
                    <Droppable droppableId="slot-active">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`border-2 border-dashed rounded-xl h-24 flex items-center justify-center transition-colors
                            ${snapshot.isDraggingOver ? 'border-sky-400 bg-sky-50' : 'border-gray-300 bg-gray-50'}`}
                        >
                          {equippedActive ? (
                            <button
                              onClick={
                                equippedActive.id === 'ignite'
                                  ? () => { setCountNum(5); setShowCountdown(true) }
                                  : undefined
                              }
                              className={`flex flex-col items-center gap-1 transition-transform
                                ${equippedActive.id === 'ignite' ? 'active:scale-95 cursor-pointer' : 'cursor-default'}`}
                            >
                              <img src={equippedActive.image} alt={equippedActive.name} className="w-10 h-10 object-contain" />
                              <span className="pixel-font text-[9px] text-gray-800 font-bold">{equippedActive.name}</span>
                              {equippedActive.id === 'ignite' && (
                                <span className="pixel-font text-[7px] text-orange-500">🚀 Tap to Launch!</span>
                              )}
                              {equippedActive.id !== 'ignite' && (
                                <span className="pixel-font text-[7px] text-sky-500">{equippedActive.tagline}</span>
                              )}
                            </button>
                          ) : (
                            <p className="pixel-font text-[9px] text-gray-400">Drag skill here to equip</p>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>

                  {/* Available active skills */}
                  <div>
                    <p className="pixel-font text-[9px] text-gray-500 mb-2">Available Skills</p>
                    <Droppable droppableId="list-active" direction="horizontal">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-3">
                          {activeUnlocked.map((skill, index) => (
                            <Draggable key={skill.id} draggableId={skill.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex-1 rounded-2xl border-2 p-3 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing transition-all
                                    ${equippedActiveSkill === skill.id ? 'border-sky-400 bg-sky-50' : 'border-gray-200 bg-white'}
                                    ${snapshot.isDragging ? 'shadow-xl scale-105 z-50' : ''}`}
                                >
                                  <img src={skill.image} alt={skill.name} className="w-10 h-10 object-contain" />
                                  <span className="pixel-font text-[8px] text-gray-700">{skill.name}</span>
                                  {equippedActiveSkill === skill.id && (
                                    <span className="pixel-font text-[7px] text-sky-400">✓ Active</span>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* Locked active skills */}
                    <div className="flex gap-3 mt-3">
                      {activeLocked.map((skill) => (
                        <div
                          key={skill.id}
                          className="flex-1 rounded-2xl border-2 border-gray-200 bg-gray-50 p-3 flex flex-col items-center gap-1 opacity-50 grayscale select-none"
                        >
                          <img src={skill.image} alt={skill.name} className="w-10 h-10 object-contain" />
                          <span className="pixel-font text-[8px] text-gray-500">{skill.name}</span>
                          <Lock size={10} className="text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {equippedActive && (
                    <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">
                      <p className="pixel-font text-[9px] text-sky-600 font-bold mb-1">{equippedActive.name} — How to use</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{equippedActive.description}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* ── Ignite Countdown Overlay ── */}
      {showCountdown && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center rounded-t-2xl">
          <p className="pixel-font text-white text-[11px] mb-6 tracking-widest opacity-80">🚀 IGNITE</p>
          <p className="pixel-font text-[96px] leading-none text-orange-400">{countNum}</p>
          <p className="pixel-font text-white text-[9px] mt-8 opacity-60">Get ready to start your task!</p>
          <button
            onClick={() => { setShowCountdown(false); setCountNum(5) }}
            className="mt-6 pixel-font text-[9px] text-gray-400 border border-gray-600 rounded-full px-4 py-2"
          >
            Cancel
          </button>
        </div>
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
