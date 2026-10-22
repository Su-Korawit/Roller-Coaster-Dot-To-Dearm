import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Calendar, MessageCircle, Map, Newspaper, Trophy, Flame, Gamepad2, GraduationCap, Menu, X } from 'lucide-react'
import LevelBadge from '../components/hud/LevelBadge'
import { useUserStore } from '../stores/useUserStore'
import { useAuthStore } from '../stores/useAuthStore'
import { APP_VIEWS, shouldShowNav } from '../constants/appViews'
import BottomNavBar from '../components/BottomNavBar'
import TaskPanel from '../components/TaskPanel'
import NewsPanel from '../components/NewsPanel'
import ProfilePanel from '../components/ProfilePanel'
import SkillPanel from '../components/SkillPanel'
import SocialPanel from '../components/SocialPanel'
import ChatPanel from '../components/ChatPanel'
import CalendarPopup from '../components/CalendarPopup'
import MasteryPopup from '../components/MasteryPopup'
import SchoolPanel from '../components/school/SchoolPanel'
import SubjectDetailPanel from '../components/school/SubjectDetailPanel'
import DailyLoginModal from '../components/DailyLoginModal'
import { getDoc, setDoc } from 'firebase/firestore'
import { auth } from '../firebase'
import { useChatStore } from '../stores/useChatStore'
import { buildChatId, refs } from '../lib/db'
import { ADMIN_UID, ADMIN_DISPLAY_NAME } from '../constants/admin'
import { GoldIcon } from '../components/ui/GoldIcon'
import { CoinIcon } from '../components/ui/CoinIcon'
import { useInventoryStore } from '../stores/useInventoryStore'
import { useCloudAsset } from '../hooks/useCloudAsset'
import { getMusicConfig, DEFAULT_TRACKS } from '../utils/musicConfig'
import MusicPanel from '../components/music/MusicPanel'
import { usePopupStore } from '../stores/usePopupStore'

const GameCanvas = lazy(() => import('../components/GameCanvas'))
const RoadmapPage = lazy(() => import('./RoadmapPage'))

