import { useState } from 'react'
import Popup from '../ui/Popup'
import AtlasIcon from '../ui/AtlasIcon'
import { availablePlaces, WARP_ERRORS } from '../../constants/warpPlaces'
import { DEFAULT_MAP_CONFIGS } from '../../utils/mapConfig'
import { warpTo } from '../../services/warp'
import { useAuthStore } from '../../stores/useAuthStore'
import { useWorldStore } from '../../stores/useWorldStore'
import { useResumeStore } from '../../stores/useResumeStore'
import { useSchoolWorldStore } from '../../stores/useSchoolWorldStore'

const hasMap = (key) => key in DEFAULT_MAP_CONFIGS

// Pick a place to go to. "ไปต่อ" resumes where the player last stood there; "ไปจุดเริ่มต้น" uses
// the map's spawn. Both are plain buttons so the sheet works with a keyboard and on touch.
export default function WarpSheet({ onClose }) {
  const signedIn = useAuthStore((s) => !!s.user)
  const currentMapKey = useWorldStore((s) => s.currentMapKey)
  const inHub = useSchoolWorldStore((s) => s.inHub)
  const points = useResumeStore((s) => s.points)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const places = availablePlaces({ hasMap, signedIn })

  const go = async (place, resume) => {
    setBusy(place.id)
    setError(null)
    const r = await warpTo(place.id, { resume })
    setBusy(null)
    if (r.ok) onClose()
    else setError(WARP_ERRORS[r.error] ?? WARP_ERRORS.FAILED)
  }

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div className="p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        <h2 className="pixel-font text-lg text-ink">วาร์ป</h2>
        {error && <p role="alert" className="thai-font text-sm text-danger">{error}</p>}
        <ul className="flex flex-col gap-3">
          {places.map((place) => {
            const here = place.id === 'hub' ? inHub : !inHub && currentMapKey === place.mapKey
            const last = points?.[place.mapKey]
            return (
              <li key={place.id} className="px-slab p-3 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <AtlasIcon name="warp" scale={2} />
                  <div className="min-w-0 flex-1">
                    <p className="thai-font text-sm font-bold text-ink truncate">{place.labelTh}</p>
                    {here && <p className="text-xs text-ink-soft">ที่นี่</p>}
                    {!here && last?.label && <p className="text-xs text-ink-soft">{`ล่าสุด: ${last.label}`}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={here || busy !== null}
                    onClick={() => go(place, true)}
                    className="px-btn h-11 px-4 text-sm font-bold bg-leaf text-ink flex-1 disabled:opacity-50"
                  >
                    {place.id === 'hub' ? 'เข้าโรงเรียน' : 'ไปต่อ'}
                  </button>
                  {place.id !== 'hub' && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => go(place, false)}
                      className="px-btn h-11 px-4 text-sm font-bold bg-paper text-ink"
                    >
                      ไปจุดเริ่มต้น
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Popup>
  )
}
