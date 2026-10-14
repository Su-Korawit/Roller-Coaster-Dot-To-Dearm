import { useEffect, useRef, useState } from 'react'
import { mbtiColor } from '../constants/mbtiColors'
import { Z_CELEBRATION } from '../constants/zIndex'
import { shapes } from '../lib/db'

function scoreColor(score) {
  if (score >= 90) return '#d99b3b'
  if (score >= 71) return '#8a4a70'
  return '#7ea04a'
}

// 20 particles radiating from center — deterministic angles
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  char: ['★','♥','✦','◆','★','♥','✦','◆'][i % 8],
  rot: i * 18,
  ty: -(90 + (i % 3) * 25),
  delay: 1.0 + i * 0.04,
  dur: 0.85 + (i % 5) * 0.08,
  size: 14 + (i % 4) * 3,
  color: ['#e8b04a','#d98ba0','#8a4a70','#9db557','#f3e5c2','#e6a6b4','#d9b3cf','#c0d470'][i % 8],
}))

// 10 floating hearts at varied x positions
const HEARTS = [
  { char:'❤️', left:5,  delay:0,   dur:3.0, size:20 },
  { char:'💜', left:15, delay:0.3, dur:2.5, size:24 },
  { char:'💙', left:25, delay:0.6, dur:3.5, size:18 },
  { char:'🩷', left:35, delay:0.9, dur:2.8, size:22 },
  { char:'💛', left:45, delay:1.2, dur:3.2, size:20 },
  { char:'❤️', left:55, delay:0.2, dur:2.7, size:24 },
  { char:'💜', left:65, delay:0.5, dur:3.3, size:18 },
  { char:'💙', left:75, delay:0.8, dur:2.6, size:22 },
  { char:'🩷', left:85, delay:1.1, dur:3.1, size:20 },
  { char:'💛', left:95, delay:1.4, dur:2.9, size:16 },
]

// 20 twinkling background stars
const STARS = [
  {char:'★',top:5, left:10,delay:0,   dur:1.5,size:12,color:'#e8b04a'},
  {char:'✦',top:12,left:85,delay:0.3, dur:2.0,size:8, color:'#fff'   },
  {char:'✧',top:20,left:30,delay:0.6, dur:1.8,size:10,color:'#e6a6b4'},
  {char:'★',top:8, left:60,delay:0.9, dur:1.3,size:14,color:'#d9b3cf'},
  {char:'✦',top:30,left:5, delay:0.15,dur:2.2,size:8, color:'#fff'   },
  {char:'✧',top:35,left:92,delay:0.45,dur:1.6,size:12,color:'#f3e5c2'},
  {char:'★',top:15,left:45,delay:0.75,dur:1.9,size:10,color:'#e8b04a'},
  {char:'✦',top:45,left:20,delay:0.05,dur:2.4,size:8, color:'#fff'   },
  {char:'✧',top:55,left:75,delay:0.35,dur:1.7,size:14,color:'#e6a6b4'},
  {char:'★',top:25,left:88,delay:0.65,dur:2.1,size:10,color:'#d9b3cf'},
  {char:'✦',top:65,left:35,delay:0.95,dur:1.4,size:8, color:'#f3e5c2'},
  {char:'✧',top:70,left:55,delay:0.25,dur:2.3,size:12,color:'#fff'   },
  {char:'★',top:80,left:10,delay:0.55,dur:1.8,size:10,color:'#e8b04a'},
  {char:'✦',top:75,left:80,delay:0.85,dur:2.0,size:8, color:'#d9b3cf'},
  {char:'✧',top:40,left:50,delay:0.10,dur:1.6,size:14,color:'#e6a6b4'},
  {char:'★',top:88,left:40,delay:0.40,dur:2.5,size:10,color:'#f3e5c2'},
  {char:'✦',top:92,left:65,delay:0.70,dur:1.3,size:8, color:'#fff'   },
  {char:'✧',top:60,left:15,delay:1.00,dur:2.0,size:12,color:'#e8b04a'},
  {char:'★',top:50,left:95,delay:0.20,dur:1.7,size:10,color:'#d9b3cf'},
  {char:'✦',top:18,left:70,delay:0.50,dur:2.2,size:8, color:'#e6a6b4'},
]

