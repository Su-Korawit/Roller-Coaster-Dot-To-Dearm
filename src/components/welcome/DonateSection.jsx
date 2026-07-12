import { useEffect, useState } from 'react'
import { buildPromptPayQR } from '../../lib/promptpay'
import { shopConfig } from '../../constants/shopConfig'
import Popup from '../ui/Popup'

const SUGGESTED = 100 // default amount; donor can overpay/underpay when scanning

export default function DonateSection() {
  const [open, setOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState(null)

  useEffect(() => {
    if (!open) return
    buildPromptPayQR(shopConfig.promptPayNumber, SUGGESTED)
      .then(setQrUrl)
      .catch(() => setQrUrl(null))
  }, [open])

  return (
    <section className="px-6 py-14 text-center">
      <h2 className="pixel-font text-sm md:text-lg text-ink mb-3">SUPPORT US</h2>
      <p className="thai-font mx-auto mb-6 max-w-md text-sm text-ink/70">
        ถ้าชอบโปรเจกต์นี้ สนับสนุนผ่าน PromptPay ได้ ขอบคุณมากครับ
      </p>
      <button
        onClick={() => setOpen(true)}
        className="neo-btn pixel-font text-[10px] text-white rounded-2xl bg-accent-pink px-6 py-4 min-h-11"
      >
        ♥ DONATE
      </button>

      {open && (
        <Popup variant="center" size="sm" onClose={() => setOpen(false)}>
          <div className="neo-card p-6" role="dialog" aria-modal="true" aria-label="บริจาคผ่าน PromptPay">
            <p className="pixel-font text-[10px] text-ink mb-4">PROMPTPAY</p>
            <div className="flex justify-center">
              {qrUrl ? (
                <img src={qrUrl} alt="PromptPay QR" className="h-52 w-52 rounded-lg border-2 border-brand p-2" />
              ) : (
                <div className="flex h-52 w-52 items-center justify-center text-3xl">⏳</div>
              )}
            </div>
            <div className="thai-font mt-4 text-sm text-ink/70">
              {shopConfig.merchantName} · {shopConfig.promptPayNumber}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="thai-font mt-5 w-full rounded-2xl border-2 border-ink py-3 text-sm font-bold text-ink"
            >
              ปิด
            </button>
          </div>
        </Popup>
      )}
    </section>
  )
}
