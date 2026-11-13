import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ExternalLink, Search, RotateCcw, Clock, ListChecks, Trophy, Target, GraduationCap, School, ChevronRight } from 'lucide-react'
import { useChecklistStore } from '../../stores/useChecklistStore'
import { useLifeStore } from '../../stores/useLifeStore'
import {
  CHECKLIST_INDEX, loadChecklist, prefetchChecklist, cleanChecked, progress, groupProgress, indexProgress,
  searchLists, uniLinks, safeUrl,
} from '../checklistLogic'
import {
  loadUniversityProjects, loadProjectManifest, universityIdOfProgram, goalProjects, findProgram,
  projectChecklist, projectProgress, projectKey, projectTitle, ROUND_NAMES,
} from '../checklistProjects'
import { goalTitle, goalSubtitle } from '../goalLogic'

const GROUP_TONE = { tgat: 'var(--color-zone-sci)', alevel: 'var(--color-zone-health)', portfolio: 'var(--color-accent-pink)' }
const ROUND_TONE = { 1: 'var(--color-accent-pink)', 2: 'var(--color-zone-biz)' }
const PAGE = 40

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

function BackButton({ onBack, children = 'กลับ' }) {
  return (
    <button type="button" onClick={onBack} className="px-btn self-start px-3 py-1.5 thai-font text-sm font-bold bg-paper flex items-center gap-1.5">
      <ArrowLeft size={16} aria-hidden="true" /> {children}
    </button>
  )
}

function Skeleton() {
  return (
    <div className="px-card p-4 flex flex-col gap-3 animate-pulse" role="status" aria-label="กำลังโหลด">
      {[0, 1, 2, 3].map((i) => <span key={i} className="h-5 rounded bg-mist block" style={{ width: `${90 - i * 12}%` }} />)}
    </div>
  )
}

function Notice({ children }) {
  return <p className="thai-font text-sm text-ink-soft px-card p-4" role="status">{children}</p>
}

// ── cards ────────────────────────────────────────────────────────────────────

function Row({ title, subtitle, badge, tone = 'var(--color-brand)', pct, foot, onClick, onHover }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onHover}
      onFocus={onHover}
      className="px-card p-3 text-left flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="thai-font font-bold block leading-snug">{title}</span>
          {subtitle && <span className="thai-font text-xs text-ink-soft block">{subtitle}</span>}
        </span>
        {badge && <span className="thai-font text-xs font-bold shrink-0 px-2 py-0.5 rounded-full text-white" style={{ background: tone }}>{badge}</span>}
      </span>
      {pct != null && <Bar pct={pct} tone={tone} />}
      {foot && <span className="thai-font text-xs text-ink-soft">{foot}</span>}
    </button>
  )
}

function ListCard({ entry, checkedMap, onOpen }) {
  const p = indexProgress(entry, checkedMap)
  return (
    <Row
      title={entry.title} subtitle={entry.subtitle} tone={GROUP_TONE[entry.group]} pct={p.pct}
      badge={p.pct === 100 ? 'ครบแล้ว' : `${p.pct}%`} foot={`ทำแล้ว ${p.done} / ${p.total} รายการ`}
      onClick={() => onOpen({ type: 'list', id: entry.id })} onHover={() => prefetchChecklist(entry.id)}
    />
  )
}

function ProjectRow({ program, project, checkedMap, onOpen, showProgram = false }) {
  const doc = useMemo(() => projectChecklist(program, project), [program, project])
  const key = doc?.id
  const p = doc ? projectProgress(doc, checkedMap[key]) : { done: 0, total: 0, pct: 0 }
  const tone = ROUND_TONE[project.r]
  return (
    <Row
      title={projectTitle(project)} subtitle={showProgram ? program.n : ROUND_NAMES[project.r]} tone={tone} pct={p.pct}
      badge={`รอบ ${project.r}`} foot={`รับ ${project.s || '-'} คน · ทำแล้ว ${p.done} / ${p.total}`}
      onClick={() => onOpen({ type: 'project', programId: program.p, key })}
    />
  )
}

// ── one checklist (static list or generated project) ────────────────────────

function Item({ item, on, onToggle }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <button
        type="button" role="checkbox" aria-checked={on} aria-label={item.t} onClick={onToggle}
        className={`mt-0.5 shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${on ? 'bg-brand-strong border-brand-strong text-white' : 'bg-paper border-ink-soft'}`}
      >
        {on && <Check size={16} strokeWidth={3} aria-hidden="true" />}
      </button>
      <span className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className={`thai-font text-sm ${on ? 'line-through text-ink-soft' : ''}`}>{item.t}</span>
        {item.n && <span className="thai-font text-xs text-ink-soft whitespace-pre-line break-words">{item.n}</span>}
        {item.href && <ExtLink href={item.href}>เปิดลิงก์</ExtLink>}
      </span>
    </li>
  )
}

