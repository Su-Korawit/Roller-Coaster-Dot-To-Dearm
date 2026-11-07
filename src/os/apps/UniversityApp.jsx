import { useState } from 'react'
import { ExternalLink, GraduationCap, Globe, Home as HomeIcon, Target } from 'lucide-react'
import { useTcasFaculties } from '../../hooks/useMytcas'
import { useLifeStore } from '../../stores/useLifeStore'
import { MAX_GOALS, makeGoal } from '../goalLogic'
import { findApp } from '../apps'
import ProgramPicker from '../goal/ProgramPicker'
import StarterPicker from '../goal/StarterPicker'
import { UniLogo } from '../goal/ui'
import LinkApp from './LinkApp'

const TABS = [
  { id: 'home', label: 'หน้าแรก', Icon: HomeIcon },
  { id: 'programs', label: 'หลักสูตร', Icon: GraduationCap },
  { id: 'web', label: 'เว็บรับสมัคร', Icon: Globe },
]

// One app per university: home (what it is + shortcuts), programmes from MyTCAS (set as a Goal),
// and the university's own admission website inside our window.
export default function UniversityApp({ app, onOpenApp }) {
  const { id, name, url, extra } = app.university
  const [tab, setTab] = useState('home')
  const [starter, setStarter] = useState(null)
  const [msg, setMsg] = useState('')
  const { data, loading } = useTcasFaculties(id)
  const addGoal = useLifeStore((s) => s.addGoal)
  const goalCount = useLifeStore((s) => s.goals.length)

  function pick(input) {
    const res = addGoal(makeGoal(input))
    setStarter(null)
    setTab('home')
    setMsg(res.ok ? `เพิ่ม "${input.program}" เป็นเป้าหมายใน Goal แล้ว` : res.reason === 'duplicate' ? 'เป้าหมายนี้มีอยู่แล้ว' : `เพิ่มได้สูงสุด ${MAX_GOALS} เป้าหมาย`)
  }

  let body
  if (tab === 'programs') {
    body = starter
      ? <StarterPicker initial={starter} onPick={pick} onBack={() => setStarter(null)} />
      : <ProgramPicker lockUniversityId={id} initial={{ university: name }} onPick={pick} onCancel={() => setTab('home')} onStarter={setStarter} />
  } else if (tab === 'web') {
    body = (
      <div className="h-[70vh] min-h-[420px] -m-4 sm:-m-6">
        <LinkApp app={{ name, url, tagline: name, embed: true }} />
      </div>
    )
  } else {
    body = (
      <div className="flex flex-col gap-4">
        <section className="px-card p-5 flex flex-col items-center gap-3 text-center bg-brand-soft" aria-label={name}>
          <UniLogo id={id} name={name} size={84} />
          <h2 className="font-display font-bold text-xl">{name}</h2>
          {loading ? <p className="thai-font text-xs text-ink-soft">กำลังโหลดข้อมูลจาก MyTCAS...</p> : data && (
            <p className="thai-font text-sm text-ink-soft">{data.faculties?.length ?? 0} คณะ · {data.total_programs ?? 0} หลักสูตรใน MyTCAS</p>
          )}
        </section>
        {msg && (
          <p role="status" className="px-card p-3 thai-font text-sm font-semibold bg-zone-earth-soft text-zone-earth-deep">
            {msg}
            {goalCount > 0 && <button type="button" onClick={() => { const g = findApp('goal'); if (g) onOpenApp(g) }} className="ml-2 underline">เปิด Goal</button>}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button type="button" onClick={() => setTab('programs')} className="px-card p-4 flex items-center gap-3 text-left bg-paper active:translate-y-px">
            <Target size={28} className="text-brand-strong shrink-0" aria-hidden="true" />
            <span><span className="block thai-font font-bold text-sm">ดูหลักสูตรและตั้งเป็นเป้าหมาย</span><span className="block thai-font text-xs text-ink-soft">เกณฑ์รอบ 3 และคะแนนที่ต้องใช้จาก MyTCAS</span></span>
          </button>
          <button type="button" onClick={() => setTab('web')} className="px-card p-4 flex items-center gap-3 text-left bg-paper active:translate-y-px">
            <Globe size={28} className="text-zone-sci-deep shrink-0" aria-hidden="true" />
            <span><span className="block thai-font font-bold text-sm">เว็บรับสมัครของมหาวิทยาลัย</span><span className="block thai-font text-xs text-ink-soft">เปิดดูในหน้าต่างนี้ได้เลย</span></span>
          </button>
        </div>
        {extra?.length > 0 && (
          <section className="px-card p-4 flex flex-col gap-2" aria-label="ลิงก์อื่น">
            <h3 className="thai-font font-bold text-sm">ลิงก์อื่นของมหาวิทยาลัย</h3>
            {extra.map(([label, href]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="thai-font text-sm text-brand-strong underline flex items-center gap-1.5">
                <ExternalLink size={14} aria-hidden="true" /> {label}
              </a>
            ))}
          </section>
        )}
        <p className="thai-font text-xs text-ink-soft">ลิงก์รวบรวมและตรวจเมื่อ 7 พ.ย. 2569 มหาวิทยาลัยอาจไม่ได้เปิดรับทุกหลักสูตรหรือทุกรอบ ดูประกาศล่าสุดที่เว็บของมหาวิทยาลัยเสมอ</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col">
      <nav className="sticky top-0 z-10 bg-paper border-b-2 border-hairline px-3 pt-2" role="tablist" aria-label={`เมนู ${app.name}`}>
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
