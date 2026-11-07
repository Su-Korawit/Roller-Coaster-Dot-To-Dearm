import { useEffect, useMemo, useState } from 'react'
import { ThumbsUp, Send, Inbox, ListOrdered, UserRound, Trash2, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRequestsStore } from '../../stores/useRequestsStore'
import { KINDS, MAX_REASON, MAX_TITLE, STATUS_LABEL, rankRequests, tallyVotes } from '../requestsLogic'

const TABS = [
  { id: 'board', label: 'คำขอทั้งหมด', Icon: ListOrdered },
  { id: 'new', label: 'ส่งคำขอ', Icon: Send },
  { id: 'mine', label: 'ของฉัน', Icon: UserRound },
]
const kindLabel = (id) => KINDS.find((k) => k.id === id)?.label ?? id
const statusStyle = { new: 'bg-mist text-ink-soft', planned: 'bg-zone-sci-soft text-zone-sci-deep', done: 'bg-zone-earth-soft text-zone-earth-deep' }

function RequestCard({ r, count, voted, mine, onVote, onRemove }) {
  return (
    <li className="px-card p-3 flex gap-3 bg-paper">
      <button
        type="button"
        onClick={() => onVote(r.id)}
        aria-pressed={voted}
        aria-label={`${voted ? 'ยกเลิกโหวต' : 'โหวต'} ${r.title} (${count} โหวต)`}
        className={`shrink-0 w-14 py-1.5 px-btn flex flex-col items-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${voted ? 'bg-brand-strong text-white' : 'bg-paper'}`}
      >
        <ThumbsUp size={16} aria-hidden="true" />
        <span className="thai-font text-xs font-bold tabular-nums">{count}</span>
      </button>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="thai-font text-sm font-bold break-words">{r.title}</p>
          <span className="px-2 py-0.5 rounded-full thai-font text-xs font-semibold bg-brand-soft text-brand-strong">{kindLabel(r.kind)}</span>
          <span className={`px-2 py-0.5 rounded-full thai-font text-xs font-semibold ${statusStyle[r.status] ?? statusStyle.new}`}>{STATUS_LABEL[r.status] ?? STATUS_LABEL.new}</span>
        </div>
        {r.reason && <p className="thai-font text-sm text-ink-soft whitespace-pre-wrap break-words">{r.reason}</p>}
        {r.url && (
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="thai-font text-xs text-brand-strong underline flex items-center gap-1 break-all">
            <ExternalLink size={12} aria-hidden="true" /> {r.url}
          </a>
        )}
        <div className="flex items-center gap-2 thai-font text-xs text-ink-soft">
          <span>โดย {r.name}{mine ? ' (คุณ)' : ''}</span>
          {mine && (
            <button type="button" onClick={() => onRemove(r.id)} aria-label={`ลบคำขอ ${r.title}`} className="ml-auto p-1 text-danger"><Trash2 size={14} /></button>
          )}
        </div>
      </div>
    </li>
  )
}

function Empty({ text }) {
  return (
    <div className="px-card p-6 flex flex-col items-center gap-2 text-center bg-brand-soft">
      <Inbox size={32} className="text-brand-strong" aria-hidden="true" />
      <p className="thai-font text-sm">{text}</p>
    </div>
  )
}

