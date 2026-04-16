import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/useUserStore'
import { useSelectStore } from '../stores/useSelectStore'
import { useTaskStore } from '../stores/useTaskStore'
import { careers, masteries, universities, programs } from '../data/onboardingData'

export default function ProfilePanel({ onClose }) {
  const navigate = useNavigate()
  const { user, coins, streak, resetUser } = useUserStore()
  const { mbti, career, mastery, university, program, resetSelection } = useSelectStore()
  const { tasks } = useTaskStore()

  const selectedCareer = careers.find((c) => c.id === career)
  const selectedMastery = masteries.find((m) => m.id === mastery)
  const selectedUniversity = universities.find((u) => u.id === university)
  const selectedProgram = programs.find((p) => p.id === program)

  const [showSettings, setShowSettings] = useState(false)
  const [newName, setNewName] = useState(user?.name || '')

  const completedTasks = tasks.filter((t) => t.completed).length

  function handleLogout() {
    resetUser()
    resetSelection()
    navigate('/')
  }

  const portfolioItems = [
    { label: 'Mastery', value: selectedMastery?.name, emoji: '⚡' },
    { label: 'Career', value: selectedCareer?.name, emoji: '💼' },
    { label: 'University', value: selectedUniversity?.name, emoji: '🏛️' },
    { label: 'Program', value: selectedProgram?.name, emoji: '📖' },
  ]

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden"
      style={{ top: '6%' }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="pixel-font text-[12px] text-gray-800">Profile</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ⚙️
          </button>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Avatar + Stats */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-linear-to-br from-purple-200 to-pink-200 flex items-center justify-center text-3xl shadow">
            {user?.avatar || '🎮'}
          </div>
          <div>
            <p className="pixel-font text-[11px] text-gray-800">{user?.name || 'Player'}</p>
            <p className="text-xs text-gray-500 mt-0.5">MBTI: {mbti || '-'}</p>
            <div className="flex gap-3 mt-1">
              <span className="text-xs font-semibold text-orange-500">🔥 {streak}</span>
              <span className="text-xs font-semibold text-yellow-600">🪙 {coins}</span>
              <span className="text-xs font-semibold text-green-600">✅ {completedTasks}</span>
            </div>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-purple-50 rounded-2xl p-4 space-y-3 border border-purple-100">
            <p className="pixel-font text-[9px] text-purple-600">Settings</p>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Display name"
                className="flex-1 rounded-xl border border-purple-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
              <button
                onClick={() => {
                  useUserStore.getState().setUser({ ...user, name: newName })
                  setShowSettings(false)
                }}
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

        {/* Portfolio */}
        <div>
          <p className="pixel-font text-[9px] text-gray-500 mb-2">Portfolio</p>
          <div className="grid grid-cols-2 gap-2">
            {portfolioItems.map((item) => (
              <div
                key={item.label}
                className="bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl p-3 border border-purple-100"
              >
                <span className="text-lg">{item.emoji}</span>
                <p className="pixel-font text-[8px] text-gray-500 mt-1">{item.label}</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5 truncate">
                  {item.value || '—'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Edit path button */}
        <button
          onClick={() => navigate('/select/mbti')}
          className="w-full rounded-2xl border-2 border-dashed border-purple-200 py-3 text-sm text-purple-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
        >
          ✏️ Edit your path
        </button>
      </div>
    </div>
  )
}
