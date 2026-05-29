import { useState, useEffect, useRef } from 'react'
import { Calendar, MessageCircle } from 'lucide-react'
import { mbtiCharacters } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'
import { useUserStore } from '../stores/useUserStore'
import { useTaskStore } from '../stores/useTaskStore'
import { useSkillStore, PASSIVE_UNLOCK_THRESHOLDS } from '../stores/useSkillStore'
import { PASSIVE_SKILLS } from '../data/skillData'
import { APP_VIEWS } from '../constants/appViews'
import BottomNavBar from '../components/BottomNavBar'
import TaskPanel from '../components/TaskPanel'
import NewsPanel from '../components/NewsPanel'
import ProfilePanel from '../components/ProfilePanel'
import SkillPanel from '../components/SkillPanel'
import SocialPanel from '../components/SocialPanel'
import ChatPanel from '../components/ChatPanel'
import CalendarPopup from '../components/CalendarPopup'
import DailyLoginModal from '../components/DailyLoginModal'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useChatStore, buildChatId } from '../stores/useChatStore'
import { ADMIN_UID, ADMIN_DISPLAY_NAME } from '../constants/admin'

// ── MBTI background asset maps (eager glob, resolved at build time) ──────────
const bgImages = import.meta.glob(
  '../../assets/eachPageAssets/home/Background/*.png',
  { eager: true, query: '?url', import: 'default' },
)
const bgVideos = import.meta.glob(
  '../../assets/eachPageAssets/home/Background/*.mp4',
  { eager: true, query: '?url', import: 'default' },
)

function getMbtiAssets(mbtiCode) {
  if (!mbtiCode) return { image: null, video: null }
  const imgKey = `../../assets/eachPageAssets/home/Background/${mbtiCode}.png`
  const vidKey = `../../assets/eachPageAssets/home/Background/${mbtiCode}.mp4`
  return {
    image: bgImages[imgKey] ?? null,
    video: bgVideos[vidKey] ?? null,
  }
}

const fallbackBg = new URL('../../assets/eachPageAssets/home/04_Main_Home_Background_Referent.png', import.meta.url).href

const musicSrc = new URL('../../assets/eachPageAssets/home/Background_Music_1.mp3', import.meta.url).href

const TRACKS = [
  { title: 'Miitopia - Catalog', start: 0 },
  { title: 'Miitopia - Present', start: 67 },
  { title: 'January 2014 - Nintendo eShop', start: 112 },
  { title: 'Miitomo Summer Shop Music', start: 282 },
]
// { title: "Yoshi's On The Beach - Yoshi's Story", start: 370 },

function fmtTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

// Skill badge placeholder image (butterfly icon from overview)
const skillIcon = '🦋'

