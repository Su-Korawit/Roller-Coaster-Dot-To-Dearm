const TEXT = {
  idle: '',
  pending: 'กำลังรอบันทึก…',
  saving: 'กำลังบันทึก…',
  saved: 'บันทึกแล้ว',
}

export default function SaveStatus({ status, onRetry }) {
  if (status === 'error') {
    return (
      <div role="alert" className="flex items-center gap-2 text-sm font-bold text-ink bg-warn rounded-slot px-3 py-1">
        <p>บันทึกไม่สำเร็จ ลองใหม่</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="underline">ลองบันทึกอีกครั้ง</button>
        )}
      </div>
    )
  }
  return <p aria-live="polite" className="text-sm text-ink-soft">{TEXT[status] ?? ''}</p>
}
