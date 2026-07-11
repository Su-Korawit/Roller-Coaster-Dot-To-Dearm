import { getDoc, setDoc } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import { IR_SHEET_ID } from '../constants/irBoard'
import { ADMIN_UID } from '../constants/admin'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import { armRoadmapSheetSync, disarmRoadmapSheetSync } from '../lib/syncManager'

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

export async function mountIrBoard() {
  const prev = useRoadmapStore.getState()
  const token = {
    sheets: prev.sheets,
    activeSheetId: prev.activeSheetId,
  }
  disarmRoadmapSheetSync()
  const data = await ensureIrBoardDoc()
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
  armRoadmapSheetSync(IR_SHEET_ID)
  return token
}

export async function unmountIrBoard(token) {
  if (!token) return
  disarmRoadmapSheetSync()
  const sheets = (token.sheets ?? []).filter((s) => s.id !== IR_SHEET_ID)
  const activeSheetId = token.activeSheetId === IR_SHEET_ID
    ? (sheets[0]?.id ?? null)
    : token.activeSheetId
  useRoadmapStore.getState().hydrateSheets(sheets, activeSheetId)
  if (activeSheetId) armRoadmapSheetSync(activeSheetId)
}
