import { useEffect, useRef, useState } from 'react'
import { buildPromptPayQR } from '../../lib/promptpay'
import { shopConfig } from '../../constants/shopConfig'

function formatCountdown(ms) {
  if (ms <= 0) return '00:00'
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function QRPaymentCard({ amount, expiresAt }) {
  const [qrUrl, setQrUrl] = useState(null)
  const [remaining, setRemaining] = useState(() => expiresAt - Date.now())
  const tickRef = useRef(null)

  useEffect(() => {
    buildPromptPayQR(shopConfig.promptPayNumber, amount)
      .then(setQrUrl)
      .catch(() => setQrUrl(null))
  }, [amount])

  useEffect(() => {
    tickRef.current = setInterval(() => setRemaining(expiresAt - Date.now()), 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [expiresAt])

  const expired = remaining <= 0

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className={`relative rounded-xl border-2 border-edge bg-surface p-2 ${expired ? 'opacity-40 grayscale' : ''}`}>
        {qrUrl ? (
          <img src={qrUrl} alt="PromptPay QR" className="h-40 w-40 rounded-lg" />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center">
            <span className="animate-pulse text-3xl">⏳</span>
          </div>
        )}
        {expired && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/85">
            <span className="pixel-font text-[10px] text-danger">EXPIRED</span>
          </div>
        )}
      </div>

      <div className="w-full neo-slab px-3 py-2 text-xs">
        <div className="thai-font flex justify-between text-ink/60">
          <span>PromptPay</span>
          <span className="font-semibold text-ink">{shopConfig.promptPayNumber}</span>
        </div>
        <div className="thai-font mt-1 flex justify-between text-ink/60">
          <span>Merchant</span>
          <span className="font-semibold text-ink">{shopConfig.merchantName}</span>
        </div>
        <div className="mt-1 flex justify-between border-t-2 border-edge/30 pt-1">
          <span className="pixel-font text-[8px] text-ink/60">AMOUNT</span>
          <span className="pixel-font text-[12px] text-accent-pink">{amount} ฿</span>
        </div>
      </div>

      <div className={`pixel-font text-[10px] ${expired ? 'text-danger' : remaining < 60_000 ? 'text-warn' : 'text-brand-strong'}`}>
        {expired ? '⚠ QR EXPIRED' : `⏱ ${formatCountdown(remaining)}`}
      </div>
    </div>
  )
}
