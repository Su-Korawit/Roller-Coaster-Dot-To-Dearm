import { useEffect, useMemo, useState } from 'react'
import { Check, Info } from 'lucide-react'
import { scoresFromSubjects, matchByName, universityIdByName } from '../goalLogic'
import { BackBar, SearchBox, PickRow, Loading, Failed } from './ui'

// TCAS Starter (tcas.in.th, Dek-D) fallback: used only when MyTCAS has no match. Not official data.
const cache = new Map()
async function fetchStarter(params) {
  const url = `/api/tcasin?${new URLSearchParams(params)}`
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`tcasin ${res.status}`)
  const data = await res.json()
  cache.set(url, data)
  return data
}

// Loads once per `key`; returns { data, loading, error, retry }.
function useStarter(params, enabled = true) {
  const key = JSON.stringify(params)
  const [state, setState] = useState({ key: null, data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!enabled) return undefined
    let off = false
    fetchStarter(params)
      .then((data) => { if (!off) setState({ key, data, error: null }) })
      .catch((error) => { if (!off) setState({ key, data: null, error }) })
    return () => { off = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, attempt])
  const settled = state.key === key
  return {
    data: settled ? state.data : null,
    error: settled ? state.error : null,
    loading: enabled && !settled,
    retry: () => { cache.delete(`/api/tcasin?${new URLSearchParams(params)}`); setState({ key: null, data: null, error: null }); setAttempt((a) => a + 1) },
  }
}

const has = (text, q) => String(text ?? '').toLowerCase().includes(q.trim().toLowerCase())

function Disclaimer() {
  return (
    <p className="px-card p-3 flex gap-2 items-start bg-zone-biz-soft thai-font text-xs">
      <Info size={16} className="shrink-0 mt-0.5 text-zone-biz-deep" aria-hidden="true" />
      <span>ข้อมูลจาก TCAS Starter (Dek-D) ไม่ใช่ข้อมูลทางการ และอาจเป็นข้อมูลของปีก่อนๆ ตรวจสอบประกาศล่าสุดที่ mytcas.com อีกครั้งก่อนสมัครจริง</span>
    </p>
  )
}

