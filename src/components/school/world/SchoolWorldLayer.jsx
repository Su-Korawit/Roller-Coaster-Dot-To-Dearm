import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useSchoolWorldStore } from '../../../stores/useSchoolWorldStore'
import { enterSchoolHub, leaveSchoolHub } from '../../../services/schoolWorld'
import { EMOTE_DURATION_MS } from '../../../constants/emotes'
import { shareRoomImage } from '../../../utils/shareRoomImage'
import FocusPanel from './FocusPanel'
import FocusHud from './FocusHud'
import LeaderboardPanel from './LeaderboardPanel'
import BoardPanel from './BoardPanel'
import SchoolAnnouncements from './SchoolAnnouncements'
import { readTeacherClaims, isTeacherOf } from '../../../services/schoolBoard'
import EmoteWheel from './EmoteWheel'
import AmbientOverlay from './AmbientOverlay'

const ENTER_ERRORS = {
  NO_SCHOOL: 'เลือกโรงเรียนของคุณที่หน้าโซเชียลก่อน แล้วค่อยกลับมาเข้าโรงเรียน',
  ROOM_FULL: 'ห้องเต็มชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่',
  FAILED: 'เข้าโรงเรียนไม่สำเร็จ ลองใหม่อีกครั้ง',
}

// Everything the School World adds on top of the Phaser canvas: entry/exit,
// Focus UI, boards, emotes, ambience, sharing. Game events reach it through
// useSchoolWorldStore (GameCanvas forwards them), tool doors through toolRequest.
export default function SchoolWorldLayer({ gameRef, onOpenView, active = true }) {
  const navigate = useNavigate()
  const authUser = useAuthStore((s) => s.user ?? null)
  const uid = authUser?.uid ?? null
  const inHub = useSchoolWorldStore((s) => s.inHub)
  const room = useSchoolWorldStore((s) => s.room)
  const enterStatus = useSchoolWorldStore((s) => s.enterStatus)
  const enterError = useSchoolWorldStore((s) => s.enterError)
  const panel = useSchoolWorldStore((s) => s.panel)
  const ambient = useSchoolWorldStore((s) => s.ambient)
  const toolRequest = useSchoolWorldStore((s) => s.toolRequest)
  const closePanel = useSchoolWorldStore((s) => s.closePanel)

  const [emoteOpen, setEmoteOpen] = useState(false)
  const [shareMsg, setShareMsg] = useState(null)
  const emoteTimer = useRef(null)
  const [teacherClaims, setTeacherClaims] = useState(null)

  // Teacher status comes from the verified token claims (never from user-editable data).
  // The badge rides presence only when the claim exists; the rules enforce the same.
  useEffect(() => {
    if (!inHub || !uid) return undefined
    let cancelled = false
    const registry = gameRef.current?.registry
    readTeacherClaims()
      .then((claims) => {
        if (cancelled) return
        setTeacherClaims(claims)
        registry?.set('selfBadge', claims ? 'teacher' : null)
      })
      .catch(() => {})
    return () => { cancelled = true; registry?.set('selfBadge', null) }
  }, [inHub, uid, gameRef])

  // Tool doors: '/path' -> router, 'view:x' -> the app's tab switcher.
  useEffect(() => {
    if (!toolRequest) return
    const { route } = toolRequest
    useSchoolWorldStore.getState().clearToolRequest()
    if (typeof route !== 'string') return
    if (route.startsWith('view:')) onOpenView?.(route.slice(5))
    else if (route.startsWith('/')) navigate(route)
  }, [toolRequest, navigate, onOpenView])

  useEffect(() => () => clearTimeout(emoteTimer.current), [])

  function sendEmote(id) {
    const reg = gameRef.current?.registry
    if (!reg) return
    reg.set('selfEmote', id)
    clearTimeout(emoteTimer.current)
    emoteTimer.current = setTimeout(() => reg.set('selfEmote', null), EMOTE_DURATION_MS)
  }

  async function share() {
    setShareMsg(null)
    const r = await shareRoomImage(gameRef.current)
    if (!r.ok && r.error !== 'CANCELLED') setShareMsg('แชร์ภาพไม่สำเร็จ')
    else if (r.ok && r.via === 'download') setShareMsg('บันทึกภาพแล้ว (ไม่มีชื่อและโรงเรียนในภาพ)')
  }

  if (!active) return null

  const roomLabel = room
    ? (room.kind === 'school' ? 'ห้องโรงเรียนของฉัน' : 'ห้องรวม') + ` #${room.shard}`
    : null

  return (
    <>
      {ambient && inHub && <AmbientOverlay />}
      {inHub && <FocusHud />}

      <div className="absolute left-4 top-16 z-20 flex flex-col items-start gap-2 pointer-events-none">
        {!inHub && uid && (
          <button
            onClick={() => enterSchoolHub(uid)}
            disabled={enterStatus === 'entering'}
            className="pointer-events-auto neo-btn rpg-btn-primary pixel-font text-[10px] px-3 py-2 rounded-lg disabled:opacity-60"
          >
            🏫 {enterStatus === 'entering' ? 'กำลังเข้า…' : 'เข้าโรงเรียน'}
          </button>
        )}
        {!inHub && enterError && (
          <p role="alert" className="pointer-events-auto neo-slab max-w-56 p-2 thai-font text-xs text-accent-pink">
            {ENTER_ERRORS[enterError] ?? ENTER_ERRORS.FAILED}
          </p>
        )}

        {inHub && (
          <>
            <div className="pointer-events-auto neo-slab px-2 py-1 thai-font text-[11px] text-ink">{roomLabel}</div>
            <button
              onClick={() => leaveSchoolHub(uid)}
              className="pointer-events-auto neo-btn bg-hud text-ink thai-font text-xs px-3 py-1.5 rounded-lg"
            >
              ← ออกจากโรงเรียน
            </button>
            <div className="pointer-events-auto flex gap-1.5">
              <button onClick={() => setEmoteOpen((v) => !v)} aria-label="อีโมจิ" aria-expanded={emoteOpen}
                className="neo-btn w-10 h-10 bg-hud rounded-lg text-xl">😀</button>
              <button onClick={() => useSchoolWorldStore.getState().toggleAmbient()} aria-label="โหมดบรรยากาศกลางคืน" aria-pressed={ambient}
                className={`neo-btn w-10 h-10 rounded-lg text-xl ${ambient ? 'bg-brand-soft' : 'bg-hud'}`}>🌧</button>
              <button onClick={share} aria-label="แชร์ภาพห้อง"
                className="neo-btn w-10 h-10 bg-hud rounded-lg text-xl">📷</button>
            </div>
            {shareMsg && <p role="status" className="pointer-events-auto neo-slab max-w-56 p-2 thai-font text-xs text-ink">{shareMsg}</p>}
          </>
        )}
      </div>

      {inHub && emoteOpen && <EmoteWheel onPick={sendEmote} onClose={() => setEmoteOpen(false)} />}

      {panel?.type === 'focus' && <FocusPanel seatId={panel.seatId} onClose={closePanel} />}
      {panel?.type === 'leaderboard' && <LeaderboardPanel mySchoolId={room?.schoolId ?? null} onClose={closePanel} />}
      {panel?.type === 'board' && (
        <BoardPanel
          boardId={panel.id}
          onClose={closePanel}
          extra={panel.id === 'news' && room?.schoolId
            ? <SchoolAnnouncements schoolId={room.schoolId} user={authUser} isTeacher={isTeacherOf(teacherClaims, room.schoolId)} />
            : null}
        />
      )}
    </>
  )
}