function ChecklistView({ doc, tone, onBack }) {
  const id = doc.id
  const saved = useChecklistStore((s) => s.checked[id])
  const toggle = useChecklistStore((s) => s.toggle)
  const setChecked = useChecklistStore((s) => s.setChecked)
  const reset = useChecklistStore((s) => s.reset)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    const current = useChecklistStore.getState().checked[id] ?? []
    const clean = cleanChecked(current, doc)
    if (clean.length !== current.length) setChecked(id, clean)
  }, [id, doc, setChecked])

  const checked = saved ?? []
  const p = progress(doc, checked)
  const unis = uniLinks(doc.uniIds)
  const m = doc.meta ?? {}

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <BackButton onBack={onBack} />
      <header className="flex flex-col gap-1">
        <h2 className="thai-font font-bold text-lg leading-snug">{doc.title}</h2>
        <p className="thai-font text-sm text-ink-soft">{doc.subtitle}</p>
      </header>

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
    </div>
  )
}

function StaticList({ id, onBack }) {
  const [loaded, setLoaded] = useState({ id: null, doc: undefined })
  useEffect(() => {
    let live = true
    loadChecklist(id).then((d) => { if (live) setLoaded({ id, doc: d }) })
    return () => { live = false }
  }, [id])
  const doc = loaded.id === id ? loaded.doc : undefined
  const entry = CHECKLIST_INDEX.lists.find((l) => l.id === id)
  if (doc) return <ChecklistView doc={doc} tone={GROUP_TONE[entry?.group] ?? 'var(--color-brand)'} onBack={onBack} />
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <BackButton onBack={onBack} />
      <h2 className="thai-font font-bold text-lg">{entry?.title}</h2>
      {doc === undefined ? <Skeleton /> : <Notice>โหลด checklist นี้ไม่สำเร็จ ลองกลับไปแล้วเปิดใหม่</Notice>}
    </div>
  )
}

// A shard load shared by the screens below: { status: 'loading' | 'ready' | 'error', shard }.
function useShard(universityId) {
  const [state, setState] = useState({ id: null, shard: undefined })
  useEffect(() => {
    let live = true
    if (!universityId) return undefined
    loadUniversityProjects(universityId).then((shard) => { if (live) setState({ id: universityId, shard }) })
    return () => { live = false }
  }, [universityId])
  if (!universityId) return { status: 'error', shard: null }
  if (state.id !== universityId) return { status: 'loading', shard: null }
  return state.shard ? { status: 'ready', shard: state.shard } : { status: 'error', shard: null }
}

function ProjectScreen({ programId, projectKey: key, onBack }) {
  const { status, shard } = useShard(universityIdOfProgram(programId))
  const program = findProgram(shard, programId)
  const found = program?.j.map((project, i) => ({ project, key: projectKey(programId, project, i) })).find((x) => x.key === key)
  const doc = useMemo(() => (program && found ? projectChecklist(program, found.project) : null), [program, found])
  if (doc) return <ChecklistView doc={doc} tone={ROUND_TONE[found.project.r]} onBack={onBack} />
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <BackButton onBack={onBack} />
      {status === 'loading' ? <Skeleton /> : <Notice>ไม่พบโครงการนี้ในข้อมูลล่าสุด ลองเลือกใหม่จากรายการ</Notice>}
    </div>
  )
}

// ── goals tab ────────────────────────────────────────────────────────────────

