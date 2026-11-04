import { useEffect, useState } from 'react'
import Popup from '../ui/Popup'
import TreeSprite from './TreeSprite'
import StudygramCard from './StudygramCard'
import { useAuthStore } from '../../stores/useAuthStore'
import { useFocusHistoryStore } from '../../stores/useFocusHistoryStore'
import { formatMinutes } from '../../room/cardLayers'
import { TREE_LABELS } from '../../room/messages'

const dateText = (ms) => (ms > 0 ? new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

// Every finished session as a tree: when, how long, the mode and the Leaves it earned. A finished
// (not withered) session can be turned into a studygram card.
export default function TreeHistorySheet({ onClose }) {
  const uid = useAuthStore((s) => s.user?.uid ?? null)
  const status = useFocusHistoryStore((s) => s.status)
  const sessions = useFocusHistoryStore((s) => s.sessions)
  const [card, setCard] = useState(null)

  useEffect(() => { if (uid) useFocusHistoryStore.getState().load(uid) }, [uid])

  const rows = sessions.filter((s) => !s.practice)
  let body
  if (!uid) body = <p className="thai-font text-sm text-ink">เข้าสู่ระบบเพื่อดูประวัติต้นไม้</p>
  else if (status === 'error') {
    body = (
      <div className="flex flex-col items-start gap-2">
        <p className="thai-font text-sm text-ink">โหลดประวัติไม่สำเร็จ</p>
        <button type="button" className="px-btn h-11 px-4 text-sm font-bold bg-leaf text-ink" onClick={() => useFocusHistoryStore.getState().load(uid)}>ลองใหม่</button>
      </div>
    )
  } else if (status !== 'ready') body = <p className="thai-font text-sm text-ink-soft">กำลังโหลด…</p>
  else if (rows.length === 0) body = <p className="thai-font text-sm text-ink">ยังไม่มีต้นไม้ในประวัติ</p>
  else {
    body = (
      <ul className="flex flex-col gap-2 overflow-y-auto">
        {rows.map((s) => (
          <li key={s.id} className="px-slab p-2 flex items-center gap-3">
            <TreeSprite species={s.tree} stage={3} scale={1.5} />
            <div className="min-w-0 flex-1">
              <p className="thai-font text-sm font-bold text-ink">{TREE_LABELS[s.tree] ?? TREE_LABELS.sprout}</p>
              <p className="thai-font text-xs text-ink-soft">{`${dateText(s.endedAt)} · ${formatMinutes(s.minutes)} · ${s.mode === 'strict' ? 'เข้ม' : 'ยืดหยุ่น'}`}</p>
              <p className="thai-font text-xs text-ink">{`+${s.leaves} ใบ`}</p>
            </div>
            {!s.withered && (
              <button type="button" className="px-btn h-11 px-3 text-xs font-bold bg-paper text-ink" onClick={() => setCard(s)}>ทำการ์ด</button>
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <Popup variant="sheet" size="md" onClose={onClose}>
        <div className="p-5 flex flex-col gap-3 min-h-0">
          <h2 className="pixel-font text-lg text-ink">ประวัติต้นไม้</h2>
          {body}
        </div>
      </Popup>
      {card && (
        <StudygramCard
          session={{ tree: card.tree, withered: card.withered, mode: card.mode, verifiedMs: card.minutes * 60000, endedAt: card.endedAt }}
          onClose={() => setCard(null)}
        />
      )}
    </>
  )
}
