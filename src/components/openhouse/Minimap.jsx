import { BUILDING_BY_ID } from '../../constants/openHouseBuildings'
import { MAP, HALL, SPAWN, minimapRects, placementOf, doorTile } from '../../game/campusLayout'
import { useOpenHouseUiStore } from '../../stores/useOpenHouseUiStore'
import { Z_HUD } from '../../constants/zIndex'

// Width follows the screen (a phone must not lose a third of the map to it); the aspect is the map's.
const WIDTH = 'clamp(110px, 24vw, 190px)'
const pct = (v, total) => `${(v / total) * 100}%`

// Top-right minimap drawn from the layout table. Every faculty is a real button: tapping it walks
// the avatar to that door (auto-walk); tapping the lawn walks to that spot.
export default function Minimap() {
  const walkTo = useOpenHouseUiStore((s) => s.walkTo)

  const onBackdrop = (e) => {
    if (e.target !== e.currentTarget) return
    const box = e.currentTarget.getBoundingClientRect()
    walkTo(Math.floor(((e.clientX - box.left) / box.width) * MAP.w), Math.floor(((e.clientY - box.top) / box.height) * MAP.h))
  }

  return (
    <nav aria-label="แผนที่มหาวิทยาลัย" className="absolute top-3 right-3 px-slab p-1.5" style={{ zIndex: Z_HUD }}>
      <div
        className="relative bg-zone-earth-soft border-2 border-line rounded-ui overflow-hidden cursor-pointer"
        style={{ width: WIDTH, aspectRatio: `${MAP.w} / ${MAP.h}` }}
        onClick={onBackdrop}
      >
        {/* lake and avenue, for orientation */}
        <i className="absolute inset-x-0 bottom-0 bg-zone-sci-soft pointer-events-none" style={{ height: pct(MAP.h - 69, MAP.h) }} />
        <i className="absolute bg-hairline pointer-events-none" style={{ left: pct(44, MAP.w), width: pct(13, MAP.w), top: pct(20, MAP.h), height: pct(49, MAP.h) }} />
        {minimapRects().map((r) => (
          <button
            key={r.id}
            type="button"
            aria-label={`เดินไป${BUILDING_BY_ID[r.id].nameTh}`}
            title={BUILDING_BY_ID[r.id].nameTh}
            onClick={(e) => {
              e.stopPropagation()
              const d = doorTile(placementOf(r.id))
              walkTo(d.x, d.y)
            }}
            className="absolute border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            style={{ left: pct(r.x, MAP.w), top: pct(r.y, MAP.h), width: pct(r.w, MAP.w), height: pct(r.h, MAP.h), background: r.color }}
          />
        ))}
        <button
          type="button"
          aria-label="เดินไปหอกลาง"
          onClick={(e) => { e.stopPropagation(); const d = doorTile(HALL); walkTo(d.x, d.y) }}
          className="absolute border border-line bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          style={{ left: pct(HALL.x, MAP.w), top: pct(HALL.y, MAP.h), width: pct(6, MAP.w), height: pct(5, MAP.h) }}
        />
        <button
          type="button"
          aria-label="เดินไปทางเข้า"
          onClick={(e) => { e.stopPropagation(); walkTo(SPAWN.tx, SPAWN.ty - 8) }}
          className="absolute w-2 h-2 rounded-full bg-ink"
          style={{ left: pct(SPAWN.tx - 1, MAP.w), top: pct(SPAWN.ty - 8, MAP.h) }}
        />
      </div>
    </nav>
  )
}
