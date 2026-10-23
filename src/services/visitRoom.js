// Visiting a friend's study room: read their saved layout, switch the game to the room map with their
// presence room, and go home again. The visitor never writes anything of the owner's: the layout is
// only held in useVisitStore (see its guards in the room stores).
import { getDoc } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import { returnHome } from '../lib/syncManager'
import { STARTER_LAYOUT } from '../room/defaultLayout'
import { useAuthStore } from '../stores/useAuthStore'
import { useRoomStore } from '../stores/useRoomStore'
import { useVisitStore } from '../stores/useVisitStore'
import { useWorldStore } from '../stores/useWorldStore'
import { useSchoolWorldStore } from '../stores/useSchoolWorldStore'

const ROOM_KEY = 'room'

export async function visitRoom(ownerUid) {
  const me = useAuthStore.getState().user?.uid ?? null
  if (!me) return { ok: false, error: 'SIGN_IN' }
  if (typeof ownerUid !== 'string' || !ownerUid) return { ok: false, error: 'FAILED' }
  if (ownerUid === me) return { ok: false, error: 'SELF' }
  if (useSchoolWorldStore.getState().isMapSwitching()) return { ok: false, error: 'BUSY' }

  let layout
  try {
    const snap = await getDoc(refs.room(ownerUid))
    layout = snap.exists() ? shapes.roomLayout(snap.data()) : STARTER_LAYOUT
  } catch {
    return { ok: false, error: 'FAILED' }
  }
  // Items the catalog no longer has cannot be drawn (skipped while the catalog is empty = not seeded).
  const { catalog } = useRoomStore.getState()
  if (Object.keys(catalog).length > 0) layout = { ...layout, placed: layout.placed.filter((p) => catalog[p?.itemId]) }

  const world = useSchoolWorldStore.getState()
  if (world.inHub) world.setLeft()
  useVisitStore.getState().begin({ ownerUid, layout })
  // Owner and map key flip together so presence joins exactly the friend's room.
  useWorldStore.setState({ currentMapOwnerUid: ownerUid, currentMapKey: ROOM_KEY })
  world.requestMapChange(ROOM_KEY, { spawnAt: null })
  world.markMapSwitching()
  return { ok: true }
}

export async function leaveVisit() {
  if (!useVisitStore.getState().visiting) return
  const me = useAuthStore.getState().user?.uid ?? null
  useVisitStore.getState().end()
  if (me) await returnHome(me, ROOM_KEY)
  const world = useSchoolWorldStore.getState()
  world.requestMapChange(ROOM_KEY, { spawnAt: null })
  world.markMapSwitching()
}
