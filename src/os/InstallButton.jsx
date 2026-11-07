import { ExternalLink } from 'lucide-react'
import { useInstallStore } from './installer'

// Install / open button with a download progress bar. Install = download to 100% first, then the
// app lands on Home (see installer.js).
export default function InstallButton({ app, installed, onOpen, big = false }) {
  const percent = useInstallStore((s) => s.progress[app.id])
  const start = useInstallStore((s) => s.start)
  const size = big ? 'py-2.5 text-sm w-full' : 'px-3 py-1 text-xs min-w-[72px]'

  if (percent != null && !installed) {
    return (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`กำลังโหลด ${app.name}`}
        className={`px-btn thai-font font-bold bg-paper relative overflow-hidden ${size}`}
      >
        <span className="absolute inset-y-0 left-0 bg-brand-soft" style={{ width: `${percent}%`, transition: 'width 120ms linear' }} aria-hidden="true" />
        <span className="relative tabular-nums text-brand-strong">กำลังโหลด {percent}%</span>
      </div>
    )
  }

  const label = installed ? (big && app.url ? <><ExternalLink size={16} /> เปิด</> : 'เปิด') : 'ติดตั้ง'
  return (
    <button
      type="button"
      onClick={() => (installed ? onOpen(app) : start(app.id))}
      className={`px-btn thai-font font-bold flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
        ${big ? 'bg-brand-strong text-white' : 'bg-paper'} ${size}`}
    >
      {label}
    </button>
  )
}
