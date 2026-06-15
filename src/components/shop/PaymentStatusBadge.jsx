const STYLES = {
  WAITING_PAYMENT: { label: 'WAITING', className: 'bg-amber-100 text-amber-800 border-amber-500' },
  VERIFYING: { label: 'VERIFYING', className: 'bg-blue-100 text-blue-800 border-blue-500' },
  SUCCESS: { label: 'SUCCESS', className: 'bg-emerald-100 text-emerald-800 border-emerald-600' },
  FAILED: { label: 'FAILED', className: 'bg-rose-100 text-rose-800 border-rose-500' },
  EXPIRED: { label: 'EXPIRED', className: 'bg-gray-200 text-gray-700 border-gray-500' },
}

export default function PaymentStatusBadge({ status }) {
  const { label, className } = STYLES[status] ?? STYLES.WAITING_PAYMENT
  return (
    <span className={`pixel-font inline-block rounded-md border-2 px-2 py-1 text-[8px] leading-none ${className}`}>
      {label}
    </span>
  )
}
