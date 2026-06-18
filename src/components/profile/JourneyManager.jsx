import { useState, useRef } from 'react'
import { Loader2, Camera } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { compressImage } from '../../utils/compressImage'
import { generateJourney } from '../../services/aiJourney'
import { useUserStore } from '../../stores/useUserStore'
import { useSelectStore } from '../../stores/useSelectStore'
import { careers, masteries, universities, programs } from '../../data/onboardingData'
import { tcasLogoUrl } from '../../hooks/useMytcas'
import PortfolioCircle from './PortfolioCircle'
import InlineModal from './InlineModal'
import JourneySheet from './JourneySheet'

const PORTFOLIO_KEYS = ['mastery', 'career', 'university']

// The interactive body of the profile: the portfolio circles act as the
// category selector for the journey list, so they live together here behind a
// single `activeCategory`. Owns journey CRUD + reorder, AI roadmap generation,
// and the portfolio-edit modal. Reads its data straight from the stores.
export default function JourneyManager() {
  const {
    portfolioData,
    journeys,
    activeMasteryBlockId,
    aiLanguage,
    setActiveMasteryBlockId,
    updatePortfolio,
    setJourneys,
    addJourneyItem,
    updateJourneyItem,
    deleteJourneyItem,
  } = useUserStore()

  const { mbti, career, mastery, university, program } = useSelectStore()

  const selectedCareer = careers.find((c) => c.id === career)
  const selectedMastery = masteries.find((m) => m.id === mastery)
  const selectedUniversity = universities.find((u) => u.id === university)
  const selectedProgram = programs.find((p) => p.id === program)

  // Portfolio edit modal state
  const [portfolioModal, setPortfolioModal] = useState(null)
  const [portfolioEdit, setPortfolioEdit] = useState({ title: '', image: '', description: '' })
  const portfolioFileInputRef = useRef(null)

  // Journey edit modal state
  const [journeyModal, setJourneyModal] = useState(null)
  const [journeyEdit, setJourneyEdit] = useState({ title: '', desc: '' })

  // AI generation state
  const [isGenerating, setIsGenerating] = useState(false)

  // Journey detail view state
  const [viewingJourney, setViewingJourney] = useState(null)

  // Active category tab (also drives which journey list shows)
  const [activeCategory, setActiveCategory] = useState('mastery')

  // Build circle data (store overrides > onboarding fallbacks)
  const circleData = {
    mastery: {
      label: 'Mastery',
      image: portfolioData?.mastery?.image || null,
      progress: portfolioData?.mastery?.progress ?? 50,
    },
    career: {
      label: 'Career',
      image: portfolioData?.career?.image || null,
      progress: undefined,
    },
    university: {
      label: 'University',
      image: portfolioData?.university?.image || selectedUniversity?.image || (university ? tcasLogoUrl(university) : ''),
      progress: undefined,
    },
  }

  const currentJourneys = journeys?.[activeCategory] || []

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function openPortfolioEdit(key) {
    setPortfolioEdit({
      title: portfolioData?.[key]?.title || circleData[key].label,
      image: portfolioData?.[key]?.image || '',
      description: portfolioData?.[key]?.description || '',
    })
    setPortfolioModal(key)
  }

  async function handlePortfolioImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setPortfolioEdit((prev) => ({ ...prev, image: compressed }))
    if (portfolioFileInputRef.current) portfolioFileInputRef.current.value = ''
  }

  function handleSavePortfolio() {
    updatePortfolio(portfolioModal, portfolioEdit)
    setPortfolioModal(null)
  }

  function handleDragEnd(result) {
    if (!result.destination) return
    const items = Array.from(currentJourneys)
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    setJourneys(activeCategory, items)
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
      addJourneyItem(activeCategory, {
        id: `journey-${Date.now()}`,
        title: journeyEdit.title,
        desc: journeyEdit.desc,
      })
    } else {
      updateJourneyItem(activeCategory, journeyModal.item.id, journeyEdit)
    }
    setJourneyModal(null)
  }

  function handleDeleteJourney() {
    deleteJourneyItem(activeCategory, journeyModal.item.id)
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

      setJourneys('mastery', journeyItems)
      setActiveCategory('mastery')
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
      {/* Portfolio circles */}
      <div>
        <p className="pixel-font text-[9px] text-gray-500 mb-3">Portfolio</p>
        <div className="flex justify-around">
          {PORTFOLIO_KEYS.map((key) => (
            <PortfolioCircle
              key={key}
              label={circleData[key].label}
              image={circleData[key].image}
              progress={undefined}
              isActive={activeCategory === key}
              onPress={() => setActiveCategory(key)}
              onLongPress={() => openPortfolioEdit(key)}
            />
          ))}
        </div>
      </div>

      {/* Journey section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="pixel-font text-[9px] text-gray-500">
            Journey of {circleData[activeCategory].label}
          </p>
          {activeCategory === 'mastery' && (
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
          )}
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="journey-list" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-3 overflow-x-auto pb-2"
                style={{ minHeight: '88px' }}
              >
                {currentJourneys.map((item, index) => {
                  const isPinned = activeCategory === 'mastery' && activeMasteryBlockId === item.id
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
                          {/* Pinned badge */}
                          {isPinned && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[7px] rounded-full px-1.5 py-0.5 whitespace-nowrap z-10 pixel-font">
                              Focus
                            </div>
                          )}
                          {/* Dedicated drag handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-1 right-1 text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing leading-none text-[10px] select-none"
                          >
                            ⠿
                          </div>
                          {/* Pin button (mastery only) */}
                          {activeCategory === 'mastery' && (
                            <button
                              onClick={() => setActiveMasteryBlockId(isPinned ? null : item.id)}
                              className={`absolute bottom-1 left-1 text-[11px] leading-none ${
                                isPinned ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'
                              }`}
                              title={isPinned ? 'Unpin block' : 'Set as active focus'}
                            >
                              📌
                            </button>
                          )}
                          {/* Clickable area — opens detail view */}
                          <button
                            onClick={() => setViewingJourney(item)}
                            className="w-full h-full flex flex-col items-center justify-center p-2 pt-3 gap-1"
                          >
                            <span className="text-[9px] font-semibold text-gray-700 text-center leading-tight line-clamp-2">
                              {item.title || '—'}
                            </span>
                            {/* Credited friends avatar stack */}
                            {(() => {
                              const credited = (item.progressNotes || []).filter((n) => n?.creditedFriend)
                              if (!credited.length) return null
                              return (
                                <div className="flex items-center justify-center" title="ทำร่วมกับเพื่อน">
                                  {credited.slice(0, 3).map((c, i) => (
                                    <div
                                      key={i}
                                      className="w-3.5 h-3.5 rounded-full overflow-hidden border border-white shrink-0 bg-purple-200"
                                      style={{ marginLeft: i > 0 ? '-5px' : 0, zIndex: credited.length - i }}
                                    >
                                      {c.creditedFriend.photoURL
                                        ? <img src={c.creditedFriend.photoURL} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-[5px] flex items-center justify-center w-full h-full">👤</span>}
                                    </div>
                                  ))}
                                  {credited.length > 3 && (
                                    <div
                                      className="w-3.5 h-3.5 rounded-full bg-gray-300 border border-white flex items-center justify-center shrink-0"
                                      style={{ marginLeft: '-5px', zIndex: 0 }}
                                    >
                                      <span className="text-[4px] text-gray-600">+{credited.length - 3}</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </button>
                        </div>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
                {/* Add button */}
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

      {/* Journey Detail View Modal */}
      {viewingJourney && (() => {
        const liveBlock = journeys?.[activeCategory]?.find((b) => b.id === viewingJourney.id) || viewingJourney
        const notes = liveBlock.progressNotes || []
        return (
          <InlineModal
            title={liveBlock.title || 'Journey Step'}
            onClose={() => setViewingJourney(null)}
          >
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {liveBlock.desc || liveBlock.description || 'No description available.'}
            </p>
            {liveBlock.progress !== undefined && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
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
                <p className="pixel-font text-[8px] text-gray-400 uppercase tracking-wide">Progress History</p>
                {notes.map((note, i) => (
                  <div key={i} className="bg-purple-50 rounded-xl px-3 py-2">
                    <p className="text-[11px] text-gray-600 leading-snug">{note}</p>
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

      {/* Portfolio Edit Modal */}
      {portfolioModal && (
        <InlineModal
          title={`Edit ${circleData[portfolioModal].label}`}
          onClose={() => setPortfolioModal(null)}
        >
          <input
            value={portfolioEdit.title}
            onChange={(e) => setPortfolioEdit({ ...portfolioEdit, title: e.target.value })}
            placeholder="Title"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
          />
          <input
            ref={portfolioFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePortfolioImageChange}
          />
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                {portfolioEdit.image
                  ? <img src={portfolioEdit.image} alt="preview" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gray-200" />}
              </div>
              <button
                type="button"
                onClick={() => portfolioFileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand rounded-full flex items-center justify-center shadow"
              >
                <Camera size={11} className="text-white" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => portfolioFileInputRef.current?.click()}
              className="text-xs text-brand font-semibold hover:underline text-left"
            >
              Upload image
            </button>
          </div>
          <textarea
            value={portfolioEdit.description}
            onChange={(e) => setPortfolioEdit({ ...portfolioEdit, description: e.target.value })}
            placeholder="Description"
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none"
          />
          <button
            onClick={handleSavePortfolio}
            className="w-full bg-brand text-white rounded-xl py-2 text-sm"
          >
            Save
          </button>
        </InlineModal>
      )}

      {/* Journey Add / Edit Bottom Sheet */}
      {journeyModal && (
        <JourneySheet
          title={journeyModal.isNew ? 'Add Journey' : 'Edit Journey'}
          onClose={() => setJourneyModal(null)}
        >
          <input
            value={journeyEdit.title}
            onChange={(e) => setJourneyEdit({ ...journeyEdit, title: e.target.value })}
            placeholder="Title"
            className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
          <textarea
            value={journeyEdit.desc}
            onChange={(e) => setJourneyEdit({ ...journeyEdit, desc: e.target.value })}
            placeholder="Description"
            rows={4}
            className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
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
            className="w-full text-gray-400 text-sm py-1 hover:text-gray-500"
          >
            Cancel
          </button>
        </JourneySheet>
      )}
    </>
  )
}
