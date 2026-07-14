import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addEdge } from '@xyflow/react'
import { computeSnapPosition } from '../utils/computeSnapPosition'
import { fromSchema } from '../utils/roadmapExport'
import { DEFAULT_STAGES } from '../components/roadmap/StageBands'
import { IR_SHEET_ID, defaultIdeaRootData, defaultReportData } from '../constants/irBoard'

const IMPORT_GAP = 80

export function roadmapStorePartialize(state) {
  const sheets = state.sheets.filter((s) => s.id !== IR_SHEET_ID)
  const activeSheetId =
    state.activeSheetId === IR_SHEET_ID
      ? (state.irReturnSheetId ?? sheets[0]?.id ?? 'local-default')
      : state.activeSheetId

  let nodes = state.nodes
  let edges = state.edges
  let timeline = state.timeline
  if (state.activeSheetId === IR_SHEET_ID) {
    const userSheet = sheets.find((s) => s.id === activeSheetId)
    nodes = userSheet?.nodes ?? []
    edges = userSheet?.edges ?? []
    timeline = userSheet?.timeline ?? null
  }

  return {
    myUid: state.myUid,
    sheets,
    activeSheetId,
    nodes,
    edges,
    timeline,
    setpoint: state.setpoint,
    selection: state.selection,
    syncStatus: state.syncStatus,
  }
}

let _counter = 0
function nextId() {
  return `node-${++_counter}-${Date.now()}`
}

// Mirrors a { nodes, edges } patch onto both the top-level state (kept for
// zero call-site churn on existing roadmap UI actions) and the matching entry
// in `sheets`.
function applyToActive(state, patch) {
  const sheetPatch = {}
  if ('nodes' in patch) sheetPatch.nodes = patch.nodes
  if ('edges' in patch) sheetPatch.edges = patch.edges
  if ('timeline' in patch) sheetPatch.timeline = patch.timeline
  return {
    ...patch,
    sheets: state.sheets.map((sh) =>
      sh.id === state.activeSheetId ? { ...sh, ...sheetPatch } : sh,
    ),
  }
}