// ─── CSS keyframes (injected once) ────────────────────────────────────────────
const KEYFRAMES = `
@keyframes rc-fade-in {
  from { opacity: 0 } to { opacity: 1 }
}
@keyframes rc-slide-in-left {
  from { transform: translateX(-200px); opacity: 0 }
  to   { transform: translateX(0);      opacity: 1 }
}
@keyframes rc-slide-in-right {
  from { transform: translateX(200px);  opacity: 0 }
  to   { transform: translateX(0);      opacity: 1 }
}
@keyframes rc-ring-pulse {
  0%,100% { transform: scale(1)    }
  50%     { transform: scale(1.18) }
}
@keyframes rc-match-boom {
  0%   { transform: scale(0);   opacity: 0 }
  60%  { transform: scale(1.35);opacity: 1 }
  100% { transform: scale(1);   opacity: 1 }
}
@keyframes rc-particle {
  from { transform: rotate(var(--rot)) translateY(0)         scale(1); opacity: 1 }
  to   { transform: rotate(var(--rot)) translateY(var(--ty)) scale(0); opacity: 0 }
}
@keyframes rc-float-up {
  from { transform: translateY(0)     rotate(0deg);   opacity: 0.85 }
  to   { transform: translateY(-100vh)rotate(360deg); opacity: 0    }
}
@keyframes rc-twinkle {
  0%,100% { opacity: 0.2; transform: scale(1)   }
  50%     { opacity: 1;   transform: scale(1.4) }
}
@keyframes rc-slide-up {
  from { transform: translateY(80px); opacity: 0 }
  to   { transform: translateY(0);    opacity: 1 }
}
@keyframes rc-shimmer {
  from { background-position: -300px center }
  to   { background-position:  300px center }
}
@keyframes rc-toast-in {
  0%  { transform: translateY(-80px); opacity: 0 }
  15% { transform: translateY(0);     opacity: 1 }
  80% { transform: translateY(0);     opacity: 1 }
  100%{ transform: translateY(-80px); opacity: 0 }
}
@keyframes rc-star-sad {
  from { transform: translateY(0)   rotate(0);    opacity: 0.7 }
  to   { transform: translateY(60px)rotate(180deg);opacity: 0  }
}
@media (prefers-reduced-motion: reduce) {
  [data-rc-anim] { animation: none !important; transition: none !important; }
}
`

// ─── Avatar component ─────────────────────────────────────────────────────────
function MatchAvatar({ user, slideDir, delay, reduced }) {
  const color = mbtiColor(shapes.readProfile(user).mbti)
  const src = user?.photoURL
  const initial = (user?.displayName || '?').charAt(0).toUpperCase()
  return (
    <div
      data-rc-anim
      style={reduced ? {} : {
        animation: `${slideDir === 'left' ? 'rc-slide-in-left' : 'rc-slide-in-right'} 0.5s ease-out ${delay}s both`,
      }}
    >
      <div
        data-rc-anim
        className="rounded-full flex items-center justify-center overflow-hidden"
        style={{
          width: 80, height: 80,
          border: `4px solid ${color}`,
          boxShadow: `0 0 0 4px ${color}44, 0 0 24px ${color}66`,
          background: '#fff',
          animation: reduced ? 'none' : `rc-ring-pulse 0.6s ease-in-out ${delay + 0.6}s 3`,
        }}
      >
        {src
          ? <img src={src} alt="" className="w-full h-full object-cover" />
          : <span className="font-bold text-2xl" style={{ color }}>{initial}</span>}
      </div>
      <p className="pixel-font text-[8px] text-white/90 text-center mt-1.5 max-w-[80px] truncate">
        {user?.displayName || '?'}
      </p>
    </div>
  )
}