function HomePage() {
  const [activeTab, setActiveTab] = useState('home')
  const [newsRead, setNewsRead] = useState(false)
  const [taskInitialView, setTaskInitialView] = useState('list')
  const [chatInitialView, setChatInitialView] = useState('list')
  const [contactedAdmin, setContactedAdmin] = useState(() => localStorage.getItem('rc-contacted-admin') === 'true')
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [showTrackList, setShowTrackList] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0)
  const [isShowingProfile, setIsShowingProfile] = useState(true)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showDailyModal, setShowDailyModal] = useState(false)
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  const user = useUserStore((state) => state.user)
  const coins = useUserStore((state) => state.coins)
  const streak = useUserStore((state) => state.streak)
  const { mbti } = useSelectStore()
  const { tasks } = useTaskStore()
  const isPlannerActive = useSkillStore((state) => state.isPlannerActive)
  const passiveSlots = useSkillStore((state) => state.passiveSlots)
  const totalStacks = useUserStore((s) => s.totalStacks)
  const lastLoginDate = useUserStore((s) => s.lastLoginDate)

  // Show daily check-in modal on first mount if not yet checked in today
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (lastLoginDate !== today) setShowDailyModal(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resolve MBTI background assets and reset video state on mbti change
  const mbtiAssets = getMbtiAssets(mbti)
  useEffect(() => {
    setIsVideoLoaded(false)
    // If the video element already exists, reset its src to force reload
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [mbti])

  // Keep currentTrackIdx in sync as audio plays through the file
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    function onTimeUpdate() {
      const t = audio.currentTime
      let idx = 0
      for (let i = 0; i < TRACKS.length; i++) {
        if (TRACKS[i].start <= t) idx = i
        else break
      }
      setCurrentTrackIdx(idx)
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => audio.removeEventListener('timeupdate', onTimeUpdate)
  }, [])

  // Alternate profile / music view every 5 seconds — kept for backward compat
  // (no longer drives header UI, state retained to avoid removing setIsShowingProfile refs)
  useEffect(() => {
    const id = setInterval(() => setIsShowingProfile((v) => !v), 7000)
    return () => clearInterval(id)
  }, [])

  // Find MBTI character image
  const mbtiChar = mbtiCharacters.find((c) => c.code === mbti)

  // First pending task for the bubble
  const firstPending = tasks.find((t) => !t.completed)

  function handleTabChange(tab) {
    if (tab === APP_VIEWS.MUSIC) {
      setShowTrackList((v) => !v)
      return
    }
    setShowTrackList(false)
    setActiveTab(tab)
    if (tab === APP_VIEWS.NEWS) setNewsRead(true)
  }

  const openChatAction = useChatStore((s) => s.openChat)

  function closePanel() {
    setActiveTab(APP_VIEWS.HOME)
    setTaskInitialView('list')
    setChatInitialView('list')
  }

  async function openAdminChat() {
    const myUid = auth.currentUser?.uid
    if (!myUid) return
    const chatId = [myUid, ADMIN_UID].sort().join('_')
    await setDoc(doc(db, 'chats', chatId), {
      members: [myUid, ADMIN_UID].sort(),
      isAdminChat: true,
    }, { merge: true })
    useChatStore.getState().openChat(chatId, {
      uid: ADMIN_UID,
      displayName: ADMIN_DISPLAY_NAME,
      photoURL: null,
      isAdmin: true,
    })
    setChatInitialView('window')
    setActiveTab(APP_VIEWS.CHAT)
  }

  function handleAdminContacted() {
    localStorage.setItem('rc-contacted-admin', 'true')
    setContactedAdmin(true)
  }

  async function handleOpenChat(userId) {
    const myUid = auth.currentUser?.uid
    if (!myUid || !userId) return
    const snap = await getDoc(doc(db, 'users', userId))
    const otherUser = snap.exists()
      ? snap.data()
      : { uid: userId, displayName: 'Unknown', photoURL: null }
    openChatAction(buildChatId(myUid, userId), otherUser)
    setActiveTab(APP_VIEWS.CHAT)
  }

  // Opens the Calendar directly when the Planner passive skill is active.
  // Centralises the 'PLANNER_CALENDAR' view transition so no raw strings
  // are scattered across the component.
  function handlePlannerTransition() {
    setActiveTab(APP_VIEWS.PLANNER_CALENDAR)
    setShowCalendar(true)
  }

  function handleSelectTrack(idx) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = TRACKS[idx].start
    setCurrentTrackIdx(idx)
    audio.play()
    setIsPlaying(true)
  }

  function handleTogglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  return (
    <section className="relative h-full overflow-hidden">
      {/* ── BACKGROUND MUSIC ── */}
      <audio
        ref={audioRef}
        src={musicSrc}
        onEnded={() => {
          // Loop back to first track seamlessly
          const audio = audioRef.current
          if (!audio) return
          audio.currentTime = TRACKS[0].start
          setCurrentTrackIdx(0)
          audio.play()
          setIsPlaying(true)
        }}
      />

      {/* ── MBTI BACKGROUND ── */}
      {/* Layer 1: static image (shown immediately as placeholder) */}
      <img
        key={`bg-img-${mbti}`}
        src={mbtiAssets.image || fallbackBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
      />
      {/* Layer 2: video (fades in once ready, sits on top of image) */}
      {mbtiAssets.video && (
        <video
          ref={videoRef}
          key={`bg-vid-${mbti}`}
          src={mbtiAssets.video}
          autoPlay
          muted
          loop
          playsInline
          onCanPlayThrough={() => setIsVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none transition-opacity duration-1000 ${
            isVideoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* ── TOP HEADER ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3 pb-2 gap-2">

        {/* Left side: Avatar pill + Music pill */}
        <div className="flex items-center gap-2 min-w-0 flex-1">

          {/* Avatar button */}
          <button
            onClick={() => handleTabChange(APP_VIEWS.PROFILE)}
            className="w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center shrink-0 border border-white/60 active:scale-95 transition-transform"
          >
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
              : <span className="text-lg">🎮</span>
            }
          </button>

          {/* Music status pill */}
          <button
            onClick={() => handleTabChange(APP_VIEWS.MUSIC)}
            className="flex items-center gap-1.5 h-10 bg-white/90 rounded-full shadow px-3 overflow-hidden min-w-0 flex-1 active:scale-95 transition-transform"
          >
            <span className="text-sm shrink-0">{isPlaying ? '🎵' : '🎶'}</span>
            <span className="overflow-hidden flex-1">
              <span
                className={`block whitespace-nowrap pixel-font text-[8px] text-blue-700 ${
                  isPlaying && TRACKS[currentTrackIdx].title.length > 14 ? 'animate-marquee' : ''
                }`}
              >
                {isPlaying ? TRACKS[currentTrackIdx].title : 'Music'}
              </span>
            </span>
          </button>
        </div>

        {/* Streak + Coins */}
        <div className="flex items-center gap-3 bg-white/90 rounded-full px-4 py-1.5 shadow">
          <span className="pixel-font text-[11px] text-orange-500">🔥 {totalStacks}</span>
          <span className="pixel-font text-[11px] text-yellow-700">
            {coins}
            <span className="inline-block ml-1 w-5 h-5 rounded-full border-2 border-yellow-600 text-center text-[9px] leading-4">$</span>
          </span>
        </div>
      </div>

      {/* ── PASSIVE SKILL FABs (left side, below avatar) ── */}
      {/* Each slot: visible only when unlocked. Shows skill icon; Planner triggers CalendarPopup. */}
      <div className="absolute top-20 left-4 z-20 flex flex-col gap-2">
        {PASSIVE_UNLOCK_THRESHOLDS.map((threshold, slotIdx) => {
          const isUnlocked = totalStacks >= threshold
          const slot = passiveSlots[slotIdx] ?? { equippedSkillId: null }
          const skill = PASSIVE_SKILLS.find((s) => s.id === slot.equippedSkillId)

          // Locked & empty slot: show a small lock indicator
          if (!isUnlocked) {
            return (
              <div
                key={slotIdx}
                className="w-12 h-12 bg-white/60 rounded-2xl shadow flex items-center justify-center border border-gray-100 opacity-40 grayscale"
                title={`Unlock at ${threshold} stacks`}
              >
                <span className="text-base">🔒</span>
              </div>
            )
          }

          // Unlocked but empty
          if (!skill) {
            return (
              <button
                key={slotIdx}
                onClick={() => handleTabChange(APP_VIEWS.SKILL)}
                className="w-12 h-12 bg-white/80 rounded-2xl shadow flex items-center justify-center border-2 border-dashed border-gray-300 active:scale-95 transition-transform"
                title={`Slot ${slotIdx + 1}: tap to equip`}
              >
                <span className="pixel-font text-[8px] text-gray-400">{slotIdx + 1}</span>
              </button>
            )
          }

          // Unlocked & equipped
          const isPlanner = skill.id === 'planner'
          return (
            <button
              key={slotIdx}
              onClick={isPlanner ? handlePlannerTransition : () => handleTabChange(APP_VIEWS.SKILL)}
              className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-gray-100 active:scale-95 transition-transform animate-[fadeInLeft_0.3s_ease]"
              title={skill.name}
            >
              {isPlanner ? (
                <Calendar size={22} strokeWidth={1.5} className="text-purple-500" />
              ) : skill.image ? (
                <img src={skill.image} alt={skill.name} className="w-8 h-8 object-contain" />
              ) : (
                <span className="text-xl">{skill.emoji}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── NEWS BUTTON (top-right below coins) ── */}
      <div className="absolute top-20 right-4 z-20">
        <button
          onClick={() => handleTabChange(APP_VIEWS.NEWS)}
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

      {/* ── PANELS ── */}
      {activeTab === APP_VIEWS.TASK && <TaskPanel onClose={closePanel} initialView={taskInitialView} />}
      {activeTab === APP_VIEWS.NEWS && <NewsPanel onClose={closePanel} />}
      {activeTab === APP_VIEWS.PROFILE && <ProfilePanel onClose={closePanel} />}
      {activeTab === APP_VIEWS.SOCIAL && <SocialPanel onClose={closePanel} onOpenChat={handleOpenChat} />}
      {activeTab === APP_VIEWS.CHAT && (
        <ChatPanel
          onClose={closePanel}
          initialView={chatInitialView}
          onAdminContacted={handleAdminContacted}
        />
      )}
      {activeTab === APP_VIEWS.SKILL && (
        <SkillPanel
          onClose={closePanel}
          onOpenCreateTask={() => {
            setTaskInitialView('form')
            setActiveTab(APP_VIEWS.TASK)
          }}
          onOpenCalendar={handlePlannerTransition}
        />
      )}

      {/* ── CALENDAR POPUP (PLANNER_CALENDAR view) ── */}
      {showCalendar && (
        <CalendarPopup
          onClose={() => {
            setShowCalendar(false)
            setActiveTab(APP_VIEWS.HOME)
          }}
        />
      )}

      {/* ── DAILY MOOD CHECK-IN ── */}
      {showDailyModal && (
        <DailyLoginModal onClose={() => setShowDailyModal(false)} />
      )}

      {/* ── TRACKLIST PANEL ── */}
      {showTrackList && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-sm bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[55vh]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="min-w-0 flex-1">
              <p className="pixel-font text-[10px] font-bold text-gray-800">🎵 Background Music</p>
              {isPlaying && (
                <p className="pixel-font text-[9px] text-blue-600 mt-0.5 truncate">
                  ▶ {TRACKS[currentTrackIdx].title}
                </p>
              )}
            </div>
            <button
              onClick={handleTogglePlay}
              className="ml-3 shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm active:scale-95 transition-transform"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>
          {/* Track list */}
          <div className="overflow-y-auto">
            {TRACKS.map((t, i) => (
              <button
                key={i}
                onClick={() => handleSelectTrack(i)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left border-b border-gray-50 hover:bg-blue-50 transition-colors ${
                  currentTrackIdx === i && isPlaying ? 'bg-blue-50' : ''
                }`}
              >
                <span className={`pixel-font text-[9px] truncate flex-1 ${
                  currentTrackIdx === i && isPlaying ? 'text-blue-700 font-bold' : 'text-gray-700'
                }`}>
                  {t.title}
                </span>
                {currentTrackIdx === i && isPlaying && (
                  <span className="shrink-0 text-[10px] text-blue-500">♪</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── CONTACT DEVELOPER FAB ── */}
      {auth.currentUser && auth.currentUser.uid !== ADMIN_UID && (
        <div className="absolute bottom-18 right-4 z-55 group">
          {/* Tooltip — left of button */}
          <div className="absolute right-14 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            <div
              className="bg-gray-900/90 text-white rounded-full px-3 py-1 shadow-lg"
              style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}
            >
              ติดต่อผู้พัฒนา
            </div>
          </div>
          <button
            onClick={openAdminChat}
            className="relative w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #a78bda, #7c3aed)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 12px rgba(167,139,218,0.4)',
            }}
          >
            {!contactedAdmin && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            )}
            <MessageCircle size={22} className="text-white" />
          </button>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <BottomNavBar active={activeTab} onChange={handleTabChange} />
    </section>
  )
}

export default HomePage
