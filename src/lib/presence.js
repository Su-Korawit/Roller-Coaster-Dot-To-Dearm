// ============================================================================
// presence.js — RTDB wrapper for live avatar presence in Personal Maps
// ----------------------------------------------------------------------------
// Data path: /worlds/{ownerUid}/maps/{mapKey}/players/{selfUid}
// Mirrors the detach-before-reattach lifecycle of firestoreListener.js.
// Uses RTDB (not Firestore) for low-latency throttled writes and onDisconnect.
// ============================================================================
import { ref, set, remove, onValue, onDisconnect } from 'firebase/database'
import { rtdb } from '../firebase'

const UPDATE_INTERVAL_MS = 120

let _lastUpdateMs   = 0
let _playersUnsub   = null

function playerRef(ownerUid, mapKey, selfUid) {
  return ref(rtdb, `worlds/${ownerUid}/maps/${mapKey}/players/${selfUid}`)
}

function playersRef(ownerUid, mapKey) {
  return ref(rtdb, `worlds/${ownerUid}/maps/${mapKey}/players`)
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
  _lastUpdateMs = 0
}

// Throttled position broadcast. Safe to call from Phaser's update() (60 fps).
export function updateSelf(ownerUid, mapKey, selfUid, partial) {
  const now = Date.now()
  if (now - _lastUpdateMs < UPDATE_INTERVAL_MS) return
  _lastUpdateMs = now
  set(playerRef(ownerUid, mapKey, selfUid), partial).catch(() => {})
}
