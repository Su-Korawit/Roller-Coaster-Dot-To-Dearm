// Moving the player between places. The room and the campus are plain map switches (through the
// same GameCanvas path portals use); the School Hub goes through enterSchoolHub because it first
// has to pick the student's room. Resolves to { ok: true } or { ok: false, error }.
import { WARP_PLACES } from '../constants/warpPlaces'
import { enterSchoolHub } from './schoolWorld'
import { returnHome } from '../lib/syncManager'
import { emitGuide } from '../lib/guideEvents'
import { useAuthStore } from '../stores/useAuthStore'
import { useResumeStore } from '../stores/useResumeStore'
import { useSchoolWorldStore } from '../stores/useSchoolWorldStore'

export async function warpTo(placeId, { resume = true } = {}) {
  const place = WARP_PLACES.find((p) => p.id === placeId)
  const uid = useAuthStore.getState().user?.uid ?? null
  if (!place) return { ok: false, error: 'FAILED' }
  // A second warp while the first map is still loading would flip owner/map-key state for a
  // scene that never switches (GameCanvas ignores requests during a switch).
  if (useSchoolWorldStore.getState().isMapSwitching()) return { ok: false, error: 'BUSY' }

  if (place.id === 'hub') {
    if (!uid) return { ok: false, error: 'FAILED' }
    const r = await enterSchoolHub(uid)
    if (r.ok) {
      useSchoolWorldStore.getState().markMapSwitching()
      emitGuide('warped')
    }
    return r.ok ? { ok: true } : { ok: false, error: r.error }
  }

  const world = useSchoolWorldStore.getState()
  if (world.inHub) world.setLeft()
  const point = resume ? useResumeStore.getState().points?.[place.mapKey] : null
  const spawnAt = point ? { x: point.x, y: point.y } : null
  // Owner and map key flip together so presence never joins the wrong room.
  if (uid) await returnHome(uid, place.mapKey)
  world.requestMapChange(place.mapKey, { spawnAt })
  world.markMapSwitching()
  emitGuide('warped')
  return { ok: true }
}