function HomePage() {
  const [activeTab, setActiveTab] = useState('home')
  const [newsRead, setNewsRead] = useState(false)
  const [taskInitialView, setTaskInitialView] = useState('list')
  const [chatInitialView, setChatInitialView] = useState('list')
  const [openSubjectId, setOpenSubjectId] = useState(null)
  const [contactedAdmin, setContactedAdmin] = useState(() => localStorage.getItem('rc-contacted-admin') === 'true')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0)
  // Track chapter list, admin-editable via Firestore (musicConfig/background).
  // Starts from the built-in default and hydrates from Firestore on mount.
  const [tracks, setTracks] = useState(DEFAULT_TRACKS)
  const audioRef = useRef(null)
  const musicSrc = useCloudAsset('media/audio/Background_Music_1.mp3', null)

  const activePopup = usePopupStore((s) => s.activePopup)
  const openPopup = usePopupStore((s) => s.open)
  const closePopup = usePopupStore((s) => s.close)

  const profilePhotoURL = useUserStore((s) => s.profilePhotoURL)
  const authUser = useAuthStore((s) => s.user)
  const focusXp = useUserStore((s) => s.focusXp)
  const coins = useUserStore((state) => state.coins)
  const totalStacks = useUserStore((s) => s.totalStacks)
  const gold = useInventoryStore((s) => s.gold)
  const uiVisibility = useUserStore((s) => s.uiVisibility)
  const [menuOpen, setMenuOpen] = useState(false)

  // Daily check-in — once per day, on entering Home.
  useEffect(() => {
    if (useUserStore.getState().needsDailyCheckIn()) openPopup('dailyLogin')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load the admin-editable track list (falls back to DEFAULT_TRACKS on error)
  useEffect(() => {
    let alive = true
    getMusicConfig().then(({ tracks }) => { if (alive) setTracks(tracks) })
    return () => { alive = false }
  }, [])

  // Keep currentTrackIdx in sync as audio plays through the file
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    function onTimeUpdate() {
      const t = audio.currentTime
      let idx = 0
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].start <= t) idx = i
        else break
      }
      setCurrentTrackIdx(idx)
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => audio.removeEventListener('timeupdate', onTimeUpdate)
  }, [tracks, musicSrc])

  function handleTabChange(tab) {
    if (tab === APP_VIEWS.MUSIC) {
      if (activePopup === 'trackList') closePopup()
      else openPopup('trackList')
      return
    }
    if (activePopup === 'trackList') closePopup()
    setOpenSubjectId(null)
    setActiveTab(tab)
    if (tab === APP_VIEWS.NEWS) setNewsRead(true)
  }

  const openChatAction = useChatStore((s) => s.openChat)

  function closePanel() {
    setActiveTab(APP_VIEWS.HOME)
    setTaskInitialView('list')
    setChatInitialView('list')
    setOpenSubjectId(null)
  }

  // Opens the full Roadmap overlay from inside Profile. Profile (z-50) sits
  // above the Roadmap overlay (z-40), so Profile must close first or the
  // Roadmap would render invisibly underneath it.
  function handleOpenRoadmapFromProfile() {
    closePanel()
    openPopup('roadmap')
  }

  async function openAdminChat() {
    const myUid = auth.currentUser?.uid
    if (!myUid) return
    const chatId = [myUid, ADMIN_UID].sort().join('_')
    await setDoc(refs.chat(chatId), {
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
    const snap = await getDoc(refs.user(userId))
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
    openPopup('calendar')
  }

  function handleSelectTrack(idx) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = tracks[idx].start
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
      {musicSrc && (
        <audio
          ref={audioRef}
          src={musicSrc}
          onEnded={() => {
            // Loop back to first track seamlessly
            const audio = audioRef.current
            if (!audio) return
            audio.currentTime = tracks[0].start
            setCurrentTrackIdx(0)
            audio.play()
            setIsPlaying(true)
          }}
        />
      )}

      {/* ── GAME BACKGROUND ── */}
      <div className="absolute inset-0">
        <Suspense
          fallback={
            <div className="w-full h-full px-sky-bg" />
          }
        >
          <GameCanvas active={activeTab === APP_VIEWS.HOME && activePopup !== 'calendar'} onOpenView={handleTabChange} />
        </Suspense>
      </div>

      {/* Gradient scrim — top: keeps header pills readable over pixel art */}
      <div className="absolute top-0 inset-x-0 h-24 bg-linear-to-b from-black/30 to-transparent z-10 pointer-events-none" />
      {/* Gradient scrim — bottom: keeps bottom nav readable */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-linear-to-t from-black/30 to-transparent z-10 pointer-events-none" />

      {/* ── TOP HEADER ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3 pb-2 gap-2 pointer-events-none">

        {/* Left side: Avatar */}
        <div className="flex items-center gap-2 min-w-0 flex-1">

          {/* Avatar button + MMO-style level coin / XP bar */}
          <div className="relative shrink-0">
          <button
            onClick={() => handleTabChange(APP_VIEWS.PROFILE)}
            aria-label="โปรไฟล์"
            className="pointer-events-auto px-btn w-10 h-10 md:w-12 md:h-12 rounded-full bg-paper flex items-center justify-center shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {(profilePhotoURL || authUser?.photoURL)
              ? <img src={profilePhotoURL || authUser.photoURL} alt="avatar" className="w-full h-full object-cover rounded-full" />
              : <Gamepad2 size={18} strokeWidth={2.5} className="text-ink" />
            }
          </button>
          <LevelBadge xp={focusXp} />
          </div>

        </div>

        {/* Streak + Coins + Gold */}
        <div className="pointer-events-auto px-slab flex items-center gap-3 px-4 py-1.5">
          <span className="pixel-font text-xs text-ink flex items-center gap-1">
            <Flame size={14} strokeWidth={2.5} className="text-danger" aria-hidden="true" />
            {totalStacks}
          </span>
          <span className="pixel-font text-xs text-ink flex items-center gap-1">
            <CoinIcon size={14} />
            {coins}
          </span>
          <span className="pixel-font text-xs text-ink flex items-center gap-1">
            <GoldIcon size={14} />
            {gold}g
          </span>
        </div>
      </div>

      {/* ── MENU (Calendar · Mastery · Roadmap · Schedule · News) — one button, opens a short list ── */}
      {uiVisibility.shortcuts && (
      <div className="absolute top-20 left-4 z-20">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="เมนู"
          aria-expanded={menuOpen}
          className="relative px-btn w-12 h-12 rounded-lg bg-paper flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {menuOpen ? <X size={22} strokeWidth={2.5} className="text-ink" /> : <Menu size={22} strokeWidth={2.5} className="text-ink" />}
          {!newsRead && uiVisibility.newsButton && !menuOpen && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-danger border-2 border-ink" aria-hidden="true" />
          )}
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <ul role="menu" className="relative z-20 mt-2 px-slab p-1 w-44 flex flex-col">
              {[
                { icon: Calendar, label: 'ปฏิทิน', run: handlePlannerTransition },
                { icon: Trophy, label: 'Mastery', run: () => openPopup('mastery') },
                { icon: Map, label: 'Roadmap', run: () => openPopup('roadmap') },
                { icon: GraduationCap, label: 'ตารางเรียน', run: () => handleTabChange(APP_VIEWS.SCHOOL) },
                ...(uiVisibility.newsButton ? [{ icon: Newspaper, label: 'ข่าวสาร', run: () => handleTabChange(APP_VIEWS.NEWS), dot: !newsRead }] : []),
              ].map(({ icon, label, run, dot }) => {
                const MenuIcon = icon
                return (
                <li key={label} role="none">
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); run() }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md thai-font text-sm text-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <MenuIcon size={18} strokeWidth={2.5} aria-hidden="true" />
                    <span className="flex-1 text-left">{label}</span>
                    {dot && <span className="w-2.5 h-2.5 rounded-full bg-danger border border-ink" aria-label="ใหม่" />}
                  </button>
                </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
      )}

      {/* ── PANELS ── */}
      {activeTab === APP_VIEWS.TASK && <TaskPanel onClose={closePanel} initialView={taskInitialView} />}
      {activeTab === APP_VIEWS.NEWS && <NewsPanel onClose={closePanel} />}
      {activeTab === APP_VIEWS.PROFILE && (
        <ProfilePanel onClose={closePanel} onOpenRoadmap={handleOpenRoadmapFromProfile} />
      )}
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
      {activeTab === APP_VIEWS.SCHOOL && !openSubjectId && (
        <SchoolPanel
          onClose={closePanel}
          onOpenSubject={setOpenSubjectId}
          initialDate={new Date().toISOString().slice(0, 10)}
          today={new Date().toISOString().slice(0, 10)}
        />
      )}
      {activeTab === APP_VIEWS.SCHOOL && openSubjectId && (
        <SubjectDetailPanel
          subjectId={openSubjectId}
          onClose={() => setOpenSubjectId(null)}
          today={new Date().toISOString().slice(0, 10)}
        />
      )}

      {/* ── CALENDAR POPUP (PLANNER_CALENDAR view) ── */}
      {activePopup === 'calendar' && (
        <CalendarPopup
          onClose={() => {
            closePopup()
            setActiveTab(APP_VIEWS.HOME)
          }}
        />
      )}

      {activePopup === 'mastery' && <MasteryPopup onClose={closePopup} />}

      {/* ── DAILY MOOD CHECK-IN ── */}
      {activePopup === 'dailyLogin' && (
        <DailyLoginModal onClose={closePopup} today={new Date().toISOString().slice(0, 10)} />
      )}

      {/* ── ROADMAP OVERLAY (semi-transparent, game keeps running behind) ── */}
      {activePopup === 'roadmap' && (
        <div className="absolute inset-0 z-40 bg-white/20 backdrop-blur-[2px]">
          <Suspense fallback={null}>
            <RoadmapPage onClose={closePopup} />
          </Suspense>
        </div>
      )}

      {activePopup === 'trackList' && (
        <MusicPanel
          onClose={closePopup}
          tracks={tracks}
          currentTrackIdx={currentTrackIdx}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onSelectTrack={handleSelectTrack}
        />
      )}

      {/* ── CONTACT DEVELOPER FAB ── */}
      {uiVisibility.contactFab && auth.currentUser && auth.currentUser.uid !== ADMIN_UID && (
        <div className="absolute bottom-18 right-4 z-55 group">
          {/* Tooltip — left of button */}
          <div className="absolute right-14 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            <div className="thai-font text-xs bg-gray-900/90 text-white rounded-full px-3 py-1 shadow-lg">
              ติดต่อผู้พัฒนา
            </div>
          </div>
          <button
            onClick={openAdminChat}
            aria-label="ติดต่อผู้พัฒนา"
            className="relative px-btn w-12 h-12 rounded-lg bg-brand-strong flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
          >
            {!contactedAdmin && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-danger border-2 border-ink" />
            )}
            <MessageCircle size={22} className="text-white" />
          </button>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      {shouldShowNav(activeTab) && <BottomNavBar active={activeTab} onChange={handleTabChange} />}
    </section>
  )
}

export default HomePage
