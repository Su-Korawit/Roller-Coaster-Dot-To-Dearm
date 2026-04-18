import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Share2 } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useUserStore } from '../stores/useUserStore'
import { useSelectStore } from '../stores/useSelectStore'
import { useTaskStore } from '../stores/useTaskStore'
import { careers, masteries, universities } from '../data/onboardingData'

// ─── Sub-components ────────────────────────────────────────────────────────────

function PortfolioCircle({ label, image, progress, isActive, onPress, onLongPress }) {
  const timerRef = useRef(null)
  const longFired = useRef(false)

  function startPress() {
    longFired.current = false
    timerRef.current = setTimeout(() => {
      longFired.current = true
      onLongPress()
    }, 500)
  }

  function endPress() {
    clearTimeout(timerRef.current)
    if (!longFired.current) onPress()
    longFired.current = false
  }

  function cancelPress() {
    clearTimeout(timerRef.current)
    longFired.current = false
  }

  return (
    <button
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={cancelPress}
      className="flex flex-col items-center gap-1.5 select-none"
    >
      <div className="relative">
        {/* Spinning gradient ring when active */}
        {isActive && (
          <div
            className="absolute -inset-1 rounded-full animate-spin"
            style={{
              background:
                'conic-gradient(#ec4899 0%, #fce7f3 25%, #ec4899 50%, #fce7f3 75%, #ec4899 100%)',
            }}
          />
        )}
        <div
          className={`relative z-10 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 ${isActive ? 'border-white' : 'border-gray-200'}`}
        >
          {image ? (
            <img src={image} alt={label} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-gray-300">?</span>
          )}
        </div>
        {/* Progress badge for mastery */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-[8px] rounded-full w-5 h-5 flex items-center justify-center font-bold z-20">
            {progress}%
          </div>
        )}
      </div>
      <span className="pixel-font text-[8px] text-gray-600">{label}</span>
    </button>
  )
}

