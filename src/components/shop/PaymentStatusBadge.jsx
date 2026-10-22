const STYLES = {
  WAITING_PAYMENT: { label: 'WAITING', className: 'bg-warn/10 text-warn border-warn' },
  VERIFYING: { label: 'VERIFYING', className: 'bg-brand-soft text-brand-strong border-brand' },
  SUCCESS: { label: 'SUCCESS', className: 'bg-good/10 text-good border-good' },
  FAILED: { label: 'FAILED', className: 'bg-danger/10 text-danger border-danger' },
  EXPIRED: { label: 'EXPIRED', className: 'bg-paper text-ink-soft border-ink/30' },
}

export default function PaymentStatusBadge({ status }) {
  const { label, className } = STYLES[status] ?? STYLES.WAITING_PAYMENT
  return (
    <span className={`pixel-font inline-block rounded-md border-2 px-2 py-1 text-xs leading-none ${className}`}>
      {label}
    </span>
  )
}
