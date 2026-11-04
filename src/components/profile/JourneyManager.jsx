import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { compressImage } from '../../utils/compressImage'
import { useUserStore } from '../../stores/useUserStore'
import { usePlansStore } from '../../stores/usePlansStore'
import { universities } from '../../data/onboardingData'
import { tcasLogoUrl } from '../../hooks/useMytcas'
import PortfolioCircle from './PortfolioCircle'
import InlineModal from './InlineModal'
import JourneySheet from './JourneySheet'
import MasteryTracks from './MasteryTracks'

const PORTFOLIO_KEYS = ['mastery', 'career', 'university']

// The interactive body of the profile: the portfolio circles act as the
// category selector for the journey list, so they live together here behind a
// single `activeCategory`. Owns journey CRUD + reorder, AI roadmap generation,
// and the portfolio-edit modal. Reads its data straight from the stores.
export default function JourneyManager() {
  const portfolioData = useUserStore((s) => s.portfolioData)
  const journeys = useUserStore((s) => s.journeys)
  const updatePortfolio = useUserStore((s) => s.updatePortfolio)
  const setJourneys = useUserStore((s) => s.setJourneys)
  const addJourneyItem = useUserStore((s) => s.addJourneyItem)
  const updateJourneyItem = useUserStore((s) => s.updateJourneyItem)
  const deleteJourneyItem = useUserStore((s) => s.deleteJourneyItem)

  const rankOnePlan = usePlansStore((s) => s.plans[0])
  const university = rankOnePlan?.university ?? null

  const selectedUniversity = universities.find((u) => u.id === university)

  // Portfolio edit modal state
  const [portfolioModal, setPortfolioModal] = useState(null)
  const [portfolioEdit, setPortfolioEdit] = useState({ title: '', image: '', description: '' })
  const portfolioFileInputRef = useRef(null)

  // Journey edit modal state
  const [journeyModal, setJourneyModal] = useState(null)
  const [journeyEdit, setJourneyEdit] = useState({ title: '', desc: '' })

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

  return (
    <>
      {/* Portfolio circles */}
      <div>
        <p className="pixel-font text-xs text-ink-soft mb-3">Portfolio</p>
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
      {activeCategory === 'mastery' ? (
        <MasteryTracks />
      ) : (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="pixel-font text-xs text-ink-soft">
            Journey of {circleData[activeCategory].label}
          </p>
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
                {currentJourneys.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative shrink-0 w-20 rounded-xl transition-shadow ${
                            snapshot.isDragging ? 'shadow-lg' : ''
                          } bg-purple-50 border border-purple-100`}
                          style={{ height: '80px' }}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-1 right-1 text-ink-soft/50 hover:text-ink-soft cursor-grab active:cursor-grabbing leading-none text-xs select-none"
                          >
                            ⠿
                          </div>
                          <button
                            onClick={() => setViewingJourney(item)}
                            className="w-full h-full flex flex-col items-center justify-center p-2 pt-3 gap-1"
                          >
                            <span className="thai-font text-xs font-semibold text-ink text-center leading-tight line-clamp-2">
                              {item.title || '—'}
                            </span>
                          </button>
                        </div>
                      )}
                    </Draggable>
                ))}
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
      )}

      {/* Journey Detail View Modal */}
      {viewingJourney && (() => {
        const liveBlock = journeys?.[activeCategory]?.find((b) => b.id === viewingJourney.id) || viewingJourney
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
                <span className="text-xs text-purple-600 font-semibold">{liveBlock.progress || 0}%</span>
              </div>
            )}
            {notes.length > 0 && (
              <div className="space-y-1.5">
                <p className="pixel-font text-xs text-ink-soft uppercase tracking-wide">Progress History</p>
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
            className="px-input thai-font px-3 py-2 text-sm w-full"
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
              <div className="w-14 h-14 rounded-full overflow-hidden bg-brand-soft border-2 border-ink/10 flex items-center justify-center">
                {portfolioEdit.image
                  ? <img src={portfolioEdit.image} alt="preview" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-ink/10" />}
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
            className="px-input thai-font px-3 py-2 text-sm w-full resize-none"
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
            className="px-input thai-font px-4 py-3 text-sm w-full"
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
            className="w-full text-ink-soft text-sm py-1 hover:text-ink"
          >
            Cancel
          </button>
        </JourneySheet>
      )}
    </>
  )
}
