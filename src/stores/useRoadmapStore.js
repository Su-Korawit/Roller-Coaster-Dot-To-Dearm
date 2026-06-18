import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addEdge } from '@xyflow/react'
import { computeSnapPosition } from '../utils/computeSnapPosition'

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
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      addNode: (type, position = { x: 100, y: 100 }) =>
        set((state) => {
          const id = nextId()
          return {
            setpoint: id,
            nodes: [
              ...state.nodes,
              { id, type, position, data: { label: '', note: '' } },
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
    }),
    { name: 'rc-roadmap-store' },
  ),
)
