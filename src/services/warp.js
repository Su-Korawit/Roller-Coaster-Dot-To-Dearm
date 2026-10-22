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

  if (place.id === 'hub') {
    if (!uid) return { ok: false, error: 'FAILED' }
    const r = await enterSchoolHub(uid)
    if (r.ok) emitGuide('warped')
    return r.ok ? { ok: true } : { ok: false, error: r.error }
  }

  const world = useSchoolWorldStore.getState()
  if (world.inHub) world.setLeft()
  const point = resume ? useResumeStore.getState().points?.[place.mapKey] : null
  const spawnAt = point ? { x: point.x, y: point.y } : null
  // Owner and map key flip together so presence never joins the wrong room.
  if (uid) await returnHome(uid, place.mapKey)
  world.requestMapChange(place.mapKey, { spawnAt })
  emitGuide('warped')
  return { ok: true }
}
