import { useState } from 'react'
import { mbtiCharacters } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'
import { useUserStore } from '../stores/useUserStore'
import { useTaskStore } from '../stores/useTaskStore'
import BottomNavBar from '../components/BottomNavBar'
import TaskPanel from '../components/TaskPanel'
import NewsPanel from '../components/NewsPanel'
import ProfilePanel from '../components/ProfilePanel'
import SkillPanel from '../components/SkillPanel'

const homeBg = new URL('../../assets/eachPageAssets/home/04_Main_Home_Background_Referent.png', import.meta.url).href

// Skill badge placeholder image (butterfly icon from overview)
const skillIcon = '🦋'

function HomePage() {
  const [activeTab, setActiveTab] = useState('home')
  const [newsRead, setNewsRead] = useState(false)
  const [taskInitialView, setTaskInitialView] = useState('list')

  const user = useUserStore((state) => state.user)
  const coins = useUserStore((state) => state.coins)
  const streak = useUserStore((state) => state.streak)
  const { mbti } = useSelectStore()
  const tasks = useTaskStore((state) => state.tasks)

  // Find MBTI character image
  const mbtiChar = mbtiCharacters.find((c) => c.code === mbti)

  // First pending task for the bubble
  const firstPending = tasks.find((t) => !t.completed)

  function handleTabChange(tab) {
    setActiveTab(tab)
    if (tab === 'news') setNewsRead(true)
  }

  function closePanel() {
    setActiveTab('home')
    setTaskInitialView('list')
  }

  return (
    <section
      className="relative h-full overflow-hidden"
      style={{
        backgroundImage: `url(${homeBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* ── TOP HEADER ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3 pb-2">
        {/* Avatar */}
        <button className="w-14 h-14 rounded-full border-2 border-white shadow-lg overflow-hidden bg-purple-100 flex items-center justify-center">
          {user?.avatar
            ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
            : <span className="text-2xl">🎮</span>
          }
        </button>

        {/* Streak + Coins */}
        <div className="flex items-center gap-3 bg-white/90 rounded-full px-4 py-1.5 shadow">
          <span className="pixel-font text-[11px] text-orange-500">🔥 {streak}</span>
          <span className="pixel-font text-[11px] text-yellow-700">
            {coins}
            <span className="inline-block ml-1 w-5 h-5 rounded-full border-2 border-yellow-600 text-center text-[9px] leading-4">$</span>
          </span>
        </div>
      </div>

      {/* ── SKILL BADGE (top-left below avatar) ── */}
      <div className="absolute top-20 left-4 z-20">
        <button
          onClick={() => handleTabChange('skill')}
          className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center text-2xl border border-gray-100 active:scale-95 transition-transform"
        >
          {skillIcon}
        </button>
      </div>

      {/* ── NEWS BUTTON (top-right below coins) ── */}
      <div className="absolute top-20 right-4 z-20">
        <button
          onClick={() => handleTabChange('news')}
          className="relative flex items-center gap-2 bg-white/90 rounded-2xl shadow-lg px-4 py-2 active:scale-95 transition-transform"
        >
          <span className="text-base">📰</span>
          <span className="pixel-font text-[10px] text-gray-700">News</span>
          {!newsRead && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white pixel-font text-[8px] flex items-center justify-center">
              1
            </span>
          )}
        </button>
      </div>

      {/* ── MBTI CHARACTER ── */}
      {mbtiChar && (
        <div className="absolute bottom-24 right-0 left-0 flex justify-center z-10 pointer-events-none">
          <img
            src={mbtiChar.image}
            alt={mbtiChar.code}
            className="h-72 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      )}

      {/* ── TASK BUBBLE ── */}
      {firstPending && (
        <div className="absolute z-20" style={{ top: '42%', left: '50%', transform: 'translateX(-40%)' }}>
          <div className="bg-white rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3 min-w-40">
            <div className="w-5 h-5 rounded border-2 border-gray-400 shrink-0" />
            <span className="pixel-font text-[10px] text-gray-800">{firstPending.title}</span>
          </div>
        </div>
      )}

      {/* ── PANELS ── */}
      {activeTab === 'task' && <TaskPanel onClose={closePanel} initialView={taskInitialView} />}
      {activeTab === 'news' && <NewsPanel onClose={closePanel} />}
      {activeTab === 'profile' && <ProfilePanel onClose={closePanel} />}
      {activeTab === 'skill' && (
        <SkillPanel
          onClose={closePanel}
          onOpenCreateTask={() => {
            setTaskInitialView('form')
            setActiveTab('task')
          }}
        />
      )}

      {/* ── BOTTOM NAV ── */}
      <BottomNavBar active={activeTab} onChange={handleTabChange} />
    </section>
  )
}

export default HomePage
