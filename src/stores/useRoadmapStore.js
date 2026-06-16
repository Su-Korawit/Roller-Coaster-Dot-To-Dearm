import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let _counter = 0
function nextId() {
  return `node-${++_counter}-${Date.now()}`
}

export const useRoadmapStore = create(
  persist(
    (set) => ({
      nodes: [],
      edges: [],
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      addNode: (type, position = { x: 100, y: 100 }) =>
        set((state) => ({
          nodes: [
            ...state.nodes,
            { id: nextId(), type, position, data: { label: '', note: '' } },
          ],
        })),
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
    }),
    { name: 'rc-roadmap-store' },
  ),
)
