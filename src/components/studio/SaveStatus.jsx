const TEXT = {
  idle: '',
  pending: 'กำลังรอบันทึก…',
  saving: 'กำลังบันทึก…',
  saved: 'บันทึกแล้ว',
}

export default function SaveStatus({ status }) {
  if (status === 'error') {
    return <p role="alert" className="text-sm font-bold text-ink bg-warn rounded-slot px-3 py-1">บันทึกไม่สำเร็จ ลองใหม่</p>
  }
  return <p aria-live="polite" className="text-sm text-ink-soft">{TEXT[status] ?? ''}</p>
}
