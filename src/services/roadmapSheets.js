import { setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore'
import { auth } from '../firebase'
import { refs, shapes } from '../lib/db'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import { armRoadmapSheetSync } from '../lib/syncManager'
import { SITES } from '../constants/sites'

function myUid() {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('[roadmapSheets] Not authenticated')
  return uid
}

export async function createSheetAndSync(name) {
  const uid = myUid()
  const id = useRoadmapStore.getState().createSheet(name)
  const order = useRoadmapStore.getState().sheets.length - 1
  const sheetDoc = shapes.newRoadmapSheet({ ownerUid: uid, name, order })
  await setDoc(refs.roadmapSheet(id), sheetDoc)
  await updateDoc(refs.user(uid), { roadmapSheetIds: arrayUnion(id) })
  armRoadmapSheetSync(id)
  return id
}

export function switchSheetAndSync(sheetId) {
  useRoadmapStore.getState().switchSheet(sheetId)
  armRoadmapSheetSync(sheetId)
}

export async function renameSheetAndSync(sheetId, name) {
  useRoadmapStore.getState().renameSheet(sheetId, name)
  await updateDoc(refs.roadmapSheet(sheetId), { name })
}

export async function deleteSheetAndSync(sheetId) {
  const uid = myUid()
  const wasActive = useRoadmapStore.getState().activeSheetId === sheetId
  useRoadmapStore.getState().deleteSheet(sheetId)
  await deleteDoc(refs.roadmapSheet(sheetId))
  await updateDoc(refs.user(uid), { roadmapSheetIds: arrayRemove(sheetId) })
  if (wasActive) {
    const newActive = useRoadmapStore.getState().activeSheetId
    if (newActive) armRoadmapSheetSync(newActive)
  }
}

export async function shareSheet(sheetId, targetUid, level) {
  const sheet = useRoadmapStore.getState().sheets.find((s) => s.id === sheetId)
  if (!sheet || sheet.myRole !== 'owner') {
    throw new Error('[roadmapSheets] Only the owner can share a sheet')
  }
  await updateDoc(refs.roadmapSheet(sheetId), {
    [`collaborators.${targetUid}`]: level,
    collaboratorUids: arrayUnion(targetUid),
  })
}

// A shared link always points at the public roadmap subdomain viewer so it
// works for a recipient with no account and no session on this host.
export function buildPublicShareUrl(shareId) {
  return `${SITES.roadmap.path}/view/${shareId}`
}

// Toggling on mints a shareId once (random, not the raw sheetId, to avoid
// enumeration) and reuses it on subsequent enables — turning sharing off
// alone already revokes every outstanding link via the `public` gate in
// firestore.rules, so a fresh id is only needed if the owner wants to
// invalidate one specific leaked link while staying public (not built here —
// see Out of scope).
export async function setSheetPublic(sheetId, isPublic) {
  const sheet = useRoadmapStore.getState().sheets.find((s) => s.id === sheetId)
  if (!sheet || sheet.myRole !== 'owner') {
    throw new Error('[roadmapSheets] Only the owner can toggle public sharing')
  }
  const snap = await getDoc(refs.roadmapSheet(sheetId))
  const existingShareId = snap.exists() ? snap.data().shareId : null
  const shareId = isPublic ? (existingShareId ?? crypto.randomUUID()) : existingShareId
  const patch = { public: isPublic }
  if (isPublic && !existingShareId) patch.shareId = shareId
  await updateDoc(refs.roadmapSheet(sheetId), patch)
  return shareId
}
