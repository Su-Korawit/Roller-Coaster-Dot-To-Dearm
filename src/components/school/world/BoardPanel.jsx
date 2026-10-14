import { useEffect, useState } from 'react'
import Popup from '../../ui/Popup'
import PanelHeader from '../../ui/PanelHeader'
import { useTcasEventsStore } from '../../../stores/useTcasEventsStore'

const TITLES = { news: 'บอร์ดข่าวโรงอาหาร', contest: 'บอร์ดประกวดและค่าย' }

const todayKey = () => new Date().toISOString().slice(0, 10)

function Row({ title, sub, link }) {
  const body = (
    <>
      <div className="thai-font text-sm text-ink font-bold">{title}</div>
      {sub && <div className="thai-font text-xs text-ink/60 line-clamp-2">{sub}</div>}
    </>
  )
  const cls = 'neo-slab block px-3 py-2'
  return link
    ? <a href={link} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
    : <div className={cls}>{body}</div>
}

function NewsBoard({ extra }) {
  const events = useTcasEventsStore((s) => s.events)
  useEffect(() => useTcasEventsStore.getState().subscribeEvents(), [])
  const upcoming = events.filter((e) => e.date >= todayKey()).slice(0, 8)
  return (
    <>
      {extra}
      <h3 className="pixel-font text-[10px] text-ink/60">ปฏิทิน TCAS ที่กำลังจะถึง</h3>
      {upcoming.length === 0 && <p className="thai-font text-sm text-ink/60">ยังไม่มีกำหนดการที่กำลังจะถึง</p>}
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