export const useRoadmapStore = create(
  persist(
    (set) => ({
      // Multi-sheet state
      myUid: null,
      sheets: [{ id: 'local-default', name: 'Roadmap', nodes: [], edges: [], timeline: null, ownerUid: null, myRole: 'owner' }],
      activeSheetId: 'local-default',

      // Compatibility fields (always mirror active sheet)
      nodes: [],
      edges: [],
      timeline: null,
      setpoint: null,
      selection: [],
      clipboard: null,
      syncStatus: 'idle',
      // Sheet to return to (and persist as active) while the IR Board is
      // mounted over the user's session — session-only, never persisted.
      irReturnSheetId: null,

      setRoadmapMyUid: (uid) => set({ myUid: uid }),
      hydrateSheets: (sheets, activeSheetId) =>
        set(() => {
          const active = sheets.find((sh) => sh.id === activeSheetId) ?? sheets[0]
          return {
            sheets,
            activeSheetId: active?.id ?? null,
            nodes: active?.nodes ?? [],
            edges: active?.edges ?? [],
            timeline: active?.timeline ?? null,
            setpoint: null,
            selection: [],
          }
        }),
      createSheet: (name) => {
        const id = crypto.randomUUID()
        set((state) => ({
          sheets: [...state.sheets, { id, name, nodes: [], edges: [], timeline: null, ownerUid: state.myUid, myRole: 'owner' }],
          activeSheetId: id,
          nodes: [],
          edges: [],
          timeline: null,
          setpoint: null,
          selection: [],
        }))
        return id
      },
      switchSheet: (sheetId) =>
        set((state) => {
          if (sheetId === state.activeSheetId) return {}
          const target = state.sheets.find((sh) => sh.id === sheetId)
          if (!target) return {}
          return {
            activeSheetId: sheetId,
            nodes: target.nodes,
            edges: target.edges,
            timeline: target.timeline ?? null,
            setpoint: null,
            selection: [],
          }
        }),
      renameSheet: (sheetId, name) =>
        set((state) => ({
          sheets: state.sheets.map((sh) => (sh.id === sheetId ? { ...sh, name } : sh)),
        })),
      deleteSheet: (sheetId) =>
        set((state) => {
          if (state.sheets.length <= 1) return {}
          const remaining = state.sheets.filter((sh) => sh.id !== sheetId)
          if (state.activeSheetId !== sheetId) return { sheets: remaining }
          const fallback = remaining[0]
          return {
            sheets: remaining,
            activeSheetId: fallback.id,
            nodes: fallback.nodes,
            edges: fallback.edges,
            timeline: fallback.timeline ?? null,
            setpoint: null,
            selection: [],
          }
        }),

      renameStage: (index, label) =>
        set((state) => {
          const active = state.sheets.find((sh) => sh.id === state.activeSheetId)
          const stages = active?.timeline?.stages ?? DEFAULT_STAGES.map((s) => ({ ...s }))
          const newStages = stages.map((s, i) => (i === index ? { ...s, label } : s))
          return applyToActive(state, { timeline: { stages: newStages } })
        }),

      setNodes: (nodes) => set((state) => applyToActive(state, { nodes })),
      setEdges: (edges) => set((state) => applyToActive(state, { edges })),
      setSelection: (ids) => set({ selection: ids }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      clearSelection: () => set({ selection: [] }),
      removeSelection: () =>
        set((state) => {
          const ids = new Set(state.selection)
          const nodes = state.nodes.filter((n) => !ids.has(n.id))
          const edges = state.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target))
          return { selection: [], ...applyToActive(state, { nodes, edges }) }
        }),
      duplicateSelection: () =>
        set((state) => {
          const selectedIds = new Set(state.selection)
          const selectedNodes = state.nodes.filter((n) => selectedIds.has(n.id))
          if (selectedNodes.length === 0) return {}
          const OFFSET = 60
          const idMap = new Map(selectedNodes.map((n) => [n.id, nextId()]))
          const newNodes = selectedNodes.map((n) => ({
            ...n,
            id: idMap.get(n.id),
            position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
            selected: true,
          }))
          const newEdges = state.edges
            .filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))
            .map((e) => ({ ...e, id: nextId(), source: idMap.get(e.source), target: idMap.get(e.target) }))
          const nodes = [...state.nodes.map((n) => ({ ...n, selected: false })), ...newNodes]
          const edges = [...state.edges, ...newEdges]
          return { selection: newNodes.map((n) => n.id), ...applyToActive(state, { nodes, edges }) }
        }),
      // In-memory clipboard for Ctrl/Cmd+C/V (Idea: "ทำ Short Cut Tool"). Never
      // touches the OS clipboard and never persists (omitted from
      // roadmapStorePartialize and from the Firestore sync toDoc/fromDoc) —
      // it's a short-lived, session-only buffer, same lifetime as `selection`.
      copySelectionToClipboard: () =>
        set((state) => {
          const ids = new Set(state.selection)
          if (ids.size === 0) return {}
          const nodes = state.nodes.filter((n) => ids.has(n.id))
          const edges = state.edges.filter((e) => ids.has(e.source) && ids.has(e.target))
          return { clipboard: { nodes, edges } }
        }),
      pasteClipboard: () =>
        set((state) => {
          if (!state.clipboard || state.clipboard.nodes.length === 0) return {}
          const OFFSET = 60
          const idMap = new Map(state.clipboard.nodes.map((n) => [n.id, nextId()]))
          const newNodes = state.clipboard.nodes.map((n) => ({
            ...n,
            id: idMap.get(n.id),
            position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
            selected: true,
          }))
          const newEdges = state.clipboard.edges.map((e) => ({
            ...e, id: nextId(), source: idMap.get(e.source), target: idMap.get(e.target),
          }))
          const nodes = [...state.nodes.map((n) => ({ ...n, selected: false })), ...newNodes]
          const edges = [...state.edges, ...newEdges]
          return { selection: newNodes.map((n) => n.id), ...applyToActive(state, { nodes, edges }) }
        }),
      addNode: (type, position = { x: 100, y: 100 }) =>
        set((state) => {
          const id = nextId()
          const data =
            type === 'start' ? { journeyRef: null }
            : type === 'ideaRoot' ? defaultIdeaRootData()
            : type === 'update' || type === 'success' ? defaultReportData('')
            : type === 'file' ? { url: '', name: '' }
            : { label: '', note: '' }
          return { setpoint: id, ...applyToActive(state, { nodes: [...state.nodes, { id, type, position, data }] }) }
        }),
      addSticker: (url, position = { x: 120, y: 120 }) => {
        const id = nextId()
        set((state) => {
          const result = applyToActive(state, {
            nodes: [...state.nodes, { id, type: 'image', position, data: { url, offset: { x: 0, y: 0 } } }],
          })
          return { setpoint: id, ...result }
        })
        return id
      },
      updateNodeData: (id, patch) =>
        set((state) => applyToActive(state, {
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        })),
      removeNode: (id) =>
        set((state) => applyToActive(state, {
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        })),
      connect: (connection) =>
        set((state) => {
          // Snap the target block adjacent to the source's exit handle — no edge line is drawn.
          const source = state.nodes.find((n) => n.id === connection.source)
          const target = state.nodes.find((n) => n.id === connection.target)
          const nodes =
            source && target
              ? state.nodes.map((n) =>
                  n.id === target.id
                    ? { ...n, position: computeSnapPosition(source, target, connection.sourceHandle) }
                    : n,
                )
              : state.nodes
          return applyToActive(state, { nodes, edges: addEdge(connection, state.edges) })
        }),
      removeEdge: (id) =>
        set((state) => applyToActive(state, { edges: state.edges.filter((e) => e.id !== id) })),
      detachNode: (id) =>
        set((state) => applyToActive(state, {
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        })),
      // Merge a schema-v1 file into the current board: validate, regenerate ids
      // (so they never collide with existing nodes), remap edges onto the new
      // ids, and shift the imported set right of existing content so nothing
      // lands on top of an existing block.
      importRoadmap: (schema) =>
        set((state) => {
          const { nodes: incoming, edges: incomingEdges } = fromSchema(schema)
          if (incoming.length === 0) return {}
          const maxExistingX = state.nodes.reduce((m, n) => Math.max(m, n.position.x), -Infinity)
          const minIncomingX = incoming.reduce((m, n) => Math.min(m, n.position.x), Infinity)
          const dx = state.nodes.length === 0 ? 0 : maxExistingX + IMPORT_GAP - minIncomingX
          const idMap = new Map(incoming.map((n) => [n.id, nextId()]))
          const mappedNodes = incoming.map((n) => ({
            ...n,
            id: idMap.get(n.id),
            position: { x: n.position.x + dx, y: n.position.y },
          }))
          const mappedEdges = incomingEdges.map((e) => ({
            ...e,
            id: nextId(),
            source: idMap.get(e.source),
            target: idMap.get(e.target),
          }))
          return applyToActive(state, {
            nodes: [...state.nodes, ...mappedNodes],
            edges: [...state.edges, ...mappedEdges],
          })
        }),
    }),
    {
      name: 'rc-roadmap-store',
      partialize: roadmapStorePartialize,
    },
  ),
)
