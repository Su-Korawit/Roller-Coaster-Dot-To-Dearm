import { useCallback, useEffect, useRef, useState } from 'react'
import { PhoneOff, Loader2, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { usePlansStore } from '../../stores/usePlansStore'
import { fetchStatus, voiceApi, buildStudyPlan, buildOsStudyPlan, VoiceError } from '../../services/voiceSecretary'
import { useLifeStore } from '../../stores/useLifeStore'
import { startVoiceCall } from '../../services/voiceCall'
import { isCallAllowed } from '../../services/voiceAccess'
import {
  SECRETARY_NAME, CONSENT_TEXT, GUARDIAN_TEXT, UI_TEXT, DAY_LABELS,
} from '../../constants/voiceCopy'

const IMG = '/assets/voice/'
const PIJAIDEE = { idle: 'pijaidee-smile.png', connecting: 'pijaidee-listen.png', talking: 'pijaidee-listen.png', ended: 'pijaidee-cheer.png', error: 'pijaidee-listen.png' }
const PHONE_STATUS_ICON = { dialing: 'call-status-calling.png', no_answer: 'call-status-busy.png', busy: 'call-status-busy.png', declined: 'call-status-busy.png', answered: 'call-status-ended.png' }

const btnBase = 'px-btn px-4 py-2.5 text-[14px] font-bold thai-font border-2 border-line disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
const btn = `${btnBase} bg-paper text-ink`
const btnPrimary = `${btnBase} bg-brand-strong text-white` // not btn + override: bg-paper would win and hide white text
const input = 'w-full px-3 py-2 rounded-ui border-2 border-line-soft bg-paper text-ink text-[14px] thai-font focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

function ConsentForm({ onDone }) {
  const [birthYear, setBirthYear] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [g, setG] = useState({ name: '', relationship: '', phone: '', confirmed: false })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const year = Number(birthYear)
  const ce = year > 2400 ? year - 543 : year
  const minor = Number.isInteger(ce) && ce > 1900 && new Date().getFullYear() - ce < 21

  async function submit() {
    setBusy(true); setErr('')
    try {
      await voiceApi('consent', { body: { birthYear: year, accepted, guardian: minor ? g : undefined } })
      onDone()
    } catch (e) {
      setErr(e instanceof VoiceError ? e.thai : 'เกิดข้อผิดพลาด')
    } finally { setBusy(false) }
  }

  return (
    <section className="space-y-3" aria-label={CONSENT_TEXT.title}>
      <p className="thai-font font-bold text-ink flex items-center gap-2"><ShieldCheck size={16} aria-hidden="true" />{CONSENT_TEXT.title}</p>
      <p className="thai-font text-[13px] text-ink-soft">{CONSENT_TEXT.intro}</p>
      <ul className="list-disc pl-5 space-y-1 thai-font text-[13px] text-ink">
        {CONSENT_TEXT.collects.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <p className="thai-font text-[13px] text-ink">{CONSENT_TEXT.notCollected}</p>
      <p className="thai-font text-[13px] text-ink-soft">{CONSENT_TEXT.thirdParty}</p>
      <p className="thai-font text-[13px] text-ink-soft">{CONSENT_TEXT.rights}</p>

      <label className="block thai-font text-[13px] text-ink">ปีเกิด (พ.ศ. หรือ ค.ศ.)
        <input className={input} inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="เช่น 2551" />
      </label>

      {minor && (
        <div className="space-y-2 border-2 border-warn p-3 rounded-ui bg-warn/10">
          <p className="thai-font font-bold text-[13px] text-ink">{GUARDIAN_TEXT.title}</p>
          <p className="thai-font text-[13px] text-ink">{GUARDIAN_TEXT.intro}</p>
          <input className={input} placeholder="ชื่อ-นามสกุลผู้ปกครอง" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
          <input className={input} placeholder="ความสัมพันธ์ (เช่น มารดา)" value={g.relationship} onChange={(e) => setG({ ...g, relationship: e.target.value })} />
          <input className={input} inputMode="tel" placeholder="เบอร์ผู้ปกครอง" value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} />
          <label className="flex gap-2 thai-font text-[13px] text-ink">
            <input type="checkbox" checked={g.confirmed} onChange={(e) => setG({ ...g, confirmed: e.target.checked })} />
            <span>{GUARDIAN_TEXT.confirm}</span>
          </label>
        </div>
      )}

      <label className="flex gap-2 thai-font text-[13px] text-ink">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>{CONSENT_TEXT.accept}</span>
      </label>
      {err && <p role="alert" className="thai-font text-[13px] text-danger">{err}</p>}
      <button className={btnPrimary} disabled={busy || !accepted || !birthYear} onClick={submit}>
        {busy ? <Loader2 size={14} className="animate-spin inline" aria-hidden="true" /> : 'ยืนยัน'}
      </button>
    </section>
  )
}

function CallButton({ status, name, secretaryId }) {
  const plans = usePlansStore((s) => s.plans)
  const goals = useLifeStore((s) => s.goals)
  const [phase, setPhase] = useState('idle') // idle | connecting | talking | ended | error
  const [mock, setMock] = useState(false)
  const [msg, setMsg] = useState('')
  const handle = useRef(null)

  useEffect(() => () => handle.current?.stop(), [])

  async function start() {
    setMsg('')
    try {
      handle.current = await startVoiceCall(
        { student_name: name, study_plan: buildStudyPlan(plans) || buildOsStudyPlan(goals), secretary_id: secretaryId },
        (s, info) => { setPhase(s); if (info?.mock) setMock(true) },
      )
      setMock(handle.current.mock)
    } catch (e) {
      setPhase('error')
      setMsg(e instanceof VoiceError ? e.thai : 'เกิดข้อผิดพลาด')
    }
  }
  function stop() { handle.current?.stop() }

  const busy = phase === 'connecting' || phase === 'talking'
  return (
    <div className="space-y-2">
      <img src={`${IMG}${PIJAIDEE[phase]}`} alt="พี่ใจดี" width="96" height="96" className="w-24 h-24 mx-auto [image-rendering:pixelated]" />
      {(status.mock || mock) && <p className="thai-font text-[12px] text-warn-strong">{UI_TEXT.mockBadge}</p>}
      {status.trial?.phase === 'trial' && <p className="thai-font text-[12px] text-ink-soft">{UI_TEXT.trialLeft(status.trial.daysLeft)}</p>}
      {status.trial?.phase === 'expired' ? (
        <div className="border-2 border-line p-3 rounded-ui space-y-1">
          <p className="thai-font font-bold text-ink">{UI_TEXT.upgradeTitle}</p>
          <p className="thai-font text-[13px] text-ink-soft">{UI_TEXT.upgradeBody}</p>
        </div>
      ) : (
        <button className={btnPrimary} disabled={phase === 'connecting'} onClick={busy ? stop : start} aria-live="polite">
          {busy
            ? <PhoneOff size={16} className="inline mr-2" aria-hidden="true" />
            : <img src={`${IMG}voice-talk-button.png`} alt="" width="20" height="20" className="inline mr-2 w-5 h-5 [image-rendering:pixelated]" />}
          {phase === 'connecting' ? UI_TEXT.connecting : phase === 'talking' ? UI_TEXT.endButton : UI_TEXT.talkButton}
        </button>
      )}
      <p role="status" className="thai-font text-[13px] text-ink-soft">
        {phase === 'talking' ? UI_TEXT.talking : phase === 'ended' ? UI_TEXT.ended : ''}
      </p>
      {msg && <p role="alert" className="thai-font text-[13px] text-danger">{msg}</p>}
    </div>
  )
}

function PhoneSettings({ status, reload, secretaryId }) {
  const [phone, setPhone] = useState('')
  const [days, setDays] = useState(status.schedule?.days || [])
  const [time, setTime] = useState(status.schedule?.time || '18:30')
  const [msg, setMsg] = useState('')
  const plans = usePlansStore((s) => s.plans)
  const goals = useLifeStore((s) => s.goals)
  const name = useAuthStore((s) => s.user?.displayName)

  async function save() {
    setMsg('')
    try {
      if (phone) await voiceApi('phone', { body: { phone } })
      await voiceApi('schedule', { body: { days, time, student_name: name, study_plan: buildStudyPlan(plans) || buildOsStudyPlan(goals), secretary_id: secretaryId } })
      setPhone('')
      setMsg('บันทึกแล้ว')
      reload()
    } catch (e) { setMsg(e instanceof VoiceError ? e.thai : 'เกิดข้อผิดพลาด') }
  }

  return (
    <section className="space-y-2">
      <p className="thai-font text-[13px] text-ink-soft">{UI_TEXT.phoneSoon}</p>
      <label className="block thai-font text-[13px] text-ink">{UI_TEXT.phoneLabel}
        <input className={input} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={status.phone || '08x-xxx-xxxx'} />
      </label>
      <p className="thai-font text-[13px] text-ink">{UI_TEXT.scheduleLabel}</p>
      <div className="flex gap-1 flex-wrap">
        {DAY_LABELS.map((d, i) => (
          <button key={d} aria-pressed={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}
            className={`px-btn w-10 h-10 border-2 border-line thai-font text-[13px] ${days.includes(i) ? 'bg-brand-strong text-white' : 'bg-paper text-ink'}`}>{d}</button>
        ))}
      </div>
      <input type="time" className={input} value={time} min="06:00" max="21:59" onChange={(e) => setTime(e.target.value)} />
      <button className={btn} disabled={!days.length} onClick={save}>{UI_TEXT.save}</button>
      {msg && <p role="status" className="thai-font text-[13px] text-ink-soft">{msg}</p>}
    </section>
  )
}

export default function VoiceSecretaryPanel({ hidePhone = false, secretaryId }) {
  const name = useAuthStore((s) => s.user?.displayName) || ''
  const email = useAuthStore((s) => s.user?.email)
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let live = true
    fetchStatus()
      .then((d) => { if (live) { setData(d); setErr('') } })
      .catch((e) => { if (live) setErr(e instanceof VoiceError ? e.thai : 'เกิดข้อผิดพลาด') })
    return () => { live = false }
  }, [tick])

  if (!isCallAllowed(email)) {
    return <p role="alert" className="thai-font text-[13px] text-danger">ระบบโทรของเลขายังไม่เปิดให้ใช้งานกับบัญชีนี้ (ทดสอบภายในเท่านั้น)</p>
  }
  if (err) return <p role="alert" className="thai-font text-[13px] text-danger">{err}</p>
  if (!data) return <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
  if (data.mode === 'off') return <p className="thai-font text-[13px] text-ink-soft">{SECRETARY_NAME}: ฟีเจอร์นี้ยังไม่เปิดให้ใช้งาน</p>

  const st = data.status
  if (!st.consentValid) return <ConsentForm onDone={load} />

  return (
    <div className="space-y-5">
      <CallButton status={st} name={name} secretaryId={secretaryId} />
      {!hidePhone && <PhoneSettings status={st} reload={load} secretaryId={secretaryId} />}
      <section className="flex gap-2 flex-wrap">
        <button className={btn} onClick={async () => { await voiceApi(st.doNotCall ? 'resume' : 'stop'); load() }}>
          {st.doNotCall ? UI_TEXT.resume : UI_TEXT.stop}
        </button>
        <button className={btn} onClick={async () => { await voiceApi('revoke'); load() }}>{UI_TEXT.revoke}</button>
      </section>
      {st.lastPhoneStatus && PHONE_STATUS_ICON[st.lastPhoneStatus] && (
        <img src={`${IMG}${PHONE_STATUS_ICON[st.lastPhoneStatus]}`} alt="" width="32" height="32" className="w-8 h-8 [image-rendering:pixelated]" />
      )}
      {st.doNotCall && <p role="status" className="thai-font text-[13px] text-ink-soft">{UI_TEXT.stopped}</p>}
    </div>
  )
}
