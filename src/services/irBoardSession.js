import { getDoc, setDoc } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import { IR_SHEET_ID } from '../constants/irBoard'
import { ADMIN_UID } from '../constants/admin'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import { armRoadmapSheetSync, disarmRoadmapSheetSync, hasPendingRoadmapSheetSync } from '../lib/syncManager'
import { createFirestoreListener } from '../lib/firestoreListener'

export async function ensureIrBoardDoc() {
  const ref = refs.roadmapSheet(IR_SHEET_ID)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()
  const data = shapes.newRoadmapSheet({
    ownerUid: ADMIN_UID,
    name: 'IR Board',
    nodes: [],
    edges: [],
    order: -1,
  })
  await setDoc(ref, data)
  return data
}

// Overlapping mount/unmount pairs happen in dev (React StrictMode runs the IR
// tab effect twice, so two mounts race the same await). Only the newest mount
// may hydrate the store, and only that mount's token may later restore it —
// otherwise a stale unmount could re-arm the user's sheet sync while the
// visible board still edits the IR sheet.
let mountSeq = 0
let liveToken = null

// admin-idea-board is the ONLY roadmapSheets doc a live browser session and
// scripts/irReport.mjs (Claude Code/Cursor's iloveskill workflow) can write
// concurrently — every other Roadmap sheet is per-user and the script never
// touches it. roadmapSheetSync is otherwise a one-shot hydrate + a
// 1s-debounced write with no listener (CLAUDE.md: debounced writes only) —
// this real-time listener is scoped to that single document so an admin's
// open IR tab picks up a script's append/status write live instead of only
// on the next remount, and so the browser's own next debounced write carries
// the script's change forward instead of blindly overwriting it.
const irListener = createFirestoreListener()

export async function mountIrBoard() {
  const prev = useRoadmapStore.getState()
  const token = {
    seq: ++mountSeq,
    sheets: prev.sheets,
    activeSheetId: prev.activeSheetId,
  }
  disarmRoadmapSheetSync()
  let data
  try {
    data = await ensureIrBoardDoc()
  } catch (err) {
    if (token.seq === mountSeq && token.activeSheetId) armRoadmapSheetSync(token.activeSheetId)
    throw err
  }
  if (token.seq !== mountSeq) return token
  const irSheet = {
    id: IR_SHEET_ID,
    name: data.name ?? 'IR Board',
    nodes: data.nodes ?? [],
    edges: data.edges ?? [],
    timeline: data.timeline ?? null,
    ownerUid: data.ownerUid ?? ADMIN_UID,
    myRole: 'edit',
  }
  const sheets = [
    ...token.sheets.filter((s) => s.id !== IR_SHEET_ID),
    irSheet,
  ]
  useRoadmapStore.getState().hydrateSheets(sheets, IR_SHEET_ID)
  useRoadmapStore.setState({ irReturnSheetId: token.activeSheetId })
  armRoadmapSheetSync(IR_SHEET_ID)
  liveToken = token

  // Skip the local echo of our own pending write (hasPendingWrites) so this
  // never races the admin's own debounced save; only apply a snapshot while
  // this mount is still the live one and the IR sheet is still the one open.
  // hasPendingWrites alone isn't enough: every debounced save writes
  // updatedAt: serverTimestamp(), so its ack arrives as a second, genuinely
  // non-pending snapshot shortly after — but if the admin typed more in that
  // round-trip window, that keystroke is sitting in a NEW (not yet fired)
  // debounce timer, invisible to Firestore. Applying the ack here would blow
  // it away. hasPendingRoadmapSheetSync() covers exactly that window: an
  // armed debounce timer means the store is already ahead of this snapshot.
  irListener.attach(refs.roadmapSheet(IR_SHEET_ID), (snap) => {
    if (token.seq !== mountSeq || snap.metadata.hasPendingWrites) return
    if (useRoadmapStore.getState().activeSheetId !== IR_SHEET_ID) return
    if (hasPendingRoadmapSheetSync()) return
    const remote = snap.data()
    if (!remote) return
    useRoadmapStore.setState((state) => ({
      nodes: remote.nodes ?? [],
      edges: remote.edges ?? [],
      sheets: state.sheets.map((sh) =>
        sh.id === IR_SHEET_ID ? { ...sh, nodes: remote.nodes ?? [], edges: remote.edges ?? [] } : sh,
      ),
    }))
  })

  return token
}

export async function unmountIrBoard(token) {
  if (!token || token !== liveToken) return
  liveToken = null
  irListener.detach()
  disarmRoadmapSheetSync()
  const sheets = (token.sheets ?? []).filter((s) => s.id !== IR_SHEET_ID)
  const activeSheetId = token.activeSheetId === IR_SHEET_ID
    ? (sheets[0]?.id ?? null)
    : token.activeSheetId
  useRoadmapStore.getState().hydrateSheets(sheets, activeSheetId)
  useRoadmapStore.setState({ irReturnSheetId: null })
  if (activeSheetId) armRoadmapSheetSync(activeSheetId)
}
