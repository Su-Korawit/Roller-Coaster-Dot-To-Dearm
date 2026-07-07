import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { generateJourney } from '../../services/aiJourney'
import { useUserStore } from '../../stores/useUserStore'
import { useSelectStore } from '../../stores/useSelectStore'
import { usePlansStore } from '../../stores/usePlansStore'
import { careers, masteries, universities, programs } from '../../data/onboardingData'
import InlineModal from './InlineModal'
import JourneySheet from './JourneySheet'

const CATEGORY = 'mastery'

export default function MasteryTracks() {
  const journeys = useUserStore((s) => s.journeys)
  const activeMasteryBlockId = useUserStore((s) => s.activeMasteryBlockId)
  const aiLanguage = useUserStore((s) => s.aiLanguage)
  const setActiveMasteryBlockId = useUserStore((s) => s.setActiveMasteryBlockId)
  const setJourneys = useUserStore((s) => s.setJourneys)
  const addJourneyItem = useUserStore((s) => s.addJourneyItem)
  const updateJourneyItem = useUserStore((s) => s.updateJourneyItem)
  const deleteJourneyItem = useUserStore((s) => s.deleteJourneyItem)

  const mbti = useSelectStore((s) => s.mbti)
  const career = useSelectStore((s) => s.career)
  const mastery = useSelectStore((s) => s.mastery)
  const activePlan = usePlansStore((s) => s.plans.find((p) => p.id === s.activePlanId))
  const university = activePlan?.university ?? null
  const program = activePlan?.program ?? null

  const selectedCareer = careers.find((c) => c.id === career)
  const selectedMastery = masteries.find((m) => m.id === mastery)
  const selectedUniversity = universities.find((u) => u.id === university)
  const selectedProgram = programs.find((p) => p.id === program)

  const [journeyModal, setJourneyModal] = useState(null)
  const [journeyEdit, setJourneyEdit] = useState({ title: '', desc: '' })
  const [isGenerating, setIsGenerating] = useState(false)
  const [viewingJourney, setViewingJourney] = useState(null)

  const currentJourneys = journeys?.mastery || []

  function handleDragEnd(result) {
    if (!result.destination) return
    const items = Array.from(currentJourneys)
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    setJourneys(CATEGORY, items)
  }

  function openAddJourney() {
    setJourneyEdit({ title: '', desc: '' })
    setJourneyModal({ isNew: true, item: null })
  }

  function openEditJourney(item) {
    setJourneyEdit({ title: item.title, desc: item.desc })
    setJourneyModal({ isNew: false, item })
  }

  function handleSaveJourney() {
    if (journeyModal.isNew) {
      addJourneyItem(CATEGORY, {
        id: `journey-${Date.now()}`,
        title: journeyEdit.title,
        desc: journeyEdit.desc,
      })
    } else {
      updateJourneyItem(CATEGORY, journeyModal.item.id, journeyEdit)
    }
    setJourneyModal(null)
  }

  function handleDeleteJourney() {
    deleteJourneyItem(CATEGORY, journeyModal.item.id)
    setJourneyModal(null)
  }

  async function generateRoadmap() {
    setIsGenerating(true)
    try {
      const steps = await generateJourney({
        career: selectedCareer?.name,
        mbti,
        mastery: selectedMastery?.name,
        university: selectedUniversity?.name,
        program: selectedProgram?.name,
        aiLanguage,
      })

      const journeyItems = steps.map((step) => ({
        id: `journey-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: step.title,
        desc: step.desc,
      }))

      setJourneys(CATEGORY, journeyItems)
      if (journeyItems.length > 0) setActiveMasteryBlockId(journeyItems[0].id)
    } catch (err) {
      if (err.message === 'AI_BAD_FORMAT') {
        alert('AI returned an unexpected format. Please try again.')
      } else {
        console.error('Gemini API error:', err)
        alert('Failed to connect to AI. Please check your API key or network.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="pixel-font text-[10px] text-ink-soft">Journey of Mastery</p>
          <button
            onClick={generateRoadmap}
            disabled={isGenerating}
            className="flex items-center gap-1.5 bg-linear-to-r from-purple-500 to-pink-500 text-white text-[10px] rounded-xl px-3 py-1.5 font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
          >
            {isGenerating ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                AI is thinking...
              </>
            ) : (
              '✨ Generate AI Roadmap'
            )}
          </button>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="mastery-journey-list" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-3 overflow-x-auto pb-2"
                style={{ minHeight: '88px' }}
              >
                {currentJourneys.map((item, index) => {
                  const isPinned = activeMasteryBlockId === item.id
                  return (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative shrink-0 w-20 rounded-xl transition-shadow ${
                            snapshot.isDragging
                              ? 'shadow-lg'
                              : isPinned
                              ? 'shadow-md shadow-purple-300'
                              : ''
                          } ${
                            isPinned
                              ? 'bg-purple-100 border-2 border-purple-400 ring-2 ring-purple-300 ring-offset-1'
                              : 'bg-purple-50 border border-purple-100'
                          }`}
                          style={{ height: isPinned ? '96px' : '80px' }}
                        >
                          {isPinned && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[7px] rounded-full px-1.5 py-0.5 whitespace-nowrap z-10 pixel-font">
                              Focus
                            </div>
                          )}
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-1 right-1 text-ink-soft/50 hover:text-ink-soft cursor-grab active:cursor-grabbing leading-none text-[10px] select-none"
                          >
                            ⠿
                          </div>
                          <button
                            onClick={() => setActiveMasteryBlockId(isPinned ? null : item.id)}
                            className={`absolute bottom-1 left-1 text-[11px] leading-none ${
                              isPinned ? 'text-brand-strong' : 'text-ink-soft/50 hover:text-brand'
                            }`}
                            title={isPinned ? 'Unpin block' : 'Set as active focus'}
                          >
                            📌
                          </button>
                          <button
                            onClick={() => setViewingJourney(item)}
                            className="w-full h-full flex flex-col items-center justify-center p-2 pt-3 gap-1"
                          >
                            <span className="thai-font text-xs font-semibold text-ink text-center leading-tight line-clamp-2">
                              {item.title || '—'}
                            </span>
                            {item.progress !== undefined && (
                              <span className="text-[8px] text-purple-600 font-semibold">{item.progress}%</span>
                            )}
                          </button>
                        </div>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
                <button
                  onClick={openAddJourney}
                  className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-purple-200 flex items-center justify-center text-purple-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
                >
                  <span className="text-2xl leading-none">+</span>
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {viewingJourney && (() => {
        const liveBlock = journeys?.mastery?.find((b) => b.id === viewingJourney.id) || viewingJourney
        const notes = liveBlock.progressNotes || []
        return (
          <InlineModal
            title={liveBlock.title || 'Journey Step'}
            onClose={() => setViewingJourney(null)}
          >
            <p className="thai-font text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">
              {liveBlock.desc || liveBlock.description || 'No description available.'}
            </p>
            {liveBlock.progress !== undefined && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-brand-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, liveBlock.progress || 0)}%` }}
                  />
                </div>
                <span className="text-[10px] text-purple-600 font-semibold">{liveBlock.progress || 0}%</span>
              </div>
            )}
            {notes.length > 0 && (
              <div className="space-y-1.5">
                <p className="pixel-font text-[10px] text-ink-soft uppercase tracking-wide">Progress History</p>
                {notes.map((note, i) => (
                  <div key={i} className="bg-purple-50 rounded-xl px-3 py-2">
                    <p className="thai-font text-xs text-ink-soft leading-snug">{note}</p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                openEditJourney(viewingJourney)
                setViewingJourney(null)
              }}
              className="w-full bg-brand text-white rounded-xl py-2 text-sm"
            >
              Edit
            </button>
          </InlineModal>
        )
      })()}

      {journeyModal && (
        <JourneySheet
          title={journeyModal.isNew ? 'Add Journey' : 'Edit Journey'}
          onClose={() => setJourneyModal(null)}
        >
          <input
            value={journeyEdit.title}
            onChange={(e) => setJourneyEdit({ ...journeyEdit, title: e.target.value })}
            placeholder="Title"
            className="neo-input thai-font px-4 py-3 text-sm w-full"
          />
          <textarea
            value={journeyEdit.desc}
            onChange={(e) => setJourneyEdit({ ...journeyEdit, desc: e.target.value })}
            placeholder="Description"
            rows={4}
            className="neo-input thai-font px-4 py-3 text-sm w-full resize-none"
          />
          <button
            onClick={handleSaveJourney}
            className="w-full bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-2xl py-4 font-bold text-sm"
          >
            Save
          </button>
          {!journeyModal.isNew && (
            <button
              onClick={handleDeleteJourney}
              className="w-full border border-red-200 text-red-500 rounded-2xl py-3 text-sm hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={() => setJourneyModal(null)}
            className="w-full text-ink-soft text-sm py-1 hover:text-ink"
          >
            Cancel
          </button>
        </JourneySheet>
      )}
    </>
  )
}
