// Orchestration for the School Server (ADR 0018): entering/leaving the shared
// school_hub map and running Focus sessions. UI lives in
// components/school/world/*; this file is the only place that touches the world
// store, the room resolver and the Focus callables together.
import { getDoc } from 'firebase/firestore'
import { refs } from '../lib/db'
import { chooseRoom, SCHOOL_HUB_MAP_KEY } from '../lib/schoolRoom'
import { useWorldStore } from '../stores/useWorldStore'
import { useFarmStore } from '../stores/useFarmStore'
import { useSchoolWorldStore } from '../stores/useSchoolWorldStore'
import { returnHome } from '../lib/syncManager'
import { startFocus, checkInFocus, endFocus } from './focus'

const world = () => useSchoolWorldStore.getState()

// Put the user in their school's room (or the shared commons room while the
// school is under the member threshold) and ask the game to load school_hub.
// Resolves to { ok:true, room } or { ok:false, error }.
export async function enterSchoolHub(uid) {
  if (!uid) return { ok: false, error: 'FAILED' }
  world().setEntering()
  try {
    const userSnap = await getDoc(refs.user(uid))
    const schoolId = userSnap.exists() ? userSnap.data().schoolId ?? null : null
    if (!schoolId) {
      world().setEnterError('NO_SCHOOL')
      return { ok: false, error: 'NO_SCHOOL' }
    }
    const schoolSnap = await getDoc(refs.school(schoolId))
    const memberCount = schoolSnap.exists() ? schoolSnap.data().memberCount ?? 0 : 0

    const room = await chooseRoom({ schoolId, memberCount, selfUid: uid })
    if (room.full) {
      world().setEnterError('ROOM_FULL')
      return { ok: false, error: 'ROOM_FULL' }
    }

    // Owner + map key flip together so presence joins exactly one room.
    useWorldStore.setState({
      currentMapOwnerUid: room.ownerUid, currentMapKey: room.mapKey,
      objectsByMap: {}, mapObjects: [], editMode: false,
    })
    useFarmStore.setState({ plotsByMap: {}, plots: {} })
    world().setEntered({ kind: room.kind, shard: room.shard, ownerUid: room.ownerUid, schoolId })
    world().requestMapChange(SCHOOL_HUB_MAP_KEY)
    return { ok: true, room }
  } catch (e) {
    console.error('[schoolWorld] enter failed:', e)
    world().setEnterError('FAILED')
    return { ok: false, error: 'FAILED' }
  }
}

// Back to the student's own world. The game falls back to its entry map.
export async function leaveSchoolHub(uid) {
  const key = world().entryMapKey ?? 'test3'
  world().setLeft()
  // returnHome flips owner + map key atomically (sync part), then the game loads the map.
  const home = uid ? returnHome(uid, key) : Promise.resolve()
  world().requestMapChange(key)
  await home
}

// ── Focus ────────────────────────────────────────────────────────────────────
// Every call below is a thin shell around a server callable: the server owns
// time, credit and XP; we only mirror its answer into the store for the HUD.

async function runFocus(action, apply) {
  const { focus, setFocus } = world()
  if (focus.busy) return null
  setFocus({ busy: true, error: null })
  try {
    const r = await action()
    apply(r)
    return r
  } catch (e) {
    setFocus({ error: e?.message ?? 'FOCUS_FAILED' })
    return null
  } finally {
    world().setFocus({ busy: false })
  }
}

export const beginFocus = () =>
  runFocus(startFocus, (r) => world().setFocus({
    status: 'active', startedAt: r.startedAt, lastCheckInAt: r.lastCheckInAt,
    verifiedMs: r.verifiedMs ?? 0, lastResult: r, temperament: r.temperament ?? null,
    xpThisSession: r.resumed ? world().focus.xpThisSession : 0,
  }))

export const confirmFocus = () =>
  runFocus(checkInFocus, (r) => world().setFocus({
    lastCheckInAt: r.lastCheckInAt, verifiedMs: r.verifiedMs, lastResult: r,
    xpThisSession: world().focus.xpThisSession + (r.xpGained ?? 0),
  }))

export const finishFocus = () =>
  runFocus(endFocus, (r) => world().setFocus({
    status: 'idle', lastResult: r, verifiedMs: r.verifiedMs, lastCheckInAt: null, startedAt: null,
    xpThisSession: world().focus.xpThisSession + (r.xpGained ?? 0),
  }))