// Modal uses absolute positioning to avoid backdrop-blur stacking context breaking fixed
function InlineModal({ title, children, onClose }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-3 shadow-xl">
        <p className="pixel-font text-[10px] text-gray-700">{title}</p>
        {children}
        <button
          onClick={onClose}
          className="w-full text-gray-400 text-sm py-1 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

const PORTFOLIO_KEYS = ['mastery', 'career', 'university']

export default function ProfilePanel({ onClose }) {
  const navigate = useNavigate()

  const {
    user,
    coins,
    streak,
    userName,
    portfolioData,
    journeys,
    setUser,
    setUserName,
    updatePortfolio,
    setJourneys,
    addJourneyItem,
    updateJourneyItem,
    deleteJourneyItem,
    resetUser,
  } = useUserStore()

  const { mbti, career, mastery, university, resetSelection } = useSelectStore()
  const { tasks } = useTaskStore()

  // Resolve onboarding selections for default circle images
  const selectedCareer = careers.find((c) => c.id === career)
  const selectedMastery = masteries.find((m) => m.id === mastery)
  const selectedUniversity = universities.find((u) => u.id === university)

  // Local UI state
  const [activeCategory, setActiveCategory] = useState('mastery')
  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState(userName || user?.name || '')

  // Portfolio edit modal state
  const [portfolioModal, setPortfolioModal] = useState(null) // null | key string
  const [portfolioEdit, setPortfolioEdit] = useState({ title: '', image: '', description: '' })

  // Journey edit modal state
  const [journeyModal, setJourneyModal] = useState(null) // null | { isNew, item }
  const [journeyEdit, setJourneyEdit] = useState({ title: '', desc: '' })

  const completedTasks = tasks.filter((t) => t.completed).length
  const displayName = userName || user?.name || 'Player'

  // Build circle data (store overrides > onboarding fallbacks)
  const circleData = {
    mastery: {
      label: 'Mastery',
      image: portfolioData?.mastery?.image || selectedMastery?.image || '',
      progress: portfolioData?.mastery?.progress ?? 50,
    },
    career: {
      label: 'Career',
      image: portfolioData?.career?.image || selectedCareer?.image || '',
      progress: undefined,
    },
    university: {
      label: 'University',
      image: portfolioData?.university?.image || selectedUniversity?.image || '',
      progress: undefined,
    },
  }

  const currentJourneys = journeys?.[activeCategory] || []

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleLogout() {
    resetUser()
    resetSelection()
    navigate('/')
  }

  function handleSaveName() {
    setUserName(editName)
    setUser({ ...user, name: editName })
    setShowSettings(false)
  }

  function openPortfolioEdit(key) {
    setPortfolioEdit({
      title: portfolioData?.[key]?.title || circleData[key].label,
      image: portfolioData?.[key]?.image || '',
      description: portfolioData?.[key]?.description || '',
    })
    setPortfolioModal(key)
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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden"
      style={{ top: '6%' }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Top-right icons */}
      <div className="flex justify-end items-center gap-2 px-5 pt-1">
        <button
          onClick={() => {
            setEditName(userName || user?.name || '')
            setShowSettings(!showSettings)
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <Settings size={19} />
        </button>
        <button
          onClick={() => alert('Share link copied!')}
          className="text-gray-400 hover:text-gray-600"
        >
          <Share2 size={19} />
        </button>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1 text-xl leading-none">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-purple-200 to-pink-200 flex items-center justify-center text-4xl shadow-md border-4 border-white">
              {user?.avatar || '🎮'}
            </div>
            <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          </div>
          <p className="pixel-font text-[13px] text-gray-800">{displayName}</p>
          <p className="text-xs text-gray-400">MBTI: {mbti || '-'}</p>
          <div className="flex gap-5 mt-0.5">
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-orange-500">{streak}</span>
              <span className="text-[9px] text-gray-400">Streak 🔥</span>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-yellow-600">{coins}</span>
              <span className="text-[9px] text-gray-400">Coins 🪙</span>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-green-600">{completedTasks}</span>
              <span className="text-[9px] text-gray-400">Done ✅</span>
            </div>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-purple-50 rounded-2xl p-4 space-y-3 border border-purple-100">
            <p className="pixel-font text-[9px] text-purple-600">Settings</p>
            <div className="flex gap-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Display name"
                className="flex-1 rounded-xl border border-purple-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
              <button
                onClick={handleSaveName}
                className="bg-[#a78bda] text-white rounded-xl px-3 py-2 text-sm"
              >
                Save
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="w-full rounded-xl border border-red-200 text-red-500 py-2 text-sm hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        )}

        {/* Portfolio circles */}
        <div>
          <p className="pixel-font text-[9px] text-gray-500 mb-3">Portfolio</p>
          <div className="flex justify-around">
            {PORTFOLIO_KEYS.map((key) => (
              <PortfolioCircle
                key={key}
                label={circleData[key].label}
                image={circleData[key].image}
                progress={key === 'mastery' ? circleData[key].progress : undefined}
                isActive={activeCategory === key}
                onPress={() => setActiveCategory(key)}
                onLongPress={() => openPortfolioEdit(key)}
              />
            ))}
          </div>
        </div>

        {/* Journey section */}
        <div>
          <p className="pixel-font text-[9px] text-gray-500 mb-2">
            Journey of {circleData[activeCategory].label}
          </p>
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
                          {...provided.dragHandleProps}
                          onClick={() => openEditJourney(item)}
                          className={`flex-shrink-0 w-20 h-20 rounded-xl bg-purple-50 border border-purple-100 flex flex-col items-center justify-center p-2 cursor-pointer transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-purple-300' : ''}`}
                        >
                          <span className="text-[9px] font-semibold text-gray-700 text-center leading-tight line-clamp-4">
                            {item.title || '—'}
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {/* Add button */}
                  <button
                    onClick={openAddJourney}
                    className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-purple-200 flex items-center justify-center text-purple-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
                  >
                    <span className="text-2xl leading-none">+</span>
                  </button>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Edit path */}
        <button
          onClick={() => navigate('/select/mbti')}
          className="w-full rounded-2xl border-2 border-dashed border-purple-200 py-3 text-sm text-purple-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
        >
          ✏️ Edit your path
        </button>
      </div>

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
            value={portfolioEdit.image}
            onChange={(e) => setPortfolioEdit({ ...portfolioEdit, image: e.target.value })}
            placeholder="Image URL"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
          />
          <textarea
            value={portfolioEdit.description}
            onChange={(e) => setPortfolioEdit({ ...portfolioEdit, description: e.target.value })}
            placeholder="Description"
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none"
          />
          <button
            onClick={handleSavePortfolio}
            className="w-full bg-[#a78bda] text-white rounded-xl py-2 text-sm"
          >
            Save
          </button>
        </InlineModal>
      )}

      {/* Journey Edit Modal */}
      {journeyModal && (
        <InlineModal
          title={journeyModal.isNew ? 'Add Journey' : 'Edit Journey'}
          onClose={() => setJourneyModal(null)}
        >
          <input
            value={journeyEdit.title}
            onChange={(e) => setJourneyEdit({ ...journeyEdit, title: e.target.value })}
            placeholder="Title"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
          />
          <textarea
            value={journeyEdit.desc}
            onChange={(e) => setJourneyEdit({ ...journeyEdit, desc: e.target.value })}
            placeholder="Description"
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none"
          />
          <button
            onClick={handleSaveJourney}
            className="w-full bg-[#a78bda] text-white rounded-xl py-2 text-sm"
          >
            Save
          </button>
          {!journeyModal.isNew && (
            <button
              onClick={handleDeleteJourney}
              className="w-full border border-red-200 text-red-500 rounded-xl py-2 text-sm hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
        </InlineModal>
      )}
    </div>
  )
}
