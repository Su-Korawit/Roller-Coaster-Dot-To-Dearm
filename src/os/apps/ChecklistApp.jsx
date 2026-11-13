import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ExternalLink, Search, RotateCcw, Clock, ListChecks, Trophy } from 'lucide-react'
import { useChecklistStore } from '../../stores/useChecklistStore'
import {
  CHECKLIST_INDEX, loadChecklist, prefetchChecklist, cleanChecked, progress, groupProgress, indexProgress,
  searchLists, uniLinks, safeUrl,
} from '../checklistLogic'

const GROUP_TONE = { tgat: 'var(--color-zone-sci)', alevel: 'var(--color-zone-health)', portfolio: 'var(--color-accent-pink)' }

function Bar({ pct, tone = 'var(--color-brand)' }) {
  return (
    <span className="block h-2 rounded-full bg-mist overflow-hidden" aria-hidden="true">
      <span className="block h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: tone }} />
    </span>
  )
}

function ExtLink({ href, children }) {
  const url = safeUrl(href)
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-strong underline underline-offset-2 thai-font text-xs font-bold">
      {children} <ExternalLink size={12} aria-hidden="true" />
    </a>
  )
}

function ListCard({ entry, checkedMap, onOpen }) {
  const p = indexProgress(entry, checkedMap)
  const tone = GROUP_TONE[entry.group] ?? 'var(--color-brand)'
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.id)}
      onPointerEnter={() => prefetchChecklist(entry.id)}
      onFocus={() => prefetchChecklist(entry.id)}
      className="px-card p-3 text-left flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="thai-font font-bold block leading-snug">{entry.title}</span>
          <span className="thai-font text-xs text-ink-soft block">{entry.subtitle}</span>
        </span>
        <span className="thai-font text-xs font-bold shrink-0 px-2 py-0.5 rounded-full text-white" style={{ background: tone }}>
          {p.pct === 100 ? 'ครบแล้ว' : `${p.pct}%`}
        </span>
      </span>
      <Bar pct={p.pct} tone={tone} />
      <span className="thai-font text-xs text-ink-soft">ทำแล้ว {p.done} / {p.total} รายการ</span>
    </button>
  )
}

