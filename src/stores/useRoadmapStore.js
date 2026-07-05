import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addEdge } from '@xyflow/react'
import { computeSnapPosition } from '../utils/computeSnapPosition'
import { fromSchema } from '../utils/roadmapExport'
import { computeGroupedLayout } from '../utils/computeGroupedLayout'

const IMPORT_GAP = 80

let _counter = 0
function nextId() {
  return `node-${++_counter}-${Date.now()}`
}

export const useRoadmapStore = create(
  persist(
    (set) => ({
      nodes: [],
      edges: [],
      setpoint: null,
      selection: [],
      syncStatus: 'idle',
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setSelection: (ids) => set({ selection: ids }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      clearSelection: () => set({ selection: [] }),
      removeSelection: () =>
        set((state) => {
          const ids = new Set(state.selection)
          return {
            selection: [],
            nodes: state.nodes.filter((n) => !ids.has(n.id)),
            edges: state.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
          }
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
          return {
            nodes: [...state.nodes.map((n) => ({ ...n, selected: false })), ...newNodes],
            edges: [...state.edges, ...newEdges],
            selection: newNodes.map((n) => n.id),
          }
        }),
      addNode: (type, position = { x: 100, y: 100 }) =>
        set((state) => {
          const id = nextId()
          return {
            setpoint: id,
            nodes: [
              ...state.nodes,
              { id, type, position, data: { label: '', note: '', color: null } },
            ],
          }
        }),
      updateNodeData: (id, patch) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        })),
      removeNode: (id) =>
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        })),
      regroupNodes: () =>
        set((state) => ({ nodes: computeGroupedLayout(state.nodes) })),
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
          return { nodes, edges: addEdge(connection, state.edges) }
        }),
      removeEdge: (id) =>
        set((state) => ({ edges: state.edges.filter((e) => e.id !== id) })),
      detachNode: (id) =>
        set((state) => ({
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
          return {
            nodes: [...state.nodes, ...mappedNodes],
            edges: [...state.edges, ...mappedEdges],
          }
        }),
    }),
    { name: 'rc-roadmap-store' },
  ),
)
