import { useState } from 'react'
import { useAuthStore } from '../stores/useAuthStore'
import { recordConsent } from '../services/consent'
import { LEGAL_PATHS } from '../constants/legal'
import DeleteAccountSheet from './DeleteAccountSheet'

// Blocks the app for a signed-in user who has not accepted the CURRENT Privacy
// Policy and Terms (everyone who signed up before consent existed, and everyone
// after a version bump). It is deliberately not dismissible: the only ways out
// are to accept, sign out, or delete the account.
export default function ConsentGate() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const [terms, setTerms] = useState(false)
  const [age, setAge] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function accept() {
    if (!terms || !age || !user?.uid) return
    setBusy(true)
    setError(null)
    try {
      await recordConsent(user.uid)
    } catch (e) {
      console.error('[consent] record failed:', e?.code ?? e?.message)
      setError('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ขอความยินยอม"
      className="relative h-dvh w-full flex items-center justify-center p-5 thai-font"
      style={{ background: 'linear-gradient(160deg, #0f0824 0%, #1a1035 50%, #0d1f3c 100%)' }}
    >
      <div className="neo-card bg-paper w-full max-w-md p-5 flex flex-col gap-3 text-sm text-ink">
        <h1 className="pixel-font text-[12px] text-brand-strong">ก่อนใช้งานต่อ</h1>
        <p>
          เรามีการปรับนโยบายความเป็นส่วนตัวและข้อกำหนดการใช้งาน กรุณาอ่านและยืนยันเพื่อใช้ I LOVE TCAS ต่อ
        </p>

        <label className="flex items-start gap-2">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
          <span>
            ฉันได้อ่านและยอมรับ{' '}
            <a href={LEGAL_PATHS.terms} target="_blank" rel="noopener noreferrer" className="underline text-brand-strong">ข้อกำหนดการใช้งาน</a>
            {' '}และ{' '}
            <a href={LEGAL_PATHS.privacy} target="_blank" rel="noopener noreferrer" className="underline text-brand-strong">นโยบายความเป็นส่วนตัว</a>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className="mt-1" />
          <span>ฉันอายุ 20 ปีขึ้นไป หรือได้รับความยินยอมจากผู้ปกครองแล้ว</span>
        </label>

        {error && <p role="alert" className="text-xs text-danger">{error}</p>}

        <button
          onClick={accept}
          disabled={!terms || !age || busy}
          className="neo-btn bg-brand text-white py-3 rounded-xl font-semibold disabled:opacity-40"
        >
          {busy ? 'กำลังบันทึก…' : 'ยอมรับและใช้งานต่อ'}
        </button>

        <div className="flex justify-between text-xs">
          <button onClick={() => signOut()} className="underline text-ink/70">ออกจากระบบ</button>
          <button onClick={() => setDeleteOpen(true)} className="underline text-danger">ไม่ยอมรับ ลบบัญชีของฉัน</button>
        </div>
      </div>
      {deleteOpen && <DeleteAccountSheet onClose={() => setDeleteOpen(false)} />}
    </div>
  )
}