function GoalBlock({ goal, checkedMap, onOpen }) {
  const universityId = goal.universityId ?? universityIdOfProgram(goal.programId)
  const { status, shard } = useShard(goal.programId ? universityId : null)
  const found = goal.programId ? goalProjects(shard, goal) : null
  return (
    <section className="flex flex-col gap-2" aria-label={goalTitle(goal)}>
      <div>
        <h3 className="thai-font font-bold text-sm flex items-center gap-1.5"><Target size={14} aria-hidden="true" /> {goalTitle(goal)}</h3>
        <p className="thai-font text-xs text-ink-soft">{goalSubtitle(goal)}</p>
      </div>
      {!goal.programId && <Notice>เป้าหมายนี้ไม่ได้เลือกจาก MyTCAS จึงยังไม่มีรายการโครงการ เลือกหลักสูตรใหม่ใน Goal หรือดูขั้นตอนของมหาวิทยาลัยที่แท็บ "สมัคร"</Notice>}
      {goal.programId && status === 'loading' && <Skeleton />}
      {goal.programId && status === 'error' && <Notice>โหลดข้อมูลโครงการของมหาวิทยาลัยนี้ไม่สำเร็จ ลองเปิดแท็บนี้ใหม่</Notice>}
      {goal.programId && status === 'ready' && !found && <Notice>ไม่พบหลักสูตรนี้ในข้อมูลรอบ 1–2 ของ TCAS70 อาจไม่เปิดรับรอบ Portfolio / Quota</Notice>}
      {found && found.projects.length === 0 && <Notice>หลักสูตรนี้ไม่เปิดรอบ 1 Portfolio และรอบ 2 Quota ในข้อมูลล่าสุด</Notice>}
      {found && found.projects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {found.program.j.map((project, i) => <ProjectRow key={found.projects[i].key} program={found.program} project={project} checkedMap={checkedMap} onOpen={onOpen} />)}
        </div>
      )}
    </section>
  )
}

function GoalsTab({ onOpen, onGoApply }) {
  const goals = useLifeStore((s) => s.goals)
  const checked = useChecklistStore((s) => s.checked)
  if (!goals?.length) {
    return (
      <div className="flex flex-col gap-3">
        <Notice>ยังไม่มีเป้าหมาย ตั้งเป้าหมายใน Goal ก่อน แล้วโครงการรอบ 1 Portfolio และรอบ 2 Quota ของหลักสูตรนั้นจะมาอยู่ที่นี่ หรือเลือกมหาวิทยาลัยดูเองที่แท็บ "สมัคร"</Notice>
        <button type="button" onClick={onGoApply} className="px-btn self-start px-3 py-1.5 thai-font text-sm font-bold bg-paper">ไปแท็บสมัคร</button>
      </div>
    )
  }
  return <div className="flex flex-col gap-5">{goals.map((g) => <GoalBlock key={g.id} goal={g} checkedMap={checked} onOpen={onOpen} />)}</div>
}

// ── study tab (TGAT / A-Level) ───────────────────────────────────────────────

function StudyTab({ onOpen }) {
  const checked = useChecklistStore((s) => s.checked)
  const [q, setQ] = useState('')
  const lists = useMemo(() => searchLists(q, CHECKLIST_INDEX.lists.filter((l) => l.group !== 'portfolio')), [q])
  return (
    <div className="flex flex-col gap-3">
      <label className="px-card flex items-center gap-2 px-3 py-2 focus-within:ring-2 focus-within:ring-brand">
        <Search size={16} aria-hidden="true" className="text-ink-soft" />
        <span className="sr-only">ค้นหาวิชา</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา เช่น ฟิสิกส์ TGAT" className="flex-1 min-w-0 bg-transparent outline-none thai-font text-sm" />
      </label>
      {lists.length === 0 ? <Notice>ไม่พบวิชาที่ค้นหา</Notice> : (
        <div className="grid gap-3 sm:grid-cols-2">{lists.map((l) => <ListCard key={l.id} entry={l} checkedMap={checked} onOpen={onOpen} />)}</div>
      )}
      <p className="thai-font text-xs text-ink-soft">เนื้อหาจากโครงสร้างข้อสอบทางการของ ทปอ. (mytcas.com/blueprint) ตรวจล่าสุด {CHECKLIST_INDEX.verifiedAt}</p>
    </div>
  )
}

// ── apply tab: every university, programme and project ──────────────────────

