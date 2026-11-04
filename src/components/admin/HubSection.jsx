import { useEffect, useState } from 'react'
import { getDoc, setDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { refs } from '../../lib/db'
import { isValidOpenChatUrl } from '../../content/hubConfig'
import { useToast } from './Toast'

const FIELD = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm'
const LABEL = 'flex flex-col gap-1 text-sm font-semibold text-ink'
const EMPTY = { lineOpenChatUrl: '', lineRules: '', lineModerators: '', featuredSlug: '', openHouseEnabled: false }

function Settings() {
  const toast = useToast()
  const [values, setValues] = useState(null)
  const [urlError, setUrlError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    getDoc(refs.siteConfigHub())
      .then((snap) => {
        if (alive) setValues({ ...EMPTY, ...(snap.exists() ? snap.data() : {}) })
      })
      .catch((e) => {
        console.error('[HubSection] loading settings failed:', e)
        if (alive) setValues({ ...EMPTY })
      })
    return () => { alive = false }
  }, [])

  if (!values) return <p className="text-sm text-ink-soft">กำลังโหลด…</p>
  const set = (patch) => setValues((v) => ({ ...v, ...patch }))

  const save = async () => {
    if (!isValidOpenChatUrl(values.lineOpenChatUrl)) {
      setUrlError('ลิงก์ต้องขึ้นต้นด้วย https://line.me/')
      return
    }
    setUrlError('')
    setSaving(true)
    try {
      await setDoc(
        refs.siteConfigHub(),
        {
          lineOpenChatUrl: values.lineOpenChatUrl.trim(),
          lineRules: values.lineRules,
          lineModerators: values.lineModerators,
          featuredSlug: values.featuredSlug.trim(),
          openHouseEnabled: values.openHouseEnabled === true,
        },
        { merge: true },
      )
      toast.success?.('บันทึกการตั้งค่าแล้ว')
    } catch (e) {
      console.error('[HubSection] save failed:', e)
      toast.error?.('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-ink">ตั้งค่าเว็บไซต์คอนเทนต์</h2>
      <label className={LABEL}>
        ลิงก์ LINE OpenChat
        <input className={FIELD} value={values.lineOpenChatUrl} onChange={(e) => set({ lineOpenChatUrl: e.target.value })} />
      </label>
      {urlError && <p role="alert" className="text-sm text-rose-600">{urlError}</p>}
      <label className={LABEL}>
        กติกาห้อง
        <textarea className={FIELD} rows={2} value={values.lineRules} onChange={(e) => set({ lineRules: e.target.value })} />
      </label>
      <label className={LABEL}>
        ผู้ดูแลห้อง
        <input className={FIELD} value={values.lineModerators} onChange={(e) => set({ lineModerators: e.target.value })} />
      </label>
      <label className={LABEL}>
        บทความเด่น (slug)
        <input className={FIELD} value={values.featuredSlug} onChange={(e) => set({ featuredSlug: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input type="checkbox" checked={values.openHouseEnabled === true} onChange={(e) => set({ openHouseEnabled: e.target.checked })} />
        เปิดแผนที่ Open House
      </label>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="bg-brand text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        บันทึกการตั้งค่า
      </button>
    </section>
  )
}

const ERRORS = {
  'not-found': 'ไม่พบบัญชีที่ใช้อีเมลนี้ ผู้เขียนต้องสมัครในแอปก่อน',
  'permission-denied': 'เฉพาะผู้ดูแลระบบหลักเท่านั้นที่ให้สิทธิ์ได้',
}

function CreatorAccess() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)

  const run = async (revoke) => {
    const value = email.trim()
    if (!value) {
      setResult({ error: true, text: 'ใส่อีเมลก่อน' })
      return
    }
    try {
      const payload = revoke ? { email: value, revoke: true } : { email: value }
      await httpsCallable(getFunctions(), 'grantCreatorRole')(payload)
      setResult({
        error: false,
        text: revoke
          ? 'เพิกถอนสิทธิ์เขียนบทความแล้ว'
          : 'ให้สิทธิ์เขียนบทความแล้ว (ผู้ใช้ต้องกดรีเฟรชสิทธิ์ในสตูดิโอ หรือเข้าสู่ระบบใหม่)',
      })
    } catch (e) {
      const code = String(e?.code ?? '').replace('functions/', '')
      setResult({ error: true, text: ERRORS[code] ?? 'ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง' })
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-ink">สิทธิ์ผู้เขียนบทความ</h2>
      <label className={LABEL}>
        อีเมลผู้เขียน
        <input className={FIELD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => run(false)} className="bg-brand text-white rounded px-4 py-2 text-sm font-semibold">
          ให้สิทธิ์
        </button>
        <button type="button" onClick={() => run(true)} className="border border-gray-300 rounded px-4 py-2 text-sm font-semibold">
          เพิกถอน
        </button>
      </div>
      {result && (
        <p role={result.error ? 'alert' : 'status'} className={`text-sm ${result.error ? 'text-rose-600' : 'text-ink'}`}>
          {result.text}
        </p>
      )}
    </section>
  )
}

export default function HubSection() {
  return (
    <div className="space-y-10">
      <Settings />
      <CreatorAccess />
    </div>
  )
}