export default function StarterPicker({ onPick, onBack, initial = null }) {
  const [uni, setUni] = useState(null)
  const [fac, setFac] = useState(null)
  const [dept, setDept] = useState(null)
  const [query, setQuery] = useState(initial?.level === 'uni' ? (initial.query ?? '') : '')   // the search text only applies at the level it was typed
  const [applied, setApplied] = useState(false)

  const unis = useStarter({ mode: 'unis' })
  const facs = useStarter({ uni: uni?.slug ?? '' }, !!uni)
  const depts = useStarter({ uni: uni?.slug ?? '', fac: fac?.slug ?? '' }, !!uni && !!fac)
  const detail = useStarter({ dept: dept?.slug ?? '' }, !!dept)

  useEffect(() => {
    if (applied || !unis.data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApplied(true)
    const hit = initial?.university ? matchByName(unis.data.universities, initial.university, 'name') : null
    if (hit) { setUni(hit); if (initial.level === 'fac') setQuery(initial.query ?? '') }
  }, [applied, unis.data, initial])

  const shownUnis = useMemo(() => (unis.data?.universities ?? []).filter((u) => has(u.name, query)), [unis.data, query])
  const shownFacs = useMemo(() => (facs.data?.faculties ?? []).filter((f) => has(f.name, query)), [facs.data, query])
  const shownDepts = useMemo(() => (depts.data?.departments ?? []).filter((d) => has(d.name, query)), [depts.data, query])
  // Going down a level clears the search, except a programme name typed in MyTCAS carries over to the department list.
  const go = (setter, value) => { setter(value); setQuery(setter === setFac && value && initial?.level === 'prog' ? (initial.query ?? '') : '') }

  if (dept) {
    const reqs = scoresFromSubjects(detail.data?.subjects)
    return (
      <div className="flex flex-col gap-4">
        <BackBar onBack={() => setDept(null)} title={dept.name} sub={`${uni.name} · ${fac.name}`} />
        <Disclaimer />
        {detail.loading ? <Loading /> : detail.error ? <Failed onRetry={detail.retry} /> : (
          <>
            <section className="px-card p-4 flex flex-col gap-2" aria-label="รอบ 3 จาก TCAS Starter">
              <h4 className="thai-font font-bold text-sm">รอบ 3 Admission</h4>
              {detail.data.seats && <p className="thai-font text-xs text-ink-soft">รับ {detail.data.seats} คน</p>}
              {reqs.length ? (
                <ul className="flex flex-col gap-1">
                  {reqs.map((r) => <li key={r.subject} className="thai-font text-sm flex justify-between"><span>{r.subject}</span><span className="text-ink-soft">{r.weight}%</span></li>)}
                </ul>
              ) : <p className="thai-font text-sm text-ink-soft">ไม่พบวิชาที่กำหนดใช้ในรอบ 3 เพิ่มวิชาเองได้ในหน้าเป้าหมาย</p>}
              {reqs.length > 0 && <p className="thai-font text-xs text-ink-soft">ไม่มีคะแนนขั้นต่ำ ระบบตั้งเป้าเริ่มต้นไว้ที่ 60 แก้ได้ภายหลัง</p>}
            </section>
            <button
              type="button"
              onClick={() => onPick({
                source: 'tcasin', universityId: universityIdByName(uni.name), university: uni.name, faculty: fac.name,
                program: dept.name, programId: `tcasin-${dept.id}`, reqs, url: detail.data.url,
              })}
              className="px-btn py-2.5 thai-font text-sm font-bold bg-brand-strong text-white flex items-center justify-center gap-2"
            >
              <Check size={16} aria-hidden="true" /> ตั้งเป็นเป้าหมาย
            </button>
          </>
        )}
      </div>
    )
  }

  if (uni && fac) {
    return (
      <div className="flex flex-col gap-3">
        <BackBar onBack={() => go(setFac, null)} title={fac.name} sub={`${uni.name} · TCAS Starter`} />
        <Disclaimer />
        <SearchBox value={query} onChange={setQuery} label="ค้นหาสาขา" />
        {depts.loading ? <Loading /> : depts.error ? <Failed onRetry={depts.retry} /> : (
          <>
            {shownDepts.map((d) => <PickRow key={d.id} title={d.name} onClick={() => go(setDept, d)} />)}
            {shownDepts.length === 0 && <p className="thai-font text-sm text-ink-soft text-center py-6">ไม่พบสาขาที่ตรงกับ "{query}"</p>}
          </>
        )}
      </div>
    )
  }

  if (uni) {
    return (
      <div className="flex flex-col gap-3">
        <BackBar onBack={() => go(setUni, null)} title={uni.name} sub="TCAS Starter · เลือกคณะ" />
        <Disclaimer />
        <SearchBox value={query} onChange={setQuery} label="ค้นหาคณะ" />
        {facs.loading ? <Loading /> : facs.error ? <Failed onRetry={facs.retry} /> : (
          <>
            {shownFacs.map((f) => <PickRow key={f.id} title={f.name} onClick={() => go(setFac, f)} />)}
            {shownFacs.length === 0 && <p className="thai-font text-sm text-ink-soft text-center py-6">ไม่พบคณะที่ตรงกับ "{query}"</p>}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <BackBar onBack={onBack} title="ค้นหาใน TCAS Starter" sub="ใช้เมื่อ MyTCAS ไม่มีข้อมูล" />
      <Disclaimer />
      <SearchBox value={query} onChange={setQuery} label="ค้นหามหาวิทยาลัย" />
      {unis.loading ? <Loading /> : unis.error ? <Failed onRetry={unis.retry} /> : (
        <>
          {shownUnis.map((u) => <PickRow key={u.id} title={u.name} onClick={() => go(setUni, u)} />)}
          {shownUnis.length === 0 && <p className="thai-font text-sm text-ink-soft text-center py-6">ไม่พบมหาวิทยาลัยที่ตรงกับ "{query}"</p>}
        </>
      )}
    </div>
  )
}