function ApplyTab({ onOpen }) {
  const checked = useChecklistStore((s) => s.checked)
  const [manifest, setManifest] = useState(undefined)
  const [q, setQ] = useState('')
  useEffect(() => { let live = true; loadProjectManifest().then((m) => { if (live) setManifest(m) }); return () => { live = false } }, [])
  const unis = useMemo(() => (manifest?.universities ?? []).filter((u) => !q.trim() || u.name.includes(q.trim())), [manifest, q])
  const processLists = CHECKLIST_INDEX.lists.filter((l) => l.group === 'portfolio')
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2" aria-label="ทุกมหาวิทยาลัย">
        <h3 className="thai-font font-bold text-sm flex items-center gap-1.5"><School size={14} aria-hidden="true" /> เลือกมหาวิทยาลัย ดูโครงการรอบ 1 และรอบ 2 ทั้งหมด</h3>
        <label className="px-card flex items-center gap-2 px-3 py-2 focus-within:ring-2 focus-within:ring-brand">
          <Search size={16} aria-hidden="true" className="text-ink-soft" />
          <span className="sr-only">ค้นหามหาวิทยาลัย</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหามหาวิทยาลัย" className="flex-1 min-w-0 bg-transparent outline-none thai-font text-sm" />
        </label>
        {manifest === undefined && <Skeleton />}
        {manifest === null && <Notice>โหลดรายชื่อมหาวิทยาลัยไม่สำเร็จ ลองเปิดแท็บนี้ใหม่</Notice>}
        {manifest && unis.length === 0 && <Notice>ไม่พบมหาวิทยาลัยที่ค้นหา</Notice>}
        {manifest && unis.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {unis.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => onOpen({ type: 'uni', id: u.id })} className="w-full px-card p-3 text-left flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  <span className="min-w-0">
                    <span className="thai-font font-bold text-sm block truncate">{u.name}</span>
                    <span className="thai-font text-xs text-ink-soft">{u.programs} หลักสูตร · รอบ 1 {u.r1} โครงการ · รอบ 2 {u.r2} โครงการ</span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-ink-soft" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {manifest && <p className="thai-font text-xs text-ink-soft">ข้อมูลโครงการจาก MyTCAS อัปเดตล่าสุด {manifest.builtAt} ก่อนสมัครให้เปิดประกาศของโครงการอีกครั้ง</p>}
      </section>

      <section className="flex flex-col gap-2" aria-label="ขั้นตอนของมหาวิทยาลัย">
        <h3 className="thai-font font-bold text-sm flex items-center gap-1.5"><GraduationCap size={14} aria-hidden="true" /> ขั้นตอนและเอกสารที่ตรวจจากประกาศทางการ</h3>
        <div className="grid gap-3 sm:grid-cols-2">{processLists.map((l) => <ListCard key={l.id} entry={l} checkedMap={checked} onOpen={onOpen} />)}</div>
      </section>
    </div>
  )
}