function Home({ onOpen }) {
  const checked = useChecklistStore((s) => s.checked)
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('all')
  const lists = useMemo(() => searchLists(q, CHECKLIST_INDEX.lists, group), [q, group])
  const tabs = [{ id: 'all', label: 'ทั้งหมด' }, ...CHECKLIST_INDEX.groups]
  const total = CHECKLIST_INDEX.lists.reduce((n, l) => n + l.items, 0)
  const done = CHECKLIST_INDEX.lists.reduce((n, l) => n + indexProgress(l, checked).done, 0)

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <section className="px-card p-4 bg-brand-soft flex flex-col gap-2" aria-label="ภาพรวม">
        <h3 className="thai-font font-bold flex items-center gap-2"><ListChecks size={18} aria-hidden="true" /> Checklist เตรียมสอบและสมัคร</h3>
        <p className="thai-font text-sm text-ink-soft">เนื้อหา TGAT / A-Level ตามโครงสร้างข้อสอบทางการ และเอกสารที่ต้องเตรียมสำหรับรอบ Portfolio ติ๊กไปทีละข้อ ระบบจำให้</p>
        <Bar pct={total ? Math.round((done / total) * 100) : 0} />
        <p className="thai-font text-xs text-ink-soft">ทำแล้ว {done} / {total} รายการ</p>
      </section>

      <label className="px-card flex items-center gap-2 px-3 py-2 focus-within:ring-2 focus-within:ring-brand">
        <Search size={16} aria-hidden="true" className="text-ink-soft" />
        <span className="sr-only">ค้นหา checklist</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา เช่น ฟิสิกส์ TGAT" className="flex-1 min-w-0 bg-transparent outline-none thai-font text-sm" />
      </label>

      <div className="flex gap-2 overflow-x-auto os-pages" role="tablist" aria-label="หมวด">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={group === t.id}
            onClick={() => setGroup(t.id)}
            className={`px-btn px-3 py-1.5 thai-font text-sm font-bold whitespace-nowrap ${group === t.id ? 'bg-brand-strong text-white' : 'bg-paper'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {lists.length === 0 ? (
        <p className="thai-font text-sm text-ink-soft text-center py-8">ไม่พบ checklist ที่ค้นหา</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lists.map((l) => <ListCard key={l.id} entry={l} checkedMap={checked} onOpen={onOpen} />)}
        </div>
      )}
      <p className="thai-font text-xs text-ink-soft">ข้อมูลจากเอกสารทางการ (ทปอ. / มหาวิทยาลัย) ตรวจล่าสุด {CHECKLIST_INDEX.verifiedAt} ก่อนสมัครจริงให้เทียบกับประกาศล่าสุดอีกครั้ง</p>
    </div>
  )
}

function Item({ item, on, onToggle }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        aria-label={item.t}
        onClick={onToggle}
        className={`mt-0.5 shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${on ? 'bg-brand-strong border-brand-strong text-white' : 'bg-paper border-ink-soft'}`}
      >
        {on && <Check size={16} strokeWidth={3} aria-hidden="true" />}
      </button>
      <span className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className={`thai-font text-sm ${on ? 'line-through text-ink-soft' : ''}`}>{item.t}</span>
        {item.n && <span className="thai-font text-xs text-ink-soft">{item.n}</span>}
        {item.href && <ExtLink href={item.href}>เปิดลิงก์</ExtLink>}
      </span>
    </li>
  )
}

function Detail({ id, onBack }) {
  const [loaded, setLoaded] = useState({ id: null, doc: undefined })   // doc: undefined = loading, null = failed
  const doc = loaded.id === id ? loaded.doc : undefined
  const saved = useChecklistStore((s) => s.checked[id])
  const toggle = useChecklistStore((s) => s.toggle)
  const setChecked = useChecklistStore((s) => s.setChecked)
  const reset = useChecklistStore((s) => s.reset)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    let live = true
    loadChecklist(id).then((d) => {
      if (!live) return
      setLoaded({ id, doc: d })
      if (d) {
        const current = useChecklistStore.getState().checked[id] ?? []
        const clean = cleanChecked(current, d)
        if (clean.length !== current.length) setChecked(id, clean)
      }
    })
    return () => { live = false }
  }, [id, setChecked])

  const entry = CHECKLIST_INDEX.lists.find((l) => l.id === id)
  const checked = saved ?? []
  const p = doc ? progress(doc, checked) : { done: 0, total: entry?.items ?? 0, pct: 0 }
  const tone = GROUP_TONE[entry?.group] ?? 'var(--color-brand)'
  const unis = doc ? uniLinks(doc.uniIds) : []
  const m = doc?.meta ?? {}

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <button type="button" onClick={onBack} className="px-btn self-start px-3 py-1.5 thai-font text-sm font-bold bg-paper flex items-center gap-1.5">
        <ArrowLeft size={16} aria-hidden="true" /> กลับ
      </button>

      <header className="flex flex-col gap-1">
        <h2 className="thai-font font-bold text-lg leading-snug">{entry?.title}</h2>
        <p className="thai-font text-sm text-ink-soft">{entry?.subtitle}</p>
      </header>

      {doc === undefined && (
        <div className="px-card p-4 flex flex-col gap-3 animate-pulse" role="status" aria-label="กำลังโหลด">
          {[0, 1, 2, 3].map((i) => <span key={i} className="h-5 rounded bg-mist block" style={{ width: `${90 - i * 12}%` }} />)}
        </div>
      )}
      {doc === null && <p className="thai-font text-sm text-ink-soft px-card p-4" role="alert">โหลด checklist นี้ไม่สำเร็จ ลองกลับไปแล้วเปิดใหม่</p>}

      {doc && (
        <>
          <section className="px-card p-3 flex flex-col gap-2" aria-label="ความคืบหน้า">
            <div className="flex items-center justify-between thai-font text-sm font-bold">
              <span>ทำแล้ว {p.done} / {p.total}</span>
              <span className="flex items-center gap-1" style={{ color: tone }}>{p.pct === 100 && <Trophy size={14} aria-hidden="true" />}{p.pct}%</span>
            </div>
            <Bar pct={p.pct} tone={tone} />
            <div className="flex flex-wrap gap-1.5 thai-font text-xs text-ink-soft">
              {m.minutes && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-mist"><Clock size={12} aria-hidden="true" />{m.minutes} นาที</span>}
              {m.questions && <span className="px-2 py-0.5 rounded-full bg-mist">{m.questions} ข้อ</span>}
              {m.fullScore && <span className="px-2 py-0.5 rounded-full bg-mist">เต็ม {m.fullScore} คะแนน</span>}
              {m.type && <span className="px-2 py-0.5 rounded-full bg-mist">{m.type}</span>}
              {m.seats && <span className="px-2 py-0.5 rounded-full bg-mist">{m.seats}</span>}
              {m.fee && <span className="px-2 py-0.5 rounded-full bg-mist">{m.fee}</span>}
            </div>
            {doc.note && <p className="thai-font text-xs text-ink-soft">{doc.note}</p>}
          </section>

          {doc.groups.map((g) => {
            const gp = groupProgress(g, checked)
            return (
              <section key={g.id} className="px-card p-3" aria-label={g.t}>
                <h3 className="thai-font font-bold text-sm flex items-center justify-between gap-2">
                  <span>{g.t}</span>
                  <span className="text-xs text-ink-soft font-normal shrink-0">{g.count ? `${g.count} · ` : ''}{gp.done}/{gp.total}</span>
                </h3>
                {g.n && <p className="thai-font text-xs text-ink-soft mt-1">{g.n}</p>}
                <ul className="divide-y divide-mist">
                  {g.items.map((it) => <Item key={it.id} item={it} on={checked.includes(it.id)} onToggle={() => toggle(id, it.id)} />)}
                </ul>
              </section>
            )
          })}

          {(doc.links?.length > 0 || unis.length > 0) && (
            <section className="px-card p-3 flex flex-col gap-2" aria-label="ลิงก์ตรวจคุณสมบัติ">
              <h3 className="thai-font font-bold text-sm">ลิงก์ตรวจคุณสมบัติและประกาศ</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {(doc.links ?? []).map((l) => <ExtLink key={l.url} href={l.url}>{l.label}</ExtLink>)}
                {unis.map((u) => <ExtLink key={u.id} href={u.url}>{u.name}</ExtLink>)}
              </div>
            </section>
          )}

          <footer className="thai-font text-xs text-ink-soft flex flex-col gap-2">
            <span>ที่มา: <ExtLink href={doc.source?.url}>{doc.source?.label}</ExtLink> · ตรวจล่าสุด {doc.verifiedAt}</span>
            {p.done > 0 && (
              confirmReset ? (
                <span className="flex items-center gap-2">
                  ล้างที่ติ๊กทั้งหมดในรายการนี้?
                  <button type="button" className="px-btn px-3 py-1 font-bold bg-brand-strong text-white" onClick={() => { reset(id); setConfirmReset(false) }}>ล้าง</button>
                  <button type="button" className="px-btn px-3 py-1 font-bold bg-paper" onClick={() => setConfirmReset(false)}>ไม่ล้าง</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmReset(true)} className="px-btn self-start px-3 py-1 font-bold bg-paper inline-flex items-center gap-1.5">
                  <RotateCcw size={12} aria-hidden="true" /> เริ่มใหม่
                </button>
              )
            )}
          </footer>
        </>
      )}
    </div>
  )
}

// Checklist: what to study for TGAT / A-Level (from the official exam blueprints) and what to prepare
// for the Portfolio round. Data = JSON per list (lazy loaded); ticks are saved on this device.
export default function ChecklistApp() {
  const [openId, setOpenId] = useState(null)
  return openId ? <Detail id={openId} onBack={() => setOpenId(null)} /> : <Home onOpen={setOpenId} />
}