// Report: where students ask for the apps/websites they want in the OS. Vote on others' requests;
// the most-voted get built first.
export default function ReportApp() {
  const uid = useAuthStore((s) => s.user?.uid)
  const { requests, votes, loading, error, load, submit, toggleVote, remove } = useRequestsStore()
  const [tab, setTab] = useState('board')
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ kind: 'app', title: '', url: '', reason: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [load])

  const { counts, mine } = useMemo(() => tallyVotes(votes, uid), [votes, uid])
  const ranked = useMemo(() => rankRequests(requests, counts), [requests, counts])
  const board = filter === 'all' ? ranked : ranked.filter((r) => r.kind === filter)
  const own = ranked.filter((r) => r.uid === uid)

  async function send(e) {
    e.preventDefault()
    setBusy(true)
    const err = await submit(form)
    setBusy(false)
    if (err) { setMsg(err); return }
    setForm({ kind: 'app', title: '', url: '', reason: '' })
    setMsg('')
    setTab('mine')
  }
  const vote = async (id) => { const err = await toggleVote(id); setMsg(err ?? '') }
  const del = async (id) => { const err = await remove(id); setMsg(err ?? '') }
  const list = (items) => (
    <ul className="flex flex-col gap-3">
      {items.map((r) => <RequestCard key={r.id} r={r} count={counts.get(r.id) ?? 0} voted={mine.has(r.id)} mine={r.uid === uid} onVote={vote} onRemove={del} />)}
    </ul>
  )

  let body
  if (tab === 'new') {
    body = (
      <form onSubmit={send} className="flex flex-col gap-3">
        <h3 className="thai-font font-bold">อยากให้มีอะไรเพิ่ม</h3>
        <div className="flex gap-2" role="radiogroup" aria-label="ประเภท">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={form.kind === k.id}
              onClick={() => setForm((f) => ({ ...f, kind: k.id }))}
              className={`flex-1 px-btn py-2 thai-font text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${form.kind === k.id ? 'bg-brand-strong text-white' : 'bg-paper'}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
          {form.kind === 'app' ? 'ชื่อแอปที่อยากได้' : 'ชื่อเว็บไซต์'}
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, MAX_TITLE) }))} className="px-input h-10 px-3 text-sm text-ink bg-paper" />
        </label>
        <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
          {form.kind === 'app' ? 'ลิงก์ตัวอย่าง (ถ้ามี)' : 'ลิงก์เว็บไซต์'}
          <input type="url" inputMode="url" placeholder="https://" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value.slice(0, 200) }))} className="px-input h-10 px-3 text-sm text-ink bg-paper" />
        </label>
        <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
          ทำไมถึงอยากได้ (ไม่บังคับ)
          <textarea rows={3} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value.slice(0, MAX_REASON) }))} className="px-input p-3 text-sm text-ink bg-paper resize-none" />
          <span className="self-end">{form.reason.length}/{MAX_REASON}</span>
        </label>
        {msg && <p role="alert" className="thai-font text-sm text-zone-health-deep">{msg}</p>}
        <button type="submit" disabled={busy} className="px-btn py-2.5 thai-font text-sm font-bold bg-brand-strong text-white disabled:opacity-50 flex items-center justify-center gap-2">
          <Send size={16} aria-hidden="true" /> {busy ? 'กำลังส่ง...' : 'ส่งคำขอ'}
        </button>
      </form>
    )
  } else if (tab === 'mine') {
    body = own.length ? list(own) : <Empty text="คุณยังไม่ได้ส่งคำขอ กดแท็บ ส่งคำขอ ได้เลย" />
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2" role="tablist" aria-label="กรองประเภท">
          {[{ id: 'all', label: 'ทั้งหมด' }, ...KINDS].map((k) => (
            <button key={k.id} type="button" role="tab" aria-selected={filter === k.id} onClick={() => setFilter(k.id)} className={`px-btn px-3 py-1 thai-font text-xs font-bold ${filter === k.id ? 'bg-brand-strong text-white' : 'bg-paper'}`}>{k.label}</button>
          ))}
        </div>
        {loading && <p className="thai-font text-sm text-ink-soft text-center py-6">กำลังโหลดคำขอ...</p>}
        {error && <p role="alert" className="thai-font text-sm text-zone-health-deep text-center">{error} <button type="button" onClick={load} className="underline">ลองใหม่</button></p>}
        {msg && <p role="alert" className="thai-font text-sm text-zone-health-deep">{msg}</p>}
        {!loading && !error && (board.length ? list(board) : <Empty text="ยังไม่มีคำขอ เป็นคนแรกที่ขอเลย" />)}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col">
      <nav className="sticky top-0 z-10 bg-paper border-b-2 border-hairline px-3 pt-2" role="tablist" aria-label="เมนู Report">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => { setTab(t.id); setMsg('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 thai-font text-sm font-bold rounded-t-ui border-b-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === t.id ? 'border-brand-strong text-brand-strong' : 'border-transparent text-ink-soft'}`}
            >
              <t.Icon size={16} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="p-4 sm:p-6">{body}</div>
    </div>
  )
}