// ─── No-match toast ───────────────────────────────────────────────────────────
function NoMatchToast({ score, onClose }) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const t = setTimeout(() => onCloseRef.current(), 2000)
    return () => clearTimeout(t)
  }, [])

  const SAD_STARS = ['★', '✦', '✧']

  return (
    <div
      className="fixed inset-x-0 top-0 flex justify-center pointer-events-none px-4 pt-4"
      style={{ zIndex: Z_CELEBRATION }}
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div
        data-rc-anim
        className="bg-ink/90 backdrop-blur-sm rounded-2xl px-5 py-3 flex flex-col items-center gap-1 shadow-xl relative overflow-hidden"
        style={{ animation: 'rc-toast-in 2s ease-in-out forwards' }}
      >
        <p className="pixel-font text-[10px] text-white/70">Match Score: {score}%</p>
        <p className="thai-font text-xs text-white/50">ยังไม่ Match — ลองใหม่ในอีก 24 ชม.</p>
        {/* 3 sad gray stars drifting down */}
        {SAD_STARS.map((s, i) => (
          <span
            key={i}
            data-rc-anim
            className="absolute text-white/40"
            style={{
              top: '30%',
              left: `${25 + i * 25}%`,
              fontSize: 14,
              animation: `rc-star-sad 1.2s ease-in ${0.3 + i * 0.2}s forwards`,
              opacity: 0,
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Full match overlay ───────────────────────────────────────────────────────
function FullMatchOverlay({ score, targetUser, myUser, onClose, onOpenChat, onViewProfile, reduced }) {
  const [scoreWidth, setScoreWidth] = useState(0)
  const [scoreVisible, setScoreVisible] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const t1 = setTimeout(() => setScoreVisible(true), reduced ? 100 : 1500)
    const t2 = setTimeout(() => setScoreWidth(score), reduced ? 200 : 1700)
    const t3 = setTimeout(() => setCardVisible(true), reduced ? 300 : 2500)
    const t4 = setTimeout(() => onCloseRef.current(), 6000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [score, reduced])

  const barColor = scoreColor(score)
  const isGold = score >= 90

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ zIndex: Z_CELEBRATION }}
      onClick={onClose}
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Backdrop */}
      <div
        data-rc-anim
        className="absolute inset-0"
        style={{
          background: 'rgba(10,5,30,0.88)',
          backdropFilter: 'blur(8px)',
          animation: reduced ? 'none' : 'rc-fade-in 0.5s ease-out both',
        }}
      />

      {/* Twinkling stars layer */}
      {!reduced && STARS.map((s, i) => (
        <span
          key={i}
          data-rc-anim
          className="absolute pointer-events-none select-none"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            fontSize: s.size,
            color: s.color,
            animation: `rc-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            zIndex: Z_CELEBRATION - 1,
          }}
        >
          {s.char}
        </span>
      ))}

      {/* Floating hearts */}
      {!reduced && HEARTS.map((h, i) => (
        <span
          key={i}
          data-rc-anim
          className="absolute bottom-0 pointer-events-none select-none"
          style={{
            left: `${h.left}%`,
            fontSize: h.size,
            animation: `rc-float-up ${h.dur}s ease-out ${h.delay}s infinite`,
            zIndex: Z_CELEBRATION - 1,
          }}
        >
          {h.char}
        </span>
      ))}

      {/* Main content — stopPropagation prevents backdrop close */}
      <div
        className="relative flex flex-col items-center gap-5 px-6 w-full max-w-sm md:max-w-xl"
        style={{ zIndex: Z_CELEBRATION }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Avatars row */}
        <div className="flex items-end justify-center gap-6">
          <MatchAvatar user={myUser}     slideDir="left"  delay={0.5} reduced={reduced} />
          <div
            data-rc-anim
            className="pixel-font text-white/60 text-2xl pb-6 shrink-0"
            style={{ animation: reduced ? 'none' : 'rc-fade-in 0.3s ease-out 0.8s both' }}
          >
            VS
          </div>
          <MatchAvatar user={targetUser} slideDir="right" delay={0.5} reduced={reduced} />
        </div>

        {/* MATCH! text */}
        <div
          data-rc-anim
          className="relative flex items-center justify-center"
          style={{ animation: reduced ? 'none' : 'rc-match-boom 0.4s ease-out 1.0s both', opacity: reduced ? 1 : 0 }}
        >
          <span
            className="pixel-font text-[22px] font-black tracking-widest"
            style={{
              background: 'linear-gradient(135deg, #e8b04a 0%, #d98ba0 40%, #8a4a70 80%, #9db557 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.6))',
            }}
          >
            ✦ MATCH! ✦
          </span>

          {/* Particle burst — centered on MATCH text */}
          {!reduced && PARTICLES.map((p, i) => (
            <span
              key={i}
              data-rc-anim
              className="absolute pointer-events-none select-none"
              style={{
                top: '50%',
                left: '50%',
                '--rot': `${p.rot}deg`,
                '--ty': `${p.ty}px`,
                fontSize: p.size,
                color: p.color,
                transform: 'translate(-50%,-50%)',
                animation: `rc-particle ${p.dur}s ease-out ${p.delay}s 1 forwards`,
                opacity: 0,
              }}
            >
              {p.char}
            </span>
          ))}
        </div>

        {/* Score bar */}
        {scoreVisible && (
          <div
            data-rc-anim
            className="w-full space-y-1.5"
            style={{ animation: reduced ? 'none' : 'rc-fade-in 0.4s ease-out both' }}
          >
            <div className="flex items-center justify-between">
              <span className="pixel-font text-[7px] text-white/60">Match Score</span>
              <span className="pixel-font text-[10px] font-bold" style={{ color: barColor }}>
                {score}%
              </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${scoreWidth}%`,
                  background: isGold
                    ? 'linear-gradient(90deg,#d99b3b 0%,#f3e5c2 50%,#d99b3b 100%)'
                    : barColor,
                  ...(isGold ? {
                    backgroundSize: '300px 100%',
                    animation: 'rc-shimmer 1.5s linear infinite',
                  } : {}),
                }}
              />
            </div>
          </div>
        )}

        {/* Profile card */}
        {cardVisible && (
          <div
            data-rc-anim
            className="w-full bg-white/10 backdrop-blur-md rounded-2xl px-4 py-4 border border-white/20 space-y-3"
            style={{ animation: reduced ? 'none' : 'rc-slide-up 0.4s ease-out both' }}
          >
            {/* User info */}
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-gray-100"
                style={{ border: `2px solid ${mbtiColor(shapes.readProfile(targetUser).mbti)}` }}
              >
                {targetUser?.photoURL
                  ? <img src={targetUser.photoURL} alt="" className="w-full h-full object-cover" />
                  : <span className="w-full h-full flex items-center justify-center font-bold text-lg">
                      {(targetUser?.displayName || '?').charAt(0).toUpperCase()}
                    </span>}
              </div>
              <div>
                <p className="pixel-font text-[10px] text-white font-semibold">
                  {targetUser?.displayName || 'ผู้ใช้'}
                </p>
                <div className="flex gap-1.5 mt-0.5">
                  {shapes.readProfile(targetUser).mbti && (
                    <span
                      className="pixel-font text-[6px] px-1.5 py-0.5 rounded text-white"
                      style={{ background: mbtiColor(shapes.readProfile(targetUser).mbti) }}
                    >
                      {shapes.readProfile(targetUser).mbti}
                    </span>
                  )}
                  {shapes.readProfile(targetUser).program && (
                    <span className="pixel-font text-[6px] px-1.5 py-0.5 rounded bg-white/20 text-white/80 max-w-[100px] truncate">
                      {shapes.readProfile(targetUser).program}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => { onOpenChat?.(targetUser?.uid); onClose() }}
                className="flex-1 bg-brand text-white pixel-font text-[8px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                💬 ส่งข้อความ
              </button>
              <button
                onClick={() => { onViewProfile?.(targetUser?.uid); onClose() }}
                className="flex-1 border border-white/40 text-white/90 pixel-font text-[8px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                👤 ดูโปรไฟล์
              </button>
            </div>
          </div>
        )}

        {/* Tap to close hint */}
        <p
          data-rc-anim
          className="pixel-font text-[7px] text-white/30"
          style={{ animation: reduced ? 'none' : 'rc-fade-in 0.4s ease-out 3.5s both', opacity: reduced ? 0.3 : 0 }}
        >
          แตะด้านนอกเพื่อปิด
        </p>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function KawaiiMatchOverlay({ matchResult, myUser, onClose, onOpenChat, onViewProfile }) {
  const reduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  if (!matchResult) return null

  if (!matchResult.matched) {
    return (
      <NoMatchToast
        score={matchResult.score}
        onClose={onClose}
      />
    )
  }

  return (
    <FullMatchOverlay
      score={matchResult.score}
      targetUser={matchResult.targetUser}
      myUser={myUser}
      onClose={onClose}
      onOpenChat={onOpenChat}
      onViewProfile={onViewProfile}
      reduced={reduced}
    />
  )
}