function UniversityScreen({ id, onBack, onOpen }) {
  const { status, shard } = useShard(id)
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const checked = useChecklistStore((s) => s.checked)
  const programs = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (shard?.programs ?? []).filter((p) => !t || `${p.n} ${p.f} ${p.cm}`.toLowerCase().includes(t))
  }, [shard, q])
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <BackButton onBack={onBack} />
      <h2 className="thai-font font-bold text-lg">{shard?.name ?? 'มหาวิทยาลัย'}</h2>
      {status === 'loading' && <Skeleton />}
      {status === 'error' && <Notice>โหลดข้อมูลมหาวิทยาลัยนี้ไม่สำเร็จ</Notice>}
      {status === 'ready' && (
        <>
          <label className="px-card flex items-center gap-2 px-3 py-2 focus-within:ring-2 focus-within:ring-brand">
            <Search size={16} aria-hidden="true" className="text-ink-soft" />
            <span className="sr-only">ค้นหาคณะหรือหลักสูตร</span>
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} placeholder="ค้นหาคณะ / หลักสูตร" className="flex-1 min-w-0 bg-transparent outline-none thai-font text-sm" />
          </label>
          {programs.length === 0 ? <Notice>ไม่พบหลักสูตรที่ค้นหา</Notice> : (
            <ul className="flex flex-col gap-2">
              {programs.slice(0, limit).map((p) => {
                const done = p.j.reduce((n, project) => n + ((checked[projectKey(p.p, project)] ?? []).length > 0 ? 1 : 0), 0)
                return (
                  <li key={p.p}>
                    <button type="button" onClick={() => onOpen({ type: 'program', id: p.p })} className="w-full px-card p-3 text-left flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                      <span className="min-w-0">
                        <span className="thai-font font-bold text-sm block">{p.n}</span>
                        <span className="thai-font text-xs text-ink-soft block">{[p.f, p.cm].filter(Boolean).join(' · ')}</span>
                        <span className="thai-font text-xs text-ink-soft">{p.j.length} โครงการ{done ? ` · เริ่มทำแล้ว ${done}` : ''}</span>
                      </span>
                      <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-ink-soft" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {programs.length > limit && (
            <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="px-btn self-center px-4 py-2 thai-font text-sm font-bold bg-paper">แสดงเพิ่ม ({programs.length - limit})</button>
          )}
        </>
      )}
    </div>
  )
}

function ProgramScreen({ programId, onBack, onOpen }) {
  const { status, shard } = useShard(universityIdOfProgram(programId))
  const program = findProgram(shard, programId)
  const checked = useChecklistStore((s) => s.checked)
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <BackButton onBack={onBack} />
      {status === 'loading' && <Skeleton />}
      {status !== 'loading' && !program && <Notice>ไม่พบหลักสูตรนี้ในข้อมูลล่าสุด</Notice>}
      {program && (
        <>
          <header>
            <h2 className="thai-font font-bold text-lg leading-snug">{program.n}</h2>
            <p className="thai-font text-sm text-ink-soft">{[shard.name, program.f, program.cm].filter(Boolean).join(' · ')}</p>
          </header>
          {[1, 2].map((r) => {
            const items = program.j.filter((x) => x.r === r)
            return (
              <section key={r} className="flex flex-col gap-2" aria-label={ROUND_NAMES[r]}>
                <h3 className="thai-font font-bold text-sm">{ROUND_NAMES[r]} · {items.length} โครงการ</h3>
                {items.length === 0 ? <Notice>ไม่เปิดรับในรอบนี้</Notice> : (
                  <div className="grid gap-3 sm:grid-cols-2">{items.map((project) => <ProjectRow key={projectKey(program.p, project, program.j.indexOf(project))} program={program} project={project} checkedMap={checked} onOpen={onOpen} />)}</div>
                )}
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}

// ── shell ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'goals', label: 'เป้าหมายของฉัน' },
  { id: 'study', label: 'เนื้อหา' },
  { id: 'apply', label: 'สมัคร' },
]

function Home({ tab, setTab, onOpen }) {
  const checked = useChecklistStore((s) => s.checked)
  const total = CHECKLIST_INDEX.lists.reduce((n, l) => n + l.items, 0)
  const done = CHECKLIST_INDEX.lists.reduce((n, l) => n + indexProgress(l, checked).done, 0)
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <section className="px-card p-4 bg-brand-soft flex flex-col gap-2" aria-label="ภาพรวม">
        <h3 className="thai-font font-bold flex items-center gap-2"><ListChecks size={18} aria-hidden="true" /> Checklist เตรียมสอบและสมัคร</h3>
        <p className="thai-font text-sm text-ink-soft">เนื้อหา TGAT / A-Level และเอกสารที่ต้องเตรียมสำหรับรอบ 1 Portfolio และรอบ 2 Quota ของโครงการจริง ติ๊กไปทีละข้อ ระบบจำให้</p>
        <Bar pct={total ? Math.round((done / total) * 100) : 0} />
        <p className="thai-font text-xs text-ink-soft">เนื้อหาและขั้นตอนมหาวิทยาลัย ทำแล้ว {done} / {total} รายการ</p>
      </section>
      <div className="flex gap-2 overflow-x-auto os-pages" role="tablist" aria-label="หมวด">
        {TABS.map((t) => (
          <button
            key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`px-btn px-3 py-1.5 thai-font text-sm font-bold whitespace-nowrap ${tab === t.id ? 'bg-brand-strong text-white' : 'bg-paper'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'goals' && <GoalsTab onOpen={onOpen} onGoApply={() => setTab('apply')} />}
      {tab === 'study' && <StudyTab onOpen={onOpen} />}
      {tab === 'apply' && <ApplyTab onOpen={onOpen} />}
    </div>
  )
}

// Checklist: study content (TGAT / A-Level from the official blueprints) and, for Portfolio / Quota,
// the checklist of every project of every university, linked to the student's goals (Goal app).
// Ticks are saved on this device. Screens form a small stack so Back always goes one step up.
export default function ChecklistApp() {
  const hasGoals = useLifeStore((s) => (s.goals?.length ?? 0) > 0)
  const [tab, setTab] = useState(hasGoals ? 'goals' : 'study')
  const [stack, setStack] = useState([])
  const screen = stack[stack.length - 1]
  const open = (s) => setStack((st) => [...st, s])
  const back = () => setStack((st) => st.slice(0, -1))

  if (!screen) return <Home tab={tab} setTab={setTab} onOpen={open} />
  if (screen.type === 'list') return <StaticList id={screen.id} onBack={back} />
  if (screen.type === 'uni') return <UniversityScreen id={screen.id} onBack={back} onOpen={open} />
  if (screen.type === 'program') return <ProgramScreen programId={screen.id} onBack={back} onOpen={open} />
  if (screen.type === 'project') return <ProjectScreen programId={screen.programId} projectKey={screen.key} onBack={back} />
  return <Home tab={tab} setTab={setTab} onOpen={open} />
}
