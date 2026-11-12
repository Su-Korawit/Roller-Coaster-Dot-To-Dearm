import { useState } from 'react'
import { needsConsent, setConsent, trackView } from '../lib/track'

// One-line cookie/analytics notice. Declining is as easy as accepting (PDPA); nothing is
// measured before a yes.
export default function AnalyticsConsent() {
  const [open, setOpen] = useState(() => needsConsent())
  if (!open) return null
  const answer = (yes) => {
    setConsent(yes)
    setOpen(false)
    if (yes) trackView(window.location.pathname)
  }
  return (
    <div role="dialog" aria-label="ความเป็นส่วนตัว" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md px-card bg-paper text-ink p-3 flex flex-col gap-2 thai-font">
      <p className="text-xs">
        เราใช้คุกกี้แบบไม่ระบุตัวตนเพื่อนับจำนวนผู้เข้าชมและดูว่าแอปไหนถูกใช้บ่อย เพื่อปรับปรุงเว็บ ไม่เก็บชื่อหรืออีเมลของคุณ{' '}
        <a href="/privacy" className="underline font-semibold">นโยบายความเป็นส่วนตัว</a>
      </p>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => answer(false)} className="px-btn px-3 py-1.5 text-xs font-bold bg-paper">ไม่ยินยอม</button>
        <button type="button" onClick={() => answer(true)} className="px-btn px-3 py-1.5 text-xs font-bold bg-brand-strong text-white">ยินยอม</button>
      </div>
    </div>
  )
}
