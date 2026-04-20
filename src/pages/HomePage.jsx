import { useState, useEffect, useRef } from 'react'
import { mbtiCharacters } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'
import { useUserStore } from '../stores/useUserStore'
import { useTaskStore } from '../stores/useTaskStore'
import BottomNavBar from '../components/BottomNavBar'
import TaskPanel from '../components/TaskPanel'
import NewsPanel from '../components/NewsPanel'
import ProfilePanel from '../components/ProfilePanel'
import SkillPanel from '../components/SkillPanel'

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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [showTrackList, setShowTrackList] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0)
  const [isShowingProfile, setIsShowingProfile] = useState(true)
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  const user = useUserStore((state) => state.user)
  const coins = useUserStore((state) => state.coins)
  const streak = useUserStore((state) => state.streak)
  const { mbti } = useSelectStore()
  const { tasks } = useTaskStore()

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

  // Alternate profile / music view every 5 seconds
  useEffect(() => {
    const id = setInterval(() => setIsShowingProfile((v) => !v), 10000)
    return () => clearInterval(id)
  }, [])

  // Find MBTI character image
  const mbtiChar = mbtiCharacters.find((c) => c.code === mbti)

  // First pending task for the bubble
  const firstPending = tasks.find((t) => !t.completed)

  function handleTabChange(tab) {
    if (tab === 'music') {
      setShowTrackList((v) => !v)
      return
    }
    setShowTrackList(false)
    setActiveTab(tab)
    if (tab === 'news') setNewsRead(true)
  }

  function closePanel() {
    setActiveTab('home')
    setTaskInitialView('list')
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
      <audio ref={audioRef} src={musicSrc} onEnded={() => setIsPlaying(false)} />

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
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3 pb-2">
        {/* Profile / Music alternating widget */}
        <button
          onClick={() => handleTabChange(isShowingProfile ? 'profile' : 'music')}
          className="flex items-center gap-2 w-36 h-10 bg-white/90 rounded-full shadow px-2 overflow-hidden shrink-0"
        >
          {/* Icon circle */}
          <span className="w-7 h-7 rounded-full border border-white/80 overflow-hidden bg-purple-100 flex items-center justify-center shrink-0 shadow-sm">
            {isShowingProfile
              ? (user?.avatar
                  ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-base">🎮</span>)
              : <span className="text-base">{isPlaying ? '🎵' : '🎶'}</span>
            }
          </span>
          {/* Scrolling label */}
          <span className="flex-1 overflow-hidden">
            <span className={`block whitespace-nowrap pixel-font text-[9px] ${isShowingProfile ? 'text-gray-700' : 'text-blue-700'} ${
              (!isShowingProfile && isPlaying && TRACKS[currentTrackIdx].title.length > 12) ? 'animate-marquee' : ''
            }`}>
              {isShowingProfile
                ? (user?.name ?? 'Profile')
                : (isPlaying ? TRACKS[currentTrackIdx].title : 'Music')
              }
            </span>
          </span>
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

      {/* ── TRACKLIST PANEL ── */}
      {showTrackList && (
        <div className="absolute bottom-36 right-4 z-30 w-72 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[55vh]">
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
                <span className="pixel-font text-[9px] text-gray-400 w-10 shrink-0">{fmtTime(t.start)}</span>
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

      {/* ── BOTTOM NAV ── */}
      <BottomNavBar active={activeTab} onChange={handleTabChange} />
    </section>
  )
}

export default HomePage
