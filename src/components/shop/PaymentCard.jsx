import { useState } from 'react'
import { useShopStore } from '../../stores/useShopStore'
import { useUserStore } from '../../stores/useUserStore'
import { useShopChatStore } from '../../stores/useShopChatStore'
import { slipErrorMessage } from '../../constants/shopMessages'
import { creditForResult } from '../../services/shopCredit'
import PaymentStatusBadge from './PaymentStatusBadge'
import QRPaymentCard from './QRPaymentCard'
import SlipUploadButton from './SlipUploadButton'

export default function PaymentCard({ purchaseId }) {
  const purchase = useShopStore((s) => s.purchases.find((p) => p.id === purchaseId))
  const product = useShopStore((s) => s.products.find((p) => p.id === purchase?.productId))
  const [uploading, setUploading] = useState(false)
  const [localError, setLocalError] = useState(null)

  if (!purchase) return null

  const { status, amount, coins, expiresAt, failReason } = purchase

  const handleUpload = async (file) => {
    // Block a resent slip: ignore uploads once one is in flight or the purchase
    // has left WAITING_PAYMENT. creditForResult is the second line of defence.
    if (status !== 'WAITING_PAYMENT' || uploading) return
    setUploading(true)
    setLocalError(null)
    try {
      const result = await useShopStore.getState().verifyPayment(purchaseId, file)
      if (result.ok) {
        const credited = creditForResult(purchaseId, result)
        if (credited > 0) {
          useUserStore.getState().addCoins(credited)
          useShopChatStore.getState().addSystemMessage(
            'success',
            `✅ ชำระเงินสำเร็จ! ได้รับ +${credited} 🪙`,
          )
        }
      } else {
        const msg = slipErrorMessage(result.reason)
        setLocalError(msg)
        useShopChatStore.getState().addSystemMessage('error', `❌ ${msg}`)
      }
    } catch {
      const msg = slipErrorMessage()
      setLocalError(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full max-w-xs rounded-2xl border-2 border-brand bg-white shadow-[4px_4px_0_0_#a78bda]">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl bg-brand/10 px-4 py-3">
        <div>
          <p className="pixel-font text-[9px] text-ink/50">สั่งซื้อ</p>
          <p className="thai-font text-sm font-semibold text-ink">
            {product?.name ?? 'แพ็คเกจเหรียญ'}
          </p>
        </div>
        <PaymentStatusBadge status={status} />
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {/* Coin + price summary */}
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <span className="thai-font text-sm text-ink/70">
            🪙 {coins} เหรียญ
          </span>
          <span className="pixel-font text-[14px] font-bold text-accent-pink">{amount} ฿</span>
        </div>

        {/* WAITING_PAYMENT: show QR (hidden once a slip is in flight) */}
        {status === 'WAITING_PAYMENT' && !uploading && (
          <>
            <QRPaymentCard amount={amount} expiresAt={expiresAt} />
            <div className="border-t border-gray-100 pt-3">
              <p className="thai-font mb-2 text-xs text-ink/60">
                ชำระเงินแล้ว? อัปโหลดสลิปเพื่อยืนยัน
              </p>
              <SlipUploadButton onUpload={handleUpload} disabled={uploading} />
            </div>
          </>
        )}

        {/* VERIFYING spinner */}
        {(status === 'VERIFYING' || uploading) && (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="animate-spin text-2xl">⏳</span>
            <p className="pixel-font text-[9px] text-brand-strong">VERIFYING SLIP...</p>
          </div>
        )}

        {/* FAILED reason */}
        {status === 'FAILED' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="thai-font text-xs text-rose-700">
              ❌ {slipErrorMessage(failReason)}
            </p>
          </div>
        )}

        {/* SUCCESS */}
        {status === 'SUCCESS' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="thai-font text-xs text-emerald-700">
              ✅ ชำระเงินสำเร็จ! ได้รับ +{coins} 🪙 เหรียญแล้ว
            </p>
          </div>
        )}

        {/* EXPIRED */}
        {status === 'EXPIRED' && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="thai-font text-xs text-gray-600">⏰ คำสั่งซื้อหมดอายุแล้ว</p>
          </div>
        )}

        {/* Local upload error (before server updates status) */}
        {localError && status !== 'FAILED' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="thai-font text-xs text-rose-700">❌ {localError}</p>
          </div>
        )}
      </div>
    </div>
  )
}
