import { useState } from 'react'
import Popup from './ui/Popup'
import PanelHeader from './ui/PanelHeader'
import { useAuthStore } from '../stores/useAuthStore'
import {
  DELETE_CONFIRM_PHRASE, deleteMyAccount, deletionErrorMessage, needsPassword,
} from '../services/accountDeletion'
import { ERASURE_DELETED, ERASURE_KEPT } from '../data/legalContent'

// "Delete my account" — irreversible, so: say exactly what goes and what stays,
// make the person type a phrase, re-authenticate, and only then erase.
// On success the page is fully reloaded so no in-memory store keeps the old
// account's data around.
export default function DeleteAccountSheet({ onClose, onDone }) {
  const user = useAuthStore((s) => s.user)
  const askPassword = needsPassword(user)

  const [phrase, setPhrase] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const phraseOk = phrase.trim() === DELETE_CONFIRM_PHRASE
  const ready = phraseOk && (!askPassword || password.length > 0) && !busy

  async function submit(e) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      await deleteMyAccount({ password })
      if (onDone) onDone()
      else window.location.replace('/')
    } catch (err) {
      console.error('[deleteAccount] failed:', err?.code ?? err?.message)
      setError(deletionErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Popup variant="sheet" size="md" onClose={busy ? undefined : onClose}>
      <PanelHeader title="ลบบัญชี" onClose={busy ? () => {} : onClose} />
      <form onSubmit={submit} className="p-4 flex flex-col gap-3 overflow-y-auto thai-font text-sm text-ink">
        <p className="font-bold text-danger">การลบบัญชีกู้คืนไม่ได้</p>

        <section aria-label="สิ่งที่จะถูกลบ">
          <p className="font-semibold mb-1">สิ่งที่จะถูกลบ</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            {ERASURE_DELETED.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section aria-label="สิ่งที่ยังอยู่">
          <p className="font-semibold mb-1">สิ่งที่ยังอยู่ หรือเราไม่ได้เป็นผู้ลบ</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-ink/80">
            {ERASURE_KEPT.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <label className="flex flex-col gap-1">
          <span className="text-xs">พิมพ์ <strong>{DELETE_CONFIRM_PHRASE}</strong> เพื่อยืนยัน</span>
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            autoComplete="off"
            aria-label="พิมพ์คำยืนยัน"
            className="border-2 border-ink rounded-lg px-3 py-2 bg-surface"
          />
        </label>

        {askPassword ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs">รหัสผ่านของคุณ (เพื่อยืนยันว่าเป็นคุณจริง)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-label="รหัสผ่าน"
              className="border-2 border-ink rounded-lg px-3 py-2 bg-surface"
            />
          </label>
        ) : (
          <p className="text-xs text-ink/70">ระบบจะเปิดหน้าต่าง Google ให้ยืนยันตัวตนอีกครั้งก่อนลบ</p>
        )}

        {error && <p role="alert" className="text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={!ready}
          className="neo-btn bg-danger text-white py-3 rounded-xl font-semibold disabled:opacity-40"
        >
          {busy ? 'กำลังลบข้อมูล…' : 'ลบบัญชีและข้อมูลของฉันถาวร'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="py-2 text-xs underline text-ink/70 disabled:opacity-40"
        >
          ยกเลิก
        </button>
      </form>
    </Popup>
  )
}
