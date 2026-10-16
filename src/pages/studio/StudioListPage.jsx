import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDocs } from 'firebase/firestore'
import { queries } from '../../lib/db'
import { useAuthStore } from '../../stores/useAuthStore'
import { createDraft, deleteDraft } from '../../services/articles'
import { toMillis, formatThaiDate } from '../../content/listing'
import { ADMIN_UID } from '../../constants/admin'
import Button from '../../components/ui/Button'

// A draft's state, from the server-owned fields: never published, live, or live
// with edits made since (updatedAt moved past publishedAt).
function draftStatus(d) {
  if (!d.isLive) return { id: 'draft', label: 'ฉบับร่าง' }
  if (toMillis(d.updatedAt) > toMillis(d.publishedAt)) {
    return { id: 'dirty', label: 'เผยแพร่แล้ว มีการแก้ไขที่ยังไม่เผยแพร่' }
  }
  return { id: 'live', label: 'เผยแพร่แล้ว' }
}

const CHIP = {
  draft: 'bg-mist text-ink-soft',
  live: 'bg-good text-ink',
  dirty: 'bg-warn text-ink',
}

export default function StudioListPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const isRoot = user?.uid === ADMIN_UID
  // The fetch result is tagged with the attempt that produced it, so a retry shows
  // as "loading" without setting state inside the effect.
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ attempt: -1, drafts: null, error: false })
  const [author, setAuthor] = useState('')
  const [creating, setCreating] = useState(false)
  const [createFailed, setCreateFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getDocs(isRoot ? queries.allDrafts() : queries.draftsByAuthor(user.uid))
      .then((snap) => {
        if (!cancelled) setResult({ attempt, drafts: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: false })
      })
      .catch((e) => {
        console.error('[studio] loading drafts failed:', e)
        if (!cancelled) setResult({ attempt, drafts: null, error: true })
      })
    return () => {
      cancelled = true
    }
  }, [attempt, isRoot, user?.uid])

  const current = result.attempt === attempt
  const drafts = current ? result.drafts : null
  const error = (current && result.error) || createFailed
  const [removed, setRemoved] = useState([])

  const sorted = useMemo(
    () => (drafts ?? []).filter((d) => !removed.includes(d.id)).sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt)),
    [drafts, removed],
  )
  const authors = useMemo(() => {
    const seen = new Map()
    for (const d of sorted) if (!seen.has(d.authorUid)) seen.set(d.authorUid, d.authorName || d.authorUid)
    return [...seen]
  }, [sorted])
  const shown = author ? sorted.filter((d) => d.authorUid === author) : sorted

  const startNew = async () => {
    setCreating(true)
    try {
      const id = await createDraft(user.uid, user.displayName ?? '')
      navigate(`/studio/${id}`)
    } catch (e) {
      console.error('[studio] creating draft failed:', e)
      setCreateFailed(true)
      setCreating(false)
    }
  }

  const remove = async (d) => {
    if (!window.confirm(`ลบร่าง "${d.title || 'ไม่มีชื่อ'}" ใช่ไหม`)) return
    await deleteDraft(d.id)
    setRemoved((ids) => [...ids, d.id])
  }

  return (
    <div className="min-h-dvh bg-mist">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <h1 className="pixel-font text-xl text-ink">สตูดิโอบทความ</h1>
          <div className="w-44">
            <Button onClick={startNew} disabled={creating}>เขียนบทความใหม่</Button>
          </div>
        </header>

        {isRoot && authors.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            ผู้เขียน
            <select
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="px-input h-10 bg-white px-2"
            >
              <option value="">ทั้งหมด</option>
              {authors.map(([uid, name]) => (
                <option key={uid} value={uid}>{name}</option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <div className="px-card bg-white p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-ink">โหลดรายการไม่สำเร็จ</p>
            <div className="w-28"><Button variant="secondary" onClick={() => { setCreateFailed(false); setAttempt((n) => n + 1) }}>ลองใหม่</Button></div>
          </div>
        )}

        {!error && drafts && shown.length === 0 && (
          <p className="px-card bg-white p-6 text-center text-ink-soft">
            ยังไม่มีบทความ เริ่มเขียนบทความแรกได้เลย
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {shown.map((d) => {
            const status = draftStatus(d)
            const everPublished = Boolean(d.publishedSlug)
            return (
              <li key={d.id} className="px-card bg-white p-4 flex items-start gap-3">
                <Link to={`/studio/${d.id}`} className="flex-1 min-w-0">
                  <h2 className="font-bold text-ink truncate">{d.title || 'ไม่มีชื่อ'}</h2>
                  <p className="text-xs text-ink-soft mt-1">
                    {isRoot && d.authorName ? `${d.authorName} · ` : ''}แก้ไขล่าสุด {formatThaiDate(d.updatedAt)}
                  </p>
                  <span className={`inline-block mt-2 rounded-slot px-2 py-0.5 text-xs font-bold ${CHIP[status.id]}`}>
                    {status.label}
                  </span>
                </Link>
                {!everPublished && (
                  <button
                    type="button"
                    aria-label={`ลบร่าง ${d.title || 'ไม่มีชื่อ'}`}
                    onClick={() => remove(d)}
                    className="h-11 px-3 text-sm text-ink-soft underline"
                  >
                    ลบ
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
