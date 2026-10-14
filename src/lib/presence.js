// ============================================================================
// presence.js — RTDB wrapper for live avatar presence in Personal Maps
// ----------------------------------------------------------------------------
// Data path: /worlds/{ownerUid}/maps/{mapKey}/players/{selfUid}
// Mirrors the detach-before-reattach lifecycle of firestoreListener.js.
// Uses RTDB (not Firestore) for low-latency throttled writes and onDisconnect.
// ============================================================================
import { ref, set, remove, get, onValue, onDisconnect } from 'firebase/database'
import { rtdb } from '../firebase'

const UPDATE_INTERVAL_MS = 120
// After this long with an unchanged payload the avatar is flagged `idle: true`
// (one write), then nothing more is sent until it changes again. Departure is
// handled by onDisconnect, so no keep-alive heartbeat is needed.
export const IDLE_AFTER_MS = 60_000

// Per (ownerUid, mapKey, selfUid): { sig, lastWriteMs, changedAtMs, idleSent }
const _selfState = new Map()
let _playersUnsub   = null

function playerRef(ownerUid, mapKey, selfUid) {
  return ref(rtdb, `worlds/${ownerUid}/maps/${mapKey}/players/${selfUid}`)
}

function playersRef(ownerUid, mapKey) {
  return ref(rtdb, `worlds/${ownerUid}/maps/${mapKey}/players`)
}

// One-shot head-count of a room, used to pick a shard before joining.
export async function countPlayers(ownerUid, mapKey, selfUid) {
  const snap = await get(playersRef(ownerUid, mapKey))
  const players = snap.val() ?? {}
  return { total: Object.keys(players).length, hasSelf: selfUid ? selfUid in players : false }
}

// Join a map room: write own player node and register onDisconnect cleanup.
export async function joinWorld(ownerUid, mapKey, selfUid, selfState) {
  const pRef = playerRef(ownerUid, mapKey, selfUid)
  await set(pRef, selfState)
  onDisconnect(pRef).remove()
}

// Leave a map room: cancel onDisconnect and immediately remove own node.
export function leaveWorld(ownerUid, mapKey, selfUid) {
  const pRef = playerRef(ownerUid, mapKey, selfUid)
  onDisconnect(pRef).cancel()
  remove(pRef).catch(() => {})
}

// Subscribe to all players in a map room. Detaches any previous subscription
// before attaching (detach-before-reattach lifecycle).
export function subscribeWorldPlayers(ownerUid, mapKey, cb) {
  if (_playersUnsub) {
    _playersUnsub()
    _playersUnsub = null
  }
  _playersUnsub = onValue(playersRef(ownerUid, mapKey), (snapshot) => {
    cb(snapshot.val() ?? {})
  })
  return () => detachWorldPlayers()
}

// Tear down the active subscription. Exported so it can be called from tests
// and from GameCanvas cleanup.
export function detachWorldPlayers() {
  if (_playersUnsub) {
    _playersUnsub()
    _playersUnsub = null
  }
}

export function _resetThrottleForTest() {
  _selfState.clear()
}

// Positions arrive as floats every frame; round so a standing avatar is
// byte-identical frame to frame.
function signature(p) {
  return JSON.stringify([
    Math.round(p.x ?? 0), Math.round(p.y ?? 0), p.dir, !!p.moving, p.mbti, p.name,
  ])
}

// Throttled, change-only position broadcast. Safe to call from Phaser's
// update() (60 fps). Scoped per (ownerUid, mapKey, selfUid) so concurrent
// rooms / uids never share a clock.
//   - changed payload  -> write at most every UPDATE_INTERVAL_MS
//   - unchanged payload -> no write, except one `idle: true` write after
//     IDLE_AFTER_MS (so AFK users cost ~0 instead of ~8 writes/s)
export function updateSelf(ownerUid, mapKey, selfUid, partial) {
  const key = `${ownerUid}:${mapKey}:${selfUid}`
  const now = Date.now()
  const sig = signature(partial)
  const st = _selfState.get(key)

  if (!st) {
    _selfState.set(key, { sig, lastWriteMs: now, changedAtMs: now, idleSent: false })
    set(playerRef(ownerUid, mapKey, selfUid), partial).catch(() => {})
    return
  }

  if (sig !== st.sig) {
    if (now - st.lastWriteMs < UPDATE_INTERVAL_MS) return   // retry next frame
    st.sig = sig
    st.lastWriteMs = now
    st.changedAtMs = now
    st.idleSent = false
    set(playerRef(ownerUid, mapKey, selfUid), partial).catch(() => {})
    return
  }

  if (!st.idleSent && now - st.changedAtMs >= IDLE_AFTER_MS) {
    st.idleSent = true
    st.lastWriteMs = now
    set(playerRef(ownerUid, mapKey, selfUid), { ...partial, idle: true }).catch(() => {})
  }
}
