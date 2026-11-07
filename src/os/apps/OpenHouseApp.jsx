import { useState } from 'react'
import { ExternalLink, RotateCw } from 'lucide-react'

const SRC = '/openhouse'

// Open House: the walkable campus (faculties of every university, routes in) shown inside the OS
// window. It is the real /openhouse page in a frame, so the game's own stores stay isolated from
// the OS. The page works without sign-in; "เปิดเต็มจอ" opens it in its own tab.
export default function OpenHouseApp() {
  const [rev, setRev] = useState(0)
  return (
    <div className="flex flex-col h-full min-h-[420px]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b-2 border-hairline bg-paper shrink-0">
        <button type="button" onClick={() => setRev((r) => r + 1)} aria-label="โหลดใหม่" className="w-8 h-8 flex items-center justify-center rounded-ui hover:bg-brand-soft">
          <RotateCw size={16} />
        </button>
        <span className="thai-font text-xs text-ink-soft flex-1 truncate">เดินดูคณะและเส้นทางเข้าทุกมหาลัย</span>
        <a href={SRC} target="_blank" rel="noopener noreferrer" className="px-btn px-3 py-1 thai-font text-xs font-bold bg-paper inline-flex items-center gap-1.5">
          <ExternalLink size={14} /> เปิดเต็มจอ
        </a>
      </div>
      <iframe key={rev} src={SRC} title="Open House" className="flex-1 w-full border-0 bg-mist" />
    </div>
  )
}
