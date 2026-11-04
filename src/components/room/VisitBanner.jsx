import { useVisitStore } from '../../stores/useVisitStore'
import { leaveVisit } from '../../services/visitRoom'
import { Z_HUD } from '../../constants/zIndex'

// Shown while the student is in a friend's room: it is read-only, and this is the way home.
export default function VisitBanner() {
  const visiting = useVisitStore((s) => s.visiting)
  if (!visiting) return null
  return (
    <div className="absolute top-20 inset-x-0 flex justify-center pointer-events-none" style={{ zIndex: Z_HUD }}>
      <div className="px-slab pointer-events-auto px-4 py-2 flex items-center gap-3" role="status">
        <span className="thai-font text-sm text-ink">กำลังเยี่ยมห้องของเพื่อน</span>
        <button type="button" className="px-btn h-10 px-3 text-sm font-bold bg-leaf text-ink" onClick={() => leaveVisit()}>
          กลับห้องของฉัน
        </button>
      </div>
    </div>
  )
}
