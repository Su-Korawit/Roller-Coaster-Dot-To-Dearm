import { useEffect, useState } from 'react'
import Popup from '../../ui/Popup'
import PanelHeader from '../../ui/PanelHeader'
import { useTcasEventsStore } from '../../../stores/useTcasEventsStore'
import { eventsWithFallback, nextMilestone } from '../../../data/tcas70'

const TITLES = { news: 'บอร์ดข่าวโรงอาหาร', contest: 'บอร์ดประกวดและค่าย' }

const todayKey = () => new Date().toISOString().slice(0, 10)

function Row({ title, sub, link }) {
  const body = (
    <>
      <div className="thai-font text-sm text-ink font-bold">{title}</div>
      {sub && <div className="thai-font text-xs text-ink/60 line-clamp-2">{sub}</div>}
    </>
  )
  const cls = 'px-slab block px-3 py-2'
  return link
    ? <a href={link} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
    : <div className={cls}>{body}</div>
}

// The big number the board leads with: how long until the next TCAS milestone.
function Countdown({ event, days }) {
  return (
    <div data-testid="tcas-countdown" className="rpg-plank rounded-lg px-4 py-3 flex items-center gap-4">
      <div className="text-center shrink-0 min-w-16">
        <div className="pixel-font text-3xl leading-none text-ink">{days === 0 ? 'วันนี้' : days}</div>
        {days > 0 && <div className="thai-font text-xs text-ink/70 mt-1">วัน</div>}
      </div>
      <div className="min-w-0">
        <div className="pixel-font text-xs text-ink/60">เหตุการณ์ TCAS ถัดไป</div>
        <div className="thai-font text-sm text-ink font-bold">{event.title}</div>
        <div className="thai-font text-xs text-ink/70 line-clamp-2">{event.description}</div>
      </div>
    </div>
  )
}

function NewsBoard({ extra }) {
  const stored = useTcasEventsStore((s) => s.events)
  useEffect(() => useTcasEventsStore.getState().subscribeEvents(), [])
  const events = eventsWithFallback(stored)
  const next = nextMilestone(events, todayKey())
  // the next milestone already leads the board as the countdown card, so the list starts after it
  const upcoming = events.filter((e) => e.date >= todayKey() && e.id !== next?.event.id).slice(0, 8)
  return (
    <>
      {extra}
      {next && <Countdown event={next.event} days={next.days} />}
      <h3 className="pixel-font text-xs text-ink/60">ปฏิทิน TCAS ที่กำลังจะถึง</h3>
      {!next && <p className="thai-font text-sm text-ink/60">ยังไม่มีกำหนดการที่กำลังจะถึง</p>}
      {upcoming.map((e) => (
        <Row key={e.id} title={`${e.date} · ${e.title}`} sub={e.description} link={e.link} />
      ))}
    </>
  )
}

function ContestBoard() {
  const [state, setState] = useState({ status: 'loading', items: [] })
  useEffect(() => {
    let cancelled = false
    fetch('/api/camphub?category=contest')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
      .then((items) => { if (!cancelled) setState({ status: 'ready', items: Array.isArray(items) ? items.slice(0, 8) : [] }) })
      .catch(() => { if (!cancelled) setState({ status: 'error', items: [] }) })
    return () => { cancelled = true }
  }, [])
  return (
    <>
      {state.status === 'loading' && <p className="thai-font text-sm text-ink/60">กำลังโหลด…</p>}
      {state.status === 'error' && <p role="alert" className="thai-font text-sm text-accent-pink">โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
      {state.status === 'ready' && state.items.length === 0 && <p className="thai-font text-sm text-ink/60">ยังไม่มีรายการ</p>}
      {state.items.map((c) => <Row key={c.link} title={c.title} sub={c.small_description} link={c.link} />)}
    </>
  )
}

// `extra` lets the news board show school announcements above the TCAS calendar.
export default function BoardPanel({ boardId, extra = null, onClose }) {
  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <PanelHeader title={TITLES[boardId] ?? 'บอร์ด'} onClose={onClose} />
      <div className="p-4 flex flex-col gap-2 overflow-y-auto">
        {boardId === 'contest' ? <ContestBoard /> : <NewsBoard extra={extra} />}
      </div>
    </Popup>
  )
}
