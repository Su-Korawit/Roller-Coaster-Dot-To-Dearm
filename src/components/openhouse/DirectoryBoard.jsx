import { useState } from 'react'
import Popup from '../ui/Popup'
import { BUILDINGS, ZONES } from '../../constants/openHouseBuildings'
import { placementOf, doorTile } from '../../game/campusLayout'
import { useOpenHouseUiStore } from '../../stores/useOpenHouseUiStore'

const ZONE_ORDER = Object.keys(ZONES)

// Panorama of the campus above the list (original pixel art); hidden if the picture is missing.
function CampusHeader() {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src="/assets/os/openhouse/campus-header.webp"
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className="w-full aspect-[3/1] object-cover rounded-ui border-2 border-line-soft"
    />
  )
}

// The directory board at the central hall: every faculty by zone, with "เดินไป" (auto-walk to the
// door, board closes) and "ดูเส้นทาง" (opens the faculty popup right away).
export default function DirectoryBoard({ onClose }) {
  const walkTo = useOpenHouseUiStore((s) => s.walkTo)
  const openBuilding = useOpenHouseUiStore((s) => s.openBuilding)

  return (
    <Popup variant="sheet" size="lg" onClose={onClose}>
      <div className="p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="flex items-center gap-3">
          <h2 className="pixel-font text-lg text-ink flex-1">แผนที่มหาวิทยาลัย</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="px-btn h-9 px-3 text-sm font-bold bg-paper text-ink">ปิด</button>
        </div>
        <CampusHeader />
        {ZONE_ORDER.map((zoneId) => {
          const zone = ZONES[zoneId]
          const list = BUILDINGS.filter((b) => b.zone === zoneId)
          return (
            <section key={zoneId} aria-label={zone.nameTh} className="flex flex-col gap-2">
              <h3 className="thai-font text-sm font-bold text-ink flex items-center gap-2">
                <i className="w-3 h-3 border-2 border-line rounded-sm inline-block" style={{ background: zone.color }} aria-hidden="true" />
                {zone.nameTh}
              </h3>
              <ul className="flex flex-col gap-2">
                {list.map((b) => (
                  <li key={b.id} className="px-slab p-3 flex items-center gap-2" style={{ background: zone.soft }}>
                    <span className="thai-font text-sm font-bold text-ink flex-1 min-w-0">{b.nameTh}</span>
                    <button
                      type="button"
                      aria-label={`เดินไป${b.nameTh}`}
                      onClick={() => { const d = doorTile(placementOf(b.id)); walkTo(d.x, d.y); onClose() }}
                      className="px-btn h-9 px-3 text-xs font-bold bg-paper text-ink"
                    >
                      เดินไป
                    </button>
                    <button
                      type="button"
                      aria-label={`ดูเส้นทางเข้า${b.nameTh}`}
                      onClick={() => openBuilding(b.id)}
                      className="px-btn h-9 px-3 text-xs font-bold bg-leaf text-ink"
                    >
                      ดูเส้นทาง
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </Popup>
  )
}
